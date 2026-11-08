import React, { useCallback, useEffect, useState } from 'react'
import { Input, Button } from '@/components/forms'
import Icon from '@/components/icons/Icon'

const FORMAT_OPTIONS = [
  { value: 'jpg', label: 'JPG / JPEG', desc: 'Standard compressed photograph' },
  { value: 'png', label: 'PNG', desc: 'Lossless image format' },
  { value: 'webp', label: 'WebP', desc: 'Modern compressed image format' },
]

const DEFAULT_PHOTO_SETTINGS = {
  maxSizeMB: 8,
  allowedFormats: ['jpg', 'png'],
  required: false,
  aspectRatio: { enabled: false, width: 3, height: 4, tolerancePercent: 10 },
  minWidth: null,
  minHeight: null,
  maxWidth: null,
  maxHeight: null,
}

const DEFAULT_POLICIES = {
  requirePdfVerification: true,
  maxPdfSizeMB: 5,
  cafeRegistrationOpen: true,
  nonCafeRegistrationOpen: true,
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const asBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value.toLowerCase() === 'true' || value === '1'
  return Boolean(value)
}

const asNumber = (value, fallback = null) => {
  if (value === undefined || value === null || value === '') return fallback
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

const Alert = ({ type, message, onClose }) => {
  if (!message) return null
  const isError = type === 'error'
  return (
    <div
      className={`border-l-4 p-3.5 rounded-xl flex items-center justify-between shadow-2xs ${
        isError
          ? 'bg-rose-50 border-rose-500 text-rose-900'
          : 'bg-emerald-50 border-emerald-600 text-emerald-900'
      }`}
    >
      <div className="flex items-center gap-2">
        <Icon
          name={isError ? 'alert-circle' : 'check-circle'}
          className={`w-4 h-4 flex-shrink-0 ${isError ? 'text-rose-600' : 'text-emerald-600'}`}
        />
        <span className="text-xs font-bold">{message}</span>
      </div>
      <button onClick={onClose} className="font-bold ml-3 text-sm hover:opacity-70">
        ×
      </button>
    </div>
  )
}

const Toggle = ({ checked, onChange, label, description }) => (
  <label className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition-colors">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-dillaGreen focus:ring-dillaGold"
    />
    <div>
      <p className="text-sm font-bold text-slate-900">{label}</p>
      {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
    </div>
  </label>
)

export const PhotoRequirementsPanel = () => {
  const [settings, setSettings] = useState(DEFAULT_PHOTO_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const loadSettings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/settings', { headers: getAuthHeaders() })
      const data = await res.json()
      if (res.ok) {
        const configuredLimit =
          data?.systemSettings?.maxPhotoSizeMB || data?.systemSettings?.max_photo_size_mb
        if (data?.photoSettings) {
          setSettings({
            ...DEFAULT_PHOTO_SETTINGS,
            ...data.photoSettings,
            maxSizeMB:
              asNumber(configuredLimit, null) ??
              asNumber(data.photoSettings.maxSizeMB, DEFAULT_PHOTO_SETTINGS.maxSizeMB),
            aspectRatio: {
              ...DEFAULT_PHOTO_SETTINGS.aspectRatio,
              ...(data.photoSettings.aspectRatio || {}),
            },
          })
        } else if (configuredLimit && Number(configuredLimit) >= 1) {
          setSettings((prev) => ({ ...prev, maxSizeMB: Number(configuredLimit) }))
        }
      } else {
        setError(data.message || 'Failed to load photo requirements.')
      }
    } catch (e) {
      console.error(e)
      setError('Network error loading photo requirements.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const toggleFormat = (format) => {
    setSettings((prev) => {
      const exists = prev.allowedFormats.includes(format)
      const next = exists
        ? prev.allowedFormats.filter((f) => f !== format)
        : [...prev.allowedFormats, format]
      return { ...prev, allowedFormats: next }
    })
  }

  const updateDimension = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value === '' ? null : Math.max(1, parseInt(value, 10) || 1),
    }))
  }

  const handleSave = async () => {
    setError(null)
    setSuccess(null)

    if (settings.allowedFormats.length === 0) {
      setError('At least one allowed image format must be selected.')
      return
    }

    if (settings.aspectRatio.enabled) {
      const { width, height, tolerancePercent } = settings.aspectRatio
      if (!width || !height || width < 1 || height < 1) {
        setError('Aspect ratio width and height must be positive numbers.')
        return
      }
      if (tolerancePercent < 0 || tolerancePercent > 50) {
        setError('Aspect ratio tolerance must be between 0 and 50 percent.')
        return
      }
    }

    if (
      settings.minWidth &&
      settings.maxWidth &&
      settings.minWidth > settings.maxWidth
    ) {
      setError('Minimum photo width cannot be greater than maximum photo width.')
      return
    }
    if (
      settings.minHeight &&
      settings.maxHeight &&
      settings.minHeight > settings.maxHeight
    ) {
      setError('Minimum photo height cannot be greater than maximum photo height.')
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        photoSettings: {
          maxSizeMB: settings.maxSizeMB,
          allowedFormats: settings.allowedFormats,
          required: Boolean(settings.required),
          aspectRatio: {
            enabled: Boolean(settings.aspectRatio.enabled),
            width: Number(settings.aspectRatio.width) || 3,
            height: Number(settings.aspectRatio.height) || 4,
            tolerancePercent: Number(settings.aspectRatio.tolerancePercent) || 0,
          },
          minWidth: settings.minWidth || null,
          minHeight: settings.minHeight || null,
          maxWidth: settings.maxWidth || null,
          maxHeight: settings.maxHeight || null,
        },
        reason: 'Photo requirements updated',
      }

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        if (data.photoSettings) {
          setSettings((prev) => ({
            ...prev,
            ...data.photoSettings,
            aspectRatio: {
              ...prev.aspectRatio,
              ...(data.photoSettings.aspectRatio || {}),
            },
          }))
        }
        setSuccess('Photo requirements saved and will be enforced on uploads.')
      } else {
        setError(data.message || 'Failed to save photo requirements.')
      }
    } catch (e) {
      setError('Network error saving photo requirements.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
      <div className="pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Icon name="image" className="w-5 h-5 text-dillaGreen" />
          <h3 className="text-base font-bold text-dillaDarkGreen">
            Photo Requirements & Validation Rules
          </h3>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Configure accepted formats, dimensions and aspect ratio. Rules are persisted in PostgreSQL and re-validated by the server on every upload.
        </p>
      </div>

      <Alert type="error" message={error} onClose={() => setError(null)} />
      <Alert type="success" message={success} onClose={() => setSuccess(null)} />

      {loading ? (
        <div className="py-8 text-center text-slate-400 text-xs">
          <Icon name="refresh" className="w-5 h-5 animate-spin mx-auto mb-1 text-dillaGreen" />
          Loading photo requirements...
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Allowed Image Formats
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {FORMAT_OPTIONS.map((format) => {
                const active = settings.allowedFormats.includes(format.value)
                return (
                  <button
                    key={format.value}
                    type="button"
                    onClick={() => toggleFormat(format.value)}
                    className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                      active
                        ? 'bg-emerald-50 border-emerald-300 shadow-2xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{format.label}</span>
                      <span
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          active
                            ? 'bg-dillaGreen border-dillaGreen text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {active && <Icon name="check" className="w-3 h-3" />}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">{format.desc}</p>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Toggle
              checked={Boolean(settings.required)}
              onChange={(value) => setSettings((prev) => ({ ...prev, required: value }))}
              label="Passport Photo Required"
              description="Students must upload a valid passport photo before submitting registration."
            />
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">Maximum File Size</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Controlled in the Photo Upload Limits card above.
                </p>
              </div>
              <span className="text-sm font-extrabold text-dillaGreen">
                {settings.maxSizeMB} MB
              </span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-900">Aspect Ratio Enforcement</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Reject photos that deviate from the configured width:height ratio.
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(settings.aspectRatio.enabled)}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      aspectRatio: { ...prev.aspectRatio, enabled: e.target.checked },
                    }))
                  }
                  className="w-4 h-4 rounded border-slate-300 text-dillaGreen focus:ring-dillaGold"
                />
                <span className="text-xs font-bold text-slate-700">Enabled</span>
              </label>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Width
                </label>
                <Input
                  type="number"
                  min="1"
                  value={settings.aspectRatio.width}
                  disabled={!settings.aspectRatio.enabled}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      aspectRatio: {
                        ...prev.aspectRatio,
                        width: Math.max(1, parseInt(e.target.value, 10) || 1),
                      },
                    }))
                  }
                  className="text-slate-900 text-xs h-9"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Height
                </label>
                <Input
                  type="number"
                  min="1"
                  value={settings.aspectRatio.height}
                  disabled={!settings.aspectRatio.enabled}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      aspectRatio: {
                        ...prev.aspectRatio,
                        height: Math.max(1, parseInt(e.target.value, 10) || 1),
                      },
                    }))
                  }
                  className="text-slate-900 text-xs h-9"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Tolerance (%)
                </label>
                <Input
                  type="number"
                  min="0"
                  max="50"
                  value={settings.aspectRatio.tolerancePercent}
                  disabled={!settings.aspectRatio.enabled}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      aspectRatio: {
                        ...prev.aspectRatio,
                        tolerancePercent: Math.min(
                          50,
                          Math.max(0, parseInt(e.target.value, 10) || 0)
                        ),
                      },
                    }))
                  }
                  className="text-slate-900 text-xs h-9"
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div>
              <p className="text-sm font-bold text-slate-900">Pixel Dimensions</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Optional minimum and maximum image dimensions in pixels. Leave blank for no limit.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                ['minWidth', 'Min Width'],
                ['minHeight', 'Min Height'],
                ['maxWidth', 'Max Width'],
                ['maxHeight', 'Max Height'],
              ].map(([key, label]) => (
                <div key={key}>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    {label}
                  </label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="None"
                    value={settings[key] ?? ''}
                    onChange={(e) => updateDimension(key, e.target.value)}
                    className="text-slate-900 text-xs h-9"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              variant="primary"
              className="text-xs px-6 py-2.5 font-bold shadow-md"
            >
              {isSaving ? 'Saving...' : 'Save Photo Requirements'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export const RegistrationPoliciesPanel = () => {
  const [policies, setPolicies] = useState(DEFAULT_POLICIES)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const loadPolicies = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/settings', { headers: getAuthHeaders() })
      const data = await res.json()
      if (res.ok) {
        const s = data.systemSettings || {}
        setPolicies({
          requirePdfVerification: asBoolean(
            s.requirePdfVerification,
            DEFAULT_POLICIES.requirePdfVerification
          ),
          maxPdfSizeMB:
            asNumber(s.maxPdfSizeMB, null) ??
            asNumber(s.max_pdf_size_mb, DEFAULT_POLICIES.maxPdfSizeMB),
          cafeRegistrationOpen: asBoolean(
            s.cafe_registration_open,
            DEFAULT_POLICIES.cafeRegistrationOpen
          ),
          nonCafeRegistrationOpen: asBoolean(
            s.non_cafe_registration_open,
            DEFAULT_POLICIES.nonCafeRegistrationOpen
          ),
        })
      } else {
        setError(data.message || 'Failed to load registration policies.')
      }
    } catch (e) {
      console.error(e)
      setError('Network error loading registration policies.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPolicies()
  }, [loadPolicies])

  const handleSave = async () => {
    setError(null)
    setSuccess(null)

    if (
      !Number.isFinite(Number(policies.maxPdfSizeMB)) ||
      Number(policies.maxPdfSizeMB) < 1 ||
      Number(policies.maxPdfSizeMB) > 20
    ) {
      setError('Maximum PDF size must be between 1 MB and 20 MB.')
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        registrationPolicies: {
          requirePdfVerification: Boolean(policies.requirePdfVerification),
          maxPdfSizeMB: Number(policies.maxPdfSizeMB),
          cafeRegistrationOpen: Boolean(policies.cafeRegistrationOpen),
          nonCafeRegistrationOpen: Boolean(policies.nonCafeRegistrationOpen),
        },
        systemSettings: {
          requirePdfVerification: Boolean(policies.requirePdfVerification),
          maxPdfSizeMB: Number(policies.maxPdfSizeMB),
          cafe_registration_open: Boolean(policies.cafeRegistrationOpen),
          non_cafe_registration_open: Boolean(policies.nonCafeRegistrationOpen),
        },
        reason: 'Registration policy settings updated',
      }

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess('Registration policies saved and enforced for student submissions.')
      } else {
        setError(data.message || 'Failed to save registration policies.')
      }
    } catch (e) {
      setError('Network error saving registration policies.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
      <div className="pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Icon name="shield" className="w-5 h-5 text-dillaGreen" />
          <h3 className="text-base font-bold text-dillaDarkGreen">
            Registration Verification & Category Policies
          </h3>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Control document verification and whether Cafe or Non-Cafe students may submit registrations. Policies are stored in PostgreSQL and enforced by the server.
        </p>
      </div>

      <Alert type="error" message={error} onClose={() => setError(null)} />
      <Alert type="success" message={success} onClose={() => setSuccess(null)} />

      {loading ? (
        <div className="py-8 text-center text-slate-400 text-xs">
          <Icon name="refresh" className="w-5 h-5 animate-spin mx-auto mb-1 text-dillaGreen" />
          Loading registration policies...
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Document Verification
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Toggle
                checked={policies.requirePdfVerification}
                onChange={(value) =>
                  setPolicies((prev) => ({ ...prev, requirePdfVerification: value }))
                }
                label="Require PDF Registration Slip Verification"
                description="Students must provide an official registrar PDF slip with their registration."
              />
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Maximum PDF Size (MB)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={policies.maxPdfSizeMB}
                  onChange={(e) =>
                    setPolicies((prev) => ({ ...prev, maxPdfSizeMB: e.target.value }))
                  }
                  className="text-slate-900 text-xs h-10"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Allowed range: 1 MB to 20 MB.
                </p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Student Category Registration Availability
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Toggle
                checked={policies.cafeRegistrationOpen}
                onChange={(value) =>
                  setPolicies((prev) => ({ ...prev, cafeRegistrationOpen: value }))
                }
                label="Cafeteria Beneficiary Registration Open"
                description="Allow Cafe students to submit new registrations."
              />
              <Toggle
                checked={policies.nonCafeRegistrationOpen}
                onChange={(value) =>
                  setPolicies((prev) => ({ ...prev, nonCafeRegistrationOpen: value }))
                }
                label="Non-Cafeteria Student Registration Open"
                description="Allow Non-Cafe cost-sharing students to submit new registrations."
              />
            </div>
          </div>

          <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
            <Icon name="alert-circle" className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <span>
              These policies are enforced together with the registration window dates and late-registration authorization on the server. Existing student records remain accessible when a category is closed.
            </span>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              variant="primary"
              className="text-xs px-6 py-2.5 font-bold shadow-md"
            >
              {isSaving ? 'Saving...' : 'Save Registration Policies'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
