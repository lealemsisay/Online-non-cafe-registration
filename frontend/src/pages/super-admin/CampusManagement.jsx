import React, { useState, useEffect } from 'react'
import { Input, Button } from '@/components/forms'
import { StatusBadge } from '@/components/status/StatusBadge'
import Icon from '@/components/icons/Icon'

const CampusManagement = () => {
  const [campuses, setCampuses] = useState([])
  const [editingCampus, setEditingCampus] = useState(null)
  const [newCampusName, setNewCampusName] = useState('')
  const [newCampusCode, setNewCampusCode] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const [formVisible, setFormVisible] = useState(false)

  const loadCampuses = () => {
    const token = localStorage.getItem('token')
    fetch('/api/campuses', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.campuses) {
          setCampuses(data.campuses)
        }
      })
      .catch(() => {})
  }

  useEffect(() => {
    loadCampuses()
  }, [])

  const handleShowForm = () => setFormVisible(true)
  const handleHideForm = () => setFormVisible(false)

  const handleAddCampus = async () => {
    setError(null)
    setMessage(null)
    if (!newCampusName.trim()) {
      setError('Please provide a valid campus name.')
      return
    }
    if (campuses.some((c) => c.name.toLowerCase() === newCampusName.toLowerCase())) {
      setError('A campus with this name already exists.')
      return
    }

    const token = localStorage.getItem('token')
    try {
      const res = await fetch('/api/campuses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: newCampusName.trim(),
          code: newCampusCode.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (res.ok && data.campus) {
        setCampuses((prev) => [...prev, data.campus])
        setNewCampusName('')
        setNewCampusCode('')
        setMessage(`Campus '${data.campus.name}' created successfully!`)
        setFormVisible(false)
      } else {
        setError(data.message || 'Failed to add campus')
      }
    } catch (e) {
      setError('Network error while adding campus.')
    }
  }

  const handleEdit = (campus) => {
    setEditingCampus({
      id: campus.id,
      name: campus.name,
      code: campus.code || '',
      status: campus.status,
    })
  }

  const handleSave = async () => {
    if (!editingCampus || !editingCampus.name.trim()) return
    setError(null)
    setMessage(null)
    const token = localStorage.getItem('token')

    try {
      const res = await fetch('/api/campuses', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          id: editingCampus.id,
          name: editingCampus.name.trim(),
          status: editingCampus.status,
        }),
      })

      const data = await res.json()
      if (res.ok && data.campus) {
        setCampuses((prev) =>
          prev.map((c) => (c.id === editingCampus.id ? { ...c, ...data.campus } : c))
        )
        setMessage(`Campus '${data.campus.name}' updated successfully!`)
        setEditingCampus(null)
      } else {
        setError(data.message || 'Failed to update campus')
      }
    } catch (e) {
      setError('Network error while updating campus.')
    }
  }

  const handleToggleStatus = async (campusId) => {
    const campus = campuses.find((c) => c.id === campusId)
    if (!campus) return
    const newStatus = campus.status === 'active' ? 'inactive' : 'active'
    const token = localStorage.getItem('token')

    try {
      const res = await fetch('/api/campuses', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ id: campusId, status: newStatus }),
      })

      if (res.ok) {
        setCampuses((prev) =>
          prev.map((c) => (c.id === campusId ? { ...c, status: newStatus } : c))
        )
        setMessage(`Campus '${campus.name}' status set to '${newStatus}'.`)
      }
    } catch (e) {
      setError('Failed to update campus status.')
    }
  }

  const handleDelete = async (campusId, campusName) => {
    if (!window.confirm(`Are you sure you want to delete campus '${campusName}'?`)) return
    setError(null)
    setMessage(null)
    const token = localStorage.getItem('token')

    try {
      const res = await fetch(`/api/campuses?id=${campusId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      if (res.ok) {
        setCampuses((prev) => prev.filter((c) => c.id !== campusId))
        setMessage(`Campus '${campusName}' deleted successfully.`)
      } else {
        const data = await res.json()
        setError(data.message || 'Failed to delete campus')
      }
    } catch (e) {
      setError('Network error while deleting campus.')
    }
  }

  const filteredCampuses = campuses.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.code && c.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.dean && c.dean.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="bg-white shadow-xl rounded-2xl p-6 sm:p-8 border border-slate-200 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-dillaGreen/10 text-dillaGreen flex items-center justify-center p-2 flex-shrink-0">
            <Icon name="building" className="w-6 h-6 text-dillaGreen" />
          </div>
          <div>
            <h2 className="font-serif text-2xl font-bold text-dillaDarkGreen">
              Campus Management
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure official Dilla University campuses, assign deans, and manage active status
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div className="bg-emerald-50 border-l-4 border-emerald-600 text-emerald-900 text-xs sm:text-sm p-4 rounded-xl flex items-center justify-between shadow-2xs">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="text-emerald-700 hover:text-emerald-950 font-bold ml-4">✕</button>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-900 text-xs sm:text-sm p-4 rounded-xl flex items-center justify-between shadow-2xs">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-700 hover:text-rose-950 font-bold ml-4">✕</button>
        </div>
      )}

      {/* Campus Creation Button + Form */}
      {formVisible ? (
        <div className="bg-[#f8faf9] border border-slate-200 rounded-2xl p-5 mb-6">
          <h3 className="text-xs font-bold text-dillaDarkGreen uppercase tracking-wider mb-3">
            Provision New Campus
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              placeholder="Campus Name (e.g. Main Campus, Haru Campus)"
              value={newCampusName}
              onChange={(e) => setNewCampusName(e.target.value)}
              className="text-slate-900 h-10"
            />
            <Input
              placeholder="Campus Code (e.g. MC, OC, HC)"
              value={newCampusCode}
              onChange={(e) => setNewCampusCode(e.target.value)}
              className="text-slate-900 h-10 font-mono"
            />
            <Button onClick={handleAddCampus} variant="primary" className="w-full font-bold">
              Create Campus
            </Button>
            <Button
              variant="outline"
              onClick={handleHideForm}
              className="w-full mt-2 font-bold"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button onClick={handleShowForm} variant="primary" className="w-full mb-4">
          + Add University Campus
        </Button>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search campuses by name, code, or dean..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 text-slate-900"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-600 whitespace-nowrap">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dillaGreen/30"
          >
            <option value="all">All Statuses ({campuses.length})</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Campus List Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-2xs">
        <table className="min-w-full bg-white divide-y divide-slate-200">
          <thead className="bg-[#f1f5f3]">
            <tr>
              <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">
                Campus Name
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">
                Code
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">
                Assigned Dean
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3.5 text-right text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white text-xs">
            {filteredCampuses.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-4 py-8 text-center text-slate-500 font-medium">
                  No campuses match the specified search or filter.
                </td>
              </tr>
            ) : (
              filteredCampuses.map((campus) => (
                <tr key={campus.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-dillaGreen text-sm">
                    {campus.name}
                  </td>
                  <td className="px-4 py-3.5 font-mono font-bold text-slate-600">
                    {campus.code || '-'}
                  </td>
                  <td className="px-4 py-3.5 text-slate-800 font-medium">
                    {campus.dean || 'Pending Assignment'}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={campus.status} />
                  </td>
                  <td className="px-4 py-3.5 text-right whitespace-nowrap space-x-1.5">
                    <button
                      onClick={() => handleEdit(campus)}
                      className="px-2.5 py-1 text-xs font-semibold text-dillaDarkGreen bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleStatus(campus.id)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                        campus.status === 'active'
                          ? 'text-amber-800 bg-amber-50 hover:bg-amber-100'
                          : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
                        }`}
                    >
                      {campus.status === 'active' ? 'Deactivate' : 'Reactivate'}
                    </button>
                    <button
                      onClick={() => handleDelete(campus.id, campus.name)}
                      className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
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

      {/* Edit Campus Modal */}
      {editingCampus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-dillaDarkGreen mb-4">Edit Campus Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Campus Name
                </label>
                <Input
                  value={editingCampus.name}
                  onChange={(e) => setEditingCampus({ ...editingCampus, name: e.target.value })}
                  placeholder="Campus Name"
                  className="text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Status
                </label>
                <select
                  value={editingCampus.status}
                  onChange={(e) => setEditingCampus({ ...editingCampus, status: e.target.value })}
                  className="w-full h-10 px-3 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dillaGreen/30 focus:border-dillaGreen"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-6 pt-3 border-t border-slate-200">
              <Button
                variant="outline"
                onClick={() => setEditingCampus(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                className="flex-1 font-bold"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CampusManagement