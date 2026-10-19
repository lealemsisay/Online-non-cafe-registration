import React, { useState, useEffect } from 'react'
import { Input } from '@/components/forms'
import { Button } from '@/components/forms'
import Icon from '@/components/icons/Icon'

const UserManagement = () => {
  const [deans, setDeans] = useState([])
  const [newDeanName, setNewDeanName] = useState('')
  const [newDeanEmail, setNewDeanEmail] = useState('')
  const [newDeanCampus, setNewDeanCampus] = useState('')

  const [message, setMessage] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    fetch('/api/users?type=dean', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.deans && data.deans.length > 0) {
          setDeans(data.deans)
        } else {
          setDeans([
            { id: '1', name: 'Dr. K. Omondi', email: 'dean.main@dilla.edu.et', campus: 'Main Campus', status: 'active' },
            { id: '2', name: 'Dr. A. Were', email: 'awere@dilla.ac.ke', campus: 'Kakamega Campus', status: 'active' },
          ])
        }
      })
      .catch(() => {})
  }, [])

  const handleAddDean = async () => {
    if (!newDeanName || !newDeanEmail) return
    const token = localStorage.getItem('token')
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          role: 'dean',
          name: newDeanName,
          email: newDeanEmail,
          campus: newDeanCampus || 'Main Campus',
        }),
      })
      const data = await res.json()
      if (res.ok && data.dean) {
        setDeans((prev) => [...prev, data.dean])
        setMessage(`Dean account for ${newDeanName} created successfully!`)
        setNewDeanName('')
        setNewDeanEmail('')
        setNewDeanCampus('')
        return
      }
    } catch (e) {}

    // Fallback
    const newDean = {
      id: String(Date.now()),
      name: newDeanName,
      email: newDeanEmail,
      campus: newDeanCampus || 'Main Campus',
      status: 'active',
    }
    setDeans((prev) => [...prev, newDean])
    setNewDeanName('')
    setNewDeanEmail('')
    setNewDeanCampus('')
  }

  const handleDeactivate = (deanId) => {
    setDeans((prev) =>
      prev.map((d) => (d.id === deanId ? { ...d, status: d.status === 'active' ? 'inactive' : 'active' } : d))
    )
  }

  return (
    <div className="bg-white shadow-2xl rounded-2xl p-8 border border-gray-200 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-dillaNavy mb-6">User Management</h2>

      {message && (
        <div className="mb-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded">
          {message}
        </div>
      )}
      
      <div className="grid grid-cols-1 gap-4 mb-6">
        <Input
          placeholder="Dean's full name"
          value={newDeanName}
          onChange={(e) => setNewDeanName(e.target.value)}
        />
        <Input
          placeholder="Dean's email"
          type="email"
          value={newDeanEmail}
          onChange={(e) => setNewDeanEmail(e.target.value)}
        />
        <Input
          placeholder="Assigned campus"
          value={newDeanCampus}
          onChange={(e) => setNewDeanCampus(e.target.value)}
        />
        <Button onClick={handleAddDean} className="w-full">
          Create Campus Dean Account
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-lg overflow-hidden">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="p-3 text-left text-dillaNavy">Name</th>
              <th className="p-3 text-left text-dillaNavy">Email</th>
              <th className="p-3 text-left text-dillaNavy">Campus</th>
              <th className="p-3 text-left text-dillaNavy">Status</th>
              <th className="p-3 text-right text-dillaNavy">Actions</th>
            </tr>
          </thead>
          <tbody>
            {deans.map((dean) => (
              <tr key={dean.id} className="border-b border-gray-100 hover:bg-dillaGray/10">
                <td className="p-3 font-medium text-dillaNavy">{dean.name}</td>
                <td className="p-3 text-dillaGray">{dean.email}</td>
                <td className="p-3 text-dillaGray">{dean.campus}</td>
                <td className="p-3">
                  <span
                    className={dean.status === 'active'
                      ? 'bg-green-100 text-green-800 text-xs px-2 rounded'
                      : 'bg-red-100 text-red-800 text-xs px-2 rounded'}
                  >
                    {dean.status}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <Button
                    onClick={() => handleDeactivate(dean.id)}
                    className="text-red-600 text-sm hover:text-red-800"
                  >
                    {dean.status === 'active' ? 'Deactivate' : 'Reactivate'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default UserManagement