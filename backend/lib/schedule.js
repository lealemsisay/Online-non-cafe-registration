import { pool } from '@/drizzle/client'

const normalizeCategory = (category) => {
  const value = String(category || '').trim().toLowerCase()
  if (!value) return null
  if (value === 'non-cafe' || value === 'non_cafe' || value === 'noncafe' || value === 'noncafeteria') {
    return 'non-cafe'
  }
  if (value === 'cafe' || value === 'cafeteria') return 'cafe'
  return null
}

/**
 * Checks whether registration is currently open based on system schedule settings.
 * @param {import('pg').PoolClient} [client] - Optional existing database client
 * @param {{ category?: 'cafe' | 'non-cafe' | string }} [options]
 * @returns {Promise<{
 *   isOpen: boolean,
 *   isLate?: boolean,
 *   reason?: string,
 *   academicYear: string | null,
 *   schedule: {
 *     startDate: string | null,
 *     endDate: string | null,
 *     isOpenManually: boolean,
 *     allowLate: boolean,
 *     category: string | null
 *   }
 * }>}
 */
export async function checkRegistrationWindow(client = null, options = {}) {
  const dbClient = client || (await pool.connect())
  const shouldRelease = !client
  const category = normalizeCategory(options.category)

  try {
    const res = await dbClient.query(
      `SELECT key, value FROM system_setting WHERE key IN (
         'registration_start_date',
         'registration_end_date',
         'registration_is_open',
         'allow_late_registration',
         'cafe_registration_open',
         'non_cafe_registration_open'
       )`
    )

    const map = {}
    res.rows.forEach((r) => {
      try {
        map[r.key] = JSON.parse(r.value)
      } catch {
        map[r.key] = r.value
      }
    })

    const yearRes = await dbClient.query(
      `SELECT year FROM academic_year WHERE is_active = true ORDER BY year DESC LIMIT 1`
    )
    const academicYear = yearRes.rows.length > 0 ? yearRes.rows[0].year : null

    const startDate = map.registration_start_date ? new Date(map.registration_start_date) : null
    const endDate = map.registration_end_date ? new Date(map.registration_end_date) : null
    const isOpenManually = map.registration_is_open !== false && map.registration_is_open !== 'false'
    const allowLate = map.allow_late_registration === true || map.allow_late_registration === 'true'

    const schedule = {
      startDate: startDate && !isNaN(startDate.getTime()) ? startDate.toISOString() : null,
      endDate: endDate && !isNaN(endDate.getTime()) ? endDate.toISOString() : null,
      isOpenManually,
      allowLate,
      category,
    }

    const base = { academicYear, schedule }

    // Category-specific policy (Cafe / Non-Cafe) takes precedence over the
    // general schedule because it is an explicit administrative decision.
    if (category === 'cafe') {
      const cafeOpen =
        map.cafe_registration_open !== false && map.cafe_registration_open !== 'false'
      if (!cafeOpen) {
        return {
          ...base,
          isOpen: false,
          isLate: false,
          reason: 'Cafe registration is currently closed by the university administration.',
        }
      }
    } else if (category === 'non-cafe') {
      const nonCafeOpen =
        map.non_cafe_registration_open !== false && map.non_cafe_registration_open !== 'false'
      if (!nonCafeOpen) {
        return {
          ...base,
          isOpen: false,
          isLate: false,
          reason: 'Non-Cafe registration is currently closed by the university administration.',
        }
      }
    }

    const now = new Date()
    const isPastEnd = endDate && !isNaN(endDate.getTime()) && now > endDate

    // If late registration is allowed, window is open regardless of normal closing
    if (allowLate) {
      return {
        ...base,
        isOpen: true,
        isLate: Boolean(isPastEnd || !isOpenManually),
      }
    }

    // If manually closed by Admin
    if (!isOpenManually) {
      return {
        ...base,
        isOpen: false,
        isLate: false,
        reason: 'Registration is currently closed by the university administration.',
      }
    }

    // Check start date
    if (startDate && !isNaN(startDate.getTime()) && now < startDate) {
      return {
        ...base,
        isOpen: false,
        isLate: false,
        reason: `Registration has not opened yet. It is scheduled to open on ${startDate.toLocaleString('en-US', { timeZone: 'UTC' })} UTC.`,
      }
    }

    // Check end date
    if (endDate && !isNaN(endDate.getTime()) && now > endDate) {
      return {
        ...base,
        isOpen: false,
        isLate: false,
        reason: `Registration window closed on ${endDate.toLocaleString('en-US', { timeZone: 'UTC' })} UTC. Submissions are no longer accepted.`,
      }
    }

    return { ...base, isOpen: true, isLate: false }
  } catch (err) {
    console.error('Error checking registration window:', err)
    // Default to open in case of error so system doesn't unexpectedly lock up
    return {
      isOpen: true,
      isLate: false,
      academicYear: null,
      schedule: {
        startDate: null,
        endDate: null,
        isOpenManually: true,
        allowLate: false,
        category,
      },
    }
  } finally {
    if (shouldRelease) {
      dbClient.release()
    }
  }
}

/**
 * Resolves the student's Cafe / Non-Cafe category and evaluates the window.
 * @param {import('pg').PoolClient} [client]
 * @param {string} studentId
 */
export async function checkRegistrationWindowForStudent(client = null, studentId) {
  const dbClient = client || (await pool.connect())
  const shouldRelease = !client

  try {
    let category = null
    if (studentId) {
      const studentRes = await dbClient.query(
        'SELECT is_non_cafeteria FROM student WHERE student_id = $1',
        [studentId]
      )
      if (studentRes.rows.length > 0) {
        category = studentRes.rows[0].is_non_cafeteria ? 'non-cafe' : 'cafe'
      }
    }

    return await checkRegistrationWindow(dbClient, { category })
  } finally {
    if (shouldRelease) {
      dbClient.release()
    }
  }
}
