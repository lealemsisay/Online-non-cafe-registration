import { pool } from '@/drizzle/client'

/**
 * Creates an in-app notification in PostgreSQL
 * @param {object} options
 * @param {import('pg').PoolClient} [client] - Optional existing database client
 */
export async function createNotification(options, client = null) {
  const {
    recipientId = null,
    recipientRole = null, // 'admin', 'dean', 'student', 'all'
    campus = null,
    title,
    message,
    type = 'info', // 'info', 'success', 'warning', 'action'
    link = null,
  } = options || {}

  if (!title || !message) {
    throw new Error('Notification title and message are required')
  }

  const dbClient = client || await pool.connect()
  const shouldRelease = !client

  try {
    const result = await dbClient.query(
      `INSERT INTO app_notification (
         recipient_id, recipient_role, campus, title, message, type, link, is_read, created_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, false, NOW())
       RETURNING id, recipient_id AS "recipientId", recipient_role AS "recipientRole", campus, title, message, type, link, is_read AS "isRead", created_at AS "createdAt"`,
      [recipientId, recipientRole, campus, title, message, type, link]
    )
    return result.rows[0]
  } finally {
    if (shouldRelease) {
      dbClient.release()
    }
  }
}
