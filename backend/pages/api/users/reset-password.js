import { pool } from '@/drizzle/client'
import { authorize, hashPassword, setCorsHeaders } from '@/lib/auth'

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ message: 'Method not allowed' })
  }

  // Only Super Admin and Campus Dean can execute authorized resets
  const auth = authorize(req, ['admin', 'dean'])
  if (auth.error) return res.status(auth.status).json({ message: auth.error })

  try {
    const { userId, targetUsername, newPassword } = req.body || {}
    const targetIdentifier = (userId || targetUsername || '').trim()

    if (!targetIdentifier) {
      return res.status(400).json({ message: 'Target user ID or username is required' })
    }

    const client = await pool.connect()
    try {
      // 1. Fetch target user by app_user id, username, email, or student table id/student_id
      const cleanTargetUser = (targetUsername || '').trim()
      const userRes = await client.query(
        `SELECT u.id, u.username, u.full_name, u.role, u.campus, u.email 
         FROM app_user u
         LEFT JOIN student s ON LOWER(u.username) = LOWER(s.student_id)
         WHERE u.id::text = $1 
            OR LOWER(u.username) = LOWER($1) 
            OR (u.email IS NOT NULL AND LOWER(u.email) = LOWER($1))
            OR s.id::text = $1
            OR ($2 != '' AND (LOWER(u.username) = LOWER($2) OR LOWER(s.student_id) = LOWER($2)))
         LIMIT 1`,
        [targetIdentifier, cleanTargetUser]
      )

      if (userRes.rows.length === 0) {
        return res.status(404).json({ message: 'Target user account not found' })
      }

      const target = userRes.rows[0]

      // 2. ENFORCE ROLE HIERARCHY PERMISSIONS:
      // A) Target is Super Admin: Lower roles cannot manage Super Admin accounts
      if (target.role === 'admin') {
        if (auth.user.role !== 'admin') {
          return res.status(403).json({
            message: 'Forbidden: Lower roles are not permitted to manage or reset Super Admin accounts.',
          })
        }
      }

      // B) Target is Campus Dean: Can only be reset by Super Admin
      if (target.role === 'dean') {
        if (auth.user.role !== 'admin') {
          return res.status(403).json({
            message: 'Forbidden: Campus Dean passwords can only be reset by Super Admin.',
          })
        }
      }

      // C) Target is Student: Campus Dean can ONLY reset students in their own campus
      if (target.role === 'student') {
        if (auth.user.role === 'dean') {
          const deanCampus = (auth.user.campus || '').trim().toLowerCase()
          const studentCampus = (target.campus || '').trim().toLowerCase()
          if (!deanCampus || !studentCampus || deanCampus !== studentCampus) {
            return res.status(403).json({
              message: `Forbidden: Campus Deans are strictly restricted to their own campus. Target student belongs to '${target.campus || 'Unknown'}', while you administer '${auth.user.campus}'.`,
            })
          }
        }
      }

      // 3. Determine password to set
      const defaultPassword =
        target.role === 'student' ? 'Student@Dilla2026!' : target.role === 'dean' ? 'Dean@Dilla2026!' : 'Admin@Dilla2026!'
      const simpleAlt =
        target.role === 'student' ? 'student@123' : target.role === 'dean' ? 'dean@123' : 'admin@123'
      const finalPassword = (newPassword && newPassword.trim().length >= 6) ? newPassword.trim() : defaultPassword

      const hash = await hashPassword(finalPassword)
      const altHash = (!newPassword || newPassword.trim() === defaultPassword) ? await hashPassword(simpleAlt) : null

      // 4. Update in app_user
      await client.query(
        `UPDATE app_user 
         SET password_hash = $1, alt_password_hash = $2, updated_at = NOW() 
         WHERE id = $3`,
        [hash, altHash, target.id]
      )

      // 5. Write audit log
      await client.query(
        `INSERT INTO audit_log (action, performed_by, target_id, target_type, details)
         VALUES ('authorized_password_reset', $1, $2, 'app_user', $3)`,
        [
          auth.user.username || auth.user.name,
          target.id,
          `Password reset for user '${target.username}' (role: ${target.role}, campus: ${target.campus}) by '${auth.user.username}' (role: ${auth.user.role})`,
        ]
      )

      return res.status(200).json({
        success: true,
        message: `Password for ${target.full_name} (${target.username}) has been successfully reset.`,
        resetPassword: finalPassword,
        targetUser: {
          id: target.id,
          username: target.username,
          name: target.full_name,
          role: target.role,
          campus: target.campus,
        },
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Password reset error:', error)
    return res.status(500).json({ message: 'Server error during password reset', detail: error.message })
  }
}
