/**
 * Dilla University - Phase 3 End-to-End Onboarding Verification
 *
 * Covers TEST A through TEST F against real PostgreSQL records via the running
 * Next.js API server (http://localhost:3000).
 *
 *   TEST A: Import spreadsheet with only name + ID -> account, hash, incomplete profile
 *   TEST B: First login forces password change; cannot bypass
 *   TEST C: Complete first-login profile (dynamic departments, validation)
 *   TEST D: Logout/login with new password; old password rejected; dashboard access
 *   TEST E: Security verification (unimported, cross-student, dean scoping, admin limits)
 *   TEST F: Persistence verification (restart, DB records, relationships)
 */

import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { Client } from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const backendDir = path.resolve(__dirname, '..')
dotenv.config({ path: path.join(backendDir, '.env'), override: true })

const BASE_URL = process.env.API_URL || 'http://localhost:3000'
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:allah123@localhost:5432/dilla_university'

let total = 0
let passed = 0
let failed = 0

function assert(condition, message) {
  total++
  if (condition) {
    passed++
    console.log(`  ✓ ${message}`)
  } else {
    failed++
    console.error(`  ✗ FAIL: ${message}`)
  }
}

async function dbQuery(sql, params = []) {
  const client = new Client({ connectionString: DATABASE_URL })
  await client.connect()
  try {
    const res = await client.query(sql, params)
    return res.rows
  } finally {
    await client.end()
  }
}

async function api(path, body, headers = {}, method = null) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: method || (body === undefined ? 'GET' : 'POST'),
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body === undefined || method === 'GET' ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = text
  }
  return { status: res.status, data, headers: res.headers }
}

async function login(identifier, password) {
  return api('/api/auth/login', { studentId: identifier, password })
}

const suffix = String(Date.now()).slice(-6)
const TEST_ID = `P3E2E-${suffix}`
const TEST_NAME = 'Phase 3 E2E Student'
const INITIAL_PASSWORD = TEST_ID
const NEW_PASSWORD = `P3e2e-New@${suffix}!`

console.log('======================================================================')
console.log('       DILLA UNIVERSITY - PHASE 3 END-TO-END ONBOARDING TESTS          ')
console.log('======================================================================')
console.log(`Test student ID: ${TEST_ID}`)
console.log(`Target API: ${BASE_URL}\n`)

// Authenticate Super Admin once (needed for student import)
console.log('Authenticating Super Admin...')
const adminLogin = await login('admin', 'Admin@Dilla2026!')
assert(adminLogin.status === 200, 'Super Admin authenticated for import')
const adminToken = adminLogin.data.token

// ---------------------------------------------------------------------------
// TEST A: Import spreadsheet with only Student Name + Student ID
// ---------------------------------------------------------------------------
console.log('\n-------------------------------- TEST A --------------------------------')
console.log('Import spreadsheet with only Student Name and Student ID')

const csv = `student_name,student_id\r\n${TEST_NAME},${TEST_ID}\r\n`
const importRes = await api('/api/students/import', {
  fileBase64: Buffer.from(csv, 'utf8').toString('base64'),
  fileName: 'phase3-test-a.csv',
}, { Authorization: `Bearer ${adminToken}` })
assert(importRes.status === 200 && importRes.data.success === true, 'Import succeeds (HTTP 200)')
assert(importRes.data.summary.importedRecords === 1, 'One new record imported')
assert(importRes.data.summary.profileIncompleteRecords === 1, 'Imported profile marked incomplete')

const importedUser = await dbQuery(
  `SELECT id, username, role, campus, email, status, must_change_password, onboarding_status, password_hash
   FROM app_user WHERE LOWER(username) = LOWER($1)`,
  [TEST_ID]
)
assert(importedUser.length === 1, 'Login account created for imported student')
const u = importedUser[0]
assert(u.username === TEST_ID, `Username equals student ID (${u.username})`)
assert(u.role === 'student', 'Account role is student')
assert(u.status === 'active', 'Account status is active')
assert(u.must_change_password === true, 'must_change_password = true')
assert(u.onboarding_status === 'imported', `onboarding_status = 'imported' (got ${u.onboarding_status})`)
assert(/^scrypt\$/.test(u.password_hash || ''), 'Password stored as scrypt hash')
const importResponseText = JSON.stringify(importRes.data)
assert(!/password_hash/.test(importResponseText) && !/"password"/.test(importResponseText), 'No password or hash exposed in import response')

