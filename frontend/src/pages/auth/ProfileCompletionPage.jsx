import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Input, Button, Select } from '@/components/forms'
import PassportPhotoUpload from '@/components/forms/PassportPhotoUpload'
import Icon from '@/components/icons/Icon'

const getAuthHeaders = () => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

// Built-in fields that are either rendered specially or are identity fields shown in the header.
const HIDDEN_FIELD_KEYS = new Set(['isnoncafeteria', 'photourl', 'studentid', 'fullname'])

const ProfileCompletionPage = () => {
  const [profile, setProfile] = useState(null)
  const [builtinFields, setBuiltinFields] = useState([])
  const [customFields, setCustomFields] = useState([])
  const [departments, setDepartments] = useState([])
  const [campuses, setCampuses] = useState([])
  const [academicYears, setAcademicYears] = useState([])
  const [programs, setPrograms] = useState([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  const [pdfUploading, setPdfUploading] = useState(false)
  const pdfInputRef = useRef(null)

  // Dynamic form state keyed by fieldKey
  const [formValues, setFormValues] = useState({})

  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    setLoading(true)
    setLoadError(null)
    const headers = getAuthHeaders()
    const userId = localStorage.getItem('userId')

    try {
      // Load student profile
      const profileRes = await fetch(`/api/profile?id=${encodeURIComponent(userId || '')}`, { headers })
      if (profileRes.ok) {
        const profileData = await profileRes.json()
        const user = profileData.user || {}
        const student = profileData.student || {}
        setProfile(user)
        setFormValues((prev) => ({
          ...prev,
          gender: user.gender || student.gender || '',
          campus: user.campus || student.campus || '',
          department: user.department || student.department || '',
          program: user.program || student.program || '',
          yearOfStudy:
            user.yearOfStudy != null
              ? String(user.yearOfStudy)
              : student.yearOfStudy != null
                ? String(student.yearOfStudy)
                : '',
          academicYear: user.academicYear || student.academicYear || '',
          phone: user.phone || student.phone || '',
          email: user.email || student.email || '',
          photoUrl: user.photoUrl || student.photoUrl || '',
        }))
      }

      // Load built-in fields (API returns snake_case)
      const builtinRes = await fetch('/api/builtin-fields', { headers })
      if (builtinRes.ok) {
        const builtinData = await builtinRes.json()
        const normalized = (builtinData.builtinFields || []).map((f) => ({
          ...f,
          fieldKey: f.fieldKey ?? f.field_key,
          fieldType: f.fieldType ?? f.field_type,
          isRequired: f.isRequired ?? f.is_required,
          isActive: f.isActive ?? f.is_active,
          visibleStudent: f.visibleStudent ?? f.visible_student,
          visibleDean: f.visibleDean ?? f.visible_dean,
          visibleAdmin: f.visibleAdmin ?? f.visible_admin,
          displayOrder: f.displayOrder ?? f.display_order,
          appliesTo: f.appliesTo ?? f.applies_to,
          validationRules: f.validationRules ?? f.validation_rules,
          helpText: f.helpText ?? f.help_text,
        }))
        setBuiltinFields(normalized)
      }

      // Load custom fields (all, including inactive for reference)
      const customRes = await fetch('/api/custom-fields?all=true', { headers })
      if (customRes.ok) {
        const customData = await customRes.json()
        setCustomFields(customData.customFields || [])
      }

      // Load departments
      const deptRes = await fetch('/api/departments?includeInactive=true', { headers })
      if (deptRes.ok) {
        const deptData = await deptRes.json()
        setDepartments(deptData.departments || [])
      }

      // Load campuses
      const campusRes = await fetch('/api/campuses', { headers })
      if (campusRes.ok) {
        const campusData = await campusRes.json()
        setCampuses(campusData.campuses || [])
      }

      // Load academic years and programs (admin-managed)
      const settingsRes = await fetch('/api/settings', { headers })
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json()
        if (settingsData.academicYears) setAcademicYears(settingsData.academicYears)
        if (settingsData.programs) setPrograms(settingsData.programs)
      }
    } catch (err) {
      console.error('Error loading profile data:', err)
      setLoadError('Error loading profile data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Combine built-in and custom fields. Every displayed field is required except the photo.
  const allFields = useMemo(() => {
    const combined = [
      ...builtinFields.map((f) => ({ ...f, isBuiltIn: true })),
      ...customFields.map((f) => ({ ...f, isBuiltIn: false })),
    ]
    return combined.filter((f) => {
      const key = String(f.fieldKey || '').toLowerCase()
      return f.isActive !== false && f.visibleStudent !== false && !HIDDEN_FIELD_KEYS.has(key)
    })
  }, [builtinFields, customFields])

  const requiredFields = allFields

  const academicYearOptions = useMemo(() => {
    const seen = new Set()
    const result = []
    for (const ay of academicYears) {
      const value = typeof ay === 'object' ? ay.year : ay
      if (value && !seen.has(value)) {
        seen.add(value)
        result.push(value)
      }
    }
    return result
  }, [academicYears])

  const handleInputChange = (fieldKey, value) => {
    setFormValues((prev) => ({ ...prev, [fieldKey]: value }))
    setError(null)
  }

  const handlePdfSelect = async (file) => {
    if (!file) return
    setError(null)

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    if (!isPdf) {
      setError('Only PDF registration slips are accepted.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('The registration slip must be 10MB or smaller.')
      return
    }

    setPdfUploading(true)
    try {
      const dataUrl = await fileToBase64(file)
      const res = await fetch('/api/profile/document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ fileBase64: dataUrl, fileName: file.name }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.message || 'Failed to upload the registration slip.')
        return
      }
      handleInputChange('pdfFileName', data.filename || file.name)
    } catch (err) {
      console.error('Registration slip upload error:', err)
      setError('Network error uploading the registration slip.')
    } finally {
      setPdfUploading(false)
      if (pdfInputRef.current) pdfInputRef.current.value = ''
    }
  }

  const handlePhotoSaved = (photoUrl) => {
    setFormValues((prev) => ({ ...prev, photoUrl }))
    setProfile((prev) => (prev ? { ...prev, photoUrl } : prev))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setError(null)
    setMessage(null)

    // Validate every required field (all fields except the optional photo).
    const missing = requiredFields.filter((f) => {
      const val = formValues[f.fieldKey]
      if (f.fieldType === 'checkbox') return val !== true
      return val === undefined || val === null || String(val).trim() === ''
    })

    if (missing.length > 0) {
      setError(
        `Please fill in the following required field${missing.length > 1 ? 's' : ''}: ${missing
          .map((f) => f.label)
          .join(', ')}.`
      )
      return
    }

    const phoneRaw = String(formValues.phone || '').trim()
    // Must start with +251 and the first digit after the country code must be 9
    const normalized = phoneRaw.startsWith('+') ? phoneRaw.slice(1) : phoneRaw
    if (phoneRaw !== '' && !normalized.startsWith('2519')) {
      setError('Phone number must start with +251 and the first digit after the country code must be 9 (e.g., +251912345678).')
      return
    }

    setSaving(true)
    const token = localStorage.getItem('token')
    const userId = localStorage.getItem('userId')

    try {
      const body = {
        userId,
        profileComplete: true,
      }

      if (formValues.photoUrl) body.photoUrl = formValues.photoUrl

      // Map built-in fields to the profile API
      const fieldMapping = {
        gender: 'gender',
        campus: 'campus',
        department: 'department',
        program: 'program',
        yearOfStudy: 'yearOfStudy',
        academicYear: 'academicYear',
        phone: 'phone',
        email: 'email',
      }

      for (const [fieldKey, apiKey] of Object.entries(fieldMapping)) {
        const field = allFields.find((f) => f.fieldKey === fieldKey)
        if (field && formValues[fieldKey] !== undefined) {
          body[apiKey] = formValues[fieldKey]
        }
      }

      // Collect custom field values
      const customValues = {}
      for (const f of customFields) {
        if (formValues[f.fieldKey] !== undefined) {
          customValues[f.fieldKey] = formValues[f.fieldKey]
        }
      }
      if (Object.keys(customValues).length > 0) {
        body.customValues = customValues
      }

      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      })

      const data = await res.json().catch(() => ({}))
      console.error('Profile save response:', res.status, data)
      if (res.ok) {
        setMessage('Profile completed successfully! You now have full access to the dashboard.')
        localStorage.setItem('profileComplete', 'true')
        localStorage.setItem('userPhotoUrl', formValues.photoUrl || '')
        if (data.onboardingStatus) localStorage.setItem('onboardingStatus', data.onboardingStatus)
        setTimeout(() => {
          window.location.href = '/'
        }, 1500)
      } else {
        setError(`${data.message || 'Failed to complete profile.'}${data.fieldKey ? ` (${data.fieldKey})` : ''}`)
      }
    } catch (err) {
      console.error('Profile completion error:', err)
      setError('Network error completing profile.')
    } finally {
      setSaving(false)
    }
  }

  const userName = profile?.fullName || profile?.name || 'Student'
  const userId = profile?.username || profile?.studentId || localStorage.getItem('studentId') || ''

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8faf9]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-dillaGreen border-t-transparent mb-4"></div>
          <p className="text-slate-600 text-sm">Loading profile completion form...</p>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8faf9] p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-md w-full text-center">
          <Icon name="alert-circle" className="w-8 h-8 text-rose-600 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">Error Loading Profile</h2>
          <p className="text-xs text-slate-500 mb-6">{loadError}</p>
          <Button
            onClick={() => window.location.reload()}
            variant="primary"
            className="w-full text-xs font-bold"
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8faf9] p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-md w-full text-center">
          <Icon name="user" className="w-8 h-8 text-slate-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">Profile Not Found</h2>
          <p className="text-xs text-slate-500 mb-6">Unable to load your student profile.</p>
          <Button
            onClick={() => (window.location.href = '/login')}
            variant="primary"
            className="w-full text-xs font-bold"
          >
            Return to Login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8faf9] flex flex-col">
      <div className="bg-white border-b border-slate-200">
        <div className="px-6 py-4">
          <h1 className="text-xl font-bold text-slate-900">Complete Your Profile</h1>
          <p className="text-xs text-slate-500 mt-1">
            Welcome, <strong>{userName}</strong>. Please complete your registration profile before accessing the dashboard.
          </p>
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-6 max-w-4xl mx-auto w-full">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-dillaDarkGreen">Student Profile Completion</h2>
              <p className="text-xs text-slate-500 mt-1">
                All fields below are required except the photograph. Fields marked with{' '}
                <span className="text-rose-600">*</span> must be completed.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full">
              Step: Profile Completion
            </span>
          </div>

          {message && (
            <div className="bg-emerald-50 border-l-4 border-emerald-600 text-emerald-900 p-4 rounded-xl mb-6 flex items-center justify-between shadow-2xs">
              <span>{message}</span>
              <button onClick={() => setMessage(null)} className="text-emerald-700 hover:text-emerald-950 font-bold ml-4">
                ✕
              </button>
            </div>
          )}

          {error && (
            <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-900 p-4 rounded-xl mb-6 flex items-center justify-between shadow-2xs">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-rose-700 hover:text-rose-950 font-bold ml-4">
                ✕
              </button>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            {/* Student Info Header */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-dillaDarkGreen text-white flex items-center justify-center text-xs font-bold overflow-hidden">
                  {profile?.photoUrl ? (
                    <img src={profile.photoUrl} alt={userName} className="w-full h-full object-cover" />
                  ) : (
                    userId.substring(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{userName}</p>
                  <p className="text-[10px] text-slate-500 font-mono">ID: {userId}</p>
                  <p className="text-[10px] text-slate-500">Campus: {profile?.campus || 'Main Campus'}</p>
                </div>
              </div>
            </div>

            {/* Photograph (optional) */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Icon name="user" className="w-3 h-3 text-emerald-600" />
                Photograph (Optional)
              </h3>
              <PassportPhotoUpload
                photoUrl={formValues.photoUrl || profile?.photoUrl || null}
                studentId={userId}
                onPhotoUploaded={handlePhotoSaved}
                onPhotoSaved={handlePhotoSaved}
              />
            </div>

            {/* Required Fields Section */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Icon name="circle" className="w-3 h-3 text-rose-600" />
                Required Fields
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {requiredFields.map((field) => {
                  const fieldOptions = field.options || []
                  const isDept = field.fieldKey === 'department'
                  const isCampus = field.fieldKey === 'campus'
                  const isProgram = field.fieldKey === 'program'
                  const isYearOfStudy = field.fieldKey === 'yearOfStudy'
                  const isAcademicYear = field.fieldKey === 'academicYear'
                  const isGender = field.fieldKey === 'gender'
                  const isPdf = field.fieldKey === 'pdfFileName' || field.fieldType === 'file'

                  return (
                    <div
                      key={field.fieldKey}
                      className={field.fieldType === 'textarea' || isPdf ? 'sm:col-span-2' : ''}
                    >
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                        {field.label}
                        <span className="text-rose-600">*</span>
                      </label>
                      {field.helpText && (
                        <p className="text-[10px] text-slate-400 mb-2">{field.helpText}</p>
                      )}

                      {/* Department Dropdown */}
                      {isDept && (
                        <Select
                          value={formValues[field.fieldKey] || ''}
                          onChange={(e) => handleInputChange(field.fieldKey, e.target.value)}
                          placeholder="-- Select Department --"
                          className="h-10 text-slate-900"
                          options={departments
                            .filter((d) => d.isActive !== false)
                            .filter((d) => {
                              const studentCampus = String(profile?.campus || '').toLowerCase()
                              return !d.campus || !studentCampus || String(d.campus).toLowerCase() === studentCampus
                            })
                            .map((d) => ({
                              value: d.name,
                              label: d.code ? `${d.name} (${d.code})` : d.name,
                            }))}
                        />
                      )}

                      {/* Campus Dropdown */}
                      {isCampus && (
                        <Select
                          value={formValues[field.fieldKey] || ''}
                          onChange={(e) => handleInputChange(field.fieldKey, e.target.value)}
                          placeholder="-- Select Campus --"
                          className="h-10 text-slate-900"
                          options={campuses
                            .filter((c) => c.status === undefined || c.status === 'active')
                            .map((c) => ({ value: c.name, label: c.name }))}
                        />
                      )}

                      {/* Program Dropdown */}
                      {isProgram && (
                        <Select
                          value={formValues[field.fieldKey] || ''}
                          onChange={(e) => handleInputChange(field.fieldKey, e.target.value)}
                          placeholder="-- Select Program --"
                          className="h-10 text-slate-900"
                          options={programs.map((p) => ({
                            value: typeof p === 'object' ? p.value : p,
                            label: typeof p === 'object' ? (p.label ?? p.value) : p,
                          }))}
                        />
                      )}

                      {/* Year of Study Dropdown */}
                      {isYearOfStudy && (
                        <Select
                          value={formValues[field.fieldKey] || ''}
                          onChange={(e) => handleInputChange(field.fieldKey, e.target.value)}
                          placeholder="-- Select Year --"
                          className="h-10 text-slate-900"
                          options={[1, 2, 3, 4, 5].map((y) => ({ value: String(y), label: `Year ${y}` }))}
                        />
                      )}

                      {/* Academic Year Dropdown */}
                      {isAcademicYear && (
                        <Select
                          value={formValues[field.fieldKey] || ''}
                          onChange={(e) => handleInputChange(field.fieldKey, e.target.value)}
                          placeholder="-- Select Academic Year --"
                          className="h-10 text-slate-900"
                          options={academicYearOptions.map((y) => ({ value: y, label: y }))}
                        />
                      )}

                      {/* Gender Dropdown */}
                      {isGender && (
                        <Select
                          value={formValues[field.fieldKey] || ''}
                          onChange={(e) => handleInputChange(field.fieldKey, e.target.value)}
                          placeholder="-- Select Gender --"
                          className="h-10 text-slate-900"
                          options={['Male', 'Female']}
                        />
                      )}

                      {/* PDF Registration Slip Upload */}
                      {isPdf && (
                        <div>
                          <input
                            type="file"
                            ref={pdfInputRef}
                            accept=".pdf,application/pdf"
                            onChange={(e) => handlePdfSelect(e.target.files?.[0])}
                            className="hidden"
                          />
                          <div
                            onClick={() => !pdfUploading && pdfInputRef.current?.click()}
                            className="border-2 border-dashed border-slate-300 hover:border-dillaGreen rounded-2xl p-6 text-center cursor-pointer transition-all hover:bg-emerald-50/30 bg-slate-50"
                          >
                            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-dillaGreen flex items-center justify-center mx-auto mb-2 shadow-2xs">
                              <Icon name="upload" className="w-6 h-6 text-dillaGreen" />
                            </div>
                            <p className="text-sm font-bold text-slate-800">
                              {pdfUploading
                                ? 'Uploading registration slip...'
                                : formValues.pdfFileName
                                  ? `Attached: ${formValues.pdfFileName}`
                                  : 'Click to select and upload your semester registration slip (PDF)'}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              Accepted format: PDF • Maximum file size: 10MB
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Generic input */}
                      {!isDept &&
                        !isCampus &&
                        !isProgram &&
                        !isYearOfStudy &&
                        !isAcademicYear &&
                        !isGender &&
                        !isPdf && (
                          <>
                            {field.fieldType === 'select' || field.fieldType === 'radio' ? (
                              <Select
                                value={formValues[field.fieldKey] || ''}
                                onChange={(e) => handleInputChange(field.fieldKey, e.target.value)}
                                placeholder={`-- Select ${field.label} --`}
                                className="h-10 text-slate-900"
                                options={fieldOptions}
                              />
                            ) : field.fieldType === 'textarea' ? (
                              <textarea
                                value={formValues[field.fieldKey] || ''}
                                onChange={(e) => handleInputChange(field.fieldKey, e.target.value)}
                                rows={3}
                                placeholder={`Enter ${field.label}...`}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-dillaGreen/30"
                              />
                            ) : field.fieldType === 'checkbox' ? (
                              <label className="flex items-center gap-2 pt-1 text-xs font-bold text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={formValues[field.fieldKey] === true}
                                  onChange={(e) => handleInputChange(field.fieldKey, e.target.checked)}
                                  className="rounded text-dillaGreen w-4 h-4"
                                />
                                <span>Confirm {field.label}</span>
                              </label>
                            ) : (
                              <Input
                                type={field.fieldType === 'date' ? 'date' : field.fieldType === 'email' ? 'email' : 'text'}
                                value={formValues[field.fieldKey] || ''}
                                onChange={(e) => handleInputChange(field.fieldKey, e.target.value)}
                                placeholder={`Enter ${field.label}...`}
                                className="h-10 text-slate-900"
                              />
                            )}
                          </>
                        )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-6 border-t border-slate-200 flex items-center justify-end gap-3">
              <Button
                type="submit"
                disabled={saving || pdfUploading}
                variant="primary"
                className="text-xs px-6 py-2.5 font-bold shadow-md"
              >
                {saving ? 'Completing Profile...' : 'Complete Profile & Continue'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ProfileCompletionPage
