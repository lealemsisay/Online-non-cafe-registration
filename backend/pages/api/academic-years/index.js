import { pool } from '@/drizzle/client'
import { authorize, setCorsHeaders } from '@/lib/auth'

const SELECT_COLUMNS = `
  id,
  year,
  start_date AS "startDate",
  end_date AS "endDate",
  is_active AS "isActive",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`

const normalizeDate = (value) => {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

const actorName = (auth) => auth.user.username || auth.user.email || 'admin'

async function deactivateOtherYears(client, keepId, actor) {
  if (keepId) {
    await client.query(
      `UPDATE academic_year
       SET is_active = false, updated_at = NOW(), updated_by = $2
       WHERE is_active = true AND id <> $1`,
      [keepId, actor]
    )
  } else {
    await client.query(
      `UPDATE academic_year
       SET is_active = false, updated_at = NOW(), updated_by = $1
       WHERE is_active = true`,
      [actor]
    )
  }
}

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return

  if (req.method === 'GET') {
    const auth = authorize(req, ['admin', 'dean', 'student'])
    if (auth.error) return res.status(auth.status).json({ message: auth.error })

    const client = await pool.connect()
    try {
      const result = await client.query(
        `SELECT ${SELECT_COLUMNS} FROM academic_year
         ORDER BY year DESC, created_at DESC`
      )
      const details = result.rows
      const active = details.find((row) => row.isActive) || null

      return res.status(200).json({
        academicYears: details.map((row) => row.year),
        details,
        activeYear: active ? active.year : null,
      })
    } catch (error) {
      console.error('Error fetching academic years:', error)
      return res.status(500).json({ message: 'Error fetching academic years' })
    } finally {
      client.release()
    }
  }

  if (req.method === 'POST') {
    const auth = authorize(req, ['admin'])
    if (auth.error) return res.status(auth.status).json({ message: auth.error })

    const body = req.body || {}
    const year = typeof body.year === 'string' ? body.year.trim() : ''
    if (!year) {
      return res.status(400).json({ message: 'Academic year is required (e.g. 2025/2026).' })
    }

    const startDate = normalizeDate(body.startDate)
    const endDate = normalizeDate(body.endDate)
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({
        message: 'Academic year end date cannot be earlier than the start date.',
      })
    }
    const isActive = Boolean(body.isActive)

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      if (isActive) {
        await deactivateOtherYears(client, null, actorName(auth))
      }

      const saved = await client.query(
        `INSERT INTO academic_year (year, start_date, end_date, is_active, updated_at, updated_by)
         VALUES ($1, $2, $3, $4, NOW(), $5)
         ON CONFLICT (year) DO UPDATE
           SET start_date = EXCLUDED.start_date,
               end_date = EXCLUDED.end_date,
               is_active = EXCLUDED.is_active,
               updated_at = NOW(),
               updated_by = EXCLUDED.updated_by
         RETURNING ${SELECT_COLUMNS}`,
        [year, startDate ?? null, endDate ?? null, isActive, actorName(auth)]
      )

      await client.query(
        `INSERT INTO audit_log (action, performed_by, target_id, target_type, details)
         VALUES ('create_academic_year', $1, $2, 'academic_year', $3)`,
        [
          actorName(auth),
          saved.rows[0].id,
          JSON.stringify({ year, startDate, endDate, isActive }),
        ]
      )

      await client.query('COMMIT')

      return res.status(201).json({
        message: 'Academic year saved successfully',
        academicYear: saved.rows[0],
      })
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {})
      console.error('Error creating academic year:', error)
      return res.status(500).json({ message: 'Error creating academic year' })
    } finally {
      client.release()
    }
  }

  if (req.method === 'PUT') {
    const auth = authorize(req, ['admin'])
    if (auth.error) return res.status(auth.status).json({ message: auth.error })

    const body = req.body || {}
    if (!body.id) {
      return res.status(400).json({ message: 'Academic year id is required.' })
    }

    const client = await pool.connect()
    try {
      const existingRes = await client.query('SELECT * FROM academic_year WHERE id = $1', [body.id])
      if (existingRes.rows.length === 0) {
        return res.status(404).json({ message: 'Academic year not found' })
      }
      const existing = existingRes.rows[0]

      const year =
        body.year !== undefined ? String(body.year || '').trim() : existing.year
      if (!year) {
        return res.status(400).json({ message: 'Academic year is required.' })
      }

      const startDate =
        body.startDate !== undefined
          ? normalizeDate(body.startDate)
          : existing.start_date
          ? new Date(existing.start_date).toISOString().slice(0, 10)
          : null
      const endDate =
        body.endDate !== undefined
          ? normalizeDate(body.endDate)
          : existing.end_date
          ? new Date(existing.end_date).toISOString().slice(0, 10)
          : null

      if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
        return res.status(400).json({
          message: 'Academic year end date cannot be earlier than the start date.',
        })
      }

      const isActive =
        body.isActive !== undefined ? Boolean(body.isActive) : existing.is_active

      await client.query('BEGIN')
      if (isActive) {
        await deactivateOtherYears(client, body.id, actorName(auth))
      }

      const updated = await client.query(
        `UPDATE academic_year
         SET year = $1, start_date = $2, end_date = $3, is_active = $4,
             updated_at = NOW(), updated_by = $5
         WHERE id = $6
         RETURNING ${SELECT_COLUMNS}`,
        [year, startDate, endDate, isActive, actorName(auth), body.id]
      )

      await client.query(
        `INSERT INTO audit_log (action, performed_by, target_id, target_type, details)
         VALUES ('update_academic_year', $1, $2, 'academic_year', $3)`,
        [
          actorName(auth),
          body.id,
          JSON.stringify({ year, startDate, endDate, isActive }),
        ]
      )

      await client.query('COMMIT')

      return res.status(200).json({
        message: 'Academic year updated successfully',
        academicYear: updated.rows[0],
      })
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {})
      console.error('Error updating academic year:', error)
      if (error.code === '23505') {
        return res.status(409).json({ message: 'This academic year already exists.' })
      }
      return res.status(500).json({ message: 'Error updating academic year' })
    } finally {
      client.release()
    }
  }

  if (req.method === 'DELETE') {
    const auth = authorize(req, ['admin'])
    if (auth.error) return res.status(auth.status).json({ message: auth.error })

    const id = req.query?.id
    if (!id) {
      return res.status(400).json({ message: 'Academic year id is required.' })
    }

    const client = await pool.connect()
    try {
      const existing = await client.query(
        'SELECT id, year, is_active FROM academic_year WHERE id = $1',
        [id]
      )
      if (existing.rows.length === 0) {
        return res.status(404).json({ message: 'Academic year not found' })
      }
      if (existing.rows[0].is_active) {
        return res.status(400).json({
          message: 'The active academic year cannot be removed. Activate another year first.',
        })
      }

      await client.query('DELETE FROM academic_year WHERE id = $1', [id])
      await client.query(
        `INSERT INTO audit_log (action, performed_by, target_id, target_type, details)
         VALUES ('delete_academic_year', $1, $2, 'academic_year', $3)`,
        [
          actorName(auth),
          id,
          JSON.stringify({ year: existing.rows[0].year }),
        ]
      )

      return res.status(200).json({
        message: 'Academic year removed successfully',
        academicYear: { id, year: existing.rows[0].year },
      })
    } catch (error) {
      console.error('Error deleting academic year:', error)
      return res.status(500).json({ message: 'Error deleting academic year' })
    } finally {
      client.release()
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE'])
  return res.status(405).json({ message: 'Method not allowed' })
}
