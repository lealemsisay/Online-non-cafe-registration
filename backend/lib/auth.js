import crypto from 'node:crypto'

const SECRET = process.env.AUTH_SECRET || 'dilla-dev-only-secret-set-AUTH_SECRET-in-production'
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 }
const KEYLEN = 64
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000

export function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16)
    crypto.scrypt(password, salt, KEYLEN, SCRYPT_PARAMS, (err, derived) => {
      if (err) return reject(err)
      resolve(
        `scrypt$${SCRYPT_PARAMS.N}$${SCRYPT_PARAMS.r}$${SCRYPT_PARAMS.p}$${salt.toString('base64')}$${derived.toString('base64')}`
      )
    })
  })
}

export function verifyPassword(password, stored) {
  return new Promise((resolve) => {
    try {
      const parts = String(stored).split('$')
      if (parts.length !== 6 || parts[0] !== 'scrypt') return resolve(false)
      const [, N, r, p, saltB64, hashB64] = parts
      const salt = Buffer.from(saltB64, 'base64')
      const expected = Buffer.from(hashB64, 'base64')
      crypto.scrypt(
        String(password),
        salt,
        expected.length,
        { N: Number(N), r: Number(r), p: Number(p) },
        (err, derived) => {
          if (err) return resolve(false)
          resolve(derived.length === expected.length && crypto.timingSafeEqual(derived, expected))
        }
      )
    } catch {
      resolve(false)
    }
  })
}

const b64url = (buf) => Buffer.from(buf).toString('base64url')

export function signToken(payload) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const now = Math.floor(Date.now() / 1000)
  const body = b64url(JSON.stringify({ ...payload, iat: now, exp: now + TOKEN_TTL_MS / 1000 }))
  const sig = crypto.createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${sig}`
}

export function verifyToken(token) {
  try {
    const [header, body, sig] = String(token).split('.')
    if (!header || !body || !sig) return null
    const expected = crypto.createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url')
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

function extractToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization || ''
  if (header.startsWith('Bearer ')) return header.slice(7).trim()
  if (req.headers?.['x-auth-token']) return String(req.headers['x-auth-token']).trim()
  return null
}

// Returns { user } on success, or { error, status } on failure.
export function authorize(req, roles) {
  const token = extractToken(req)
  if (!token) return { error: 'Authentication required', status: 401 }
  const payload = verifyToken(token)
  if (!payload) return { error: 'Invalid or expired token', status: 401 }
  if (roles && roles.length > 0 && !roles.includes(payload.role)) {
    return { error: 'Access denied: insufficient permissions', status: 403 }
  }
  return { user: payload }
}

export function setCorsHeaders(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-auth-token')
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return true
  }
  return false
}
