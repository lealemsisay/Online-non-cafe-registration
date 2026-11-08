import React, { useState, useEffect } from 'react'
import { Input, Button } from '@/components/forms'
import Icon from '@/components/icons/Icon'
import RegistrationFormBuilder from '@/components/settings/RegistrationFormBuilder'
import { DepartmentManagement, AcademicYearManagement } from '@/components/settings/AcademicConfiguration'
import { PhotoRequirementsPanel, RegistrationPoliciesPanel } from '@/components/settings/PhotoAndPolicySettings'

const Settings = () => {
  // Navigation Tabs: 'builder', 'photo', 'academic', 'schedule', 'governance'
  const [activeTab, setActiveTab] = useState('builder')

  // Academic Calendar & Entities
  const [academicYears, setAcademicYears] = useState([])
  const [newAcademicYear, setNewAcademicYear] = useState('')
  const [departments, setDepartments] = useState([])
  const [newDepartment, setNewDepartment] = useState('')
  const [batches, setBatches] = useState([])
  const [newBatch, setNewBatch] = useState('')
  const [programs, setPrograms] = useState([])
  const [newProgram, setNewProgram] = useState('')
  const [campuses, setCampuses] = useState([])

  // Policy Settings
  const [systemSettings, setSystemSettings] = useState({
    allowLateRegistration: false,
    requirePdfVerification: true,
    maxPdfSizeMB: 5,
    maxPhotoSizeMB: 8,
    registration_start_date: null,
    registration_end_date: null,
    registration_is_open: true,
    allow_late_registration: false,
  })

  // Schedule State
  const [scheduleState, setScheduleState] = useState({
    startDate: '',
    endDate: '',
    isOpen: true,
    allowLate: false,
    reason: '',
  })
  const [scheduleAuditHistory, setScheduleAuditHistory] = useState([])
  const [windowStatus, setWindowStatus] = useState({ isOpen: true, reason: '' })

  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  const loadSettingsAndData = async () => {
    setLoading(true)
    const token = localStorage.getItem('token')
    const headers = token ? { Authorization: `Bearer ${token}` } : {}

    try {
      const settingsRes = await fetch('/api/settings', { headers })
      if (settingsRes.ok) {
        const data = await settingsRes.json()
        if (data.academicYears) setAcademicYears(data.academicYears)
        if (data.departments) setDepartments(data.departments)
        if (data.batches) setBatches(data.batches)
        if (data.programs) setPrograms(data.programs)
        if (data.systemSettings) {
          const effectivePhotoLimit =
            data.systemSettings.maxPhotoSizeMB || data.systemSettings.max_photo_size_mb || 8
          setSystemSettings({
            ...data.systemSettings,
            maxPhotoSizeMB: Number(effectivePhotoLimit) || 8,
          })
          const formatLocal = (iso) => (iso ? new Date(iso).toISOString().slice(0, 16) : '')
          setScheduleState({
            startDate: formatLocal(data.systemSettings.registration_start_date),
            endDate: formatLocal(data.systemSettings.registration_end_date),
            isOpen: data.systemSettings.registration_is_open !== false,
            allowLate: Boolean(
              data.systemSettings.allow_late_registration ||
                data.systemSettings.allowLateRegistration
            ),
          })
        }
        if (data.registrationWindow) {
          setWindowStatus(data.registrationWindow)
        }
        if (data.scheduleAuditHistory) {
          setScheduleAuditHistory(data.scheduleAuditHistory)
        }
      }

      const campusRes = await fetch('/api/campuses', { headers })
      if (campusRes.ok) {
        const cData = await campusRes.json()
        setCampuses(cData.campuses || [])
      }
    } catch (err) {
      console.error('Error loading settings:', err)
      setError('Failed to fetch settings from server.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettingsAndData()
  }, [])

  const handleSaveSchedule = async () => {
    setError(null)
    setMessage(null)
    setIsSaving(true)
    const token = localStorage.getItem('token')

    // Validate closing date is not earlier than opening date
    if (scheduleState.startDate && scheduleState.endDate) {
      const s = new Date(scheduleState.startDate).getTime()
      const e = new Date(scheduleState.endDate).getTime()
      if (!isNaN(s) && !isNaN(e) && e < s) {
        setError('Registration closing date & time cannot be earlier than opening date & time.')
        setIsSaving(false)
        return
      }
    }

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          schedule: {
            startDate: scheduleState.startDate
              ? new Date(scheduleState.startDate).toISOString()
              : null,
            endDate: scheduleState.endDate
              ? new Date(scheduleState.endDate).toISOString()
              : null,
            isOpen: scheduleState.isOpen,
            allowLate: scheduleState.allowLate,
            reason: scheduleState.reason,
          },
          reason: scheduleState.reason,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setMessage('Registration schedule updated and enforced successfully.')
        if (data.registrationWindow) setWindowStatus(data.registrationWindow)
        if (data.scheduleAuditHistory) setScheduleAuditHistory(data.scheduleAuditHistory)
        setScheduleState((p) => ({ ...p, reason: '' }))
      } else {
        setError(data.message || 'Failed to update schedule')
      }
    } catch (e) {
      setError('Network error saving registration schedule.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSavePhotoLimit = async (limitValue) => {
    setError(null)
    setMessage(null)
    setIsSaving(true)
    const token = localStorage.getItem('token')

    const clamped = Math.min(10, Math.max(1, limitValue || 8))

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          maxPhotoSizeMB: clamped,
          systemSettings: {
            ...systemSettings,
            maxPhotoSizeMB: clamped,
            max_photo_size_mb: clamped,
          },
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setSystemSettings((prev) => ({
          ...prev,
          maxPhotoSizeMB: clamped,
          max_photo_size_mb: clamped,
        }))
        setMessage(`Maximum student photo upload limit successfully updated to ${clamped} MB.`)
      } else {
        setError(data.message || 'Failed to update photo limit')
      }
    } catch (e) {
      setError('Network error saving photo limit.')
    } finally {
      setIsSaving(false)
    }
  }

  // Lightweight refresh of the academic lists used by other tabs (no full-page reload).
  const refreshAcademicLists = async () => {
    const token = localStorage.getItem('token')
    try {
      const res = await fetch('/api/settings', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      if (res.ok) {
        const data = await res.json()
        if (data.academicYears) setAcademicYears(data.academicYears)
        if (data.departments) setDepartments(data.departments)
      }
    } catch {
      // non-critical
    }
  }

  const handleSaveAcademicEntities = async (updated) => {
    setError(null)
    setMessage(null)
    setIsSaving(true)
    const token = localStorage.getItem('token')

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(updated),
      })

      const data = await res.json()
      if (res.ok) {
        setMessage('Academic configuration saved and synced across registration forms.')
        if (updated.departments) setDepartments(updated.departments)
        if (updated.batches) setBatches(updated.batches)
        if (updated.programs) setPrograms(updated.programs)
      } else {
        setError(data.message || 'Failed to update academic configuration')
      }
    } catch (e) {
      setError('Network error saving academic configuration.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddDepartment = () => {
    const val = newDepartment.trim()
    if (!val) return
    if (departments.includes(val)) {
      setError(`Department "${val}" already exists.`)
      return
    }
    const next = [...departments, val]
    handleSaveAcademicEntities({ departments: next })
    setNewDepartment('')
  }

  const handleRemoveDepartment = (dept) => {
    const next = departments.filter((d) => d !== dept)
    handleSaveAcademicEntities({ departments: next })
  }

  const handleAddBatch = () => {
    const val = newBatch.trim()
    if (!val) return
    if (batches.includes(val)) {
      setError(`Batch "${val}" already exists.`)
      return
    }
    const next = [...batches, val].sort()
    handleSaveAcademicEntities({ batches: next })
    setNewBatch('')
  }

  const handleRemoveBatch = (b) => {
    const next = batches.filter((item) => item !== b)
    handleSaveAcademicEntities({ batches: next })
  }

  const handleAddAcademicYear = async () => {
    const year = newAcademicYear.trim()
    if (!year) {
      setError('Please provide a valid academic year (e.g., 2025/2026).')
      return
    }

    setError(null)
    setMessage(null)
    setIsSaving(true)
    const token = localStorage.getItem('token')

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ newAcademicYear: year }),
      })

      const data = await res.json()
      if (res.ok) {
        setMessage(`Academic Year '${year}' added successfully!`)
        setNewAcademicYear('')
        if (data.academicYears) setAcademicYears(data.academicYears)
      } else {
        setError(data.message || 'Failed to add academic year')
      }
    } catch (e) {
      setError('Network error adding academic year.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSavePolicies = async () => {
    setError(null)
    setMessage(null)
    setIsSaving(true)
    const token = localStorage.getItem('token')

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          systemSettings,
          maxPhotoSizeMB: systemSettings.maxPhotoSizeMB || 8,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setMessage('System policy settings and upload limits updated successfully.')
      } else {
        setError(data.message || 'Failed to save settings')
      }
    } catch (e) {
      setError('Network error saving settings.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-dillaDarkGreen via-[#12442c] to-dillaGreen p-6 text-white">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-white p-1.5 shadow-md flex items-center justify-center flex-shrink-0">
              <img
                src="/dilla-logo.png"
                alt="Dilla University Seal"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-bold text-dillaGold">
                  Institutional Governance
                </span>
                <span className="text-white/40">•</span>
                <span className="text-xs text-emerald-200 font-medium">
                  Super Admin Policy Engine
                </span>
              </div>
              <h1 className="font-serif text-2xl font-bold tracking-tight text-white mt-0.5">
                University System Settings & Configuration
              </h1>
              <p className="text-xs text-white/80 mt-0.5">
                Dynamic Registration Form Builder, Photo Size Rules, Academic Configuration, and Institutional Policies
              </p>
            </div>
          </div>
        </div>

        {/* Top-Level Section Navigation Tabs */}
        <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-50 px-4 pt-2">
          <button
            onClick={() => setActiveTab('builder')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'builder'
                ? 'border-dillaGreen text-dillaDarkGreen bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icon name="sliders-horizontal" className="w-4 h-4 text-dillaGreen" />
            <span>1. Registration Form Builder</span>
          </button>

          <button
            onClick={() => setActiveTab('photo')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'photo'
                ? 'border-dillaGreen text-dillaDarkGreen bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icon name="image" className="w-4 h-4 text-dillaGreen" />
            <span>2. Photo Upload Limits</span>
          </button>

          <button
            onClick={() => setActiveTab('academic')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'academic'
                ? 'border-dillaGreen text-dillaDarkGreen bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icon name="book-open" className="w-4 h-4 text-dillaGreen" />
            <span>3. Academic Configuration</span>
          </button>

          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'schedule'
                ? 'border-dillaGreen text-dillaDarkGreen bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icon name="calendar" className="w-4 h-4 text-dillaGreen" />
            <span>4. Registration Window & Policies</span>
          </button>

          <button
            onClick={() => setActiveTab('governance')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'governance'
                ? 'border-dillaGreen text-dillaDarkGreen bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icon name="shield" className="w-4 h-4 text-dillaGreen" />
            <span>5. Roles & Governance</span>
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {message && (
        <div className="bg-emerald-50 border-l-4 border-emerald-600 text-emerald-900 p-4 rounded-xl flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <Icon name="check-circle" className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="text-sm font-semibold">{message}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-emerald-700 hover:text-emerald-950 font-bold ml-4">
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-900 p-4 rounded-xl flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <Icon name="alert-circle" className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span className="text-sm font-semibold">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-700 hover:text-rose-950 font-bold ml-4">
            ×
          </button>
        </div>
      )}

      {/* TAB 1: DYNAMIC REGISTRATION FORM BUILDER */}
      {activeTab === 'builder' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <RegistrationFormBuilder
            userRole="admin"
            campuses={campuses}
            departments={departments}
            batches={batches}
            academicYears={academicYears}
          />
        </div>
      )}

      {/* TAB 2: STUDENT PHOTO UPLOAD LIMITS */}
      {activeTab === 'photo' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="pb-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Icon name="image" className="w-5 h-5 text-dillaGreen" />
              <h2 className="text-lg font-bold text-dillaDarkGreen">
                Student Passport Photo Upload Configuration
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Admin controls the upper file size limit for student passport-size photo uploads. Changes persist in PostgreSQL and immediately govern both the frontend upload component and backend validation.
            </p>
          </div>

          <div className="p-6 bg-gradient-to-br from-emerald-50/70 to-slate-50 rounded-2xl border border-emerald-200 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">Active Policy Limit</span>
                <p className="text-3xl font-extrabold text-dillaGreen mt-0.5">
                  {systemSettings.maxPhotoSizeMB || 8} MB
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Default: <strong>8 MB</strong> • Configurable bounds: <strong>1 MB to 10 MB</strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={systemSettings.maxPhotoSizeMB || 8}
                  onChange={(e) => {
                    const v = parseInt(e.target.value) || 1
                    setSystemSettings((p) => ({ ...p, maxPhotoSizeMB: v }))
                  }}
                  className="w-24 text-center font-bold text-slate-900 text-sm h-10"
                />
                <Button
                  onClick={() => handleSavePhotoLimit(systemSettings.maxPhotoSizeMB)}
                  disabled={isSaving}
                  variant="primary"
                  className="text-xs px-4 py-2 font-bold shadow-md"
                >
                  {isSaving ? 'Saving...' : 'Apply Limit'}
                </Button>
              </div>
            </div>

            {/* Slider control */}
            <div>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={systemSettings.maxPhotoSizeMB || 8}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 8
                  setSystemSettings((p) => ({ ...p, maxPhotoSizeMB: val }))
                }}
                className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-dillaGreen"
              />
              <div className="flex justify-between text-xs text-slate-500 font-bold mt-1.5">
                <span>1 MB (Strict)</span>
                <span>5 MB</span>
                <span>8 MB (Default)</span>
                <span>10 MB (Max Limit)</span>
              </div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
              <p className="font-bold text-slate-800 flex items-center gap-1.5">
                <Icon name="shield" className="w-4 h-4 text-emerald-600" />
                Security & Storage Guarantees:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                <li>Existing student photos remain completely accessible when this limit is adjusted.</li>
                <li>Backend inspects true binary magic bytes (JPEG: FF D8 FF, PNG: 89 50 4E 47).</li>
                <li>Allowed formats, aspect ratio and pixel dimensions can be enforced in the Photo Requirements card below, and are verified again on the server.</li>
                <li>Non-admins attempting to change this limit receive HTTP 403 Forbidden.</li>
              </ul>
            </div>
          </div>

          <PhotoRequirementsPanel />
        </div>
      )}

      {/* TAB 3: ACADEMIC CONFIGURATION (DEPARTMENTS, BATCHES, PROGRAMS, YEARS) */}
      {activeTab === 'academic' && (
        <div className="space-y-6">
          <DepartmentManagement campuses={campuses} onChanged={refreshAcademicLists} />

          <div className="grid grid-cols-1 gap-6">
            {/* Batches Management */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
              <div className="pb-3 border-b border-slate-200">
                <h3 className="text-sm font-bold text-dillaDarkGreen uppercase tracking-wider flex items-center gap-1.5">
                  <Icon name="calendar" className="w-4 h-4 text-dillaGreen" />
                  Registered Batches
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configurable student admission batches
                </p>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="e.g. 2026"
                  value={newBatch}
                  onChange={(e) => setNewBatch(e.target.value)}
                  className="text-slate-900 text-xs h-9"
                />
                <Button
                  onClick={handleAddBatch}
                  disabled={isSaving}
                  variant="primary"
                  className="text-xs px-3 font-bold flex-shrink-0"
                >
                  Add Batch
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-2">
                {batches.map((b) => (
                  <span
                    key={b}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold text-xs rounded-lg"
                  >
                    <span>Batch {b}</span>
                    <button
                      onClick={() => handleRemoveBatch(b)}
                      className="text-emerald-700 hover:text-rose-600 font-bold ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <AcademicYearManagement onChanged={refreshAcademicLists} />
        </div>
      )}

      {/* TAB 4: REGISTRATION WINDOW & POLICIES */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Icon name="calendar" className="w-5 h-5 text-dillaGreen" />
                  <h2 className="text-lg font-bold text-dillaDarkGreen">
                    Registration Window & Verification Policies
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enforced server-side in PostgreSQL. Prevents student submissions outside schedule.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {scheduleState.allowLate && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-900 font-bold text-xs rounded-full border border-amber-300 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    LATE REGISTRATION ACTIVE
                  </span>
                )}
                {windowStatus.isOpen ? (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-emerald-100 text-emerald-900 font-bold text-xs rounded-full border border-emerald-300 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    WINDOW OPEN
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-rose-100 text-rose-900 font-bold text-xs rounded-full border border-rose-300 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    WINDOW CLOSED
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Registration Opening Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={scheduleState.startDate}
                  onChange={(e) => setScheduleState((p) => ({ ...p, startDate: e.target.value }))}
                  className="w-full h-10 px-3 border border-slate-300 rounded-lg text-slate-900 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-dillaGreen/30 focus:border-dillaGreen"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Students cannot register before this timestamp.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Registration Closing Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={scheduleState.endDate}
                  onChange={(e) => setScheduleState((p) => ({ ...p, endDate: e.target.value }))}
                  className="w-full h-10 px-3 border border-slate-300 rounded-lg text-slate-900 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-dillaGreen/30 focus:border-dillaGreen"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Students cannot register after this timestamp unless Late Registration is active.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition-colors">
                <input
                  type="checkbox"
                  checked={scheduleState.isOpen}
                  onChange={(e) => setScheduleState((p) => ({ ...p, isOpen: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 text-dillaGreen rounded border-slate-300 focus:ring-dillaGold"
                />
                <div>
                  <p className="text-sm font-bold text-slate-900">Master Window Switch</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Toggle to manually open or close registration immediately regardless of dates.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 bg-amber-50/50 rounded-xl border border-amber-200 cursor-pointer hover:bg-amber-100/50 transition-colors">
                <input
                  type="checkbox"
                  checked={scheduleState.allowLate}
                  onChange={(e) => setScheduleState((p) => ({ ...p, allowLate: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500"
                />
                <div>
                  <p className="text-sm font-bold text-amber-950">Allow Late Registration (Super Admin)</p>
                  <p className="text-xs text-amber-800/80 mt-0.5">
                    Permits students to register outside standard dates. Records authorization audit trail.
                  </p>
                </div>
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Authorization Memo / Reason for Change (Logged in Audit History)
              </label>
              <input
                type="text"
                placeholder="e.g. Authorized 7-day extension for semester 2 regular degree applicants"
                value={scheduleState.reason}
                onChange={(e) => setScheduleState((p) => ({ ...p, reason: e.target.value }))}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg text-slate-900 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-dillaGreen/30 focus:border-dillaGreen"
              />
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500 font-medium">
                Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone} (UTC stored in DB)
              </span>
              <Button
                onClick={handleSaveSchedule}
                disabled={isSaving}
                variant="primary"
                className="text-xs px-6 py-2.5 font-bold shadow-md"
              >
                {isSaving ? 'Updating...' : 'Save Schedule Settings'}
              </Button>
            </div>
          </div>

          <RegistrationPoliciesPanel />

          {/* Audit History of Schedule Changes */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Icon name="history" className="w-5 h-5 text-dillaGreen" />
                <h3 className="text-base font-bold text-dillaDarkGreen">
                  Schedule & Late Registration Audit History
                </h3>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {scheduleAuditHistory.length} Record{scheduleAuditHistory.length === 1 ? '' : 's'}
              </span>
            </div>

            {scheduleAuditHistory.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No schedule changes logged yet.
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Admin User</th>
                      <th className="py-2.5 px-3">Action</th>
                      <th className="py-2.5 px-3">Reason / Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {scheduleAuditHistory.map((item) => {
                      let parsedDetails = null
                      try {
                        parsedDetails = typeof item.details === 'string' ? JSON.parse(item.details) : item.details
                      } catch {
                        parsedDetails = { raw: item.details }
                      }

                      const actionLabels = {
                        update_schedule: 'Schedule Updated',
                        enable_late_registration: 'Late Registration Enabled',
                        disable_late_registration: 'Late Registration Disabled',
                        toggle_late_registration: 'Late Registration Toggled',
                        update_registration_policies: 'Registration Policy Updated',
                        update_photo_settings: 'Photo Requirements Updated',
                      }

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-slate-500">
                            {new Date(item.createdAt || item.created_at).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap font-bold text-slate-900">
                            {item.performedBy || item.performed_by || 'Admin'}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                item.action?.includes('enable')
                                  ? 'bg-amber-100 text-amber-900'
                                  : item.action?.includes('disable')
                                  ? 'bg-slate-100 text-slate-800'
                                  : 'bg-emerald-100 text-emerald-900'
                              }`}
                            >
                              {actionLabels[item.action] || item.action}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 max-w-md">
                            <div className="font-medium text-slate-900">
                              {parsedDetails?.reason || parsedDetails?.raw || (item.action === 'update_registration_policies' ? 'Registration policy or applicable academic year updated' : item.action === 'update_photo_settings' ? 'Photo requirements updated' : 'Schedule update')}
                            </div>
                            {parsedDetails?.startDate && (
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                Window: {parsedDetails.startDate ? new Date(parsedDetails.startDate).toLocaleString() : 'None'} →{' '}
                                {parsedDetails.endDate ? new Date(parsedDetails.endDate).toLocaleString() : 'None'}
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: SYSTEM ROLES & GOVERNANCE */}
      {activeTab === 'governance' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Icon name="shield" className="w-5 h-5 text-dillaGreen" />
              <h2 className="text-lg font-bold text-dillaDarkGreen">
                System Governance & Role Access Controls
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Role permissions and user directory navigation
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 text-dillaDarkGreen mb-2">
                <Icon name="user-check" className="w-5 h-5" />
                <h3 className="font-bold text-sm">Super Admin</h3>
              </div>
              <p className="text-xs text-slate-500">
                Complete institutional oversight, form builder, upload limits, and final approval decisions.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 text-dillaDarkGreen mb-2">
                <Icon name="building" className="w-5 h-5" />
                <h3 className="font-bold text-sm">Campus Dean</h3>
              </div>
              <p className="text-xs text-slate-500">
                Review and batch submission strictly scoped to their assigned University campus.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 text-dillaDarkGreen mb-2">
                <Icon name="user" className="w-5 h-5" />
                <h3 className="font-bold text-sm">Student</h3>
              </div>
              <p className="text-xs text-slate-500">
                Self-service cost-sharing registration, passport photo upload, and permitted profile edits.
              </p>
            </div>
          </div>

          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-emerald-900">Manage Campus Deans & Student Directory</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                Create new Campus Deans, reset user passwords, deactivate or reactivate accounts.
              </p>
            </div>
            <a
              href="/admin/users"
              className="px-4 py-2 bg-dillaGreen hover:bg-dillaDarkGreen text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
            >
              Open User Management →
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

export default Settings
