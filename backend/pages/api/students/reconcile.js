import { pool } from '@/drizzle/client'
import { authorize, setCorsHeaders, hashPassword } from '@/lib/auth'

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return

  // Super Admin and Campus Dean can reconcile missing student accounts
  const auth = authorize(req, ['admin', 'dean'])
  if (auth.error) return res.status(auth.status).json({ message: auth.error })

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Find imported student records that have no associated app_user login account.
    // Match on LOWER(student_id) = LOWER(username).
    const missingRes = await client.query(
      `SELECT s.student_id, s.full_name, s.campus, s.email
       FROM student s
       LEFT JOIN app_user u ON LOWER(s.student_id) = LOWER(u.username)
       WHERE u.id IS NULL
       ORDER BY s.student_id ASC`
    )

    const missingStudents = missingRes.rows
    const repaired = []
    const failed = []

    for (const student of missingStudents) {
      try {
        const studentId = student.student_id
        const passwordHash = await hashPassword(studentId)

        const result = await client.query(
          `INSERT INTO app_user (username, password_hash, full_name, role, campus, email, status, must_change_password)
           VALUES ($1, $2, $3, 'student', $4, $5, 'active', true)
           ON CONFLICT (username) DO NOTHING
           RETURNING id, username, role, status, must_change_password`,
          [studentId, passwordHash, student.full_name, student.campus || null, student.email || null]
        )

        if (result.rows.length > 0) {
          repaired.push({
            studentId,
            fullName: student.full_name,
            campus: student.campus,
            username: studentId,
            accountCreated: true,
            mustChangePassword: true,
          })
        } else {
          // ON CONFLICT DO NOTHING - account already existed (created by another process concurrently)
          repaired.push({
            studentId,
            fullName: student.full_name,
            campus: student.campus,
            username: studentId,
            accountCreated: false,
            reason: 'Account already existed (no action taken)',
            mustChangePassword: true,
          })
        }
      } catch (err) {
        failed.push({
          studentId: student.student_id,
          fullName: student.full_name,
          reason: err.message,
        })
      }
    }

    const performedBy = auth.user.username || auth.user.name || 'admin'
    await client.query(
      `INSERT INTO audit_log (action, performed_by, target_id, target_type, details)
       VALUES ('reconcile_student_accounts', $1, 'reconcile', 'student_accounts', $2)`,
      [
        performedBy,
        JSON.stringify({
          performedBy,
          totalMissing: missingStudents.length,
          repaired: repaired.length,
          failed: failed.length,
          timestamp: new Date().toISOString(),
        }),
      ]
    )

    await client.query('COMMIT')

    return res.status(200).json({
      success: true,
      message: `Reconciliation complete: ${repaired.length} accounts repaired, ${failed.length} failed out of ${missingStudents.length} students without accounts.`,
      missingCount: missingStudents.length,
      repairedCount: repaired.length,
      failedCount: failed.length,
      repaired,
      failed,
    })
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } catch {
      // ignore rollback errors
    }
    console.error('Student account reconciliation error:', error)
    return res.status(500).json({ message: 'Error reconciling student accounts', detail: error.message })
  } finally {
    client.release()
  }
}
