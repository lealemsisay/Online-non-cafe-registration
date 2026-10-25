import { pgTable, pgEnum, text, uuid, boolean, timestamp, integer } from 'drizzle-orm/pg-core';

// Enums
const registrationStatusEnum = pgEnum('registration_status', ['draft', 'submitted']);
const applicationStatusEnum = pgEnum('application_status', ['submitted', 'dean-review', 'super-admin-review', 'approved', 'rejected']);
const approvalStatusEnum = pgEnum('approval_status', ['pending', 'approved', 'rejected']);
const isNonCafeteriaEnum = pgEnum('is_non_cafeteria', ['false', 'true']);

// Student table - maps to prisma.Student
export const students = pgTable('student', {
  id: uuid('id').defaultRandom().primaryKey(),
  studentId: text('studentId').unique(),
  fullName: text('fullName'),
  gender: text('gender'),
  campus: text('campus'),
  department: text('department'),
  program: text('program'),
  yearOfStudy: text('yearOfStudy'),
  phone: text('phone'),
  email: text('email'),
  photoUrl: text('photo_url'),
  academicYear: text('academicYear'),
  isNonCafeteria: isNonCafeteriaEnum('is_non_cafeteria').default('false'),
  registrationStatus: registrationStatusEnum('registration_status').default('draft'),
  applicationStatus: applicationStatusEnum('application_status').default('submitted'),
  deanFinding: text('dean_review'),
  deanComments: text('dean_comments'),
  superAdminFinding: text('super_admin_review'),
  superAdminComments: text('super_admin_comments'),
  approvalStatus: approvalStatusEnum('approval_status').default('pending'),
  rejectedAt: timestamp('rejected_at'),
  rejectedReason: text('rejected_reason'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
});

// Campus table - maps to prisma.Campus
export const campuses = pgTable('campus', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').unique(),
  code: text('code'),
  deanId: uuid('dean_id'),
  status: text('status').default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
});

// AcademicYear table - maps to prisma.AcademicYear
export const academicYears = pgTable('academic_year', {
  id: uuid('id').defaultRandom().primaryKey(),
  year: text('year').unique(),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  isActive: boolean('is_active').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// AuditLog table - maps to prisma.AuditLog
export const auditLogs = pgTable('audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  action: text('action'),
  performedBy: text('performed_by'),
  targetId: text('target_id'),
  targetType: text('target_type'),
  details: text('details'),
  createdAt: timestamp('created_at').defaultNow(),
});