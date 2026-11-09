import { Client } from 'pg'
;(async () => {
  const c = new Client({ connectionString: 'postgresql://postgres:allah123@localhost:5432/dilla_university' })
  await c.connect()
  // Check if column exists
  const r = await c.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name='app_user' AND column_name='dining_plan'"
  )
  console.log('dining_plan exists:', r.rows.length > 0)
  // Add column if not exists
  await c.query("ALTER TABLE app_user ADD COLUMN IF NOT EXISTS dining_plan VARCHAR(20) DEFAULT 'cafeteria'")
  console.log('altered')
  // List all columns
  const s = await c.query("SELECT column_name FROM information_schema.columns WHERE table_name='app_user' ORDER BY ordinal_position")
  console.log('all cols:', s.rows.map((x) => x.column_name).join(', '))
  await c.end()
})().catch((e) => console.error(e))