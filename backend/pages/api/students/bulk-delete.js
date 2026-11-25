import { pool } from '@/drizzle/client'
import { authorize, setCorsHeaders } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'
import { emptyToNull } from '@/lib/campus'

function yearDigit(value) {
  const digits = String(value || '').replace(/\D/g, '')
  return digits || null
}

function applyStudentFilters(baseConditions, params, { search, campus, gender, department, yearOfStudy, auth }) {
  const conditions = [...baseConditions]

  if (auth.user.role === 'dean' || auth.user.role === 'viceDean') {
    params.push(auth.user.campus)
    conditions.push(`s.campus = $${params.length}`)
  } else if (campus && campus !== 'all') {
    params.push(campus)
    conditions.push(`s.campus = $${params.length}`)
  }

  if (search) {
    params.push(`%${String(search).toLowerCase()}%`)
    conditions.push(`(LOWER(s.full_name) LIKE $${params.length} OR LOWER(s.student_id) LIKE $${params.length} OR LOWER(COALESCE(s.department, '')) LIKE $${params.length} OR LOWER(COALESCE(s.email, '')) LIKE $${params.length})`)
  }

  if (gender && gender !== 'all') {
    params.push(gender.toLowerCase())
    conditions.push(`LOWER(COALESCE(s.gender, '')) = $${params.length}`)
  }

  if (department === '__empty__') {
    conditions.push(`(s.department IS NULL OR TRIM(s.department) = '')`)
  } else if (department && department !== 'all') {
    params.push(department.toLowerCase())
    conditions.push(`LOWER(s.department) = $${params.length}`)
  }

  const year = yearDigit(yearOfStudy)
  if (yearOfStudy && yearOfStudy !== 'all' && year) {
    params.push(year)
    conditions.push(`REGEXP_REPLACE(COALESCE(s.year_of_study, ''), '[^0-9]', '', 'g') = $${params.length}`)
  }

  return conditions
}

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return

  const auth = authorize(req, ['admin', 'dean', 'viceDean'])
  if (auth.error) return res.status(auth.status).json({ message: auth.error })

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const body = req.body || {}
  if (body.confirm !== true) {
    return res.status(400).json({ message: 'Confirmation required. Send { "confirm": true }.' })
  }

  const selectAllMatching = body.selectAllMatching === true
  const ids = Array.isArray(body.ids) ? body.ids.map((id) => String(id).trim()).filter(Boolean) : []
  const filters = body.filters || {}

  if (!selectAllMatching && ids.length === 0) {
    return res.status(400).json({ message: 'No students were selected.' })
  }

  if (selectAllMatching && auth.user.role !== 'admin' && auth.user.role !== 'super_admin') {
    // Campus-scoped roles may select-all only within their campus; filters still apply.
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const params = []
    let conditions = ['COALESCE(s.is_archived, false) = false']
    conditions = applyStudentFilters(conditions, params, {
      search: emptyToNull(filters.search),
      campus: filters.campus,
      gender: filters.gender,
      department: filters.department,
      yearOfStudy: filters.yearOfStudy,
      auth,
    })

    if (!selectAllMatching) {
      params.push(ids)
      conditions.push(`(s.id::text = ANY($${params.length}::text[]) OR s.student_id = ANY($${params.length}::text[]))`)
    }

    const where = conditions.join(' AND ')
    const selected = await client.query(
      `SELECT s.id, s.student_id AS "studentId", s.full_name AS "fullName", s.campus
         FROM student s
        WHERE ${where}`,
      params
    )

    if (selected.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(400).json({ message: 'No eligible student records matched the selection.' })
    }

    const studentIds = selected.rows.map((r) => r.studentId)
    const uuids = selected.rows.map((r) => r.id)

    await client.query(
      `UPDATE student
          SET is_archived = true, archived_at = NOW(), archived_by = $1, updated_at = NOW()
        WHERE id = ANY($2::uuid[])`,
      [auth.user.username || auth.user.name, uuids]
    )

    await client.query(
      `UPDATE app_user
          SET status = 'inactive', updated_at = NOW()
        WHERE role = 'student' AND LOWER(username) = ANY($1::text[])`,
      [studentIds.map((id) => String(id).toLowerCase())]
    )

    const performedBy = auth.user.username || auth.user.name
    await writeAudit(client, {
      action: 'bulk_archive_students',
      performedBy,
      actorRole: auth.user.role,
      targetId: 'selected_students',
      targetType: 'student',
      entityLabel: `${selected.rows.length} students`,
      campus: auth.user.role === 'admin' ? (filters.campus && filters.campus !== 'all' ? filters.campus : null) : auth.user.campus,
      details: {
        count: selected.rows.length,
        selectAllMatching,
        filters,
        studentIds: studentIds.slice(0, 50),
      },
    })

    await client.query('COMMIT')
    return res.status(200).json({
      success: true,
      archivedCount: selected.rows.length,
      message: `${selected.rows.length} student record(s) archived. Historical registration and audit records were preserved.`,
    })
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } catch {
      // ignore
    }
    console.error('Bulk student archive error:', error)
    return res.status(500).json({ message: 'Error archiving selected students', detail: error.message })
  } finally {
    client.release()
  }
}
