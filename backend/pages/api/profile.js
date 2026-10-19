import { pool } from '@/drizzle/client'
import { authorize, setCorsHeaders } from '@/lib/auth'

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const auth = authorize(req, ['student', 'dean', 'admin'])
  if (auth.error) return res.status(auth.status).json({ message: auth.error })

  try {
    const userId = req.query?.id || auth.user.id
    const client = await pool.connect()
    try {
      // Find user in app_user
      const userRes = await client.query(
        'SELECT id, username, full_name AS "fullName", role, campus, email FROM app_user WHERE id::text = $1 OR LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1)',
        [userId]
      )

      let appUser = userRes.rows[0] || null
      const studentLookupId = (appUser && appUser.username) ? appUser.username : userId

      // Check student table if user is a student or looking up a student
      const studentRes = await client.query(
        `SELECT id, student_id AS "studentId", full_name AS "fullName", gender, campus, department, program, year_of_study AS "yearOfStudy", phone, email, academic_year AS "academicYear", is_non_cafeteria AS "isNonCafeteria", registration_status AS "registrationStatus", application_status AS "applicationStatus", dean_review AS "deanReview", dean_comments AS "deanComments", super_admin_review AS "superAdminReview", super_admin_comments AS "superAdminComments", approval_status AS "approvalStatus", created_at AS "createdAt" FROM student WHERE id::text = $1 OR LOWER(student_id) = LOWER($1) OR LOWER(student_id) = LOWER($2)`,
        [userId, studentLookupId]
      )

      const studentData = studentRes.rows[0] || null

      if (!appUser && !studentData) {
        return res.status(404).json({ message: 'User not found' })
      }

      const responseUser = {
        id: appUser ? appUser.id : studentData.id,
        studentId: appUser ? appUser.username : studentData.studentId,
        username: appUser ? appUser.username : studentData.studentId,
        name: appUser ? appUser.fullName : studentData.fullName,
        fullName: appUser ? appUser.fullName : studentData.fullName,
        role: appUser ? appUser.role : 'student',
        campus: (appUser && appUser.campus) || (studentData && studentData.campus) || '',
        email: (appUser && appUser.email) || (studentData && studentData.email) || '',
        department: studentData ? studentData.department : null,
        academicYear: studentData ? studentData.academicYear : null,
        registrationStatus: studentData ? studentData.registrationStatus : null,
        applicationStatus: studentData ? studentData.applicationStatus : null,
      }

      return res.status(200).json({ user: responseUser, student: studentData })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Profile error:', error)
    return res.status(500).json({ message: 'Server error' })
  }
}