#!/usr/bin/env node
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const backendDir = path.resolve(__dirname, '..')
dotenv.config({ path: path.join(backendDir, '.env'), override: true })

let APP_URL = process.env.DATABASE_URL || 'postgresql://postgres:allah123@localhost:5432/dilla_university'
if (APP_URL.startsWith('postgresql://postgres@localhost') || APP_URL.startsWith('postgresql://postgres:5432')) {
  APP_URL = APP_URL.replace('postgresql://postgres@', 'postgresql://postgres:allah123@')
}

const { Client } = await import('pg')
const client = new Client({ connectionString: APP_URL })
const BASE_URL = process.env.API_URL || 'http://localhost:3000'

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`)
    passed++
  } else {
    console.error(`  ✗ FAIL: ${message}`)
    failed++
  }
}

async function apiRequest(endpoint, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const options = { method, headers }
  if (body) options.body = JSON.stringify(body)
  const res = await fetch(`${BASE_URL}${endpoint}`, options)
  let data = null
  try {
    data = await res.json()
  } catch {
    // binary/non-JSON response
  }
  return { status: res.status, ok: res.ok, data, headers: res.headers }
}

const stamp = Date.now().toString().slice(-7)
const id1 = `IMP-TEST-${stamp}-1`
const id2 = `IMP-TEST-${stamp}-2`
const reg1 = `REG-IMP-${stamp}-1`

const csvContent =
  '\uFEFF' +
  [
    'student_name,student_id,registrar_id,gender,campus,department,program,year_of_study,academic_year,phone,email,is_non_cafeteria',
    `"Test, Complete",${id1},${reg1},Female,Odaya Campus,Information Technology,Regular,2,2024/2025,0911000001,${id1.toLowerCase()}@test.local,false`,
    `Test Incomplete,${id2},,,,,,,,,,`,
  ].join('\r\n')
const fileBase64 = Buffer.from(csvContent, 'utf8').toString('base64')

async function cleanup() {
  await client.query('DELETE FROM student_custom_value WHERE student_id = ANY($1)', [[id1, id2]])
  await client.query('DELETE FROM document_metadata WHERE student_id = ANY($1)', [[id1, id2]])
  await client.query('DELETE FROM student WHERE student_id = ANY($1)', [[id1, id2]])
  await client.query('DELETE FROM app_user WHERE LOWER(username) = ANY($1)', [[id1.toLowerCase(), id2.toLowerCase()]])
}

async function run() {
  console.log('======================================================================')
  console.log('     DILLA UNIVERSITY - STUDENT IMPORT / EXPORT VERIFICATION          ')
  console.log('======================================================================\n')

  await client.connect()
  await cleanup()

  const adminLogin = await apiRequest('/api/auth/login', 'POST', { username: 'admin', password: 'Admin@Dilla2026!' })
  assert(adminLogin.ok && adminLogin.data?.token, 'Super Admin authenticated successfully')
  const adminToken = adminLogin.data?.token

  // Templates
  console.log('\nTEST SUITE 1: Import Templates')
  const csvTpl = await fetch(`${BASE_URL}/api/students/import?format=csv`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  })
  const csvTplText = await csvTpl.text()
  assert(csvTpl.status === 200, 'CSV template endpoint returns HTTP 200')
  assert(csvTplText.includes('student_name') && csvTplText.includes('student_id'), 'CSV template contains mandatory columns')

  const xlsxTpl = await fetch(`${BASE_URL}/api/students/import/template?format=xlsx`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  })
  const xlsxBuf = Buffer.from(await xlsxTpl.arrayBuffer())
  assert(xlsxTpl.status === 200, 'XLSX template endpoint returns HTTP 200')
  assert(xlsxBuf.length > 100, 'XLSX template has content')

  // Missing mandatory columns
  console.log('\nTEST SUITE 2: Validation')
  const badCsv = Buffer.from('full_name,gender\nNo Id Person,Male\n', 'utf8').toString('base64')
  const badRes = await apiRequest('/api/students/import', 'POST', { fileBase64: badCsv, fileName: 'bad.csv', dryRun: true }, adminToken)
  assert(badRes.status === 400, 'Import rejects files missing student_id (HTTP 400)')
  assert(Array.isArray(badRes.data?.missingColumns) && badRes.data.missingColumns.includes('student_id'), 'Response lists missing student_id column')

  const badExt = await apiRequest('/api/students/import', 'POST', { fileBase64, fileName: 'students.pdf', dryRun: true }, adminToken)
  assert(badExt.status === 400, 'Import rejects unsupported file extension (HTTP 400)')

  // Dry-run preview
  console.log('\nTEST SUITE 3: Preview (Dry Run)')
  const preview = await apiRequest('/api/students/import', 'POST', { fileBase64, fileName: 'students.csv', dryRun: true }, adminToken)
  assert(preview.ok, 'Preview request succeeds (HTTP 200)')
  assert(preview.data?.dryRun === true, 'Preview response is flagged as dry run')
  assert(preview.data?.summary?.totalRecords === 2, 'Preview counts 2 total rows')
  assert(preview.data?.summary?.newRecords === 2, 'Preview identifies 2 new records')
  assert(preview.data?.summary?.profileIncompleteRecords === 1, 'Preview flags 1 incomplete profile')
  assert(preview.data?.new?.some((r) => r.student_id === id1 && r.student_name === 'Test, Complete'), 'Quoted CSV name containing a comma parsed correctly')

  const afterPreview = await client.query('SELECT COUNT(*)::int AS n FROM student WHERE student_id = ANY($1)', [[id1, id2]])
  assert(afterPreview.rows[0].n === 0, 'Dry run does not write student rows to PostgreSQL')

  // Commit
  console.log('\nTEST SUITE 4: Commit Import')
  const commit = await apiRequest('/api/students/import', 'POST', { fileBase64, fileName: 'students.csv', dryRun: false }, adminToken)
  assert(commit.ok, 'Commit request succeeds (HTTP 200)')
  assert(commit.data?.summary?.importedRecords === 2, 'Summary reports 2 imported records')

  const dbRows = await client.query('SELECT student_id, full_name, registrar_id, profile_complete, is_non_cafeteria FROM student WHERE student_id = ANY($1) ORDER BY student_id', [[id1, id2]])
  assert(dbRows.rows.length === 2, 'Both imported students persisted in PostgreSQL')
  const complete = dbRows.rows.find((r) => r.student_id === id1)
  const incomplete = dbRows.rows.find((r) => r.student_id === id2)
  assert(complete?.registrar_id === reg1, 'registrar_id persisted for complete row')
  assert(complete?.profile_complete === true, 'Complete row marked profile_complete=true')
  assert(incomplete?.profile_complete === false, 'Sparse row saved but marked profile_complete=false')

  const loginRes = await apiRequest('/api/auth/login', 'POST', { username: id1, password: 'Student@Dilla2026!' })
  assert(loginRes.ok && loginRes.data?.token, 'Imported student can log in with the default password (password hash valid)')

  // Re-import duplicate protection
  console.log('\nTEST SUITE 5: Re-import Duplicate Protection')
  const reimport = await apiRequest('/api/students/import', 'POST', { fileBase64, fileName: 'students.csv', dryRun: false }, adminToken)
  assert(reimport.ok, 'Re-import completes (HTTP 200)')
  assert(reimport.data?.summary?.newRecords === 0, 'Re-import creates 0 new records')
  assert(reimport.data?.summary?.duplicateRecords === 2, 'Re-import reports both rows as duplicates')

  const countAfter = await client.query('SELECT COUNT(*)::int AS n FROM student WHERE student_id = ANY($1)', [[id1, id2]])
  assert(countAfter.rows[0].n === 2, 'Re-import did not duplicate or overwrite existing records')

  // Export
  console.log('\nTEST SUITE 6: Student Export')
  const exportCsv = await fetch(`${BASE_URL}/api/reports/export?format=csv&campus=Main%20Campus`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  })
  const exportText = await exportCsv.text()
  assert(exportCsv.status === 200, 'CSV export returns HTTP 200')
  assert(exportText.includes('Student ID') && exportText.includes('Full Name'), 'CSV export contains expected headers')

  const exportXlsx = await fetch(`${BASE_URL}/api/reports/export?format=xlsx`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  })
  const exportXlsxBuf = Buffer.from(await exportXlsx.arrayBuffer())
  assert(exportXlsx.status === 200, 'XLSX export returns HTTP 200')
  assert(String(exportXlsx.headers.get('content-type')).includes('spreadsheetml'), 'XLSX export has spreadsheet content type')
  assert(exportXlsxBuf.length > 1000, 'XLSX export has content')

  // Delete All Students safeguards
  console.log('\nTEST SUITE 7: Delete All Students Safeguards')
  const noConfirm = await apiRequest('/api/students/delete-all', 'POST', {}, adminToken)
  assert(noConfirm.status === 400, 'Delete All Students requires explicit confirmation (HTTP 400)')

  const countBefore = await client.query('SELECT COUNT(*)::int AS n FROM student WHERE COALESCE(is_archived,false)=false')
  const dryDelete = await apiRequest('/api/students/delete-all', 'POST', { dryRun: true, confirm: true }, adminToken)
  assert(dryDelete.ok && dryDelete.data?.dryRun === true, 'Delete All Students dry run succeeds')
  assert(typeof dryDelete.data?.wouldArchive === 'number', 'Dry run reports how many students would be archived')
  const countAfterDry = await client.query('SELECT COUNT(*)::int AS n FROM student WHERE COALESCE(is_archived,false)=false')
  assert(countBefore.rows[0].n === countAfterDry.rows[0].n, 'Delete All Students dry run archives nothing')

  const countEndpoint = await apiRequest('/api/students/delete-all', 'GET', null, adminToken)
  assert(countEndpoint.ok && typeof countEndpoint.data?.activeStudentCount === 'number', 'Delete All Students count endpoint works')

  await cleanup()
  await client.end()

  console.log('\n======================================================================')
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`)
  console.log('======================================================================')

  if (failed > 0) process.exit(1)
}

run().catch(async (err) => {
  console.error('Test execution error:', err)
  try { await cleanup() } catch {}
  try { await client.end() } catch {}
  process.exit(1)
})
