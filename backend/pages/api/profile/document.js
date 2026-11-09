import { pool } from '@/drizzle/client'
import { authorize, setCorsHeaders } from '@/lib/auth'
import fs from 'fs'
import path from 'path'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
}

const MAX_PDF_BYTES = 10 * 1024 * 1024
const documentDir = path.join(process.cwd(), 'uploads', 'documents')
if (!fs.existsSync(documentDir)) {
  try {
    fs.mkdirSync(documentDir, { recursive: true })
  } catch (e) {
    // ignore
  }
}

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const auth = authorize(req, ['student', 'dean', 'admin'])
  if (auth.error) return res.status(auth.status).json({ message: auth.error })

  const body = req.body || {}
  const { fileBase64, fileName, studentId } = body

  if (!fileBase64) {
    return res.status(400).json({ message: 'No file data provided.' })
  }

  let targetId = (studentId || auth.user.studentId || auth.user.username || auth.user.id || '').trim()
  if (auth.user.role === 'student') {
    const own = [
      String(auth.user.studentId || '').toLowerCase(),
      String(auth.user.username || '').toLowerCase(),
      String(auth.user.id || '').toLowerCase(),
    ].filter(Boolean)
    if (!targetId) {
      targetId = auth.user.studentId || auth.user.username || auth.user.id || ''
    } else if (!own.includes(targetId.toLowerCase())) {
      return res.status(403).json({ message: 'Forbidden: Students can only upload their own registration slip.' })
    }
  }

  if (!targetId) {
    return res.status(400).json({ message: 'Unable to resolve the target student.' })
  }

  let base64Data = fileBase64
  if (typeof fileBase64 === 'string' && fileBase64.includes(';base64,')) {
    base64Data = fileBase64.split(';base64,')[1]
  }

  let buffer
  try {
    buffer = Buffer.from(base64Data, 'base64')
  } catch (e) {
    return res.status(400).json({ message: 'Invalid file data.' })
  }

  if (!buffer || buffer.length === 0) {
    return res.status(400).json({ message: 'The uploaded file is empty.' })
  }
  if (buffer.length > MAX_PDF_BYTES) {
    return res.status(400).json({ message: 'The registration slip must be 10MB or smaller.' })
  }
  if (buffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
    return res.status(400).json({ message: 'Only PDF registration slips are accepted.' })
  }

  const client = await pool.connect()
  try {
    const studentRes = await client.query(
      'SELECT student_id AS "studentId" FROM student WHERE student_id = $1 OR id::text = $1 OR LOWER(student_id) = LOWER($1)',
      [targetId]
    )
    if (studentRes.rows.length === 0) {
      return res.status(404).json({ message: 'Student record not found.' })
    }
    const resolvedStudentId = studentRes.rows[0].studentId

    const cleanTarget = String(resolvedStudentId).replace(/[^a-zA-Z0-9_-]/g, '_')
    const storedName = `registration-slip-${cleanTarget}-${Date.now()}.pdf`
    const filePath = path.join(documentDir, storedName)

    fs.writeFileSync(filePath, buffer)

    await client.query(
      "DELETE FROM document_metadata WHERE student_id = $1 AND filename LIKE 'registration-slip-%'",
      [resolvedStudentId]
    )

    const insertRes = await client.query(
      `INSERT INTO document_metadata (filename, path, student_id, uploaded_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id`,
      [fileName || storedName, storedName, resolvedStudentId]
    )

    return res.status(200).json({
      success: true,
      id: insertRes.rows[0]?.id || null,
      filename: fileName || storedName,
      storedName,
      sizeInMB: Number((buffer.length / (1024 * 1024)).toFixed(2)),
      message: 'Registration slip uploaded successfully.',
    })
  } catch (error) {
    console.error('Registration slip upload error:', error)
    return res.status(500).json({ message: 'Internal server error processing the registration slip.', detail: error.message })
  } finally {
    client.release()
  }
}
