import { Pool } from 'pg'
import dotenv from 'dotenv'
import { ensureSchema } from '../lib/ensure-schema.js'

dotenv.config({ override: true })

let dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:allah123@localhost:5432/dilla_university'
// If connection string lacks password but points to local postgres
if (dbUrl.startsWith('postgresql://postgres@localhost') || dbUrl.startsWith('postgresql://postgres:5432')) {
  dbUrl = dbUrl.replace('postgresql://postgres@', 'postgresql://postgres:allah123@')
}

// Reuse ONE pool across Next.js hot reloads (otherwise every reload opens a new pool
// and Postgres runs out of connections -> 500 errors).
const globalForPg = globalThis
if (!globalForPg.__dillaPgPool) {
  const p = new Pool({
    connectionString: dbUrl,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  })
  // Without this handler an idle-connection error (e.g. Postgres restart) crashes the whole
  // Node process, which the frontend sees as 502 Bad Gateway.
  p.on('error', (err) => {
    console.error('[pg pool] idle client error:', err.message)
  })
  globalForPg.__dillaPgPool = p
}

const pool = globalForPg.__dillaPgPool

// Log the REAL reason when a database connection fails (shows in the `npm run dev` terminal)
if (!pool.__wrapped) {
  const origConnect = pool.connect.bind(pool)
  pool.__rawConnect = () => origConnect()
  pool.connect = function (...args) {
    if (args.length > 0) return origConnect(...args)
    return ensureSchema(pool)
      .then(() => origConnect())
      .catch((err) => {
        console.error('[DB] Cannot connect to PostgreSQL:', err.code || '', err.message)
        throw err
      })
  }
  pool.__wrapped = true
}

export { pool }
