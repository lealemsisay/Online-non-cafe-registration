import React, { useState, useEffect } from 'react'
import { Input, Button, Select } from '@/components/forms'
import { StatusBadge } from '@/components/status/StatusBadge'
import Icon from '@/components/icons/Icon'

const UserManagement = () => {
  const [activeTab, setActiveTab] = useState('dean') // 'dean' | 'student'
  const [deans, setDeans] = useState([])
  const [students, setStudents] = useState([])
  const [campuses, setCampuses] = useState(['Main Campus', 'Kakamega Campus', 'Eldoret Campus'])

  // Create form state
  const [newDeanName, setNewDeanName] = useState('')
  const [newDeanEmail, setNewDeanEmail] = useState('')
  const [newDeanCampus, setNewDeanCampus] = useState('Main Campus')
  const [newDeanPassword, setNewDeanPassword] = useState('Dean@Dilla2026!')

  // Student create form state
  const [newStudentId, setNewStudentId] = useState('')
  const [newStudentName, setNewStudentName] = useState('')
  const [newStudentCampus, setNewStudentCampus] = useState('Main Campus')
  const [newStudentDept, setNewStudentDept] = useState('Computer Science')
  const [newStudentEmail, setNewStudentEmail] = useState('')
  const [newStudentPassword, setNewStudentPassword] = useState('Student@Dilla2026!')

  // Search and filter
  const [searchTerm, setSearchTerm] = useState('')
  const [campusFilter, setCampusFilter] = useState('all')

  // Password reset modal state
  const [resetTargetUser, setResetTargetUser] = useState(null)
  const [customPassword, setCustomPassword] = useState('')

  // Edit user modal state
  const [editingUser, setEditingUser] = useState(null)

  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  const loadData = () => {
    const token = localStorage.getItem('token')
    const headers = token ? { Authorization: `Bearer ${token}` } : {}

    // Load Deans
    fetch('/api/users?type=dean', { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.deans) setDeans(data.deans)
      })
      .catch(() => {})

    // Load Students
    fetch('/api/users?type=student', { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.users) setStudents(data.users)
      })
      .catch(() => {})

    // Load Campuses
    fetch('/api/campuses', { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.campuses && data.campuses.length > 0) {
          setCampuses(data.campuses.map((c) => c.name))
        }
      })
      .catch(() => {})
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleAddDean = async () => {
    setError(null)
    setMessage(null)
    if (!newDeanName || !newDeanEmail) {
      setError('Please provide full name and email for the Dean.')
      return
    }

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
          name: newDeanName.trim(),
          email: newDeanEmail.trim(),
          campus: newDeanCampus,
          password: newDeanPassword || 'Dean@Dilla2026!',
        }),
      })

      const data = await res.json()
      if (res.ok && data.dean) {
        setDeans((prev) => [data.dean, ...prev])
        setMessage(`Campus Dean account for '${newDeanName}' created successfully!`)
        setNewDeanName('')
        setNewDeanEmail('')
      } else {
        setError(data.message || 'Failed to create Dean account')
      }
    } catch (e) {
      setError('Network error creating Dean account.')
    }
  }

  const handleAddStudent = async () => {
    setError(null)
    setMessage(null)
    if (!newStudentId || !newStudentName) {
      setError('Please provide Student ID and Full Name.')
      return
    }

    const token = localStorage.getItem('token')
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          role: 'student',
          studentId: newStudentId.trim(),
          fullName: newStudentName.trim(),
          campus: newStudentCampus,
          department: newStudentDept,
          email: newStudentEmail.trim(),
          password: newStudentPassword || 'Student@Dilla2026!',
        }),
      })

      const data = await res.json()
      if (res.ok && data.user) {
        setStudents((prev) => [data.user, ...prev])
        setMessage(`Student account '${newStudentId}' created successfully!`)
        setNewStudentId('')
        setNewStudentName('')
        setNewStudentEmail('')
      } else {
        setError(data.message || 'Failed to create student account')
      }
    } catch (e) {
      setError('Network error creating student account.')
    }
  }

  const handleToggleStatus = async (user) => {
    setError(null)
    setMessage(null)
    const newStatus = (user.status || user.userStatus) === 'active' ? 'inactive' : 'active'
    const token = localStorage.getItem('token')

    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          id: user.id || user.studentId,
          status: newStatus,
        }),
      })

      if (res.ok) {
        setMessage(`Account '${user.name || user.fullName}' status changed to '${newStatus}'.`)
        loadData()
      } else {
        const d = await res.json()
        setError(d.message || 'Failed to update status')
      }
    } catch (e) {
      setError('Network error updating status.')
    }
  }

  const handleDeleteUser = async (user) => {
    const id = user.id || user.studentId
    const name = user.name || user.fullName || user.username
    if (!window.confirm(`Are you sure you want to delete user account '${name}'? This action cannot be undone.`)) return

    setError(null)
    setMessage(null)
    const token = localStorage.getItem('token')

    try {
      const res = await fetch(`/api/users?id=${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      if (res.ok) {
        setMessage(`Account '${name}' deleted successfully.`)
        loadData()
      } else {
        const d = await res.json()
        setError(d.message || 'Failed to delete account')
      }
    } catch (e) {
      setError('Network error deleting account.')
    }
  }

  const handleExecutePasswordReset = async () => {
    if (!resetTargetUser) return
    setError(null)
    setMessage(null)
    const token = localStorage.getItem('token')

    try {
      const res = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          userId: resetTargetUser.id || resetTargetUser.studentId,
          targetUsername: resetTargetUser.username || resetTargetUser.studentId,
          newPassword: customPassword.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setMessage(
          `Password for '${resetTargetUser.name || resetTargetUser.fullName}' reset successfully! New Password: ${data.resetPassword}`
        )
        setResetTargetUser(null)
        setCustomPassword('')
      } else {
        setError(data.message || 'Failed to reset password')
      }
    } catch (e) {
      setError('Network error during password reset.')
    }
  }

  const handleSaveEdit = async () => {
    if (!editingUser) return
    setError(null)
    setMessage(null)
    const token = localStorage.getItem('token')

    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          id: editingUser.id || editingUser.studentId,
          name: editingUser.name || editingUser.fullName,
          email: editingUser.email,
          campus: editingUser.campus,
        }),
      })

      if (res.ok) {
        setMessage('User updated successfully!')
        setEditingUser(null)
        loadData()
      } else {
        const d = await res.json()
        setError(d.message || 'Failed to update user')
      }
    } catch (e) {
      setError('Network error updating user.')
    }
  }

  // Filtered lists
  const filteredDeans = deans.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.username && d.username.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCampus = campusFilter === 'all' || d.campus === campusFilter
    return matchesSearch && matchesCampus
  })

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      (s.fullName && s.fullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.studentId && s.studentId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCampus = campusFilter === 'all' || s.campus === campusFilter
    return matchesSearch && matchesCampus
  })

  return (
    <div className="bg-white shadow-2xl rounded-2xl p-6 sm:p-8 border border-gray-200 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-dillaNavy">User & Role Management</h2>
          <p className="text-xs text-gray-500 mt-1">
            Manage Campus Dean and Student accounts, provision logins, and perform authorized password resets
          </p>
        </div>
        <div className="p-2.5 bg-dillaNavy/10 rounded-xl text-dillaNavy">
          <Icon name="user-check" className="w-6 h-6 text-dillaNavy" />
        </div>
      </div>

      {message && (
        <div className="mb-5 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 text-sm p-3.5 rounded-lg flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="text-xs font-bold text-emerald-600 ml-4">✕</button>
        </div>
      )}

      {error && (
        <div className="mb-5 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-sm p-3.5 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-xs font-bold text-rose-600 ml-4">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('dean')}
          className={`pb-3 px-4 text-sm font-bold transition-colors cursor-pointer border-b-2 ${
            activeTab === 'dean'
              ? 'border-dillaNavy text-dillaNavy'
              : 'border-transparent text-gray-500 hover:text-dillaNavy'
          }`}
        >
          Campus Deans ({deans.length})
        </button>
        <button
          onClick={() => setActiveTab('student')}
          className={`pb-3 px-4 text-sm font-bold transition-colors cursor-pointer border-b-2 ${
            activeTab === 'student'
              ? 'border-dillaNavy text-dillaNavy'
              : 'border-transparent text-gray-500 hover:text-dillaNavy'
          }`}
        >
          Student Accounts ({students.length})
        </button>
      </div>

      {/* Tab 1: Campus Deans Management */}
      {activeTab === 'dean' && (
        <div>
          {/* Create Dean Form */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 mb-6">
            <h3 className="text-sm font-bold text-dillaNavy uppercase tracking-wider mb-3">
              Provision New Campus Dean Account
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3">
              <Input
                placeholder="Dean's Full Name (e.g. Dr. K. Omondi)"
                value={newDeanName}
                onChange={(e) => setNewDeanName(e.target.value)}
              />
              <Input
                type="email"
                placeholder="Official Email Address"
                value={newDeanEmail}
                onChange={(e) => setNewDeanEmail(e.target.value)}
              />
              <Select
                name="campus"
                options={campuses}
                value={newDeanCampus}
                onChange={(e) => setNewDeanCampus(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Initial Password (default: Dean@Dilla2026!)"
                value={newDeanPassword}
                onChange={(e) => setNewDeanPassword(e.target.value)}
              />
            </div>
            <Button onClick={handleAddDean} className="w-full sm:w-auto">
              + Create Campus Dean Account
            </Button>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
            <div className="w-full sm:w-72">
              <Input
                placeholder="Search deans by name, email, or username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">Filter Campus:</span>
              <select
                value={campusFilter}
                onChange={(e) => setCampusFilter(e.target.value)}
                className="px-3 py-2 text-sm text-gray-800 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dillaGold"
              >
                <option value="all">All Campuses</option>
                {campuses.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Deans Table */}
          <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-xs">
            <table className="min-w-full bg-white divide-y divide-gray-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dillaNavy uppercase tracking-wider">Name / Username</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dillaNavy uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dillaNavy uppercase tracking-wider">Campus</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dillaNavy uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-dillaNavy uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredDeans.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-sm text-gray-500">
                      No deans found matching search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredDeans.map((dean) => (
                    <tr key={dean.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-dillaNavy text-sm">{dean.name}</div>
                        <div className="text-xs font-mono text-gray-500">{dean.username}</div>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-700 font-medium">{dean.email}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-800 font-medium">{dean.campus}</td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={dean.status || 'active'} />
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap space-x-1.5">
                        <button
                          onClick={() => {
                            setResetTargetUser(dean)
                            setCustomPassword('Dean@Dilla2026!')
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
                          title="Reset this dean's login password"
                        >
                          Reset PW
                        </button>
                        <button
                          onClick={() => setEditingUser(dean)}
                          className="px-2.5 py-1 text-xs font-semibold text-dillaNavy bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleStatus(dean)}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                            dean.status === 'active'
                              ? 'text-rose-700 bg-rose-50 hover:bg-rose-100'
                              : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                          }`}
                        >
                          {dean.status === 'active' ? 'Deactivate' : 'Reactivate'}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(dean)}
                          className="px-2.5 py-1 text-xs font-semibold text-gray-600 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
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
      )}

      {/* Tab 2: Students Accounts Management */}
      {activeTab === 'student' && (
        <div>
          {/* Create Student Form */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 mb-6">
            <h3 className="text-sm font-bold text-dillaNavy uppercase tracking-wider mb-3">
              Direct Student Account Provisioning
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <Input
                placeholder="Student ID (e.g. DUC2024-001)"
                value={newStudentId}
                onChange={(e) => setNewStudentId(e.target.value)}
              />
              <Input
                placeholder="Full Name (e.g. Samuel Bekele)"
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
              />
              <Input
                type="email"
                placeholder="Email Address"
                value={newStudentEmail}
                onChange={(e) => setNewStudentEmail(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <Select
                name="campus"
                options={campuses}
                value={newStudentCampus}
                onChange={(e) => setNewStudentCampus(e.target.value)}
              />
              <Select
                name="dept"
                options={['Computer Science', 'Business', 'Engineering', 'Health Sciences', 'Agriculture']}
                value={newStudentDept}
                onChange={(e) => setNewStudentDept(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Password (default: Student@Dilla2026!)"
                value={newStudentPassword}
                onChange={(e) => setNewStudentPassword(e.target.value)}
              />
            </div>
            <Button onClick={handleAddStudent} className="w-full sm:w-auto">
              + Create Student Account
            </Button>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
            <div className="w-full sm:w-72">
              <Input
                placeholder="Search students by name, ID, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">Filter Campus:</span>
              <select
                value={campusFilter}
                onChange={(e) => setCampusFilter(e.target.value)}
                className="px-3 py-2 text-sm text-gray-800 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dillaGold"
              >
                <option value="all">All Campuses</option>
                {campuses.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Students Table */}
          <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-xs">
            <table className="min-w-full bg-white divide-y divide-gray-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dillaNavy uppercase tracking-wider">Student ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dillaNavy uppercase tracking-wider">Full Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dillaNavy uppercase tracking-wider">Campus</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dillaNavy uppercase tracking-wider">Department</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dillaNavy uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-dillaNavy uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-sm text-gray-500">
                      No students found matching search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((st) => (
                    <tr key={st.id || st.studentId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3.5 font-mono font-bold text-xs text-dillaNavy">
                        {st.studentId}
                      </td>
                      <td className="px-4 py-3.5 text-sm font-semibold text-gray-900">
                        {st.fullName || st.studentName}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-700">{st.campus}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-700">{st.department || '-'}</td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={st.userStatus || st.status || 'active'} />
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap space-x-1.5">
                        <button
                          onClick={() => {
                            setResetTargetUser(st)
                            setCustomPassword('Student@Dilla2026!')
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
                          title="Authorized reset of this student's login password"
                        >
                          Reset PW
                        </button>
                        <button
                          onClick={() => setEditingUser(st)}
                          className="px-2.5 py-1 text-xs font-semibold text-dillaNavy bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleStatus(st)}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                            (st.userStatus || st.status) === 'active'
                              ? 'text-rose-700 bg-rose-50 hover:bg-rose-100'
                              : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                          }`}
                        >
                          {(st.userStatus || st.status) === 'active' ? 'Deactivate' : 'Reactivate'}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(st)}
                          className="px-2.5 py-1 text-xs font-semibold text-gray-600 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
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
      )}

      {/* Authorized Password Reset Modal */}
      {resetTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-dillaNavy mb-1">
              Authorized Password Reset
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Reset login password for <strong>{resetTargetUser.name || resetTargetUser.fullName}</strong> ({resetTargetUser.username || resetTargetUser.studentId})
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                New Password
              </label>
              <Input
                value={customPassword}
                onChange={(e) => setCustomPassword(e.target.value)}
                placeholder="Enter new password"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Suggested dev password: <code>{resetTargetUser.role === 'dean' ? 'Dean@Dilla2026!' : 'Student@Dilla2026!'}</code>
              </p>
            </div>

            <div className="flex items-center gap-2 mt-5">
              <Button
                type="button"
                onClick={() => setResetTargetUser(null)}
                className="flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleExecutePasswordReset}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
              >
                Confirm Reset
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-dillaNavy mb-4">
              Edit Account Details
            </h3>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name</label>
                <Input
                  value={editingUser.name || editingUser.fullName || ''}
                  onChange={(e) =>
                    setEditingUser({
                      ...editingUser,
                      name: e.target.value,
                      fullName: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                <Input
                  value={editingUser.email || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Campus</label>
                <Select
                  name="campus"
                  options={campuses}
                  value={editingUser.campus || 'Main Campus'}
                  onChange={(e) => setEditingUser({ ...editingUser, campus: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={() => setEditingUser(null)}
                className="flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveEdit}
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

export default UserManagement