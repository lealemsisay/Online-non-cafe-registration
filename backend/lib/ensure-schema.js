// Idempotent: creates missing tables / adds missing columns. Runs once per server start.
// (Same DDL as scripts/setup-db.mjs, so `npm run setup-db` is no longer required after pulling updates.)
const DDL = `
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
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    ALTER TABLE app_user ADD COLUMN IF NOT EXISTS alt_password_hash text;
    ALTER TABLE app_user ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
    ALTER TABLE app_user ADD COLUMN IF NOT EXISTS photo_url text;
    ALTER TABLE app_user ADD COLUMN IF NOT EXISTS phone text;
    ALTER TABLE app_user ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

    CREATE TABLE IF NOT EXISTS system_setting (
      key text PRIMARY KEY,
      value text NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    INSERT INTO system_setting (key, value)
    VALUES ('max_photo_size_mb', '10')
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
  `

// Phase 2 (governance) migrations. Run separately from the base DDL so a failure here
// can never roll back or break the base schema. All statements are idempotent.
const DDL_PHASE2 = `
    CREATE TABLE IF NOT EXISTS department (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      code text,
      campus text,
      is_active boolean NOT NULL DEFAULT true,
      created_by text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    ALTER TABLE department ADD COLUMN IF NOT EXISTS code text;
    ALTER TABLE department ADD COLUMN IF NOT EXISTS campus text;
    ALTER TABLE department ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
    ALTER TABLE department ADD COLUMN IF NOT EXISTS created_by text;

    CREATE UNIQUE INDEX IF NOT EXISTS uq_department_name_scope
      ON department (LOWER(name), COALESCE(LOWER(campus), ''));

    -- Cafe / Non-Cafe scope of custom fields (also added by setup-db.mjs; needed on databases built only by ensureSchema)
    ALTER TABLE custom_field_definition ADD COLUMN IF NOT EXISTS applies_to text NOT NULL DEFAULT 'all';

    ALTER TABLE academic_year ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
    ALTER TABLE academic_year ADD COLUMN IF NOT EXISTS updated_by text;

    -- Only one academic year may be active at a time. If older data has several,
    -- keep the most recently created one active and deactivate the rest.
    UPDATE academic_year
       SET is_active = false
     WHERE is_active = true
       AND id <> (SELECT id FROM academic_year WHERE is_active = true ORDER BY created_at DESC, year DESC LIMIT 1);

    CREATE UNIQUE INDEX IF NOT EXISTS uq_academic_year_single_active
      ON academic_year (is_active) WHERE is_active = true;
  `

const DEFAULT_DEPARTMENTS = [
  'Computer Science',
  'Information Technology',
  'Software Engineering',
  'Business Administration',
  'Economics',
  'Civil Engineering',
  'Electrical Engineering',
  'Medicine & Health Sciences',
  'Nursing',
  'Law',
  'Agriculture & Natural Resources',
]

// One-time import of the old JSON department list (system_setting) and of any
// department names already used by students into the new department table.
async function migrateDepartments(client) {
  const flag = await client.query(`SELECT value FROM system_setting WHERE key = 'departments_migrated'`)
  if (flag.rows.length > 0) return

  let names = []
  const setting = await client.query(`SELECT value FROM system_setting WHERE key = 'departments'`)
  if (setting.rows.length > 0) {
    try {
      const parsed = JSON.parse(setting.rows[0].value)
      if (Array.isArray(parsed)) names = parsed
    } catch {
      // ignore malformed JSON
    }
  }
  if (names.length === 0) names = DEFAULT_DEPARTMENTS

  const used = await client.query(
    `SELECT DISTINCT TRIM(department) AS name FROM student WHERE department IS NOT NULL AND TRIM(department) <> ''`
  )
  used.rows.forEach((r) => names.push(r.name))

  const seen = new Set()
  for (const raw of names) {
    const name = String(raw || '').trim()
    if (!name || seen.has(name.toLowerCase())) continue
    seen.add(name.toLowerCase())
    await client.query(
      `INSERT INTO department (name, campus, is_active, created_by)
       VALUES ($1, NULL, true, 'migration')
       ON CONFLICT DO NOTHING`,
      [name]
    )
  }

  await client.query(
    `INSERT INTO system_setting (key, value) VALUES ('departments_migrated', 'true')
     ON CONFLICT (key) DO NOTHING`
  )
}

export async function ensureSchema(pool) {
  if (globalThis.__dillaSchemaPromise) return globalThis.__dillaSchemaPromise
  globalThis.__dillaSchemaPromise = (async () => {
    const client = await pool.__rawConnect()
    try {
      await client.query(DDL)
      console.log('[DB] Schema check complete')
    } catch (err) {
      console.error('[DB] Schema check failed (continuing):', err.message)
    }

    try {
      await client.query(DDL_PHASE2)
      await migrateDepartments(client)
      console.log('[DB] Phase 2 schema check complete')
    } catch (err) {
      console.error('[DB] Phase 2 schema check failed (continuing):', err.message)
    } finally {
      client.release()
    }
  })()
  return globalThis.__dillaSchemaPromise
}
