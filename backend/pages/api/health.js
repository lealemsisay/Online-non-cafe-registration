import { pool } from '@/drizzle/client'

// Open http://localhost:3000/api/health in the browser to see if the database works.
export default async function handler(req, res) {
  try {
    const r = await pool.query('SELECT current_database() AS db, NOW() AS now')
    const tables = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
    )
    return res.status(200).json({ ok: true, ...r.rows[0], tables: tables.rows.map((t) => t.table_name) })
  } catch (error) {
    console.error('[health] DB error:', error)
    return res.status(500).json({ ok: false, code: error.code, message: error.message })
  }
}
