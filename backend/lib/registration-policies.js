export const DEFAULT_REGISTRATION_POLICIES = Object.freeze({
  requirePdfVerification: true,
  maxPdfSizeMB: 5,
  cafeRegistrationOpen: true,
  nonCafeRegistrationOpen: true,
})

const parseSetting = (value) => {
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

export function normalizeRegistrationPolicies(input = {}) {
  const settings = input && typeof input === 'object' ? input : {}
  const maxPdf = Number(settings.maxPdfSizeMB)
  return {
    requirePdfVerification: settings.requirePdfVerification !== false,
    maxPdfSizeMB:
      Number.isFinite(maxPdf) && maxPdf >= 1 && maxPdf <= 50
        ? maxPdf
        : DEFAULT_REGISTRATION_POLICIES.maxPdfSizeMB,
    cafeRegistrationOpen:
      settings.cafe_registration_open !== false &&
      settings.cafeRegistrationOpen !== false,
    nonCafeRegistrationOpen:
      settings.non_cafe_registration_open !== false &&
      settings.nonCafeRegistrationOpen !== false,
  }
}

export async function getRegistrationPolicies(client) {
  const res = await client.query(
    `SELECT key, value FROM system_setting WHERE key IN (
       'requirePdfVerification',
       'maxPdfSizeMB',
       'cafe_registration_open',
       'cafeRegistrationOpen',
       'non_cafe_registration_open',
       'nonCafeRegistrationOpen'
     )`
  )
  const map = {}
  res.rows.forEach((row) => {
    map[row.key] = parseSetting(row.value)
  })
  return normalizeRegistrationPolicies(map)
}
