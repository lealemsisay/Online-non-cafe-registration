import { pool } from '@/drizzle/client'
import { authorize, setCorsHeaders } from '@/lib/auth'
import { checkRegistrationWindow } from '@/lib/schedule'
import { createNotification } from '@/lib/notifications'
import { getPhotoSettings, validatePhotoSettings } from '@/lib/photo-settings'
import {
  normalizeRegistrationPolicies,
  getRegistrationPolicies,
} from '@/lib/registration-policies'

const parseSetting = (value) => {
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

async function syncGlobalDepartments(client, departments, actor) {
  const names = [
    ...new Set(
      (Array.isArray(departments) ? departments : [])
        .map((name) => String(name || '').trim())
        .filter(Boolean)
    ),
  ]

  await client.query(
    `UPDATE department
     SET is_active = false, updated_at = NOW()
     WHERE campus IS NULL AND is_active = true AND NOT (name = ANY($1::text[]))`,
    [names]
  )

  for (const name of names) {
    await client.query(
      `INSERT INTO department (name, campus, is_active, created_by)
       VALUES ($1, NULL, true, $2)
       ON CONFLICT DO NOTHING`,
      [name, actor]
    )
    await client.query(
      `UPDATE department
       SET is_active = true, updated_at = NOW()
       WHERE campus IS NULL AND LOWER(name) = LOWER($1)`,
      [name]
    )
  }
}

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return

  // GET: Authenticated users can view settings, academic years, and registration schedule
  if (req.method === 'GET') {
    const auth = authorize(req, ['admin', 'dean', 'student'])
    if (auth.error) return res.status(auth.status).json({ message: auth.error })

    const client = await pool.connect()
    try {
      const yearRes = await client.query('SELECT year, is_active AS "isActive" FROM academic_year ORDER BY year DESC')
      const settingRes = await client.query('SELECT key, value FROM system_setting')

      const systemSettings = {
        allowLateRegistration: false,
        requirePdfVerification: true,
        maxPdfSizeMB: 5,
        maxPhotoSizeMB: 8,
        max_photo_size_mb: 8,
        registration_start_date: null,
        registration_end_date: null,
        registration_is_open: true,
        allow_late_registration: false,
        customFields: []
      }

      settingRes.rows.forEach(r => {
        systemSettings[r.key] = parseSetting(r.value)
      })

      // Add custom fields from database
      const customFieldRes = await client.query('SELECT * FROM custom_field_definition ORDER BY display_order ASC, created_at ASC')
      systemSettings.customFields = customFieldRes.rows.map(r => ({
        id: r.id,
        field_key: r.field_key,
        label: r.label,
        field_type: r.field_type,
        options: r.options,
        is_required: r.is_required,
        is_active: r.is_active,
        campus: r.campus,
        is_student_editable: r.is_student_editable,
        visible_admin: r.visible_admin,
        visible_dean: r.visible_dean,
        visible_student: r.visible_student,
        display_order: r.display_order,
        validation_rules: r.validation_rules,
        applies_to: r.applies_to,
        created_by: r.created_by,
        created_at: r.created_at,
        updated_at: r.updated_at
      }))

      if (systemSettings.max_photo_size_mb) {
        systemSettings.maxPhotoSizeMB = Number(systemSettings.max_photo_size_mb)
      } else if (systemSettings.maxPhotoSizeMB) {
        systemSettings.max_photo_size_mb = Number(systemSettings.maxPhotoSizeMB)
      }

      const photoSettings = await getPhotoSettings(client)
      const registrationPolicies = normalizeRegistrationPolicies(systemSettings)

      const defaultDepartments = [
        'Computer Science',
        'Information Technology',
        'Software Engineering',
        'Business Administration',
        'Economics',
        'Civil Engineering',
        'Electrical Engineering',
        'Medicine & Health Sciences',
        'Nursing',
        'Law',
        'Agriculture & Natural Resources',
      ]
      const defaultBatches = ['2021', '2022', '2023', '2024', '2025', '2026']
      const defaultPrograms = ['Regular Degree', 'Continuing Education', 'Postgraduate Degree']

      // The normalized department table is the source of truth once Phase 2 has run.
      // Fall back to the legacy JSON list for databases that have not been migrated yet.
      let departmentRows = []
      try {
        const deptRes = await client.query(
          'SELECT name FROM department WHERE is_active = true ORDER BY name ASC'
        )
        departmentRows = deptRes.rows.map((row) => row.name)
      } catch (deptError) {
        console.warn('Department table unavailable, using legacy setting:', deptError.message)
      }

      const departments = departmentRows.length
        ? [...new Set(departmentRows)]
        : Array.isArray(systemSettings.departments)
        ? systemSettings.departments
        : defaultDepartments
      const batches = Array.isArray(systemSettings.batches) ? systemSettings.batches : defaultBatches
      const programs = Array.isArray(systemSettings.programs) ? systemSettings.programs : defaultPrograms

      const registrationWindow = await checkRegistrationWindow(client)

      const auditRes = await client.query(
        `SELECT id, action, performed_by AS "performedBy", target_id AS "targetId", details, created_at AS "createdAt"
         FROM audit_log
         WHERE action IN ('update_schedule', 'enable_late_registration', 'disable_late_registration', 'toggle_late_registration')
         ORDER BY created_at DESC
         LIMIT 25`
      )

      return res.status(200).json({
        academicYears: yearRes.rows.map(y => y.year),
        academicYearDetails: yearRes.rows,
        departments,
        batches,
        programs,
        systemSettings,
        photoSettings,
        registrationPolicies,
        registrationWindow,
        scheduleAuditHistory: auditRes.rows,
      })
    } catch (error) {
      console.error('Error fetching settings:', error)
      return res.status(500).json({ message: 'Error fetching settings' })
    } finally {
      client.release()
    }
  }

  // POST / PUT: Super Admin only
  if (req.method === 'POST' || req.method === 'PUT') {
    const auth = authorize(req, ['admin'])
    if (auth.error) return res.status(auth.status).json({ message: auth.error })

    const client = await pool.connect()
    try {
      const body = req.body || {}
      const {
        newAcademicYear,
        academicYear,
        systemSettings,
        schedule,
        customFields,
        photoSettings,
        registrationPolicies,
        reason,
      } = body

      // Add academic year if provided
      const yearToAdd = (newAcademicYear || academicYear || '').trim()
      if (yearToAdd) {
        await client.query(
          `INSERT INTO academic_year (year, is_active)
           VALUES ($1, false)
           ON CONFLICT (year) DO NOTHING`,
          [yearToAdd]
        )
      }

      // Upsert system settings if provided
      const settingsToSave = { ...(systemSettings || {}) }
      if (body.maxPhotoSizeMB !== undefined) {
        settingsToSave.maxPhotoSizeMB = body.maxPhotoSizeMB
      }
      if (body.max_photo_size_mb !== undefined) {
        settingsToSave.max_photo_size_mb = body.max_photo_size_mb
      }
      if (body.departments !== undefined && Array.isArray(body.departments)) {
        settingsToSave.departments = body.departments
      }
      if (body.batches !== undefined && Array.isArray(body.batches)) {
        settingsToSave.batches = body.batches
      }
      if (body.programs !== undefined && Array.isArray(body.programs)) {
        settingsToSave.programs = body.programs
      }

      // Photo requirements (size, formats, dimensions, aspect ratio)
      let savedPhotoSettings = null
      if (photoSettings !== undefined) {
        if (!photoSettings || typeof photoSettings !== 'object') {
          return res.status(400).json({ message: 'photoSettings must be an object.' })
        }
        const currentPhotoSettings = await getPhotoSettings(client)
        const mergedPhotoSettings = {
          ...currentPhotoSettings,
          ...photoSettings,
          aspectRatio: {
            ...currentPhotoSettings.aspectRatio,
            ...(photoSettings.aspectRatio || {}),
          },
        }
        const photoValidation = validatePhotoSettings(mergedPhotoSettings)
        if (!photoValidation.ok) {
          return res.status(400).json({ message: photoValidation.error })
        }
        savedPhotoSettings = photoValidation.settings
        settingsToSave.photo_settings = savedPhotoSettings
        settingsToSave.maxPhotoSizeMB = savedPhotoSettings.maxSizeMB
        settingsToSave.max_photo_size_mb = savedPhotoSettings.maxSizeMB
      }

      // Registration policies (PDF verification and Cafe / Non-Cafe windows)
      let savedRegistrationPolicies = null
      if (registrationPolicies !== undefined) {
        if (!registrationPolicies || typeof registrationPolicies !== 'object') {
          return res.status(400).json({ message: 'registrationPolicies must be an object.' })
        }
        const currentPolicies = await getRegistrationPolicies(client)
        const mergedPolicies = {
          ...currentPolicies,
          ...registrationPolicies,
        }
        const maxPdf = Number(mergedPolicies.maxPdfSizeMB)
        if (!Number.isFinite(maxPdf) || maxPdf < 1 || maxPdf > 50) {
          return res.status(400).json({
            message: 'Invalid PDF size limit. Must be a value between 1 MB and 50 MB.',
          })
        }
        savedRegistrationPolicies = {
          requirePdfVerification: Boolean(mergedPolicies.requirePdfVerification),
          maxPdfSizeMB: maxPdf,
          cafeRegistrationOpen: Boolean(mergedPolicies.cafeRegistrationOpen),
          nonCafeRegistrationOpen: Boolean(mergedPolicies.nonCafeRegistrationOpen),
        }
        settingsToSave.registration_policies = savedRegistrationPolicies
        settingsToSave.requirePdfVerification = savedRegistrationPolicies.requirePdfVerification
        settingsToSave.maxPdfSizeMB = savedRegistrationPolicies.maxPdfSizeMB
        settingsToSave.cafe_registration_open =
          savedRegistrationPolicies.cafeRegistrationOpen
        settingsToSave.non_cafe_registration_open =
          savedRegistrationPolicies.nonCafeRegistrationOpen
      }

      // Handle custom fields if provided
      if (body.customFields !== undefined && Array.isArray(body.customFields)) {
        for (const cf of body.customFields) {
          const { field_key, label, field_type, options, is_required, is_active, campus, is_student_editable, visible_admin, visible_dean, visible_student, display_order, validation_rules, applies_to, applicability } = cf
          const appliesTo = applies_to || applicability || 'all'
          if (field_key && label && field_type) {
            await client.query(
              `INSERT INTO custom_field_definition (field_key, label, field_type, options, is_required, is_active, campus, is_student_editable, visible_admin, visible_dean, visible_student, display_order, validation_rules, applies_to, created_by, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
               ON CONFLICT (field_key) DO UPDATE SET label = EXCLUDED.label, field_type = EXCLUDED.field_type, options = EXCLUDED.options, is_required = EXCLUDED.is_required, is_active = EXCLUDED.is_active, campus = EXCLUDED.campus, is_student_editable = EXCLUDED.is_student_editable, visible_admin = EXCLUDED.visible_admin, visible_dean = EXCLUDED.visible_dean, visible_student = EXCLUDED.visible_student, display_order = EXCLUDED.display_order, validation_rules = EXCLUDED.validation_rules, applies_to = EXCLUDED.applies_to, updated_at = NOW()`,
              [field_key, label, field_type, JSON.stringify(options || []), is_required !== false, is_active !== false, campus, is_student_editable !== false, visible_admin !== false, visible_dean !== false, visible_student !== false, display_order !== undefined ? display_order : 0, validation_rules || '{}', appliesTo, auth.user.username || 'admin']
            )
          }
        }
        settingsToSave.customFields = body.customFields
      }

      // Validate max photo size limit if provided (must be between 1 MB and 10 MB)
      const photoLimitCandidate = settingsToSave.maxPhotoSizeMB !== undefined 
        ? settingsToSave.maxPhotoSizeMB 
        : settingsToSave.max_photo_size_mb
      
      if (photoLimitCandidate !== undefined && photoLimitCandidate !== null) {
        const parsedLimit = Number(photoLimitCandidate)
        if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 10) {
          return res.status(400).json({ 
            message: 'Invalid photo upload size limit. Must be a value between 1 MB and 10 MB.' 
          })
        }
        settingsToSave.maxPhotoSizeMB = parsedLimit
        settingsToSave.max_photo_size_mb = parsedLimit
      }

      // Schedule and Late Registration processing
      let scheduleAuditAction = null
      let scheduleAuditDetails = null

      if (schedule && typeof schedule === 'object') {
        const effectiveStartDate = schedule.startDate !== undefined ? schedule.startDate : settingsToSave.registration_start_date
        const effectiveEndDate = schedule.endDate !== undefined ? schedule.endDate : settingsToSave.registration_end_date

        // Validate closing time is not earlier than opening time
        if (effectiveStartDate && effectiveEndDate) {
          const sTime = new Date(effectiveStartDate).getTime()
          const eTime = new Date(effectiveEndDate).getTime()
          if (!isNaN(sTime) && !isNaN(eTime) && eTime < sTime) {
            return res.status(400).json({
              message: 'Registration closing date & time cannot be earlier than opening date & time.',
            })
          }
        }

        if (schedule.startDate !== undefined) settingsToSave.registration_start_date = schedule.startDate
        if (schedule.endDate !== undefined) settingsToSave.registration_end_date = schedule.endDate
        if (schedule.isOpen !== undefined) settingsToSave.registration_is_open = Boolean(schedule.isOpen)
        
        let lateRegToggled = false
        if (schedule.allowLate !== undefined) {
          const newAllowLate = Boolean(schedule.allowLate)
          settingsToSave.allow_late_registration = newAllowLate
          settingsToSave.allowLateRegistration = newAllowLate
          lateRegToggled = true
        }

        const effectiveReason = (reason || schedule.reason || '').trim() || 
          (lateRegToggled && schedule.allowLate ? 'Late registration window authorized by administrator' : 'Registration schedule updated')

        scheduleAuditAction = lateRegToggled ? (schedule.allowLate ? 'enable_late_registration' : 'disable_late_registration') : 'update_schedule'
        scheduleAuditDetails = {
          startDate: settingsToSave.registration_start_date,
          endDate: settingsToSave.registration_end_date,
          isOpen: settingsToSave.registration_is_open,
          allowLate: settingsToSave.allow_late_registration,
          reason: effectiveReason,
          timestamp: new Date().toISOString(),
        }
      }

      for (const [key, value] of Object.entries(settingsToSave)) {
        await client.query(
          `INSERT INTO system_setting (key, value, updated_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
          [key, JSON.stringify(value)]
        )
      }

      const actor = auth.user.username || auth.user.email || 'admin'

      // Keep the normalized department table in sync with the academic settings form
      if (Array.isArray(settingsToSave.departments)) {
        await syncGlobalDepartments(client, settingsToSave.departments, actor)
      }

      if (savedPhotoSettings) {
        await client.query(
          `INSERT INTO audit_log (action, performed_by, target_id, target_type, details)
           VALUES ('update_photo_settings', $1, 'photo_settings', 'system_setting', $2)`,
          [
            actor,
            JSON.stringify({
              ...savedPhotoSettings,
              reason: (reason || '').trim() || 'Photo requirements updated',
              timestamp: new Date().toISOString(),
            }),
          ]
        )
      }

      if (savedRegistrationPolicies) {
        await client.query(
          `INSERT INTO audit_log (action, performed_by, target_id, target_type, details)
           VALUES ('update_registration_policies', $1, 'registration_policies', 'system_setting', $2)`,
          [
            actor,
            JSON.stringify({
              ...savedRegistrationPolicies,
              reason: (reason || '').trim() || 'Registration policies updated',
              timestamp: new Date().toISOString(),
            }),
          ]
        )
      }

      // Record schedule change to audit_log
      if (scheduleAuditAction && scheduleAuditDetails) {
        await client.query(
          `INSERT INTO audit_log (action, performed_by, target_id, target_type, details)
           VALUES ($1, $2, 'registration_schedule', 'system_setting', $3)`,
          [
            scheduleAuditAction,
            auth.user.username || auth.user.email || 'admin',
            JSON.stringify(scheduleAuditDetails),
          ]
        )
      }

      const yearRes = await client.query('SELECT year FROM academic_year ORDER BY year DESC')
      const windowStatus = await checkRegistrationWindow(client)

      // Notify users if schedule changed
      if (schedule) {
        await createNotification(
          {
            recipientRole: 'all',
            title: 'Registration Schedule Updated',
            message: `The cost-sharing registration window has been updated by the administration. Status: ${windowStatus.isOpen ? 'Open' : 'Closed'}.`,
            type: 'info',
            link: '/',
          },
          client
        )
      }

      const auditRes = await client.query(
        `SELECT id, action, performed_by AS "performedBy", target_id AS "targetId", details, created_at AS "createdAt"
         FROM audit_log
         WHERE action IN ('update_schedule', 'enable_late_registration', 'disable_late_registration', 'toggle_late_registration')
         ORDER BY created_at DESC
         LIMIT 25`
      )

      const effectivePhotoSettings = savedPhotoSettings || (await getPhotoSettings(client))
      const effectiveRegistrationPolicies =
        savedRegistrationPolicies || (await getRegistrationPolicies(client))

      return res.status(200).json({
        message: 'Settings saved successfully',
        academicYears: yearRes.rows.map(y => y.year),
        photoSettings: effectivePhotoSettings,
        registrationPolicies: effectiveRegistrationPolicies,
        registrationWindow: windowStatus,
        scheduleAuditHistory: auditRes.rows,
      })
    } catch (error) {
      console.error('Error saving settings:', error)
      return res.status(500).json({ message: 'Error saving settings' })
    } finally {
      client.release()
    }
  }

  // Custom Field Management Routes
  if (req.method === 'GET' && req.path.startsWith('/api/settings/field/')) {
    const auth = authorize(req, ['admin', 'super_admin'])
    if (auth.error) return res.status(auth.status).json({ message: auth.error })

    const client = await pool.connect()
    try {
      const fieldId = req.path.split('/').pop()
      if (req.query.status === 'toggle') {
        // Toggle is_active status
        const fieldRes = await client.query(
          `UPDATE custom_field_definition SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1 RETURNING *`,
          [fieldId]
        )
        if (fieldRes.rows.length === 0) {
          return res.status(404).json({ message: 'Custom field not found' })
        }
        await client.query(
          `INSERT INTO audit_log (action, performed_by, target_id, target_type, details)
           VALUES ('toggle_custom_field', $1, 'custom_field', $2,
            $3)`,
          [
            auth.user.username || auth.user.email || 'admin',
            fieldId,
            `Toggled custom field ${fieldRes.rows[0].field_key} is_active to ${fieldRes.rows[0].is_active}`
          ]
        )
        return res.status(200).json({ success: true, field: fieldRes.rows[0] })
      } else if (req.query.action === 'delete') {
        // Delete custom field
        const fieldRes = await client.query(
          `DELETE FROM custom_field_definition WHERE id = $1 RETURNING field_key, label`,
          [fieldId]
        )
        if (fieldRes.rows.length === 0) {
          return res.status(404).json({ message: 'Custom field not found' })
        }
        await client.query(
          `INSERT INTO audit_log (action, performed_by, target_id, target_type, details)
           VALUES ('delete_custom_field', $1, 'custom_field', $2,
            $3)`,
          [
            auth.user.username || auth.user.email || 'admin',
            fieldId,
            `Deleted custom field ${fieldRes.rows[0].field_key}`
          ]
        )
        return res.status(200).json({ success: true, deletedField: fieldRes.rows[0] })
      } else {
        // Get single custom field
        const fieldRes = await client.query(
          `SELECT * FROM custom_field_definition WHERE id = $1`,
          [fieldId]
        )
        if (fieldRes.rows.length === 0) {
          return res.status(404).json({ message: 'Custom field not found' })
        }
        return res.status(200).json({ success: true, field: fieldRes.rows[0] })
      }
    } catch (error) {
      console.error('Error managing custom field:', error)
      return res.status(500).json({ message: 'Error managing custom field' })
    } finally {
      client.release()
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT'])
  return res.status(405).json({ message: 'Method not allowed' })
}
