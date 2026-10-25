import { pool } from '@/drizzle/client'
import { signToken, hashPassword, setCorsHeaders } from '@/lib/auth'
import { checkRegistrationWindow } from '@/lib/schedule'

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const body = req.body || {}
    const {
      username,
      password,
      fullName,
      studentId: rawStudentId,
      email,
      campus,
      department,
      gender,
      program,
      yearOfStudy,
      phone,
      role: requestedRole,
      customValues,
    } = body

    // SECURITY: Strictly prevent public registration as Admin, Dean, or any non-student role
    if (requestedRole && requestedRole.toLowerCase() !== 'student') {
      return res.status(403).json({
        message: 'Forbidden: Public registration is strictly restricted to students. Administrative and Dean accounts must be provisioned by Super Admin.',
      })
    }

    // TASK 4: Enforce registration schedule window in backend
    const windowCheck = await checkRegistrationWindow()
    if (!windowCheck.isOpen) {
      return res.status(403).json({
        message: windowCheck.reason || 'Cost-sharing registration window is currently closed.',
        schedule: windowCheck.schedule,
      })
    }

    const cleanUsername = (username || rawStudentId || '').trim()
    const cleanStudentId = (rawStudentId || username || '').trim()
    const cleanFullName = (fullName || '').trim()
    const cleanPassword = (password || '').trim()
    const cleanEmail = (email || '').trim().toLowerCase()
    const cleanCampus = (campus || 'Main Campus').trim()
    const cleanDepartment = (department || 'General').trim()

    if (!cleanUsername) {
      return res.status(400).json({ message: 'Username or Student ID is required' })
    }
    if (!cleanPassword || cleanPassword.length < 6) {
      return res.status(400).json({ message: 'Password is required and must be at least 6 characters' })
    }
    if (!cleanFullName) {
      return res.status(400).json({ message: 'Full name is required' })
    }

    const client = await pool.connect()
    try {
      // 1. Check if username or email already taken in app_user
      const existingUser = await client.query(
        `SELECT id, username FROM app_user WHERE LOWER(username) = LOWER($1) OR (email IS NOT NULL AND LOWER(email) = LOWER($2))`,
        [cleanUsername, cleanEmail || cleanUsername]
      )

      if (existingUser.rows.length > 0) {
        return res.status(409).json({ message: 'Username or email already exists. Please log in.' })
      }

      // 2. Hash student password
      const passwordHash = await hashPassword(cleanPassword)

      // 3. Insert into app_user as student
      const userRes = await client.query(
        `INSERT INTO app_user (username, password_hash, full_name, role, campus, email, status)
         VALUES ($1, $2, $3, 'student', $4, $5, 'active')
         RETURNING id, username, full_name, role, campus, email, status`,
        [cleanUsername, passwordHash, cleanFullName, cleanCampus, cleanEmail || null]
      )
      const user = userRes.rows[0]

      // 4. Upsert corresponding student profile record
      await client.query(
        `INSERT INTO student (
           student_id, full_name, gender, campus, department, program,
           year_of_study, phone, email, academic_year, is_non_cafeteria,
           registration_status, application_status
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, '2023/2024', true, 'draft', 'draft')
         ON CONFLICT (student_id) DO UPDATE
         SET full_name = EXCLUDED.full_name,
             campus = EXCLUDED.campus,
             department = EXCLUDED.department,
             email = COALESCE(EXCLUDED.email, student.email)`,
        [
          cleanStudentId,
          cleanFullName,
          gender || 'Male',
          cleanCampus,
          cleanDepartment,
          program || 'Regular Degree',
          yearOfStudy || '1',
          phone || null,
          cleanEmail || null,
        ]
      )

      // 5. Create audit log
      await client.query(
        `INSERT INTO audit_log (action, performed_by, target_id, target_type, details)
         VALUES ('student_self_registration', $1, $2, 'app_user', $3)`,
        [cleanUsername, user.id, `Student self-registered with ID ${cleanStudentId} (${cleanCampus})`]
      )

      // 6. Generate JWT token for seamless auto-login
      const token = signToken({
        id: user.id,
        role: 'student',
        campus: user.campus,
        name: user.full_name,
        username: user.username,
        email: user.email,
      })

      return res.status(201).json({
        message: 'Student account registered successfully',
        token,
        user: {
          id: user.id,
          name: user.full_name,
          role: 'student',
          campus: user.campus,
          studentId: cleanStudentId,
          username: user.username,
          email: user.email,
        },
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Self-registration error:', error)
    return res.status(500).json({ message: 'Server error during student registration', detail: error.message })
  }
}