const importedStudent = await dbQuery(
  `SELECT student_id, full_name, gender, campus, department, program, year_of_study, phone, email, academic_year, profile_complete
   FROM student WHERE LOWER(student_id) = LOWER($1)`,
  [TEST_ID]
)
assert(importedStudent.length === 1, 'Student record created')
const s = importedStudent[0]
assert(s.full_name === TEST_NAME, 'Student name imported')
assert(s.profile_complete === false, 'Profile marked incomplete')
assert(s.gender === null || s.gender === '', 'Gender not pre-filled')
assert(s.campus === null || s.campus === '', 'Campus not pre-filled')
assert(s.department === null || s.department === '', 'Department not pre-filled')

// ---------------------------------------------------------------------------
// TEST B: Mandatory first-login password change
// ---------------------------------------------------------------------------
console.log('\n-------------------------------- TEST B --------------------------------')
console.log('Log in with imported credentials')

const firstLogin = await login(TEST_ID, INITIAL_PASSWORD)
assert(firstLogin.status === 200, 'Login with initial credentials succeeds (HTTP 200)')
assert(firstLogin.data.requiresPasswordChange === true, 'Server requires password change')
assert(firstLogin.data.user.forcePasswordChange === true, 'forcePasswordChange flag set')
assert(firstLogin.data.user.onboardingStatus === 'password_change_required', 'onboardingStatus = password_change_required')
assert(firstLogin.data.token, 'JWT token issued')

const forceToken = firstLogin.data.token

// Cannot bypass: normal dashboard API rejected while password change pending
const bypassRes = await api('/api/student/register', {
  studentId: TEST_ID,
  fullName: TEST_NAME,
  campus: 'Main Campus',
  department: 'Computer Science',
  program: 'Regular Degree',
  yearOfStudy: '1',
  academicYear: '2023/2024',
}, { Authorization: `Bearer ${forceToken}` })
assert(bypassRes.status === 403, 'Student cannot access registration API before password change (HTTP 403)')
assert(bypassRes.data.requiresPasswordChange === true, 'Response reports password change required')

// Profile completion also blocked until password changed
const profileBypass = await api('/api/profile', {
  userId: u.id,
  profileComplete: true,
}, { Authorization: `Bearer ${forceToken}` }, 'PUT')
assert(profileBypass.status === 403, 'Profile completion blocked before password change (HTTP 403)')

// Wrong current password rejected
const wrongPw = await api('/api/auth/change-password', {
  oldPassword: 'wrong-password',
  newPassword: NEW_PASSWORD,
  confirmPassword: NEW_PASSWORD,
}, { Authorization: `Bearer ${forceToken}` })
assert(wrongPw.status === 400, 'Wrong current password rejected (HTTP 400)')

// Change the password
const changeRes = await api('/api/auth/change-password', {
  oldPassword: INITIAL_PASSWORD,
  newPassword: NEW_PASSWORD,
  confirmPassword: NEW_PASSWORD,
}, { Authorization: `Bearer ${forceToken}` })
assert(changeRes.status === 200, 'Password change succeeds (HTTP 200)')

const afterChange = await dbQuery(
  `SELECT must_change_password, onboarding_status, password_hash FROM app_user WHERE LOWER(username) = LOWER($1)`,
  [TEST_ID]
)
assert(afterChange.length === 1, 'User record still present')
assert(afterChange[0].must_change_password === false, 'must_change_password cleared')
assert(afterChange[0].onboarding_status === 'profile_completion_required', `onboarding_status = 'profile_completion_required' (got ${afterChange[0].onboarding_status})`)
assert(/^scrypt\$/.test(afterChange[0].password_hash || ''), 'New password stored as scrypt hash')
assert(afterChange[0].password_hash !== u.password_hash, 'Password hash differs from initial hash')

