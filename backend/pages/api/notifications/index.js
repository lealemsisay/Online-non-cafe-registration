import { pool } from '@/drizzle/client'
import { authorize, setCorsHeaders } from '@/lib/auth'

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const auth = authorize(req, ['student', 'dean', 'admin'])
  if (auth.error) return res.status(auth.status).json({ message: auth.error })

  try {
    const userId = req.query?.userId || (auth.user.role === 'student' ? auth.user.studentId || auth.user.id : null)

    const client = await pool.connect()
    try {
      let query = 'SELECT * FROM audit_log'
      const params = []

      if (userId) {
        query += ' WHERE target_id = $1'
        params.push(userId)
      }

      query += ' ORDER BY created_at DESC LIMIT 50'

      const result = await client.query(query, params)
      const notifications = result.rows.map(r => ({
        id: r.id,
        action: r.action,
        performed_by: r.performed_by,
        target_id: r.target_id,
        target_type: r.target_type,
        details: r.details,
        created_at: r.created_at,
      }))

      return res.status(200).json({ notifications })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return res.status(500).json({ message: 'Error fetching notifications' })
  }
}