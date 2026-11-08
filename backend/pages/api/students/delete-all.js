import { pool } from '@/drizzle/client'
import { authorize, setCorsHeaders } from '@/lib/auth'

// Super Admin-only bulk delete. Student records and their student login accounts
// are permanently removed from the database.
export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return

  const auth = authorize(req, ['admin', 'super_admin'])
  if (auth.error) return res.status(auth.status).json({ message: auth.error })

  if (req.method === 'GET') {
    const client = await pool.connect()
    try {
      const result = await client.query(
        `SELECT
           COUNT(*) FILTER (WHERE COALESCE(is_archived, false) = false)::int AS "activeCount",
           COUNT(*) FILTER (WHERE COALESCE(is_archived, false) = true)::int AS "archivedCount"
         FROM student`
      )
      return res.status(200).json({
        activeStudentCount: result.rows[0].activeCount,
        archivedStudentCount: result.rows[0].archivedCount,
      })
    } catch (error) {
      console.error('Error counting students:', error)
      return res.status(500).json({ message: 'Error counting students', detail: error.message })
    } finally {
      client.release()
    }
  }

  if (req.method !== 'POST' && req.method !== 'DELETE') {
    res.setHeader('Allow', ['GET', 'POST', 'DELETE'])
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const confirm = req.body?.confirm
  if (confirm !== true && confirm !== 'DELETE_ALL_STUDENTS') {
    return res.status(400).json({
      message: 'Confirmation required. Send { "confirm": true } to delete all students.',
    })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const idsRes = await client.query('SELECT student_id FROM student')
    const studentIds = idsRes.rows.map((r) => String(r.student_id).toLowerCase())

    let deletedCustomValues = 0
    let deletedDocuments = 0
    if (studentIds.length > 0) {
      const cv = await client.query(
        'DELETE FROM student_custom_value WHERE LOWER(student_id) = ANY($1::text[])',
        [studentIds]
      )
      deletedCustomValues = cv.rowCount
      const docs = await client.query(
        'DELETE FROM document_metadata WHERE LOWER(student_id) = ANY($1::text[])',
        [studentIds]
      )
      deletedDocuments = docs.rowCount
    }

    const deleted = await client.query('DELETE FROM student RETURNING student_id')

    let deletedAccounts = 0
    if (studentIds.length > 0) {
      const accounts = await client.query(
        `DELETE FROM app_user
          WHERE role = 'student'
            AND LOWER(username) = ANY($1::text[])
          RETURNING id`,
        [studentIds]
      )
      deletedAccounts = accounts.rowCount
    }

    if (req.body?.dryRun === true) {
      const wouldDelete = deleted.rowCount
      await client.query('ROLLBACK')
      return res.status(200).json({
        success: true,
        dryRun: true,
        wouldDelete,
        wouldArchive: wouldDelete,
        deletedAccounts,
        message: `Preview: ${wouldDelete} student record(s) would be permanently deleted.`,
      })
    }

    const performedBy = auth.user.username || auth.user.name || 'admin'
    await client.query(
      `INSERT INTO audit_log (action, performed_by, target_id, target_type, details)
       VALUES ('delete_all_students', $1, 'all_students', 'student', $2)`,
      [
        performedBy,
        JSON.stringify({
          deletedStudents: deleted.rowCount,
          deletedAccounts,
          deletedCustomValues,
          deletedDocuments,
          performedBy,
          timestamp: new Date().toISOString(),
        }),
      ]
    )

    await client.query('COMMIT')

    return res.status(200).json({
      success: true,
      deletedCount: deleted.rowCount,
      archivedCount: deleted.rowCount,
      deletedAccounts,
      message: `${deleted.rowCount} student record(s) permanently deleted from the database.`,
    })
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } catch {
      // ignore
    }
    console.error('Error deleting all students:', error)
    return res.status(500).json({ message: 'Error deleting all students', detail: error.message })
  } finally {
    client.release()
  }
}