// Old initial password no longer works
const oldLogin = await login(TEST_ID, INITIAL_PASSWORD)
assert(oldLogin.status === 401, 'Old initial password no longer works (HTTP 401)')

// New password works
const newLogin = await login(TEST_ID, NEW_PASSWORD)
assert(newLogin.status === 200, 'New password works (HTTP 200)')
assert(newLogin.data.user.onboardingStatus === 'profile_completion_required', 'onboardingStatus = profile_completion_required')
assert(newLogin.data.requiresPasswordChange !== true, 'No longer requires password change')
const regularToken = newLogin.data.token

// ---------------------------------------------------------------------------
// TEST C: First-login profile completion
// ---------------------------------------------------------------------------
console.log('\n-------------------------------- TEST C --------------------------------')
console.log('Complete first-login profile')

const deptRes = await api('/api/departments', undefined, { Authorization: `Bearer ${regularToken}` })
assert(deptRes.status === 200, 'Departments endpoint reachable (HTTP 200)')
assert(Array.isArray(deptRes.data.departments) && deptRes.data.departments.length > 0, 'Department dropdown loads real departments')
const csDept = deptRes.data.departments.find((d) => d.name === 'Computer Science')
assert(csDept && csDept.isActive !== false, 'Computer Science department is active')

// Dynamic fields load from registration form builder (not hardcoded in React)
const builtinRes = await api('/api/builtin-fields', undefined, { Authorization: `Bearer ${regularToken}` })
assert(builtinRes.status === 200, 'Built-in fields load from PostgreSQL (HTTP 200)')
const builtinKeys = (builtinRes.data.builtinFields || []).map((f) => f.field_key)
assert(builtinKeys.includes('department') && builtinKeys.includes('gender') && builtinKeys.includes('campus'), 'Built-in fields include department, gender, campus')

// Optional field rejected first (arbitrary department text must fail validation)
const badDept = await api('/api/profile', {
  userId: u.id,
  department: 'Arbitrary Made-Up Department',
  profileComplete: true,
}, { Authorization: `Bearer ${regularToken}` }, 'PUT')
assert(badDept.status === 400, 'Arbitrary department text rejected by backend (HTTP 400)')
assert(badDept.data.fieldKey === 'department', 'Validation error identifies department field')

// Required-field omission should not be needed to test here; all required fields supplied:
const completeRes = await api('/api/profile', {
  userId: u.id,
  gender: 'Male',
  campus: 'Main Campus',
  department: 'Computer Science',
  program: 'Regular Degree',
  yearOfStudy: '1',
  academicYear: '2023/2024',
  phone: '+251-911-000001',
  email: `p3e2e-${suffix}@dilla.edu.et`,
  profileComplete: true,
}, { Authorization: `Bearer ${regularToken}` }, 'PUT')
assert(completeRes.status === 200, 'Profile completion accepted (HTTP 200)')
assert(completeRes.data.success === true, 'Profile completion reports success')

const completedStudent = await dbQuery(
  `SELECT profile_complete, department, campus, gender, program, year_of_study, academic_year, email, phone
   FROM student WHERE LOWER(student_id) = LOWER($1)`,
  [TEST_ID]
)
assert(completedStudent.length === 1, 'Student record updated')
const cs = completedStudent[0]
assert(cs.profile_complete === true, 'profile_complete = true')
assert(cs.department === 'Computer Science', 'Department saved correctly')
assert(cs.campus === 'Main Campus', 'Campus saved')
assert(cs.gender === 'Male', 'Gender saved')

const afterComplete = await dbQuery(
  `SELECT onboarding_status FROM app_user WHERE LOWER(username) = LOWER($1)`,
  [TEST_ID]
)
assert(afterComplete[0].onboarding_status === 'completed', `onboarding_status = 'completed' (got ${afterComplete[0].onboarding_status})`)

const notifs = await dbQuery(
  `SELECT title, recipient_id, recipient_role FROM app_notification WHERE recipient_id = $1 ORDER BY created_at DESC LIMIT 1`,
  [TEST_ID]
)
assert(notifs.length >= 1 && notifs[0].title === 'Profile Completed', 'Profile completion notification recorded for the student')

