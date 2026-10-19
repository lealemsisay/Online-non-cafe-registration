import { pool } from '@/drizzle/client'
import { signToken, verifyPassword, setCorsHeaders } from '@/lib/auth'

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ message: 'Method not allowed' })
  }
  try {
    const { studentId, password } = req.body || {}
    const rawId = studentId || req.body?.id || req.body?.username || req.body?.email || ''
    const id = typeof rawId === 'string' ? rawId.trim() : ''
    const pwd = typeof password === 'string' ? password : (password != null ? String(password) : '')

    if (!id || !pwd) {
      return res.status(400).json({ message: 'Student ID / Username / Email and password are required' })
    }

    console.log(`[AUTH] Login attempt for identifier: "${id}"`)

    const client = await pool.connect()
    try {
      const result = await client.query(
        `SELECT id, username, password_hash, alt_password_hash, full_name, role, campus, email 
         FROM app_user 
         WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1)`,
        [id]
      )

      if (result.rows.length === 0) {
        console.warn(`[AUTH] User not found for identifier: "${id}"`)
        return res.status(401).json({ message: 'Invalid credentials' })
      }

      const user = result.rows[0]
      let ok = await verifyPassword(pwd, user.password_hash)

      if (!ok && user.alt_password_hash) {
        ok = await verifyPassword(pwd, user.alt_password_hash)
      }

      // Check trimmed password if copy-pasting introduced whitespace
      if (!ok && pwd.trim() !== pwd) {
        ok = await verifyPassword(pwd.trim(), user.password_hash)
        if (!ok && user.alt_password_hash) {
          ok = await verifyPassword(pwd.trim(), user.alt_password_hash)
        }
      }

      if (!ok) {
        console.warn(`[AUTH] Invalid password attempt for user: "${user.username}"`)
        return res.status(401).json({ message: 'Invalid credentials' })
      }

      console.log(`[AUTH] Login successful: "${user.username}" (role: ${user.role})`)

      const token = signToken({
        id: user.id,
        role: user.role,
        campus: user.campus,
        name: user.full_name,
        username: user.username,
        email: user.email,
      })

      return res.status(200).json({
        user: {
          id: user.id,
          name: user.full_name,
          role: user.role,
          campus: user.campus,
          studentId: user.username,
          username: user.username,
          email: user.email,
        },
        token,
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ message: 'Server error during login' })
  }
}
