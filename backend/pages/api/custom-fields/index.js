import { pool } from '@/drizzle/client'
import { authorize, setCorsHeaders } from '@/lib/auth'
import { createNotification } from '@/lib/notifications'

export const SUPPORTED_FIELD_TYPES = [
  'text',
  'textarea',
  'number',
  'email',
  'phone',
  'tel',
  'date',
  'select',
  'radio',
  'checkbox',
  'file',
  'department',
  'batch',
  'academic_year',
]

const PROTECTED_FIELD_KEYS = [
  'id',
  'studentid',
  'student_id',
  'password',
  'password_hash',
  'alt_password_hash',
  'role',
  'role_name',
  'status',
  'created_at',
  'updated_at',
  'token',
]

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return

  // Authenticated users only
  const auth = authorize(req, ['admin', 'dean', 'student'])
  if (auth.error) return res.status(auth.status).json({ message: auth.error })

  const user = auth.user
  const userRole = user.role
  const userCampus = user.campus

  // GET: List custom fields
  if (req.method === 'GET') {
    const client = await pool.connect()
    try {
      const { campus, all } = req.query || {}
      let query = `
        SELECT 
          d.id, 
          d.field_key AS "fieldKey", 
          d.label, 
          d.field_type AS "fieldType", 
          d.options, 
          d.is_required AS "isRequired", 
          d.is_active AS "isActive", 
          d.placeholder,
          d.help_text AS "helpText",
          COALESCE(d.is_student_editable, true) AS "isStudentEditable",
          COALESCE(d.visible_student, true) AS "visibleStudent",
          COALESCE(d.visible_admin, true) AS "visibleAdmin",
          COALESCE(d.visible_dean, true) AS "visibleDean",
          COALESCE(d.display_order, 0) AS "displayOrder",
          COALESCE(d.validation_rules, '{}'::jsonb) AS "validationRules",
          d.campus, 
          d.created_by AS "createdBy", 
          d.created_at AS "createdAt", 
          d.updated_at AS "updatedAt",
          (SELECT COUNT(*)::int FROM student_custom_value v WHERE v.field_id = d.id) AS "responseCount"
        FROM custom_field_definition d
        WHERE 1=1
      `
      const params = []

      // If not requesting all (e.g. for student registration forms), only return active fields
      if (all !== 'true' && all !== true) {
        query += ` AND d.is_active = true`
      }

      // Filter by role visibility
      if (userRole === 'student') {
        query += ` AND COALESCE(d.visible_student, true) = true`
        params.push(userCampus || campus || 'Main Campus')
        query += ` AND (d.campus IS NULL OR LOWER(d.campus) = LOWER($${params.length}))`
      } else if (userRole === 'dean') {
        query += ` AND COALESCE(d.visible_dean, true) = true`
        params.push(userCampus || '')
        query += ` AND (d.campus IS NULL OR LOWER(d.campus) = LOWER($${params.length}))`
      } else if (userRole === 'admin') {
        if (campus && campus !== 'all' && campus !== 'global') {
          params.push(campus)
          query += ` AND (d.campus IS NULL OR LOWER(d.campus) = LOWER($${params.length}))`
        }
      }

      query += ` ORDER BY COALESCE(d.display_order, 0) ASC, d.created_at ASC`

      const result = await client.query(query, params)
      return res.status(200).json({ customFields: result.rows })
    } catch (error) {
      console.error('Error fetching custom fields:', error)
      return res.status(500).json({ message: 'Error fetching custom fields' })
    } finally {
      client.release()
    }
  }

  // POST: Create a custom field (Admin or Campus Dean)
  if (req.method === 'POST') {
    if (userRole !== 'admin' && userRole !== 'dean') {
      return res.status(403).json({ message: 'Forbidden: Only Administrators and Campus Deans can define custom fields' })
    }

    const body = req.body || {}
    const {
      fieldKey,
      label,
      fieldType,
      options,
      isRequired,
      isActive,
      placeholder,
      helpText,
      isStudentEditable,
      visibleStudent,
      visibleAdmin,
      visibleDean,
      displayOrder,
      validationRules,
      campus,
    } = body

    if (!fieldKey || !label || !fieldType) {
      return res.status(400).json({ message: 'fieldKey, label, and fieldType are required' })
    }

    const cleanFieldKey = fieldKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
    const cleanLabel = label.trim()

    // Protect system-critical identifiers
    if (PROTECTED_FIELD_KEYS.includes(cleanFieldKey)) {
      return res.status(400).json({
        message: `Field key '${cleanFieldKey}' is a protected system identifier and cannot be used as a custom field key.`,
      })
    }

    if (!SUPPORTED_FIELD_TYPES.includes(fieldType)) {
      return res.status(400).json({
        message: `Invalid fieldType '${fieldType}'. Supported: ${SUPPORTED_FIELD_TYPES.join(', ')}`,
      })
    }

    let parsedOptions = []
    if (['select', 'radio', 'checkbox', 'department', 'batch'].includes(fieldType)) {
      if (Array.isArray(options)) {
        parsedOptions = options.map((o) => (typeof o === 'string' ? o.trim() : String(o))).filter(Boolean)
      } else if (typeof options === 'string' && options.trim()) {
        parsedOptions = options.split(',').map((o) => o.trim()).filter(Boolean)
      }
      if (['select', 'radio'].includes(fieldType) && parsedOptions.length === 0) {
        return res.status(400).json({ message: `Dropdown (select) and Radio fields require at least one option` })
      }
    }

    // Role and Campus scoping
    let targetCampus = null
    if (userRole === 'dean') {
      // Campus Dean can only define fields for their own campus
      if (campus && campus.toLowerCase() !== (userCampus || '').toLowerCase()) {
        return res.status(403).json({
          message: `Forbidden: Campus Deans are strictly restricted to '${userCampus}'. Cannot create custom fields for '${campus}'.`,
        })
      }
      targetCampus = userCampus
    } else if (userRole === 'admin') {
      // Admin can define global (campus = null) or specific campus field
      targetCampus = campus && campus !== 'all' && campus !== 'global' ? campus.trim() : null
    }

    const client = await pool.connect()
    try {
      // Check for duplicate field key in the target scope
      const dupCheck = await client.query(
        `SELECT id FROM custom_field_definition 
         WHERE field_key = $1 AND (campus IS NOT DISTINCT FROM $2)`,
        [cleanFieldKey, targetCampus]
      )
      if (dupCheck.rows.length > 0) {
        return res.status(409).json({
          message: `Custom field with key '${cleanFieldKey}' already exists for ${targetCampus || 'all campuses'}.`,
        })
      }

      const insertRes = await client.query(
        `INSERT INTO custom_field_definition (
           field_key, label, field_type, options, is_required, is_active, 
           placeholder, help_text, is_student_editable, visible_student, visible_admin, visible_dean, 
           display_order, validation_rules, campus, created_by, created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())
         RETURNING 
           id, 
           field_key AS "fieldKey", 
           label, 
           field_type AS "fieldType", 
           options, 
           is_required AS "isRequired", 
           is_active AS "isActive", 
           placeholder,
           help_text AS "helpText",
           is_student_editable AS "isStudentEditable",
           visible_student AS "visibleStudent",
           visible_admin AS "visibleAdmin",
           visible_dean AS "visibleDean",
           display_order AS "displayOrder",
           validation_rules AS "validationRules",
           campus, 
           created_by AS "createdBy", 
           created_at AS "createdAt", 
           updated_at AS "updatedAt"`,
        [
          cleanFieldKey,
          cleanLabel,
          fieldType,
          JSON.stringify(parsedOptions),
          isRequired === true,
          isActive !== false,
          placeholder ? String(placeholder).trim() : null,
          helpText ? String(helpText).trim() : null,
          isStudentEditable !== false,
          visibleStudent !== false,
          visibleAdmin !== false,
          visibleDean !== false,
          parseInt(displayOrder) || 0,
          JSON.stringify(validationRules || {}),
          targetCampus,
          user.username || user.name || 'user',
        ]
      )

      const newField = insertRes.rows[0]

      if (userRole === 'dean') {
        await createNotification(
          {
            recipientRole: 'admin',
            campus: targetCampus,
            title: 'New Campus Custom Field Defined',
            message: `Campus Dean ${user.username || user.name} created a new custom field "${cleanLabel}" (${cleanFieldKey}) for ${targetCampus}.`,
            type: 'info',
            link: '/admin/settings',
          },
          client
        )
      }

      return res.status(201).json({ success: true, customField: newField })
    } catch (error) {
      console.error('Error creating custom field:', error)
      return res.status(500).json({ message: 'Error creating custom field' })
    } finally {
      client.release()
    }
  }

  // PUT: Update an existing custom field definition
  if (req.method === 'PUT') {
    if (userRole !== 'admin' && userRole !== 'dean') {
      return res.status(403).json({ message: 'Forbidden: Cannot edit custom fields' })
    }

    const {
      id,
      label,
      fieldType,
      options,
      isRequired,
      isActive,
      placeholder,
      helpText,
      isStudentEditable,
      visibleStudent,
      visibleAdmin,
      visibleDean,
      displayOrder,
      validationRules,
    } = req.body || {}

    if (!id) {
      return res.status(400).json({ message: 'Custom field ID is required' })
    }

    const client = await pool.connect()
    try {
      const existingRes = await client.query(
        `SELECT id, campus, field_type, label FROM custom_field_definition WHERE id::text = $1`,
        [id]
      )
      if (existingRes.rows.length === 0) {
        return res.status(404).json({ message: 'Custom field definition not found' })
      }

      const existing = existingRes.rows[0]

      if (userRole === 'dean') {
        if (!existing.campus || existing.campus.toLowerCase() !== (userCampus || '').toLowerCase()) {
          return res.status(403).json({
            message: 'Forbidden: Campus Deans can only modify custom fields defined for their own campus.',
          })
        }
      }

      if (fieldType && !SUPPORTED_FIELD_TYPES.includes(fieldType)) {
        return res.status(400).json({
          message: `Invalid fieldType '${fieldType}'. Supported: ${SUPPORTED_FIELD_TYPES.join(', ')}`,
        })
      }

      let parsedOptions = null
      if (options !== undefined) {
        if (Array.isArray(options)) {
          parsedOptions = options.map((o) => (typeof o === 'string' ? o.trim() : String(o))).filter(Boolean)
        } else if (typeof options === 'string') {
          parsedOptions = options.split(',').map((o) => o.trim()).filter(Boolean)
        }
      }

      const updateRes = await client.query(
        `UPDATE custom_field_definition
         SET label = COALESCE($1, label),
             field_type = COALESCE($2, field_type),
             options = COALESCE($3, options),
             is_required = COALESCE($4, is_required),
             is_active = COALESCE($5, is_active),
             placeholder = COALESCE($6, placeholder),
             help_text = COALESCE($7, help_text),
             is_student_editable = COALESCE($8, is_student_editable),
             visible_student = COALESCE($9, visible_student),
             visible_admin = COALESCE($10, visible_admin),
             visible_dean = COALESCE($11, visible_dean),
             display_order = COALESCE($12, display_order),
             validation_rules = COALESCE($13, validation_rules),
             updated_at = NOW()
         WHERE id = $14
         RETURNING 
           id, 
           field_key AS "fieldKey", 
           label, 
           field_type AS "fieldType", 
           options, 
           is_required AS "isRequired", 
           is_active AS "isActive", 
           placeholder,
           help_text AS "helpText",
           is_student_editable AS "isStudentEditable",
           visible_student AS "visibleStudent",
           visible_admin AS "visibleAdmin",
           visible_dean AS "visibleDean",
           display_order AS "displayOrder",
           validation_rules AS "validationRules",
           campus, 
           created_by AS "createdBy", 
           created_at AS "createdAt", 
           updated_at AS "updatedAt"`,
        [
          label ? label.trim() : null,
          fieldType || null,
          parsedOptions ? JSON.stringify(parsedOptions) : null,
          isRequired !== undefined ? Boolean(isRequired) : null,
          isActive !== undefined ? Boolean(isActive) : null,
          placeholder !== undefined ? placeholder : null,
          helpText !== undefined ? helpText : null,
          isStudentEditable !== undefined ? Boolean(isStudentEditable) : null,
          visibleStudent !== undefined ? Boolean(visibleStudent) : null,
          visibleAdmin !== undefined ? Boolean(visibleAdmin) : null,
          visibleDean !== undefined ? Boolean(visibleDean) : null,
          displayOrder !== undefined ? parseInt(displayOrder) : null,
          validationRules ? JSON.stringify(validationRules) : null,
          id,
        ]
      )

      return res.status(200).json({ success: true, customField: updateRes.rows[0] })
    } catch (error) {
      console.error('Error updating custom field:', error)
      return res.status(500).json({ message: 'Error updating custom field' })
    } finally {
      client.release()
    }
  }

  // DELETE: Delete a custom field definition and its values safely
  if (req.method === 'DELETE') {
    if (userRole !== 'admin' && userRole !== 'dean') {
      return res.status(403).json({ message: 'Forbidden: Cannot delete custom fields' })
    }

    const { id, force } = req.query || {}
    if (!id) {
      return res.status(400).json({ message: 'Custom field ID is required' })
    }

    const client = await pool.connect()
    try {
      const existingRes = await client.query(
        `SELECT id, campus, label, field_key FROM custom_field_definition WHERE id::text = $1`,
        [id]
      )
      if (existingRes.rows.length === 0) {
        return res.status(404).json({ message: 'Custom field not found' })
      }

      const existing = existingRes.rows[0]

      if (userRole === 'dean') {
        if (!existing.campus || existing.campus.toLowerCase() !== (userCampus || '').toLowerCase()) {
          return res.status(403).json({
            message: 'Forbidden: Campus Deans can only delete custom fields defined for their own campus.',
          })
        }
      }

      // Check if student responses exist
      const countRes = await client.query(
        `SELECT COUNT(*)::int AS count FROM student_custom_value WHERE field_id = $1`,
        [id]
      )
      const studentCount = countRes.rows[0]?.count || 0

      // REQUIREMENT 2: Warn before deleting fields that contain existing student data.
      // Prefer deactivation or archival over permanently deleting fields with saved data.
      if (studentCount > 0 && force !== 'true' && force !== true) {
        return res.status(409).json({
          hasExistingData: true,
          responseCount: studentCount,
          message: `Warning: This registration field contains saved responses from ${studentCount} student(s). Deactivating the field is recommended to preserve historical student data. To permanently delete, add ?force=true.`,
        })
      }

      // If no student data or force confirmed, delete cascade
      await client.query(`DELETE FROM student_custom_value WHERE field_id = $1`, [id])
      await client.query(`DELETE FROM custom_field_definition WHERE id = $1`, [id])

      return res.status(200).json({
        success: true,
        message: `Custom field '${existing.label}' (${existing.field_key}) deleted successfully.`,
        deletedCount: studentCount,
      })
    } catch (error) {
      console.error('Error deleting custom field:', error)
      return res.status(500).json({ message: 'Error deleting custom field' })
    } finally {
      client.release()
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE'])
  return res.status(405).json({ message: 'Method not allowed' })
}
