import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Input, Button } from '@/components/forms'
import Icon from '@/components/icons/Icon'
import ConfirmModal from '@/components/common/ConfirmModal'

const getAuthHeaders = () => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const normalizeCampusOptions = (campuses = []) =>
  campuses
    .map((c) => (typeof c === 'string' ? c : c?.name))
    .filter(Boolean)

const formatDate = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString()
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

export const DepartmentManagement = ({ campuses = [], onChanged }) => {
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [campus, setCampus] = useState('all')

  const [deleteTarget, setDeleteTarget] = useState(null)

  const campusOptions = useMemo(() => normalizeCampusOptions(campuses), [campuses])

  const loadDepartments = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/departments?includeInactive=true', {
        headers: getAuthHeaders(),
      })
      const data = await res.json()
      if (res.ok) {
        setDepartments(data.departments || [])
      } else {
        setError(data.message || 'Failed to load departments.')
      }
    } catch (e) {
      console.error(e)
      setError('Network error loading departments.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDepartments()
  }, [loadDepartments])

  const notifyChanged = () => {
    if (typeof onChanged === 'function') onChanged()
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const trimmed = name.trim()
    if (!trimmed) {
      setError('Department name is required.')
      return
    }

    const scope = campus === 'all' ? null : campus
    const duplicate = departments.some(
      (d) =>
        d.name?.toLowerCase() === trimmed.toLowerCase() &&
        (d.campus || null) === (scope || null)
    )
    if (duplicate) {
      setError(`Department "${trimmed}" already exists for this campus scope.`)
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          name: trimmed,
          code: code.trim() || null,
          campus: scope,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess(`Department "${trimmed}" added successfully.`)
        setName('')
        setCode('')
        setCampus('all')
        await loadDepartments()
        notifyChanged()
      } else {
        setError(data.message || 'Failed to add department.')
      }
    } catch (e) {
      setError('Network error adding department.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleActive = async (dept) => {
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch('/api/departments', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ id: dept.id, isActive: !dept.isActive }),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess(
          `Department "${dept.name}" ${dept.isActive ? 'deactivated' : 'reactivated'}.`
        )
        await loadDepartments()
        notifyChanged()
      } else {
        setError(data.message || 'Failed to update department.')
      }
    } catch (e) {
      setError('Network error updating department.')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(`/api/departments?id=${encodeURIComponent(deleteTarget.id)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess(`Department "${deleteTarget.name}" removed.`)
        setDeleteTarget(null)
        await loadDepartments()
        notifyChanged()
      } else {
        setError(data.message || 'Failed to remove department.')
        setDeleteTarget(null)
      }
    } catch (e) {
      setError('Network error removing department.')
      setDeleteTarget(null)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
      <div className="pb-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Icon name="book-open" className="w-5 h-5 text-dillaGreen" />
            <h2 className="text-lg font-bold text-dillaDarkGreen">
              Academic Disciplines & Department Management
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Departments selectable on student registration forms. Changes persist in PostgreSQL.
          </p>
        </div>
        <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full">
          {departments.filter((d) => d.isActive !== false).length} active
        </span>
      </div>

      <Alert type="error" message={error} onClose={() => setError(null)} />
      <Alert type="success" message={success} onClose={() => setSuccess(null)} />

      <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
        <div className="md:col-span-5">
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
            Department Name
          </label>
          <Input
            placeholder="e.g. Software Engineering"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-slate-900 text-xs h-9"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
            Code
          </label>
          <Input
            placeholder="e.g. SE"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="text-slate-900 text-xs h-9"
          />
        </div>
        <div className="md:col-span-3">
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
            Campus Scope
          </label>
          <select
            value={campus}
            onChange={(e) => setCampus(e.target.value)}
            className="w-full h-9 px-3 border border-slate-300 rounded-lg text-slate-900 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-dillaGreen/30 focus:border-dillaGreen"
          >
            <option value="all">Global (All Campuses)</option>
            {campusOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <Button
            type="submit"
            disabled={isSaving}
            variant="primary"
            className="w-full text-xs px-3 h-9 font-bold"
          >
            {isSaving ? 'Saving...' : 'Add Dept'}
          </Button>
        </div>
      </form>

      {loading ? (
        <div className="py-8 text-center text-slate-400 text-xs">
          <Icon name="refresh" className="w-5 h-5 animate-spin mx-auto mb-1 text-dillaGreen" />
          Loading departments...
        </div>
      ) : departments.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-xs">
          No departments configured yet. Add the first department above.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-[#f1f5f3] text-dillaDarkGreen font-bold uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Department</th>
                <th className="py-2.5 px-3">Code</th>
                <th className="py-2.5 px-3">Campus Scope</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {departments.map((dept) => (
                <tr key={dept.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-slate-900">{dept.name}</td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                    {dept.code || '—'}
                  </td>
                  <td className="py-2.5 px-3">
                    {dept.campus ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold text-[10px]">
                        {dept.campus}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-bold text-[10px]">
                        Global (All)
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${
                        dept.isActive !== false
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                          : 'bg-slate-100 text-slate-600 border-slate-300'
                      }`}
                    >
                      {dept.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleToggleActive(dept)}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        {dept.isActive !== false ? 'Deactivate' : 'Reactivate'}
                      </button>
                      <button
                        onClick={() => setDeleteTarget(dept)}
                        className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title={`Remove ${dept.name}`}
                      >
                        <Icon name="trash" className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Remove Department"
        description="This department will no longer appear on registration forms. Existing student records are not modified."
        itemName={deleteTarget?.name}
        itemDetails={deleteTarget?.campus || 'Global (All Campuses)'}
        confirmLabel="Remove Department"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
        isLoading={isSaving}
        danger
      />
    </div>
  )
}

