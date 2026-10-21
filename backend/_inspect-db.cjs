const { Client, Pool } = require('pg')

const PW = process.env.TEST_PW || 'allah123'

async function q(db, sql, params) {
  const c = new Client({ host: '127.0.0.1', port: 5432, user: 'postgres', password: PW, database: db, connectionTimeoutMillis: 5000 })
  await c.connect()
  try {
    const r = await c.query(sql, params)
    return r.rows
  } finally {
    await c.end()
  }
}

;(async () => {
  const dbs = await q('postgres', "SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname")
  console.log('DATABASES:', dbs.map((d) => d.datname).join(', '))

  const hasApp = dbs.some((d) => d.datname === 'dilla_university')
  if (!hasApp) {
    console.log('dilla_university: MISSING')
    return
  }

  const tables = await q('dilla_university', "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name")
  console.log('TABLES in dilla_university:', tables.length ? tables.map((t) => t.table_name).join(', ') : '(none)')

  for (const t of tables.map((t) => t.table_name)) {
    const cols = await q('dilla_university', "SELECT column_name, data_type FROM information_schema.columns WHERE table_name=$1 ORDER BY ordinal_position", [t])
    console.log('  ' + t + ': ' + cols.map((c) => c.column_name + '(' + c.data_type + ')').join(', '))
    const cnt = await q('dilla_university', `SELECT count(*)::int AS n FROM "${t}"`)
    console.log('    rows: ' + cnt[0].n)
  }
})().catch((e) => { console.error('FAIL:', e.message.split('\n')[0]); process.exit(1) })
