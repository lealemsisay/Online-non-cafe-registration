import { pool } from '@/drizzle/client'
import { authorize, setCorsHeaders } from '@/lib/auth'
import path from 'path'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
}

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return

  const { studentId } = req.query

  if (!studentId) {
    res.setHeader('Allow', ['GET'])
    return res.status(400).json({ message: 'studentId query parameter is required' })
  }

  const auth = authorize(req, ['admin', 'dean', 'viceDean', 'student'])
  if (auth.error) return res.status(auth.status).json({ message: auth.error })

  const client = await pool.connect()
  try {
    // Allow admin/dean/viceDean to view student slips (viceDean: campus-scoped), student can only view their own
    let targetStudentId = studentId
    if (auth.user.role === 'student') {
      // Student can only view their own slip; use their username/studentId from token
      const ownStudentId = auth.user.studentId || auth.user.username || auth.user.id || ''
      if (!ownStudentId) {
        return res.status(403).json({ message: 'Unable to identify the student.' })
      }
      if (targetStudentId.toLowerCase() !== ownStudentId.toLowerCase()) {
        return res.status(403).json({ message: 'Forbidden: Students can only view their own registration slip.' })
      }
    } else if (auth.user.role === 'viceDean') {
      // viceDean can only access students from their own campus
      const campusCheck = await client.query(
        `SELECT campus FROM student WHERE student_id = $1`,
        [targetStudentId]
      )
      if (campusCheck.rows.length > 0) {
        const studentCampus = (campusCheck.rows[0].campus || '').trim().toLowerCase()
        const viceDeanCampus = (auth.user.campus || '').trim().toLowerCase()
        if (!viceDeanCampus || !studentCampus || viceDeanCampus !== studentCampus) {
          return res.status(403).json({ message: `Forbidden: Vice Dean can only access students from their own campus (${auth.user.campus}).` })
        }
      }
    }

    const slipRes = await client.query(
      `SELECT id, filename, path, filename AS "storedName", uploaded_at 
       FROM document_metadata 
       WHERE student_id = $1 AND filename LIKE 'registration-slip-%'
       ORDER BY uploaded_at DESC`,
      [targetStudentId]
    )

    if (slipRes.rows.length === 0) {
      return res.status(404).json({ message: 'No registration slip found for this student.' })
    }

    const slip = slipRes.rows[0]
    // Build the full file path relative to backend uploads directory
    const filePath = path.join(process.cwd(), 'backend', 'uploads', 'documents', slip.storedName)

    // Check if file exists
    const fs = await import('fs')
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Registration slip file not found on disk.' })
    }

    return res.status(200).json({
      success: true,
      slip: {
        id: slip.id,
        storedName: slip.storedName,
        filename: slip.filename,
        uploadedAt: slip.uploaded_at,
        // Return a relative URL that the frontend can use
        downloadUrl: `/api/documents/download?file=${encodeURIComponent(slip.storedName)}`
      }
    })
  } catch (error) {
    console.error('Document student error:', error)
    return res.status(500).json({ message: 'Internal server error retrieving the registration slip.', detail: error.message })
  } finally {
    client.release()
  }
}