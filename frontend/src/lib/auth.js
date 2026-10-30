/**
 * Frontend Authentication & Token Management Utilities
 * Handles JWT decoding, validity checks, storage clearance, and API 401 interception.
 */

export function isTokenValid(token) {
  if (!token || typeof token !== 'string') return false
  const trimmed = token.trim()
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return false

  try {
    const parts = trimmed.split('.')
    if (parts.length !== 3) return false

    // Decode base64url payload
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    const payload = JSON.parse(json)

    // Check expiration timestamp (with 5-second buffer)
    if (payload.exp && typeof payload.exp === 'number') {
      const nowSeconds = Math.floor(Date.now() / 1000)
      if (payload.exp <= nowSeconds + 5) {
        return false // Token has expired
      }
    }
    return true
  } catch (err) {
    return false
  }
}

export function clearAuthStorage() {
  try {
    localStorage.removeItem('token')
    localStorage.removeItem('userRole')
    localStorage.removeItem('userName')
    localStorage.removeItem('userCampus')
    localStorage.removeItem('userId')
    localStorage.removeItem('studentId')
    localStorage.removeItem('userEmail')
  } catch (e) {}
}

export function getAuthUser() {
  try {
    const token = localStorage.getItem('token')
    const role = localStorage.getItem('userRole')
    const name = localStorage.getItem('userName')
    const campus = localStorage.getItem('userCampus')
    const id = localStorage.getItem('userId')

    // If token is missing, corrupted, or expired, wipe stale state
    if (!token || !role || !isTokenValid(token)) {
      if (token || role) {
        clearAuthStorage()
      }
      return { role: null, name: null, campus: null, id: null, token: null }
    }

    return { role, name, campus, id, token }
  } catch (e) {
    return { role: null, name: null, campus: null, id: null, token: null }
  }
}

/**
 * Global fetch interceptor:
 * 1. Automatically attaches Authorization: Bearer <token> if available and not present.
 * 2. Intercepts 401 Unauthorized responses on protected endpoints, clears storage,
 *    and redirects to /login?session=expired.
 */
let isInterceptorSetup = false

export function setupFetchInterceptor() {
  if (isInterceptorSetup || typeof window === 'undefined') return
  isInterceptorSetup = true

  const originalFetch = window.fetch

  window.fetch = async function (input, init = {}) {
    let url = typeof input === 'string' ? input : input instanceof Request ? input.url : ''

    // Only enhance requests to /api/
    const isApiRequest = url.startsWith('/api') || url.includes('/api/')
    const isAuthLoginOrRegister = url.includes('/api/auth/login') || url.includes('/api/auth/register')

    let options = { ...init }

    if (isApiRequest && !isAuthLoginOrRegister) {
      const token = localStorage.getItem('token')
      if (token && isTokenValid(token)) {
        const headers = new Headers(options.headers || {})
        if (!headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${token}`)
        }
        options.headers = headers
      }
    }

    try {
      const response = await originalFetch.call(this, input, options)

      // Handle 401 on protected endpoints
      if (response.status === 401 && isApiRequest && !isAuthLoginOrRegister) {
        clearAuthStorage()
        const currentPath = window.location.pathname
        if (currentPath !== '/login' && currentPath !== '/register') {
          window.location.href = '/login?session=expired'
        }
      }

      return response
    } catch (error) {
      throw error
    }
  }
}
