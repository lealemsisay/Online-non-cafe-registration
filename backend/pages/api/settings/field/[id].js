import { pool } from '@/drizzle/client'
import { authorize, setCorsHeaders } from '@/lib/auth'

const JSON_FIELDS = new Set(['options', 'validation_rules'])

const ALLOWED_FIELDS = {
  label: 'label',
  field_type: 'field_type',
  options: 'options',
  is_required: 'is_required',
  is_active: 'is_active',
  campus: 'campus',
  is_student_editable: 'is_student_editable',
  visible_admin: 'visible_admin',
  visible_dean: 'visible_dean',
  visible_student: 'visible_student',
  display_order: 'display_order',
  validation_rules: 'validation_rules',
  placeholder: 'placeholder',
  help_text: 'help_text',
  applies_to: 'applies_to',
}

async function logAudit(client, action, performedBy, fieldId, details) {
  await client.query(
    `INSERT INTO audit_log (action, performed_by, target_id, target_type, details)
     VALUES ($1, $2, $3, 'custom_field', $4)`,
    [action, performedBy, fieldId, details]
  )
}

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return

  const auth = authorize(req, ['admin', 'super_admin'])
  if (auth.error) return res.status(auth.status).json({ message: auth.error })

  const fieldId = Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id
  if (!fieldId) return res.status(400).json({ message: 'Custom field id is required.' })

  const performedBy = auth.user.username || auth.user.name || 'admin'
  const client = await pool.connect()

  try {
    if (req.method === 'GET') {
      const result = await client.query('SELECT * FROM custom_field_definition WHERE id = $1', [fieldId])
      if (result.rows.length === 0) return res.status(404).json({ message: 'Custom field not found' })
      return res.status(200).json({ success: true, field: result.rows[0] })
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const body = req.body || {}

      if (req.query?.status === 'toggle') {
        const toggled = await client.query(
          `UPDATE custom_field_definition
              SET is_active = NOT is_active, updated_at = NOW()
            WHERE id = $1
            RETURNING *`,
          [fieldId]
        )
        if (toggled.rows.length === 0) return res.status(404).json({ message: 'Custom field not found' })
        await logAudit(
          client,
          'toggle_custom_field',
          performedBy,
          fieldId,
          `Toggled custom field ${toggled.rows[0].field_key} is_active to ${toggled.rows[0].is_active}`
        )
        return res.status(200).json({ success: true, field: toggled.rows[0] })
      }

      const setParts = []
      const params = []
      for (const [key, column] of Object.entries(ALLOWED_FIELDS)) {
        if (!(key in body)) continue
        let value = body[key]
        if (JSON_FIELDS.has(key) && value !== null && typeof value !== 'string') {
          value = JSON.stringify(value)
        }
        params.push(value)
        setParts.push(`${column} = $${params.length}`)
      }

      if (setParts.length === 0) {
        return res.status(400).json({ message: 'No editable fields were provided.' })
      }

      params.push(fieldId)
      const updated = await client.query(
        `UPDATE custom_field_definition
            SET ${setParts.join(', ')}, updated_at = NOW()
          WHERE id = $${params.length}
          RETURNING *`,
        params
      )

      if (updated.rows.length === 0) return res.status(404).json({ message: 'Custom field not found' })

      await logAudit(
        client,
        'update_custom_field',
        performedBy,
        fieldId,
        `Updated custom field ${updated.rows[0].field_key}`
      )
      return res.status(200).json({ success: true, field: updated.rows[0] })
    }

    if (req.method === 'DELETE') {
      const deleted = await client.query(
        `DELETE FROM custom_field_definition WHERE id = $1 RETURNING field_key, label`,
        [fieldId]
      )
      if (deleted.rows.length === 0) return res.status(404).json({ message: 'Custom field not found' })

      await logAudit(
        client,
        'delete_custom_field',
        performedBy,
        fieldId,
        `Deleted custom field ${deleted.rows[0].field_key}`
      )
      return res.status(200).json({ success: true, deletedField: deleted.rows[0] })
    }

    res.setHeader('Allow', ['GET', 'PUT', 'PATCH', 'DELETE'])
    return res.status(405).json({ message: 'Method not allowed' })
  } catch (error) {
    console.error('Error managing custom field:', error)
    return res.status(500).json({ message: 'Error managing custom field', detail: error.message })
  } finally {
    client.release()
  }
}
