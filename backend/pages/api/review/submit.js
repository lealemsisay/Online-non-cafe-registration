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
        const result = await client.query(
          `UPDATE student 
           SET dean_review = $1, dean_comments = $2, application_status = 'dean-review'
           WHERE id::text = $3 OR student_id = $3
           RETURNING id, student_id AS "studentId", full_name AS "fullName", department, campus, application_status, dean_review, dean_comments`,
          [finding, comments, applicationId]
        )

        if (result.rows.length === 0) {
          return res.status(404).json({ message: 'Application not found' })
        }

        const updatedApplication = result.rows[0]

        await client.query(
          `INSERT INTO audit_log (action, performed_by, target_id, target_type, details)
           VALUES ('dean_review', $1, $2, 'application', $3)`,
          [auth.user.name || auth.user.role, applicationId, `Campus Dean review: finding=${finding}, comments="${comments}"`]
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
        const result = await client.query(
          `UPDATE student 
           SET application_status = 'super-admin-review', super_admin_review = $1, super_admin_comments = $2
           WHERE id::text = $3 OR student_id = $3
           RETURNING id, student_id AS "studentId", full_name AS "fullName", department, campus, application_status, super_admin_review, super_admin_comments`,
          [finding, comments, applicationId]
        )

        if (result.rows.length === 0) {
          return res.status(404).json({ message: 'Application not found' })
        }

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