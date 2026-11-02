#!/usr/bin/env node
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const backendDir = path.resolve(__dirname, '..')
dotenv.config({ path: path.join(backendDir, '.env'), override: true })

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000'

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`)
    passed++
  } else {
    console.error(`  ✗ FAIL: ${message}`)
    failed++
  }
}

async function run() {
  console.log('\n======================================================')
  console.log(' PHASE 3 VERIFICATION: REGISTRATION PERIOD, LATE')
  console.log(' REGISTRATION, CUSTOM FIELDS & STUDENT WORKFLOW')
  console.log('======================================================\n')

  // 1. Authenticate as Super Admin
  console.log('[SECTION 1] Super Admin Authentication & Initial State')
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId: 'admin', password: 'Admin@Dilla2026!' }),
  })
  const loginData = await loginRes.json()
  assert(loginRes.ok && loginData.token, 'Super Admin logged in successfully with valid JWT')
  const adminToken = loginData.token
  const adminHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  }

  // Dean Login
  const deanRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId: 'dean.main', password: 'Dean@Dilla2026!' }),
  })
  const deanData = await deanRes.json()
  assert(deanRes.ok && deanData.token, 'Campus Dean logged in successfully with valid JWT')
  const deanToken = deanData.token
  const deanHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${deanToken}`,
  }

  // 2. Schedule Validation: Closing date earlier than opening date
  console.log('\n[SECTION 2] Registration Schedule Validation & Date Independence')
  const now = new Date()
  const futureStart = new Date(now.getTime() + 10 * 86400000).toISOString()
  const earlierEnd = new Date(now.getTime() + 5 * 86400000).toISOString()

  const invalidDateRes = await fetch(`${BASE_URL}/api/settings`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      schedule: {
        startDate: futureStart,
        endDate: earlierEnd,
        isOpen: true,
        allowLate: false,
      },
    }),
  })
  assert(invalidDateRes.status === 400, 'Server rejects schedule when closing date is earlier than opening date (400)')

  // 3. Before-Opening Window Enforcement
  console.log('\n[SECTION 3] Pre-Opening Window Enforcement (Registration Before Start Date)')
  const openFutureStart = new Date(now.getTime() + 2 * 86400000).toISOString() // +2 days
  const openFutureEnd = new Date(now.getTime() + 14 * 86400000).toISOString() // +14 days

  const setFutureRes = await fetch(`${BASE_URL}/api/settings`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      schedule: {
        startDate: openFutureStart,
        endDate: openFutureEnd,
        isOpen: true,
        allowLate: false,
        reason: 'Setting future registration period for academic calendar',
      },
    }),
  })
  assert(setFutureRes.ok, 'Set future registration schedule window successfully')

  const checkFutureRes = await fetch(`${BASE_URL}/api/settings`, { headers: adminHeaders })
  const futureSettings = await checkFutureRes.json()
  assert(futureSettings.registrationWindow?.isOpen === false, 'Registration window correctly reports CLOSED before start date')

  // Attempt student registration before opening
  const testStudentId1 = `P3TEST_${Date.now()}_A`
  const preOpenRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      role: 'student',
      fullName: 'Pre Window Student',
      studentId: testStudentId1,
      username: testStudentId1,
      email: `${testStudentId1.toLowerCase()}@dilla.edu.et`,
      password: 'Student@Dilla2026!',
      campus: 'Main Campus',
      department: 'Computer Science',
    }),
  })
  assert(preOpenRegRes.status === 403, 'Self-registration rejected before opening date with 403 Forbidden')

  // 4. Post-Closing Window Enforcement
  console.log('\n[SECTION 4] Post-Closing Window Enforcement (Registration After End Date)')
  const pastStart = new Date(now.getTime() - 14 * 86400000).toISOString() // -14 days
  const pastEnd = new Date(now.getTime() - 2 * 86400000).toISOString() // -2 days

  const setPastRes = await fetch(`${BASE_URL}/api/settings`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      schedule: {
        startDate: pastStart,
        endDate: pastEnd,
        isOpen: true,
        allowLate: false,
        reason: 'Registration window expired naturally',
      },
    }),
  })
  assert(setPastRes.ok, 'Set expired registration window schedule successfully')

  const checkPastRes = await fetch(`${BASE_URL}/api/settings`, { headers: adminHeaders })
  const pastSettings = await checkPastRes.json()
  assert(pastSettings.registrationWindow?.isOpen === false, 'Registration window correctly reports CLOSED after end date')

  const testStudentId2 = `P3TEST_${Date.now()}_B`
  const postCloseRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      role: 'student',
      fullName: 'Post Window Student',
      studentId: testStudentId2,
      username: testStudentId2,
      email: `${testStudentId2.toLowerCase()}@dilla.edu.et`,
      password: 'Student@Dilla2026!',
      campus: 'Main Campus',
      department: 'Computer Science',
    }),
  })
  assert(postCloseRegRes.status === 403, 'Direct API registration after closing date rejected with 403 Forbidden')

  // 5. Late Registration Authorization & Audit Logging
  console.log('\n[SECTION 5] Late Registration Control & Audit Trail')
  const enableLateRes = await fetch(`${BASE_URL}/api/settings`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      schedule: {
        allowLate: true,
        reason: 'Authorized 5-day late registration period for delayed students',
      },
    }),
  })
  assert(enableLateRes.ok, 'Super Admin successfully enabled Late Registration')

  const checkLateRes = await fetch(`${BASE_URL}/api/settings`, { headers: adminHeaders })
  const lateSettings = await checkLateRes.json()
  assert(lateSettings.registrationWindow?.isOpen === true, 'Window is OPEN when Late Registration is enabled (despite expired date)')
  assert(lateSettings.registrationWindow?.isLate === true, 'Window status flags isLate=true')

  // Check audit history includes late registration authorization
  const auditLogs = lateSettings.scheduleAuditHistory || []
  const lateAuditEntry = auditLogs.find((a) => a.action === 'enable_late_registration')
  assert(Boolean(lateAuditEntry), 'Schedule audit log contains "enable_late_registration" entry')
  assert(
    lateAuditEntry?.performedBy === 'admin',
    `Audit entry correctly recorded performer: "${lateAuditEntry?.performedBy}"`
  )

  // Student registration now succeeds during late registration
  const lateRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      role: 'student',
      fullName: 'Late Registered Student',
      studentId: testStudentId2,
      username: testStudentId2,
      email: `${testStudentId2.toLowerCase()}@dilla.edu.et`,
      password: 'Student@Dilla2026!',
      campus: 'Main Campus',
      department: 'Computer Science',
    }),
  })
  assert(lateRegRes.status === 201, 'Student successfully registered under authorized Late Registration window (201)')
  const lateStudentData = await lateRegRes.json()
  const studentToken = lateStudentData.token

  // 6. Reset to Standard Active Registration Window
  console.log('\n[SECTION 6] Standard Active Registration Window Normalization')
  const activeStart = new Date(now.getTime() - 1 * 86400000).toISOString() // -1 day
  const activeEnd = new Date(now.getTime() + 30 * 86400000).toISOString() // +30 days

  const setNormalRes = await fetch(`${BASE_URL}/api/settings`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      schedule: {
        startDate: activeStart,
        endDate: activeEnd,
        isOpen: true,
        allowLate: false,
        reason: 'Restored active registration period for standard semester enrollment',
      },
    }),
  })
  assert(setNormalRes.ok, 'Restored active registration window')

  // Verify existing student can log in even when window status changes
  const studentLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId: testStudentId2, password: 'Student@Dilla2026!' }),
  })
  assert(studentLoginRes.ok, 'Existing registered student logs in and accesses portal seamlessly')

  // 7. Custom Registration Fields with Applicability (All, Cafe, Non-Cafe)
  console.log('\n[SECTION 7] Custom Registration Fields Creation & Applicability Scoping')
  const uniqueKeySuffix = Date.now().toString().slice(-6)

  // Field A: Universal (all students)
  const universalKey = `p3_emergency_${uniqueKeySuffix}`
  const createUnivRes = await fetch(`${BASE_URL}/api/custom-fields`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      fieldKey: universalKey,
      label: 'Emergency Contact Person',
      fieldType: 'text',
      isRequired: false,
      isActive: true,
      appliesTo: 'all',
      placeholder: 'Parent or Guardian Full Name',
    }),
  })
  const univData = await createUnivRes.json()
  assert(createUnivRes.status === 201 && univData.customField?.appliesTo === 'all', 'Created universal custom field (appliesTo: all)')
  const univFieldId = univData.customField.id

  // Field B: Cafe Only
  const cafeKey = `p3_meal_shift_${uniqueKeySuffix}`
  const createCafeRes = await fetch(`${BASE_URL}/api/custom-fields`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      fieldKey: cafeKey,
      label: 'Preferred Cafeteria Meal Shift',
      fieldType: 'select',
      options: ['Shift 1 (11:30 AM)', 'Shift 2 (12:30 PM)', 'Shift 3 (1:30 PM)'],
      isRequired: true,
      isActive: true,
      appliesTo: 'cafe',
    }),
  })
  const cafeData = await createCafeRes.json()
  assert(createCafeRes.status === 201 && cafeData.customField?.appliesTo === 'cafe', 'Created cafe-only custom field (appliesTo: cafe)')
  const cafeFieldId = cafeData.customField.id

  // Field C: Non-Cafe Only (Required for non-cafe students)
  const nonCafeKey = `p3_cbe_account_${uniqueKeySuffix}`
  const createNonCafeRes = await fetch(`${BASE_URL}/api/custom-fields`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      fieldKey: nonCafeKey,
      label: 'CBE Subsidy Account Number',
      fieldType: 'text',
      isRequired: true,
      isActive: true,
      appliesTo: 'non-cafe',
      placeholder: '1000XXXXXXXXX',
    }),
  })
  const nonCafeData = await createNonCafeRes.json()
  assert(createNonCafeRes.status === 201 && nonCafeData.customField?.appliesTo === 'non-cafe', 'Created non-cafe custom field (appliesTo: non-cafe)')
  const nonCafeFieldId = nonCafeData.customField.id

  // 8. Custom Fields Scoped Querying
  console.log('\n[SECTION 8] Custom Fields Scoped Filtering Query Verification')
  const cafeFieldsRes = await fetch(`${BASE_URL}/api/custom-fields?category=cafe`, { headers: adminHeaders })
  const cafeFieldsData = await cafeFieldsRes.json()
  const cafeList = cafeFieldsData.customFields || []
  assert(
    cafeList.some((f) => f.fieldKey === cafeKey) && !cafeList.some((f) => f.fieldKey === nonCafeKey),
    'GET /api/custom-fields?category=cafe includes cafe-specific field and excludes non-cafe field'
  )

  const nonCafeFieldsRes = await fetch(`${BASE_URL}/api/custom-fields?category=non-cafe`, { headers: adminHeaders })
  const nonCafeFieldsData = await nonCafeFieldsRes.json()
  const nonCafeList = nonCafeFieldsData.customFields || []
  assert(
    nonCafeList.some((f) => f.fieldKey === nonCafeKey) && !nonCafeList.some((f) => f.fieldKey === cafeKey),
    'GET /api/custom-fields?category=non-cafe includes non-cafe field and excludes cafe field'
  )

  // 9. Student Registration with Custom Field Applicability Validation
  console.log('\n[SECTION 9] Student Registration Custom Field Validation & Persistence')
  // Try submitting non-cafe registration without required non-cafe field -> must reject
  const invalidStudentRegRes = await fetch(`${BASE_URL}/api/student/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({
      studentId: testStudentId2,
      fullName: 'Late Registered Student',
      campus: 'Main Campus',
      department: 'Computer Science',
      program: 'Regular Degree',
      academicYear: '2023/2024',
      isNonCafeteria: true,
      customValues: {
        [universalKey]: 'Abebe Senior (Father)',
        // missing required CBE account number!
      },
    }),
  })
  assert(
    invalidStudentRegRes.status === 400,
    'Non-cafe registration without mandatory non-cafe custom field rejected with 400 Bad Request'
  )

  // Submit valid registration with non-cafe custom field answered
  const validStudentRegRes = await fetch(`${BASE_URL}/api/student/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({
      studentId: testStudentId2,
      fullName: 'Late Registered Student',
      campus: 'Main Campus',
      department: 'Computer Science',
      program: 'Regular Degree',
      academicYear: '2023/2024',
      isNonCafeteria: true,
      customValues: {
        [universalKey]: 'Abebe Senior (Father)',
        [nonCafeKey]: '1000123456789',
      },
    }),
  })
  assert(validStudentRegRes.ok, 'Non-cafe student registration with valid custom values accepted (200 OK)')

  // 10. Submissions Inspection Endpoint
  console.log('\n[SECTION 10] Custom Field Submissions Inspection Endpoint')
  const subsRes = await fetch(`${BASE_URL}/api/custom-fields/submissions?fieldId=${nonCafeFieldId}`, {
    headers: adminHeaders,
  })
  assert(subsRes.ok, 'Super Admin fetched field submissions successfully (200 OK)')
  const subsData = await subsRes.json()
  assert(subsData.totalCount >= 1, `Submissions count for field is >= 1 (count: ${subsData.totalCount})`)
  const foundSubmission = subsData.submissions.find((s) => s.studentId === testStudentId2)
  assert(
    foundSubmission && foundSubmission.value === '1000123456789',
    `Submission correctly records student's answer: "${foundSubmission?.value}"`
  )

  // 11. Deactivation & Historical Answer Retention
  console.log('\n[SECTION 11] Custom Field Deactivation & Historical Data Preservation')
  const deactivateRes = await fetch(`${BASE_URL}/api/custom-fields`, {
    method: 'PUT',
    headers: adminHeaders,
    body: JSON.stringify({
      id: nonCafeFieldId,
      isActive: false,
    }),
  })
  assert(deactivateRes.ok, 'Deactivated custom field successfully')

  // Check student values still retain historical answer
  const studentValsRes = await fetch(`${BASE_URL}/api/custom-fields/values?studentId=${testStudentId2}`, {
    headers: adminHeaders,
  })
  const studentValsData = await studentValsRes.json()
  assert(
    studentValsData.customValues?.[nonCafeKey] === '1000123456789',
    'Historical answer preserved in student_custom_value despite field deactivation'
  )

  // Check delete safety warning
  const safeDeleteRes = await fetch(`${BASE_URL}/api/custom-fields?id=${nonCafeFieldId}`, {
    method: 'DELETE',
    headers: adminHeaders,
  })
  assert(
    safeDeleteRes.status === 409,
    'Deletion blocked with 409 Conflict when field contains existing student responses'
  )

  // 12. Student PDF Review & Approval Workflow
  console.log('\n[SECTION 12] Two-Tier Review & Approval Workflow')
  // Campus Dean reviews student application
  const deanReviewRes = await fetch(`${BASE_URL}/api/review/submit`, {
    method: 'POST',
    headers: deanHeaders,
    body: JSON.stringify({
      applicationId: testStudentId2,
      finding: 'verified-eligible',
      comments: 'Registrar registration slip and academic credentials verified by Campus Dean.',
    }),
  })
  assert(deanReviewRes.ok, 'Campus Dean submitted verification review (status -> super-admin-review)')
  const deanReviewData = await deanReviewRes.json()
  assert(
    deanReviewData.application?.application_status === 'super-admin-review',
    'Application status correctly advanced to "super-admin-review"'
  )

  // Super Admin grants final approval
  const adminApprovalRes = await fetch(`${BASE_URL}/api/approval/final`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      applicationId: testStudentId2,
      decision: 'approved',
      comments: 'Cost-sharing subsistence stipend authorized by Super Admin.',
    }),
  })
  assert(adminApprovalRes.ok, 'Super Admin granted final approval (200 OK)')
  const adminApprovalData = await adminApprovalRes.json()
  assert(
    adminApprovalData.application?.approvalStatus === 'approved',
    'Application status set to "approved"'
  )

  // 13. Student Duplicate ID Prevention
  console.log('\n[SECTION 13] Duplicate Student Registration Prevention')
  const duplicateRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      role: 'student',
      fullName: 'Duplicate Student Attempt',
      studentId: testStudentId2, // Same ID!
      username: testStudentId2,
      email: 'dup@dilla.edu.et',
      password: 'Student@Dilla2026!',
      campus: 'Main Campus',
    }),
  })
  assert(duplicateRegRes.status === 409, 'Duplicate registration attempt with same student ID rejected with 409 Conflict')

  // Clean up temporary test fields with ?force=true
  await fetch(`${BASE_URL}/api/custom-fields?id=${univFieldId}&force=true`, { method: 'DELETE', headers: adminHeaders })
  await fetch(`${BASE_URL}/api/custom-fields?id=${cafeFieldId}&force=true`, { method: 'DELETE', headers: adminHeaders })
  await fetch(`${BASE_URL}/api/custom-fields?id=${nonCafeFieldId}&force=true`, { method: 'DELETE', headers: adminHeaders })

  console.log('\n======================================================')
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log('======================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

run().catch((err) => {
  console.error('Fatal verification error:', err)
  process.exit(1)
})
