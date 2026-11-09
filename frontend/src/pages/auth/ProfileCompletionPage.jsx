import React, { useState, useEffect, useMemo } from 'react'
import { Input, Button, Select } from '@/components/forms'
import Icon from '@/components/icons/Icon'
import ConfirmModal from '@/components/common/ConfirmModal'

const getAuthHeaders = () => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const ProfileCompletionPage = () => {
  const [profile, setProfile] = useState(null)
  const [builtinFields, setBuiltinFields] = useState([])
  const [customFields, setCustomFields] = useState([])
  const [departments, setDepartments] = useState([])
  const [campuses, setCampuses] = useState([])
  const [batches, setBatches] = useState([])
  const [academicYears, setAcademicYears] = useState([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  // Dynamic form state keyed by fieldKey
  const [formValues, setFormValues] = useState({})

  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    setLoading(true)
    setError(null)
    const headers = getAuthHeaders()
    const userId = localStorage.getItem('userId')

    try {
      // Load student profile
      const profileRes = await fetch(`/api/profile?id=${encodeURIComponent(userId || '')}`, { headers })
      if (profileRes.ok) {
        const profileData = await profileRes.json()
        setProfile(profileData.user || {})
      }

      // Load built-in fields
      const builtinRes = await fetch('/api/builtin-fields', { headers })
      if (builtinRes.ok) {
        const builtinData = await builtinRes.json()
        setBuiltinFields(builtinData.builtinFields || [])
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

      // Load batches
      const batchRes = await fetch('/api/settings', { headers })
      if (batchRes.ok) {
        const batchData = await batchRes.json()
        if (batchData.batches) setBatches(batchData.batches)
        if (batchData.academicYears) setAcademicYears(batchData.academicYears)
      }
    } catch (err) {
      console.error('Error loading profile data:', err)
      setError('Error loading profile data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Combine built-in and custom fields, filter to student-visible required fields
  const allFields = useMemo(() => {
    const combined = [
      ...builtinFields.map((f) => ({ ...f, isBuiltIn: true })),
      ...customFields.map((f) => ({ ...f, isBuiltIn: false })),
    ]
    // Only include active fields visible to students
    return combined.filter((f) => f.isActive !== false && f.visibleStudent !== false)
  }, [builtinFields, customFields])

  // Required fields that must be completed
  const requiredFields = allFields.filter((f) => f.isRequired)

  // Check if all required fields have values
  const allRequiredFilled = requiredFields.every((f) => {
    const val = formValues[f.fieldKey]
    return val !== undefined && val !== null && val !== ''
  })

  const handleInputChange = (fieldKey, value) => {
    setFormValues((prev) => ({ ...prev, [fieldKey]: value }))
    setError(null)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setMessage(null)

    const token = localStorage.getItem('token')
    const userId = localStorage.getItem('userId')

    // Validate required fields
    for (const f of requiredFields) {
      const val = formValues[f.fieldKey]
      if (val === undefined || val === null || val === '') {
        setError(`${f.label} is required.`)
        return
      }
    }

    try {
      // Map built-in field keys to profile API fields
      const body = {
        userId,
        profileComplete: true,
      }

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

      const data = await res.json()
      if (res.ok) {
        setMessage('Profile completed successfully! You now have full access to the dashboard.')
        localStorage.setItem('profileComplete', 'true')
        setTimeout(() => {
          window.location.href = '/'
        }, 1500)
      } else {
        setError(data.message || 'Failed to complete profile.')
      }
    } catch (err) {
      console.error('Profile completion error:', err)
      setError('Network error completing profile.')
    } finally {
      setSaving(false)
    }
  }

  const isStudent = profile?.role === 'student'
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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8faf9] p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-md w-full text-center">
          <Icon name="alert-circle" className="w-8 h-8 text-rose-600 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">Error Loading Profile</h2>
          <p className="text-xs text-slate-500 mb-6">{error}</p>
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
            onClick={() => window.location.href = '/login'}
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

      <div className="flex-1 p-4 sm:p-6 max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-dillaDarkGreen">Student Profile Completion</h2>
              <p className="text-xs text-slate-500 mt-1">
                Fill in all required fields marked with <span className="text-rose-600">*</span>. Optional fields can be left blank.
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
                <div className="w-10 h-10 rounded-full bg-dillaDarkGreen text-white flex items-center justify-center text-xs font-bold">
                  {userId.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{userName}</p>
                  <p className="text-[10px] text-slate-500 font-mono">ID: {userId}</p>
                  <p className="text-[10px] text-slate-500">Campus: {profile?.campus || 'Main Campus'}</p>
                </div>
              </div>
            </div>

            {/* Required Fields Section */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Icon name="circle" className="w-3 h-3 text-rose-600" />
                Required Fields
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {requiredFields.map((field) => {
                  const isBuiltIn = field.isBuiltIn
                  const fieldOptions = field.options || []
                  const isDept = field.fieldKey === 'department'
                  const isCampus = field.fieldKey === 'campus'
                  const isProgram = field.fieldKey === 'program'
                  const isYearOfStudy = field.fieldKey === 'yearOfStudy'
                  const isAcademicYear = field.fieldKey === 'academicYear'
                  const isGender = field.fieldKey === 'gender'

                  return (
                    <div
                      key={field.fieldKey}
                      className={field.fieldType === 'textarea' ? 'sm:col-span-2' : ''}
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
                          onChange={(val) => handleInputChange(field.fieldKey, val)}
                          placeholder="Select department"
                          className="h-10 text-slate-900"
                        >
                          <option value="">-- Select Department --</option>
                          {departments
                            .filter((d) => d.isActive !== false)
                            .filter((d) => !field.campus || d.campus === field.campus || d.campus === profile?.campus)
                            .map((d) => (
                              <option key={d.id} value={d.name}>
                                {d.name}{d.code ? ` (${d.code})` : ''}
                              </option>
                            ))}
                        </Select>
                      )}

                      {/* Campus Dropdown */}
                      {isCampus && (
                        <Select
                          value={formValues[field.fieldKey] || ''}
                          onChange={(val) => handleInputChange(field.fieldKey, val)}
                          placeholder="Select campus"
                          className="h-10 text-slate-900"
                        >
                          <option value="">-- Select Campus --</option>
                          {campuses.map((c) => (
                            <option key={c.id || c.name} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                        </Select>
                      )}

                      {/* Program Dropdown */}
                      {isProgram && (
                        <Select
                          value={formValues[field.fieldKey] || ''}
                          onChange={(val) => handleInputChange(field.fieldKey, val)}
                          placeholder="Select program"
                          className="h-10 text-slate-900"
                        >
                          <option value="">-- Select Program --</option>
                          <option value="Regular Degree">Regular Degree</option>
                          <option value="Continuing Education">Continuing Education</option>
                          <option value="Postgraduate Degree">Postgraduate Degree</option>
                          <option value="Masters Program">Masters Program</option>
                        </Select>
                      )}

                      {/* Year of Study Dropdown */}
                      {isYearOfStudy && (
                        <Select
                          value={formValues[field.fieldKey] || ''}
                          onChange={(val) => handleInputChange(field.fieldKey, val)}
                          placeholder="Select year"
                          className="h-10 text-slate-900"
                        >
                          <option value="">-- Select Year --</option>
                          {[1, 2, 3, 4, 5].map((y) => (
                            <option key={y} value={String(y)}>
                              Year {y}
                            </option>
                          ))}
                        </Select>
                      )}

                      {/* Academic Year Dropdown */}
                      {isAcademicYear && (
                        <Select
                          value={formValues[field.fieldKey] || ''}
                          onChange={(val) => handleInputChange(field.fieldKey, val)}
                          placeholder="Select academic year"
                          className="h-10 text-slate-900"
                        >
                          <option value="">-- Select Academic Year --</option>
                          {academicYears.map((ay) => (
                            <option key={ay.id || ay.year} value={ay.year}>
                              {ay.year}
                            </option>
                          ))}
                          <option value="2023/2024">2023/2024</option>
                          <option value="2024/2025">2024/2025</option>
                          <option value="2025/2026">2025/2026</option>
                        </Select>
                      )}

                      {/* Gender Dropdown */}
                      {isGender && (
                        <Select
                          value={formValues[field.fieldKey] || ''}
                          onChange={(val) => handleInputChange(field.fieldKey, val)}
                          placeholder="Select gender"
                          className="h-10 text-slate-900"
                        >
                          <option value="">-- Select Gender --</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </Select>
                      )}

                      {/* Generic input */}
                      {!isDept && !isCampus && !isProgram && !isYearOfStudy && !isAcademicYear && !isGender && (
                        <>
                          {field.fieldType === 'select' || field.fieldType === 'radio' ? (
                            <Select
                              value={formValues[field.fieldKey] || ''}
                              onChange={(val) => handleInputChange(field.fieldKey, val)}
                              placeholder={`Select ${field.label}`}
                              className="h-10 text-slate-900"
                            >
                              <option value="">-- Select {field.label} --</option>
                              {fieldOptions.map((o) => (
                                <option key={o} value={o}>
                                  {o}
                                </option>
                              ))}
                            </Select>
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
                              type={field.fieldType === 'date' ? 'date' : 'text'}
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

              {/* Optional Fields Section */}
              <div className="pt-6 border-t border-slate-200">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Icon name="minus" className="w-3 h-3 text-emerald-600" />
                  Optional Fields
                </h3>
                <p className="text-[10px] text-slate-500 mb-4">
                  These fields are optional and will not block profile completion.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {allFields
                    .filter((f) => !f.isRequired)
                    .map((field) => (
                      <div
                        key={field.fieldKey}
                        className={field.fieldType === 'textarea' ? 'sm:col-span-2' : ''}
                      >
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                          {field.label}
                        </label>
                        {field.helpText && (
                          <p className="text-[10px] text-slate-400 mb-2">{field.helpText}</p>
                        )}
                        <Input
                          type="text"
                          value={formValues[field.fieldKey] || ''}
                          onChange={(e) => handleInputChange(field.fieldKey, e.target.value)}
                          placeholder={`Enter ${field.label}...`}
                          className="h-10 text-slate-900"
                        />
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-6 border-t border-slate-200 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (confirm('Leaving now will leave your profile incomplete. You will be redirected back here on next login. Continue?')) {
                    window.location.href = '/login'
                  }
                }}
                className="text-xs px-4 py-2"
              >
                Not Now
              </Button>
              <Button
                type="submit"
                disabled={saving || !allRequiredFilled}
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
