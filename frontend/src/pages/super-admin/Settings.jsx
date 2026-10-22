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
  })
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  const loadSettings = () => {
    setLoading(true)
    const token = localStorage.getItem('token')

    fetch('/api/settings', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          if (data.academicYears) setAcademicYears(data.academicYears)
          if (data.systemSettings) setSystemSettings(data.systemSettings)
        }
      })
      .catch((err) => {
        console.error('Error loading settings:', err)
        setError('Failed to fetch settings from server.')
      })
      .finally(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const handleAddAcademicYear = async () => {
    const year = newAcademicYear.trim()
    if (!year) {
      setError('Please provide a valid academic year (e.g., 2024/2025).')
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
        body: JSON.stringify({
          newAcademicYear: year,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setMessage(`Academic Year '${year}' added successfully!`)
        setNewAcademicYear('')
        if (data.academicYears) setAcademicYears(data.academicYears)
        else loadSettings()
      } else {
        setError(data.message || 'Failed to add academic year')
      }
    } catch (e) {
      setError('Network error adding academic year.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleSetting = (key) => {
    setSystemSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
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
        body: JSON.stringify({
          systemSettings,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setMessage('System settings updated and persisted successfully.')
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
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-dillaGold"></span>
          <span className="text-xs uppercase tracking-wider font-bold text-dillaNavy">
            System Administration
          </span>
        </div>
        <h1 className="text-2xl font-bold text-dillaNavy mt-1">
          University System Settings
        </h1>
        <p className="text-sm text-slate-600 mt-0.5">
          Configure academic calendar years, registration policies, and PDF slip criteria
        </p>
      </div>

      {message && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 p-4 rounded-md flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <Icon name="check-circle" className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="text-sm font-medium">{message}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-emerald-700 font-bold ml-4">
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-4 rounded-md flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <Icon name="alert" className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-700 font-bold ml-4">
            ×
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Academic Years Configuration */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="pb-3 border-b border-slate-200">
            <h2 className="text-base font-bold text-dillaNavy flex items-center gap-2">
              <Icon name="calendar" className="w-5 h-5 text-dillaNavy" />
              Academic Years
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Available years for student cost-sharing registrations
            </p>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Add New Academic Year
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. 2024/2025"
                value={newAcademicYear}
                onChange={(e) => setNewAcademicYear(e.target.value)}
                className="w-full text-slate-800"
              />
              <Button
                onClick={handleAddAcademicYear}
                disabled={isSaving}
                className="bg-dillaNavy hover:bg-slate-800 text-white text-xs px-4 flex-shrink-0"
              >
                Add Year
              </Button>
            </div>

            <div className="pt-2">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                Configured Years:
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
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="pb-3 border-b border-slate-200">
            <h2 className="text-base font-bold text-dillaNavy flex items-center gap-2">
              <Icon name="settings" className="w-5 h-5 text-dillaNavy" />
              Policy & Validation Rules
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Rules governing non-cafeteria registration submissions
            </p>
          </div>

          <div className="space-y-4">
            <label className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={systemSettings.allowLateRegistration}
                onChange={() => handleToggleSetting('allowLateRegistration')}
                className="mt-0.5 w-4 h-4 text-dillaNavy rounded border-slate-300 focus:ring-dillaNavy"
              />
              <div>
                <p className="text-sm font-bold text-slate-800">Allow Late Registration</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Permit students to submit applications past official semester deadlines.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={systemSettings.requirePdfVerification}
                onChange={() => handleToggleSetting('requirePdfVerification')}
                className="mt-0.5 w-4 h-4 text-dillaNavy rounded border-slate-300 focus:ring-dillaNavy"
              />
              <div>
                <p className="text-sm font-bold text-slate-800">Mandate PDF Slip Verification</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Deans cannot forward applications without viewing and verifying PDF slips.
                </p>
              </div>
            </label>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-800">Maximum PDF Slip File Size</p>
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
                    className="w-20 text-center font-bold text-slate-800 h-9"
                  />
                  <span className="text-xs font-bold text-slate-600">MB</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="w-full bg-dillaNavy hover:bg-slate-800 text-white font-medium shadow-sm py-2"
              >
                {isSaving ? 'Saving Policies...' : 'Save System Settings'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings