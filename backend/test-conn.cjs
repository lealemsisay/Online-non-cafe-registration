const { Pool } = require('pg')
require('dotenv/config')

async function testConnections() {
  // Try connecting via local socket (peer authentication)
  const connectionStrings = [
    // Local socket connection
    { connStr: 'postgresql://postgres@/dilla_university', label: 'socket-local' },
    { connStr: 'postgresql://postgres@localhost/dilla_university', label: 'socket-tcp' },
    { connStr: 'postgresql://dilla_user@localhost/dilla_university', label: 'custom-user' },
  ]

  for (const { connStr, label } of connectionStrings) {
    console.log(`Trying ${label}: ${connStr}`)
    const pool = new Pool({
      connectionString: connStr
    })

    try {
      const client = await pool.connect()
      console.log(`  ✓ Connected with ${label}`)
      const result = await client.query('SELECT current_user, inet_server_addr()')
      console.log(`  ✓ Query: ${JSON.stringify(result.rows)}`)
      client.release()
    } catch (err) {
      console.log(`  ✗ ${label}: ${err.message.split('\\n')[0]}`)
    }
  }
}

testConnections()