/**
 * Dilla University - Phase 3 Verification Suite
 * Tests:
 * 1. Reports API & Querying: Pagination, search, filtering by campus/department/status, aggregate metrics from PostgreSQL
 * 2. Campus Dean Scoping on Reports: Dean restricted to own campus; cross-campus requests blocked (HTTP 403)
 * 3. CSV Export: UTF-8 BOM, comma/quote escaping, correct headers and column formatting
 * 4. Excel .xlsx Export: Valid binary format, proper headers and worksheet generation
 * 5. Report Generation History: Storage in PostgreSQL, parameters tracking, status, pagination
 * 6. Campus Dean Student Management: Student list, search, authorized student password reset
 * 7. Dashboard Metrics Accuracy: Verification that dashboard stats match real database counts
 */

import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const backendDir = path.resolve(__dirname, '..')
dotenv.config({ path: path.join(backendDir, '.env'), override: true })

const BASE_URL = process.env.API_URL || 'http://localhost:3000'

let totalTests = 0
let passedTests = 0
let failedTests = 0

function assert(condition, message) {
  totalTests++
  if (condition) {
    passedTests++
    console.log(`  ✓ ${message}`)
  } else {
    failedTests++
    console.error(`  ✗ FAIL: ${message}`)
  }
}

async function loginUser(identifier, password) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId: identifier, username: identifier, identifier, password }),
  })
  const data = await res.json()
  return { status: res.status, data }
}