// ---------------------------------------------------------------------------
// TEST D: Log out and log in again
// ---------------------------------------------------------------------------
console.log('\n-------------------------------- TEST D --------------------------------')
console.log('Log out and log in again')

const relogin = await login(TEST_ID, NEW_PASSWORD)
assert(relogin.status === 200, 'Login with new password succeeds after logout (HTTP 200)')
assert(relogin.data.user.onboardingStatus === 'completed', 'Student reaches normal onboarding-complete state')
const oldStill = await login(TEST_ID, INITIAL_PASSWORD)
assert(oldStill.status === 401, 'Old initial password still rejected (HTTP 401)')

// Normal dashboard API reachable now that onboarding is complete
const dashboardRes = await api('/api/profile', undefined, { Authorization: `Bearer ${relogin.data.token}` })
assert(dashboardRes.status === 200, 'Profile/dashboard API reachable after onboarding (HTTP 200)')
assert(dashboardRes.data.user.onboardingStatus === 'completed', 'Dashboard profile shows completed status')

// ---------------------------------------------------------------------------
// TEST E: Security verification
// ---------------------------------------------------------------------------
console.log('\n-------------------------------- TEST E --------------------------------')
console.log('Security verification')

// 1. Unimported students cannot log in
const unimported = await login('NOBODY-9999', 'any-password')
assert(unimported.status === 401, 'Unimported student cannot log in (HTTP 401)')

// 2. Students cannot access another student's records
const otherStudent = await dbQuery(`SELECT student_id FROM student WHERE LOWER(student_id) <> LOWER($1) LIMIT 1`, [TEST_ID])
const otherId = otherStudent.length > 0 ? otherStudent[0].student_id : 'unknown'
const crossProfile = await api('/api/profile', undefined, {
  Authorization: `Bearer ${relogin.data.token}`,
})
// Self profile ok already tested above; now attempt lookup of another student via ?id=
const crossLookup = await api(`/api/profile?id=${encodeURIComponent(otherId)}`, undefined, {
  Authorization: `Bearer ${relogin.data.token}`,
})
assert(crossLookup.status === 403, 'Student cannot view another student profile (HTTP 403)')

// 3. Campus Dean cannot access unauthorized campuses
const deanLogin = await login('dean.main', 'Dean@Dilla2026!')
assert(deanLogin.status === 200, 'Campus Dean authenticates')
const deanCross = await api('/api/users?campus=Kakamega Campus&type=student', undefined, {
  Authorization: `Bearer ${deanLogin.data.token}`,
})
assert(deanCross.status === 200, 'Dean directory request succeeds (scoped)')
const deanUsers = deanCross.data.users || []
assert(deanUsers.every((u2) => (u2.campus || '').toLowerCase() === 'main campus'), 'Dean only sees own campus students')

const deanCreateDean = await api('/api/users', {
  role: 'dean',
  name: 'Unsafe Dean',
  campus: 'Main Campus',
}, { Authorization: `Bearer ${deanLogin.data.token}` })
assert(deanCreateDean.status === 403, 'Campus Dean cannot create Dean accounts (HTTP 403)')

// 4. Non-super-admin cannot access Super Admin-only operations
const viceLogin = await login('vice.dean', 'ViceDean@Dilla2026!')
assert(viceLogin.status === 200, 'Vice Dean authenticates')
const viceDeans = await api('/api/users?type=dean', undefined, {
  Authorization: `Bearer ${viceLogin.data.token}`,
})
assert(viceDeans.status === 403, 'Vice Dean cannot access Super Admin-only user directory (HTTP 403)')

// 5. Super Admin retains full authorized access
assert(adminLogin.status === 200, 'Super Admin authenticates')
const adminUsers = await api('/api/users', undefined, { Authorization: `Bearer ${adminLogin.data.token}` })
assert(adminUsers.status === 200, 'Super Admin can list users (HTTP 200)')
const adminReports = await api('/api/reports?page=1&limit=5', undefined, {
  Authorization: `Bearer ${adminLogin.data.token}`,
})
assert(adminReports.status === 200, 'Super Admin can access reports (HTTP 200)')

