import { pool } from '@/drizzle/client'
import { authorize, setCorsHeaders } from '@/lib/auth'

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return

  // GET: Authenticated users can view settings and academic years
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
      }

      settingRes.rows.forEach(r => {
        try {
          systemSettings[r.key] = JSON.parse(r.value)
        } catch {
          systemSettings[r.key] = r.value
        }
      })

      return res.status(200).json({
        academicYears: yearRes.rows.map(y => y.year),
        academicYearDetails: yearRes.rows,
        systemSettings,
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
      const { newAcademicYear, academicYear, systemSettings } = body

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
      if (systemSettings && typeof systemSettings === 'object') {
        for (const [key, value] of Object.entries(systemSettings)) {
          await client.query(
            `INSERT INTO system_setting (key, value, updated_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
            [key, JSON.stringify(value)]
          )
        }
      }

      const yearRes = await client.query('SELECT year FROM academic_year ORDER BY year DESC')
      return res.status(200).json({
        message: 'Settings saved successfully',
        academicYears: yearRes.rows.map(y => y.year),
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
