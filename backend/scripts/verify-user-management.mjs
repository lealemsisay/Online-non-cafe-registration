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
  } catch (e) {}
  return { status: res.status, ok: res.ok, data }
}

async function run() {
  console.log('======================================================================')
  console.log('   DILLA UNIVERSITY - USER MANAGEMENT & ROLE HIERARCHY VERIFICATION  ')
  console.log('======================================================================\n')

  await client.connect()

  // 1. Authenticate roles
  const adminLogin = await apiRequest('/api/auth/login', 'POST', { username: 'admin', password: 'Admin@Dilla2026!' })
  assert(adminLogin.ok && adminLogin.data?.token, 'Super Admin authenticated successfully')
  const adminToken = adminLogin.data?.token

  const deanLogin = await apiRequest('/api/auth/login', 'POST', { username: 'dean.main', password: 'Dean@Dilla2026!' })
  assert(deanLogin.ok && deanLogin.data?.token, 'Campus Dean (Main Campus) authenticated successfully')
  const deanToken = deanLogin.data?.token

  // TEST SUITE 1: User Queries & Scoping
  console.log('\nTEST SUITE 1: User Queries, Tabs & Scoping')
  const deansRes = await apiRequest('/api/users?type=dean', 'GET', null, adminToken)
  assert(deansRes.ok && Array.isArray(deansRes.data?.deans), 'GET /api/users?type=dean returns deans array')
  assert(deansRes.data?.deans.length > 0, `Campus Deans count: ${deansRes.data?.deans.length}`)

  const viceDeansRes = await apiRequest('/api/users?type=viceDean', 'GET', null, adminToken)
  assert(viceDeansRes.ok && Array.isArray(viceDeansRes.data?.viceDeans), 'GET /api/users?type=viceDean returns viceDeans array')

  const studentsRes = await apiRequest('/api/users?type=student', 'GET', null, adminToken)
  assert(studentsRes.ok && Array.isArray(studentsRes.data?.users), 'GET /api/users?type=student returns students array')

  // Search filter
  const searchRes = await apiRequest('/api/users?type=dean&search=main', 'GET', null, adminToken)
  assert(searchRes.ok, 'Dean search by name/username succeeds')

  // Campus filter
  const campusFilterRes = await apiRequest('/api/users?type=student&campus=Main%20Campus', 'GET', null, adminToken)
  assert(campusFilterRes.ok && campusFilterRes.data?.users.every(s => s.campus === 'Main Campus'), 'Student campus filter strictly matches Main Campus')

  // TEST SUITE 2: Account Provisioning Across Roles
  console.log('\nTEST SUITE 2: Account Provisioning Across Roles')
  const testDeanTimestamp = Date.now()
  const testDeanName = `Dr. Dean Test ${testDeanTimestamp}`
  const testDeanEmail = `dean.test.${testDeanTimestamp}@dilla.edu.et`
  
  const createDeanRes = await apiRequest('/api/users', 'POST', {
    role: 'dean',
    name: testDeanName,
    email: testDeanEmail,
    campus: 'Odaya Campus',
    password: 'Dean@Dilla2026!',
  }, adminToken)
  assert(createDeanRes.status === 201 && createDeanRes.data?.dean, 'Super Admin provisions new Campus Cafe Dean (HTTP 201)')
  const createdDeanId = createDeanRes.data?.dean?.id

  // Verify in PostgreSQL
  const dbDean = await client.query('SELECT id, username, full_name, role, campus, status FROM app_user WHERE id = $1', [createdDeanId])
  assert(dbDean.rows.length === 1 && dbDean.rows[0].campus === 'Odaya Campus', 'New Campus Dean persisted in PostgreSQL app_user table')

  // Create Student
  const testStudentId = `DUC-MGMT-${testDeanTimestamp.toString().slice(-4)}`
  const createStudentRes = await apiRequest('/api/users', 'POST', {
    role: 'student',
    studentId: testStudentId,
    fullName: `Test Mgmt Student ${testStudentId}`,
    campus: 'Main Campus',
    department: 'Computer Science',
    email: `${testStudentId.toLowerCase()}@student.dilla.edu.et`,
    password: 'Student@Dilla2026!',
  }, adminToken)
  assert(createStudentRes.status === 201 && createStudentRes.data?.user, `Super Admin provisions new Student ${testStudentId} (HTTP 201)`)

  // Verify Student in PostgreSQL
  const dbStudent = await client.query('SELECT id, student_id, full_name, campus FROM student WHERE student_id = $1', [testStudentId])
  assert(dbStudent.rows.length === 1 && dbStudent.rows[0].student_id === testStudentId, 'New Student persisted in PostgreSQL student table')
  const dbStudentUser = await client.query('SELECT id, username, role, status FROM app_user WHERE LOWER(username) = LOWER($1)', [testStudentId])
  assert(dbStudentUser.rows.length === 1 && dbStudentUser.rows[0].role === 'student', 'New Student login account created in app_user')

  // TEST SUITE 3: Account Editing & PostgreSQL Persistence
  console.log('\nTEST SUITE 3: Account Editing & PostgreSQL Persistence')
  const updatedDeanName = `Dr. Dean Test Renamed ${testDeanTimestamp}`
  const updateRes = await apiRequest('/api/users', 'PUT', {
    id: createdDeanId,
    name: updatedDeanName,
    email: testDeanEmail,
    campus: 'Odaya Campus',
  }, adminToken)
  assert(updateRes.ok, 'Super Admin updates Campus Dean name (HTTP 200)')

  const dbDeanUpdated = await client.query('SELECT full_name FROM app_user WHERE id = $1', [createdDeanId])
  assert(dbDeanUpdated.rows[0].full_name === updatedDeanName, 'Dean name update persisted in PostgreSQL')

  // TEST SUITE 4: Status Toggle & Suspensions
  console.log('\nTEST SUITE 4: Status Toggle & Suspensions')
  // Deactivate
  const deactivateRes = await apiRequest('/api/users', 'PUT', {
    id: createdDeanId,
    status: 'inactive',
  }, adminToken)
  assert(deactivateRes.ok, 'Super Admin deactivates Campus Dean account (HTTP 200)')

  const dbDeanInactive = await client.query('SELECT status FROM app_user WHERE id = $1', [createdDeanId])
  assert(dbDeanInactive.rows[0].status === 'inactive', 'Account status="inactive" persisted in PostgreSQL')

  // Inactive login is blocked
  const inactiveLogin = await apiRequest('/api/auth/login', 'POST', {
    username: createDeanRes.data?.dean?.username,
    password: 'Dean@Dilla2026!',
  })
  assert(inactiveLogin.status === 403, 'Inactive account is strictly blocked from login (HTTP 403)')

  // Reactivate
  const reactivateRes = await apiRequest('/api/users', 'PUT', {
    id: createdDeanId,
    status: 'active',
  }, adminToken)
  assert(reactivateRes.ok, 'Super Admin reactivates account (HTTP 200)')

  const activeLogin = await apiRequest('/api/auth/login', 'POST', {
    username: createDeanRes.data?.dean?.username,
    password: 'Dean@Dilla2026!',
  })
  assert(activeLogin.ok, 'Reactivated account logs in successfully (HTTP 200)')

  // TEST SUITE 5: Authorized Password Resets
  console.log('\nTEST SUITE 5: Authorized Password Resets')
  const newCustomPw = 'DeanCustomNewPass2026!'
  const resetRes = await apiRequest('/api/users/reset-password', 'POST', {
    userId: createdDeanId,
    targetUsername: createDeanRes.data?.dean?.username,
    newPassword: newCustomPw,
  }, adminToken)
  assert(resetRes.ok, 'Super Admin resets Dean password with custom value (HTTP 200)')

  const newPwLogin = await apiRequest('/api/auth/login', 'POST', {
    username: createDeanRes.data?.dean?.username,
    password: newCustomPw,
  })
  assert(newPwLogin.ok, 'Login succeeds with new reset password (HTTP 200)')

  // Audit log was created in PostgreSQL
  const auditRes = await client.query(
    "SELECT id, action, target_id FROM audit_log WHERE target_id = $1 AND action = 'authorized_password_reset'",
    [createdDeanId]
  )
  assert(auditRes.rows.length >= 1, 'Password reset action logged in PostgreSQL audit_log table')

  // TEST SUITE 6: Role Hierarchy & Super Admin Protection
  console.log('\nTEST SUITE 6: Role Hierarchy & Super Admin Protection')
  // Campus Dean trying to reset Super Admin
  const deanResetAdmin = await apiRequest('/api/users/reset-password', 'POST', {
    targetUsername: 'admin',
    newPassword: 'HackedAdminPassword2026!',
  }, deanToken)
  assert(deanResetAdmin.status === 403, 'Campus Dean resetting Super Admin password is FORBIDDEN (HTTP 403)')

  // Campus Dean trying to reset another Campus Dean
  const deanResetDean = await apiRequest('/api/users/reset-password', 'POST', {
    targetUsername: createDeanRes.data?.dean?.username,
    newPassword: 'HackedDeanPassword2026!',
  }, deanToken)
  assert(deanResetDean.status === 403, 'Campus Dean resetting another Dean password is FORBIDDEN (HTTP 403)')

  // Attempting to delete Super Admin
  const adminUserRow = await client.query("SELECT id FROM app_user WHERE username = 'admin'")
  const adminId = adminUserRow.rows[0].id

  const deleteAdminAttempt = await apiRequest(`/api/users?id=${adminId}`, 'DELETE', null, adminToken)
  assert(deleteAdminAttempt.status === 403, 'Super Admin account CANNOT be deleted (HTTP 403 Forbidden)')

  // Attempting to deactivate Super Admin
  const deactivateAdminAttempt = await apiRequest('/api/users', 'PUT', {
    id: adminId,
    status: 'inactive',
  }, adminToken)
  assert(deactivateAdminAttempt.status === 403, 'Super Admin account CANNOT be deactivated/suspended (HTTP 403 Forbidden)')

  // Attempting to demote Super Admin
  const demoteAdminAttempt = await apiRequest('/api/users', 'PUT', {
    id: adminId,
    role: 'student',
  }, adminToken)
  assert(demoteAdminAttempt.status === 403, 'Super Admin account CANNOT be demoted (HTTP 403 Forbidden)')

  // TEST SUITE 7: Safe Cascade Deletion of Managed Accounts
  console.log('\nTEST SUITE 7: Safe Cascade Deletion of Managed Accounts')
  // Delete test student
  const deleteStudentRes = await apiRequest(`/api/users?id=${testStudentId}`, 'DELETE', null, adminToken)
  assert(deleteStudentRes.ok, `Super Admin deletes test student ${testStudentId} (HTTP 200)`)

  const verifyStudentGone = await client.query('SELECT id FROM student WHERE student_id = $1', [testStudentId])
  assert(verifyStudentGone.rows.length === 0, 'Deleted student removed from PostgreSQL student table')

  const verifyStudentUserGone = await client.query('SELECT id FROM app_user WHERE LOWER(username) = LOWER($1)', [testStudentId])
  assert(verifyStudentUserGone.rows.length === 0, 'Deleted student removed from PostgreSQL app_user table')

  // Delete test dean
  const deleteDeanRes = await apiRequest(`/api/users?id=${createdDeanId}`, 'DELETE', null, adminToken)
  assert(deleteDeanRes.ok, 'Super Admin deletes test dean (HTTP 200)')

  const verifyDeanGone = await client.query('SELECT id FROM app_user WHERE id = $1', [createdDeanId])
  assert(verifyDeanGone.rows.length === 0, 'Deleted dean removed from PostgreSQL app_user table')

  console.log('\n======================================================================')
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`)
  console.log('======================================================================')

  await client.end()

  if (failed > 0) {
    process.exit(1)
  }
}

run().catch((err) => {
  console.error('Test execution error:', err)
  process.exit(1)
})
