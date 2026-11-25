/**
 * Campus Management is the single source of campus records.
 * Assignments must resolve to an existing campus row. Never invent fallback campuses.
 */

export async function listCampuses(client, { activeOnly = false, includeDean = false } = {}) {
  const where = activeOnly ? `WHERE LOWER(COALESCE(c.status, 'active')) = 'active'` : ''
  const sql = includeDean
    ? `SELECT c.id, c.name, c.code, c.dean_id AS "deanId",
              COALESCE(u.full_name, (SELECT u2.full_name FROM app_user u2 WHERE u2.role = 'dean' AND u2.campus = c.name LIMIT 1)) AS dean,
              c.status, c.created_at AS "createdAt"
         FROM campus c
         LEFT JOIN app_user u ON c.dean_id = u.id
         ${where}
         ORDER BY c.name ASC`
    : `SELECT c.id, c.name, c.code, c.status FROM campus c ${where} ORDER BY c.name ASC`
  const result = await client.query(sql)
  return result.rows
}

export async function resolveCampus(client, { campusId, campusName, requireActive = true } = {}) {
  const id = campusId ? String(campusId).trim() : ''
  const name = campusName ? String(campusName).trim() : ''

  if (!id && !name) {
    return { error: 'Campus selection is required.', status: 400 }
  }

  const result = id
    ? await client.query(`SELECT id, name, code, status FROM campus WHERE id::text = $1 LIMIT 1`, [id])
    : await client.query(`SELECT id, name, code, status FROM campus WHERE LOWER(name) = LOWER($1) LIMIT 1`, [name])

  const campus = result.rows[0]
  if (!campus) {
    return { error: 'The selected campus does not exist in Campus Management.', status: 400 }
  }

  const isActive = String(campus.status || 'active').toLowerCase() === 'active'
  if (requireActive && !isActive) {
    return {
      error: `Campus '${campus.name}' is deactivated and cannot be assigned to new records.`,
      status: 400,
      campus,
    }
  }

  return { campus }
}

export function emptyToNull(value) {
  if (value == null) return null
  const text = String(value).trim()
  if (!text) return null
  const lower = text.toLowerCase()
  if (['null', 'undefined', 'n/a', 'na', '-', 'none'].includes(lower)) return null
  return text
}
