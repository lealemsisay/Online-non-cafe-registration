import React, { useState, useEffect } from 'react'
import { Input, Button } from '@/components/forms'
import Icon from '@/components/icons/Icon'

const Settings = () => {
  const [academicYears, setAcademicYears] = useState([])
  const [newAcademicYear, setNewAcademicYear] = useState('')
  const [systemSettings, setSystemSettings] = useState({
    allowLateRegistration: false,
    requirePdfVerification: true,
    maxPdfSizeMB: 5,
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
  })
  const [windowStatus, setWindowStatus] = useState({ isOpen: true, reason: '' })

  // Custom Fields State
  const [customFields, setCustomFields] = useState([])
  const [campuses, setCampuses] = useState([])
  const [newField, setNewField] = useState({
    fieldKey: '',
    label: '',
    fieldType: 'text',
    optionsStr: '',
    isRequired: false,
    isActive: true,
    campus: 'all',
  })

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
        if (data.systemSettings) {
          setSystemSettings(data.systemSettings)
          const formatLocal = (iso) => (iso ? new Date(iso).toISOString().slice(0, 16) : '')
          setScheduleState({
            startDate: formatLocal(data.systemSettings.registration_start_date),
            endDate: formatLocal(data.systemSettings.registration_end_date),
            isOpen: data.systemSettings.registration_is_open !== false,
            allowLate: Boolean(data.systemSettings.allow_late_registration || data.systemSettings.allowLateRegistration),
          })
        }
        if (data.registrationWindow) {
          setWindowStatus(data.registrationWindow)
        }
      }

      const campusRes = await fetch('/api/campuses', { headers })
      if (campusRes.ok) {
        const cData = await campusRes.json()
        setCampuses(cData.campuses || [])
      }

      const fieldsRes = await fetch('/api/custom-fields?all=true', { headers })
      if (fieldsRes.ok) {
        const fData = await fieldsRes.json()
        setCustomFields(fData.customFields || [])
      }
    } catch (err) {
      console.error('Error loading settings and custom fields:', err)
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

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          schedule: {
            startDate: scheduleState.startDate ? new Date(scheduleState.startDate).toISOString() : null,
            endDate: scheduleState.endDate ? new Date(scheduleState.endDate).toISOString() : null,
            isOpen: scheduleState.isOpen,
            allowLate: scheduleState.allowLate,
          },
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setMessage('Registration schedule updated and enforced successfully.')
        if (data.registrationWindow) setWindowStatus(data.registrationWindow)
      } else {
        setError(data.message || 'Failed to update schedule')
      }
    } catch (e) {
      setError('Network error saving registration schedule.')
    } finally {
      setIsSaving(false)
    }
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

  const handleSaveSettings = async () => {
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
        body: JSON.stringify({ systemSettings }),
      })

      const data = await res.json()
      if (res.ok) {
        setMessage('System policy settings updated successfully.')
      } else {
        setError(data.message || 'Failed to save settings')
      }
    } catch (e) {
      setError('Network error saving settings.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreateCustomField = async (e) => {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (!newField.fieldKey || !newField.label) {
      setError('Field Identifier (key) and Field Label are required.')
      return
    }

    const token = localStorage.getItem('token')
    const optionsArray =
      newField.fieldType === 'select'
        ? newField.optionsStr.split(',').map((o) => o.trim()).filter(Boolean)
        : []

    if (newField.fieldType === 'select' && optionsArray.length === 0) {
      setError('Please provide at least one comma-separated option for dropdown fields.')
      return
    }

    try {
      const res = await fetch('/api/custom-fields', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          fieldKey: newField.fieldKey,
          label: newField.label,
          fieldType: newField.fieldType,
          options: optionsArray,
          isRequired: newField.isRequired,
          isActive: newField.isActive,
          campus: newField.campus === 'all' ? null : newField.campus,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setMessage(`Custom field '${newField.label}' defined successfully.`)
        setNewField({
          fieldKey: '',
          label: '',
          fieldType: 'text',
          optionsStr: '',
          isRequired: false,
          isActive: true,
          campus: 'all',
        })
        loadSettingsAndData()
      } else {
        setError(data.message || 'Failed to create custom field')
      }
    } catch (e) {
      setError('Network error creating custom field.')
    }
  }

  const handleToggleFieldActive = async (field) => {
    const token = localStorage.getItem('token')
    try {
      const res = await fetch('/api/custom-fields', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          id: field.id,
          isActive: !field.isActive,
        }),
      })
      if (res.ok) {
        setCustomFields((prev) =>
          prev.map((f) => (f.id === field.id ? { ...f, isActive: !f.isActive } : f))
        )
      }
    } catch (e) {
      console.error('Error toggling field active state:', e)
    }
  }

  const handleDeleteField = async (field) => {
    if (!window.confirm(`Are you sure you want to delete custom field '${field.label}'? All student values stored for this field will be removed.`)) {
      return
    }
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`/api/custom-fields?id=${field.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.ok) {
        setMessage(`Custom field '${field.label}' was safely removed.`)
        setCustomFields((prev) => prev.filter((f) => f.id !== field.id))
      } else {
        const d = await res.json()
        setError(d.message || 'Failed to delete custom field')
      }
    } catch (e) {
      setError('Network error deleting custom field.')
    }
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header */}
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
                Configure cost-sharing registration schedules, custom student fields, academic calendar, and policy enforcement
              </p>
            </div>
          </div>
        </div>
      </div>

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

      {/* REGISTRATION SCHEDULE & CLOSING DATE/TIME SETTINGS */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <Icon name="calendar" className="w-5 h-5 text-dillaGreen" />
              <h2 className="text-lg font-bold text-dillaDarkGreen">
                Registration Schedule & Window Control
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Enforced server-side in PostgreSQL. Rejects new registrations automatically outside active window.
            </p>
          </div>

          <div>
            {windowStatus.isOpen ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-emerald-100 text-emerald-900 font-bold text-xs rounded-full border border-emerald-300 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                REGISTRATION WINDOW OPEN
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-rose-100 text-rose-900 font-bold text-xs rounded-full border border-rose-300 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                REGISTRATION WINDOW CLOSED
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Registration Opening Date & Time (UTC)
            </label>
            <input
              type="datetime-local"
              value={scheduleState.startDate}
              onChange={(e) => setScheduleState((p) => ({ ...p, startDate: e.target.value }))}
              className="w-full h-10 px-3 border border-slate-300 rounded-lg text-slate-900 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-dillaGreen/30 focus:border-dillaGreen"
            />
            <p className="text-xs text-slate-500 mt-1">
              Students cannot register before this date/time unless late registration is enabled.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Registration Closing Date & Time (UTC)
            </label>
            <input
              type="datetime-local"
              value={scheduleState.endDate}
              onChange={(e) => setScheduleState((p) => ({ ...p, endDate: e.target.value }))}
              className="w-full h-10 px-3 border border-slate-300 rounded-lg text-slate-900 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-dillaGreen/30 focus:border-dillaGreen"
            />
            <p className="text-xs text-slate-500 mt-1">
              Backend strictly rejects new registrations after this exact timestamp.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <label className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={scheduleState.isOpen}
              onChange={(e) => setScheduleState((p) => ({ ...p, isOpen: e.target.checked }))}
              className="mt-0.5 w-4 h-4 text-dillaGreen rounded border-slate-300 focus:ring-dillaGold"
            />
            <div>
              <p className="text-sm font-bold text-slate-900">Master Registration Switch</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Toggle to manually open or close registration immediately regardless of calendar dates.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={scheduleState.allowLate}
              onChange={(e) => setScheduleState((p) => ({ ...p, allowLate: e.target.checked }))}
              className="mt-0.5 w-4 h-4 text-dillaGreen rounded border-slate-300 focus:ring-dillaGold"
            />
            <div>
              <p className="text-sm font-bold text-slate-900">Allow Late Registration Override</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Permit students to register even after closing date/time has elapsed.
              </p>
            </div>
          </label>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSaveSchedule}
            disabled={isSaving}
            variant="primary"
            className="px-6 py-2.5 font-bold shadow-md"
          >
            {isSaving ? 'Enforcing Schedule...' : 'Save & Enforce Registration Schedule'}
          </Button>
        </div>
      </div>

      {/* CUSTOM STUDENT FIELDS MANAGEMENT */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
        <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Icon name="sliders-horizontal" className="w-5 h-5 text-dillaGreen" />
              <h2 className="text-lg font-bold text-dillaDarkGreen">
                Custom Student Fields Definition
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Create and manage centralized or campus-scoped custom fields for non-cafeteria cost-sharing registrations
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-emerald-50 text-dillaGreen rounded-lg border border-emerald-200">
            {customFields.length} Defined Fields
          </span>
        </div>

        {/* Form to define a new custom field */}
        <form onSubmit={handleCreateCustomField} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
          <h3 className="text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">
            Define New Custom Field
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Field Identifier (Key) *
              </label>
              <Input
                placeholder="e.g. hostel_block"
                value={newField.fieldKey}
                onChange={(e) => setNewField((p) => ({ ...p, fieldKey: e.target.value }))}
                required
                className="text-slate-900 text-xs font-mono h-10"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Field Label (Display Name) *
              </label>
              <Input
                placeholder="e.g. Hostel Block Number"
                value={newField.label}
                onChange={(e) => setNewField((p) => ({ ...p, label: e.target.value }))}
                required
                className="text-slate-900 text-xs h-10"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Field Type *
              </label>
              <select
                value={newField.fieldType}
                onChange={(e) => setNewField((p) => ({ ...p, fieldType: e.target.value }))}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg text-slate-900 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-dillaGreen/30 focus:border-dillaGreen"
              >
                <option value="text">Text (Single-line)</option>
                <option value="textarea">Long Text (Multi-line)</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="select">Dropdown (Select)</option>
                <option value="checkbox">Checkbox (Yes/No)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Campus Scope *
              </label>
              <select
                value={newField.campus}
                onChange={(e) => setNewField((p) => ({ ...p, campus: e.target.value }))}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg text-slate-900 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-dillaGreen/30 focus:border-dillaGreen"
              >
                <option value="all">All Campuses (Central/Global)</option>
                {campuses.map((c) => (
                  <option key={c.id || c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {newField.fieldType === 'select' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Dropdown Options (Comma-separated) *
              </label>
              <Input
                placeholder="Option 1, Option 2, Option 3"
                value={newField.optionsStr}
                onChange={(e) => setNewField((p) => ({ ...p, optionsStr: e.target.value }))}
                className="text-slate-900 text-xs h-10"
              />
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={newField.isRequired}
                  onChange={(e) => setNewField((p) => ({ ...p, isRequired: e.target.checked }))}
                  className="rounded border-slate-300 text-dillaGreen focus:ring-dillaGold"
                />
                <span>Mandatory (Required Field)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={newField.isActive}
                  onChange={(e) => setNewField((p) => ({ ...p, isActive: e.target.checked }))}
                  className="rounded border-slate-300 text-dillaGreen focus:ring-dillaGold"
                />
                <span>Active</span>
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="text-xs px-5 py-2 font-bold shadow-sm"
            >
              Add Custom Field
            </Button>
          </div>
        </form>

        {/* Existing Custom Fields Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-[#f1f5f3] text-dillaDarkGreen font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Label & Key</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Scope</th>
                <th className="py-3 px-4">Validation</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {customFields.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-6 text-center text-slate-400">
                    No custom student fields defined yet.
                  </td>
                </tr>
              ) : (
                customFields.map((field) => (
                  <tr key={field.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{field.label}</p>
                      <p className="font-mono text-[11px] text-slate-500">{field.fieldKey}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                        {field.fieldType}
                      </span>
                      {field.fieldType === 'select' && Array.isArray(field.options) && (
                        <p className="text-[10px] text-slate-500 mt-1">
                          Options: {field.options.join(', ')}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {field.campus ? (
                        <span className="font-bold text-dillaGreen">{field.campus}</span>
                      ) : (
                        <span className="text-slate-500 font-medium">Global (All Campuses)</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {field.isRequired ? (
                        <span className="text-rose-800 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[10px]">
                          Required
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[10px]">Optional</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleFieldActive(field)}
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border cursor-pointer ${
                          field.isActive
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {field.isActive ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDeleteField(field)}
                        className="text-rose-600 hover:text-rose-800 font-bold text-xs ml-3 cursor-pointer"
                        title="Delete custom field"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ACADEMIC YEARS & POLICY SETTINGS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Academic Years */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="pb-3 border-b border-slate-200">
            <h2 className="text-base font-bold text-dillaDarkGreen flex items-center gap-2">
              <Icon name="calendar" className="w-5 h-5 text-dillaGreen" />
              Academic Years Calendar
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Available years for student cost-sharing registrations
            </p>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Add Academic Year
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. 2025/2026"
                value={newAcademicYear}
                onChange={(e) => setNewAcademicYear(e.target.value)}
                className="text-slate-900 h-10"
              />
              <Button
                onClick={handleAddAcademicYear}
                disabled={isSaving}
                variant="primary"
                className="text-xs px-4 flex-shrink-0 font-bold"
              >
                Add Year
              </Button>
            </div>

            <div className="pt-2">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Enrolled Academic Calendars:
              </p>
              <div className="flex flex-wrap gap-2">
                {academicYears.map((year) => (
                  <span
                    key={year}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-300 text-slate-800 font-bold text-xs rounded-lg"
                  >
                    <Icon name="check" className="w-3.5 h-3.5 text-emerald-600" />
                    {year}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Global Cost-Sharing Policies */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="pb-3 border-b border-slate-200">
            <h2 className="text-base font-bold text-dillaDarkGreen flex items-center gap-2">
              <Icon name="settings" className="w-5 h-5 text-dillaGreen" />
              Policy & Verification Rules
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Rules governing non-cafeteria registration submissions
            </p>
          </div>

          <div className="space-y-4">
            <label className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={systemSettings.requirePdfVerification}
                onChange={() =>
                  setSystemSettings((p) => ({ ...p, requirePdfVerification: !p.requirePdfVerification }))
                }
                className="mt-0.5 w-4 h-4 text-dillaGreen rounded border-slate-300 focus:ring-dillaGold"
              />
              <div>
                <p className="text-sm font-bold text-slate-900">Mandate PDF Slip Verification</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Deans must view and verify uploaded semester PDF slips before forwarding to Super Admin.
                </p>
              </div>
            </label>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-900">Maximum PDF Slip File Size</p>
                  <p className="text-xs text-slate-500 mt-0.5">Upper limit for uploaded documents</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    value={systemSettings.maxPdfSizeMB || 5}
                    onChange={(e) =>
                      setSystemSettings((p) => ({
                        ...p,
                        maxPdfSizeMB: parseInt(e.target.value) || 5,
                      }))
                    }
                    className="w-20 text-center font-bold text-slate-900 h-9"
                  />
                  <span className="text-xs font-bold text-slate-600">MB</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Button
                onClick={handleSaveSettings}
                disabled={isSaving}
                variant="primary"
                className="w-full font-bold shadow-md py-2.5"
              >
                {isSaving ? 'Saving Policies...' : 'Save Policy Settings'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
