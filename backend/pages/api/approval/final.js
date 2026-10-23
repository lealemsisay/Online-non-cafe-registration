import { pool } from '@/drizzle/client'
import { authorize, setCorsHeaders } from '@/lib/auth'

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ message: 'Method not allowed' })
  }

  // Super Admin ONLY!
  const auth = authorize(req, ['admin'])
  if (auth.error) return res.status(auth.status).json({ message: auth.error })

  try {
    const body = req.body || {}
    const { applicationId, decision, comments } = body

    if (!applicationId || !decision) {
      return res.status(400).json({ message: 'Application ID and decision are required' })
    }

    const validDecisions = ['approved', 'rejected', 'return-for-correction', 'returned-for-correction']
    if (!validDecisions.includes(decision)) {
      return res.status(400).json({ message: 'Invalid decision. Must be "approved", "rejected", or "return-for-correction"' })
    }

    const normalizedDecision = (decision === 'returned-for-correction' || decision === 'return-for-correction')
      ? 'return-for-correction'
      : decision

    const client = await pool.connect()
    try {
      const result = await client.query(
        `UPDATE student 
         SET approval_status = CASE WHEN $1 = 'approved' THEN 'approved' WHEN $1 = 'rejected' THEN 'rejected' ELSE 'pending' END,
             super_admin_comments = $2, 
             approved_at = CASE WHEN $1 = 'approved' THEN NOW() ELSE NULL END,
             rejected_at = CASE WHEN $1 = 'rejected' THEN NOW() ELSE NULL END,
             application_status = $1,
             updated_at = NOW()
         WHERE id::text = $3 OR student_id = $3
         RETURNING id, student_id AS "studentId", full_name AS "fullName", department, campus, approval_status AS "approvalStatus", super_admin_comments AS "superAdminComments", approved_at AS "approvedAt", rejected_at AS "rejectedAt", application_status AS "applicationStatus"`,
        [normalizedDecision, comments || null, applicationId]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Application not found' })
      }

      const updatedApplication = result.rows[0]

      await client.query(
        `INSERT INTO audit_log (action, performed_by, target_id, target_type, details)
         VALUES ('super_admin_approval', $1, $2, 'application', $3)`,
        [auth.user.name || 'super-admin', applicationId, `Super Admin ${decision}: ${comments || ''}`]
      )

      return res.status(200).json({
        success: true,
        application: {
          ...updatedApplication,
          approvalStatus: decision,
        },
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Super Admin approval error:', error)
    return res.status(500).json({ message: 'Error processing approval' })
  }
}