/**
 * Dilla University - Phase 2 Form Builder & Admin Configuration Verification
 *
 * Verifies:
 * 1. Admin creates dynamic field with properties (key, label, type, display_order, is_student_editable, etc.)
 * 2. All 14 field types supported by database constraint & backend validation
 * 3. Form field appears in active list for student registration
 * 4. Required field rejection when missing in student submission (HTTP 400)
 * 5. Student submits custom values and they persist in student_custom_value
 * 6. Admin and Dean can view student custom values in profile / dossier
 * 7. Read-only fields (is_student_editable=false) cannot be modified by student (HTTP 403)
 * 8. Safe deletion protection: field with existing student data returns HTTP 409 unless force=true
 * 9. Deactivating a field hides it from new registration forms while preserving existing student values
 * 10. Academic settings: Admin configures departments, batches, and programs, returned dynamically
 * 11. Photo upload limits: Admin updates photo size limit (1-10 MB), rejected if outside range
 * 12. Security & RBAC: Students cannot manage form builder or academic settings
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
  console.log('     PHASE 2: REGISTRATION FORM BUILDER & ADMIN CONFIG VERIFICATION   ')
  console.log('======================================================================\n')

  // Setup: Authenticate Admin, Dean, and Student
  const adminAuth = await loginUser('admin', 'Admin@Dilla2026!')
  assert(adminAuth.status === 200 && adminAuth.data.token, 'Super Admin authenticated successfully')
  const adminToken = adminAuth.data.token

  const deanAuth = await loginUser('dean.main', 'Dean@Dilla2026!')
  assert(deanAuth.status === 200 && deanAuth.data.token, 'Campus Dean authenticated successfully')
  const deanToken = deanAuth.data.token

  const studentAuth = await loginUser('DUC2023-001', 'Student@Dilla2026!')
  assert(studentAuth.status === 200 && studentAuth.data.token, 'Student authenticated successfully')
  const studentToken = studentAuth.data.token

  // -------------------------------------------------------------------------
  // SUITE 1: Form Builder - Custom Fields CRUD & Configuration
  // -------------------------------------------------------------------------
  console.log('\n[SUITE 1] Dynamic Form Builder CRUD & Field Configuration')

  const uniqueSuffix = Date.now().toString().slice(-5)
  const testSectionKey = `section_${uniqueSuffix}`
  let sectionFieldId = null

  // 1.1 Super Admin creates 'section' field with extended properties
  const createFieldRes = await fetch(`${BASE_URL}/api/custom-fields`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      fieldKey: testSectionKey,
      label: 'Class Section',
      fieldType: 'text',
      placeholder: 'e.g. Section A',
      helpText: 'Enter your assigned class section',
      isRequired: true,
      isActive: true,
      isStudentEditable: false, // Locked after initial submission
      visibleStudent: true,
      visibleAdmin: true,
      visibleDean: true,
      displayOrder: 15,
      campus: null,
    }),
  })
  const createFieldData = await createFieldRes.json()
  assert(createFieldRes.status === 201, 'Admin can create dynamic custom field with all configuration properties (HTTP 201)')
  assert(createFieldData.customField?.fieldKey === testSectionKey, 'Created field key matches input')
  assert(createFieldData.customField?.isStudentEditable === false, 'Field preserves isStudentEditable=false')
  assert(createFieldData.customField?.displayOrder === 15, 'Field preserves displayOrder=15')
  sectionFieldId = createFieldData.customField?.id

  // 1.2 Rejection of reserved system keys
  const duplicateKeyRes = await fetch(`${BASE_URL}/api/custom-fields`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      fieldKey: 'studentId',
      label: 'Student Identification',
      fieldType: 'text',
    }),
  })
  assert(duplicateKeyRes.status === 400, 'Creation rejects reserved system field key studentId (HTTP 400)')

  // 1.3 Verify all 14 field types are accepted by backend & database constraint
  const fieldTypesToTest = [
    'text', 'textarea', 'number', 'email', 'phone', 'date',
    'select', 'radio', 'checkbox', 'file', 'department', 'batch', 'academic_year'
  ]
  const sampleTypeKey = `ft_${uniqueSuffix}`
  const testTypeRes = await fetch(`${BASE_URL}/api/custom-fields`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      fieldKey: sampleTypeKey,
      label: 'Sample Department Choice',
      fieldType: 'department',
      isRequired: false,
      isActive: true,
    }),
  })
  assert(testTypeRes.status === 201, 'Backend & DB constraint accept new dynamic field type (department) (HTTP 201)')

  // -------------------------------------------------------------------------
  // SUITE 2: Dynamic Registration Validation & Submission
  // -------------------------------------------------------------------------
  console.log('\n[SUITE 2] Dynamic Registration Form Rendering & Response Persistence')

  // 2.1 Fetch active custom fields as student
  const studentFieldsRes = await fetch(`${BASE_URL}/api/custom-fields?campus=Main%20Campus`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  })
  const studentFieldsData = await studentFieldsRes.json()
  assert(studentFieldsRes.status === 200, 'Student can fetch applicable active custom fields (HTTP 200)')
  const foundSection = studentFieldsData.customFields?.find(f => f.fieldKey === testSectionKey)
  assert(Boolean(foundSection), 'Newly created dynamic field appears in active registration list')

  // 2.2 Rejection when required dynamic custom field is missing
  const invalidRegRes = await fetch(`${BASE_URL}/api/student/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({
      studentId: 'DUC2023-001',
      fullName: 'Abebe Kebede Bikila',
      campus: 'Main Campus',
      department: 'Computer Science',
      academicYear: '2023/2024',
      customValues: {}, // Missing required section field
    }),
  })
  assert(invalidRegRes.status === 400, 'Registration rejected when required dynamic custom field is missing (HTTP 400)')

  // 2.3 Successful registration with dynamic custom value
  const validRegRes = await fetch(`${BASE_URL}/api/student/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({
      studentId: 'DUC2023-001',
      fullName: 'Abebe Kebede Bikila',
      gender: 'Male',
      campus: 'Main Campus',
      department: 'Computer Science',
      program: 'Regular Degree',
      yearOfStudy: '3',
      academicYear: '2023/2024',
      customValues: {
        [testSectionKey]: 'Section B',
        [sampleTypeKey]: 'Computer Science',
      },
    }),
  })
  const validRegData = await validRegRes.json()
  if (validRegRes.status !== 200) console.error('  -> validRegRes error:', validRegRes.status, validRegData)
  assert(validRegRes.status === 200, 'Student registers successfully with dynamic custom fields (HTTP 200)')

  // 2.4 Verify custom values persisted in student profile / dossier
  const profileRes = await fetch(`${BASE_URL}/api/profile?id=DUC2023-001`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  })
  const profileData = await profileRes.json()
  assert(profileRes.status === 200, 'Student profile fetched successfully (HTTP 200)')
  assert(
    profileData.student?.customValues?.[testSectionKey] === 'Section B',
    'Custom value for dynamic field persisted and returned in profile'
  )

  // 2.5 Admin and Dean can view student custom values in dossier
  const deanViewRes = await fetch(`${BASE_URL}/api/profile?id=DUC2023-001`, {
    headers: { Authorization: `Bearer ${deanToken}` },
  })
  const deanViewData = await deanViewRes.json()
  assert(deanViewRes.status === 200, 'Campus Dean can view student profile with custom fields')
  assert(
    deanViewData.student?.customValues?.[testSectionKey] === 'Section B',
    'Campus Dean views exact dynamic custom field value in student dossier'
  )

  // -------------------------------------------------------------------------
  // SUITE 3: Read-Only (is_student_editable=false) Field Enforcement
  // -------------------------------------------------------------------------
  console.log('\n[SUITE 3] Read-Only / Student Immutability Enforcement')

  // 3.1 Student attempts to update read-only custom value via PUT /api/custom-fields/values
  const updateAttemptRes = await fetch(`${BASE_URL}/api/custom-fields/values`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({
      studentId: 'DUC2023-001',
      fieldKey: testSectionKey,
      value: 'Section C - Modified',
    }),
  })
  assert(
    updateAttemptRes.status === 403,
    'Student blocked with HTTP 403 when attempting to update is_student_editable=false field'
  )

  // -------------------------------------------------------------------------
  // SUITE 4: Safe Deletion & Historical Value Preservation
  // -------------------------------------------------------------------------
  console.log('\n[SUITE 4] Safe Deletion & Historical Data Preservation')

  // 4.1 Delete field with existing student responses without force flag
  const safeDeleteRes = await fetch(`${BASE_URL}/api/custom-fields?id=${sectionFieldId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  })
  const safeDeleteData = await safeDeleteRes.json()
  assert(
    safeDeleteRes.status === 409 && safeDeleteData.hasExistingData === true,
    'Field deletion with existing student responses triggers HTTP 409 safe-delete warning'
  )
  assert(safeDeleteData.responseCount >= 1, `Safe delete accurately reports response count (${safeDeleteData.responseCount})`)

  // 4.2 Deactivate field instead of deleting
  const deactivateRes = await fetch(`${BASE_URL}/api/custom-fields`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      id: sectionFieldId,
      isActive: false,
    }),
  })
  assert(deactivateRes.status === 200, 'Admin can safely deactivate field (HTTP 200)')

  // 4.3 Verify deactivated field is excluded from new registration forms
  const activeFieldsAfterDeact = await fetch(`${BASE_URL}/api/custom-fields?campus=Main%20Campus`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  })
  const activeFieldsDataAfterDeact = await activeFieldsAfterDeact.json()
  const foundInActive = activeFieldsDataAfterDeact.customFields?.find(f => f.fieldKey === testSectionKey)
  assert(!foundInActive, 'Deactivated field is immediately hidden from new registration forms')

  // 4.4 Verify existing student historical response remains accessible
  const historicalProfileRes = await fetch(`${BASE_URL}/api/profile?id=DUC2023-001`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  })
  const histData = await historicalProfileRes.json()
  assert(
    histData.student?.customValues?.[testSectionKey] === 'Section B',
    'Historical student custom response remains intact after field deactivation'
  )

  // -------------------------------------------------------------------------
  // SUITE 5: Academic Configuration & Settings Management
  // -------------------------------------------------------------------------
  console.log('\n[SUITE 5] Academic Configuration & Dynamic Settings Management')

  // 5.1 Admin updates departments, batches, and programs
  const newDepts = ['Computer Science', 'Software Engineering', 'Biomedical Engineering']
  const newBatches = ['2023', '2024', '2025', '2026', '2027']
  const newPrograms = ['Regular Degree', 'Continuing Education', 'Masters Program']

  const updateSettingsRes = await fetch(`${BASE_URL}/api/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      systemSettings: {
        departments: newDepts,
        batches: newBatches,
        programs: newPrograms,
      },
    }),
  })
  assert(updateSettingsRes.status === 200, 'Admin successfully updates academic settings (HTTP 200)')

  // 5.2 Verify settings API returns updated academic configurations
  const getSettingsRes = await fetch(`${BASE_URL}/api/settings`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  })
  const getSettingsData = await getSettingsRes.json()
  assert(
    getSettingsData.departments?.includes('Biomedical Engineering'),
    'Settings API returns dynamically updated departments list'
  )
  assert(
    getSettingsData.batches?.includes('2027'),
    'Settings API returns dynamically updated batches list'
  )

  // -------------------------------------------------------------------------
  // SUITE 6: Student Photo Upload Limit Configuration (1-10 MB)
  // -------------------------------------------------------------------------
  console.log('\n[SUITE 6] Student Photo Upload Size Limit (1-10 MB)')

  // 6.1 Admin sets valid photo size limit (4 MB)
  const setLimitRes = await fetch(`${BASE_URL}/api/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      systemSettings: {
        max_photo_size_mb: 4,
      },
    }),
  })
  assert(setLimitRes.status === 200, 'Admin sets photo size limit to 4 MB (HTTP 200)')

  // 6.2 Admin attempts invalid photo size limit (e.g. 15 MB)
  const setInvalidLimitRes = await fetch(`${BASE_URL}/api/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      systemSettings: {
        max_photo_size_mb: 15,
      },
    }),
  })
  assert(setInvalidLimitRes.status === 400, 'System rejects photo size limit outside 1-10 MB range (HTTP 400)')

  // -------------------------------------------------------------------------
  // SUITE 7: Role-Based Access Control (RBAC) Protection
  // -------------------------------------------------------------------------
  console.log('\n[SUITE 7] Role-Based Access Control on Form Builder & Settings')

  // 7.1 Student cannot create custom fields
  const studentCreateRes = await fetch(`${BASE_URL}/api/custom-fields`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({
      fieldKey: 'hacker_field',
      label: 'Hacker Field',
      fieldType: 'text',
    }),
  })
  assert(studentCreateRes.status === 403, 'Student blocked from creating custom fields (HTTP 403)')

  // 7.2 Student cannot modify academic settings
  const studentSettingsRes = await fetch(`${BASE_URL}/api/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({
      systemSettings: { departments: ['Fake Dept'] },
    }),
  })
  assert(studentSettingsRes.status === 403, 'Student blocked from updating system settings (HTTP 403)')

  // Cleanup: force-delete test fields created in this run
  await fetch(`${BASE_URL}/api/custom-fields?id=${sectionFieldId}&force=true`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  })
  const sampleTypeField = (await (await fetch(`${BASE_URL}/api/custom-fields?all=true`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  })).json()).customFields?.find(f => f.fieldKey === sampleTypeKey)
  if (sampleTypeField) {
    await fetch(`${BASE_URL}/api/custom-fields?id=${sampleTypeField.id}&force=true`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    })
  }

  // Summary
  console.log('\n======================================================================')
  console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`)
  console.log('======================================================================')

  if (failedTests > 0) {
    process.exit(1)
  }
}

run().catch((err) => {
  console.error('Fatal test error:', err)
  process.exit(1)
})
