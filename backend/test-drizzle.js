import 'dotenv/config'
import { db } from './drizzle/client.js'

;(async () => {
  try {
    // Test connection by selecting the current user
    const result = await db.select({ id: students.id })
      .from(students)
      .limit(1)
    
    console.log('Drizzle connection successful!')
    console.log('Found', result.length, 'student record(s)')
  } catch (error) {
    console.error('Drizzle connection failed:', error)
  }
})()