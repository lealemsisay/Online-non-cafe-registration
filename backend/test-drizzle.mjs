require('dotenv/config')
const { db } = require('./drizzle/client.js')
const { students } = require('./drizzle/schema.js')

;(async () => {
  try {
    // Test connection by selecting the first student
    const result = await db.select({ id: students.id })
      .from(students)
      .limit(1)
    
    console.log('Drizzle connection successful!')
    console.log('Found', result.length, 'student record(s)')
  } catch (error) {
    console.error('Drizzle connection failed:', error)
  }
})()