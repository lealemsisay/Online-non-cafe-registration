#!/usr/bin/env node
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { verifyPassword, signToken, verifyToken, authorize } from '../lib/auth.js'

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

async function run() {
  console.log('======================================================================')
  console.log('       DILLA UNIVERSITY - AUTHENTICATION & ACCESS VERIFICATION        ')
  console.log('======================================================================\n')

  await client.connect()

  // 1. Verify Database Records
  console.log('TEST SUITE 1: PostgreSQL Records & Schema Verification')
  const userRows = await client.query('SELECT username, role, full_name, email, status FROM app_user ORDER BY role')
  assert(userRows.rows.length >= 3, `Found ${userRows.rows.length} app_user records in PostgreSQL`)

  const adminUser = userRows.rows.find(u => u.role === 'admin')
  const deanUser = userRows.rows.find(u => u.role === 'dean')
  const studentUser = userRows.rows.find(u => u.role === 'student')

  assert(Boolean(adminUser), `Super Admin user exists: ${adminUser?.username}`)
  assert(Boolean(deanUser), `Campus Dean user exists: ${deanUser?.username}`)
  assert(Boolean(studentUser), `Student user exists: ${studentUser?.username}`)

  const campusRows = await client.query('SELECT count(*)::int as count FROM campus')
  assert(campusRows.rows[0].count >= 3, `Campus records exist: count=${campusRows.rows[0].count}`)

  const studentTableRows = await client.query('SELECT count(*)::int as count FROM student')
  assert(studentTableRows.rows[0].count >= 3, `Student registration records exist: count=${studentTableRows.rows[0].count}`)

  const yearRows = await client.query('SELECT count(*)::int as count FROM academic_year')
  assert(yearRows.rows[0].count >= 1, `Academic year records exist: count=${yearRows.rows[0].count}`)

  await client.end()

  // 2. Test Login API endpoint for each role
  console.log('\nTEST SUITE 2: Login Endpoint Authentication (/api/auth/login)')
  const testCredentials = [
    // Primary strong passwords
    { role: 'admin', id: 'admin', pw: 'Admin@Dilla2026!', label: 'Super Admin (username + strong pw)' },
    { role: 'admin', id: 'admin@dilla.edu.et', pw: 'Admin@Dilla2026!', label: 'Super Admin (email + strong pw)' },
    { role: 'dean', id: 'dean.main', pw: 'Dean@Dilla2026!', label: 'Campus Dean (username + strong pw)' },
    { role: 'dean', id: 'dean.main@dilla.edu.et', pw: 'Dean@Dilla2026!', label: 'Campus Dean (email + strong pw)' },
    { role: 'student', id: 'DUC2023-001', pw: 'Student@Dilla2026!', label: 'Student (ID + strong pw)' },
    { role: 'student', id: 'student.demo@dilla.edu.et', pw: 'Student@Dilla2026!', label: 'Student (email + strong pw)' },

    // Simple development passwords
    { role: 'admin', id: 'admin', pw: 'admin@123', label: 'Super Admin (username + simple dev pw admin@123)' },
    { role: 'dean', id: 'dean.main', pw: 'dean@123', label: 'Campus Dean (username + simple dev pw dean@123)' },
    { role: 'dean', id: 'dean', pw: 'dean@123', label: 'Campus Dean alias "dean" + simple dev pw' },
    { role: 'dean', id: 'dean', pw: 'Dean@Dilla2026!', label: 'Campus Dean alias "dean" + strong pw' },
    { role: 'student', id: 'DUC2023-001', pw: 'student@123', label: 'Student (ID + simple dev pw student@123)' },
    { role: 'student', id: 'student', pw: 'student@123', label: 'Student alias "student" + simple dev pw' },
    { role: 'student', id: 'student', pw: 'Student@Dilla2026!', label: 'Student alias "student" + strong pw' },

    // Case-insensitivity tests
    { role: 'student', id: 'duc2023-001', pw: 'Student@Dilla2026!', label: 'Student (lowercase ID "duc2023-001")' },
    { role: 'student', id: 'duc2023-001', pw: 'student@123', label: 'Student (lowercase ID "duc2023-001" + simple pw)' },
    { role: 'admin', id: 'ADMIN', pw: 'Admin@Dilla2026!', label: 'Super Admin (uppercase "ADMIN")' },

    // Whitespace tolerance tests
    { role: 'admin', id: '  admin  ', pw: 'Admin@Dilla2026!', label: 'Super Admin (username with whitespace)' },
    { role: 'student', id: '  DUC2023-001  ', pw: '  Student@Dilla2026!  ', label: 'Student (ID and password with whitespace)' },
  ]

  const tokens = {}

  for (const cred of testCredentials) {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: cred.id, password: cred.pw }),
    })
    const body = await res.json()
    assert(res.status === 200, `${cred.label} authenticated successfully (HTTP 200)`)
    assert(body.user?.role === cred.role, `${cred.label} returned correct role: ${body.user?.role}`)
    assert(typeof body.token === 'string' && body.token.length > 20, `${cred.label} returned valid JWT token`)
    if (!tokens[cred.role]) {
      tokens[cred.role] = body.token
    }
  }

  // 3. Test Negative / Failure Login Cases
  console.log('\nTEST SUITE 3: Login Security & Failure Handling')
  const badPwRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId: 'admin', password: 'WrongPassword999!' }),
  })
  assert(badPwRes.status === 401, 'Invalid password returns HTTP 401 Unauthorized')

  const nonExistentRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId: 'nonexistent_user', password: 'Password@123' }),
  })
  assert(nonExistentRes.status === 401, 'Nonexistent user returns HTTP 401 Unauthorized')

  const emptyRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  assert(emptyRes.status === 400, 'Empty login payload returns HTTP 400 Bad Request')

  // 4. Student Self-Registration & Role Privilege Protection (Task 6)
  console.log('\nTEST SUITE 4: Student Self-Registration & Privilege Escalation Prevention')
  
  // Public user attempting to register as Admin MUST BE REJECTED with 403
  const hackAdminRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'fake_super_admin',
      fullName: 'Malicious Attacker',
      password: 'AttackPassword123!',
      role: 'admin',
    }),
  })
  assert(hackAdminRes.status === 403, 'Public registration attempting role="admin" is strictly FORBIDDEN (HTTP 403)')

  // Public user attempting to register as Dean MUST BE REJECTED with 403
  const hackDeanRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'fake_campus_dean',
      fullName: 'Malicious Attacker',
      password: 'AttackPassword123!',
      role: 'dean',
    }),
  })
  assert(hackDeanRes.status === 403, 'Public registration attempting role="dean" is strictly FORBIDDEN (HTTP 403)')

  // Legitimate student self-registration
  const testStudentId = `DUC-TEST-${Date.now().toString().slice(-4)}`
  const studentSelfRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      studentId: testStudentId,
      fullName: 'Self Registered Student',
      campus: 'Main Campus',
      department: 'Computer Science',
      password: 'TestStudent2026!',
      email: `${testStudentId.toLowerCase()}@du.edu.et`,
    }),
  })
  assert(studentSelfRegRes.status === 201, `Student self-registration succeeds (HTTP 201) for ID: ${testStudentId}`)
  const selfRegData = await studentSelfRegRes.json()
  assert(selfRegData.user?.role === 'student', 'Self-registered user has role="student"')

  // Verify that the newly self-registered student can authenticate
  const selfRegLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      studentId: testStudentId,
      password: 'TestStudent2026!',
    }),
  })
  assert(selfRegLoginRes.status === 200, 'Newly self-registered student can log in successfully (HTTP 200)')

  // 5. Self-Service Password Change (Task 4)
  console.log('\nTEST SUITE 5: Password Change for Authenticated Roles (/api/auth/change-password)')
  const studentToken = (await selfRegLoginRes.json()).token

  // Attempt change password with wrong current password
  const badOldPwRes = await fetch(`${BASE_URL}/api/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({
      currentPassword: 'IncorrectOldPassword!',
      newPassword: 'BrandNewPassword2026!',
    }),
  })
  assert(badOldPwRes.status === 400, 'Password change with wrong current password returns HTTP 400')

  // Successful password change
  const goodChangePwRes = await fetch(`${BASE_URL}/api/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({
      currentPassword: 'TestStudent2026!',
      newPassword: 'BrandNewPassword2026!',
    }),
  })
  assert(goodChangePwRes.status === 200, 'Self-service password change succeeds (HTTP 200)')

  // Verify login with new password
  const loginNewPwRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      studentId: testStudentId,
      password: 'BrandNewPassword2026!',
    }),
  })
  assert(loginNewPwRes.status === 200, 'Login succeeds with changed password (HTTP 200)')

  // 6. Authorized Password Reset Hierarchy (Task 5)
  console.log('\nTEST SUITE 6: Authorized Password Resets with Role Hierarchy')

  // Super Admin can reset Dean password
  const adminResetDeanRes = await fetch(`${BASE_URL}/api/users/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens.admin}`,
    },
    body: JSON.stringify({
      targetUsername: 'dean.main',
      newPassword: 'Dean@Dilla2026!',
    }),
  })
  assert(adminResetDeanRes.status === 200, 'Super Admin can reset Campus Dean password (HTTP 200)')

  // Campus Dean can reset Student password in their campus
  const deanResetStudentRes = await fetch(`${BASE_URL}/api/users/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens.dean}`,
    },
    body: JSON.stringify({
      targetUsername: 'DUC2023-001',
      newPassword: 'Student@Dilla2026!',
    }),
  })
  assert(deanResetStudentRes.status === 200, 'Campus Dean can reset Student password in their campus (HTTP 200)')

  // Campus Dean CANNOT reset Super Admin password
  const deanResetAdminRes = await fetch(`${BASE_URL}/api/users/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens.dean}`,
    },
    body: JSON.stringify({
      targetUsername: 'admin',
      newPassword: 'HackedPassword123!',
    }),
  })
  assert(deanResetAdminRes.status === 403, 'Campus Dean is FORBIDDEN from resetting Super Admin password (HTTP 403)')

  // Student CANNOT call reset-password
  const studentResetRes = await fetch(`${BASE_URL}/api/users/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens.student}`,
    },
    body: JSON.stringify({
      targetUsername: 'DUC2023-001',
      newPassword: 'HackedPassword123!',
    }),
  })
  assert(studentResetRes.status === 403, 'Student is FORBIDDEN from calling authorized reset-password (HTTP 403)')

  // 7. Campus Dean Campus Scoping & Isolation (Task 9)
  console.log('\nTEST SUITE 7: Campus Dean Campus Scoping Isolation')

  // First create a student in a DIFFERENT campus (Odaya Campus)
  const diffCampusStudentId = `DUC-ODAYA-${Date.now().toString().slice(-4)}`
  await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      studentId: diffCampusStudentId,
      fullName: 'Odaya Campus Student',
      campus: 'Odaya Campus',
      department: 'Economics',
      password: 'Student@Dilla2026!',
    }),
  })

  // Campus Dean for "Main Campus" tries to submit a review for an "Odaya Campus" student -> MUST RETURN 403
  const crossCampusReviewRes = await fetch(`${BASE_URL}/api/review/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens.dean}`,
    },
    body: JSON.stringify({
      applicationId: diffCampusStudentId,
      finding: 'registered',
      comments: 'Cross-campus review attempt',
    }),
  })
  assert(crossCampusReviewRes.status === 403, 'Campus Dean reviewing student from another campus is FORBIDDEN (HTTP 403)')

  // Campus Dean for "Main Campus" tries to reset password for "Odaya Campus" student -> MUST RETURN 403
  const crossCampusResetRes = await fetch(`${BASE_URL}/api/users/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens.dean}`,
    },
    body: JSON.stringify({
      targetUsername: diffCampusStudentId,
      newPassword: 'Student@Dilla2026!',
    }),
  })
  assert(crossCampusResetRes.status === 403, 'Campus Dean resetting student in another campus is FORBIDDEN (HTTP 403)')

  // 8. Account Status & Deactivation Handling
  console.log('\nTEST SUITE 8: Account Status (Active/Inactive) Security')

  // Super Admin deactivates test student
  const deactRes = await fetch(`${BASE_URL}/api/users`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens.admin}`,
    },
    body: JSON.stringify({
      id: testStudentId,
      status: 'inactive',
    }),
  })
  assert(deactRes.status === 200, 'Super Admin can deactivate an account (HTTP 200)')

  // Inactive user attempting to log in must be denied (HTTP 403)
  const inactiveLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      studentId: testStudentId,
      password: 'BrandNewPassword2026!',
    }),
  })
  assert(inactiveLoginRes.status === 403, 'Deactivated account cannot log in (HTTP 403 Forbidden)')

  // Reactivate test student
  const reactRes = await fetch(`${BASE_URL}/api/users`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens.admin}`,
    },
    body: JSON.stringify({
      id: testStudentId,
      status: 'active',
    }),
  })
  assert(reactRes.status === 200, 'Super Admin can reactivate account (HTTP 200)')

  // 9. Protected API Route Authorization
  console.log('\nTEST SUITE 9: Protected API Route Authorization')

  // Unauthenticated requests should be rejected
  const unauthCampuses = await fetch(`${BASE_URL}/api/campuses`)
  assert(unauthCampuses.status === 401, 'GET /api/campuses unauthenticated returns HTTP 401')

  const unauthProfile = await fetch(`${BASE_URL}/api/profile`)
  assert(unauthProfile.status === 401, 'GET /api/profile unauthenticated returns HTTP 401')

  // Super Admin access
  const adminCampuses = await fetch(`${BASE_URL}/api/campuses`, {
    headers: { Authorization: `Bearer ${tokens.admin}` },
  })
  assert(adminCampuses.status === 200, 'Super Admin can access GET /api/campuses (HTTP 200)')

  const adminApproval = await fetch(`${BASE_URL}/api/approval/final`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens.admin}`,
    },
    body: JSON.stringify({
      applicationId: 'DUC2023-045',
      decision: 'approved',
      comments: 'Approved in automated test',
    }),
  })
  assert(adminApproval.status === 200, 'Super Admin can execute final approval on /api/approval/final (HTTP 200)')

  // Campus Dean access & restrictions
  const deanUsers = await fetch(`${BASE_URL}/api/users`, {
    headers: { Authorization: `Bearer ${tokens.dean}` },
  })
  assert(deanUsers.status === 200, 'Campus Dean can access GET /api/users for their campus (HTTP 200)')

  const deanReview = await fetch(`${BASE_URL}/api/review/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens.dean}`,
    },
    body: JSON.stringify({
      applicationId: 'DUC2023-001',
      finding: 'registered',
      comments: 'Verified by Dean in test',
    }),
  })
  assert(deanReview.status === 200, 'Campus Dean can submit review on /api/review/submit (HTTP 200)')

  const deanApproveForbidden = await fetch(`${BASE_URL}/api/approval/final`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens.dean}`,
    },
    body: JSON.stringify({
      applicationId: 'DUC2023-001',
      decision: 'approved',
    }),
  })
  assert(deanApproveForbidden.status === 403, 'Campus Dean is FORBIDDEN from Super Admin approval endpoint (HTTP 403)')

  const studentProfile = await fetch(`${BASE_URL}/api/profile`, {
    headers: { Authorization: `Bearer ${tokens.student}` },
  })
  assert(studentProfile.status === 200, 'Student can access their own GET /api/profile (HTTP 200)')
  const studentProfileData = await studentProfile.json()
  assert(Boolean(studentProfileData.student), 'Student profile includes student registration record')
  assert(studentProfileData.student?.department === 'Computer Science', 'Student profile contains department')

  const studentApproveForbidden = await fetch(`${BASE_URL}/api/approval/final`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens.student}`,
    },
    body: JSON.stringify({
      applicationId: 'DUC2023-001',
      decision: 'approved',
    }),
  })
  assert(studentApproveForbidden.status === 403, 'Student is FORBIDDEN from Super Admin approval endpoint (HTTP 403)')

  const studentReviewForbidden = await fetch(`${BASE_URL}/api/review/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens.student}`,
    },
    body: JSON.stringify({
      applicationId: 'DUC2023-001',
      finding: 'registered',
    }),
  })
  assert(studentReviewForbidden.status === 403, 'Student is FORBIDDEN from Campus Dean review endpoint (HTTP 403)')

  // 10. Settings API & Privilege Scoping
  console.log('\nTEST SUITE 10: System Settings Scoping')
  const adminSettingsRes = await fetch(`${BASE_URL}/api/settings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens.admin}`,
    },
    body: JSON.stringify({
      newAcademicYear: '2025/2026',
      systemSettings: {
        allowLateRegistration: false,
        requirePdfVerification: true,
        maxPdfSizeMB: 5,
      },
    }),
  })
  assert(adminSettingsRes.status === 200, 'Super Admin can update system settings and academic years (HTTP 200)')

  const studentSettingsForbidden = await fetch(`${BASE_URL}/api/settings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens.student}`,
    },
    body: JSON.stringify({
      newAcademicYear: '3000/3001',
    }),
  })
  assert(studentSettingsForbidden.status === 403, 'Student is FORBIDDEN from updating settings (HTTP 403)')

  console.log('\n======================================================================')
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`)
  console.log('======================================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

run().catch((err) => {
  console.error('Test execution failed:', err)
  process.exit(1)
})
