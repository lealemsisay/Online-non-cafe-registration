import { pool } from '@/drizzle/client'
import { authorize, setCorsHeaders } from '@/lib/auth'
import { listCampuses, resolveCampus } from '@/lib/campus'
import { writeAudit } from '@/lib/audit'

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return

  if (req.method === 'GET') {
    const auth = authorize(req, ['student', 'dean', 'admin', 'viceDean'])
    const client = await pool.connect()
    try {
      const requestedActive = String(req.query?.active || '') === 'true'
      const unauthenticated = Boolean(auth.error)
      const activeOnly = unauthenticated || requestedActive
      const rows = await listCampuses(client, { activeOnly, includeDean: !unauthenticated })
      const campuses = rows.map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        status: c.status || 'active',
        ...(unauthenticated
          ? {}
          : {
              deanId: c.deanId || null,
              dean: c.dean || 'Pending Assignment',
              createdAt: c.createdAt,
            }),
      }))
      return res.status(200).json({ campuses })
    } catch (error) {
      console.error('Error fetching campuses:', error)
      return res.status(500).json({ message: 'Error fetching campuses' })
    } finally {
      client.release()
    }
  }

  if (req.method === 'POST') {
    const auth = authorize(req, ['admin'])
    if (auth.error) return res.status(auth.status).json({ message: auth.error })

    const { name, code, deanId } = req.body || {}
    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: 'Campus name is required' })
    }

    const client = await pool.connect()
    try {
      const result = await client.query(
        `INSERT INTO campus (name, code, dean_id, status) VALUES ($1, $2, $3, 'active')
         RETURNING id, name, code, dean_id AS "dean", status, created_at AS "createdAt"`,
        [String(name).trim(), code || null, deanId || null]
      )
      const campus = result.rows[0]
      await writeAudit(client, {
        action: 'create_campus',
        performedBy: auth.user.username || auth.user.name,
        actorRole: auth.user.role,
        targetId: campus.id,
        targetType: 'campus',
        entityLabel: campus.name,
        campus: campus.name,
        details: { name: campus.name, code: campus.code },
      })
      return res.status(201).json({ campus })
    } catch (error) {
      if (error.code === '23505') {
        return res.status(409).json({ message: 'A campus with this name already exists.' })
      }
      console.error('Error creating campus:', error)
      return res.status(500).json({ message: 'Error creating campus' })
    } finally {
      client.release()
    }
  }

  if (req.method === 'PUT') {
    const auth = authorize(req, ['admin'])
    if (auth.error) return res.status(auth.status).json({ message: auth.error })

    const { id, name, status } = req.body || {}
    if (!id) {
      return res.status(400).json({ message: 'Campus ID is required' })
    }

    const client = await pool.connect()
    try {
      const existing = await resolveCampus(client, { campusId: id, requireActive: false })
      if (existing.error) return res.status(existing.status).json({ message: existing.error })

      const result = await client.query(
        `UPDATE campus SET name = COALESCE($1, name), status = COALESCE($2, status), updated_at = NOW()
         WHERE id = $3
         RETURNING id, name, code, dean_id AS "dean", status, created_at AS "createdAt"`,
        [name || null, status || null, id]
      )
      const campus = result.rows[0]
      await writeAudit(client, {
        action: 'update_campus',
        performedBy: auth.user.username || auth.user.name,
        actorRole: auth.user.role,
        targetId: campus.id,
        targetType: 'campus',
        entityLabel: campus.name,
        campus: campus.name,
        details: { name: campus.name, status: campus.status },
      })
      return res.status(200).json({ campus })
    } catch (error) {
      console.error('Error updating campus:', error)
      return res.status(500).json({ message: 'Error updating campus' })
    } finally {
      client.release()
    }
  }

  if (req.method === 'DELETE') {
    const auth = authorize(req, ['admin'])
    if (auth.error) return res.status(auth.status).json({ message: auth.error })

    const id = req.query?.id || req.body?.id
    if (!id) {
      return res.status(400).json({ message: 'Campus ID is required' })
    }

    const client = await pool.connect()
    try {
      const existing = await resolveCampus(client, { campusId: id, requireActive: false })
      if (existing.error) return res.status(existing.status).json({ message: existing.error })

      await client.query(`UPDATE campus SET status = 'inactive', updated_at = NOW() WHERE id = $1`, [id])
      await writeAudit(client, {
        action: 'update_campus',
        performedBy: auth.user.username || auth.user.name,
        actorRole: auth.user.role,
        targetId: id,
        targetType: 'campus',
        entityLabel: existing.campus.name,
        campus: existing.campus.name,
        details: { status: 'inactive', deactivated: true },
      })
      return res.status(200).json({ success: true, campus: { ...existing.campus, status: 'inactive' } })
    } catch (error) {
      console.error('Error deactivating campus:', error)
      return res.status(500).json({ message: 'Error deactivating campus' })
    } finally {
      client.release()
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE'])
  return res.status(405).json({ message: 'Method not allowed' })
}
