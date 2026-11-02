import { pool } from '@/drizzle/client'
import { authorize, setCorsHeaders } from '@/lib/auth'

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return

  // Accessible by Super Admin and Campus Dean
  const auth = authorize(req, ['admin', 'dean'])
  if (auth.error) return res.status(auth.status).json({ message: auth.error })

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { fieldId, limit = 100, offset = 0 } = req.query || {}
  if (!fieldId) {
    return res.status(400).json({ message: 'fieldId query parameter is required' })
  }

  const user = auth.user
  const userRole = user.role
  const userCampus = (user.campus || '').trim().toLowerCase()

  const client = await pool.connect()
  try {
    // 1. Fetch custom field definition
    const fieldRes = await client.query(
      `SELECT 
         id, 
         field_key AS "fieldKey", 
         label, 
         field_type AS "fieldType", 
         options, 
         is_required AS "isRequired", 
         is_active AS "isActive", 
         COALESCE(applies_to, 'all') AS "appliesTo",
         campus
       FROM custom_field_definition 
       WHERE id::text = $1`,
      [fieldId]
    )

    if (fieldRes.rows.length === 0) {
      return res.status(404).json({ message: 'Custom field definition not found' })
    }

    const field = fieldRes.rows[0]

    // Campus Dean authorization check
    if (userRole === 'dean') {
      if (field.campus && field.campus.trim().toLowerCase() !== userCampus) {
        return res.status(403).json({
          message: `Forbidden: Campus Dean is strictly restricted to '${user.campus}'. Cannot access field submissions for '${field.campus}'.`,
        })
      }
    }

    // 2. Query student submissions for this field
    let subQuery = `
      SELECT 
        v.id AS "submissionId",
        v.student_id AS "studentId",
        COALESCE(s.full_name, v.student_id) AS "studentName",
        s.campus,
        s.department,
        s.program,
        s.year_of_study AS "yearOfStudy",
        COALESCE(s.is_non_cafeteria, false) AS "isNonCafeteria",
        COALESCE(s.registration_status, 'submitted') AS "registrationStatus",
        COALESCE(s.application_status, 'submitted') AS "applicationStatus",
        v.field_key AS "fieldKey",
        v.value,
        v.created_at AS "submittedAt",
        v.updated_at AS "updatedAt"
      FROM student_custom_value v
      LEFT JOIN student s ON (s.student_id = v.student_id OR s.id::text = v.student_id)
      WHERE v.field_id = $1
    `
    const params = [field.id]

    // If Dean, only show submissions from dean's campus
    if (userRole === 'dean') {
      params.push(userCampus)
      subQuery += ` AND (s.campus IS NULL OR LOWER(s.campus) = $${params.length})`
    }

    subQuery += ` ORDER BY v.updated_at DESC, v.created_at DESC`

    const parsedLimit = Math.min(200, Math.max(1, parseInt(limit) || 100))
    const parsedOffset = Math.max(0, parseInt(offset) || 0)

    params.push(parsedLimit)
    const limitIndex = params.length
    params.push(parsedOffset)
    const offsetIndex = params.length

    const paginatedQuery = `${subQuery} LIMIT $${limitIndex} OFFSET $${offsetIndex}`
    const submissionsRes = await client.query(paginatedQuery, params)

    // Total count for pagination
    let countQuery = `
      SELECT COUNT(*)::int AS "totalCount"
      FROM student_custom_value v
      LEFT JOIN student s ON (s.student_id = v.student_id OR s.id::text = v.student_id)
      WHERE v.field_id = $1
    `
    const countParams = [field.id]
    if (userRole === 'dean') {
      countParams.push(userCampus)
      countQuery += ` AND (s.campus IS NULL OR LOWER(s.campus) = $${countParams.length})`
    }
    const countRes = await client.query(countQuery, countParams)
    const totalCount = countRes.rows[0]?.totalCount || 0

    return res.status(200).json({
      field,
      totalCount,
      submissions: submissionsRes.rows,
    })
  } catch (error) {
    console.error('Error fetching field submissions:', error)
    return res.status(500).json({ message: 'Error fetching field submissions', detail: error.message })
  } finally {
    client.release()
  }
}
