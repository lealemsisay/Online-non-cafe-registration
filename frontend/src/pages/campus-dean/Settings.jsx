import React, { useState, useEffect } from 'react'
import { Button, Input } from '@/components/forms'
import Icon from '@/components/icons/Icon'
import ChangePasswordModal from '@/components/auth/ChangePasswordModal'

const DeanSettings = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  // Registration Window State (Read-only for Campus Dean)
  const [scheduleInfo, setScheduleInfo] = useState({
    isOpen: true,
    reason: '',
    startDate: null,
    endDate: null,
    allowLate: false,
  })

  // Campus Custom Fields State
  const [campusFields, setCampusFields] = useState([])
  const [newField, setNewField] = useState({
    fieldKey: '',
    label: '',
    fieldType: 'text',
    optionsStr: '',
    isRequired: false,
    isActive: true,
  })

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const userCampus = localStorage.getItem('userCampus') || 'Main Campus'

  const loadData = async () => {
    setLoading(true)
    setError(null)
    const token = localStorage.getItem('token')
    const headers = token ? { Authorization: `Bearer ${token}` } : {}

    try {
      // 1. Fetch registration schedule settings
      const settingsRes = await fetch('/api/settings', { headers })
      if (settingsRes.ok) {
        const sData = await settingsRes.json()
        if (sData.registrationWindow) {
          setScheduleInfo({
            isOpen: sData.registrationWindow.isOpen,
            reason: sData.registrationWindow.reason || '',
            startDate: sData.registrationWindow.schedule?.startDate,
            endDate: sData.registrationWindow.schedule?.endDate,
            allowLate: sData.registrationWindow.schedule?.allowLate,
          })
        }
      }

      // 2. Fetch custom fields for this campus
      const fieldsRes = await fetch('/api/custom-fields?all=true', { headers })
      if (fieldsRes.ok) {
        const fData = await fieldsRes.json()
        setCampusFields(fData.customFields || [])
      }
    } catch (e) {
      console.error('Failed to load settings:', e)
      setError('Network error loading settings data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreateCampusField = async (e) => {
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
          campus: userCampus,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setMessage(
          `Campus custom field '${newField.label}' defined for ${userCampus}. Super Admin has been notified.`
        )
        setNewField({
          fieldKey: '',
          label: '',
          fieldType: 'text',
          optionsStr: '',
          isRequired: false,
          isActive: true,
        })
        loadData()
      } else {
        setError(data.message || 'Failed to create campus custom field')
      }
    } catch (e) {
      setError('Network error creating campus custom field.')
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
        setCampusFields((prev) =>
          prev.map((f) => (f.id === field.id ? { ...f, isActive: !f.isActive } : f))
        )
      }
    } catch (e) {
      console.error('Error toggling field active state:', e)
    }
  }

  const handleDeleteField = async (field) => {
    if (!window.confirm(`Delete field '${field.label}'? All student values stored for this field will be removed.`)) {
      return
    }
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`/api/custom-fields?id=${field.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.ok) {
        setMessage(`Custom field '${field.label}' safely removed.`)
        setCampusFields((prev) => prev.filter((f) => f.id !== field.id))
      } else {
        const d = await res.json()
        setError(d.message || 'Failed to delete field')
      }
    } catch (e) {
      setError('Network error deleting field.')
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-dillaDarkGreen via-[#12442c] to-dillaGreen p-6 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                    Campus Dean Portal
                  </span>
                  <span className="text-white/40">•</span>
                  <span className="text-xs text-emerald-200 font-medium">
                    {userCampus} Administration
                  </span>
                </div>
                <h1 className="font-serif text-2xl font-bold tracking-tight text-white mt-0.5">
                  Campus Policy & Registration Settings
                </h1>
                <p className="text-xs text-white/80 mt-0.5">
                  Institutional registration window status, campus custom student fields, and dean credentials
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <Button
                onClick={() => setIsPasswordModalOpen(true)}
                variant="gold"
                className="text-xs font-bold shadow-md flex items-center gap-1.5"
              >
                <Icon name="key" className="w-4 h-4 text-dillaDarkGreen" />
                <span>Change Password</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Alerts */}
      {message && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <Icon name="check-circle" className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <Icon name="alert-circle" className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Card 1: Registration Window Status (Institutional Schedule) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div>
            <h3 className="font-serif text-base font-bold text-dillaDarkGreen flex items-center gap-2">
              <Icon name="clock" className="w-4 h-4 text-dillaGreen" />
              University Cost-Sharing Registration Schedule
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Centrally governed by the Office of the Registrar. Campus Deans have institutional read-only access.
            </p>
          </div>
          <div>
            {scheduleInfo.isOpen ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-xs border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                Registration Window Open
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-100 text-rose-800 rounded-full font-bold text-xs border border-rose-200">
                <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                Registration Window Closed
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <div className="p-3.5 bg-[#f8faf9] rounded-xl border border-slate-200 text-xs">
            <span className="text-slate-500 font-semibold block mb-1">Scheduled Start Time:</span>
            <span className="font-mono font-bold text-slate-800 text-sm">
              {scheduleInfo.startDate ? new Date(scheduleInfo.startDate).toLocaleString() : 'Not Set (Open by default)'}
            </span>
          </div>
          <div className="p-3.5 bg-[#f8faf9] rounded-xl border border-slate-200 text-xs">
            <span className="text-slate-500 font-semibold block mb-1">Scheduled Closing Deadline:</span>
            <span className="font-mono font-bold text-slate-800 text-sm">
              {scheduleInfo.endDate ? new Date(scheduleInfo.endDate).toLocaleString() : 'Not Set (Open indefinitely)'}
            </span>
          </div>
          <div className="p-3.5 bg-[#f8faf9] rounded-xl border border-slate-200 text-xs">
            <span className="text-slate-500 font-semibold block mb-1">Late Registration Grace:</span>
            <span className="font-bold text-slate-800 text-sm">
              {scheduleInfo.allowLate ? (
                <span className="text-emerald-700">Active (Submissions Allowed)</span>
              ) : (
                <span className="text-slate-600">Standard Window Strictly Enforced</span>
              )}
            </span>
          </div>
        </div>

        {scheduleInfo.reason && !scheduleInfo.isOpen && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-medium">
            <strong>Notice:</strong> {scheduleInfo.reason}
          </div>
        )}
      </div>

      {/* Card 2: Campus Custom Student Fields */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-5">
        <div>
          <h3 className="font-serif text-base font-bold text-dillaDarkGreen flex items-center gap-2">
            <Icon name="sliders-horizontal" className="w-4 h-4 text-dillaGreen" />
            Campus-Specific Custom Student Fields ({userCampus})
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Define additional information fields required from students enrolling at {userCampus}. The Super Admin is notified immediately upon field definition.
          </p>
        </div>

        {/* Builder Form */}
        <form onSubmit={handleCreateCampusField} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Field Identifier (key) *
              </label>
              <Input
                placeholder="e.g. dorm_block"
                value={newField.fieldKey}
                onChange={(e) => setNewField({ ...newField, fieldKey: e.target.value })}
                className="h-9 text-slate-900 font-mono text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Display Label *
              </label>
              <Input
                placeholder="e.g. Dorm Block Number"
                value={newField.label}
                onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                className="h-9 text-slate-900 text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Field Type *
              </label>
              <select
                value={newField.fieldType}
                onChange={(e) => setNewField({ ...newField, fieldType: e.target.value })}
                className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-dillaGreen/30"
              >
                <option value="text">Short Text</option>
                <option value="textarea">Long Text (Textarea)</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="select">Dropdown (Select)</option>
                <option value="checkbox">Checkbox (Yes/No)</option>
              </select>
            </div>
          </div>

          {newField.fieldType === 'select' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Dropdown Options (comma-separated) *
              </label>
              <Input
                placeholder="e.g. Block A, Block B, Block C, Off-Campus"
                value={newField.optionsStr}
                onChange={(e) => setNewField({ ...newField, optionsStr: e.target.value })}
                className="h-9 text-slate-900 text-xs"
                required
              />
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-4 text-xs font-semibold text-slate-700">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newField.isRequired}
                  onChange={(e) => setNewField({ ...newField, isRequired: e.target.checked })}
                  className="rounded text-dillaGreen focus:ring-dillaGold w-4 h-4"
                />
                <span>Mandatory (Required)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newField.isActive}
                  onChange={(e) => setNewField({ ...newField, isActive: e.target.checked })}
                  className="rounded text-dillaGreen focus:ring-dillaGold w-4 h-4"
                />
                <span>Active</span>
              </label>
            </div>

            <Button type="submit" variant="primary" className="text-xs font-bold">
              + Define Campus Field
            </Button>
          </div>
        </form>

        {/* Existing Custom Fields Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-[#f1f5f3]">
              <tr>
                <th className="px-4 py-3 text-left font-bold text-dillaDarkGreen uppercase tracking-wider">Field Label</th>
                <th className="px-4 py-3 text-left font-bold text-dillaDarkGreen uppercase tracking-wider">Key</th>
                <th className="px-4 py-3 text-left font-bold text-dillaDarkGreen uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left font-bold text-dillaDarkGreen uppercase tracking-wider">Scope</th>
                <th className="px-4 py-3 text-left font-bold text-dillaDarkGreen uppercase tracking-wider">Required</th>
                <th className="px-4 py-3 text-left font-bold text-dillaDarkGreen uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right font-bold text-dillaDarkGreen uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {campusFields.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-6 text-center text-slate-400 font-medium">
                    No custom fields defined for {userCampus} yet.
                  </td>
                </tr>
              ) : (
                campusFields.map((f) => {
                  const isMine = f.campus && f.campus.toLowerCase() === userCampus.toLowerCase()
                  return (
                    <tr key={f.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold text-slate-900">{f.label}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">{f.fieldKey}</td>
                      <td className="px-4 py-3 uppercase font-semibold text-[10px] text-slate-500">{f.fieldType}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          f.campus ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {f.campus || 'Central (All Campuses)'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {f.isRequired ? (
                          <span className="text-rose-600 font-bold">Yes</span>
                        ) : (
                          <span className="text-slate-400">Optional</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          f.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {f.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {isMine ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleToggleFieldActive(f)}
                              className="px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 rounded border border-slate-200 cursor-pointer"
                            >
                              {f.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => handleDeleteField(f)}
                              className="px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 rounded border border-rose-200 cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Central (Locked)</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Change Password Modal */}
      {isPasswordModalOpen && (
        <ChangePasswordModal
          isOpen={isPasswordModalOpen}
          onClose={() => setIsPasswordModalOpen(false)}
        />
      )}
    </div>
  )
}

export default DeanSettings
