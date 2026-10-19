import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config({ override: true })

let dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:0317@localhost:5432/dilla_university'
// If connection string lacks password but points to local postgres
if (dbUrl.startsWith('postgresql://postgres@localhost') || dbUrl.startsWith('postgresql://postgres:5432')) {
  dbUrl = dbUrl.replace('postgresql://postgres@', 'postgresql://postgres:0317@')
}

const pool = new Pool({
  connectionString: dbUrl,
})

export { pool }