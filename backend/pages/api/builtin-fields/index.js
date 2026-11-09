import { pool } from '@/drizzle/client'
import { authorize, setCorsHeaders } from '@/lib/auth'

// Field keys that are protected (cannot be deactivated or removed - essential for system operation)
const PROTECTED_FIELD_KEYS = [
  'studentid',   // Used for authentication - username
  'fullname',    // Core identity
]

const EDITABLE_FIELDS = [
  'field_key', 'label', 'description', 'field_type', 'is_required',
  'is_active', 'display_order', 'applies_to', 'visible_student',
  'visible_dean', 'visible_admin', 'validation_rules'
]

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return

  // Reading built-in field configuration is open to authenticated roles so the
  // registration / profile-completion form can be rendered dynamically.
  // Managing (PUT) remains Super Admin only.
  const auth = authorize(req, ['admin', 'dean', 'student'])
  if (auth.error) return res.status(auth.status).json({ message: auth.error })

  const client = await pool.connect()
  try {
    // GET: List all built-in field configurations
    if (req.method === 'GET') {
      const result = await client.query(
        `SELECT field_key, label, description, field_type, is_required,
                is_active, is_protected, display_order, applies_to,
                visible_student, visible_dean, visible_admin,
                validation_rules, updated_at, updated_by
         FROM builtin_field_config
         ORDER BY display_order ASC, field_key ASC`
      )
      return res.status(200).json({ builtinFields: result.rows })
    }

    // PUT: Update a built-in field configuration (Super Admin only)
    if (req.method === 'PUT') {
      if (auth.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied: Super Admin only' })
      }
      const {
        fieldKey,
        label,
        description,
        fieldType,
        isRequired,
        isActive,
        displayOrder,
        appliesTo,
        visibleStudent,
        visibleDean,
        visibleAdmin,
        validationRules,
      } = req.body || {}

      if (!fieldKey) {
        return res.status(400).json({ message: 'Field key is required.' })
      }

      const keyLower = String(fieldKey).toLowerCase()

      // Protected fields cannot be deactivated or have required status changed
      if (PROTECTED_FIELD_KEYS.includes(keyLower)) {
        if (isActive === false) {
          return res.status(403).json({
            message: `The "${fieldKey}" field is protected and cannot be deactivated. It is essential for system operation.`,
          })
        }
        if (isRequired === false) {
          return res.status(403).json({
            message: `The "${fieldKey}" field is protected and must remain required. It is essential for system operation.`,
          })
        }
      }

      // Build dynamic update query
      const updates = []
      const values = []
      let paramIdx = 1

      const fieldMap = {
        label,
        description,
        field_type: fieldType,
        is_required: isRequired,
        is_active: isActive,
        display_order: displayOrder,
        applies_to: appliesTo,
        visible_student: visibleStudent,
        visible_dean: visibleDean,
        visible_admin: visibleAdmin,
        validation_rules: validationRules !== undefined ? JSON.stringify(validationRules || {}) : undefined,
      }

      for (const [col, val] of Object.entries(fieldMap)) {
        if (val !== undefined) {
          updates.push(`${col} = $${paramIdx}`)
          values.push(val)
          paramIdx++
        }
      }

      if (updates.length === 0) {
        return res.status(400).json({ message: 'No fields to update.' })
      }

      updates.push(`updated_at = NOW()`)
      updates.push(`updated_by = $${paramIdx}`)
      values.push(auth.user.username || auth.user.name || 'admin')
      values.push(keyLower)

      const query = `
        UPDATE builtin_field_config
        SET ${updates.join(', ')}
        WHERE LOWER(field_key) = LOWER($${paramIdx + 1})
        RETURNING field_key, label, description, field_type, is_required,
                  is_active, is_protected, display_order, applies_to,
                  visible_student, visible_dean, visible_admin,
                  validation_rules, updated_at
      `

      const result = await client.query(query, values)

      if (result.rows.length === 0) {
        return res.status(404).json({ message: `Built-in field "${fieldKey}" not found.` })
      }

      // Audit log
      await client.query(
        `INSERT INTO audit_log (action, performed_by, target_id, target_type, details)
         VALUES ('update_builtin_field', $1, $2, 'builtin_field_config', $3)`,
        [
          auth.user.username || auth.user.name || 'admin',
          keyLower,
          JSON.stringify({ fieldKey: keyLower, updatedFields: Object.keys(fieldMap).filter(k => fieldMap[k] !== undefined) }),
        ]
      )

      return res.status(200).json({
        message: 'Built-in field configuration updated successfully.',
        builtinField: result.rows[0],
      })
    }

    res.setHeader('Allow', ['GET', 'PUT'])
    return res.status(405).json({ message: 'Method not allowed' })
  } catch (error) {
    console.error('Built-in fields error:', error)
    return res.status(500).json({ message: 'Error managing built-in fields', detail: error.message })
  } finally {
    client.release()
  }
}
