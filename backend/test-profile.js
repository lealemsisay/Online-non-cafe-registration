import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: '.env', override: true })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

;(async () => {
  try {
    const client = await pool.connect()
    try {
      // Test 1: Query app_user with the UUID from the error - FIXED query (no phone column)
      const testId = 'f69cb84a-3a9e-454e-bfe0-0928179a3324'
      console.log(`\n=== Test 1: Query app_user with ID: ${testId} ===`)
      const userRes = await client.query(
        'SELECT id, username, full_name AS "fullName", role, campus, email, photo_url AS "photoUrl" FROM app_user WHERE id::text = $1 OR LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1)',
        [testId]
      )
      console.log('app_user rows:', userRes.rows.length)
      userRes.rows.forEach(r => console.log('  - id:', r.id, 'username:', r.username, 'role:', r.role))
      
      // Test 2: Check if this UUID is a student
      console.log(`\n=== Test 2: Check if ${testId} is a student ===`)
      const studentRes = await client.query(
        `SELECT id, student_id AS "studentId", full_name AS "fullName", gender, campus, department, program, year_of_study AS "yearOfStudy", phone, email, photo_url AS "photoUrl", academic_year AS "academicYear", is_non_cafeteria AS "isNonCafeteria", registration_status AS "registrationStatus", application_status AS "applicationStatus", dean_review AS "deanReview", dean_comments AS "deanComments", super_admin_review AS "superAdminReview", super_admin_comments AS "superAdminComments", approval_status AS "approvalStatus", created_at AS "createdAt", updated_at AS "updatedAt" FROM student WHERE id::text = $1 OR LOWER(student_id) = LOWER($1) OR LOWER(student_id) = LOWER($2)`,
        [testId, testId]  // using testId as both params
      )
      console.log('student rows:', studentRes.rows.length)
      studentRes.rows.forEach(r => console.log('  - studentId:', r.studentId, 'fullName:', r.fullName, 'campus:', r.campus))
      
      // Test 3: What does the profile API construct?
      console.log(`\n=== Test 3: Construct response for ${testId} ===`)
      const foundUser = userRes.rows[0] || null
      const foundStudent = studentRes.rows[0] || null
      
      if (foundUser) {
        console.log('Found app_user:', {
          id: foundUser.id,
          username: foundUser.username,
          role: foundUser.role,
          campus: foundUser.campus
        })
      }
      if (foundStudent) {
        console.log('Found student:', {
          studentId: foundStudent.studentId,
          fullName: foundStudent.fullName,
          campus: foundStudent.campus,
          department: foundStudent.department
        })
      }
      
      // Test 4: What would the response user object look like?
      console.log(`\n=== Test 4: Response user object ===`)
      const responseUser = {
        id: foundUser ? foundUser.id : foundStudent.id,
        studentId: foundUser ? foundUser.username : foundStudent.studentId,
        username: foundUser ? foundUser.username : foundStudent.studentId,
        name: foundUser ? foundUser.fullName : foundStudent.fullName,
        fullName: foundUser ? foundUser.fullName : foundStudent.fullName,
        role: foundUser ? foundUser.role : 'student',
        campus: (foundUser && foundUser.campus) || (foundStudent && foundStudent.campus) || '',
        email: (foundUser && foundUser.email) || (foundStudent && foundStudent.email) || '',
        phone: (foundStudent && foundStudent.phone) || (foundUser && foundUser.username === 'student' ? 'Student@Dilla2026!' : '') || '',
        photoUrl: (foundStudent && foundStudent.photoUrl) || (foundUser && foundUser.photoUrl) || null,
        department: foundStudent ? foundStudent.department : null,
        program: foundStudent ? foundStudent.program : null,
        yearOfStudy: foundStudent ? foundStudent.yearOfStudy : null,
        academicYear: foundStudent ? foundStudent.academicYear : null,
        registrationStatus: foundStudent ? foundStudent.registrationStatus : null,
        applicationStatus: foundStudent ? foundStudent.applicationStatus : null,
        approvalStatus: foundStudent ? foundStudent.approvalStatus : null,
      }
      console.log('Response user:', JSON.stringify(responseUser, null, 2))
      
    } finally {
      await client.release()
    }
    await pool.end()
  } catch (e) {
    console.error('Error:', e.message)
    console.error(e.stack)
    await pool.end()
    process.exit(1)
  }
})()