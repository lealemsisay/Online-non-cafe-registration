import { pool } from '@/drizzle/client'
import { authorize, setCorsHeaders } from '@/lib/auth'
import * as XLSX from 'xlsx'

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return

  // Accessible only by Super Admin and Campus Dean
  const auth = authorize(req, ['admin', 'dean'])
  if (auth.error) return res.status(auth.status).json({ message: auth.error })

  const user = auth.user
  const userRole = user.role
  const userCampus = user.campus

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const client = await pool.connect()
  try {
    const paramsSource = req.method === 'POST' ? req.body || {} : req.query || {}
    const {
      format = 'csv',
      campus = '',
      department = '',
      academicYear = '',
      status = '',
      search = '',
      reportType = 'cost_sharing_beneficiaries',
    } = paramsSource

    // Normalize format
    const cleanFormat = (format || 'csv').toLowerCase() === 'xlsx' ? 'xlsx' : 'csv'

    // Campus restriction enforcement
    let effectiveCampus = null
    if (userRole === 'dean') {
      if (campus && campus.trim().toLowerCase() !== (userCampus || '').toLowerCase()) {
        return res.status(403).json({
          message: `Forbidden: Campus Deans are strictly restricted to '${userCampus}'. Cannot export reports for '${campus}'.`,
        })
      }
      effectiveCampus = userCampus
    } else if (campus && campus !== 'all') {
      effectiveCampus = campus.trim()
    }

    // Build query conditions
    const conditions = ['1=1']
    const queryParams = []

    if (effectiveCampus) {
      queryParams.push(effectiveCampus)
      conditions.push(`LOWER(s.campus) = LOWER($${queryParams.length})`)
    }

    if (department && department !== 'all') {
      queryParams.push(department.trim())
      conditions.push(`LOWER(s.department) = LOWER($${queryParams.length})`)
    }

    if (academicYear && academicYear !== 'all') {
      queryParams.push(academicYear.trim())
      conditions.push(`s.academic_year = $${queryParams.length}`)
    }

    if (status && status !== 'all') {
      queryParams.push(status.trim())
      conditions.push(`LOWER(s.application_status) = LOWER($${queryParams.length})`)
    }

    if (search && search.trim()) {
      queryParams.push(`%${search.trim().toLowerCase()}%`)
      conditions.push(`(
        LOWER(s.full_name) LIKE $${queryParams.length} 
        OR LOWER(s.student_id) LIKE $${queryParams.length} 
        OR LOWER(COALESCE(s.department, '')) LIKE $${queryParams.length} 
        OR LOWER(COALESCE(s.email, '')) LIKE $${queryParams.length}
      )`)
    }

    const whereClause = conditions.join(' AND ')

    // Fetch all matching records for the report
    const query = `
      SELECT 
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
        s.created_at AS "createdAt"
      FROM student s
      WHERE ${whereClause}
      ORDER BY s.campus ASC, s.department ASC, s.created_at DESC
    `
    const result = await client.query(query, queryParams)
    const records = result.rows

    // Helper for formatting status
    const formatStatus = (st) => {
      if (!st) return 'Pending'
      if (st === 'super-admin-review') return 'Super Admin Review'
      if (st === 'dean-review') return 'Campus Dean Review'
      if (st === 'return-for-correction') return 'Returned for Correction'
      return st.charAt(0).toUpperCase() + st.slice(1)
    }

    // Format rows for export
    const exportData = records.map((r, idx) => ({
      'No.': idx + 1,
      'Student ID': r.studentId || '',
      'Full Name': r.fullName || '',
      'Gender': r.gender || 'Not specified',
      'Campus': r.campus || '',
      'Department': r.department || '',
      'Program': r.program || 'Regular',
      'Year of Study': r.yearOfStudy ? `Year ${r.yearOfStudy}` : '',
      'Academic Year': r.academicYear || '',
      'Cost-Sharing Status': formatStatus(r.applicationStatus),
      'Cafeteria Beneficiary': r.isNonCafeteria ? 'Non-Cafeteria' : 'Cafeteria',
      'Contact Phone': r.phone || '',
      'Email Address': r.email || '',
      'Registration Date': r.createdAt ? new Date(r.createdAt).toISOString().replace('T', ' ').slice(0, 19) : '',
    }))

    // Save report-generation history into PostgreSQL
    const historyParams = {
      campus: effectiveCampus || 'All Campuses',
      department: department || 'All Departments',
      academicYear: academicYear || 'All Academic Years',
      status: status || 'All Statuses',
      search: search || '',
      format: cleanFormat,
    }

    await client.query(
      `INSERT INTO report_history (
         report_type, creator_username, creator_role, campus_scope, parameters, file_format, record_count, status, created_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed', NOW())`,
      [
        reportType,
        user.username || user.name || 'user',
        userRole,
        effectiveCampus,
        JSON.stringify(historyParams),
        cleanFormat,
        records.length,
      ]
    )

    const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const campusTag = (effectiveCampus || 'All_Campuses').replace(/[^a-zA-Z0-9]/g, '_')

    // Handle XLSX Export
    if (cleanFormat === 'xlsx') {
      const ws = XLSX.utils.json_to_sheet(exportData)

      // Set column widths
      ws['!cols'] = [
        { wch: 6 },  // No.
        { wch: 16 }, // Student ID
        { wch: 28 }, // Full Name
        { wch: 10 }, // Gender
        { wch: 18 }, // Campus
        { wch: 26 }, // Department
        { wch: 12 }, // Program
        { wch: 14 }, // Year of Study
        { wch: 14 }, // Academic Year
        { wch: 22 }, // Cost-Sharing Status
        { wch: 20 }, // Cafeteria Beneficiary
        { wch: 16 }, // Contact Phone
        { wch: 28 }, // Email Address
        { wch: 20 }, // Registration Date
      ]

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Cost-Sharing Beneficiaries')

      const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
      const filename = `Dilla_University_Cost_Sharing_Report_${campusTag}_${dateStamp}.xlsx`

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      res.setHeader('Content-Length', xlsxBuffer.length)
      return res.status(200).send(xlsxBuffer)
    }

    // Handle CSV Export with UTF-8 BOM and proper RFC 4180 escaping
    const headers = [
      'No.',
      'Student ID',
      'Full Name',
      'Gender',
      'Campus',
      'Department',
      'Program',
      'Year of Study',
      'Academic Year',
      'Cost-Sharing Status',
      'Cafeteria Beneficiary',
      'Contact Phone',
      'Email Address',
      'Registration Date',
    ]

    const escapeCsvField = (field) => {
      if (field === null || field === undefined) return '""'
      const str = String(field)
      // If field contains comma, quote, newline, or carriage return, enclose in quotes and escape internal quotes
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return `"${str}"`
    }

    const csvRows = [headers.map(escapeCsvField).join(',')]

    exportData.forEach((row) => {
      const rowValues = [
        row['No.'],
        row['Student ID'],
        row['Full Name'],
        row['Gender'],
        row['Campus'],
        row['Department'],
        row['Program'],
        row['Year of Study'],
        row['Academic Year'],
        row['Cost-Sharing Status'],
        row['Cafeteria Beneficiary'],
        row['Contact Phone'],
        row['Email Address'],
        row['Registration Date'],
      ]
      csvRows.push(rowValues.map(escapeCsvField).join(','))
    })

    // Prepend UTF-8 Byte Order Mark (\uFEFF) for Microsoft Excel compatibility
    const csvContent = '\uFEFF' + csvRows.join('\r\n')
    const filename = `Dilla_University_Cost_Sharing_Report_${campusTag}_${dateStamp}.csv`
    const csvBuffer = Buffer.from(csvContent, 'utf8')

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Length', csvBuffer.length)
    return res.status(200).send(csvBuffer)
  } catch (error) {
    console.error('Error exporting report:', error)
    return res.status(500).json({ message: 'Error exporting report', detail: error.message })
  } finally {
    client.release()
  }
}
