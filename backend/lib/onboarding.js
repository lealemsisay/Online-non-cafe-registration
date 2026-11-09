/**
 * Student onboarding status management.
 *
 * Database-backed onboarding lifecycle (stored on app_user.onboarding_status):
 *
 *   imported            - freshly imported account (username == student ID,
 *                         initial password == student ID, must_change_password=true,
 *                         profile_complete=false). Never logged in yet.
 *   password_change_required - mandatory first-login password change pending.
 *   profile_completion_required - password changed; profile still incomplete.
 *   completed           - onboarding finished; full dashboard access.
 *
 * These statuses are the source of truth. The boolean flags
 * (must_change_password, student.profile_complete) are kept in sync with them.
 */

export const ONBOARDING_STATUS_IMPORTED = 'imported'
export const ONBOARDING_STATUS_PASSWORD_CHANGE_REQUIRED = 'password_change_required'
export const ONBOARDING_STATUS_PROFILE_COMPLETION_REQUIRED = 'profile_completion_required'
export const ONBOARDING_STATUS_COMPLETED = 'completed'

export const ONBOARDING_STATUSES = [
  ONBOARDING_STATUS_IMPORTED,
  ONBOARDING_STATUS_PASSWORD_CHANGE_REQUIRED,
  ONBOARDING_STATUS_PROFILE_COMPLETION_REQUIRED,
  ONBOARDING_STATUS_COMPLETED,
]

// Routes always reachable by a student mid-onboarding (auth + onboarding pages + form data).
export const ONBOARDING_SAFE_ROUTES = new Set([
  '/api/auth/change-password',
  '/api/auth/login',
  '/api/auth/register',
  '/api/profile',
  '/api/departments',
  '/api/campuses',
  '/api/builtin-fields',
  '/api/custom-fields',
  '/api/settings',
  '/api/notifications',
  '/api/health',
])

export function isOnboardingSafeRoute(urlPath) {
  if (!urlPath) return false
  const base = urlPath.split('?')[0]
  return ONBOARDING_SAFE_ROUTES.has(base)
}

/**
 * Derive the canonical onboarding status from the auth flags.
 */
export function deriveOnboardingStatus(mustChangePassword, profileComplete) {
  if (profileComplete === true) return ONBOARDING_STATUS_COMPLETED
  if (mustChangePassword === true) return ONBOARDING_STATUS_PASSWORD_CHANGE_REQUIRED
  return ONBOARDING_STATUS_PROFILE_COMPLETION_REQUIRED
}

/**
 * Check whether an authenticated student may proceed past onboarding.
 *
 * Returns { ok: true } when the student has completed onboarding, or
 * { ok: false, status, requiresPasswordChange, requiresProfileCompletion, message }
 * when they must finish onboarding first.
 */
export function assertStudentOnboardingComplete(user, studentRow) {
  const role = (user && user.role) || ''
  if (role !== 'student') return { ok: true }

  const mustChangePassword = user.must_change_password === true || user.forcePasswordChange === true
  const profileComplete =
    studentRow && studentRow.profile_complete === true
      ? true
      : user.profileComplete === true || user.profile_complete === true

  const status = deriveOnboardingStatus(mustChangePassword, profileComplete)

  // The hard backend gate is the mandatory first-login password change.
  // Students who still must change their password cannot use normal dashboard APIs.
  if (mustChangePassword) {
    return {
      ok: false,
      status,
      requiresPasswordChange: true,
      requiresProfileCompletion: !profileComplete,
      message: 'You must change your initial password before accessing the dashboard.',
    }
  }

  // Password changed: onboarding gate passed (profile completion is tracked and shown
  // to the student/admin, but does not block dashboard APIs).
  return { ok: true, status, requiresProfileCompletion: !profileComplete }
}

/**
 * Route guard for student-facing APIs. Call at the top of a handler after `authorize`.
 *
 *   const guard = requireStudentOnboarding(req, auth, studentRow)
 *   if (!guard.ok) return res.status(guard.status).json({ message: guard.message, ...guard })
 *
 * `studentRow` is the joined student record (may be null). `requiredPath` is the
 * request path; onboarding-safe paths (change password, profile form, lookups) are
 * always allowed.
 */
export function requireStudentOnboarding(req, auth, studentRow) {
  const user = auth && auth.user ? auth.user : {}
  const path = (req && req.url ? new URL(req.url, 'http://localhost').pathname : '') || (req && req.originalUrl) || ''

  const check = assertStudentOnboardingComplete(user, studentRow)
  if (check.ok) return { ok: true }

  if (isOnboardingSafeRoute(path)) return { ok: true, status: check.status }

  return {
    ok: false,
    status: 403,
    message: check.message,
    onboardingStatus: check.status,
    requiresPasswordChange: check.requiresPasswordChange,
    requiresProfileCompletion: check.requiresProfileCompletion,
  }
}
