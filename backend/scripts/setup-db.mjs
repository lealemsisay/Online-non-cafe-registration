import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env'), override: true })

let APP_URL = process.env.DATABASE_URL || 'postgresql://postgres:0317@localhost:5432/dilla_university'
if (APP_URL.startsWith('postgresql://postgres@localhost') || APP_URL.startsWith('postgresql://postgres:5432')) {
  APP_URL = APP_URL.replace('postgresql://postgres@', 'postgresql://postgres:0317@')
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
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    ALTER TABLE app_user ADD COLUMN IF NOT EXISTS alt_password_hash text;
    ALTER TABLE app_user ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

    CREATE TABLE IF NOT EXISTS system_setting (
      key text PRIMARY KEY,
      value text NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    );

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

    CREATE INDEX IF NOT EXISTS idx_custom_field_def_campus ON custom_field_definition(campus, is_active);
    CREATE INDEX IF NOT EXISTS idx_student_custom_val_student ON student_custom_value(student_id);
    CREATE INDEX IF NOT EXISTS idx_campus_submission_campus ON campus_submission(campus, status);
    CREATE INDEX IF NOT EXISTS idx_app_notification_recipient ON app_notification(recipient_id, recipient_role, campus, is_read);
    CREATE INDEX IF NOT EXISTS idx_report_history_creator ON report_history(creator_username, campus_scope, created_at DESC);
  `
  await db.query(ddl)
  console.log('All tables present (idempotent DDL complete)')
  await db.end()
}

run().catch((err) => {
  console.error('DB setup failed:', err.message)
  process.exit(1)
})
