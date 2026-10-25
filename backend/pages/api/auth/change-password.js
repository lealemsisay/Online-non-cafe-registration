import { pool } from '@/drizzle/client'
import { authorize, verifyPassword, hashPassword, setCorsHeaders } from '@/lib/auth'

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ message: 'Method not allowed' })
  }

  // Accessible by all authenticated roles: student, dean, admin
  const auth = authorize(req, ['student', 'dean', 'admin'])
  if (auth.error) return res.status(auth.status).json({ message: auth.error })

  try {
    const { oldPassword, currentPassword, newPassword, confirmPassword } = req.body || {}
    const currentPw = (oldPassword || currentPassword || '').trim()
    const nextPw = (newPassword || '').trim()

    if (!currentPw || !nextPw) {
      return res.status(400).json({ message: 'Current password and new password are required' })
    }

    if (nextPw.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' })
    }

    if (confirmPassword && nextPw !== confirmPassword.trim()) {
      return res.status(400).json({ message: 'New password and confirmation do not match' })
    }

    const client = await pool.connect()
    try {
      const userRes = await client.query(
        'SELECT id, username, password_hash, alt_password_hash, role FROM app_user WHERE id = $1',
        [auth.user.id]
      )

      if (userRes.rows.length === 0) {
        return res.status(404).json({ message: 'User account not found' })
      }

      const user = userRes.rows[0]

      // Verify old password
      let isValid = await verifyPassword(currentPw, user.password_hash)
      if (!isValid && user.alt_password_hash) {
        isValid = await verifyPassword(currentPw, user.alt_password_hash)
      }

      if (!isValid) {
        return res.status(400).json({ message: 'Current password is incorrect' })
      }

      // Hash and update new password
      const newHash = await hashPassword(nextPw)
      await client.query(
        'UPDATE app_user SET password_hash = $1, alt_password_hash = NULL, updated_at = NOW() WHERE id = $2',
        [newHash, user.id]
      )

      // Audit log
      await client.query(
        `INSERT INTO audit_log (action, performed_by, target_id, target_type, details)
         VALUES ('password_change', $1, $2, 'app_user', 'User successfully changed own password')`,
        [user.username, user.id]
      )

      return res.status(200).json({ message: 'Password changed successfully' })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Password change error:', error)
    return res.status(500).json({ message: 'Server error while changing password', detail: error.message })
  }
}
