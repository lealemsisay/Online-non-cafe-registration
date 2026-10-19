#!/usr/bin/env node
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { verifyPassword, signToken, verifyToken, authorize } from '../lib/auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const backendDir = path.resolve(__dirname, '..')
dotenv.config({ path: path.join(backendDir, '.env'), override: true })

let APP_URL = process.env.DATABASE_URL || 'postgresql://postgres:0317@localhost:5432/dilla_university'
if (APP_URL.startsWith('postgresql://postgres@localhost') || APP_URL.startsWith('postgresql://postgres:5432')) {
  APP_URL = APP_URL.replace('postgresql://postgres@', 'postgresql://postgres:0317@')
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
  const userRows = await client.query('SELECT username, role, full_name, email FROM app_user ORDER BY role')
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

  // 4. Test Protected API Authorization by Role
  console.log('\nTEST SUITE 4: Protected API Route Authorization')

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
