import React, { useState, useEffect } from 'react'
import { Input, Button } from '@/components/forms'
import { StatusBadge } from '@/components/status/StatusBadge'
import Icon from '@/components/icons/Icon'
import ActionMenu from '@/components/common/ActionMenu'
import ConfirmModal from '@/components/common/ConfirmModal'
import StudentDetailModal from '@/components/students/StudentDetailModal'

const StudentApplicationManagement = () => {
  const [applications, setApplications] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCampus, setSelectedCampus] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [actionMessage, setActionMessage] = useState(null)
  const [error, setError] = useState(null)

  // Detail modal state
  const [detailStudentId, setDetailStudentId] = useState(null)
  const [detailInitialData, setDetailInitialData] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  // Delete confirmation modal state
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Reset password modal state
  const [resetTargetStudent, setResetTargetStudent] = useState(null)
  const [resetPasswordInput, setResetPasswordInput] = useState('Student@Dilla2026!')

  const loadApplications = () => {
    const token = localStorage.getItem('token')
    fetch('/api/users', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const apps = (data?.users || data?.applications || []).map((u) => ({
          id: u.studentId || u.id,
          studentId: u.studentId,
          studentName: u.fullName || u.studentName || 'Student Applicant',
          gender: u.gender || 'Male',
          phone: u.phone || '-',
          email: u.email || '-',
          department: u.department || 'General',
          program: u.program || 'Regular Degree',
          yearOfStudy: u.yearOfStudy || '1',
          campus: u.campus || 'Main Campus',
          academicYear: u.academicYear || '2023/2024',
          status: u.applicationStatus || u.status || 'super-admin-review',
          finding: u.deanFinding || 'registered',
          deanComments: u.deanComments || 'Verified by Campus Dean',
          superAdminComments: u.superAdminComments || '',
          submittedAt: u.createdAt || u.submittedAt || new Date().toISOString(),
          photoUrl: u.photoUrl || null,
          pdfUrl: `/api/documents/upload?id=${u.studentId || u.id}`,
        }))

        if (apps.length > 0) {
          setApplications(apps)
        }
      })
      .catch(() => {})
  }

  useEffect(() => {
    loadApplications()
    const params = new URLSearchParams(window.location.search)
    const action = params.get('action')
    const id = params.get('id')
    if (action === 'approve' && id) {
      handleFinalDecision(id, 'approved', 'Approved by Super Admin')
    } else if (action === 'reject' && id) {
      handleFinalDecision(id, 'rejected', 'Rejected by Super Admin')
    } else if (action === 'return' && id) {
      handleFinalDecision(id, 'return-for-correction', 'Returned by Super Admin for student correction')
    }
  }, [])

  const handleFinalDecision = async (id, decision, defaultComment = '') => {
    setActionMessage(null)
    setError(null)
    const token = localStorage.getItem('token')
    const comments = window.prompt(`Enter comments or reason for "${decision}":`, defaultComment)
    if (comments === null) return

    try {
      const res = await fetch('/api/approval/final', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          applicationId: id,
          decision,
          comments: comments || defaultComment,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setActionMessage(`Application '${id}' updated to '${decision}' successfully!`)
        setApplications((prev) =>
          prev.map((a) =>
            a.id === id || a.studentId === id
              ? { ...a, status: decision, superAdminComments: comments }
              : a
          )
        )
        setShowDetailModal(false)
      } else {
        setError(data.message || `Failed to process ${decision}`)
      }
    } catch (e) {
      setError(`Network error processing decision for application ${id}`)
    }
  }

  const handleResetStudentPassword = async () => {
    if (!resetTargetStudent) return
    setError(null)
    setActionMessage(null)
    const token = localStorage.getItem('token')

    try {
      const res = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          userId: resetTargetStudent.studentId || resetTargetStudent.id,
          targetUsername: resetTargetStudent.studentId,
          newPassword: resetPasswordInput.trim() || 'Student@Dilla2026!',
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setActionMessage(
          `Password for '${resetTargetStudent.studentName}' (${resetTargetStudent.studentId}) reset successfully! New Password: ${data.resetPassword}`
        )
        setResetTargetStudent(null)
      } else {
        setError(data.message || 'Failed to reset student password')
      }
    } catch (e) {
      setError('Network error while resetting password.')
    }
  }

  const handleDeleteApplication = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    setError(null)
    const token = localStorage.getItem('token')
    const id = deleteTarget.studentId || deleteTarget.id

    try {
      const res = await fetch(`/api/users?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      if (res.ok) {
        setActionMessage(`Student record '${deleteTarget.studentName}' (${id}) deleted successfully.`)
        setApplications((prev) => prev.filter((a) => a.studentId !== id && a.id !== id))
        setDeleteTarget(null)
      } else {
        const d = await res.json()
        setError(d.message || 'Failed to delete student record.')
        setDeleteTarget(null)
      }
    } catch (e) {
      setError('Network error while deleting student record.')
      setDeleteTarget(null)
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      (app.studentName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (app.studentId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (app.department && app.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (app.campus && app.campus.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesCampus = selectedCampus === 'all' || app.campus === selectedCampus
    const matchesStatus = selectedStatus === 'all' || app.status === selectedStatus
    return matchesSearch && matchesCampus && matchesStatus
  })

  const getActionMenuItems = (app) => [
    {
      label: 'View Full Dossier',
      icon: 'eye',
      onClick: () => {
        setDetailStudentId(app.studentId || app.id)
        setDetailInitialData(app)
        setShowDetailModal(true)
      },
    },
    {
      label: 'Approve Application',
      icon: 'check-circle',
      disabled: app.status === 'approved',
      onClick: () => handleFinalDecision(app.studentId || app.id, 'approved', 'Approved by Super Admin'),
    },
    {
      label: 'Reject Application',
      icon: 'x-circle',
      disabled: app.status === 'rejected',
      className: 'text-rose-700',
      onClick: () => handleFinalDecision(app.studentId || app.id, 'rejected', 'Does not meet cost-sharing requirements'),
    },
    {
      label: 'Return for Correction',
      icon: 'refresh',
      disabled: app.status === 'return-for-correction',
      className: 'text-amber-700',
      onClick: () => handleFinalDecision(app.studentId || app.id, 'return-for-correction', 'Missing required registration slip details'),
    },
    {
      label: 'Reset Password',
      icon: 'key',
      onClick: () => {
        setResetTargetStudent(app)
        setResetPasswordInput('Student@Dilla2026!')
      },
    },
    {
      label: 'Delete Record',
      icon: 'trash',
      className: 'text-rose-700 font-bold',
      separator: true,
      onClick: () => setDeleteTarget(app),
    },
  ]

  return (
    <div className="bg-white shadow-xl rounded-2xl p-6 sm:p-8 border border-slate-200 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-dillaGreen/10 text-dillaGreen flex items-center justify-center p-2 flex-shrink-0">
            <Icon name="users" className="w-6 h-6 text-dillaGreen" />
          </div>
          <div>
            <h2 className="font-serif text-2xl font-bold text-dillaDarkGreen">
              Student Application Management Workspace
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review dean findings, verify documentation, and execute final university cost-sharing approvals
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={loadApplications}
            variant="outline"
            className="text-xs font-semibold"
          >
            <Icon name="refresh" className="w-4 h-4 text-dillaGreen" />
            Refresh Records
          </Button>
        </div>
      </div>

      {actionMessage && (
        <div className="bg-emerald-50 border-l-4 border-emerald-600 text-emerald-900 text-xs sm:text-sm p-4 rounded-xl flex items-center justify-between shadow-2xs">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-emerald-700 hover:text-emerald-950 font-bold ml-4">✕</button>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-900 text-xs sm:text-sm p-4 rounded-xl flex items-center justify-between shadow-2xs">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-700 hover:text-rose-950 font-bold ml-4">✕</button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Input
          placeholder="Search by student name, ID, or department..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-10 text-slate-900"
        />
        <select
          value={selectedCampus}
          onChange={(e) => setSelectedCampus(e.target.value)}
          className="h-10 px-3.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dillaGreen/30"
        >
          <option value="all">All Campuses</option>
          <option value="Main Campus">Main Campus</option>
          <option value="Odaya Campus">Odaya Campus</option>
          <option value="Haru Campus">Haru Campus</option>
        </select>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="h-10 px-3.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dillaGreen/30"
        >
          <option value="all">All Application Statuses</option>
          <option value="submitted">Submitted (New)</option>
          <option value="dean-review">Campus Dean Review</option>
          <option value="super-admin-review">Super Admin Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="return-for-correction">Correction Required</option>
        </select>
      </div>

      {/* Applications Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-2xs">
        <table className="min-w-full bg-white divide-y divide-slate-200">
          <thead className="bg-[#f1f5f3]">
            <tr>
              <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">
                Student ID
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">
                Student Name
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">
                Department
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">
                Campus
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
            {filteredApplications.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-4 py-8 text-center text-slate-500 font-medium">
                  No applications found matching the search criteria.
                </td>
              </tr>
            ) : (
              filteredApplications.map((app) => (
                <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3.5 font-mono font-bold text-dillaGreen text-xs">
                    {app.studentId}
                  </td>
                  <td className="px-4 py-3.5 font-bold text-slate-900">
                    <div className="flex items-center gap-2">
                      {app.photoUrl ? (
                        <img
                          src={app.photoUrl.startsWith('http') ? app.photoUrl : `/api/student/photo?file=${encodeURIComponent(app.photoUrl.replace(/^\/uploads\/photos\//, ''))}`}
                          alt={app.studentName}
                          className="w-7 h-9 object-cover rounded border border-slate-200 flex-shrink-0"
                          style={{ aspectRatio: '3/4' }}
                          onError={(e) => { e.target.style.display = 'none' }}
                        />
                      ) : (
                        <div className="w-7 h-9 bg-slate-100 rounded border border-slate-200 flex items-center justify-center flex-shrink-0">
                          <Icon name="user" className="w-4 h-4 text-slate-400" />
                        </div>
                      )}
                      {app.studentName}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-800 font-medium">
                    {app.department}
                  </td>
                  <td className="px-4 py-3.5 text-slate-700">
                    {app.campus}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={app.status} />
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex justify-end">
                      <ActionMenu items={getActionMenuItems(app)} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Student Detail Dossier Modal */}
      <StudentDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        studentId={detailStudentId}
        initialData={detailInitialData}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteApplication}
        isLoading={isDeleting}
        title="Delete Student Application"
        description={
          deleteTarget
            ? `You are about to permanently delete the application record for ${deleteTarget.studentName} (${deleteTarget.studentId}). All associated data including documents, dean reviews, and approval history will be permanently removed.`
            : ''
        }
        confirmLabel="Delete Record"
        danger
      />

      {/* Password Reset Modal */}
      {resetTargetStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-dillaDarkGreen mb-1">
              Reset Student Password
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Set new password for <strong>{resetTargetStudent.studentName}</strong> ({resetTargetStudent.studentId})
            </p>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                New Password
              </label>
              <Input
                value={resetPasswordInput}
                onChange={(e) => setResetPasswordInput(e.target.value)}
                placeholder="Enter new password"
                className="text-slate-900"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Default: <code>Student@Dilla2026!</code>
              </p>
            </div>

            <div className="flex items-center gap-2 mt-5 pt-3 border-t border-slate-200">
              <Button
                variant="outline"
                onClick={() => setResetTargetStudent(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="gold"
                onClick={handleResetStudentPassword}
                className="flex-1 font-bold"
              >
                Reset Password
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StudentApplicationManagement
