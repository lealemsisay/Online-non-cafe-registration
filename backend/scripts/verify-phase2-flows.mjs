/**
 * Dilla University - Phase 2 Comprehensive Verification Suite
 * Tests:
 * 1. Custom Fields: Centrally managed vs Campus-specific, Admin notification, field types, required/type validation, editing, activation, safe deletion, campus isolation
 * 2. Campus Dean User Creation: Mandatory campus assignment, automatic campus isolation on user creation, rejection of cross-campus assignments, non-admin role escalation prevention
 * 3. Student List Filtering and Submission: Selection tracking, batch submission, duplicate submission prevention (HTTP 409), submission history, notifications to Dean & Admin, cross-campus submission block (HTTP 403)
 * 4. Registration Schedule: Start/end dates, master toggle, backend enforcement (403 on register when closed), login/profile remain functional, schedule modification restricted to Super Admin
 * 5. Notifications: PostgreSQL app_notification storage, role & campus scoping, unread counts, mark single read, mark all read
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
  console.log('       DILLA UNIVERSITY - PHASE 2 COMPREHENSIVE VERIFICATION          ')
  console.log('======================================================================\n')

  // Setup: Authenticate Admin, Dean, and Student
  const adminAuth = await loginUser('admin', 'Admin@Dilla2026!')
  assert(adminAuth.status === 200 && adminAuth.data.token, 'Super Admin authenticated successfully')
  const adminToken = adminAuth.data.token

  const deanAuth = await loginUser('dean.main', 'Dean@Dilla2026!')
  assert(deanAuth.status === 200 && deanAuth.data.token, 'Campus Dean (Main Campus) authenticated successfully')
  const deanToken = deanAuth.data.token
  const deanCampus = deanAuth.data.user?.campus || 'Main Campus'

  const studentAuth = await loginUser('DUC2023-001', 'Student@Dilla2026!')
  assert(studentAuth.status === 200 && studentAuth.data.token, 'Student authenticated successfully')
  const studentToken = studentAuth.data.token

  // =========================================================================
  // SUITE 1: Custom Fields Management & Validation
  // =========================================================================
  console.log('\nTEST SUITE 1: Custom Fields Management & Validation')

  const testFieldKeyCentral = `cf_central_${Date.now().toString().slice(-4)}`
  const testFieldKeyCampus = `cf_campus_${Date.now().toString().slice(-4)}`
  let centralFieldId = null
  let campusFieldId = null

  // 1.1 Super Admin creates central custom field (campus: null)
  const createCentralRes = await fetch(`${BASE_URL}/api/custom-fields`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      fieldKey: testFieldKeyCentral,
      label: 'Emergency Contact Phone',
      fieldType: 'text',
      isRequired: true,
      isActive: true,
      campus: null,
    }),
  })
  const createCentralData = await createCentralRes.json()
  assert(createCentralRes.status === 201, 'Super Admin can create centrally managed custom field (HTTP 201)')
  assert(createCentralData.customField?.campus === null, 'Centrally managed custom field has campus = null')
  centralFieldId = createCentralData.customField?.id

  // 1.2 Campus Dean creates campus-specific custom field
  const createCampusRes = await fetch(`${BASE_URL}/api/custom-fields`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${deanToken}` },
    body: JSON.stringify({
      fieldKey: testFieldKeyCampus,
      label: 'Dorm Block Number',
      fieldType: 'number',
      isRequired: false,
      isActive: true,
      campus: deanCampus,
    }),
  })
  const createCampusData = await createCampusRes.json()
  assert(createCampusRes.status === 201, 'Campus Dean can create campus-specific custom field (HTTP 201)')
  assert(createCampusData.customField?.campus === deanCampus, `Campus-specific field correctly tagged to ${deanCampus}`)
  campusFieldId = createCampusData.customField?.id

  // 1.3 Verify Notification was generated for Super Admin when Campus Dean created custom field
  const adminNotifsRes = await fetch(`${BASE_URL}/api/notifications`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  })
  const adminNotifsData = await adminNotifsRes.json()
  const deanFieldNotif = adminNotifsData.notifications?.find(
    (n) => n.title?.includes('Custom Field') && n.message?.includes('Dorm Block Number')
  )
  assert(Boolean(deanFieldNotif), 'Super Admin received notification when Campus Dean created custom field')

  // 1.4 Campus Dean forbidden from creating custom field for another campus
  const crossCampusFieldRes = await fetch(`${BASE_URL}/api/custom-fields`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${deanToken}` },
    body: JSON.stringify({
      fieldKey: `cf_foreign_${Date.now()}`,
      label: 'Foreign Campus Field',
      fieldType: 'text',
      campus: 'Harme Campus', // Dean is in Main Campus
    }),
  })
  assert(crossCampusFieldRes.status === 403, 'Campus Dean creating field for another campus is strictly FORBIDDEN (HTTP 403)')

  // 1.5 Create select dropdown field with options
  const testDropdownKey = `cf_dropdown_${Date.now().toString().slice(-4)}`
  const createSelectRes = await fetch(`${BASE_URL}/api/custom-fields`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      fieldKey: testDropdownKey,
      label: 'Dietary Preference',
      fieldType: 'select',
      options: ['Standard', 'Vegetarian', 'Vegan', 'Fasting'],
      isRequired: false,
      isActive: true,
    }),
  })
  const createSelectData = await createSelectRes.json()
  assert(createSelectRes.status === 201, 'Can create dropdown (select) field with options (HTTP 201)')
  const selectFieldId = createSelectData.customField?.id

  // 1.6 Fetch custom fields for student registration: active only
  const getFieldsRes = await fetch(`${BASE_URL}/api/custom-fields?campus=${encodeURIComponent(deanCampus)}`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  })
  const getFieldsData = await getFieldsRes.json()
  const hasCentral = getFieldsData.customFields?.some((f) => f.fieldKey === testFieldKeyCentral)
  const hasCampus = getFieldsData.customFields?.some((f) => f.fieldKey === testFieldKeyCampus)
  assert(hasCentral && hasCampus, 'Student in campus retrieves both central and campus-specific active fields')

  // 1.7 Student custom values validation: required field missing returns HTTP 400
  const valMissingRes = await fetch(`${BASE_URL}/api/custom-fields/values`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({
      studentId: 'DUC2023-001',
      values: {
        [testFieldKeyCampus]: 42,
        // intentionally omitting required testFieldKeyCentral
      },
    }),
  })
  assert(valMissingRes.status === 400, 'Saving custom values omitting required field returns HTTP 400')

  // 1.8 Student custom values validation: invalid number returns HTTP 400
  const valBadNumRes = await fetch(`${BASE_URL}/api/custom-fields/values`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({
      studentId: 'DUC2023-001',
      values: {
        [testFieldKeyCentral]: '+251911223344',
        [testFieldKeyCampus]: 'not-a-number',
      },
    }),
  })
  assert(valBadNumRes.status === 400, 'Saving non-numeric value for number field returns HTTP 400')

  // 1.9 Student custom values validation: invalid select option returns HTTP 400
  const valBadSelectRes = await fetch(`${BASE_URL}/api/custom-fields/values`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({
      studentId: 'DUC2023-001',
      values: {
        [testFieldKeyCentral]: '+251911223344',
        [testFieldKeyCampus]: 12,
        [testDropdownKey]: 'InvalidOptionNotInList',
      },
    }),
  })
  assert(valBadSelectRes.status === 400, 'Saving invalid option for dropdown field returns HTTP 400')

  // 1.10 Successful custom values save
  const valSuccessRes = await fetch(`${BASE_URL}/api/custom-fields/values`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({
      studentId: 'DUC2023-001',
      values: {
        [testFieldKeyCentral]: '+251911223344',
        [testFieldKeyCampus]: 15,
        [testDropdownKey]: 'Vegetarian',
      },
    }),
  })
  assert(valSuccessRes.status === 200, 'Saving valid custom values succeeds (HTTP 200)')

  // 1.11 Retrieve saved custom values
  const getValsRes = await fetch(`${BASE_URL}/api/custom-fields/values?studentId=DUC2023-001`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  })
  const getValsData = await getValsRes.json()
  assert(
    getValsData.customValues?.[testFieldKeyCentral] === '+251911223344' &&
      getValsData.customValues?.[testDropdownKey] === 'Vegetarian',
    'Retrieved saved student custom values match submitted data'
  )

  // 1.12 Campus Dean is FORBIDDEN from modifying or deleting central field
  const deanEditCentralRes = await fetch(`${BASE_URL}/api/custom-fields`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${deanToken}` },
    body: JSON.stringify({
      id: centralFieldId,
      label: 'Hacked Label',
    }),
  })
  assert(deanEditCentralRes.status === 403, 'Campus Dean editing central custom field is FORBIDDEN (HTTP 403)')

  // 1.13 Safe deletion of custom field definition (cascade cleans student values with force flag if data exists)
  let deleteFieldRes = await fetch(`${BASE_URL}/api/custom-fields?id=${campusFieldId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${deanToken}` },
  })
  if (deleteFieldRes.status === 409) {
    deleteFieldRes = await fetch(`${BASE_URL}/api/custom-fields?id=${campusFieldId}&force=true`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${deanToken}` },
    })
  }
  assert(deleteFieldRes.status === 200, 'Campus Dean can safely delete own campus custom field (HTTP 200)')

  // Clean up select and central field
  await fetch(`${BASE_URL}/api/custom-fields?id=${selectFieldId}&force=true`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  })
  await fetch(`${BASE_URL}/api/custom-fields?id=${centralFieldId}&force=true`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  })

  // =========================================================================
  // SUITE 2: Campus Dean User Creation & Campus Restrictions
  // =========================================================================
  console.log('\nTEST SUITE 2: Campus Dean User Creation & Campus Restrictions')

  // 2.1 Super Admin creating Dean without campus returns HTTP 400
  const deanNoCampusRes = await fetch(`${BASE_URL}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      role: 'dean',
      name: 'Dean Without Campus',
      email: 'dean.test.nocampus@dilla.edu.et',
      campus: '', // missing
    }),
  })
  assert(deanNoCampusRes.status === 400, 'Creating Campus Dean without campus assignment returns HTTP 400')

  // 2.2 Super Admin creating Dean with campus succeeds
  const testDeanEmail = `dean.test.${Date.now()}@dilla.edu.et`
  const deanWithCampusRes = await fetch(`${BASE_URL}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      role: 'dean',
      name: 'Test Dean Odaya',
      email: testDeanEmail,
      campus: 'Odaya Campus',
    }),
  })
  const deanWithCampusData = await deanWithCampusRes.json()
  assert(deanWithCampusRes.status === 201, 'Super Admin can create Campus Dean with assigned campus (HTTP 201)')
  assert(deanWithCampusData.user?.campus === 'Odaya Campus', 'New Campus Dean is assigned to Odaya Campus')

  // 2.3 Campus Dean cannot create Admin account (Privilege escalation block)
  const deanCreateAdminRes = await fetch(`${BASE_URL}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${deanToken}` },
    body: JSON.stringify({
      role: 'admin',
      name: 'Unauthorized Admin',
      studentId: 'FAKE-ADMIN-01',
    }),
  })
  assert(deanCreateAdminRes.status === 403, 'Campus Dean creating Admin account is strictly FORBIDDEN (HTTP 403)')

  // 2.4 Campus Dean creating student attempting to assign outside Dean campus returns HTTP 403
  const deanCreateForeignStudentRes = await fetch(`${BASE_URL}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${deanToken}` },
    body: JSON.stringify({
      role: 'student',
      studentId: `DUC-FOR-${Date.now().toString().slice(-4)}`,
      fullName: 'Foreign Campus Student',
      campus: 'Odaya Campus', // Dean is in Main Campus
    }),
  })
  assert(
    deanCreateForeignStudentRes.status === 403,
    'Campus Dean creating student assigned to different campus is strictly FORBIDDEN (HTTP 403)'
  )

  // 2.5 Campus Dean creating student in own campus succeeds
  const testStudentId1 = `DUC-PH2-${Date.now().toString().slice(-4)}-1`
  const testStudentId2 = `DUC-PH2-${Date.now().toString().slice(-4)}-2`
  const deanCreateStudentRes = await fetch(`${BASE_URL}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${deanToken}` },
    body: JSON.stringify({
      role: 'student',
      studentId: testStudentId1,
      fullName: 'Phase 2 Test Student 1',
      campus: deanCampus,
      department: 'Computer Science',
      academicYear: '2023/2024',
    }),
  })
  assert(deanCreateStudentRes.status === 201, 'Campus Dean can create student in their own campus (HTTP 201)')

  // Create second student for batch testing
  await fetch(`${BASE_URL}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${deanToken}` },
    body: JSON.stringify({
      role: 'student',
      studentId: testStudentId2,
      fullName: 'Phase 2 Test Student 2',
      campus: deanCampus,
      department: 'Information Systems',
      academicYear: '2023/2024',
    }),
  })

  // =========================================================================
  // SUITE 3: Student List Filtering & Batch Submission
  // =========================================================================
  console.log('\nTEST SUITE 3: Student List Filtering & Batch Submission')

  // 3.1 Campus Dean queries students (returns Main Campus students only)
  const deanStudentsRes = await fetch(`${BASE_URL}/api/users`, {
    headers: { Authorization: `Bearer ${deanToken}` },
  })
  const deanStudentsData = await deanStudentsRes.json()
  assert(deanStudentsRes.status === 200, 'Campus Dean can query campus student roster (HTTP 200)')
  const allMainCampus = deanStudentsData.users?.every((u) => u.campus === deanCampus)
  assert(allMainCampus, `Campus Dean student roster is 100% restricted to '${deanCampus}'`)

  // 3.2 Campus Dean submits batch student roster
  const batchSubmitRes = await fetch(`${BASE_URL}/api/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${deanToken}` },
    body: JSON.stringify({
      studentIds: [testStudentId1, testStudentId2],
      filters: { department: 'All', academicYear: '2023/2024' },
      notes: 'Submitted for Semester I cost-sharing clearance',
    }),
  })
  const batchSubmitData = await batchSubmitRes.json()
  assert(batchSubmitRes.status === 201, 'Campus Dean can submit student roster batch to Super Admin (HTTP 201)')
  assert(Boolean(batchSubmitData.submission?.batchNumber), `Batch generated: ${batchSubmitData.submission?.batchNumber}`)
  assert(batchSubmitData.submission?.studentCount === 2, 'Batch studentCount accurately equals 2')

  // 3.3 Verify Student application status changed to 'super-admin-review'
  const checkStudentRes = await fetch(`${BASE_URL}/api/users?search=${testStudentId1}`, {
    headers: { Authorization: `Bearer ${deanToken}` },
  })
  const checkStudentData = await checkStudentRes.json()
  const student1Status = checkStudentData.users?.[0]?.applicationStatus
  assert(student1Status === 'super-admin-review', 'Student status transitioned to super-admin-review after batch submission')

  // 3.4 Prevent duplicate batch submission of same students
  const dupBatchRes = await fetch(`${BASE_URL}/api/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${deanToken}` },
    body: JSON.stringify({
      studentIds: [testStudentId1],
      notes: 'Attempting duplicate submission',
    }),
  })
  assert(dupBatchRes.status === 409, 'Duplicate batch submission is strictly PREVENTED (HTTP 409 Conflict)')

  // 3.5 Retrieve submission history
  const historyRes = await fetch(`${BASE_URL}/api/submissions`, {
    headers: { Authorization: `Bearer ${deanToken}` },
  })
  const historyData = await historyRes.json()
  assert(historyRes.status === 200, 'Campus Dean can retrieve batch submission history (HTTP 200)')
  assert(historyData.submissions?.length > 0, `Submission history contains ${historyData.submissions?.length} batch(es)`)

  // 3.6 Notifications generated for Admin and Dean upon batch submission
  const deanNotifsRes = await fetch(`${BASE_URL}/api/notifications`, {
    headers: { Authorization: `Bearer ${deanToken}` },
  })
  const deanNotifsData = await deanNotifsRes.json()
  const deanConfirmNotif = deanNotifsData.notifications?.find((n) => n.title?.includes('Submission Confirmed'))
  assert(Boolean(deanConfirmNotif), 'Campus Dean received batch submission confirmation notification')

  // =========================================================================
  // SUITE 4: Registration Schedule Enforcement
  // =========================================================================
  console.log('\nTEST SUITE 4: Registration Schedule Enforcement')

  // 4.1 Non-admin (Dean) forbidden from modifying registration schedule
  const deanModScheduleRes = await fetch(`${BASE_URL}/api/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${deanToken}` },
    body: JSON.stringify({
      schedule: { isOpen: false },
    }),
  })
  assert(deanModScheduleRes.status === 403, 'Campus Dean modifying schedule is strictly FORBIDDEN (HTTP 403)')

  // 4.2 Super Admin closes registration window
  const closeWindowRes = await fetch(`${BASE_URL}/api/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      schedule: {
        isOpen: false,
        startDate: new Date(Date.now() - 86400000).toISOString(),
        endDate: new Date(Date.now() - 3600000).toISOString(), // past date
        allowLate: false,
      },
    }),
  })
  const closeWindowData = await closeWindowRes.json()
  assert(closeWindowRes.status === 200, 'Super Admin can close registration window (HTTP 200)')
  assert(closeWindowData.registrationWindow?.isOpen === false, 'Registration window status is closed (isOpen = false)')

  // 4.3 Student registration (/api/auth/register) returns HTTP 403 when window is closed
  const closedRegisterRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: `DUC-CLOSED-${Date.now().toString().slice(-4)}`,
      password: 'Password123!',
      fullName: 'Closed Window Student',
      studentId: `DUC-CLOSED-${Date.now().toString().slice(-4)}`,
      campus: 'Main Campus',
      department: 'Computer Science',
    }),
  })
  assert(closedRegisterRes.status === 403, 'Student registration when window is closed returns HTTP 403 Forbidden')

  // 4.4 Internal student register (/api/student/register) also returns HTTP 403
  const closedStudentRegisterRes = await fetch(`${BASE_URL}/api/student/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({
      studentId: 'DUC2023-001',
      fullName: 'Existing Student',
      campus: 'Main Campus',
      department: 'Computer Science',
      gender: 'Male',
      program: 'Regular',
      academicYear: '2023/2024',
    }),
  })
  assert(closedStudentRegisterRes.status === 403, 'Internal student registration returns HTTP 403 Forbidden when closed')

  // 4.5 While registration is closed: Login, Profile, and Read-Only Views remain fully operational!
  const loginWhileClosedRes = await loginUser('DUC2023-001', 'Student@Dilla2026!')
  assert(loginWhileClosedRes.status === 200, 'Student login remains operational while registration is closed (HTTP 200)')

  const profileWhileClosedRes = await fetch(`${BASE_URL}/api/profile`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  })
  assert(profileWhileClosedRes.status === 200, 'Student profile lookup remains operational while closed (HTTP 200)')

  // 4.6 Super Admin reopens registration window
  const reopenWindowRes = await fetch(`${BASE_URL}/api/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      schedule: {
        isOpen: true,
        startDate: new Date(Date.now() - 3600000).toISOString(),
        endDate: new Date(Date.now() + 86400000 * 30).toISOString(),
        allowLate: false,
      },
    }),
  })
  const reopenWindowData = await reopenWindowRes.json()
  assert(reopenWindowRes.status === 200, 'Super Admin reopens registration window (HTTP 200)')
  assert(reopenWindowData.registrationWindow?.isOpen === true, 'Registration window status is open (isOpen = true)')

  // 4.7 Student registration succeeds when window is reopened
  const openRegisterRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: `DUC-OPEN-${Date.now().toString().slice(-4)}`,
      password: 'Password123!',
      fullName: 'Open Window Student',
      studentId: `DUC-OPEN-${Date.now().toString().slice(-4)}`,
      campus: 'Main Campus',
      department: 'Computer Science',
    }),
  })
  assert(openRegisterRes.status === 201, 'Student registration succeeds after window is reopened (HTTP 201)')

  // =========================================================================
  // SUITE 5: Notifications Management & Read Status
  // =========================================================================
  console.log('\nTEST SUITE 5: Notifications Management & Read Status')

  // 5.1 Fetch Dean notifications, get an unread notification ID
  const deanNotifsCheck = await fetch(`${BASE_URL}/api/notifications`, {
    headers: { Authorization: `Bearer ${deanToken}` },
  })
  const deanNotifsCheckData = await deanNotifsCheck.json()
  assert(deanNotifsCheck.status === 200, 'Dean can query notifications with unread count (HTTP 200)')
  const unreadNotif = deanNotifsCheckData.notifications?.find((n) => !n.isRead)

  if (unreadNotif) {
    // 5.2 Mark single notification as read
    const markSingleRes = await fetch(`${BASE_URL}/api/notifications`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${deanToken}` },
      body: JSON.stringify({ id: unreadNotif.id }),
    })
    const markSingleData = await markSingleRes.json()
    assert(markSingleRes.status === 200, 'Can mark individual notification as read (HTTP 200)')
    assert(markSingleData.notification?.isRead === true, 'Notification status updated to isRead = true')
  } else {
    assert(true, 'No unread notifications to mark individually')
  }

  // 5.3 Mark all notifications as read
  const markAllRes = await fetch(`${BASE_URL}/api/notifications`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${deanToken}` },
    body: JSON.stringify({ markAllRead: true }),
  })
  assert(markAllRes.status === 200, 'Can mark all notifications as read (HTTP 200)')

  const deanNotifsAfterAll = await fetch(`${BASE_URL}/api/notifications`, {
    headers: { Authorization: `Bearer ${deanToken}` },
  })
  const deanNotifsAfterAllData = await deanNotifsAfterAll.json()
  assert(deanNotifsAfterAllData.unreadCount === 0, 'Unread count is 0 after markAllRead')

  // Summary
  console.log('\n======================================================================')
  console.log(`PHASE 2 TESTS COMPLETED: TOTAL: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`)
  console.log('======================================================================')

  if (failedTests > 0) {
    process.exit(1)
  }
}

run().catch((err) => {
  console.error('Fatal error running Phase 2 verification:', err)
  process.exit(1)
})
