import { getImageMetadata } from './image-meta.js'

export const ALLOWED_PHOTO_FORMATS = ['jpg', 'png', 'webp']

export const DEFAULT_PHOTO_SETTINGS = Object.freeze({
  maxSizeMB: 8,
  allowedFormats: ['jpg', 'png'],
  required: false,
  aspectRatio: { enabled: false, width: 3, height: 4, tolerancePercent: 10 },
  minWidth: null,
  minHeight: null,
  maxWidth: null,
  maxHeight: null,
})

const FORMAT_LABELS = {
  jpg: 'JPG/JPEG',
  png: 'PNG',
  webp: 'WebP',
}

const toPositiveInt = (value, fallback = null) => {
  if (value === undefined || value === null || value === '') return fallback
  const n = parseInt(value, 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

const clampInt = (value, fallback, min, max) => {
  const n = parseInt(value, 10)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

export function normalizePhotoSettings(input = {}) {
  const source = input && typeof input === 'object' ? input : {}

  const rawFormats = Array.isArray(source.allowedFormats)
    ? source.allowedFormats
    : DEFAULT_PHOTO_SETTINGS.allowedFormats
  const normalizedFormats = [
    ...new Set(
      rawFormats
        .map((f) => String(f || '').trim().toLowerCase())
        .map((f) => (f === 'jpeg' ? 'jpg' : f))
        .filter((f) => ALLOWED_PHOTO_FORMATS.includes(f))
    ),
  ]

  const aspect =
    source.aspectRatio && typeof source.aspectRatio === 'object'
      ? source.aspectRatio
      : DEFAULT_PHOTO_SETTINGS.aspectRatio

  return {
    maxSizeMB: clampInt(source.maxSizeMB, DEFAULT_PHOTO_SETTINGS.maxSizeMB, 1, 10),
    allowedFormats:
      normalizedFormats.length > 0
        ? normalizedFormats
        : [...DEFAULT_PHOTO_SETTINGS.allowedFormats],
    required: Boolean(source.required),
    aspectRatio: {
      enabled: Boolean(aspect.enabled),
      width: toPositiveInt(aspect.width, DEFAULT_PHOTO_SETTINGS.aspectRatio.width),
      height: toPositiveInt(aspect.height, DEFAULT_PHOTO_SETTINGS.aspectRatio.height),
      tolerancePercent: clampInt(
        aspect.tolerancePercent,
        DEFAULT_PHOTO_SETTINGS.aspectRatio.tolerancePercent,
        0,
        50
      ),
    },
    minWidth: toPositiveInt(source.minWidth),
    minHeight: toPositiveInt(source.minHeight),
    maxWidth: toPositiveInt(source.maxWidth),
    maxHeight: toPositiveInt(source.maxHeight),
  }
}

export function validatePhotoSettings(input = {}) {
  const source = input && typeof input === 'object' ? input : {}

  if (source.maxSizeMB !== undefined && source.maxSizeMB !== null && source.maxSizeMB !== '') {
    const rawMax = Number(source.maxSizeMB)
    if (!Number.isFinite(rawMax) || rawMax < 1 || rawMax > 10) {
      return {
        ok: false,
        error: 'Invalid photo upload size limit. Must be a value between 1 MB and 10 MB.',
        settings: normalizePhotoSettings(source),
      }
    }
  }

  const rawFormats = Array.isArray(source.allowedFormats) ? source.allowedFormats : null
  if (rawFormats) {
    const normalized = rawFormats
      .map((f) => String(f || '').trim().toLowerCase())
      .map((f) => (f === 'jpeg' ? 'jpg' : f))
    if (!normalized.some((f) => ALLOWED_PHOTO_FORMATS.includes(f))) {
      return {
        ok: false,
        error: `At least one photo format must be selected (${describeFormats(ALLOWED_PHOTO_FORMATS)}).`,
        settings: normalizePhotoSettings(source),
      }
    }
  }

  const settings = normalizePhotoSettings(source)

  if (settings.minWidth && settings.maxWidth && settings.minWidth > settings.maxWidth) {
    return {
      ok: false,
      error: 'Minimum photo width cannot be greater than maximum photo width.',
      settings,
    }
  }
  if (settings.minHeight && settings.maxHeight && settings.minHeight > settings.maxHeight) {
    return {
      ok: false,
      error: 'Minimum photo height cannot be greater than maximum photo height.',
      settings,
    }
  }

  return { ok: true, settings }
}

function parseSetting(value) {
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

/**
 * Reads the admin-configured photo requirements from PostgreSQL.
 * The maximum file size is kept in sync with the legacy `max_photo_size_mb` key.
 * @param {import('pg').PoolClient} client
 */
export async function getPhotoSettings(client) {
  const res = await client.query(
    `SELECT key, value FROM system_setting
     WHERE key IN ('photo_settings', 'max_photo_size_mb', 'maxPhotoSizeMB')`
  )

  const map = {}
  res.rows.forEach((row) => {
    map[row.key] = parseSetting(row.value)
  })

  const stored =
    map.photo_settings && typeof map.photo_settings === 'object'
      ? map.photo_settings
      : {}

  const systemMax =
    map.max_photo_size_mb !== undefined && map.max_photo_size_mb !== null
      ? Number(map.max_photo_size_mb)
      : map.maxPhotoSizeMB !== undefined && map.maxPhotoSizeMB !== null
      ? Number(map.maxPhotoSizeMB)
      : null

  return normalizePhotoSettings({
    ...stored,
    maxSizeMB:
      Number.isFinite(systemMax) && systemMax > 0
        ? systemMax
        : stored.maxSizeMB ?? DEFAULT_PHOTO_SETTINGS.maxSizeMB,
    aspectRatio: {
      ...DEFAULT_PHOTO_SETTINGS.aspectRatio,
      ...(stored.aspectRatio || {}),
    },
  })
}

export function describeFormats(formats = []) {
  return formats.map((f) => FORMAT_LABELS[f] || String(f).toUpperCase()).join(', ')
}

/**
 * Deeply validates an uploaded image buffer against the configured rules:
 * size, real format (magic bytes), pixel dimensions and aspect ratio.
 * @param {Buffer} buffer
 * @param {object} settings
 */
export function validatePhotoBuffer(buffer, settings = {}) {
  const rules = normalizePhotoSettings(settings)
  const maxAllowedMB = rules.maxSizeMB
  const sizeMB = buffer.length / (1024 * 1024)

  if (sizeMB > maxAllowedMB) {
    return {
      ok: false,
      error: `File size (${sizeMB.toFixed(2)} MB) exceeds the university maximum limit of ${maxAllowedMB} MB.`,
      details: { sizeMB, maxAllowedMB },
    }
  }

  const info = getImageMetadata(buffer)
  if (!info) {
    return {
      ok: false,
      error: 'The uploaded file is not a valid JPG, PNG or WebP image.',
      details: { sizeMB, maxAllowedMB },
    }
  }

  if (!rules.allowedFormats.includes(info.format)) {
    return {
      ok: false,
      error: `Unsupported image format. Allowed formats: ${describeFormats(rules.allowedFormats)}.`,
      details: { sizeMB, maxAllowedMB, width: info.width, height: info.height },
    }
  }

  const { width, height } = info

  if (rules.minWidth && width < rules.minWidth) {
    return {
      ok: false,
      error: `Photo width (${width}px) is below the minimum of ${rules.minWidth}px.`,
      details: { sizeMB, maxAllowedMB, width, height },
    }
  }
  if (rules.minHeight && height < rules.minHeight) {
    return {
      ok: false,
      error: `Photo height (${height}px) is below the minimum of ${rules.minHeight}px.`,
      details: { sizeMB, maxAllowedMB, width, height },
    }
  }
  if (rules.maxWidth && width > rules.maxWidth) {
    return {
      ok: false,
      error: `Photo width (${width}px) exceeds the maximum of ${rules.maxWidth}px.`,
      details: { sizeMB, maxAllowedMB, width, height },
    }
  }
  if (rules.maxHeight && height > rules.maxHeight) {
    return {
      ok: false,
      error: `Photo height (${height}px) exceeds the maximum of ${rules.maxHeight}px.`,
      details: { sizeMB, maxAllowedMB, width, height },
    }
  }

  if (rules.aspectRatio.enabled) {
    const target = rules.aspectRatio.width / rules.aspectRatio.height
    const deviation = Math.abs(width / height - target) / target
    const tolerance = (rules.aspectRatio.tolerancePercent || 0) / 100
    if (deviation > tolerance) {
      return {
        ok: false,
        error: `Photo aspect ratio must be about ${rules.aspectRatio.width}:${rules.aspectRatio.height} (±${rules.aspectRatio.tolerancePercent}%). Your photo is ${width}×${height}px.`,
        details: { sizeMB, maxAllowedMB, width, height },
      }
    }
  }

  return {
    ok: true,
    info,
    details: { sizeMB, maxAllowedMB, width, height },
  }
}
