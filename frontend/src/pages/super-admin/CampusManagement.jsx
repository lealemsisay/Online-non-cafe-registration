import React, { useState, useEffect } from 'react'
import { Input, Button, Select } from '@/components/forms'
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

  const handleAddCampus = async () => {
    setError(null)
    setMessage(null)
    if (!newCampusName.trim()) {
      setError('Please provide a campus name.')
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
    <div className="bg-white shadow-2xl rounded-2xl p-6 sm:p-8 border border-gray-200 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-dillaNavy">Campus Management</h2>
          <p className="text-xs text-gray-500 mt-1">
            Configure university campuses, assign deans, and manage active status
          </p>
        </div>
        <div className="p-2.5 bg-dillaNavy/10 rounded-xl text-dillaNavy">
          <Icon name="building" className="w-6 h-6 text-dillaNavy" />
        </div>
      </div>

      {message && (
        <div className="mb-5 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 text-sm p-3.5 rounded-lg">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-5 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-sm p-3.5 rounded-lg">
          {error}
        </div>
      )}

      {/* Add New Campus Form */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 mb-6">
        <h3 className="text-sm font-bold text-dillaNavy uppercase tracking-wider mb-3">
          Add New Campus
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            placeholder="Campus Name (e.g. Main Campus)"
            value={newCampusName}
            onChange={(e) => setNewCampusName(e.target.value)}
          />
          <Input
            placeholder="Campus Code (e.g. MC, KC)"
            value={newCampusCode}
            onChange={(e) => setNewCampusCode(e.target.value)}
          />
          <Button onClick={handleAddCampus} className="w-full">
            + Add Campus
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search campuses by name, code, or dean..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm text-gray-800 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dillaGold"
          >
            <option value="all">All Statuses ({campuses.length})</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Campus List Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-xs">
        <table className="min-w-full bg-white divide-y divide-gray-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-dillaNavy uppercase tracking-wider">
                Campus Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-dillaNavy uppercase tracking-wider">
                Code
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-dillaNavy uppercase tracking-wider">
                Assigned Dean
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-dillaNavy uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-dillaNavy uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {filteredCampuses.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-4 py-8 text-center text-sm text-gray-500">
                  No campuses match the specified search or filter.
                </td>
              </tr>
            ) : (
              filteredCampuses.map((campus) => (
                <tr key={campus.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3.5 font-semibold text-dillaNavy text-sm">
                    {campus.name}
                  </td>
                  <td className="px-4 py-3.5 text-xs font-mono font-medium text-gray-600">
                    {campus.code || '-'}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-gray-700 font-medium">
                    {campus.dean || 'Pending Assignment'}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={campus.status} />
                  </td>
                  <td className="px-4 py-3.5 text-right whitespace-nowrap space-x-1.5">
                    <button
                      onClick={() => handleEdit(campus)}
                      className="px-2.5 py-1 text-xs font-semibold text-dillaNavy bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleStatus(campus.id)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                        campus.status === 'active'
                          ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                          : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-dillaNavy mb-4">Edit Campus</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Campus Name</label>
                <Input
                  value={editingCampus.name}
                  onChange={(e) => setEditingCampus({ ...editingCampus, name: e.target.value })}
                  placeholder="Campus Name"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                <select
                  value={editingCampus.status}
                  onChange={(e) => setEditingCampus({ ...editingCampus, status: e.target.value })}
                  className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dillaGold"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-6">
              <Button
                type="button"
                onClick={() => setEditingCampus(null)}
                className="flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                className="flex-1 bg-dillaNavy text-white"
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