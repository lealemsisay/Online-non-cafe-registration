#!/usr/bin/env node
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { hashPassword } from '../lib/auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '../..')
const backendDir = path.resolve(__dirname, '..')

dotenv.config({ path: path.join(backendDir, '.env'), override: true })

// Guard: NEVER seed development credentials in production
if (process.env.NODE_ENV === 'production') {
  console.error('ERROR: Seed aborted! Refusing to seed development accounts in production environment.')
  process.exit(1)
}

let APP_URL = process.env.DATABASE_URL || 'postgresql://postgres:allah123@localhost:5432/dilla_university'
if (APP_URL.startsWith('postgresql://postgres@localhost') || APP_URL.startsWith('postgresql://postgres:5432')) {
  APP_URL = APP_URL.replace('postgresql://postgres@', 'postgresql://postgres:allah123@')
}

const { Client } = await import('pg')
const client = new Client({ connectionString: APP_URL })

// Legitimate development test accounts for all supported roles
const devAccounts = [
  {
    roleName: 'Super Admin',
    role: 'admin',
    username: 'admin',
    email: 'admin@dilla.edu.et',
    password: 'Admin@Dilla2026!',
    altPassword: 'admin@123',
    fullName: 'System Super Admin',
    campus: 'Main Campus',
    dashboardUrl: '/admin',
  },
  {
    roleName: 'Campus Dean / Campus Admin (Primary)',
    role: 'dean',
    username: 'dean.main',
    email: 'dean.main@dilla.edu.et',
    password: 'Dean@Dilla2026!',
    altPassword: 'dean@123',
    fullName: 'Dr. K. Omondi (Campus Dean)',
    campus: 'Main Campus',
    dashboardUrl: '/dean',
  },
  {
    roleName: 'Campus Dean / Campus Admin (Alias)',
    role: 'dean',
    username: 'dean',
    email: 'dean@dilla.edu.et',
    password: 'Dean@Dilla2026!',
    altPassword: 'dean@123',
    fullName: 'Dr. K. Omondi (Campus Dean)',
    campus: 'Main Campus',
    dashboardUrl: '/dean',
  },
  {
    roleName: 'Student (Primary ID)',
    role: 'student',
    username: 'DUC2023-001',
    email: 'student.demo@dilla.edu.et',
    password: 'Student@Dilla2026!',
    altPassword: 'student@123',
    fullName: 'John Kamau (Demo Student)',
    campus: 'Main Campus',
    dashboardUrl: '/',
  },
  {
    roleName: 'Student (Convenient Alias)',
    role: 'student',
    username: 'student',
    email: 'student@dilla.edu.et',
    password: 'Student@Dilla2026!',
    altPassword: 'student@123',
    fullName: 'John Kamau (Demo Student)',
    campus: 'Main Campus',
    dashboardUrl: '/',
  },
]

// Campuses to seed
const devCampuses = [
  { name: 'Main Campus', code: 'MC', status: 'active' },
  { name: 'Kakamega Campus', code: 'KC', status: 'active' },
  { name: 'Eldoret Campus', code: 'EC', status: 'inactive' },
]

// Academic years to seed
const devAcademicYears = [
  { year: '2023/2024', startDate: '2023-09-01', endDate: '2024-06-30', isActive: true },
  { year: '2024/2025', startDate: '2024-09-01', endDate: '2025-06-30', isActive: false },
]

// Demo student records for end-to-end workflow testing
const devStudents = [
  {
    studentId: 'DUC2023-001',
    fullName: 'John Kamau',
    gender: 'Male',
    campus: 'Main Campus',
    department: 'Computer Science',
    program: 'Regular Degree',
    yearOfStudy: '3',
    phone: '+251-911-000001',
    email: 'student.demo@dilla.edu.et',
    academicYear: '2023/2024',
    isNonCafeteria: true,
    registrationStatus: 'submitted',
    applicationStatus: 'submitted',
    approvalStatus: 'pending',
  },
  {
    studentId: 'student',
    fullName: 'John Kamau (Demo Student)',
    gender: 'Male',
    campus: 'Main Campus',
    department: 'Computer Science',
    program: 'Regular Degree',
    yearOfStudy: '3',
    phone: '+251-911-000001',
    email: 'student@dilla.edu.et',
    academicYear: '2023/2024',
    isNonCafeteria: true,
    registrationStatus: 'submitted',
    applicationStatus: 'submitted',
    approvalStatus: 'pending',
  },
  {
    studentId: 'DUC2023-045',
    fullName: 'Wangari Njuguna',
    gender: 'Female',
    campus: 'Main Campus',
    department: 'Business',
    program: 'Regular Degree',
    yearOfStudy: '2',
    phone: '+251-911-000045',
    email: 'wangari@dilla.edu.et',
    academicYear: '2023/2024',
    isNonCafeteria: true,
    registrationStatus: 'submitted',
    applicationStatus: 'dean-review',
    deanReview: 'registered',
    deanComments: 'PDF verified - registered beneficiary',
    approvalStatus: 'pending',
  },
  {
    studentId: 'DUC2023-078',
    fullName: 'Peter Otieno',
    gender: 'Male',
    campus: 'Kakamega Campus',
    department: 'Engineering',
    program: 'Regular Degree',
    yearOfStudy: '4',
    phone: '+251-911-000078',
    email: 'peter@dilla.edu.et',
    academicYear: '2023/2024',
    isNonCafeteria: true,
    registrationStatus: 'submitted',
    applicationStatus: 'super-admin-review',
    deanReview: 'registered',
    deanComments: 'Dean verification complete',
    approvalStatus: 'pending',
  },
]

