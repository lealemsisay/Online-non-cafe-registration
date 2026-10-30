import { pool } from '@/drizzle/client'
import { authorize, setCorsHeaders } from '@/lib/auth'

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return

  // Accessible by all authenticated roles: student, dean, admin, viceDean
  const auth = authorize(req, ['student', 'dean', 'admin', 'viceDean'])
  if (auth.error) return res.status(auth.status).json({ message: auth.error })

  const user = auth.user
  const userId = user.id
  const username = user.username || user.studentId
  const userRole = user.role
  const userCampus = user.campus

  // GET: Fetch notifications for the current authenticated user/role
  if (req.method === 'GET') {
    const client = await pool.connect()
    try {
      // Super Admin sees all notifications or targeted admin notifications
      // Campus Dean sees notifications targeted to them specifically, their role, or their campus
      // Student sees notifications targeted to their user ID or student role
      let query = `
        SELECT 
          id, 
          recipient_id AS "recipientId", 
          recipient_role AS "recipientRole", 
          campus, 
          title, 
          message, 
          type, 
          link, 
          is_read AS "isRead", 
          created_at AS "createdAt"
        FROM app_notification
        WHERE (
          recipient_id = $1 
          OR recipient_id = $2
          OR (recipient_id IS NULL AND (recipient_role = $3 OR recipient_role = 'all' OR recipient_role IS NULL))
        )
      `
      const params = [userId, username, userRole]

      if ((userRole === 'dean' || userRole === 'viceDean') && userCampus) {
        query += ` AND (campus IS NULL OR LOWER(campus) = LOWER($4))`
        params.push(userCampus)
      } else if (userRole === 'student' && userCampus) {
        query += ` AND (campus IS NULL OR LOWER(campus) = LOWER($4))`
        params.push(userCampus)
      }

      query += ` ORDER BY created_at DESC LIMIT 100`

      const result = await client.query(query, params)
      const notifications = result.rows
      const unreadCount = notifications.filter((n) => !n.isRead).length

      return res.status(200).json({ notifications, unreadCount })
    } catch (error) {
      console.error('Error fetching notifications:', error)
      return res.status(500).json({ message: 'Error fetching notifications' })
    } finally {
      client.release()
    }
  }

  // PUT: Mark notification(s) as read
  if (req.method === 'PUT') {
    const client = await pool.connect()
    try {
      const { id, markAllRead } = req.body || {}

      if (markAllRead) {
        let updateQuery = `
          UPDATE app_notification 
          SET is_read = true 
          WHERE (
            recipient_id = $1 
            OR recipient_id = $2
            OR (recipient_id IS NULL AND (recipient_role = $3 OR recipient_role = 'all' OR recipient_role IS NULL))
          )
        `
        const params = [userId, username, userRole]
        if (userCampus && userRole !== 'admin') {
          updateQuery += ` AND (campus IS NULL OR LOWER(campus) = LOWER($4))`
          params.push(userCampus)
        }

        await client.query(updateQuery, params)
        return res.status(200).json({ success: true, message: 'All notifications marked as read' })
      }

      if (!id) {
        return res.status(400).json({ message: 'Notification ID is required' })
      }

      const result = await client.query(
        `UPDATE app_notification 
         SET is_read = true 
         WHERE id::text = $1
         RETURNING id, is_read AS "isRead"`,
        [id]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Notification not found' })
      }

      return res.status(200).json({ success: true, notification: result.rows[0] })
    } catch (error) {
      console.error('Error updating notification:', error)
      return res.status(500).json({ message: 'Error updating notification' })
    } finally {
      client.release()
    }
  }

  // POST: Create a notification (Admin or Dean)
  if (req.method === 'POST') {
    if (userRole !== 'admin' && userRole !== 'dean') {
      return res.status(403).json({ message: 'Forbidden: Cannot create notifications' })
    }

    const { recipientId, recipientRole, campus, title, message, type, link } = req.body || {}
    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' })
    }

    // Dean can only notify within their campus or to admin
    const targetCampus = userRole === 'dean' ? userCampus : campus

    const client = await pool.connect()
    try {
      const result = await client.query(
        `INSERT INTO app_notification (
           recipient_id, recipient_role, campus, title, message, type, link, is_read, created_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, false, NOW())
         RETURNING id, recipient_id AS "recipientId", recipient_role AS "recipientRole", campus, title, message, type, link, is_read AS "isRead", created_at AS "createdAt"`,
        [recipientId || null, recipientRole || null, targetCampus || null, title, message, type || 'info', link || null]
      )

      return res.status(201).json({ success: true, notification: result.rows[0] })
    } catch (error) {
      console.error('Error creating notification:', error)
      return res.status(500).json({ message: 'Error creating notification' })
    } finally {
      client.release()
    }
  }

  res.setHeader('Allow', ['GET', 'PUT', 'POST'])
  return res.status(405).json({ message: 'Method not allowed' })
}