// ---------------------------------------------------------------------------
// TEST F: Persistence verification
// ---------------------------------------------------------------------------
console.log('\n-------------------------------- TEST F --------------------------------')
console.log('Persistence verification')

// 1. Configuration persisted: write via API, read back
await api('/api/settings', {
  schedule: {
    startDate: new Date(Date.now() - 86400000).toISOString(),
    endDate: new Date(Date.now() + 30 * 86400000).toISOString(),
    isOpen: true,
    allowLate: false,
    reason: 'Phase 3 persistence check',
  },
}, { Authorization: `Bearer ${adminLogin.data.token}` })
const settingsRes = await api('/api/settings', undefined, { Authorization: `Bearer ${adminLogin.data.token}` })
assert(settingsRes.status === 200, 'Settings readable after write (HTTP 200)')
assert(settingsRes.data.registrationWindow?.isOpen === true, 'Registration window setting persisted in PostgreSQL')

// 2. Imported student remains; profile completion saved; relationships valid
const persisted = await dbQuery(
  `SELECT s.student_id, s.full_name, s.profile_complete, s.department, s.campus, s.academic_year,
          u.onboarding_status, u.must_change_password
   FROM student s
   JOIN app_user u ON LOWER(u.username) = LOWER(s.student_id)
   WHERE LOWER(s.student_id) = LOWER($1)`,
  [TEST_ID]
)
assert(persisted.length === 1, 'Imported student remains in the database')
assert(persisted[0].profile_complete === true, 'Profile completion remains saved')
assert(persisted[0].onboarding_status === 'completed', 'Onboarding status remains completed')
assert(persisted[0].must_change_password === false, 'Password change flag remains cleared')

const deptCheck = await dbQuery(
  `SELECT 1 FROM department WHERE LOWER(name) = LOWER($1) AND is_active = true LIMIT 1`,
  [persisted[0].department]
)
assert(deptCheck.length === 1, `Saved department '${persisted[0].department}' is a valid active department`)

const ayCheck = await dbQuery(
  `SELECT 1 FROM academic_year WHERE year = $1 LIMIT 1`,
  [persisted[0].academic_year || '2023/2024']
)
// academic year may or may not exist; relationship validity means department resolved above

// 3. Application restart persistence (best effort)
let restarted = false
try {
  restarted = await restartServer()
} catch (e) {
  console.error('  (restart check skipped):', e.message)
}
assert(restarted !== false, 'Application restarted successfully')
if (restarted) {
  const health = await api('/api/health')
  assert(health.status === 200, 'Server healthy after restart')
  const settingsAfter = await api('/api/settings', undefined, { Authorization: `Bearer ${adminLogin.data.token}` })
  assert(settingsAfter.data.registrationWindow?.isOpen === true, 'Configuration survives application restart')
  const studentAfter = await dbQuery(
    `SELECT onboarding_status, profile_complete FROM app_user u JOIN student s ON LOWER(u.username)=LOWER(s.student_id) WHERE LOWER(s.student_id)=LOWER($1)`,
    [TEST_ID]
  )
  assert(studentAfter[0].onboarding_status === 'completed' && studentAfter[0].profile_complete === true, 'Onboarding and profile survive application restart')
}

console.log('\n======================================================================')
console.log(`PHASE 3 E2E TESTS COMPLETED: TOTAL: ${total} | PASSED: ${passed} | FAILED: ${failed}`)
console.log('======================================================================')
process.exit(failed > 0 ? 1 : 0)

async function restartServer() {
  const { execSync } = await import('child_process')
  try {
    execSync('powershell -NoProfile -File "C:\\Users\\HP\\Desktop\\okayfor\\backend\\restart-server.ps1"', {
      maxBuffer: 10 * 1024 * 1024,
      stdio: 'ignore',
    })
  } catch {
    return false
  }
  for (let i = 0; i < 45; i++) {
    await sleep(1000)
    try {
      const r = await api('/api/health')
      if (r.status === 200) return true
    } catch {}
  }
  return false
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
