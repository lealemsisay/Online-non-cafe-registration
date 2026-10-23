import { pool } from '@/drizzle/client'
import { authorize, setCorsHeaders } from '@/lib/auth'

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return

  // Accessible only by Super Admin and Campus Dean
  const auth = authorize(req, ['admin', 'dean'])
  if (auth.error) return res.status(auth.status).json({ message: auth.error })

  const user = auth.user
  const userRole = user.role
  const userCampus = user.campus

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const client = await pool.connect()
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      campus = '',
      department = '',
      academicYear = '',
      status = '',
    } = req.query || {}

    // Campus restriction check for Campus Dean
    let effectiveCampus = null
    if (userRole === 'dean') {
      if (campus && campus.trim().toLowerCase() !== (userCampus || '').toLowerCase()) {
        return res.status(403).json({
          message: `Forbidden: Campus Deans are strictly restricted to '${userCampus}'. Cannot access reports for '${campus}'.`,
        })
      }
      effectiveCampus = userCampus
    } else if (campus && campus !== 'all') {
      effectiveCampus = campus.trim()
    }

    // Build WHERE clause
    const conditions = ['1=1']
    const params = []

    if (effectiveCampus) {
      params.push(effectiveCampus)
      conditions.push(`LOWER(s.campus) = LOWER($${params.length})`)
    }

    if (department && department !== 'all') {
      params.push(department.trim())
      conditions.push(`LOWER(s.department) = LOWER($${params.length})`)
    }

    if (academicYear && academicYear !== 'all') {
      params.push(academicYear.trim())
      conditions.push(`s.academic_year = $${params.length}`)
    }

    if (status && status !== 'all') {
      params.push(status.trim())
      conditions.push(`LOWER(s.application_status) = LOWER($${params.length})`)
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`)
      conditions.push(`(
        LOWER(s.full_name) LIKE $${params.length} 
        OR LOWER(s.student_id) LIKE $${params.length} 
        OR LOWER(COALESCE(s.department, '')) LIKE $${params.length} 
        OR LOWER(COALESCE(s.email, '')) LIKE $${params.length}
      )`)
    }

    const whereClause = conditions.join(' AND ')

    // 1. Get total count for pagination
    const countQuery = `SELECT COUNT(*) AS count FROM student s WHERE ${whereClause}`
    const countRes = await client.query(countQuery, params)
    const totalCount = parseInt(countRes.rows[0]?.count || 0, 10)

    // 2. Fetch paginated records
    const pageNum = Math.max(1, parseInt(page, 10) || 1)
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10))
    const offset = (pageNum - 1) * limitNum

    params.push(limitNum)
    const limitIdx = params.length
    params.push(offset)
    const offsetIdx = params.length

    const dataQuery = `
      SELECT 
        s.id,
        s.student_id AS "studentId",
        s.full_name AS "fullName",
        s.gender,
        s.campus,
        s.department,
        s.program,
        s.year_of_study AS "yearOfStudy",
        s.phone,
        s.email,
        s.academic_year AS "academicYear",
        s.application_status AS "applicationStatus",
        s.is_non_cafeteria AS "isNonCafeteria",
        s.created_at AS "createdAt",
        s.updated_at AS "updatedAt"
      FROM student s
      WHERE ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `
    const dataRes = await client.query(dataQuery, params)

    // 3. Compute dynamic aggregate metrics from real PostgreSQL records
    const metricsBaseQuery = `SELECT campus, department, academic_year AS "academicYear", application_status AS "status" FROM student s`
    const metricsParams = []
    let metricsWhere = ''
    if (userRole === 'dean') {
      metricsParams.push(userCampus || '')
      metricsWhere = ` WHERE LOWER(s.campus) = LOWER($1)`
    }
    const metricsRes = await client.query(metricsBaseQuery + metricsWhere, metricsParams)
    const allStudents = metricsRes.rows

    const metrics = {
      total: allStudents.length,
      approved: allStudents.filter((s) => s.status === 'approved').length,
      pending: allStudents.filter((s) => s.status !== 'approved' && s.status !== 'rejected').length,
      rejected: allStudents.filter((s) => s.status === 'rejected').length,
      byCampus: {},
      byDepartment: {},
      byAcademicYear: {},
    }

    allStudents.forEach((s) => {
      const c = s.campus || 'Main Campus'
      const d = s.department || 'General'
      const y = s.academicYear || '2023/2024'

      if (!metrics.byCampus[c]) metrics.byCampus[c] = { total: 0, approved: 0, pending: 0, rejected: 0 }
      if (!metrics.byDepartment[d]) metrics.byDepartment[d] = { total: 0, approved: 0, pending: 0, rejected: 0 }
      if (!metrics.byAcademicYear[y]) metrics.byAcademicYear[y] = { total: 0, approved: 0, pending: 0, rejected: 0 }

      metrics.byCampus[c].total++
      metrics.byDepartment[d].total++
      metrics.byAcademicYear[y].total++

      if (s.status === 'approved') {
        metrics.byCampus[c].approved++
        metrics.byDepartment[d].approved++
        metrics.byAcademicYear[y].approved++
      } else if (s.status === 'rejected') {
        metrics.byCampus[c].rejected++
        metrics.byDepartment[d].rejected++
        metrics.byAcademicYear[y].rejected++
      } else {
        metrics.byCampus[c].pending++
        metrics.byDepartment[d].pending++
        metrics.byAcademicYear[y].pending++
      }
    })

    // 4. Fetch list of distinct campuses and departments
    const campusRes = await client.query('SELECT name FROM campus ORDER BY name ASC')
    const deptsRes = await client.query('SELECT DISTINCT department FROM student WHERE department IS NOT NULL ORDER BY department ASC')
    const yearsRes = await client.query('SELECT year FROM academic_year ORDER BY year DESC')

    // 5. Fetch recent report history
    let historyQuery = `
      SELECT 
        id, 
        report_type AS "reportType", 
        creator_username AS "creatorUsername", 
        creator_role AS "creatorRole", 
        campus_scope AS "campusScope", 
        parameters, 
        file_format AS "fileFormat", 
        record_count AS "recordCount", 
        status, 
        created_at AS "createdAt"
      FROM report_history
      WHERE 1=1
    `
    const historyParams = []
    if (userRole === 'dean') {
      historyParams.push(userCampus || '')
      historyQuery += ` AND (campus_scope IS NULL OR LOWER(campus_scope) = LOWER($1))`
    }
    historyQuery += ` ORDER BY created_at DESC LIMIT 10`
    const historyRes = await client.query(historyQuery, historyParams)

    return res.status(200).json({
      students: dataRes.rows,
      pagination: {
        totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum) || 1,
      },
      metrics,
      campuses: campusRes.rows.map((c) => c.name),
      departments: deptsRes.rows.map((d) => d.department),
      academicYears: yearsRes.rows.map((y) => y.year),
      reportHistory: historyRes.rows,
    })
  } catch (error) {
    console.error('Error fetching reports data:', error)
    return res.status(500).json({ message: 'Error fetching reports data' })
  } finally {
    client.release()
  }
}
