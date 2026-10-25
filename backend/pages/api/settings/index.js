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
        maxPhotoSizeMB: 8,
        max_photo_size_mb: 8,
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

      if (systemSettings.max_photo_size_mb) {
        systemSettings.maxPhotoSizeMB = Number(systemSettings.max_photo_size_mb)
      } else if (systemSettings.maxPhotoSizeMB) {
        systemSettings.max_photo_size_mb = Number(systemSettings.maxPhotoSizeMB)
      }

      const defaultDepartments = [
        'Computer Science',
        'Information Technology',
        'Software Engineering',
        'Business Administration',
        'Economics',
        'Civil Engineering',
        'Electrical Engineering',
        'Medicine & Health Sciences',
        'Nursing',
        'Law',
        'Agriculture & Natural Resources',
      ]
      const defaultBatches = ['2021', '2022', '2023', '2024', '2025', '2026']
      const defaultPrograms = ['Regular Degree', 'Continuing Education', 'Postgraduate Degree']

      const departments = Array.isArray(systemSettings.departments) ? systemSettings.departments : defaultDepartments
      const batches = Array.isArray(systemSettings.batches) ? systemSettings.batches : defaultBatches
      const programs = Array.isArray(systemSettings.programs) ? systemSettings.programs : defaultPrograms

      const registrationWindow = await checkRegistrationWindow(client)

      return res.status(200).json({
        academicYears: yearRes.rows.map(y => y.year),
        academicYearDetails: yearRes.rows,
        departments,
        batches,
        programs,
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
      if (body.maxPhotoSizeMB !== undefined) {
        settingsToSave.maxPhotoSizeMB = body.maxPhotoSizeMB
      }
      if (body.max_photo_size_mb !== undefined) {
        settingsToSave.max_photo_size_mb = body.max_photo_size_mb
      }
      if (body.departments !== undefined && Array.isArray(body.departments)) {
        settingsToSave.departments = body.departments
      }
      if (body.batches !== undefined && Array.isArray(body.batches)) {
        settingsToSave.batches = body.batches
      }
      if (body.programs !== undefined && Array.isArray(body.programs)) {
        settingsToSave.programs = body.programs
      }

      // Validate max photo size limit if provided (must be between 1 MB and 10 MB)
      const photoLimitCandidate = settingsToSave.maxPhotoSizeMB !== undefined 
        ? settingsToSave.maxPhotoSizeMB 
        : settingsToSave.max_photo_size_mb
      
      if (photoLimitCandidate !== undefined && photoLimitCandidate !== null) {
        const parsedLimit = Number(photoLimitCandidate)
        if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 10) {
          return res.status(400).json({ 
            message: 'Invalid photo upload size limit. Must be a value between 1 MB and 10 MB.' 
          })
        }
        settingsToSave.maxPhotoSizeMB = parsedLimit
        settingsToSave.max_photo_size_mb = parsedLimit
      }

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