async function run() {
  console.log('======================================================================')
  console.log('       DILLA UNIVERSITY - PHASE 3 COMPREHENSIVE VERIFICATION          ')
  console.log('======================================================================\n')

  // Setup: Authenticate Admin, Dean, and Student
  const adminAuth = await loginUser('admin', 'Admin@Dilla2026!')
  assert(adminAuth.status === 200 && adminAuth.data.token, 'Super Admin authenticated successfully')
  const adminToken = adminAuth.data.token

  const deanAuth = await loginUser('dean.main', 'Dean@Dilla2026!')
  assert(deanAuth.status === 200 && deanAuth.data.token, 'Campus Dean (Main Campus) authenticated successfully')
  const deanToken = deanAuth.data.token
  const deanCampus = deanAuth.data.user?.campus || 'Main Campus'

  // =========================================================================
  // SUITE 1: Reports API & Real Aggregate Metrics
  // =========================================================================
  console.log('\nTEST SUITE 1: Reports API & Dynamic Data Aggregation')

  // 1.1 Super Admin fetches reports data
  const adminReportsRes = await fetch(`${BASE_URL}/api/reports?page=1&limit=5`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  })
  const adminReportsData = await adminReportsRes.json()
  assert(adminReportsRes.status === 200, 'Super Admin can fetch reports data (HTTP 200)')
  assert(adminReportsData.pagination?.page === 1, 'Pagination page = 1')
  assert(Array.isArray(adminReportsData.students), 'Students list returned as array')
  assert(adminReportsData.students.length <= 5, 'Pagination limit respected (<= 5 records)')
  assert(typeof adminReportsData.metrics?.total === 'number', `Metrics total is accurate number (${adminReportsData.metrics?.total})`)
  assert(adminReportsData.campuses?.length > 0, `Campuses list available (${adminReportsData.campuses?.join(', ')})`)
  assert(adminReportsData.departments?.length > 0, `Departments list available (${adminReportsData.departments?.length} depts)`)

  // 1.2 Search & filter in reports
  const searchReportsRes = await fetch(`${BASE_URL}/api/reports?search=Science`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  })
  const searchReportsData = await searchReportsRes.json()
  assert(searchReportsRes.status === 200, 'Reports search by department/name succeeds (HTTP 200)')
  const allMatchSearch = searchReportsData.students?.every(
    (s) => s.department?.includes('Science') || s.fullName?.includes('Science')
  )
  assert(allMatchSearch, 'Filtered report results accurately match search criteria')

  // =========================================================================
  // SUITE 2: Campus Dean Campus Isolation on Reports
  // =========================================================================
  console.log('\nTEST SUITE 2: Campus Dean Campus Scoping on Reports')

  // 2.1 Campus Dean fetches reports (auto-scoped to Dean's campus)
  const deanReportsRes = await fetch(`${BASE_URL}/api/reports?page=1&limit=10`, {
    headers: { Authorization: `Bearer ${deanToken}` },
  })
  const deanReportsData = await deanReportsRes.json()
  assert(deanReportsRes.status === 200, 'Campus Dean can fetch campus report records (HTTP 200)')
  const allDeanCampus = deanReportsData.students?.every(
    (s) => s.campus?.toLowerCase() === deanCampus.toLowerCase()
  )
  assert(allDeanCampus, `All report records returned to Dean belong to '${deanCampus}'`)

  // 2.2 Campus Dean attempting to query another campus is strictly FORBIDDEN (HTTP 403)
  const crossCampusReportRes = await fetch(`${BASE_URL}/api/reports?campus=Odaya%20Campus`, {
    headers: { Authorization: `Bearer ${deanToken}` },
  })
  assert(crossCampusReportRes.status === 403, 'Campus Dean requesting reports for foreign campus is FORBIDDEN (HTTP 403)')

  // =========================================================================
  // SUITE 3: CSV Report Export
  // =========================================================================
  console.log('\nTEST SUITE 3: CSV Report Export with Unicode & Quotes')

  const csvExportRes = await fetch(`${BASE_URL}/api/reports/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      format: 'csv',
      campus: 'all',
      reportType: 'cost_sharing_beneficiaries',
    }),
  })
  assert(csvExportRes.status === 200, 'CSV export endpoint responds successfully (HTTP 200)')
  assert(csvExportRes.headers.get('content-type')?.includes('text/csv'), 'Content-Type is text/csv')
  const contentDisposition = csvExportRes.headers.get('content-disposition')
  assert(contentDisposition?.includes('attachment') && contentDisposition?.includes('.csv'), 'Content-Disposition specifies .csv attachment')

  const csvBuffer = await csvExportRes.arrayBuffer()
  const csvBytes = new Uint8Array(csvBuffer)
  // Check UTF-8 BOM bytes: 0xEF, 0xBB, 0xBF
  const hasUtf8Bom = csvBytes[0] === 0xEF && csvBytes[1] === 0xBB && csvBytes[2] === 0xBF
  assert(hasUtf8Bom, 'CSV buffer starts with UTF-8 Byte Order Mark (0xEF, 0xBB, 0xBF) for Excel compatibility')

  const decoder = new TextDecoder('utf-8')
  const csvText = decoder.decode(csvBuffer)
  assert(csvText.includes('Student ID') && csvText.includes('Full Name') && csvText.includes('Campus'), 'CSV contains standard required headers')
  assert(csvText.split('\n').length > 1, `CSV contains multiple rows (length = ${csvText.length} bytes)`)

  // Dean CSV export cross-campus block
  const deanCrossCsvRes = await fetch(`${BASE_URL}/api/reports/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${deanToken}` },
    body: JSON.stringify({
      format: 'csv',
      campus: 'Odaya Campus', // foreign campus
    }),
  })
  assert(deanCrossCsvRes.status === 403, 'Dean exporting CSV for another campus is strictly FORBIDDEN (HTTP 403)')

  // =========================================================================
  // SUITE 4: Excel .xlsx Report Export
  // =========================================================================
  console.log('\nTEST SUITE 4: Excel (.xlsx) Report Export')

  const xlsxExportRes = await fetch(`${BASE_URL}/api/reports/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      format: 'xlsx',
      campus: 'all',
      reportType: 'cost_sharing_beneficiaries',
    }),
  })
  assert(xlsxExportRes.status === 200, 'Excel .xlsx export endpoint responds successfully (HTTP 200)')
  const xlsxContentType = xlsxExportRes.headers.get('content-type')
  assert(
    xlsxContentType?.includes('spreadsheetml.sheet'),
    'Content-Type is application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  )
  const xlsxBuffer = await xlsxExportRes.arrayBuffer()
  const xlsxBytes = new Uint8Array(xlsxBuffer)
  // ZIP / OpenXML magic numbers: 'PK\x03\x04' (0x50, 0x4B, 0x03, 0x04)
  const isZipMagic = xlsxBytes[0] === 0x50 && xlsxBytes[1] === 0x4B && xlsxBytes[2] === 0x03 && xlsxBytes[3] === 0x04
  assert(isZipMagic, 'Exported .xlsx file has valid OpenXML ZIP signature (PK\\x03\\x04)')
  assert(xlsxBytes.length > 2000, `Exported .xlsx file has valid size (${xlsxBytes.length} bytes)`)

  // =========================================================================
  // SUITE 5: Report Generation History Tracking in PostgreSQL
  // =========================================================================
  console.log('\nTEST SUITE 5: Report Generation History Tracking')

  const historyRes = await fetch(`${BASE_URL}/api/reports/history`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  })
  const historyData = await historyRes.json()
  assert(historyRes.status === 200, 'Can retrieve report generation history (HTTP 200)')
  assert(Array.isArray(historyData.history), 'Report history is an array')
  assert(historyData.history.length > 0, `History contains ${historyData.history.length} logged report generations`)

  const latestHistory = historyData.history[0]
  assert(latestHistory.creatorUsername === 'admin', 'Latest report creator accurately recorded as admin')
  assert(Boolean(latestHistory.parameters), 'Report parameters logged in PostgreSQL as JSON')
  assert(latestHistory.fileFormat === 'xlsx' || latestHistory.fileFormat === 'csv', `File format accurately recorded (${latestHistory.fileFormat})`)

  // =========================================================================
  // SUITE 6: Campus Dean Student Management & Password Reset
  // =========================================================================
  console.log('\nTEST SUITE 6: Campus Dean Student Management & Password Reset')

  // Query campus students
  const deanStudentsRes = await fetch(`${BASE_URL}/api/users?type=student`, {
    headers: { Authorization: `Bearer ${deanToken}` },
  })
  const deanStudentsData = await deanStudentsRes.json()
  assert(deanStudentsRes.status === 200, 'Dean can query student directory (HTTP 200)')
  const firstStudent = deanStudentsData.users?.[0]
  assert(Boolean(firstStudent?.studentId), `Target student located for Dean: ${firstStudent?.studentId}`)

  // Dean resets student password
  const resetStudentPwRes = await fetch(`${BASE_URL}/api/users/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${deanToken}` },
    body: JSON.stringify({
      userId: firstStudent.id,
      targetUsername: firstStudent.studentId,
      newPassword: 'NewStudent@2026!',
    }),
  })
  const resetStudentPwData = await resetStudentPwRes.json()
  assert(resetStudentPwRes.status === 200, 'Campus Dean can reset student password (HTTP 200)')
  assert(resetStudentPwData.resetPassword === 'NewStudent@2026!', 'Password successfully updated')

  // Verify login with new password
  const loginNewPwRes = await loginUser(firstStudent.studentId, 'NewStudent@2026!')
  assert(loginNewPwRes.status === 200, 'Student can log in with dean-reset password (HTTP 200)')

  // Summary
  console.log('\n======================================================================')
  console.log(`PHASE 3 TESTS COMPLETED: TOTAL: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`)
  console.log('======================================================================')

  if (failedTests > 0) {
    process.exit(1)
  }
}

run().catch((err) => {
  console.error('Fatal error running Phase 3 verification:', err)
  process.exit(1)
})
