import React, { useState, useEffect } from 'react'
import { Button, Input } from '@/components/forms'
import { StatusBadge } from '@/components/status/StatusBadge'
import Icon from '@/components/icons/Icon'
import ActionMenu from '@/components/common/ActionMenu'
import StudentDetailModal from '@/components/students/StudentDetailModal'

const DeanUserManagement = () => {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDept, setSelectedDept] = useState('')
  const [departments, setDepartments] = useState([])

  // Password reset modal state
  const [resetTarget, setResetTarget] = useState(null)
  const [customPassword, setCustomPassword] = useState('Student@Dilla2026!')
  const [isResetting, setIsResetting] = useState(false)
  const [resetSuccessMessage, setResetSuccessMessage] = useState(null)

  // Student detail modal
  const [detailStudentId, setDetailStudentId] = useState(null)
  const [detailInitialData, setDetailInitialData] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  const userCampus = localStorage.getItem('userCampus') || 'Main Campus'

  const loadStudents = () => {
    setLoading(true)
    setError(null)
    const token = localStorage.getItem('token')

    fetch('/api/users?type=student', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const raw = (data?.users || data?.applications || []).filter(
          (u) => !u.role || u.role === 'student'
        )
        setStudents(raw)

        const depts = Array.from(new Set(raw.map((s) => s.department).filter(Boolean)))
        setDepartments(depts)
      })
      .catch((err) => {
        console.error('Failed to load campus students:', err)
        setError('Failed to load campus student directory.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadStudents()
  }, [])

  const handleOpenResetModal = (student) => {
    setResetTarget(student)
    setCustomPassword('Student@Dilla2026!')
    setResetSuccessMessage(null)
  }

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%*'
    let pw = 'Dilla'
    for (let i = 0; i < 6; i++) {
      pw += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    pw += '!'
    setCustomPassword(pw)
  }

  const handleExecutePasswordReset = async () => {
    if (!resetTarget) return
    setIsResetting(true)
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
          userId: resetTarget.id,
          targetUsername: resetTarget.studentId || resetTarget.username,
          newPassword: customPassword.trim(),
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setResetSuccessMessage(
          `Password for student ${resetTarget.fullName || resetTarget.studentName} (${resetTarget.studentId}) was reset to: ${data.resetPassword}`
        )
        setMessage(`Password reset successful for ${resetTarget.studentId}.`)
      } else {
        setError(data.message || 'Failed to reset student password')
      }
    } catch (e) {
      console.error('Password reset error:', e)
      setError('Network error while resetting password.')
    } finally {
      setIsResetting(false)
    }
  }

  const filteredStudents = students.filter((s) => {
    const term = searchTerm.toLowerCase().trim()
    const nameMatch = s.fullName && s.fullName.toLowerCase().includes(term)
    const idMatch = s.studentId && s.studentId.toLowerCase().includes(term)
    const deptMatch = s.department && s.department.toLowerCase().includes(term)
    const matchesSearch = !term || nameMatch || idMatch || deptMatch

    const matchesDept = !selectedDept || s.department === selectedDept

    return matchesSearch && matchesDept
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-dillaDarkGreen via-[#12442c] to-dillaGreen p-6 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-white p-1.5 shadow-md flex items-center justify-center flex-shrink-0">
                <img
                  src="/dilla-logo.png"
                  alt="Dilla University Seal"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider font-bold text-dillaGold">
                    Campus Dean Portal
                  </span>
                  <span className="text-white/40">•</span>
                  <span className="text-xs text-emerald-200 font-medium">
                    {userCampus} Administration
                  </span>
                </div>
                <h1 className="font-serif text-2xl font-bold tracking-tight text-white mt-0.5">
                  Student User Directory & Account Credentials
                </h1>
                <p className="text-xs text-white/80 mt-0.5">
                  Manage student accounts, view cost-sharing registration statuses, and execute authorized password resets for {userCampus}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <Button
                onClick={loadStudents}
                variant="gold"
                className="text-xs font-bold shadow-md flex items-center gap-1.5"
              >
                <Icon name="refresh" className="w-4 h-4 text-dillaDarkGreen" />
                <span>Refresh Directory</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Directory Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 bg-[#f8faf9] border-t border-slate-200">
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-dillaGreen flex items-center justify-center font-bold text-sm">
              <Icon name="users" className="w-5 h-5 text-dillaGreen" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Campus Students</span>
              <span className="text-xl font-bold text-slate-900">{students.length}</span>
            </div>
          </div>

          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm">
              <Icon name="book-open" className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Departments</span>
              <span className="text-xl font-bold text-slate-900">{departments.length}</span>
            </div>
          </div>

          <div className="p-4 flex items-center gap-3 col-span-2 sm:col-span-1">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-sm">
              <Icon name="key" className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Authorization Level</span>
              <span className="text-sm font-bold text-slate-900">Campus Dean Authority</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Alerts */}
      {message && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <Icon name="check-circle" className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <Icon name="alert-circle" className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search student by name, ID, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 text-slate-900"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-600 whitespace-nowrap">Filter Dept:</span>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dillaGreen/30"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-[#f1f5f3]">
              <tr>
                <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">Student ID</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">Full Name</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">Department</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">Program / Year</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">Academic Year</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">Registration Status</th>
                <th className="px-4 py-3.5 text-right text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-500 font-semibold">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-dillaGreen border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading campus students...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-500 font-medium">
                    No students found matching search criteria.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr key={s.id || s.studentId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-dillaGreen whitespace-nowrap">
                      {s.studentId}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                      {s.fullName || s.studentName}
                    </td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                      {s.department || 'General'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {s.program || 'Regular'} • {s.yearOfStudy ? `Year ${s.yearOfStudy}` : 'Y1'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {s.academicYear || '2023/2024'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={s.applicationStatus || s.status || 'submitted'} />
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex justify-end">
                        <ActionMenu items={[
                          {
                            label: 'View Full Dossier',
                            icon: 'eye',
                            onClick: () => { setDetailStudentId(s.studentId || s.id); setDetailInitialData(s); setShowDetailModal(true) },
                          },
                          {
                            label: 'Reset Password',
                            icon: 'key',
                            onClick: () => handleOpenResetModal(s),
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

      {/* Password Reset Modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Icon name="key" className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-slate-900 text-base">Authorized Password Reset</h3>
                  <p className="text-[11px] text-slate-500">Office of the Campus Dean • {userCampus}</p>
                </div>
              </div>
              <button
                onClick={() => setResetTarget(null)}
                className="text-slate-400 hover:text-slate-700 text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Target Student:</span>
                  <span className="font-bold text-slate-900">{resetTarget.fullName || resetTarget.studentName}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Student ID:</span>
                  <span className="font-mono font-bold text-dillaGreen">{resetTarget.studentId}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Department:</span>
                  <span className="text-slate-700 font-semibold">{resetTarget.department || 'General'}</span>
                </div>
              </div>

              {resetSuccessMessage ? (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                    <Icon name="check-circle" className="w-4 h-4 text-emerald-600" />
                    <span>Password Successfully Reset!</span>
                  </div>
                  <p className="text-xs text-slate-700 break-all bg-white p-2.5 rounded-lg border border-emerald-100 font-mono font-bold select-all">
                    {customPassword}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Provide this temporary password to the student. They will be able to log in immediately.
                  </p>
                  <Button
                    onClick={() => setResetTarget(null)}
                    variant="primary"
                    className="w-full text-xs font-bold mt-2"
                  >
                    Done
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      New Password:
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={customPassword}
                        onChange={(e) => setCustomPassword(e.target.value)}
                        className="h-10 text-slate-900 font-mono text-xs flex-1"
                        placeholder="Enter temporary password..."
                      />
                      <Button
                        type="button"
                        onClick={handleGeneratePassword}
                        variant="outline"
                        className="text-xs font-bold whitespace-nowrap"
                        title="Generate strong random password"
                      >
                        Generate
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      onClick={() => setResetTarget(null)}
                      variant="outline"
                      className="text-xs font-bold"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleExecutePasswordReset}
                      disabled={isResetting || !customPassword.trim()}
                      variant="primary"
                      className="text-xs font-bold bg-amber-600 hover:bg-amber-700 border-amber-600"
                    >
                      {isResetting ? 'Resetting...' : 'Confirm Reset'}
                    </Button>
                  </div>
                </div>
              )}
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
    </div>
  )
}

export default DeanUserManagement
