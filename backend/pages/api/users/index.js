import { pool } from '@/drizzle/client'
import { authorize, setCorsHeaders, hashPassword } from '@/lib/auth'

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return

  // Accessible by Super Admin and Campus Dean
  const auth = authorize(req, ['admin', 'dean'])
  if (auth.error) return res.status(auth.status).json({ message: auth.error })

  // GET: Retrieve users or students
  if (req.method === 'GET') {
    const client = await pool.connect()
    try {
      const type = (req.query?.type || req.query?.role || '').toLowerCase()
      const search = (req.query?.search || '').trim().toLowerCase()
      const campusFilter = (req.query?.campus || '').trim()

      // 1. Querying Campus Deans (Super Admin only)
      if (type === 'dean' || type === 'deans') {
        if (auth.user.role !== 'admin') {
          return res.status(403).json({ message: 'Access denied: Super Admin only' })
        }
        let q = `SELECT id, username, full_name AS "name", email, campus, role, status, created_at AS "createdAt" FROM app_user WHERE role = 'dean'`
        const p = []
        if (search) {
          p.push(`%${search}%`)
          q += ` AND (LOWER(full_name) LIKE $${p.length} OR LOWER(username) LIKE $${p.length} OR LOWER(email) LIKE $${p.length})`
        }
        if (campusFilter && campusFilter !== 'all') {
          p.push(campusFilter)
          q += ` AND campus = $${p.length}`
        }
        q += ' ORDER BY created_at DESC'
        const result = await client.query(q, p)
        const deans = result.rows.map(d => ({
          id: d.id,
          name: d.name,
          username: d.username,
          email: d.email || `${d.username}@dilla.edu.et`,
          campus: d.campus || 'Main Campus',
          status: d.status || 'active',
          role: d.role,
          createdAt: d.createdAt,
        }))
        return res.status(200).json({ deans, users: deans })
      }

      // 2. Querying Students & Applications
      let query = `
        SELECT s.id, s.student_id AS "studentId", s.full_name AS "fullName", s.gender, s.campus, 
               s.department, s.program, s.year_of_study AS "yearOfStudy", s.phone, s.email, s.photo_url AS "photoUrl",
               s.academic_year AS "academicYear", s.application_status AS "applicationStatus", 
               s.registration_status AS "registrationStatus", s.approval_status AS "approvalStatus", 
               s.dean_review AS "deanFinding", s.dean_comments AS "deanComments", 
               s.super_admin_comments AS "superAdminComments", s.created_at AS "createdAt",
               u.status AS "userStatus"
        FROM student s
        LEFT JOIN app_user u ON LOWER(s.student_id) = LOWER(u.username)
      `
      const params = []
      const conditions = []

      // Campus Dean: strictly scoped to Dean's campus
      if (auth.user.role === 'dean') {
        params.push(auth.user.campus)
        conditions.push(`s.campus = $${params.length}`)
      } else if (campusFilter && campusFilter !== 'all') {
        params.push(campusFilter)
        conditions.push(`s.campus = $${params.length}`)
      }

      if (search) {
        params.push(`%${search}%`)
        conditions.push(`(LOWER(s.full_name) LIKE $${params.length} OR LOWER(s.student_id) LIKE $${params.length} OR LOWER(COALESCE(s.department, '')) LIKE $${params.length} OR LOWER(COALESCE(s.email, '')) LIKE $${params.length})`)
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ')
      }

      query += ' ORDER BY s.created_at DESC'
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
        phone: u.phone,
        email: u.email,
        academicYear: u.academicYear,
        applicationStatus: u.applicationStatus,
        status: u.applicationStatus,
        userStatus: u.userStatus || 'active',
        approvalStatus: u.approvalStatus,
        deanFinding: u.deanFinding,
        deanComments: u.deanComments,
        superAdminComments: u.superAdminComments,
        photoUrl: u.photoUrl || null,
        createdAt: u.createdAt,
        submittedAt: u.createdAt,
      }))
      return res.status(200).json({ users, applications: users })
    } catch (error) {
      console.error('Error fetching users:', error)
      return res.status(500).json({ message: 'Error fetching users', detail: error.message })
    } finally {
      client.release()
    }
  }

  // POST: Create users (Super Admin or Campus Dean)
  if (req.method === 'POST') {
    const client = await pool.connect()
    try {
      const body = req.body || {}
      const { role } = body

      // If creating a Dean user (Super Admin only)
      if (role === 'dean') {
        if (auth.user.role !== 'admin') {
          return res.status(403).json({ message: 'Access denied: Super Admin only' })
        }
        const { name, email, campus, password } = body
        if (!campus || !campus.trim()) {
          return res.status(400).json({ message: 'Campus assignment is required when creating a Campus Dean' })
        }
        const cleanCampus = campus.trim()
        const rawUsername = email ? email.split('@')[0] : `dean.${cleanCampus.toLowerCase().replace(/\s+/g, '')}`
        const username = rawUsername.trim()
        const initialPassword = password || 'Dean@Dilla2026!'
        const hash = await hashPassword(initialPassword)

        const result = await client.query(
          `INSERT INTO app_user (username, password_hash, full_name, role, campus, email, status)
           VALUES ($1, $2, $3, 'dean', $4, $5, 'active')
           ON CONFLICT (username) DO UPDATE 
           SET full_name = EXCLUDED.full_name, campus = EXCLUDED.campus, email = EXCLUDED.email, status = 'active', updated_at = NOW()
           RETURNING id, username, full_name AS "name", email, campus, role, status`,
          [username, hash, name || 'Campus Dean', cleanCampus, email || null]
        )

        // Also update campus table dean_id if campus matches
        if (result.rows[0]?.id && cleanCampus) {
          await client.query(`UPDATE campus SET dean_id = $1 WHERE LOWER(name) = LOWER($2)`, [result.rows[0].id, cleanCampus])
        }

        return res.status(201).json({ dean: result.rows[0], user: result.rows[0] })
      }

      // If Campus Dean is creating a user:
      // Can ONLY create students and must be automatically assigned to the Dean's campus
      if (auth.user.role === 'dean') {
        if (role && role !== 'student') {
          return res.status(403).json({ message: 'Forbidden: Campus Deans can only create student accounts' })
        }
        if (body.campus && body.campus.trim().toLowerCase() !== (auth.user.campus || '').trim().toLowerCase()) {
          return res.status(403).json({
            message: `Forbidden: Campus Dean is restricted to '${auth.user.campus}'. Cannot assign user to '${body.campus}'.`,
          })
        }
      }

      // Otherwise creating a student record
      const {
        studentId, fullName, gender, campus, department, program, yearOfStudy, phone, email, academicYear, password,
      } = body

      if (!studentId || !fullName) {
        return res.status(400).json({ message: 'Student ID and full name are required' })
      }

      // Automatically assign campus: if Dean, strictly Dean's campus; if Admin, require or assign campus
      const targetCampus = auth.user.role === 'dean' ? auth.user.campus : (campus && campus.trim() ? campus.trim() : 'Main Campus')

      const result = await client.query(
        `INSERT INTO student (student_id, full_name, gender, campus, department, program, year_of_study, phone, email, academic_year, application_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'submitted')
         ON CONFLICT (student_id) DO UPDATE 
         SET full_name = EXCLUDED.full_name, department = EXCLUDED.department, campus = EXCLUDED.campus, updated_at = NOW()
         RETURNING id, student_id AS "studentId", full_name AS "fullName", gender, campus, department, program, year_of_study AS "yearOfStudy", phone, email, academic_year AS "academicYear", application_status AS "applicationStatus"`,
        [studentId, fullName, gender || 'Male', targetCampus, department || 'General', program || 'Regular', yearOfStudy || '1', phone || null, email || null, academicYear || '2023/2024']
      )

      // Ensure student also has an app_user login account
      const studentPassword = password || 'Student@Dilla2026!'
      const studentHash = await hashPassword(studentPassword)
      await client.query(
        `INSERT INTO app_user (username, password_hash, full_name, role, campus, email, status)
         VALUES ($1, $2, $3, 'student', $4, $5, 'active')
         ON CONFLICT (username) DO UPDATE 
         SET full_name = EXCLUDED.full_name, campus = EXCLUDED.campus, email = COALESCE(EXCLUDED.email, app_user.email), updated_at = NOW()`,
        [studentId, studentHash, fullName, targetCampus, email || null]
      )

      return res.status(201).json({ user: result.rows[0] })
    } catch (error) {
      console.error('Error creating user:', error)
      return res.status(500).json({ message: 'Error creating user', detail: error.message })
    } finally {
      client.release()
    }
  }

  // PUT: Update user details, student fields, or active/inactive status
  if (req.method === 'PUT') {
    const client = await pool.connect()
    try {
      const body = req.body || {}
      const {
        id,
        userId,
        username,
        name,
        fullName,
        email,
        campus,
        status,
        department,
        program,
        gender,
        yearOfStudy,
        phone,
        photoUrl,
        academicYear,
        isNonCafeteria,
      } = body
      const targetId = (id || userId || username || '').trim()

      if (!targetId) {
        return res.status(400).json({ message: 'User ID or username is required' })
      }

      // 1. Fetch target user to check permissions
      const targetRes = await client.query(
        `SELECT id, username, full_name, role, campus, email, status FROM app_user WHERE id::text = $1 OR LOWER(username) = LOWER($1)`,
        [targetId]
      )

      let target = targetRes.rows[0]

      // If not in app_user, check student table
      if (!target) {
        const stRes = await client.query(
          `SELECT id, student_id AS "username", full_name, 'student' AS "role", campus, email, 'active' AS "status" FROM student WHERE id::text = $1 OR LOWER(student_id) = LOWER($1)`,
          [targetId]
        )
        target = stRes.rows[0]
      }

      if (!target) {
        return res.status(404).json({ message: 'User or student record not found' })
      }

      // 2. Lower roles cannot manage Super Admin accounts
      if (target.role === 'admin' && auth.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Lower roles cannot modify Super Admin accounts.' })
      }

      if (target.role === 'dean' && auth.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Only Super Admin can modify Campus Dean accounts.' })
      }

      if (target.role === 'student' && auth.user.role === 'dean') {
        if (target.campus && auth.user.campus && target.campus.toLowerCase() !== auth.user.campus.toLowerCase()) {
          return res.status(403).json({ message: 'Forbidden: Cannot modify students of another campus.' })
        }
        if (campus && campus.toLowerCase() !== auth.user.campus.toLowerCase()) {
          return res.status(403).json({ message: 'Forbidden: Campus Dean cannot reassign student to another campus.' })
        }
      }

      const cleanName = fullName || name || null

      // 3. Update app_user if present
      let updatedUser = null
      const userExists = await client.query('SELECT id FROM app_user WHERE id::text = $1 OR LOWER(username) = LOWER($1)', [targetId])
      if (userExists.rows.length > 0) {
        const updatedUserRes = await client.query(
          `UPDATE app_user
           SET full_name = COALESCE($1, full_name),
               email = COALESCE($2, email),
               campus = COALESCE($3, campus),
               status = COALESCE($4, status),
               photo_url = COALESCE($5, photo_url),
               updated_at = NOW()
           WHERE id = $6
           RETURNING id, username, full_name AS "name", email, campus, role, status`,
          [cleanName, email || null, campus || null, status || null, photoUrl || null, userExists.rows[0].id]
        )
        updatedUser = updatedUserRes.rows[0]
      }

      // 4. Update student table if target is student
      if (target.role === 'student') {
        const studentUpdates = []
        const studentParams = []

        if (cleanName) {
          studentParams.push(cleanName)
          studentUpdates.push(`full_name = $${studentParams.length}`)
        }
        if (campus) {
          studentParams.push(campus)
          studentUpdates.push(`campus = $${studentParams.length}`)
        }
        if (email) {
          studentParams.push(email)
          studentUpdates.push(`email = $${studentParams.length}`)
        }
        if (department) {
          studentParams.push(department)
          studentUpdates.push(`department = $${studentParams.length}`)
        }
        if (program) {
          studentParams.push(program)
          studentUpdates.push(`program = $${studentParams.length}`)
        }
        if (gender) {
          studentParams.push(gender)
          studentUpdates.push(`gender = $${studentParams.length}`)
        }
        if (yearOfStudy) {
          studentParams.push(yearOfStudy)
          studentUpdates.push(`year_of_study = $${studentParams.length}`)
        }
        if (phone) {
          studentParams.push(phone)
          studentUpdates.push(`phone = $${studentParams.length}`)
        }
        if (photoUrl) {
          studentParams.push(photoUrl)
          studentUpdates.push(`photo_url = $${studentParams.length}`)
        }
        if (academicYear) {
          studentParams.push(academicYear)
          studentUpdates.push(`academic_year = $${studentParams.length}`)
        }
        if (isNonCafeteria !== undefined && isNonCafeteria !== null) {
          studentParams.push(Boolean(isNonCafeteria))
          studentUpdates.push(`is_non_cafeteria = $${studentParams.length}`)
        }

        if (studentUpdates.length > 0) {
          studentParams.push(target.username || targetId)
          await client.query(
            `UPDATE student SET ${studentUpdates.join(', ')}, updated_at = NOW() WHERE student_id = $${studentParams.length} OR id::text = $${studentParams.length}`,
            studentParams
          )
        }
      }

      return res.status(200).json({
        message: 'User and student records updated successfully',
        user: updatedUser || target,
      })
    } catch (error) {
      console.error('Error updating user:', error)
      return res.status(500).json({ message: 'Error updating user', detail: error.message })
    } finally {
      client.release()
    }
  }

  // DELETE: Delete user or student record (Super Admin only, or Dean for campus students)
  if (req.method === 'DELETE') {
    if (auth.user.role !== 'admin' && auth.user.role !== 'dean') {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions to delete records.' })
    }

    const client = await pool.connect()
    try {
      const targetId = (req.query?.id || req.body?.id || req.body?.username || req.body?.studentId || '').trim()
      if (!targetId) {
        return res.status(400).json({ message: 'User ID or Student ID is required' })
      }

      // 1. Fetch target from app_user or student
      let targetRes = await client.query(
        'SELECT id, username, role, campus FROM app_user WHERE id::text = $1 OR LOWER(username) = LOWER($1)',
        [targetId]
      )

      let target = targetRes.rows[0]
      if (!target) {
        const stRes = await client.query(
          `SELECT id, student_id AS "username", 'student' AS "role", campus FROM student WHERE id::text = $1 OR LOWER(student_id) = LOWER($1)`,
          [targetId]
        )
        target = stRes.rows[0]
      }

      if (!target) {
        return res.status(404).json({ message: 'Record not found' })
      }

      // Campus Dean can only delete students within their own campus
      if (auth.user.role === 'dean') {
        if (target.role !== 'student') {
          return res.status(403).json({ message: 'Forbidden: Campus Dean can only delete student records.' })
        }
        if (target.campus && target.campus.toLowerCase() !== auth.user.campus.toLowerCase()) {
          return res.status(403).json({ message: 'Forbidden: Cannot delete student from another campus.' })
        }
      }

      // Prevent Super Admin from deleting own active account
      if (target.id === auth.user.id || target.username === auth.user.username) {
        return res.status(400).json({ message: 'Cannot delete your own active account.' })
      }

      // 2. Clean up associated records
      const studentIdentifier = target.username || targetId

      try {
        await client.query('DELETE FROM student_custom_value WHERE student_id = $1', [studentIdentifier])
        await client.query('DELETE FROM document_metadata WHERE student_id = $1', [studentIdentifier])
      } catch (e) {
        // Continue
      }

      // 3. Delete from student table
      await client.query('DELETE FROM student WHERE student_id = $1 OR id::text = $2', [studentIdentifier, target.id || targetId])

      // 4. Delete from app_user if present
      await client.query('DELETE FROM app_user WHERE id::text = $1 OR username = $2', [target.id || targetId, studentIdentifier])

      return res.status(200).json({
        success: true,
        message: `Record '${target.username || targetId}' was deleted successfully.`,
      })
    } catch (error) {
      console.error('Error deleting record:', error)
      return res.status(500).json({ message: 'Error deleting record', detail: error.message })
    } finally {
      client.release()
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE'])
  return res.status(405).json({ message: 'Method not allowed' })
}