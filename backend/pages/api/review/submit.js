import { pool } from '@/drizzle/client'
import { authorize, setCorsHeaders } from '@/lib/auth'

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return

  // Accessible by Campus Dean and Super Admin
  const auth = authorize(req, ['dean', 'admin'])
  if (auth.error) return res.status(auth.status).json({ message: auth.error })

  if (req.method === 'POST') {
    try {
      const { applicationId, finding, comments } = req.body || {}

      if (!applicationId) {
        return res.status(400).json({ message: 'Application ID is required' })
      }

      const client = await pool.connect()
      try {
        // 1. Fetch student record to verify existence and campus
        const checkRes = await client.query(
          `SELECT id, student_id AS "studentId", campus, application_status FROM student WHERE id::text = $1 OR student_id = $1`,
          [applicationId]
        )

        if (checkRes.rows.length === 0) {
          return res.status(404).json({ message: 'Application not found' })
        }

        const student = checkRes.rows[0]

        // 2. ENFORCE CAMPUS ISOLATION (Task 9):
        // Campus Dean users must NOT access or review other campuses' data
        if (auth.user.role === 'dean') {
          const deanCampus = (auth.user.campus || '').trim().toLowerCase()
          const studentCampus = (student.campus || '').trim().toLowerCase()
          if (!deanCampus || !studentCampus || deanCampus !== studentCampus) {
            return res.status(403).json({
              message: `Forbidden: Campus Dean is strictly restricted to '${auth.user.campus}'. Cannot access or review applications from '${student.campus || 'Other Campus'}'.`,
            })
          }
        }

        // Determine new application status
        let newStatus = 'super-admin-review'
        if (finding === 'return-for-correction' || finding === 'returned-for-correction') {
          newStatus = 'return-for-correction'
        }

        const result = await client.query(
          `UPDATE student 
           SET dean_review = $1, 
               dean_comments = $2, 
               application_status = $3,
               updated_at = NOW()
           WHERE id = $4
           RETURNING id, student_id AS "studentId", full_name AS "fullName", department, campus, application_status, dean_review, dean_comments`,
          [finding || 'registered', comments || null, newStatus, student.id]
        )

        const updatedApplication = result.rows[0]

        await client.query(
          `INSERT INTO audit_log (action, performed_by, target_id, target_type, details)
           VALUES ('dean_review', $1, $2, 'application', $3)`,
          [
            auth.user.username || auth.user.name,
            student.studentId,
            `Campus Dean (${auth.user.campus}) review: finding=${finding}, status=${newStatus}, comments="${comments || ''}"`,
          ]
        )

        return res.status(200).json({
          success: true,
          application: {
            ...updatedApplication,
            deanFinding: finding,
            deanComments: comments,
          },
        })
      } finally {
        client.release()
      }
    } catch (error) {
      console.error('Review submission error:', error)
      return res.status(500).json({ message: 'Error submitting review' })
    }
  }

  if (req.method === 'PUT') {
    try {
      const { applicationId, finding, comments } = req.body || {}

      if (!applicationId) {
        return res.status(400).json({ message: 'Application ID is required' })
      }

      const client = await pool.connect()
      try {
        const checkRes = await client.query(
          `SELECT id, student_id AS "studentId", campus FROM student WHERE id::text = $1 OR student_id = $1`,
          [applicationId]
        )

        if (checkRes.rows.length === 0) {
          return res.status(404).json({ message: 'Application not found' })
        }

        const student = checkRes.rows[0]

        // Campus Dean isolation check
        if (auth.user.role === 'dean') {
          const deanCampus = (auth.user.campus || '').trim().toLowerCase()
          const studentCampus = (student.campus || '').trim().toLowerCase()
          if (!deanCampus || !studentCampus || deanCampus !== studentCampus) {
            return res.status(403).json({
              message: `Forbidden: Cannot modify applications from '${student.campus}'.`,
            })
          }
        }

        const result = await client.query(
          `UPDATE student 
           SET application_status = 'super-admin-review', super_admin_review = $1, super_admin_comments = $2, updated_at = NOW()
           WHERE id = $3
           RETURNING id, student_id AS "studentId", full_name AS "fullName", department, campus, application_status, super_admin_review, super_admin_comments`,
          [finding, comments, student.id]
        )

        return res.status(200).json({
          success: true,
          application: {
            ...result.rows[0],
            applicationStatus: 'super-admin-review',
          },
        })
      } finally {
        client.release()
      }
    } catch (error) {
      console.error('Super Admin move error:', error)
      return res.status(500).json({ message: 'Error moving to Super Admin review' })
    }
  }

  res.setHeader('Allow', ['POST', 'PUT'])
  return res.status(405).json({ message: 'Method not allowed' })
}