import { pool } from '@/drizzle/client'
import { authorize, setCorsHeaders } from '@/lib/auth'
import { createNotification } from '@/lib/notifications'

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
          id, 
          field_key AS "fieldKey", 
          label, 
          field_type AS "fieldType", 
          options, 
          is_required AS "isRequired", 
          is_active AS "isActive", 
          campus, 
          created_by AS "createdBy", 
          created_at AS "createdAt", 
          updated_at AS "updatedAt"
        FROM custom_field_definition
        WHERE 1=1
      `
      const params = []

      // If not requesting all (e.g. for student registration forms), only return active fields
      if (all !== 'true' && all !== true) {
        query += ` AND is_active = true`
      }

      if (userRole === 'admin') {
        if (campus) {
          params.push(campus)
          query += ` AND (campus IS NULL OR LOWER(campus) = LOWER($${params.length}))`
        }
      } else if (userRole === 'dean') {
        params.push(userCampus || '')
        query += ` AND (campus IS NULL OR LOWER(campus) = LOWER($${params.length}))`
      } else if (userRole === 'student') {
        params.push(userCampus || campus || 'Main Campus')
        query += ` AND (campus IS NULL OR LOWER(campus) = LOWER($${params.length}))`
      }

      query += ` ORDER BY campus NULLS FIRST, created_at ASC`

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

    const { fieldKey, label, fieldType, options, isRequired, isActive, campus } = req.body || {}

    if (!fieldKey || !label || !fieldType) {
      return res.status(400).json({ message: 'fieldKey, label, and fieldType are required' })
    }

    const cleanFieldKey = fieldKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
    const cleanLabel = label.trim()
    const validTypes = ['text', 'textarea', 'number', 'date', 'select', 'checkbox']
    if (!validTypes.includes(fieldType)) {
      return res.status(400).json({
        message: `Invalid fieldType '${fieldType}'. Supported: ${validTypes.join(', ')}`,
      })
    }

    let parsedOptions = []
    if (fieldType === 'select') {
      if (Array.isArray(options)) {
        parsedOptions = options.map((o) => (typeof o === 'string' ? o.trim() : String(o))).filter(Boolean)
      } else if (typeof options === 'string') {
        parsedOptions = options.split(',').map((o) => o.trim()).filter(Boolean)
      }
      if (parsedOptions.length === 0) {
        return res.status(400).json({ message: 'Dropdown (select) fields require at least one option' })
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
      // Check for duplicates
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

      const result = await client.query(
        `INSERT INTO custom_field_definition (
           field_key, label, field_type, options, is_required, is_active, campus, created_by, created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
         RETURNING id, field_key AS "fieldKey", label, field_type AS "fieldType", options, is_required AS "isRequired", is_active AS "isActive", campus, created_by AS "createdBy", created_at AS "createdAt", updated_at AS "updatedAt"`,
        [
          cleanFieldKey,
          cleanLabel,
          fieldType,
          JSON.stringify(parsedOptions),
          isRequired === true,
          isActive !== false,
          targetCampus,
          user.username || user.name || 'user',
        ]
      )

      const newField = result.rows[0]

      // REQUIREMENT 1: When a Campus Dean creates a field, notify the Super Admin / central Admin
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

    const { id, label, fieldType, options, isRequired, isActive } = req.body || {}
    if (!id) {
      return res.status(400).json({ message: 'Custom field ID is required' })
    }

    const client = await pool.connect()
    try {
      // Fetch existing
      const existingRes = await client.query(
        `SELECT id, campus, field_type, label FROM custom_field_definition WHERE id::text = $1`,
        [id]
      )
      if (existingRes.rows.length === 0) {
        return res.status(404).json({ message: 'Custom field definition not found' })
      }

      const existing = existingRes.rows[0]

      // Enforce Dean campus restriction
      if (userRole === 'dean') {
        if (!existing.campus || existing.campus.toLowerCase() !== (userCampus || '').toLowerCase()) {
          return res.status(403).json({
            message: 'Forbidden: Campus Deans can only modify custom fields defined for their own campus.',
          })
        }
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
             updated_at = NOW()
         WHERE id = $6
         RETURNING id, field_key AS "fieldKey", label, field_type AS "fieldType", options, is_required AS "isRequired", is_active AS "isActive", campus, created_by AS "createdBy", created_at AS "createdAt", updated_at AS "updatedAt"`,
        [
          label ? label.trim() : null,
          fieldType || null,
          parsedOptions ? JSON.stringify(parsedOptions) : null,
          isRequired !== undefined ? Boolean(isRequired) : null,
          isActive !== undefined ? Boolean(isActive) : null,
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

    const { id } = req.query || {}
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

      // Enforce Dean campus restriction
      if (userRole === 'dean') {
        if (!existing.campus || existing.campus.toLowerCase() !== (userCampus || '').toLowerCase()) {
          return res.status(403).json({
            message: 'Forbidden: Campus Deans can only delete custom fields defined for their own campus.',
          })
        }
      }

      // Delete student custom values first, then field definition (safe cascade)
      await client.query(`DELETE FROM student_custom_value WHERE field_id = $1`, [id])
      await client.query(`DELETE FROM custom_field_definition WHERE id = $1`, [id])

      return res.status(200).json({
        success: true,
        message: `Custom field '${existing.label}' (${existing.field_key}) deleted successfully.`,
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