async function seed() {
  await client.connect()
  console.log('Connected to PostgreSQL database:', APP_URL.replace(/:[^:@]+@/, ':***@'))

  // 1. Seed Academic Years (Idempotent)
  for (const ay of devAcademicYears) {
    await client.query(
      `INSERT INTO academic_year (year, start_date, end_date, is_active)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (year) DO NOTHING`,
      [ay.year, ay.startDate, ay.endDate, ay.isActive]
    )
  }
  console.log('✓ Academic years verified/seeded')

  // 2. Seed Campuses (Idempotent)
  for (const c of devCampuses) {
    await client.query(
      `INSERT INTO campus (name, code, status)
       VALUES ($1, $2, $3)
       ON CONFLICT (name) DO UPDATE SET code = EXCLUDED.code, status = EXCLUDED.status`,
      [c.name, c.code, c.status]
    )
  }
  console.log('✓ Campuses verified/seeded')

  // 3. Seed Dev Users into app_user (Idempotent, safe for dev accounts)
  for (const u of devAccounts) {
    const hash = await hashPassword(u.password)
    const altHash = u.altPassword ? await hashPassword(u.altPassword) : null
    const res = await client.query(
      `INSERT INTO app_user (username, password_hash, alt_password_hash, full_name, role, campus, email)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (username) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           alt_password_hash = EXCLUDED.alt_password_hash,
           full_name = EXCLUDED.full_name,
           role = EXCLUDED.role,
           campus = EXCLUDED.campus,
           email = EXCLUDED.email,
           updated_at = NOW()
       RETURNING id`,
      [u.username, hash, altHash, u.fullName, u.role, u.campus, u.email]
    )

    // If this is the dean, link dean_id in the campus table
    if (u.role === 'dean' && res.rows[0]?.id && (u.username === 'dean.main' || u.username === 'dean')) {
      await client.query(
        `UPDATE campus SET dean_id = $1 WHERE name = $2`,
        [res.rows[0].id, u.campus]
      )
    }
  }
  console.log('✓ Development accounts seeded/updated idempotently')

  // 4. Seed Student records (Idempotent)
  for (const s of devStudents) {
    await client.query(
      `INSERT INTO student (
         student_id, full_name, gender, campus, department, program,
         year_of_study, phone, email, academic_year, is_non_cafeteria,
         registration_status, application_status, dean_review, dean_comments, approval_status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       ON CONFLICT (student_id) DO UPDATE
       SET full_name = EXCLUDED.full_name,
           gender = EXCLUDED.gender,
           campus = EXCLUDED.campus,
           department = EXCLUDED.department,
           program = EXCLUDED.program,
           year_of_study = EXCLUDED.year_of_study,
           academic_year = EXCLUDED.academic_year,
           is_non_cafeteria = EXCLUDED.is_non_cafeteria,
           application_status = EXCLUDED.application_status,
           dean_review = COALESCE(EXCLUDED.dean_review, student.dean_review),
           dean_comments = COALESCE(EXCLUDED.dean_comments, student.dean_comments),
           approval_status = EXCLUDED.approval_status`,
      [
        s.studentId,
        s.fullName,
        s.gender,
        s.campus,
        s.department,
        s.program,
        s.yearOfStudy,
        s.phone,
        s.email,
        s.academicYear,
        s.isNonCafeteria,
        s.registrationStatus,
        s.applicationStatus,
        s.deanReview || null,
        s.deanComments || null,
        s.approvalStatus,
      ]
    )
  }
  console.log('✓ Student registration records verified/seeded')

  await client.end()

  // 5. Write local, non-committed credentials file
  const credentialsJson = {
    warning: 'DEVELOPMENT USE ONLY - DO NOT COMMIT OR EXPOSE IN PRODUCTION',
    generatedAt: new Date().toISOString(),
    backendUrl: 'http://localhost:3000',
    frontendUrl: 'http://localhost:5173',
    accounts: devAccounts.map(a => ({
      roleName: a.roleName,
      role: a.role,
      username: a.username,
      email: a.email,
      password: a.password,
      fullName: a.fullName,
      campus: a.campus,
      targetDashboard: a.dashboardUrl,
    }))
  }

  const jsonFilePath = path.join(backendDir, '.dev-credentials.json')
  fs.writeFileSync(jsonFilePath, JSON.stringify(credentialsJson, null, 2), 'utf-8')

  const docFilePath = path.join(rootDir, 'DEV_CREDENTIALS.md')
  const docContent = `# Dilla University Cost-Sharing System - Development Credentials

> **Notice:** This file is local to development and is ignored by Git. Do not share or commit credentials.

## Application URLs
- **Frontend (Vite + React):** [http://localhost:5173](http://localhost:5173)
- **Backend (Next.js API):** [http://localhost:3000](http://localhost:3000)

---

## Development Accounts

You can log in with **either** the Strong Development Password or the Simple Development Password. Both are fully enabled in PostgreSQL. Login identifiers are case-insensitive.

| Role | Role Name | Login Identifier(s) | Primary Password | Simple Dev Password | Target Dashboard |
|------|-----------|---------------------|------------------|---------------------|------------------|
| \`admin\` | **Super Admin** | \`admin\`, \`admin@dilla.edu.et\` | \`Admin@Dilla2026!\` | \`admin@123\` | \`/admin\` |
| \`dean\` | **Campus Dean** | \`dean.main\`, \`dean\`, \`dean.main@dilla.edu.et\` | \`Dean@Dilla2026!\` | \`dean@123\` | \`/dean\` |
| \`student\` | **Student** | \`DUC2023-001\`, \`student\`, \`student.demo@dilla.edu.et\` | \`Student@Dilla2026!\` | \`student@123\` | \`/\` |

---

## Test Accounts Capabilities
1. **Super Admin (\`admin\`):**
   - Access: \`/admin\` (Dashboard, Campuses, Deans, Applications, Reports, Settings)
   - Final approval/rejection of applications (\`/api/approval/final\`)
   - Campus management (\`/api/campuses\`)
   - Dean user account management (\`/api/users?type=dean\`)

2. **Campus Dean (\`dean.main\` / \`dean\`):**
   - Access: \`/dean\` (Dean Dashboard, Application Review queue)
   - Review applications & record findings (\`/api/review/submit\`)
   - Scoped to Main Campus records

3. **Student (\`DUC2023-001\` / \`student\`):**
   - Access: \`/\` (Student Portal) & \`/student/register\` (Registration Form)
   - Submit cost-sharing registration application (\`/api/student/register\`)
   - View registration status and profile
`
  fs.writeFileSync(docFilePath, docContent, 'utf-8')

  // Print summary table to console
  console.log('\n================================================================================')
  console.log('              DILLA UNIVERSITY - DEVELOPMENT TEST ACCOUNTS                     ')
  console.log('================================================================================')
  console.log('  Role:        SUPER ADMIN')
  console.log('  Logins:      admin  OR  admin@dilla.edu.et')
  console.log('  Passwords:   Admin@Dilla2026!  (or simple: admin@123)')
  console.log('  Route:       /admin')
  console.log('--------------------------------------------------------------------------------')
  console.log('  Role:        CAMPUS DEAN')
  console.log('  Logins:      dean.main  OR  dean  OR  dean.main@dilla.edu.et')
  console.log('  Passwords:   Dean@Dilla2026!  (or simple: dean@123)')
  console.log('  Route:       /dean')
  console.log('--------------------------------------------------------------------------------')
  console.log('  Role:        STUDENT')
  console.log('  Logins:      DUC2023-001  OR  student  OR  student.demo@dilla.edu.et')
  console.log('  Passwords:   Student@Dilla2026!  (or simple: student@123)')
  console.log('  Route:       /')
  console.log('================================================================================')
  console.log(`Local credentials saved to: ${jsonFilePath} (gitignored)`)
  console.log(`Documentation saved to:     ${docFilePath} (gitignored)\n`)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
