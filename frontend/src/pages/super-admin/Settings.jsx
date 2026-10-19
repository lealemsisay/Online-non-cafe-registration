import React, { useState, useEffect } from 'react'
import { Input } from '@/components/forms'
import { Button } from '@/components/forms'
import Icon from '@/components/icons/Icon'

const Settings = () => {
  const [academicYears, setAcademicYears] = useState([])
  const [newAcademicYear, setNewAcademicYear] = useState('')
  const [registrationPeriods, setRegistrationPeriods] = useState([])
  const [systemSettings, setSystemSettings] = useState({
    allowLateRegistration: false,
    requirePdfVerification: true,
    maxPdfSizeMB: 5,
  })

  useEffect(() => {
    const placeholderYears = ['2022/2023', '2023/2024', '2024/2025']
    setAcademicYears(placeholderYears)
    const placeholderPeriods = [
      { id: '1', name: '2023/2024 Period', start: '2023-09-01', end: '2024-06-30' },
    ]
    setRegistrationPeriods(placeholderPeriods)
  }, [])

  const handleAddAcademicYear = () => {
    if (!newAcademicYear) return
    setAcademicYears(prev => [...prev, newAcademicYear])
    setNewAcademicYear('')
  }

  const handleToggleSetting = (setting) => {
    setSystemSettings(prev => ({
      ...prev,
      [setting]: !prev[setting],
    }))
  }

  const [saved, setSaved] = useState(false)

  const handleSaveSettings = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="bg-white shadow-2xl rounded-2xl p-8 border border-gray-200 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-dillaNavy mb-6">System Settings</h2>

      {saved && (
        <div className="mb-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded">
          System settings updated successfully.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 mb-8">
        <div>
          <h3 className="text-lg font-medium text-dillaNavy mb-3">Academic Years</h3>
          <Input
            placeholder="Add academic year (e.g., 2024/2025)"
            value={newAcademicYear}
            onChange={(e) => setNewAcademicYear(e.target.value)}
          />
          <Button onClick={handleAddAcademicYear} className="w-full mt-2">
            Add Academic Year
          </Button>
          <div className="mt-4 text-sm text-dillaGray">
            {academicYears.map((year) => (
              <span key={year} className="mr-2 bg-dillaNavy text-white text-xs px-2 rounded">
                {year}
              </span>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-dillaNavy mb-3">Registration Periods</h3>
          <Input
            placeholder="Period name"
            className="mb-2"
          />
          <Input
            placeholder="Start date (YYYY-MM-DD)"
            type="date"
            className="mb-4"
          />
          <Button className="w-full mb-2">Add Period</Button>
          <div className="text-sm text-dillaGray">
            {registrationPeriods.map((period) => (
              <div key={period.id} className="mt-1 text-xs">
                {period.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-dillaNavy mb-4">System-Wide Settings</h3>
        <div className="space-y-4">
          <label className="flex items-center gap-4 cursor-pointer">
            <input
              type="checkbox"
              checked={systemSettings.allowLateRegistration}
              onChange={(e) => handleToggleSetting('allowLateRegistration')}
              className="rounded border-gray-300 focus:ring-dillaGold"
            />
            <span>Allow late registration</span>
          </label>
          <label className="flex items-center gap-4 cursor-pointer">
            <input
              type="checkbox"
              checked={systemSettings.requirePdfVerification}
              onChange={(e) => handleToggleSetting('requirePdfVerification')}
              className="rounded border-gray-300 focus:ring-dillaGold"
            />
            <span>Require PDF verification</span>
          </label>
          <label className="flex items-center gap-4 cursor-pointer">
            <Input
              type="number"
              placeholder="Max PDF size (MB)"
              value={systemSettings.maxPdfSizeMB}
              onChange={(e) => {
                // handle change
              }}
              className="w-24"
            /> MB
          </label>
        </div>
      </div>

      <div className="mt-8 pt-8 border-t border-gray-200">
        <Button onClick={handleSaveSettings} className="w-full">Save Settings</Button>
      </div>
    </div>
  )
}

export default Settings