import http from 'http'
import fs from 'fs'
import path from 'path'
import { pool } from '../drizzle/client.js'

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

// Minimal 1x1 valid JPEG image buffer with valid magic bytes FF D8 FF
function createValidJpegBuffer(paddingBytes = 100) {
  // JPEG magic header: FF D8 FF E0 00 10 4A 46 49 46 00 01
  const header = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01])
  const padding = Buffer.alloc(paddingBytes, 0xaa)
  const trailer = Buffer.from([0xff, 0xd9])
  return Buffer.concat([header, padding, trailer])
}

// Minimal valid PNG buffer with valid magic bytes 89 50 4E 47 0D 0A 1A 0A
function createValidPngBuffer(paddingBytes = 100) {
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const padding = Buffer.alloc(paddingBytes, 0xbb)
  return Buffer.concat([header, padding])
}

// Corrupt/Fake buffer with fake mime/extension
function createFakeImageBuffer() {
  return Buffer.from('This is completely fake image data text and definitely not a genuine JPEG or PNG image.')
}

async function apiRequest(endpoint, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: endpoint,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
      },
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        let json = null
        try {
          json = JSON.parse(data)
        } catch (e) {
          json = data
        }
        resolve({ status: res.statusCode, data: json, headers: res.headers })
      })
    })

    req.on('error', (err) => reject(err))
    if (postData) req.write(postData)
    req.end()
  })
}

async function main() {
  console.log('======================================================================')
  console.log('  DILLA UNIVERSITY - PHASE 1 COMPREHENSIVE REQUIREMENTS VERIFICATION  ')
  console.log('======================================================================\n')

  // 1. Authenticate users
  console.log('SETUP: Authenticating user roles...')
  const adminLogin = await apiRequest('/api/auth/login', 'POST', {
    identifier: 'admin',
    password: 'admin@123',
  })
  const adminToken = adminLogin.data.token
  assert(adminToken, 'Super Admin authenticated successfully')

  const deanLogin = await apiRequest('/api/auth/login', 'POST', {
    identifier: 'dean',
    password: 'dean@123',
  })
  const deanToken = deanLogin.data.token
  assert(deanToken, 'Campus Dean (Main Campus) authenticated successfully')

  const studentLogin = await apiRequest('/api/auth/login', 'POST', {
    identifier: 'DUC2023-001',
    password: 'student@123',
  })
  const studentToken = studentLogin.data.token
  assert(studentToken, 'Student (DUC2023-001) authenticated successfully')

  // Create a second student in Odaya Campus for campus isolation test
  const client = await pool.connect()
  try {
    await client.query(`
      INSERT INTO app_user (id, username, email, full_name, role, status, campus, password_hash)
      VALUES ('a0000000-0000-0000-0000-000000000099', 'DUC-ODAYA-001', 'odaya.student@dilla.edu.et', 'Odaya Test Student', 'student', 'active', 'Odaya Campus', '$2b$10$wK6iM...')
      ON CONFLICT (username) DO NOTHING;

      INSERT INTO student (student_id, full_name, gender, campus, department, program, year_of_study, academic_year, is_non_cafeteria, registration_status, application_status)
      VALUES ('DUC-ODAYA-001', 'Odaya Test Student', 'Female', 'Odaya Campus', 'Economics', 'Regular Degree', '2', '2023/2024', true, 'submitted', 'submitted')
      ON CONFLICT (student_id) DO NOTHING;
    `)
  } finally {
    client.release()
  }

  // -------------------------------------------------------------------------
  // TEST SUITE 1: Student Passport-Size Photo Upload & Validation
  // -------------------------------------------------------------------------
  console.log('\nTEST SUITE 1: Student Passport-Size Photo Upload & Validation')

  // Valid JPEG upload
  const validJpeg = createValidJpegBuffer(5000)
  const validJpegBase64 = `data:image/jpeg;base64,${validJpeg.toString('base64')}`
  const uploadRes = await apiRequest('/api/student/photo', 'POST', {
    image: validJpegBase64,
    studentId: 'DUC2023-001',
  }, studentToken)

  assert(uploadRes.status === 200, `Valid JPEG upload succeeds with HTTP 200 (Got ${uploadRes.status})`)
  assert(uploadRes.data?.photoUrl?.startsWith('/api/student/photo?file='), 'Upload returns correct photoUrl endpoint')

  // Check that photoUrl is persisted in database
  const clientCheck = await pool.connect()
  let dbPhotoUrl = null
  try {
    const r = await clientCheck.query('SELECT photo_url FROM student WHERE student_id = $1', ['DUC2023-001'])
    dbPhotoUrl = r.rows[0]?.photo_url
  } finally {
    clientCheck.release()
  }
  assert(dbPhotoUrl === uploadRes.data.photoUrl, 'Uploaded photo URL is persisted in PostgreSQL student table')

  // Check photo streaming
  const streamRes = await apiRequest(uploadRes.data.photoUrl, 'GET')
  assert(streamRes.status === 200, 'Uploaded photo can be retrieved and streamed via GET endpoint')
  assert(streamRes.headers['content-type'] === 'image/jpeg', 'Served photo has correct Content-Type: image/jpeg')

  // Valid PNG upload
  const validPng = createValidPngBuffer(4000)
  const validPngBase64 = `data:image/png;base64,${validPng.toString('base64')}`
  const pngUpload = await apiRequest('/api/student/photo', 'POST', {
    image: validPngBase64,
    studentId: 'DUC2023-001',
  }, studentToken)
  assert(pngUpload.status === 200, 'Valid PNG upload succeeds with HTTP 200')
  assert(pngUpload.data?.photoUrl?.includes('.png'), 'PNG photo URL has .png extension')

  // Magic-byte validation failure (fake image with disguised mime)
  const fakeBuffer = createFakeImageBuffer()
  const fakeBase64 = `data:image/jpeg;base64,${fakeBuffer.toString('base64')}`
  const fakeUpload = await apiRequest('/api/student/photo', 'POST', {
    image: fakeBase64,
    studentId: 'DUC2023-001',
  }, studentToken)
  assert(fakeUpload.status === 400, `Fake/corrupted image content is rejected with HTTP 400 (Got ${fakeUpload.status})`)
  assert(fakeUpload.data?.message?.includes('Invalid image content'), 'Magic byte failure returns informative error message')

  // Unsupported file format (e.g., text/plain or gif)
  const badMimeUpload = await apiRequest('/api/student/photo', 'POST', {
    image: `data:image/gif;base64,${fakeBuffer.toString('base64')}`,
    studentId: 'DUC2023-001',
  }, studentToken)
  assert(badMimeUpload.status === 400, 'Unsupported MIME type (GIF) is rejected with HTTP 400')

  // Path traversal protection
  const traversalRes = await apiRequest('/api/student/photo?file=../../../../etc/passwd', 'GET')
  assert(traversalRes.status === 404, 'Path traversal attempt is safely sanitized and returns HTTP 404')

  // -------------------------------------------------------------------------
  // TEST SUITE 2: Admin-Configurable Photo Upload Size Limit
  // -------------------------------------------------------------------------
  console.log('\nTEST SUITE 2: Admin-Configurable Photo Upload Size Limit')

  // Check default settings
  const settingsGet = await apiRequest('/api/settings', 'GET', null, adminToken)
  assert(settingsGet.status === 200, 'Admin can fetch system settings')
  const initialLimit = settingsGet.data?.systemSettings?.maxPhotoSizeMB || settingsGet.data?.systemSettings?.max_photo_size_mb || 8
  assert(initialLimit >= 1 && initialLimit <= 10, `Initial photo limit is valid (${initialLimit} MB)`)

  // Student cannot modify photo upload limit
  const studentSettingChange = await apiRequest('/api/settings', 'POST', {
    maxPhotoSizeMB: 5,
  }, studentToken)
  assert(studentSettingChange.status === 403, 'Student is FORBIDDEN from modifying photo size settings (HTTP 403)')

  // Admin configures limit to 3 MB
  const adminSet3MB = await apiRequest('/api/settings', 'POST', {
    maxPhotoSizeMB: 3,
  }, adminToken)
  assert(adminSet3MB.status === 200, 'Admin successfully configured photo upload limit to 3 MB')

  // Verify limit saved in DB
  const verifyLimit = await apiRequest('/api/settings', 'GET', null, studentToken)
  const newLimit = verifyLimit.data?.systemSettings?.maxPhotoSizeMB || verifyLimit.data?.systemSettings?.max_photo_size_mb
  assert(Number(newLimit) === 3, 'New 3 MB photo limit verified from database')

  // Test photo upload exceeding newly configured 3 MB limit (3.5 MB buffer)
  const large3Point5MB = createValidJpegBuffer(3.5 * 1024 * 1024)
  const largeUpload = await apiRequest('/api/student/photo', 'POST', {
    image: `data:image/jpeg;base64,${large3Point5MB.toString('base64')}`,
    studentId: 'DUC2023-001',
  }, studentToken)
  assert(largeUpload.status === 400, `Upload exceeding 3 MB limit is rejected with HTTP 400 (Got ${largeUpload.status})`)
  assert(largeUpload.data?.message?.includes('exceeds the configured limit of 3 MB'), 'Size error message includes dynamic 3 MB limit')

  // Test photo upload within newly configured 3 MB limit (1.5 MB buffer)
  const allowed1Point5MB = createValidJpegBuffer(1.5 * 1024 * 1024)
  const allowedUpload = await apiRequest('/api/student/photo', 'POST', {
    image: `data:image/jpeg;base64,${allowed1Point5MB.toString('base64')}`,
    studentId: 'DUC2023-001',
  }, studentToken)
  assert(allowedUpload.status === 200, 'Upload within 3 MB limit succeeds with HTTP 200')

  // Validate limits outside 1-10 MB bounds are rejected
  const invalidLimitHigh = await apiRequest('/api/settings', 'POST', {
    maxPhotoSizeMB: 15,
  }, adminToken)
  assert(invalidLimitHigh.status === 400, 'Configuring limit above 10 MB is rejected with HTTP 400')

  const invalidLimitLow = await apiRequest('/api/settings', 'POST', {
    maxPhotoSizeMB: 0.5,
  }, adminToken)
  assert(invalidLimitLow.status === 400, 'Configuring limit below 1 MB is rejected with HTTP 400')

  // Reset limit back to standard 8 MB
  await apiRequest('/api/settings', 'POST', { maxPhotoSizeMB: 8 }, adminToken)

  // -------------------------------------------------------------------------
  // TEST SUITE 3: Role-Based Authorization & Student Data Protection
  // -------------------------------------------------------------------------
  console.log('\nTEST SUITE 3: Role-Based Authorization & Student Data Protection')

  // Student cannot upload photo for another student
  const studentTamper = await apiRequest('/api/student/photo', 'POST', {
    image: validJpegBase64,
    studentId: 'DUC-ODAYA-001',
  }, studentToken)
  assert(studentTamper.status === 403, 'Student uploading photo for another student is strictly FORBIDDEN (HTTP 403)')

  // Campus Dean cannot upload photo for student of another campus (Dean is Main Campus, student is Odaya)
  const deanCrossCampus = await apiRequest('/api/student/photo', 'POST', {
    image: validJpegBase64,
    studentId: 'DUC-ODAYA-001',
  }, deanToken)
  assert(deanCrossCampus.status === 403, 'Campus Dean uploading photo for student of another campus is FORBIDDEN (HTTP 403)')

  // Super Admin can view all student photos and records
  const adminStudentLookup = await apiRequest('/api/users?role=student', 'GET', null, adminToken)
  assert(adminStudentLookup.status === 200, 'Super Admin can list students')
  const foundStudent = adminStudentLookup.data?.users?.find((u) => u.studentId === 'DUC2023-001' || u.id === 'DUC2023-001')
  assert(foundStudent?.photoUrl, 'Student record returned to Super Admin contains saved photoUrl')

  // Campus Dean can view student in their own campus
  const deanStudentLookup = await apiRequest('/api/users?role=student', 'GET', null, deanToken)
  assert(deanStudentLookup.status === 200, 'Campus Dean can list students in their campus')
  const deanViewedStudent = deanStudentLookup.data?.users?.find((u) => u.studentId === 'DUC2023-001')
  assert(deanViewedStudent?.photoUrl, 'Student record returned to Campus Dean contains saved photoUrl')

  // -------------------------------------------------------------------------
  // TEST SUITE 4: Complete Student Information View (Dossier Data)
  // -------------------------------------------------------------------------
  console.log('\nTEST SUITE 4: Complete Student Information View (Dossier Data)')

  const profileLookup = await apiRequest('/api/profile?id=DUC2023-001', 'GET', null, deanToken)
  assert(profileLookup.status === 200, 'GET /api/profile?id=DUC2023-001 succeeds (HTTP 200)')
  const studentDossier = profileLookup.data?.student || profileLookup.data?.user

  assert(studentDossier?.studentId === 'DUC2023-001', 'Dossier contains studentId')
  assert(studentDossier?.fullName, `Dossier contains fullName: ${studentDossier?.fullName}`)
  assert(studentDossier?.department, `Dossier contains department: ${studentDossier?.department}`)
  assert(studentDossier?.campus, `Dossier contains campus: ${studentDossier?.campus}`)
  assert(studentDossier?.program, `Dossier contains program: ${studentDossier?.program}`)
  assert(studentDossier?.yearOfStudy, `Dossier contains yearOfStudy: ${studentDossier?.yearOfStudy}`)
  assert(studentDossier?.academicYear, `Dossier contains academicYear: ${studentDossier?.academicYear}`)
  assert(studentDossier?.photoUrl, `Dossier contains photoUrl: ${studentDossier?.photoUrl}`)
  assert(studentDossier?.registrationStatus, `Dossier contains registrationStatus: ${studentDossier?.registrationStatus}`)
  assert(studentDossier?.isNonCafeteria !== undefined, 'Dossier contains non-cafeteria status')

  // -------------------------------------------------------------------------
  // TEST SUITE 5: Profile Pages for All Three Roles
  // -------------------------------------------------------------------------
  console.log('\nTEST SUITE 5: Profile Pages for All Three Roles')

  // 1. Super Admin Profile
  const adminProfileGet = await apiRequest('/api/profile', 'GET', null, adminToken)
  assert(adminProfileGet.status === 200, 'Admin can fetch own profile (HTTP 200)')
  assert(adminProfileGet.data?.user?.role === 'admin', 'Admin profile confirms role=admin')

  const adminProfileUpdate = await apiRequest('/api/profile', 'PUT', {
    phone: '+251 911 000 111',
    email: 'admin.updated@dilla.edu.et',
  }, adminToken)
  assert(adminProfileUpdate.status === 200, 'Admin can update own contact info (HTTP 200)')
  assert(adminProfileUpdate.data?.user?.phone === '+251 911 000 111', 'Admin phone persisted')

  // 2. Campus Dean Profile
  const deanProfileGet = await apiRequest('/api/profile', 'GET', null, deanToken)
  assert(deanProfileGet.status === 200, 'Campus Dean can fetch own profile (HTTP 200)')
  assert(deanProfileGet.data?.user?.role === 'dean', 'Dean profile confirms role=dean')

  const deanProfileUpdate = await apiRequest('/api/profile', 'PUT', {
    phone: '+251 922 111 222',
  }, deanToken)
  assert(deanProfileUpdate.status === 200, 'Campus Dean can update own contact info (HTTP 200)')

  // 3. Student Profile
  const studentProfileGet = await apiRequest('/api/profile', 'GET', null, studentToken)
  assert(studentProfileGet.status === 200, 'Student can fetch own profile (HTTP 200)')
  assert(studentProfileGet.data?.user?.role === 'student', 'Student profile confirms role=student')

  const studentProfileUpdate = await apiRequest('/api/profile', 'PUT', {
    phone: '+251 933 222 333',
  }, studentToken)
  assert(studentProfileUpdate.status === 200, 'Student can update own contact info (HTTP 200)')

  // Privilege escalation check: user cannot elevate role via profile update
  const escalationAttempt = await apiRequest('/api/profile', 'PUT', {
    role: 'admin',
  }, studentToken)
  // Either role modification is ignored or rejected
  const verifyStudentRole = await apiRequest('/api/profile', 'GET', null, studentToken)
  assert(verifyStudentRole.data?.user?.role === 'student', 'Student role is strictly IMMUTABLE through profile edit')

  // -------------------------------------------------------------------------
  // TEST SUITE 6: CRUD Operations & Safe Deletion
  // -------------------------------------------------------------------------
  console.log('\nTEST SUITE 6: CRUD Operations & Safe Deletion')

  // Create temporary student record for CRUD testing
  const tempStudentId = `DUC-TEMP-${Date.now().toString().slice(-4)}`
  const createTemp = await apiRequest('/api/student/register', 'POST', {
    studentId: tempStudentId,
    fullName: 'Temporary CRUD Test Student',
    gender: 'Male',
    campus: 'Main Campus',
    department: 'Computer Science',
    program: 'Regular Degree',
    yearOfStudy: '1',
    academicYear: '2023/2024',
    isNonCafeteria: true,
  }, adminToken)
  assert(createTemp.status === 200, `Temporary student record created (HTTP 200) for ID: ${tempStudentId}`)

  // Student is FORBIDDEN from deleting records
  const studentDeleteAttempt = await apiRequest(`/api/users?id=${tempStudentId}`, 'DELETE', null, studentToken)
  assert(studentDeleteAttempt.status === 403, 'Student is strictly FORBIDDEN from deleting records (HTTP 403)')

  // Dean cannot delete student from another campus
  const deanDeleteCrossCampus = await apiRequest('/api/users?id=DUC-ODAYA-001', 'DELETE', null, deanToken)
  assert(deanDeleteCrossCampus.status === 403, 'Campus Dean is FORBIDDEN from deleting students of another campus (HTTP 403)')

  // Admin deletes temporary student with confirmation & cascade
  const adminDelete = await apiRequest(`/api/users?id=${tempStudentId}`, 'DELETE', null, adminToken)
  assert(adminDelete.status === 200, 'Super Admin can delete authorized student record with cascade (HTTP 200)')

  // Verify record is gone from DB
  const verifyGone = await apiRequest(`/api/profile?id=${tempStudentId}`, 'GET', null, adminToken)
  assert(verifyGone.status === 404 || !verifyGone.data?.student, 'Deleted record no longer exists in system')

  console.log('\n======================================================================')
  console.log(`TOTAL PHASE 1 TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`)
  console.log('======================================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

main().catch((e) => {
  console.error('Test run failed with error:', e)
  process.exit(1)
})
