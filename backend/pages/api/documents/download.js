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

  const { file } = req.query

  if (!file) {
    res.setHeader('Allow', ['GET'])
    return res.status(400).json({ message: 'file query parameter is required' })
  }

  const auth = authorize(req, ['admin', 'dean', 'student'])
  if (auth.error) return res.status(auth.status).json({ message: auth.error })

  const client = await pool.connect()
  try {
    // Allow admin/dean to download any document, student can only download their own
    // First, verify the student has this document
    const docRes = await client.query(
      `SELECT id, student_id, filename, storedName FROM document_metadata WHERE storedName = $1`,
      [file]
    )

    if (docRes.rows.length === 0) {
      return res.status(404).json({ message: 'Document not found.' })
    }

    const doc = docRes.rows[0]
    const targetStudentId = doc.student_id

    // If student, check ownership
    if (auth.user.role === 'student') {
      const ownStudentId = auth.user.studentId || auth.user.username || auth.user.id || ''
      if (targetStudentId.toLowerCase() !== ownStudentId.toLowerCase()) {
        return res.status(403).json({ message: 'Forbidden: Students can only download their own documents.' })
      }
    }

    // Build the file path
    const filePath = path.join(process.cwd(), 'backend', 'uploads', 'documents', file)

    // Check if file exists
    const fs = await import('fs')
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Document file not found on disk.' })
    }

    // Set headers for PDF download
    const ext = file.split('.').pop().toLowerCase()
    const mimeType = ext === 'pdf' ? 'application/pdf' : 'application/octet-stream'
    const filename = docRes.rows[0].filename || file

    res.setHeader('Content-Type', mimeType)
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Length', fs.statSync(filePath).size)

    // Stream the file
    const fileStream = fs.createReadStream(filePath)
    fileStream.pipe(res)
  } catch (error) {
    console.error('Document download error:', error)
    return res.status(500).json({ message: 'Internal server error downloading the document.', detail: error.message })
  } finally {
    client.release()
  }
}