export const AcademicYearManagement = ({ onChanged }) => {
  const [years, setYears] = useState([])
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const [year, setYear] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

  const loadYears = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/academic-years', { headers: getAuthHeaders() })
      const data = await res.json()
      if (res.ok) {
        const rows = Array.isArray(data.details)
          ? data.details
          : (data.academicYears || []).map((y) =>
              typeof y === 'string' ? { id: y, year: y, isActive: false } : y
            )
        setYears(rows)
      } else {
        setError(data.message || 'Failed to load academic years.')
      }
    } catch (e) {
      console.error(e)
      setError('Network error loading academic years.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadYears()
  }, [loadYears])

  const notifyChanged = () => {
    if (typeof onChanged === 'function') onChanged()
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const trimmed = year.trim()
    if (!trimmed) {
      setError('Please provide a valid academic year (e.g., 2025/2026).')
      return
    }
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      setError('Academic year end date cannot be earlier than the start date.')
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch('/api/academic-years', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          year: trimmed,
          startDate: startDate || null,
          endDate: endDate || null,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess(`Academic year '${trimmed}' saved successfully.`)
        setYear('')
        setStartDate('')
        setEndDate('')
        await loadYears()
        notifyChanged()
      } else {
        setError(data.message || 'Failed to add academic year.')
      }
    } catch (e) {
      setError('Network error adding academic year.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleActivate = async (item) => {
    setError(null)
    setSuccess(null)
    setIsSaving(true)
    try {
      const res = await fetch('/api/academic-years', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ id: item.id, isActive: true }),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess(`Academic year '${item.year}' is now the active registration year.`)
        await loadYears()
        notifyChanged()
      } else {
        setError(data.message || 'Failed to activate academic year.')
      }
    } catch (e) {
      setError('Network error activating academic year.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(
        `/api/academic-years?id=${encodeURIComponent(deleteTarget.id)}`,
        { method: 'DELETE', headers: getAuthHeaders() }
      )
      const data = await res.json()
      if (res.ok) {
        setSuccess(`Academic year '${deleteTarget.year}' removed.`)
        setDeleteTarget(null)
        await loadYears()
        notifyChanged()
      } else {
        setError(data.message || 'Failed to remove academic year.')
        setDeleteTarget(null)
      }
    } catch (e) {
      setError('Network error removing academic year.')
      setDeleteTarget(null)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
      <div className="pb-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Icon name="clock" className="w-5 h-5 text-dillaGreen" />
            <h2 className="text-lg font-bold text-dillaDarkGreen">
              Academic Calendar Years
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage calendar years and select the single active registration year stored in PostgreSQL.
          </p>
        </div>
        <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full">
          {years.find((y) => y.isActive)?.year || 'No active year'}
        </span>
      </div>

      <Alert type="error" message={error} onClose={() => setError(null)} />
      <Alert type="success" message={success} onClose={() => setSuccess(null)} />

      <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
        <div className="md:col-span-4">
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
            Academic Year
          </label>
          <Input
            placeholder="e.g. 2025/2026"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="text-slate-900 text-xs h-9"
          />
        </div>
        <div className="md:col-span-3">
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full h-9 px-3 border border-slate-300 rounded-lg text-slate-900 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-dillaGreen/30 focus:border-dillaGreen"
          />
        </div>
        <div className="md:col-span-3">
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full h-9 px-3 border border-slate-300 rounded-lg text-slate-900 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-dillaGreen/30 focus:border-dillaGreen"
          />
        </div>
        <div className="md:col-span-2">
          <Button
            type="submit"
            disabled={isSaving}
            variant="primary"
            className="w-full text-xs px-3 h-9 font-bold"
          >
            {isSaving ? 'Saving...' : 'Add Year'}
          </Button>
        </div>
      </form>

      {loading ? (
        <div className="py-8 text-center text-slate-400 text-xs">
          <Icon name="refresh" className="w-5 h-5 animate-spin mx-auto mb-1 text-dillaGreen" />
          Loading academic years...
        </div>
      ) : years.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-xs">
          No academic years configured yet. Add the first calendar year above.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-[#f1f5f3] text-dillaDarkGreen font-bold uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Academic Year</th>
                <th className="py-2.5 px-3">Start</th>
                <th className="py-2.5 px-3">End</th>
                <th className="py-2.5 px-3">Registration Year</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {years.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-slate-900">{item.year}</td>
                  <td className="py-2.5 px-3 text-slate-600">{formatDate(item.startDate)}</td>
                  <td className="py-2.5 px-3 text-slate-600">{formatDate(item.endDate)}</td>
                  <td className="py-2.5 px-3">
                    {item.isActive ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold text-[10px]">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-300 font-bold text-[10px]">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {!item.isActive && (
                        <button
                          onClick={() => handleActivate(item)}
                          disabled={isSaving}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold border border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Set Active
                        </button>
                      )}
                      <button
                        onClick={() => setDeleteTarget(item)}
                        className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title={`Remove ${item.year}`}
                      >
                        <Icon name="trash" className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Remove Academic Year"
        description="This calendar year will be removed from the registration configuration. Student records already saved with this year are not modified."
        itemName={deleteTarget?.year}
        itemDetails={deleteTarget?.isActive ? 'Currently active registration year' : 'Inactive'}
        confirmLabel="Remove Year"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
        isLoading={isSaving}
        danger
      />
    </div>
  )
}
