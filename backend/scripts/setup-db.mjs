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
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    ALTER TABLE app_user ADD COLUMN IF NOT EXISTS alt_password_hash text;

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
  `
  await db.query(ddl)
  console.log('All tables present (idempotent DDL complete)')
  await db.end()
}

run().catch((err) => {
  console.error('DB setup failed:', err.message)
  process.exit(1)
})
