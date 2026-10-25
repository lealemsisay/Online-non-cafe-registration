import React, { useState, useEffect } from 'react'
import { Input, Button, Select } from '@/components/forms'
import { StatusBadge } from '@/components/status/StatusBadge'
import Icon from '@/components/icons/Icon'
import ActionMenu from '@/components/common/ActionMenu'
import ConfirmModal from '@/components/common/ConfirmModal'
import StudentDetailModal from '@/components/students/StudentDetailModal'
import StudentEditModal from '@/components/students/StudentEditModal'

const UserManagement = () => {
  const [activeTab, setActiveTab] = useState('dean') // 'dean' | 'student'
  const [deans, setDeans] = useState([])
  const [students, setStudents] = useState([])
  const [campuses, setCampuses] = useState(['Main Campus', 'Odaya Campus', 'Haru Campus'])

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

  // Student detail/edit modals
  const [detailStudentId, setDetailStudentId] = useState(null)
  const [detailInitialData, setDetailInitialData] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [editStudentTarget, setEditStudentTarget] = useState(null)
  const [showEditStudentModal, setShowEditStudentModal] = useState(false)

  // Confirm delete modal
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

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
      setError('Please provide full name and official email for the Dean.')
      return
    }
    if (!newDeanCampus) {
      setError('Please assign a campus for the new Campus Dean.')
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
          campus: newDeanCampus.trim(),
          password: newDeanPassword || 'Dean@Dilla2026!',
        }),
      })

      const data = await res.json()
      if (res.ok && data.dean) {
        setDeans((prev) => [data.dean, ...prev])
        setMessage(`Campus Dean account for '${newDeanName}' (${newDeanCampus}) created successfully!`)
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

    const currentRole = localStorage.getItem('userRole')
    const currentCampus = localStorage.getItem('userCampus') || 'Main Campus'
    const effectiveCampus = currentRole === 'dean' ? currentCampus : (newStudentCampus || 'Main Campus')

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
          campus: effectiveCampus,
          department: newStudentDept,
          email: newStudentEmail.trim(),
          password: newStudentPassword || 'Student@Dilla2026!',
        }),
      })

      const data = await res.json()
      if (res.ok && data.user) {
        setStudents((prev) => [data.user, ...prev])
        setMessage(`Student account '${newStudentId}' created successfully for campus '${effectiveCampus}'!`)
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

  const handleDeleteUser = async () => {
    if (!deleteTarget) return
    const id = deleteTarget.id || deleteTarget.studentId
    const name = deleteTarget.name || deleteTarget.fullName || deleteTarget.username

    setIsDeleting(true)
    setError(null)
    setMessage(null)
    const token = localStorage.getItem('token')

    try {
      const res = await fetch(`/api/users?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      if (res.ok) {
        setMessage(`Account '${name}' deleted successfully.`)
        setDeleteTarget(null)
        loadData()
      } else {
        const d = await res.json()
        setError(d.message || 'Failed to delete account')
        setDeleteTarget(null)
      }
    } catch (e) {
      setError('Network error deleting account.')
      setDeleteTarget(null)
    } finally {
      setIsDeleting(false)
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
    <div className="bg-white shadow-xl rounded-2xl p-6 sm:p-8 border border-slate-200 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-dillaGreen/10 text-dillaGreen flex items-center justify-center p-2 flex-shrink-0">
            <Icon name="user-check" className="w-6 h-6 text-dillaGreen" />
          </div>
          <div>
            <h2 className="font-serif text-2xl font-bold text-dillaDarkGreen">
              User & Role Accounts Management
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Provision Campus Deans and Student accounts, manage credentials, and execute authorized password resets
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

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('dean')}
          className={`pb-3 px-5 text-sm font-bold transition-all cursor-pointer border-b-2 ${
            activeTab === 'dean'
              ? 'border-dillaGreen text-dillaGreen'
              : 'border-transparent text-slate-500 hover:text-dillaDarkGreen'
          }`}
        >
          Campus Deans ({deans.length})
        </button>
        <button
          onClick={() => setActiveTab('student')}
          className={`pb-3 px-5 text-sm font-bold transition-all cursor-pointer border-b-2 ${
            activeTab === 'student'
              ? 'border-dillaGreen text-dillaGreen'
              : 'border-transparent text-slate-500 hover:text-dillaDarkGreen'
          }`}
        >
          Student Accounts ({students.length})
        </button>
      </div>

      {/* Tab 1: Campus Deans */}
      {activeTab === 'dean' && (
        <div className="space-y-6">
          <div className="bg-[#f8faf9] border border-slate-200 rounded-2xl p-5">
            <h3 className="text-xs font-bold text-dillaDarkGreen uppercase tracking-wider mb-3">
              Provision New Campus Dean Account
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3">
              <Input
                placeholder="Dean's Full Name (e.g. Dr. K. Omondi)"
                value={newDeanName}
                onChange={(e) => setNewDeanName(e.target.value)}
                className="text-slate-900 h-10"
              />
              <Input
                type="email"
                placeholder="Official Email Address"
                value={newDeanEmail}
                onChange={(e) => setNewDeanEmail(e.target.value)}
                className="text-slate-900 h-10"
              />
              <Select
                name="campus"
                options={campuses}
                value={newDeanCampus}
                onChange={(e) => setNewDeanCampus(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Initial Password (Dean@Dilla2026!)"
                value={newDeanPassword}
                onChange={(e) => setNewDeanPassword(e.target.value)}
                className="text-slate-900 h-10"
              />
            </div>
            <Button onClick={handleAddDean} variant="primary" className="font-bold">
              + Create Campus Dean Account
            </Button>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:w-80">
              <Input
                placeholder="Search deans by name, email, or username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 text-slate-900"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-600 whitespace-nowrap">Filter Campus:</span>
              <select
                value={campusFilter}
                onChange={(e) => setCampusFilter(e.target.value)}
                className="px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dillaGreen/30"
              >
                <option value="all">All Campuses</option>
                {campuses.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Deans Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-2xs">
            <table className="min-w-full bg-white divide-y divide-slate-200">
              <thead className="bg-[#f1f5f3]">
                <tr>
                  <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">Name / Username</th>
                  <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">Campus</th>
                  <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3.5 text-right text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-xs">
                {filteredDeans.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-slate-500 font-medium">
                      No deans found matching search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredDeans.map((dean) => (
                    <tr key={dean.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900 text-sm">{dean.name}</div>
                        <div className="text-[11px] font-mono text-slate-500">{dean.username}</div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-800 font-medium">{dean.email}</td>
                      <td className="px-4 py-3.5 text-dillaGreen font-bold">{dean.campus}</td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={dean.status || 'active'} />
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex justify-end">
                          <ActionMenu items={[
                            {
                              label: 'Edit Account',
                              icon: 'edit',
                              onClick: () => setEditingUser(dean),
                            },
                            {
                              label: 'Reset Password',
                              icon: 'key',
                              onClick: () => { setResetTargetUser(dean); setCustomPassword('Dean@Dilla2026!') },
                            },
                            {
                              label: dean.status === 'active' ? 'Deactivate Account' : 'Reactivate Account',
                              icon: dean.status === 'active' ? 'x-circle' : 'check-circle',
                              className: dean.status === 'active' ? 'text-amber-700' : 'text-emerald-700',
                              onClick: () => handleToggleStatus(dean),
                            },
                            {
                              label: 'Delete Dean',
                              icon: 'trash',
                              className: 'text-rose-700 font-bold',
                              separator: true,
                              onClick: () => setDeleteTarget(dean),
                            },
                          ]} />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Students Accounts */}
      {activeTab === 'student' && (
        <div className="space-y-6">
          <div className="bg-[#f8faf9] border border-slate-200 rounded-2xl p-5">
            <h3 className="text-xs font-bold text-dillaDarkGreen uppercase tracking-wider mb-3">
              Direct Student Account Provisioning
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <Input
                placeholder="Student ID (e.g. DUC2024-001)"
                value={newStudentId}
                onChange={(e) => setNewStudentId(e.target.value)}
                className="text-slate-900 h-10"
              />
              <Input
                placeholder="Full Name (e.g. Samuel Bekele)"
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                className="text-slate-900 h-10"
              />
              <Input
                type="email"
                placeholder="Email Address"
                value={newStudentEmail}
                onChange={(e) => setNewStudentEmail(e.target.value)}
                className="text-slate-900 h-10"
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
                options={['Computer Science', 'Business & Economics', 'Civil Engineering', 'Medicine & Health Sciences', 'Agriculture']}
                value={newStudentDept}
                onChange={(e) => setNewStudentDept(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Password (default: Student@Dilla2026!)"
                value={newStudentPassword}
                onChange={(e) => setNewStudentPassword(e.target.value)}
                className="text-slate-900 h-10"
              />
            </div>
            <Button onClick={handleAddStudent} variant="primary" className="font-bold">
              + Create Student Account
            </Button>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:w-80">
              <Input
                placeholder="Search students by name, ID, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 text-slate-900"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-600 whitespace-nowrap">Filter Campus:</span>
              <select
                value={campusFilter}
                onChange={(e) => setCampusFilter(e.target.value)}
                className="px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dillaGreen/30"
              >
                <option value="all">All Campuses</option>
                {campuses.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Students Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-2xs">
            <table className="min-w-full bg-white divide-y divide-slate-200">
              <thead className="bg-[#f1f5f3]">
                <tr>
                  <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">Student ID</th>
                  <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">Full Name</th>
                  <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">Campus</th>
                  <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">Department</th>
                  <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3.5 text-right text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-xs">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-slate-500 font-medium">
                      No students found matching search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((st) => (
                    <tr key={st.id || st.studentId} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3.5 font-mono font-bold text-dillaGreen text-xs">
                        {st.studentId}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          {st.photoUrl ? (
                            <img
                              src={st.photoUrl.startsWith('http') ? st.photoUrl : `/api/student/photo?file=${encodeURIComponent(st.photoUrl.replace(/^\/uploads\/photos\//, ''))}`}
                              alt={st.fullName}
                              className="w-6 h-8 object-cover rounded border border-slate-200 flex-shrink-0"
                              onError={(e) => { e.target.style.display = 'none' }}
                            />
                          ) : null}
                          {st.fullName || st.studentName}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-800 font-medium">{st.campus}</td>
                      <td className="px-4 py-3.5 text-slate-700">{st.department || '-'}</td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={st.userStatus || st.status || 'active'} />
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex justify-end">
                          <ActionMenu items={[
                            {
                              label: 'View Full Dossier',
                              icon: 'eye',
                              onClick: () => { setDetailStudentId(st.studentId || st.id); setDetailInitialData(st); setShowDetailModal(true) },
                            },
                            {
                              label: 'Edit Student',
                              icon: 'edit',
                              onClick: () => { setEditStudentTarget(st); setShowEditStudentModal(true) },
                            },
                            {
                              label: 'Reset Password',
                              icon: 'key',
                              onClick: () => { setResetTargetUser(st); setCustomPassword('Student@Dilla2026!') },
                            },
                            {
                              label: (st.userStatus || st.status) === 'active' ? 'Deactivate Account' : 'Reactivate Account',
                              icon: (st.userStatus || st.status) === 'active' ? 'x-circle' : 'check-circle',
                              className: (st.userStatus || st.status) === 'active' ? 'text-amber-700' : 'text-emerald-700',
                              onClick: () => handleToggleStatus(st),
                            },
                            {
                              label: 'Delete Student',
                              icon: 'trash',
                              className: 'text-rose-700 font-bold',
                              separator: true,
                              onClick: () => setDeleteTarget(st),
                            },
                          ]} />
                        </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-dillaDarkGreen mb-1">
              Authorized Password Reset
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Reset login password for <strong>{resetTargetUser.name || resetTargetUser.fullName}</strong> ({resetTargetUser.username || resetTargetUser.studentId})
            </p>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                New Password
              </label>
              <Input
                value={customPassword}
                onChange={(e) => setCustomPassword(e.target.value)}
                placeholder="Enter new password"
                className="text-slate-900"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Default: <code>{resetTargetUser.role === 'dean' ? 'Dean@Dilla2026!' : 'Student@Dilla2026!'}</code>
              </p>
            </div>

            <div className="flex items-center gap-2 mt-5 pt-3 border-t border-slate-200">
              <Button variant="outline" onClick={() => setResetTargetUser(null)} className="flex-1">Cancel</Button>
              <Button variant="gold" onClick={handleExecutePasswordReset} className="flex-1 font-bold">Confirm Reset</Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Dean Modal (basic fields) */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-dillaDarkGreen mb-4">Edit Account Information</h3>
            <div className="space-y-4 mb-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Full Name</label>
                <Input value={editingUser.name || editingUser.fullName || ''} onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value, fullName: e.target.value })} className="text-slate-900" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Email</label>
                <Input value={editingUser.email || ''} onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })} className="text-slate-900" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Campus</label>
                <Select name="campus" options={campuses} value={editingUser.campus || 'Main Campus'} onChange={(e) => setEditingUser({ ...editingUser, campus: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-3 border-t border-slate-200">
              <Button variant="outline" onClick={() => setEditingUser(null)} className="flex-1">Cancel</Button>
              <Button variant="primary" onClick={handleSaveEdit} className="flex-1 font-bold">Save Changes</Button>
            </div>
          </div>
        </div>
      )}

      {/* Student Detail Dossier Modal */}
      <StudentDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        studentId={detailStudentId}
        initialData={detailInitialData}
      />

      {/* Student Edit Modal */}
      <StudentEditModal
        isOpen={showEditStudentModal}
        onClose={() => { setShowEditStudentModal(false); setEditStudentTarget(null) }}
        student={editStudentTarget}
        onStudentUpdated={() => { setShowEditStudentModal(false); setEditStudentTarget(null); loadData() }}
        userRole="admin"
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteUser}
        isLoading={isDeleting}
        title={`Delete ${deleteTarget?.role === 'dean' ? 'Campus Dean' : 'Student'} Account`}
        description={deleteTarget ? `You are about to permanently delete the account for ${deleteTarget.name || deleteTarget.fullName} (${deleteTarget.username || deleteTarget.studentId}). This action cannot be undone.` : ''}
        confirmLabel="Delete Account"
        danger
      />
    </div>
  )
}

export default UserManagement
