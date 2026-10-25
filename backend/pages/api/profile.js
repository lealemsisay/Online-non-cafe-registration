import { pool } from '@/drizzle/client'
import { authorize, setCorsHeaders } from '@/lib/auth'

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return

  // GET: Retrieve authenticated user or student profile
  if (req.method === 'GET') {
    const auth = authorize(req, ['student', 'dean', 'admin'])
    if (auth.error) return res.status(auth.status).json({ message: auth.error })

    try {
      const userId = req.query?.id || auth.user.id
      const client = await pool.connect()
      try {
        // Find user in app_user
        const userRes = await client.query(
          `SELECT id, username, full_name AS "fullName", role, campus, email, phone, photo_url AS "photoUrl"
           FROM app_user
           WHERE id::text = $1::text OR LOWER(username) = LOWER($1::text) OR LOWER(COALESCE(email, '')) = LOWER($1::text)`,
          [String(userId)]
        )

        let appUser = userRes.rows[0] || null
        const studentLookupId = appUser && appUser.username ? appUser.username : userId
        // Check student table if user is a student or looking up a student
        const studentRes = await client.query(
          `SELECT id, student_id AS "studentId", full_name AS "fullName", gender, campus, department, program,
                  year_of_study AS "yearOfStudy", phone, email, photo_url AS "photoUrl", academic_year AS "academicYear",
                  is_non_cafeteria AS "isNonCafeteria", registration_status AS "registrationStatus",
                  application_status AS "applicationStatus", dean_review AS "deanReview", dean_comments AS "deanComments",
                  super_admin_review AS "superAdminReview", super_admin_comments AS "superAdminComments",
                  approval_status AS "approvalStatus", created_at AS "createdAt", updated_at AS "updatedAt"
           FROM student
           WHERE id::text = $1::text OR LOWER(student_id) = LOWER($1::text) OR LOWER(student_id) = LOWER($2::text)`,
          [String(userId), String(studentLookupId)]
        )

        let studentData = studentRes.rows[0] || null

        if (!appUser && !studentData) {
          return res.status(404).json({ message: 'User not found' })
        }

        // Fetch custom fields and values if student record exists (including historical fields)
        if (studentData) {
         try {
          const studentCampus = studentData.campus || (appUser && appUser.campus) || 'Main Campus'

          // 1. Fetch all student saved custom values (including historical/archived fields)
          const studentValuesRes = await client.query(
            `SELECT 
               v.field_key AS "fieldKey", 
               v.value, 
               COALESCE(d.label, v.field_key) AS label, 
               COALESCE(d.field_type, 'text') AS "fieldType", 
               d.options, 
               COALESCE(d.is_required, false) AS "isRequired",
               COALESCE(d.is_active, false) AS "isActive"
             FROM student_custom_value v
             LEFT JOIN custom_field_definition d ON d.id = v.field_id
             WHERE v.student_id = $1`,
            [studentData.studentId]
          )

          // 2. Fetch all active definitions for this campus
          const activeDefsRes = await client.query(
            `SELECT id, field_key AS "fieldKey", label, field_type AS "fieldType", options, is_required AS "isRequired"
             FROM custom_field_definition
             WHERE is_active = true AND (campus IS NULL OR LOWER(campus) = LOWER($1))
             ORDER BY COALESCE(display_order, 0) ASC, created_at ASC`,
            [studentCampus]
          )

          const customValuesMap = {}
          const fieldsMap = new Map()

          // Populate with active definitions first
          activeDefsRes.rows.forEach((d) => {
            fieldsMap.set(d.fieldKey, {
              fieldKey: d.fieldKey,
              label: d.label,
              fieldType: d.fieldType,
              options: d.options,
              isRequired: d.isRequired,
              isActive: true,
              value: null,
            })
          })

          // Overlay student saved values (including deactivated fields)
          studentValuesRes.rows.forEach((v) => {
            customValuesMap[v.fieldKey] = v.value
            if (fieldsMap.has(v.fieldKey)) {
              fieldsMap.get(v.fieldKey).value = v.value
            } else {
              fieldsMap.set(v.fieldKey, {
                fieldKey: v.fieldKey,
                label: v.label,
                fieldType: v.fieldType,
                options: v.options,
                isRequired: v.isRequired,
                isActive: v.isActive,
                value: v.value,
              })
            }
          })

          studentData = {
            ...studentData,
            customValues: customValuesMap,
            customFields: Array.from(fieldsMap.values()),
          }
         } catch (cfErr) {
          console.error('Profile custom fields error (non-fatal):', cfErr.message)
          studentData = { ...studentData, customValues: {}, customFields: [] }
         }
        }

        const effectivePhoto =
          (studentData && studentData.photoUrl) || (appUser && appUser.photoUrl) || null

        const responseUser = {
          id: appUser ? appUser.id : studentData.id,
          studentId: appUser ? appUser.username : studentData.studentId,
          username: appUser ? appUser.username : studentData.studentId,
          name: appUser ? appUser.fullName : studentData.fullName,
          fullName: appUser ? appUser.fullName : studentData.fullName,
          role: appUser ? appUser.role : 'student',
          campus: (appUser && appUser.campus) || (studentData && studentData.campus) || '',
          email: (appUser && appUser.email) || (studentData && studentData.email) || '',
          phone: (appUser && appUser.phone) || (studentData && studentData.phone) || '',
          photoUrl: effectivePhoto,
          department: studentData ? studentData.department : null,
          program: studentData ? studentData.program : null,
          yearOfStudy: studentData ? studentData.yearOfStudy : null,
          academicYear: studentData ? studentData.academicYear : null,
          registrationStatus: studentData ? studentData.registrationStatus : null,
          applicationStatus: studentData ? studentData.applicationStatus : null,
          approvalStatus: studentData ? studentData.approvalStatus : null,
        }

        return res.status(200).json({ user: responseUser, student: studentData })
      } finally {
        client.release()
      }
    } catch (error) {
      console.error('Profile fetch error:', error)
      return res.status(500).json({ message: 'Server error fetching profile', detail: error.message })
    }
  }

  // PUT / PATCH: Update authenticated user profile
  if (req.method === 'PUT' || req.method === 'PATCH') {
    const auth = authorize(req, ['student', 'dean', 'admin'])
    if (auth.error) return res.status(auth.status).json({ message: auth.error })

    const client = await pool.connect()
    try {
      const body = req.body || {}
      const targetUserId = (body.userId || body.id || auth.user.id).trim()

      // Enforce authorization: Students and Deans can only update their own profile; Admin can update own or others
      if (auth.user.role !== 'admin') {
        const ownId = (auth.user.id || '').toLowerCase()
        const ownUsername = (auth.user.username || auth.user.studentId || '').toLowerCase()
        if (targetUserId.toLowerCase() !== ownId && targetUserId.toLowerCase() !== ownUsername) {
          return res.status(403).json({ message: 'Forbidden: You cannot modify another user’s profile.' })
        }
      }

      // Fetch user to update
      const userRes = await client.query(
        'SELECT id, username, full_name, role, campus, email, photo_url FROM app_user WHERE id::text = $1 OR LOWER(username) = LOWER($1)',
        [targetUserId]
      )
      const targetUser = userRes.rows[0] || null

      const {
        fullName,
        name,
        email,
        phone,
        photoUrl,
        gender,
        department,
        program,
        yearOfStudy,
        customValues,
      } = body

      const newFullName = (fullName || name || (targetUser && targetUser.full_name) || '').trim()
      const newEmail = email !== undefined ? (email ? email.trim() : null) : (targetUser ? targetUser.email : null)
      const newPhotoUrl = photoUrl !== undefined ? photoUrl : (targetUser ? targetUser.photo_url : null)

      // 1. Update app_user if user exists in app_user
      let updatedUser = null
      if (targetUser) {
        const updateRes = await client.query(
          `UPDATE app_user
           SET full_name = COALESCE($1, full_name),
               email = $2,
               phone = COALESCE($3, phone),
               photo_url = COALESCE($4, photo_url),
               updated_at = NOW()
           WHERE id = $5
           RETURNING id, username, full_name AS "fullName", role, campus, email, phone, photo_url AS "photoUrl"`,
          [newFullName || null, newEmail, phone !== undefined ? phone.trim() : null, newPhotoUrl, targetUser.id]
        )
        updatedUser = updateRes.rows[0]
      }

      // 2. Update student table if target is student
      const studentLookup = (targetUser && targetUser.username) || targetUserId
      let updatedStudent = null

      const stCheck = await client.query(
        'SELECT student_id, full_name, campus FROM student WHERE student_id = $1 OR id::text = $1',
        [studentLookup]
      )

      if (stCheck.rows.length > 0) {
        const existingStudent = stCheck.rows[0]
        const stUpdate = await client.query(
          `UPDATE student
           SET full_name = COALESCE($1, full_name),
               email = $2,
               phone = COALESCE($3, phone),
               photo_url = COALESCE($4, photo_url),
               gender = COALESCE($5, gender),
               department = COALESCE($6, department),
               program = COALESCE($7, program),
               year_of_study = COALESCE($8, year_of_study),
               updated_at = NOW()
           WHERE student_id = $9
           RETURNING id, student_id AS "studentId", full_name AS "fullName", gender, campus, department, program, year_of_study AS "yearOfStudy", phone, email, photo_url AS "photoUrl", academic_year AS "academicYear", is_non_cafeteria AS "isNonCafeteria", registration_status AS "registrationStatus", application_status AS "applicationStatus"`,
          [
            newFullName || null,
            newEmail,
            phone !== undefined ? phone.trim() : null,
            newPhotoUrl,
            gender || null,
            department || null,
            program || null,
            yearOfStudy || null,
            existingStudent.student_id,
          ]
        )
        updatedStudent = stUpdate.rows[0]

        // Update custom values if passed
        if (customValues && typeof customValues === 'object') {
          const defsRes = await client.query(
            `SELECT id, field_key, label, COALESCE(is_student_editable, true) AS "isStudentEditable" 
             FROM custom_field_definition 
             WHERE is_active = true AND (campus IS NULL OR LOWER(campus) = LOWER($1))`,
            [existingStudent.campus || 'Main Campus']
          )

          // Fetch existing custom values to enforce read-only checks
          const existingValsRes = await client.query(
            `SELECT field_key AS "fieldKey", value FROM student_custom_value WHERE student_id = $1`,
            [existingStudent.student_id]
          )
          const existingMap = {}
          existingValsRes.rows.forEach((r) => {
            existingMap[r.fieldKey] = r.value
          })

          for (const def of defsRes.rows) {
            const val = customValues[def.field_key]
            if (val !== undefined && val !== null) {
              const valStr = typeof val === 'boolean' ? (val ? 'true' : 'false') : String(val).trim()
              const existingVal = existingMap[def.field_key] !== undefined ? String(existingMap[def.field_key]).trim() : ''

              if (auth.user.role === 'student' && def.isStudentEditable === false && existingVal !== '') {
                if (valStr !== existingVal) {
                  return res.status(403).json({
                    message: `Field '${def.label || def.field_key}' is read-only and cannot be modified by students.`,
                    fieldKey: def.field_key,
                  })
                }
              }

              await client.query(
                `INSERT INTO student_custom_value (student_id, field_id, field_key, value, updated_at)
                 VALUES ($1, $2, $3, $4, NOW())
                 ON CONFLICT (student_id, field_id) DO UPDATE
                 SET value = EXCLUDED.value, updated_at = NOW()`,
                [existingStudent.student_id, def.id, def.field_key, valStr]
              )
            }
          }
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully.',
        user: updatedUser || updatedStudent,
        student: updatedStudent,
      })
    } catch (error) {
      console.error('Profile update error:', error)
      return res.status(500).json({ message: 'Internal server error updating profile.', detail: error.message })
    } finally {
      client.release()
    }
  }

  res.setHeader('Allow', ['GET', 'PUT', 'PATCH'])
  return res.status(405).json({ message: 'Method not allowed' })
}
