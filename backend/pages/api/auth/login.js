import { pool } from '@/drizzle/client'
import { signToken, verifyPassword, setCorsHeaders } from '@/lib/auth'
import {
  ONBOARDING_STATUS_IMPORTED,
  ONBOARDING_STATUS_PASSWORD_CHANGE_REQUIRED,
  deriveOnboardingStatus,
} from '@/lib/onboarding'

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ message: 'Method not allowed' })
  }
  try {
    const { studentId, password } = req.body || {}
    const rawId = studentId || req.body?.id || req.body?.username || req.body?.email || req.body?.identifier || ''
    const id = typeof rawId === 'string' ? rawId.trim() : ''
    const pwd = typeof password === 'string' ? password : (password != null ? String(password) : '')

    if (!id || !pwd) {
      return res.status(400).json({ message: 'Student ID / Username / Email and password are required' })
    }

    console.log(`[AUTH] Login attempt for identifier: "${id}"`)

    const client = await pool.connect()
    try {
      const result = await client.query(
        `SELECT u.id, u.username, u.password_hash, u.alt_password_hash, u.full_name, u.role, u.campus, u.email, u.status, u.must_change_password, u.onboarding_status,
                s.profile_complete AS "profileComplete"
         FROM app_user u
         LEFT JOIN student s ON LOWER(u.username) = LOWER(s.student_id)
         WHERE LOWER(u.username) = LOWER($1) OR LOWER(u.email) = LOWER($1)`,
        [id]
      )

      if (result.rows.length === 0) {
        console.warn(`[AUTH] User not found for identifier: "${id}"`)
        return res.status(401).json({ message: 'Invalid credentials' })
      }

      const user = result.rows[0]

      if (user.status === 'inactive') {
        console.warn(`[AUTH] Login blocked for deactivated account: "${user.username}"`)
        return res.status(403).json({ message: 'Account has been deactivated. Please contact your campus dean or administrator.' })
      }

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

      // Force password change on first login for imported students
      // Triggered when: (a) the persistent must_change_password flag is set, or
      // (b) the password entered equals the username (initial password = student ID).
      const passwordMatchesUsername = pwd.trim() === user.username
      const isInitialPassword = user.role === 'student' && (passwordMatchesUsername || user.must_change_password === true)

      if (isInitialPassword && user.role === 'student') {
        // Student logging in with initial password (student ID) must change password

        // Persist the must_change_password flag so it survives token expiry
        if (!user.must_change_password) {
          await client.query(
            'UPDATE app_user SET must_change_password = true, updated_at = NOW() WHERE id = $1',
            [user.id]
          )
        }

        // Transition freshly imported accounts to the password-change-required stage.
        let onboardingStatus = deriveOnboardingStatus(true, user.profileComplete === true)
        if (user.onboarding_status === ONBOARDING_STATUS_IMPORTED) {
          await client.query(
            'UPDATE app_user SET onboarding_status = $1, updated_at = NOW() WHERE id = $2',
            [ONBOARDING_STATUS_PASSWORD_CHANGE_REQUIRED, user.id]
          )
          onboardingStatus = ONBOARDING_STATUS_PASSWORD_CHANGE_REQUIRED
        }

        const forcedChangeToken = signToken({
          id: user.id,
          role: 'student',
          forcePasswordChange: true,
          mustChangePassword: true,
          onboardingStatus,
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
            onboardingStatus,
            forcePasswordChange: true,
            mustChangePassword: true,
            profileComplete: user.profileComplete === true,
          },
          token: forcedChangeToken,
          requiresPasswordChange: true,
          onboardingStatus,
        })
      }

      console.log(`[AUTH] Login successful: "${user.username}" (role: ${user.role})`)

      const onboardingStatus = deriveOnboardingStatus(
        user.must_change_password === true,
        user.profileComplete === true
      )

      const token = signToken({
        id: user.id,
        role: user.role,
        mustChangePassword: user.must_change_password === true,
        onboardingStatus,
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
          onboardingStatus,
          profileComplete: user.profileComplete === true,
        },
        token,
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ message: 'Server error during login', detail: error.message })
  }
}
