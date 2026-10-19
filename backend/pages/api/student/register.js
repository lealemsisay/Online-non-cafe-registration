import { pool } from '@/drizzle/client'
import { authorize, setCorsHeaders } from '@/lib/auth'

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const auth = authorize(req, ['student', 'dean', 'admin'])
  if (auth.error) return res.status(auth.status).json({ message: auth.error })

  try {
    const body = req.body || {}
    const { studentId, fullName, gender, campus, department, program, yearOfStudy, phone, email, academicYear, isNonCafeteria } = body

    if (!studentId || !fullName || !gender || !campus || !department || !program || !academicYear) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    const client = await pool.connect()
    try {
      const existing = await client.query('SELECT student_id FROM student WHERE student_id = $1', [studentId])

      if (existing.rows.length > 0) {
        // Update existing record if it was draft
        const updateRes = await client.query(
          `UPDATE student
           SET full_name = $1, gender = $2, campus = $3, department = $4, program = $5, year_of_study = $6, phone = $7, email = $8, academic_year = $9, is_non_cafeteria = $10, registration_status = 'submitted', application_status = 'submitted', updated_at = NOW()
           WHERE student_id = $11
           RETURNING id, student_id AS "studentId", full_name AS "fullName", gender, campus, department, program, year_of_study AS "yearOfStudy", phone, email, academic_year AS "academicYear", is_non_cafeteria AS "isNonCafeteria", registration_status AS "registrationStatus", application_status AS "applicationStatus"`,
          [fullName, gender, campus, department, program, yearOfStudy || '1', phone || '', email || '', academicYear, isNonCafeteria === true, studentId]
        )
        return res.status(200).json({ student: updateRes.rows[0], message: 'Registration updated successfully' })
      }

      const result = await client.query(
        `INSERT INTO student (student_id, full_name, gender, campus, department, program, year_of_study, phone, email, academic_year, is_non_cafeteria, registration_status, application_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'submitted', 'submitted')
         RETURNING id, student_id AS "studentId", full_name AS "fullName", gender, campus, department, program, year_of_study AS "yearOfStudy", phone, email, academic_year AS "academicYear", is_non_cafeteria AS "isNonCafeteria", registration_status AS "registrationStatus", application_status AS "applicationStatus"`,
        [studentId, fullName, gender, campus, department, program, yearOfStudy || '1', phone || '', email || '', academicYear, isNonCafeteria === true]
      )

      return res.status(201).json({ student: result.rows[0], message: 'Registration submitted successfully' })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Registration error:', error)
    return res.status(500).json({ message: 'Server error during registration' })
  }
}