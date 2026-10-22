import { pool } from '@/drizzle/client'
import { authorize, setCorsHeaders } from '@/lib/auth'

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return

  // GET: authenticated roles (student, dean, admin)
  if (req.method === 'GET') {
    const auth = authorize(req, ['student', 'dean', 'admin'])
    if (auth.error) return res.status(auth.status).json({ message: auth.error })

    const client = await pool.connect()
    try {
      const result = await client.query(`
        SELECT c.id, c.name, c.code, c.dean_id AS "deanId", 
               COALESCE(u.full_name, (SELECT u2.full_name FROM app_user u2 WHERE u2.role = 'dean' AND u2.campus = c.name LIMIT 1)) AS "dean", 
               c.status, c.created_at AS "createdAt" 
        FROM campus c 
        LEFT JOIN app_user u ON c.dean_id = u.id 
        ORDER BY c.name ASC
      `)
      const campuses = result.rows.map(c => ({
        id: c.id,
        name: c.name,
        code: c.code,
        dean: c.dean || 'Pending Assignment',
        deanId: c.deanId,
        status: c.status,
        createdAt: c.createdAt,
      }))
      return res.status(200).json({ campuses })
    } catch (error) {
      console.error('Error fetching campuses:', error)
      return res.status(500).json({ message: 'Error fetching campuses' })
    } finally {
      client.release()
    }
  }

  // POST: Super Admin only
  if (req.method === 'POST') {
    const auth = authorize(req, ['admin'])
    if (auth.error) return res.status(auth.status).json({ message: auth.error })

    const { name, code, deanId } = req.body || {}
    if (!name) {
      return res.status(400).json({ message: 'Campus name is required' })
    }

    const client = await pool.connect()
    try {
      const result = await client.query(
        `INSERT INTO campus (name, code, dean_id, status) VALUES ($1, $2, $3, 'active') RETURNING id, name, code, dean_id AS "dean", status, created_at AS "createdAt"`,
        [name, code || null, deanId || null]
      )

      const campus = result.rows[0]
      return res.status(201).json({ campus })
    } catch (error) {
      console.error('Error creating campus:', error)
      return res.status(500).json({ message: 'Error creating campus' })
    } finally {
      client.release()
    }
  }

  // PUT: Super Admin only
  if (req.method === 'PUT') {
    const auth = authorize(req, ['admin'])
    if (auth.error) return res.status(auth.status).json({ message: auth.error })

    const { id, name, status } = req.body || {}
    if (!id) {
      return res.status(400).json({ message: 'Campus ID is required' })
    }

    const client = await pool.connect()
    try {
      const result = await client.query(
        `UPDATE campus SET name = COALESCE($1, name), status = COALESCE($2, status) WHERE id = $3 RETURNING id, name, code, dean_id AS "dean", status, created_at AS "createdAt"`,
        [name, status, id]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Campus not found' })
      }

      const campus = result.rows[0]
      return res.status(200).json({ campus })
    } catch (error) {
      console.error('Error updating campus:', error)
      return res.status(500).json({ message: 'Error updating campus' })
    } finally {
      client.release()
    }
  }

  // DELETE: Super Admin only
  if (req.method === 'DELETE') {
    const auth = authorize(req, ['admin'])
    if (auth.error) return res.status(auth.status).json({ message: auth.error })

    const id = req.query?.id || req.body?.id
    if (!id) {
      return res.status(400).json({ message: 'Campus ID is required' })
    }

    const client = await pool.connect()
    try {
      const result = await client.query('DELETE FROM campus WHERE id = $1 RETURNING id', [id])
      return res.status(200).json({ success: result.rows.length > 0 })
    } catch (error) {
      console.error('Error deleting campus:', error)
      return res.status(500).json({ message: 'Error deleting campus' })
    } finally {
      client.release()
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE'])
  return res.status(405).json({ message: 'Method not allowed' })
}