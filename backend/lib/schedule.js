import { pool } from '@/drizzle/client'

/**
 * Checks whether registration is currently open based on system schedule settings.
 * @param {import('pg').PoolClient} [client] - Optional existing database client
 * @returns {Promise<{
 *   isOpen: boolean,
 *   reason?: string,
 *   schedule: {
 *     startDate: string | null,
 *     endDate: string | null,
 *     isOpenManually: boolean,
 *     allowLate: boolean
 *   }
 * }>}
 */
export async function checkRegistrationWindow(client = null) {
  const dbClient = client || await pool.connect()
  const shouldRelease = !client

  try {
    const res = await dbClient.query(
      `SELECT key, value FROM system_setting WHERE key IN (
         'registration_start_date',
         'registration_end_date',
         'registration_is_open',
         'allow_late_registration'
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

    const startDate = map.registration_start_date ? new Date(map.registration_start_date) : null
    const endDate = map.registration_end_date ? new Date(map.registration_end_date) : null
    const isOpenManually = map.registration_is_open !== false && map.registration_is_open !== 'false'
    const allowLate = map.allow_late_registration === true || map.allow_late_registration === 'true'

    const now = new Date()

    const schedule = {
      startDate: startDate ? startDate.toISOString() : null,
      endDate: endDate ? endDate.toISOString() : null,
      isOpenManually,
      allowLate,
    }

    // If late registration is allowed, window is open regardless of dates
    if (allowLate) {
      return { isOpen: true, schedule }
    }

    // If manually closed by Admin
    if (!isOpenManually) {
      return {
        isOpen: false,
        reason: 'Registration is currently closed by the university administration.',
        schedule,
      }
    }

    // Check start date
    if (startDate && !isNaN(startDate.getTime()) && now < startDate) {
      return {
        isOpen: false,
        reason: `Registration has not opened yet. It is scheduled to open on ${startDate.toLocaleString('en-US', { timeZone: 'UTC' })} UTC.`,
        schedule,
      }
    }

    // Check end date
    if (endDate && !isNaN(endDate.getTime()) && now > endDate) {
      return {
        isOpen: false,
        reason: `Registration window closed on ${endDate.toLocaleString('en-US', { timeZone: 'UTC' })} UTC. Submissions are no longer accepted.`,
        schedule,
      }
    }

    return { isOpen: true, schedule }
  } catch (err) {
    console.error('Error checking registration window:', err)
    // Default to open in case of error so system doesn't unexpectedly lock up
    return {
      isOpen: true,
      schedule: { startDate: null, endDate: null, isOpenManually: true, allowLate: false },
    }
  } finally {
    if (shouldRelease) {
      dbClient.release()
    }
  }
}
