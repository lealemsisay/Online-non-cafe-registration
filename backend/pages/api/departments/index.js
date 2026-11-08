import { pool } from '@/drizzle/client'
import { authorize, setCorsHeaders } from '@/lib/auth'

const SELECT_COLUMNS = `
  id,
  name,
  code,
  campus,
  is_active AS "isActive",
  created_by AS "createdBy",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`

const normalizeCampus = (value) => {
  const campus = typeof value === 'string' ? value.trim() : ''
  if (!campus || campus.toLowerCase() === 'all') return null
  return campus
}

const actorName = (auth) => auth.user.username || auth.user.email || 'admin'

async function syncDepartmentSetting(client) {
  const res = await client.query(
    `SELECT DISTINCT name FROM department WHERE is_active = true ORDER BY name ASC`
  )
  const names = res.rows.map((r) => r.name)
  await client.query(
    `INSERT INTO system_setting (key, value, updated_at)
     VALUES ('departments', $1, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [JSON.stringify(names)]
  )
}

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return

  if (req.method === 'GET') {
    const auth = authorize(req, ['admin', 'dean', 'student'])
    if (auth.error) return res.status(auth.status).json({ message: auth.error })

    const client = await pool.connect()
    try {
      const includeInactive =
        req.query?.includeInactive === 'true' || req.query?.includeInactive === '1'
      const conditions = []
      const params = []

      if (!includeInactive) {
        conditions.push('is_active = true')
      }
      if (req.query?.campus) {
        params.push(req.query.campus)
        conditions.push(`LOWER(campus) = LOWER($${params.length})`)
      }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
      const result = await client.query(
        `SELECT ${SELECT_COLUMNS} FROM department ${where}
         ORDER BY (campus IS NULL) DESC, campus ASC, name ASC`,
        params
      )

      return res.status(200).json({ departments: result.rows })
    } catch (error) {
      console.error('Error fetching departments:', error)
      return res.status(500).json({ message: 'Error fetching departments' })
    } finally {
      client.release()
    }
  }

  if (req.method === 'POST') {
    const auth = authorize(req, ['admin'])
    if (auth.error) return res.status(auth.status).json({ message: auth.error })

    const body = req.body || {}
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) {
      return res.status(400).json({ message: 'Department name is required.' })
    }

    const code = typeof body.code === 'string' && body.code.trim() ? body.code.trim() : null
    const campus = normalizeCampus(body.campus)
    const isActive = body.isActive !== false

    const client = await pool.connect()
    try {
      const inserted = await client.query(
        `INSERT INTO department (name, code, campus, is_active, created_by)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING
         RETURNING ${SELECT_COLUMNS}`,
        [name, code, campus, isActive, actorName(auth)]
      )

      if (inserted.rows.length === 0) {
        return res.status(409).json({
          message: `Department "${name}" already exists for this campus scope.`,
        })
      }

      await client.query(
        `INSERT INTO audit_log (action, performed_by, target_id, target_type, details)
         VALUES ('create_department', $1, $2, 'department', $3)`,
        [
          actorName(auth),
          inserted.rows[0].id,
          JSON.stringify({ name, code, campus }),
        ]
      )

      await syncDepartmentSetting(client)

      return res.status(201).json({
        message: 'Department created successfully',
        department: inserted.rows[0],
      })
    } catch (error) {
      console.error('Error creating department:', error)
      return res.status(500).json({ message: 'Error creating department' })
    } finally {
      client.release()
    }
  }

  if (req.method === 'PUT') {
    const auth = authorize(req, ['admin'])
    if (auth.error) return res.status(auth.status).json({ message: auth.error })

    const body = req.body || {}
    if (!body.id) {
      return res.status(400).json({ message: 'Department id is required.' })
    }

    const client = await pool.connect()
    try {
      const existingRes = await client.query('SELECT * FROM department WHERE id = $1', [body.id])
      if (existingRes.rows.length === 0) {
        return res.status(404).json({ message: 'Department not found' })
      }
      const existing = existingRes.rows[0]

      const name =
        body.name !== undefined ? String(body.name || '').trim() : existing.name
      if (!name) {
        return res.status(400).json({ message: 'Department name is required.' })
      }
      const code =
        body.code !== undefined
          ? typeof body.code === 'string' && body.code.trim()
            ? body.code.trim()
            : null
          : existing.code
      const campus =
        body.campus !== undefined ? normalizeCampus(body.campus) : existing.campus
      const isActive =
        body.isActive !== undefined ? Boolean(body.isActive) : existing.is_active

      const updated = await client.query(
        `UPDATE department
         SET name = $1, code = $2, campus = $3, is_active = $4, updated_at = NOW()
         WHERE id = $5
         RETURNING ${SELECT_COLUMNS}`,
        [name, code, campus, isActive, body.id]
      )

      await client.query(
        `INSERT INTO audit_log (action, performed_by, target_id, target_type, details)
         VALUES ('update_department', $1, $2, 'department', $3)`,
        [
          actorName(auth),
          body.id,
          JSON.stringify({ name, code, campus, isActive }),
        ]
      )

      await syncDepartmentSetting(client)

      return res.status(200).json({
        message: 'Department updated successfully',
        department: updated.rows[0],
      })
    } catch (error) {
      console.error('Error updating department:', error)
      if (error.code === '23505') {
        return res.status(409).json({
          message: 'A department with this name already exists for the selected campus scope.',
        })
      }
      return res.status(500).json({ message: 'Error updating department' })
    } finally {
      client.release()
    }
  }

  if (req.method === 'DELETE') {
    const auth = authorize(req, ['admin'])
    if (auth.error) return res.status(auth.status).json({ message: auth.error })

    const id = req.query?.id
    if (!id) {
      return res.status(400).json({ message: 'Department id is required.' })
    }

    const client = await pool.connect()
    try {
      const deleted = await client.query(
        `DELETE FROM department WHERE id = $1 RETURNING ${SELECT_COLUMNS}`,
        [id]
      )
      if (deleted.rows.length === 0) {
        return res.status(404).json({ message: 'Department not found' })
      }

      await client.query(
        `INSERT INTO audit_log (action, performed_by, target_id, target_type, details)
         VALUES ('delete_department', $1, $2, 'department', $3)`,
        [
          actorName(auth),
          id,
          JSON.stringify({ name: deleted.rows[0].name, campus: deleted.rows[0].campus }),
        ]
      )

      await syncDepartmentSetting(client)

      return res.status(200).json({
        message: 'Department removed successfully',
        department: deleted.rows[0],
      })
    } catch (error) {
      console.error('Error deleting department:', error)
      return res.status(500).json({ message: 'Error deleting department' })
    } finally {
      client.release()
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE'])
  return res.status(405).json({ message: 'Method not allowed' })
}
