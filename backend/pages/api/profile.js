import { pool } from '@/drizzle/client'
import { authorize, setCorsHeaders } from '@/lib/auth'
import { createNotification } from '@/lib/notifications'

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return

    // GET: Retrieve authenticated user or student profile
    if (req.method === 'GET') {
      const auth = authorize(req, ['student', 'dean', 'admin'])
      if (auth.error) return res.status(auth.status).json({ message: auth.error })

      // Students may only retrieve their own profile.
      const requestedId = req.query?.id
      if (auth.user.role === 'student' && requestedId && String(requestedId).trim() !== '') {
        const ownId = String(auth.user.id || '')
        const ownUsername = String(auth.user.username || auth.user.studentId || '')
        if (String(requestedId) !== ownId && String(requestedId).toLowerCase() !== ownUsername.toLowerCase()) {
          return res.status(403).json({ message: 'Forbidden: You can only view your own profile.' })
        }
      }

      const userId = requestedId || auth.user.id
      try {
        const client = await pool.connect()
        try {
          // Find user in app_user
        const userRes = await client.query(
          `SELECT id, username, full_name AS "fullName", role, campus, email, phone, photo_url AS "photoUrl",
                  must_change_password AS "mustChangePassword", onboarding_status AS "onboardingStatus"
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
                  approval_status AS "approvalStatus", profile_complete AS "profileComplete",
                  created_at AS "createdAt", updated_at AS "updatedAt"
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
          mustChangePassword: appUser ? appUser.mustChangePassword : false,
          onboardingStatus: appUser ? appUser.onboardingStatus : (studentData ? (studentData.profileComplete ? 'completed' : 'profile_completion_required') : null),
          photoUrl: effectivePhoto,
          department: studentData ? studentData.department : null,
          program: studentData ? studentData.program : null,
          yearOfStudy: studentData ? studentData.yearOfStudy : null,
          academicYear: studentData ? studentData.academicYear : null,
          registrationStatus: studentData ? studentData.registrationStatus : null,
          applicationStatus: studentData ? studentData.applicationStatus : null,
          approvalStatus: studentData ? studentData.approvalStatus : null,
          profileComplete: studentData ? studentData.profileComplete : false,
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
        'SELECT id, username, full_name, role, campus, email, photo_url, must_change_password FROM app_user WHERE id::text = $1 OR LOWER(username) = LOWER($1)',
        [targetUserId]
      )
      const targetUser = userRes.rows[0] || null

      // A student must change their initial password before completing their profile.
      // This is checked against the database (not the token) so that it stays correct
      // even if the browser is still holding a pre-password-change JWT.
      if (
        auth.user.role === 'student' &&
        targetUser &&
        (targetUser.must_change_password === true || targetUser.must_change_password === 'true')
      ) {
        return res.status(403).json({
          message: 'You must change your initial password before completing your profile.',
          onboardingStatus: 'password_change_required',
          requiresPasswordChange: true,
        })
      }

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
        campus,
        academicYear,
        customValues,
        profileComplete,
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
        'SELECT student_id, full_name, campus, academic_year FROM student WHERE student_id = $1 OR id::text = $1',
        [studentLookup]
      )

      if (stCheck.rows.length > 0) {
        const existingStudent = stCheck.rows[0]
        const studentCampus = existingStudent.campus || null
        const studentAcademicYear = existingStudent.academic_year || null

        // Validate the selected department against the institution's department table.
        // Arbitrary department text is never accepted.
        if (department !== undefined && department !== null && String(department).trim() !== '') {
          const cleanDepartment = String(department).trim()
          const deptRes = await client.query(
            `SELECT id, name, campus FROM department WHERE LOWER(name) = LOWER($1) AND is_active = true LIMIT 1`,
            [cleanDepartment]
          )
          if (deptRes.rows.length === 0) {
            return res.status(400).json({
              message: 'Invalid or inactive department selected. Please choose a department from the list.',
              fieldKey: 'department',
            })
          }
          const selectedDept = deptRes.rows[0]
          if (
            selectedDept.campus &&
            studentCampus &&
            String(selectedDept.campus).toLowerCase() !== String(studentCampus).toLowerCase()
          ) {
            return res.status(400).json({
              message: 'The selected department is not available for your assigned campus.',
              fieldKey: 'department',
            })
          }
        }

        // Campus may be completed when missing, but a student cannot reassign
        // themselves to a different campus without authorization.
        let campusValue = studentCampus
        if (!campusValue && campus !== undefined && campus !== null && String(campus).trim() !== '') {
          const cleanCampus = String(campus).trim()
          const campRes = await client.query(
            'SELECT id FROM campus WHERE LOWER(name) = LOWER($1) AND status = $2 LIMIT 1',
            [cleanCampus, 'active']
          )
          if (campRes.rows.length === 0) {
            return res.status(400).json({
              message: 'Invalid or inactive campus selected. Please choose a campus from the list.',
              fieldKey: 'campus',
            })
          }
          campusValue = cleanCampus
        }

        // Academic year may be completed when missing, but a student cannot
        // assign themselves a different academic year without authorization.
        let academicYearValue = studentAcademicYear
        if (
          !academicYearValue &&
          academicYear !== undefined &&
          academicYear !== null &&
          String(academicYear).trim() !== ''
        ) {
          const cleanAcademicYear = String(academicYear).trim()
          const ayRes = await client.query('SELECT id FROM academic_year WHERE year = $1 LIMIT 1', [
            cleanAcademicYear,
          ])
          if (ayRes.rows.length === 0) {
            return res.status(400).json({
              message: 'Invalid academic year selected.',
              fieldKey: 'academicYear',
            })
          }
          academicYearValue = cleanAcademicYear
        }

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
              campus = $9,
              academic_year = $10,
              profile_complete = COALESCE($11, profile_complete),
              updated_at = NOW()
           WHERE student_id = $12
           RETURNING id, student_id AS "studentId", full_name AS "fullName", gender, campus, department, program, year_of_study AS "yearOfStudy", phone, email, photo_url AS "photoUrl", academic_year AS "academicYear", is_non_cafeteria AS "isNonCafeteria", registration_status AS "registrationStatus", application_status AS "applicationStatus", profile_complete AS "profileComplete"`,
          [
            newFullName || null,
            newEmail,
            phone !== undefined ? phone.trim() : null,
            newPhotoUrl,
            gender || null,
            department || null,
            program || null,
            yearOfStudy || null,
            campusValue,
            academicYearValue,
            profileComplete !== undefined ? profileComplete : null,
            existingStudent.student_id,
          ]
        )
        updatedStudent = stUpdate.rows[0]

        // When the student completes their profile, advance onboarding status to completed
        // and notify the student.
        if (profileComplete === true && targetUser) {
          await client.query(
            'UPDATE app_user SET onboarding_status = $1, updated_at = NOW() WHERE id = $2',
            ['completed', targetUser.id]
          )
          try {
            await createNotification(
              {
                recipientId: existingStudent.student_id,
                recipientRole: 'student',
                campus: existingStudent.campus || null,
                title: 'Profile Completed',
                message: 'Your student profile has been completed successfully. You now have full access to the registration dashboard.',
                type: 'success',
                link: '/',
              },
              client
            )
          } catch (notifErr) {
            console.error('Profile completion notification error (non-fatal):', notifErr.message)
          }
        }

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
