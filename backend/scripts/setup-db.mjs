import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env'), override: true })

let APP_URL = process.env.DATABASE_URL || 'postgresql://postgres:allah123@localhost:5432/dilla_university'
if (APP_URL.startsWith('postgresql://postgres@localhost') || APP_URL.startsWith('postgresql://postgres:5432')) {
  APP_URL = APP_URL.replace('postgresql://postgres@', 'postgresql://postgres:allah123@')
}
const ADMIN_URL = APP_URL.replace(/\/[^/]*$/, '/postgres')
const DB_NAME = new URL(APP_URL).pathname.slice(1)
const { Client } = pg

async function run() {
  const admin = new Client({ connectionString: ADMIN_URL })
  await admin.connect()
  const existing = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [DB_NAME])
  if (existing.rowCount === 0) {
    await admin.query(`CREATE DATABASE "${DB_NAME}"`)
    console.log(`Created database ${DB_NAME}`)
  } else {
    console.log(`Database ${DB_NAME} already exists`)
  }
  await admin.end()

  const db = new Client({ connectionString: APP_URL })
  await db.connect()
  const ddl = `
    CREATE TABLE IF NOT EXISTS app_user (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      username text UNIQUE NOT NULL,
      password_hash text NOT NULL,
      alt_password_hash text,
      full_name text NOT NULL,
      role text NOT NULL CHECK (role IN ('student','dean','admin')),
      campus text,
      email text,
      status text NOT NULL DEFAULT 'active',
      must_change_password boolean NOT NULL DEFAULT false,
      onboarding_status text NOT NULL DEFAULT 'profile_completion_required',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    ALTER TABLE app_user ADD COLUMN IF NOT EXISTS alt_password_hash text;
    ALTER TABLE app_user ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
    ALTER TABLE app_user ADD COLUMN IF NOT EXISTS photo_url text;
    ALTER TABLE app_user ADD COLUMN IF NOT EXISTS phone text;
    ALTER TABLE app_user ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;
    ALTER TABLE app_user ADD COLUMN IF NOT EXISTS onboarding_status text NOT NULL DEFAULT 'profile_completion_required';

    UPDATE app_user u
       SET onboarding_status = CASE
         WHEN EXISTS (
           SELECT 1 FROM student s
           WHERE LOWER(s.student_id) = LOWER(u.username) AND s.profile_complete = true
         ) THEN 'completed'
         WHEN u.must_change_password = true THEN 'password_change_required'
         ELSE 'profile_completion_required'
       END
     WHERE u.role = 'student';

    ALTER TABLE app_user DROP CONSTRAINT IF EXISTS app_user_onboarding_status_check;
    ALTER TABLE app_user ADD CONSTRAINT app_user_onboarding_status_check
      CHECK (onboarding_status IN ('imported','password_change_required','profile_completion_required','completed'));
    ALTER TABLE app_user DROP CONSTRAINT IF EXISTS app_user_role_check;
    ALTER TABLE app_user ADD CONSTRAINT app_user_role_check CHECK (role IN ('student','dean','admin','viceDean'));

    CREATE TABLE IF NOT EXISTS system_setting (
      key text PRIMARY KEY,
      value text NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    INSERT INTO system_setting (key, value)
    VALUES ('max_photo_size_mb', '8')
    ON CONFLICT (key) DO NOTHING;

    CREATE TABLE IF NOT EXISTS student (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id text UNIQUE NOT NULL,
      full_name text NOT NULL,
      gender text,
      campus text,
      department text,
      program text,
      year_of_study text,
      phone text,
      email text,
      academic_year text,
      is_non_cafeteria boolean NOT NULL DEFAULT false,
      registration_status text NOT NULL DEFAULT 'draft',
      application_status text NOT NULL DEFAULT 'submitted',
      dean_review text,
      dean_comments text,
      super_admin_review text,
      super_admin_comments text,
      approval_status text NOT NULL DEFAULT 'pending',
      approved_at timestamptz,
      rejected_at timestamptz,
      rejected_reason text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    ALTER TABLE student ADD COLUMN IF NOT EXISTS photo_url text;
    ALTER TABLE student ADD COLUMN IF NOT EXISTS registrar_id text;
    ALTER TABLE student ADD COLUMN IF NOT EXISTS profile_complete boolean NOT NULL DEFAULT false;
    ALTER TABLE student ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;
    ALTER TABLE student ADD COLUMN IF NOT EXISTS archived_at timestamptz;
    ALTER TABLE student ADD COLUMN IF NOT EXISTS archived_by text;

    CREATE TABLE IF NOT EXISTS campus (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text UNIQUE NOT NULL,
      code text,
      dean_id uuid,
      status text NOT NULL DEFAULT 'active',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS academic_year (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      year text UNIQUE NOT NULL,
      start_date date,
      end_date date,
      is_active boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      action text,
      performed_by text,
      target_id text,
      target_type text,
      details text,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS document_metadata (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      filename text,
      path text,
      student_id text,
      uploaded_at timestamptz
    );

    CREATE TABLE IF NOT EXISTS custom_field_definition (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      field_key text NOT NULL,
      label text NOT NULL,
      field_type text NOT NULL CHECK (field_type IN ('text', 'textarea', 'number', 'date', 'select', 'checkbox')),
      options jsonb DEFAULT '[]'::jsonb,
      is_required boolean NOT NULL DEFAULT false,
      is_active boolean NOT NULL DEFAULT true,
      campus text,
      created_by text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    ALTER TABLE custom_field_definition DROP CONSTRAINT IF EXISTS custom_field_definition_field_type_check;
    ALTER TABLE custom_field_definition ADD CONSTRAINT custom_field_definition_field_type_check 
      CHECK (field_type IN ('text', 'textarea', 'number', 'email', 'phone', 'tel', 'date', 'select', 'radio', 'checkbox', 'file', 'department', 'batch', 'academic_year'));

    ALTER TABLE custom_field_definition ADD COLUMN IF NOT EXISTS placeholder text;
    ALTER TABLE custom_field_definition ADD COLUMN IF NOT EXISTS help_text text;
    ALTER TABLE custom_field_definition ADD COLUMN IF NOT EXISTS is_student_editable boolean NOT NULL DEFAULT true;
    ALTER TABLE custom_field_definition ADD COLUMN IF NOT EXISTS visible_student boolean NOT NULL DEFAULT true;
    ALTER TABLE custom_field_definition ADD COLUMN IF NOT EXISTS visible_admin boolean NOT NULL DEFAULT true;
    ALTER TABLE custom_field_definition ADD COLUMN IF NOT EXISTS visible_dean boolean NOT NULL DEFAULT true;
    ALTER TABLE custom_field_definition ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;
    ALTER TABLE custom_field_definition ADD COLUMN IF NOT EXISTS validation_rules jsonb DEFAULT '{}'::jsonb;
    ALTER TABLE custom_field_definition ADD COLUMN IF NOT EXISTS applies_to text NOT NULL DEFAULT 'all';

    INSERT INTO system_setting (key, value)
    VALUES 
      ('departments', '["Computer Science", "Information Technology", "Software Engineering", "Business Administration", "Economics", "Civil Engineering", "Electrical Engineering", "Medicine & Health Sciences", "Nursing", "Law", "Agriculture & Natural Resources"]'),
      ('batches', '["2021", "2022", "2023", "2024", "2025", "2026"]'),
      ('programs', '["Regular Degree", "Continuing Education", "Postgraduate Degree"]')
    ON CONFLICT (key) DO NOTHING;

    CREATE TABLE IF NOT EXISTS student_custom_value (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id text NOT NULL,
      field_id uuid NOT NULL REFERENCES custom_field_definition(id) ON DELETE CASCADE,
      field_key text NOT NULL,
      value text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT student_field_unique UNIQUE(student_id, field_id)
    );

    CREATE TABLE IF NOT EXISTS campus_submission (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      batch_number text UNIQUE NOT NULL,
      campus text NOT NULL,
      submitted_by text NOT NULL,
      student_count integer NOT NULL DEFAULT 0,
      student_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
      filters_applied jsonb,
      notes text,
      status text NOT NULL DEFAULT 'submitted',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS app_notification (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      recipient_id text,
      recipient_role text,
      campus text,
      title text NOT NULL,
      message text NOT NULL,
      type text NOT NULL DEFAULT 'info',
      link text,
      is_read boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS report_history (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      report_type text NOT NULL,
      creator_username text NOT NULL,
      creator_role text NOT NULL,
      campus_scope text,
      parameters jsonb DEFAULT '{}'::jsonb,
      file_format text NOT NULL,
      record_count integer NOT NULL DEFAULT 0,
      status text NOT NULL DEFAULT 'completed',
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_student_registrar_id ON student (LOWER(registrar_id)) WHERE registrar_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_student_archived ON student (is_archived);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_field_definition_key ON custom_field_definition(field_key);
    CREATE INDEX IF NOT EXISTS idx_custom_field_def_campus ON custom_field_definition(campus, is_active);
    CREATE INDEX IF NOT EXISTS idx_student_custom_val_student ON student_custom_value(student_id);
    CREATE INDEX IF NOT EXISTS idx_campus_submission_campus ON campus_submission(campus, status);
    CREATE INDEX IF NOT EXISTS idx_app_notification_recipient ON app_notification(recipient_id, recipient_role, campus, is_read);
    CREATE INDEX IF NOT EXISTS idx_report_history_creator ON report_history(creator_username, campus_scope, created_at DESC);

    -- Built-in registration field configuration (editable by Super Admin)
    CREATE TABLE IF NOT EXISTS builtin_field_config (
      field_key text PRIMARY KEY,
      label text NOT NULL,
      description text,
      field_type text NOT NULL DEFAULT 'text',
      is_required boolean NOT NULL DEFAULT true,
      is_active boolean NOT NULL DEFAULT true,
      is_protected boolean NOT NULL DEFAULT false,
      display_order integer NOT NULL DEFAULT 0,
      applies_to text NOT NULL DEFAULT 'all',
      visible_student boolean NOT NULL DEFAULT true,
      visible_dean boolean NOT NULL DEFAULT true,
      visible_admin boolean NOT NULL DEFAULT true,
      validation_rules jsonb DEFAULT '{}'::jsonb,
      updated_at timestamptz NOT NULL DEFAULT now(),
      updated_by text
    );

    INSERT INTO builtin_field_config (field_key, label, description, field_type, is_required, is_active, is_protected, display_order, applies_to, visible_student, visible_dean, visible_admin, updated_by)
    VALUES
      ('photoUrl', 'Student Passport Photo', '3:4 aspect ratio passport-size photo', 'image', true, true, false, 1, 'all', true, true, true, 'system'),
      ('studentId', 'Student Identification Number', 'Unique admission number (e.g. DUC2023-001)', 'text', true, true, true, 2, 'all', true, true, true, 'system'),
      ('fullName', 'Full Student Name', 'First, middle, and last name', 'text', true, true, true, 3, 'all', true, true, true, 'system'),
      ('gender', 'Gender', 'Institutional gender classification', 'select', true, true, false, 4, 'all', true, true, true, 'system'),
      ('campus', 'Enrolled Campus', 'Assigned University campus', 'select', true, true, false, 5, 'all', true, true, true, 'system'),
      ('department', 'Department / Discipline', 'Academic department', 'department', true, true, false, 6, 'all', true, true, true, 'system'),
      ('program', 'Program Type', 'Regular Degree, Continuing, or Postgraduate', 'select', true, true, false, 7, 'all', true, true, true, 'system'),
      ('yearOfStudy', 'Year of Study', 'Academic level (Year 1 to Year 5)', 'select', true, true, false, 8, 'all', true, true, true, 'system'),
      ('academicYear', 'Academic Year', 'Current academic calendar', 'academic_year', true, true, false, 9, 'all', true, true, true, 'system'),
      ('phone', 'Phone Number', 'Student mobile contact', 'phone', false, true, false, 10, 'all', true, true, true, 'system'),
      ('email', 'Email Address', 'Institutional student email', 'email', false, true, false, 11, 'all', true, true, true, 'system'),
      ('pdfFileName', 'PDF Registration Slip', 'Official registrar verification document', 'file', true, true, false, 12, 'all', true, true, true, 'system'),
      ('isNonCafeteria', 'Non-Cafeteria Subsidy Declaration', 'Cost-sharing legal declaration', 'checkbox', true, true, false, 13, 'all', true, true, true, 'system')
    ON CONFLICT (field_key) DO UPDATE SET
      label = EXCLUDED.label,
      description = EXCLUDED.description,
      field_type = EXCLUDED.field_type,
      is_required = EXCLUDED.is_required,
      is_active = EXCLUDED.is_active,
      is_protected = EXCLUDED.is_protected,
      display_order = EXCLUDED.display_order,
      applies_to = EXCLUDED.applies_to,
      visible_student = EXCLUDED.visible_student,
      visible_dean = EXCLUDED.visible_dean,
      visible_admin = EXCLUDED.visible_admin,
      validation_rules = EXCLUDED.validation_rules,
      updated_at = NOW();
  `
  await db.query(ddl)
  console.log('All tables present (idempotent DDL complete)')
  await db.end()
}

run().catch((err) => {
  console.error('DB setup failed:', err.message)
  process.exit(1)
})
