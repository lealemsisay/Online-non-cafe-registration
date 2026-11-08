import { pool } from '@/drizzle/client'
import { authorize, setCorsHeaders } from '@/lib/auth'

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const auth = authorize(req, ['admin', 'dean'])
  if (auth.error) return res.status(auth.status).json({ message: auth.error })

  try {
    const body = req.body || {}
    const { studentId, isNonCafeteria, reason } = body

    if (!studentId) {
      return res.status(400).json({ message: 'Student ID is required' })
    }

    if (isNonCafeteria !== true && isNonCafeteria !== false) {
      return res.status(400).json({ message: 'Invalid isNonCafeteria value' })
    }

    const client = await pool.connect()
    try {
      // First, get the existing student record
      const existing = await client.query(
        `SELECT id, student_id, full_name, is_non_cafeteria, campus, department, program, year_of_study, registration_status, application_status FROM student WHERE student_id = $1`,
        [studentId]
      )

      if (existing.rows.length === 0) {
        return res.status(404).json({ message: 'Student not found' })
      }

      const student = existing.rows[0]
      const previousNonCafeStatus = student.is_non_cafeteria

      // Check if the status is actually changing
      if (student.is_non_cafeteria === isNonCafeteria) {
        return res.status(400).json({ message: 'Student category is already set to this value. No change needed.' })
      }

      // Update the student's category
      const updateRes = await client.query(
        `UPDATE student
         SET is_non_cafeteria = $1, updated_at = NOW()
         WHERE student_id = $2
         RETURNING id, student_id AS "studentId", full_name AS "fullName", gender, campus, department, program, year_of_study AS "yearOfStudy", phone, email, photo_url AS "photoUrl", academic_year AS "academicYear", is_non_cafeteria AS "isNonCafeteria", registration_status AS "registrationStatus", application_status AS "applicationStatus"`,
        [isNonCafeteria, studentId]
      )

      const updatedStudent = updateRes.rows[0]

      // Record the category change in audit log
      await client.query(
        `INSERT INTO audit_log (action, performed_by, target_id, target_type, details)
         VALUES ('change_student_category', $1, 'student', $2,
          $3)`,
        [
          auth.user.username || auth.user.email || 'admin',
          studentId,
          `Student category changed from ${previousNonCafeStatus ? 'Non-Cafeteria' : 'Cafeteria'} to ${isNonCafeteria ? 'Non-Cafeteria' : 'Cafeteria'}. Reason: ${reason || 'Not specified'}`
        ]
      )

      // Create notification for the student about their category change
      try {
        await client.query(
          `INSERT INTO app_notification (recipient_id, recipient_role, campus, title, message, type, link, is_read)
           VALUES ($1, 'student', $2, 'Student Category Updated', 'Your student category has been updated from ${previousNonCafeStatus ? 'Cafeteria' : 'Non-Cafeteria'} to ${isNonCafeteria ? 'Non-Cafeteria' : 'Cafeteria'}. ${reason || ''}', 'info', '/student/dashboard', false)`
        )
      } catch (notifyError) {
        console.error('Error creating student notification:', notifyError)
      }

      return res.status(200).json({
        success: true,
        student: updatedStudent,
        message: `Student category updated successfully from ${previousNonCafeStatus ? 'Non-Cafeteria' : 'Cafeteria'} to ${isNonCafeteria ? 'Non-Cafeteria' : 'Cafeteria'}.`
      })
    } catch (error) {
      console.error('Student category change error:', error)
      return res.status(500).json({ message: 'Error changing student category', detail: error.message })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Student category change handler error:', error)
    return res.status(500).json({ message: 'Error changing student category' })
  }
}