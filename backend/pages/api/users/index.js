import { pool } from '@/drizzle/client'
import { authorize, setCorsHeaders, hashPassword } from '@/lib/auth'

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return

  // Accessible by Super Admin and Campus Dean
  const auth = authorize(req, ['admin', 'dean'])
  if (auth.error) return res.status(auth.status).json({ message: auth.error })

  if (req.method === 'GET') {
    const client = await pool.connect()
    try {
      const type = req.query?.type || ''

      // If querying deans (used by Super Admin User Management)
      if (type === 'dean' || type === 'deans') {
        if (auth.user.role !== 'admin') {
          return res.status(403).json({ message: 'Access denied: Super Admin only' })
        }
        const result = await client.query(
          `SELECT id, username, full_name AS "name", email, campus, role, created_at AS "createdAt" FROM app_user WHERE role = 'dean' ORDER BY created_at DESC`
        )
        const deans = result.rows.map(d => ({
          id: d.id,
          name: d.name,
          email: d.email || `${d.username}@dilla.ac.ke`,
          campus: d.campus || 'Main Campus',
          status: 'active',
          role: d.role,
        }))
        return res.status(200).json({ deans, users: deans })
      }

      // Default: querying students/applications
      let query = `SELECT id, student_id AS "studentId", full_name AS "fullName", gender, campus, department, program, year_of_study AS "yearOfStudy", academic_year AS "academicYear", application_status AS "applicationStatus", approval_status AS "approvalStatus", dean_review AS "deanFinding", dean_comments AS "deanComments", created_at AS "createdAt" FROM student`
      const params = []

      // If dean, scope to dean's campus
      if (auth.user.role === 'dean' && auth.user.campus) {
        query += ' WHERE campus = $1'
        params.push(auth.user.campus)
      }

      query += ' ORDER BY created_at DESC'
      const result = await client.query(query, params)
      const users = result.rows.map(u => ({
        id: u.id,
        studentId: u.studentId,
        fullName: u.fullName,
        studentName: u.fullName,
        gender: u.gender,
        campus: u.campus,
        department: u.department,
        program: u.program,
        yearOfStudy: u.yearOfStudy,
        academicYear: u.academicYear,
        applicationStatus: u.applicationStatus,
        status: u.applicationStatus,
        approvalStatus: u.approvalStatus,
        deanFinding: u.deanFinding,
        deanComments: u.deanComments,
        createdAt: u.createdAt,
        submittedAt: u.createdAt,
      }))
      return res.status(200).json({ users, applications: users })
    } catch (error) {
      console.error('Error fetching users:', error)
      return res.status(500).json({ message: 'Error fetching users' })
    } finally {
      client.release()
    }
  }

  if (req.method === 'POST') {
    const client = await pool.connect()
    try {
      const body = req.body || {}
      const { role } = body

      // If creating a Dean user (Admin only)
      if (role === 'dean') {
        if (auth.user.role !== 'admin') {
          return res.status(403).json({ message: 'Access denied: Super Admin only' })
        }
        const { name, email, campus, password } = body
        const username = email ? email.split('@')[0] : `dean.${(campus || 'campus').toLowerCase().replace(/\s+/g, '')}`
        const initialPassword = password || 'Dean@Dilla2026!'
        const hash = await hashPassword(initialPassword)

        const result = await client.query(
          `INSERT INTO app_user (username, password_hash, full_name, role, campus, email)
           VALUES ($1, $2, $3, 'dean', $4, $5)
           ON CONFLICT (username) DO UPDATE SET full_name = EXCLUDED.full_name, campus = EXCLUDED.campus, email = EXCLUDED.email
           RETURNING id, username, full_name AS "name", email, campus, role`,
          [username, hash, name || 'Campus Dean', campus || 'Main Campus', email || null]
        )
        return res.status(201).json({ dean: result.rows[0], user: result.rows[0] })
      }

      // Otherwise creating a student
      const {
        studentId, fullName, gender, campus, department, program, yearOfStudy, phone, email, academicYear,
      } = body

      if (!studentId || !fullName) {
        return res.status(400).json({ message: 'Student ID and full name are required' })
      }

      const result = await client.query(
        `INSERT INTO student (student_id, full_name, gender, campus, department, program, year_of_study, phone, email, academic_year, application_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'submitted')
         ON CONFLICT (student_id) DO UPDATE SET full_name = EXCLUDED.full_name, department = EXCLUDED.department, campus = EXCLUDED.campus
         RETURNING id, student_id AS "studentId", full_name AS "fullName", gender, campus, department, program, year_of_study AS "yearOfStudy", phone, email, academic_year AS "academicYear", application_status AS "applicationStatus"`,
        [studentId, fullName, gender || 'Male', campus || 'Main Campus', department || 'General', program || 'Regular', yearOfStudy || '1', phone || null, email || null, academicYear || '2023/2024']
      )

      const newUser = result.rows[0]
      return res.status(201).json({ user: newUser })
    } catch (error) {
      console.error('Error creating user:', error)
      return res.status(500).json({ message: 'Error creating user' })
    } finally {
      client.release()
    }
  }

  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).json({ message: 'Method not allowed' })
}