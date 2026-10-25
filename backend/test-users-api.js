import dotenv from 'dotenv'
dotenv.config({ path: '.env', override: true })

import { pool } from '@/drizzle/client'
import { authorize, setCorsHeaders } from '@/lib/auth'

// Simulate a request without auth token
const mockReq = {
  method: 'GET',
  headers: {}
}

// Simulate a request with a fake token
const mockReqWithToken = {
  method: 'GET',
  headers: { authorization: 'Bearer fake-token' }
}

async function test() {
  // Test 1: No auth token
  console.log('=== Test 1: No auth token ===')
  if (setCorsHeaders(mockReq, { status: () => {}, setHeader: () => {}, json: () => {} })) {
    console.log('CORS headers set')
  }
  const auth1 = authorize(mockReq, ['admin', 'dean'])
  console.log('Auth result:', auth1)
  
  // Test 2: With fake token
  console.log('\n=== Test 2: With fake token ===')
  const auth2 = authorize(mockReqWithToken, ['admin', 'dean'])
  console.log('Auth result:', auth2)
  
  // Test 3: With valid token (if we had one)
  console.log('\n=== Test 3: Check token verification ===')
  import crypto from 'node:crypto'
  const SECRET = process.env.AUTH_SECRET || 'dilla-dev-only-secret-set-AUTH_SECRET-in-production'
  const [header, body, sig] = 'fake.token.here'.split('.')
  console.log('Token parts:', { header, body, sig })
  
  // Let's just verify the token structure
  try {
    const expected = crypto.createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url')
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    console.log('Sig lengths match:', a.length === b.length)
    console.log('Sigs match:', a.length === b.length && crypto.timingSafeEqual(a, b))
  } catch (e) {
    console.error('Error:', e.message)
  }
}

test().catch(console.error)