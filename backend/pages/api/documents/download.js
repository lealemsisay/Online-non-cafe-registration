import { pool } from '@/drizzle/client'
import { authorize, setCorsHeaders } from '@/lib/auth'
import path from 'path'
import fs from 'fs'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
}

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return

  const { file, inline } = req.query

  if (!file) {
    res.setHeader('Allow', ['GET'])
    return res.status(400).json({ message: 'file query parameter is required' })
  }

  const auth = authorize(req, ['admin', 'dean', 'viceDean', 'student'])
  if (auth.error) return res.status(auth.status).json({ message: auth.error })

  const client = await pool.connect()
  try {
    // Verify document exists in DB
    const docRes = await client.query(
      `SELECT id, student_id, filename, path FROM document_metadata WHERE filename = $1`,
      [file]
    )

    if (docRes.rows.length === 0) {
      return res.status(404).json({ message: 'Document not found.' })
    }

    const doc = docRes.rows[0]
    const targetStudentId = doc.student_id

    // Student can only download their own document
    if (auth.user.role === 'student') {
      const ownStudentId = auth.user.studentId || auth.user.username || auth.user.id || ''
      if (!ownStudentId || targetStudentId.toLowerCase() !== ownStudentId.toLowerCase()) {
        return res.status(403).json({ message: 'Forbidden: Students can only download their own documents.' })
      }
    }

    // viceDean campus scope check
    if (auth.user.role === 'viceDean') {
      const campusCheck = await client.query(
        `SELECT campus FROM student WHERE student_id = $1`,
        [targetStudentId]
      )
      if (campusCheck.rows.length > 0) {
        const studentCampus = (campusCheck.rows[0].campus || '').trim().toLowerCase()
        const viceDeanCampus = (auth.user.campus || '').trim().toLowerCase()
        if (viceDeanCampus && studentCampus && viceDeanCampus !== studentCampus) {
          return res.status(403).json({ message: `Forbidden: Vice Dean can only access documents from their own campus.` })
        }
      }
    }

    // Build the file path
    const filePath = path.join(process.cwd(), 'backend', 'uploads', 'documents', file)

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Document file not found on disk.' })
    }

    const ext = file.split('.').pop().toLowerCase()
    const mimeType = ext === 'pdf' ? 'application/pdf' : 'application/octet-stream'
    const originalFilename = doc.filename || file

    res.setHeader('Content-Type', mimeType)
    // Use inline disposition when ?inline=1 is set (for PDF viewer), otherwise attachment (download)
    if (inline === '1') {
      res.setHeader('Content-Disposition', `inline; filename="${originalFilename}"`)
    } else {
      res.setHeader('Content-Disposition', `attachment; filename="${originalFilename}"`)
    }
    res.setHeader('Content-Length', fs.statSync(filePath).size)
    res.setHeader('Cache-Control', 'private, max-age=300')

    const fileStream = fs.createReadStream(filePath)
    fileStream.pipe(res)
  } catch (error) {
    console.error('Document download error:', error)
    return res.status(500).json({ message: 'Internal server error downloading the document.', detail: error.message })
  } finally {
    client.release()
  }
}
