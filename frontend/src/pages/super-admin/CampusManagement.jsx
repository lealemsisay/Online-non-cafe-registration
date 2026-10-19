import React, { useState, useEffect } from 'react'
import { Input } from '@/components/forms'
import { Button } from '@/components/forms'
import Icon from '@/components/icons/Icon'

const CampusManagement = () => {
  const [campuses, setCampuses] = useState([])
  const [editingCampus, setEditingCampus] = useState(null)
  const [newCampusName, setNewCampusName] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    fetch('/api/campuses', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.campuses && data.campuses.length > 0) {
          setCampuses(data.campuses)
        } else {
          setCampuses([
            { id: '1', name: 'Main Campus', dean: 'Dr. K. Omondi', status: 'active' },
            { id: '2', name: 'Kakamega Campus', dean: 'Dr. A. Were', status: 'active' },
            { id: '3', name: 'Eldoret Campus', dean: 'Dr. M. Salim', status: 'inactive' },
          ])
        }
      })
      .catch(() => {})
  }, [])

  const handleAddCampus = async () => {
    if (!newCampusName.trim()) return
    const token = localStorage.getItem('token')
    try {
      const res = await fetch('/api/campuses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: newCampusName.trim() }),
      })
      const data = await res.json()
      if (res.ok && data.campus) {
        setCampuses((prev) => [...prev, data.campus])
        setNewCampusName('')
        return
      }
    } catch (e) {}

    // Fallback in-memory
    const newCampus = {
      id: String(Date.now()),
      name: newCampusName,
      dean: 'Pending Assignment',
      status: 'active',
    }
    setCampuses((prev) => [...prev, newCampus])
    setNewCampusName('')
  }

  const handleEdit = (campus) => {
    setEditingCampus(campus)
    setNewCampusName(campus.name)
  }

  const handleSave = async () => {
    if (!editingCampus || !newCampusName) return
    const token = localStorage.getItem('token')
    try {
      await fetch('/api/campuses', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ id: editingCampus.id, name: newCampusName }),
      })
    } catch (e) {}

    setCampuses((prev) =>
      prev.map((c) => (c.id === editingCampus.id ? { ...c, name: newCampusName } : c))
    )
    setEditingCampus(null)
    setNewCampusName('')
  }

  const handleDeactivate = async (campusId) => {
    const campus = campuses.find((c) => c.id === campusId)
    const newStatus = campus?.status === 'active' ? 'inactive' : 'active'
    const token = localStorage.getItem('token')
    try {
      await fetch('/api/campuses', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ id: campusId, status: newStatus }),
      })
    } catch (e) {}

    setCampuses((prev) =>
      prev.map((c) => (c.id === campusId ? { ...c, status: newStatus } : c))
    )
  }

  return (
    <div className="bg-white shadow-2xl rounded-2xl p-8 border border-gray-200 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold text-dillaNavy mb-6">Campus Management</h2>
      
      <div className="grid grid-cols-1 gap-4 mb-6">
        <Input
          placeholder="Add new campus name"
          value={newCampusName}
          onChange={(e) => setNewCampusName(e.target.value)}
        />
        <Button onClick={handleAddCampus} className="w-full">
          Add Campus
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-lg overflow-hidden">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="p-3 text-left text-dillaNavy">Campus Name</th>
              <th className="p-3 text-left text-dillaNavy">Campus Dean</th>
              <th className="p-3 text-left text-dillaNavy">Status</th>
              <th className="p-3 text-right text-dillaNavy">Actions</th>
            </tr>
          </thead>
          <tbody>
            {campuses.map((campus) => (
              <tr key={campus.id} className="border-b border-gray-100 hover:bg-dillaGray/10">
                <td className="p-3 font-medium text-dillaNavy">{campus.name}</td>
                <td className="p-3 text-dillaGray">{campus.dean || 'Not assigned'}</td>
                <td className="p-3">
                  <span
                    className={campus.status === 'active' 
                      ? 'bg-green-100 text-green-800 text-xs px-2 rounded'
                      : 'bg-red-100 text-red-800 text-xs px-2 rounded'}
                  >
                    {campus.status}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <Button
                    onClick={() => handleEdit(campus)}
                    className="text-dillaNavy text-sm hover:text-dillaGold mr-2"
                  >
                    Edit
                  </Button>
                  <Button
                    onClick={() => handleDeactivate(campus.id)}
                    className="text-red-600 text-sm hover:text-red-800"
                  >
                    {campus.status === 'active' ? 'Deactivate' : 'Reactivate'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingCampus && (
        <div className="mt-6 p-6 bg-dillaGray rounded-lg">
          <h3 className="text-lg font-medium text-dillaNavy mb-4">Edit Campus</h3>
          <Input
            placeholder="Campus name"
            value={editingCampus.name}
            onChange={(e) => setNewCampusName(e.target.value)}
          />
          <Button onClick={handleSave} className="w-full mt-4">
            Save Changes
          </Button>
          <button
            onClick={() => setEditingCampus(null)}
            className="mt-2 w-full text-sm text-dillaNavy border border-dillaNavy rounded"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

export default CampusManagement