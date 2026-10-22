import React, { useState, useEffect } from 'react'
import { Input, Button, Select } from '@/components/forms'
import { StatusBadge } from '@/components/status/StatusBadge'
import Icon from '@/components/icons/Icon'

const CampusDeanDashboard = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    newApplications: 0,
    pendingReview: 0,
    reviewed: 0,
    returnedForCorrection: 0,
    approved: 0,
    rejected: 0,
  })
  const [applications, setApplications] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [userCampus, setUserCampus] = useState('')
  const [userName, setUserName] = useState('')
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  // Password reset modal state
  const [resetTargetStudent, setResetTargetStudent] = useState(null)
  const [customPassword, setCustomPassword] = useState('')
  const [resettingPassword, setResettingPassword] = useState(false)

  const loadData = () => {
    setLoading(true)
    const token = localStorage.getItem('token')
    const campus = localStorage.getItem('userCampus') || 'Main Campus'
    const name = localStorage.getItem('userName') || 'Campus Dean'
    setUserCampus(campus)
    setUserName(name)

    fetch('/api/users', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        // Filter users/applications belonging to this dean's campus
        const rawApps = (data?.users || data?.applications || []).filter(
          (u) => !u.role || u.role === 'student'
        )

        const apps = rawApps.map((u) => ({
          id: u.studentId || u.id,
          studentId: u.studentId || u.username || u.id,
          studentName: u.fullName || u.name || 'Student',
          department: u.department || 'General',
          campus: u.campus || campus,
          status: u.applicationStatus || u.status || 'dean-review',
          academicYear: u.academicYear || '2023/2024',
          submittedAt: u.createdAt || u.submittedAt || new Date().toISOString(),
          phone: u.phone || '',
          email: u.email || '',
        }))

        setApplications(apps)
        const pending = apps.filter((a) => a.status === 'dean-review' || a.status === 'submitted').length
        const approved = apps.filter((a) => a.status === 'approved').length
        const returned = apps.filter(
          (a) => a.status === 'return-for-correction' || a.status === 'returned-for-correction'
        ).length

        setStats({
          totalStudents: apps.length,
          newApplications: apps.filter((a) => a.status === 'submitted').length,
          pendingReview: pending,
          reviewed: apps.filter((a) => a.status !== 'submitted' && a.status !== 'dean-review').length,
          returnedForCorrection: returned,
          approved,
          rejected: apps.filter((a) => a.status === 'rejected').length,
        })
      })
      .catch((err) => {
        console.error('Failed to load applications:', err)
        setError('Failed to load applications. Please verify your connection.')
      })
      .finally(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleReview = (applicationId) => {
    window.location.href = `/dean/review/${applicationId}`
  }

  const handleReturnForCorrection = (applicationId) => {
    window.location.href = `/dean/return/${applicationId}`
  }

  const handleExecutePasswordReset = async () => {
    if (!resetTargetStudent) return
    setError(null)
    setMessage(null)
    setResettingPassword(true)
    const token = localStorage.getItem('token')

    try {
      const res = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          userId: resetTargetStudent.id || resetTargetStudent.studentId,
          targetUsername: resetTargetStudent.studentId || resetTargetStudent.id,
          newPassword: customPassword.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setMessage(
          `Password for student '${resetTargetStudent.studentName}' (${resetTargetStudent.studentId}) successfully reset to: ${data.resetPassword}`
        )
        setResetTargetStudent(null)
        setCustomPassword('')
      } else {
        setError(data.message || 'Failed to reset student password')
      }
    } catch (e) {
      setError('Network error while resetting password.')
    } finally {
      setResettingPassword(false)
    }
  }

  // Filter applications by search term and selected status
  const filteredApplications = applications.filter((app) => {
    const term = searchTerm.toLowerCase().trim()
    const matchesSearch =
      !term ||
      (app.studentName && app.studentName.toLowerCase().includes(term)) ||
      (app.studentId && app.studentId.toLowerCase().includes(term)) ||
      (app.department && app.department.toLowerCase().includes(term))

    const matchesStatus = !selectedStatus || app.status === selectedStatus

    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-dillaGold"></span>
              <span className="text-xs uppercase tracking-wider font-bold text-dillaNavy">
                Campus Dean Portal
              </span>
            </div>
            <h1 className="text-2xl font-bold text-dillaNavy mt-1">
              {userCampus} Administration
            </h1>
            <p className="text-sm text-slate-600 mt-0.5">
              Cost-sharing verification and application processing for non-cafeteria students in {userCampus}.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={loadData}
              variant="outline"
              className="border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
            >
              <Icon name="refresh" className="w-4 h-4 text-dillaNavy" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {message && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 p-4 rounded-md flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <Icon name="check-circle" className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="text-sm font-medium">{message}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-emerald-700 hover:text-emerald-900 font-bold ml-4">
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
          <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900 font-bold ml-4">
            ×
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Registered</p>
            <div className="p-2 bg-blue-50 text-dillaNavy rounded-lg">
              <Icon name="users" className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-dillaNavy mt-3">{stats.totalStudents}</p>
          <p className="text-xs text-slate-500 mt-1">Students enrolled in {userCampus}</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Awaiting Dean Review</p>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Icon name="clock" className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-amber-600 mt-3">{stats.pendingReview}</p>
          <p className="text-xs text-slate-500 mt-1">Requires your inspection</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Returned for Correction</p>
            <div className="p-2 bg-red-50 text-red-600 rounded-lg">
              <Icon name="alert-circle" className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-red-600 mt-3">{stats.returnedForCorrection}</p>
          <p className="text-xs text-slate-500 mt-1">Awaiting student fixes</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Approved by Admin</p>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Icon name="check" className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-emerald-600 mt-3">{stats.approved}</p>
          <p className="text-xs text-slate-500 mt-1">Granted non-cafe subsidy</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Search Applications
            </label>
            <Input
              placeholder="Search by Student ID, student name, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-slate-800"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Filter by Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full h-10 px-3 border border-slate-300 rounded-lg text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-dillaNavy text-sm"
            >
              <option value="">All Application Statuses</option>
              <option value="submitted">Submitted (New)</option>
              <option value="dean-review">Awaiting Dean Review</option>
              <option value="super-admin-review">Forwarded to Super Admin</option>
              <option value="return-for-correction">Returned for Correction</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Applications List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-dillaNavy">
              Campus Student Applications ({filteredApplications.length})
            </h2>
            <p className="text-xs text-slate-500">
              Only displaying students enrolled in {userCampus}
            </p>
          </div>
          {searchTerm || selectedStatus ? (
            <button
              onClick={() => {
                setSearchTerm('')
                setSelectedStatus('')
              }}
              className="text-xs text-dillaTeal hover:underline font-semibold"
            >
              Clear Filters
            </button>
          ) : null}
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-dillaNavy border-t-transparent mb-3"></div>
            <p className="text-sm font-medium">Loading campus student applications...</p>
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Icon name="search" className="w-10 h-10 mx-auto text-slate-400 mb-2" />
            <p className="text-base font-semibold text-slate-700">No student applications match your criteria</p>
            <p className="text-xs text-slate-500 mt-1">Try clearing your search term or status filter</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredApplications.map((app) => (
              <div
                key={app.id}
                className="p-5 hover:bg-slate-50/70 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-dillaNavy text-base">
                      {app.studentName}
                    </h3>
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                      {app.studentId}
                    </span>
                    <StatusBadge status={app.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-600">
                    <span>
                      <strong>Dept:</strong> {app.department}
                    </span>
                    <span>
                      <strong>Campus:</strong> {app.campus}
                    </span>
                    <span>
                      <strong>Academic Year:</strong> {app.academicYear}
                    </span>
                    <span>
                      <strong>Submitted:</strong> {new Date(app.submittedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0">
                  <Button
                    onClick={() => handleReview(app.id)}
                    className="bg-dillaNavy hover:bg-slate-800 text-white text-xs px-3 py-1.5 h-8 font-medium shadow-sm"
                  >
                    Review Application
                  </Button>

                  {app.status !== 'return-for-correction' && app.status !== 'returned-for-correction' && (
                    <Button
                      onClick={() => handleReturnForCorrection(app.id)}
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-50 text-xs px-3 py-1.5 h-8 font-medium"
                    >
                      Return for Correction
                    </Button>
                  )}

                  <Button
                    onClick={() => {
                      setResetTargetStudent(app)
                      setCustomPassword('')
                    }}
                    variant="outline"
                    className="border-slate-300 text-slate-700 hover:bg-slate-100 text-xs px-3 py-1.5 h-8 font-medium"
                    title="Authorized reset password for student in your campus"
                  >
                    Reset Password
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Authorized Student Password Reset Modal (Task 5: Campus Dean can reset students in their campus) */}
      {resetTargetStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-dillaNavy">Authorized Student Password Reset</h3>
              <button
                onClick={() => setResetTargetStudent(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 mb-4">
              <p className="font-semibold">Dean Authority Scoping:</p>
              <p className="mt-0.5">
                As Campus Dean for <strong>{userCampus}</strong>, you are authorized to reset credentials for student{' '}
                <strong>{resetTargetStudent.studentName}</strong> ({resetTargetStudent.studentId}).
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Custom Password (Optional)
                </label>
                <Input
                  type="text"
                  placeholder="Leave empty for auto-generated password"
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  className="w-full text-slate-800"
                />
                <p className="text-xs text-slate-500 mt-1">
                  If left empty, a secure password will be generated automatically.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <Button
                  variant="outline"
                  onClick={() => setResetTargetStudent(null)}
                  className="border-slate-300 text-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleExecutePasswordReset}
                  disabled={resettingPassword}
                  className="bg-dillaNavy text-white hover:bg-slate-800"
                >
                  {resettingPassword ? 'Resetting...' : 'Confirm Reset Password'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CampusDeanDashboard