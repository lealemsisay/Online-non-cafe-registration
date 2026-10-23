import { pool } from '@/drizzle/client'
import { authorize, setCorsHeaders } from '@/lib/auth'
import { checkRegistrationWindow } from '@/lib/schedule'
import { createNotification } from '@/lib/notifications'

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return

  // GET: Authenticated users can view settings, academic years, and registration schedule
  if (req.method === 'GET') {
    const auth = authorize(req, ['admin', 'dean', 'student'])
    if (auth.error) return res.status(auth.status).json({ message: auth.error })

    const client = await pool.connect()
    try {
      const yearRes = await client.query('SELECT year, is_active AS "isActive" FROM academic_year ORDER BY year DESC')
      const settingRes = await client.query('SELECT key, value FROM system_setting')

      const systemSettings = {
        allowLateRegistration: false,
        requirePdfVerification: true,
        maxPdfSizeMB: 5,
        registration_start_date: null,
        registration_end_date: null,
        registration_is_open: true,
        allow_late_registration: false,
      }

      settingRes.rows.forEach(r => {
        try {
          systemSettings[r.key] = JSON.parse(r.value)
        } catch {
          systemSettings[r.key] = r.value
        }
      })

      const registrationWindow = await checkRegistrationWindow(client)

      return res.status(200).json({
        academicYears: yearRes.rows.map(y => y.year),
        academicYearDetails: yearRes.rows,
        systemSettings,
        registrationWindow,
      })
    } catch (error) {
      console.error('Error fetching settings:', error)
      return res.status(500).json({ message: 'Error fetching settings' })
    } finally {
      client.release()
    }
  }

  // POST / PUT: Super Admin only
  if (req.method === 'POST' || req.method === 'PUT') {
    const auth = authorize(req, ['admin'])
    if (auth.error) return res.status(auth.status).json({ message: auth.error })

    const client = await pool.connect()
    try {
      const body = req.body || {}
      const { newAcademicYear, academicYear, systemSettings, schedule } = body

      // Add academic year if provided
      const yearToAdd = (newAcademicYear || academicYear || '').trim()
      if (yearToAdd) {
        await client.query(
          `INSERT INTO academic_year (year, is_active)
           VALUES ($1, false)
           ON CONFLICT (year) DO NOTHING`,
          [yearToAdd]
        )
      }

      // Upsert system settings if provided
      const settingsToSave = { ...(systemSettings || {}) }

      // Also merge schedule if provided
      if (schedule && typeof schedule === 'object') {
        if (schedule.startDate !== undefined) settingsToSave.registration_start_date = schedule.startDate
        if (schedule.endDate !== undefined) settingsToSave.registration_end_date = schedule.endDate
        if (schedule.isOpen !== undefined) settingsToSave.registration_is_open = Boolean(schedule.isOpen)
        if (schedule.allowLate !== undefined) {
          settingsToSave.allow_late_registration = Boolean(schedule.allowLate)
          settingsToSave.allowLateRegistration = Boolean(schedule.allowLate)
        }
      }

      for (const [key, value] of Object.entries(settingsToSave)) {
        await client.query(
          `INSERT INTO system_setting (key, value, updated_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
          [key, JSON.stringify(value)]
        )
      }

      const yearRes = await client.query('SELECT year FROM academic_year ORDER BY year DESC')
      const windowStatus = await checkRegistrationWindow(client)

      // Notify users if schedule changed
      if (schedule) {
        await createNotification(
          {
            recipientRole: 'all',
            title: 'Registration Schedule Updated',
            message: `The cost-sharing registration window has been updated by the administration. Status: ${windowStatus.isOpen ? 'Open' : 'Closed'}.`,
            type: 'info',
            link: '/',
          },
          client
        )
      }

      return res.status(200).json({
        message: 'Settings saved successfully',
        academicYears: yearRes.rows.map(y => y.year),
        registrationWindow: windowStatus,
      })
    } catch (error) {
      console.error('Error saving settings:', error)
      return res.status(500).json({ message: 'Error saving settings' })
    } finally {
      client.release()
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT'])
  return res.status(405).json({ message: 'Method not allowed' })
}
