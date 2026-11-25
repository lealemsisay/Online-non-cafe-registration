import { pool } from '@/drizzle/client'
import { authorize, setCorsHeaders } from '@/lib/auth'
import { describeAuditAction } from '@/lib/audit'

const RECENT_ACTIONS = [
  'bulk_student_import',
  'create_student',
  'update_student',
  'archive_student',
  'bulk_archive_students',
  'delete_all_students',
  'create_custom_field',
  'update_custom_field',
  'delete_custom_field',
  'toggle_custom_field',
  'create_campus',
  'update_campus',
  'create_dean',
  'create_vice_dean',
  'create_user',
  'update_user',
  'suspend_user',
  'activate_user',
  'create_academic_year',
  'update_academic_year',
  'update_schedule',
  'enable_late_registration',
  'disable_late_registration',
  'toggle_late_registration',
  'category_change',
]

function parseDetails(raw) {
  if (!raw) return null
  if (typeof raw === 'object') return raw
  try {
    return JSON.parse(raw)
  } catch {
    return { text: String(raw) }
  }
}

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return

  const auth = authorize(req, ['admin', 'dean', 'viceDean'])
  if (auth.error) return res.status(auth.status).json({ message: auth.error })

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const limit = Math.min(Math.max(parseInt(req.query?.limit, 10) || 15, 1), 100)
  const client = await pool.connect()
  try {
    const params = [RECENT_ACTIONS, limit]
    let sql = `
      SELECT id, action, performed_by AS "performedBy", actor_role AS "actorRole",
             target_id AS "targetId", target_type AS "targetType", entity_label AS "entityLabel",
             campus, details, created_at AS "createdAt"
        FROM audit_log
       WHERE action = ANY($1::text[])
    `
    if (auth.user.role === 'dean' || auth.user.role === 'viceDean') {
      params.splice(1, 0, auth.user.campus || '')
      sql += ` AND (campus IS NULL OR LOWER(campus) = LOWER($2))`
      sql += ` ORDER BY created_at DESC LIMIT $3`
    } else {
      sql += ` ORDER BY created_at DESC LIMIT $2`
    }

    const result = await client.query(sql, params)
    const activities = result.rows.map((row) => {
      const details = parseDetails(row.details)
      return {
        id: row.id,
        action: row.action,
        description: describeAuditAction(row.action),
        actorName: row.performedBy,
        actorRole: row.actorRole || details?.actorRole || null,
        targetId: row.targetId,
        targetType: row.targetType,
        entityLabel: row.entityLabel || details?.entityLabel || details?.name || details?.studentId || row.targetId,
        campus: row.campus || details?.campus || null,
        details,
        createdAt: row.createdAt,
      }
    })
    return res.status(200).json({ activities })
  } catch (error) {
    console.error('Error fetching audit log:', error)
    return res.status(500).json({ message: 'Error fetching activity log' })
  } finally {
    client.release()
  }
}
