import React, { useState, useEffect } from 'react'
import { Input, Button, Select } from '@/components/forms'
import { StatusBadge } from '@/components/status/StatusBadge'
import Icon from '@/components/icons/Icon'
import ActionMenu from '@/components/common/ActionMenu'
import StudentDetailModal from '@/components/students/StudentDetailModal'

const CampusDeanDashboard = () => {
  const [activeTab, setActiveTab] = useState('applications') // 'applications', 'history', 'customFields'
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
  const [selectedDept, setSelectedDept] = useState('')
  const [loading, setLoading] = useState(true)
  const [userCampus, setUserCampus] = useState('')
  const [userName, setUserName] = useState('')
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  // Batch Roster Selection State
  const [selectedStudentIds, setSelectedStudentIds] = useState([])
  const [submissionNotes, setSubmissionNotes] = useState('')
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false)

  // Submission History State
  const [submissions, setSubmissions] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Campus Custom Fields State
  const [campusFields, setCampusFields] = useState([])
  const [loadingFields, setLoadingFields] = useState(false)
  const [newField, setNewField] = useState({
    fieldKey: '',
    label: '',
    fieldType: 'text',
    optionsStr: '',
    isRequired: false,
    isActive: true,
  })

  // Password reset modal state
  const [resetTargetStudent, setResetTargetStudent] = useState(null)
  const [customPassword, setCustomPassword] = useState('')
  const [resettingPassword, setResettingPassword] = useState(false)

  // Student detail modal state
  const [detailStudentId, setDetailStudentId] = useState(null)
  const [detailInitialData, setDetailInitialData] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  const loadData = async () => {
    setLoading(true)
    const token = localStorage.getItem('token')
    const campus = localStorage.getItem('userCampus') || 'Main Campus'
    const name = localStorage.getItem('userName') || 'Campus Dean'
    setUserCampus(campus)
    setUserName(name)

    try {
      const response = await fetch('/api/users', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      if (!response.ok) {
        const errorData = await response.json()
        // Handle authorization/ authentication errors
        if (response.status === 401) {
          setError('Session expired. Please log in again.')
          localStorage.removeItem('token')
        } else if (response.status === 403) {
          setError(errorData.message || 'Access denied: Insufficient permissions')
        } else {
          setError(errorData.message || 'Failed to load applications. Please try again.')
        }
        return
      }

      const data = await response.json()
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
    } catch (err) {
      console.error('Failed to load applications:', err)
      setError('Network error. Please check your connection and try again.')
    }
    finally {
      setLoading(false)
    }
  }

  const loadSubmissions = () => {
    setLoadingHistory(true)
    const token = localStorage.getItem('token')
    fetch('/api/submissions', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setSubmissions(data?.submissions || [])
      })
      .catch((err) => console.error('Failed to load submissions:', err))
      .finally(() => setLoadingHistory(false))
  }

  const loadCustomFields = () => {
    setLoadingFields(true)
    const token = localStorage.getItem('token')
    fetch('/api/custom-fields?all=true', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setCampusFields(data?.customFields || [])
      })
      .catch((err) => console.error('Failed to load custom fields:', err))
      .finally(() => setLoadingFields(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (activeTab === 'history') loadSubmissions()
    if (activeTab === 'customFields') loadCustomFields()
  }, [activeTab])

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

  const filteredApplications = applications.filter((app) => {
    const term = searchTerm.toLowerCase().trim()
    const matchesSearch =
      !term ||
      (app.studentName && app.studentName.toLowerCase().includes(term)) ||
      (app.studentId && app.studentId.toLowerCase().includes(term)) ||
      (app.department && app.department.toLowerCase().includes(term))

    const matchesStatus = !selectedStatus || app.status === selectedStatus
    const matchesDept = !selectedDept || app.department === selectedDept

    return matchesSearch && matchesStatus && matchesDept
  })

  const handleToggleSelectStudent = (studentId) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    )
  }

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredApplications.map((a) => a.studentId)
    const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedStudentIds.includes(id))

    if (allSelected) {
      setSelectedStudentIds((prev) => prev.filter((id) => !filteredIds.includes(id)))
    } else {
      setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...filteredIds])))
    }
  }

  const isAllFilteredSelected =
    filteredApplications.length > 0 &&
    filteredApplications.every((a) => selectedStudentIds.includes(a.studentId))

  const handleBatchSubmit = async () => {
    if (selectedStudentIds.length === 0) {
      setError('Please select at least one student to submit in the batch.')
      return
    }

    setError(null)
    setMessage(null)
    setIsSubmittingBatch(true)
    const token = localStorage.getItem('token')

    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          studentIds: selectedStudentIds,
          filters: {
            department: selectedDept || 'All',
            status: selectedStatus || 'All',
            search: searchTerm || '',
          },
          notes: submissionNotes.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setMessage(
          `Success: Roster batch '${data.submission?.batchNumber}' with ${selectedStudentIds.length} students was submitted to Super Admin! Central Admin has been notified.`
        )
        setSelectedStudentIds([])
        setSubmissionNotes('')
        loadData()
      } else {
        setError(data.message || 'Failed to submit student roster batch')
      }
    } catch (e) {
      setError('Network error submitting roster batch.')
    } finally {
      setIsSubmittingBatch(false)
    }
  }

  const handleCreateCampusField = async (e) => {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (!newField.fieldKey || !newField.label) {
      setError('Field Identifier (key) and Field Label are required.')
      return
    }

    const token = localStorage.getItem('token')
    const optionsArray =
      newField.fieldType === 'select'
        ? newField.optionsStr.split(',').map((o) => o.trim()).filter(Boolean)
        : []

    if (newField.fieldType === 'select' && optionsArray.length === 0) {
      setError('Please provide at least one comma-separated option for dropdown fields.')
      return
    }

    try {
      const res = await fetch('/api/custom-fields', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          fieldKey: newField.fieldKey,
          label: newField.label,
          fieldType: newField.fieldType,
          options: optionsArray,
          isRequired: newField.isRequired,
          isActive: newField.isActive,
          campus: userCampus,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setMessage(
          `Campus custom field '${newField.label}' defined for ${userCampus}. Super Admin has been notified.`
        )
        setNewField({
          fieldKey: '',
          label: '',
          fieldType: 'text',
          optionsStr: '',
          isRequired: false,
          isActive: true,
        })
        loadCustomFields()
      } else {
        setError(data.message || 'Failed to create campus custom field')
      }
    } catch (e) {
      setError('Network error creating campus custom field.')
    }
  }

  const handleDeleteCampusField = async (field) => {
    if (!window.confirm(`Delete field '${field.label}'? All student values stored for this field will be removed.`)) {
      return
    }
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`/api/custom-fields?id=${field.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.ok) {
        setMessage(`Custom field '${field.label}' deleted.`)
        loadCustomFields()
      } else {
        const d = await res.json()
        setError(d.message || 'Failed to delete field')
      }
    } catch (e) {
      setError('Network error deleting field.')
    }
  }

  const departments = Array.from(new Set(applications.map((a) => a.department).filter(Boolean)))

  return (
    <div className="space-y-6">
      {/* Official Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-dillaDarkGreen via-[#12442c] to-dillaGreen p-6 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-white p-1.5 shadow-md flex items-center justify-center flex-shrink-0">
                <img
                  src="/dilla-logo.png"
                  alt="Dilla University Emblem"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider font-bold text-dillaGold">
                    Campus Dean Directorate
                  </span>
                  <span className="text-white/40">•</span>
                  <span className="text-xs text-emerald-200 font-medium">
                    {userCampus}
                  </span>
                </div>
                <h1 className="font-serif text-2xl font-bold tracking-tight text-white mt-0.5">
                  Cost-Sharing Verification & Roster Oversight
                </h1>
                <p className="text-xs text-white/80 mt-0.5">
                  Inspect registration slips, authorize eligible non-cafeteria students, and submit verified rosters to Super Admin
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <Button
                onClick={() => {
                  loadData()
                  if (activeTab === 'history') loadSubmissions()
                  if (activeTab === 'customFields') loadCustomFields()
                }}
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-bold"
              >
                <Icon name="refresh" className="w-4 h-4 text-dillaGold" />
                Refresh Data
              </Button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-[#f1f5f3] px-6 py-2.5 border-t border-slate-200 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('applications')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'applications'
                ? 'bg-dillaGreen text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-200/70'
            }`}
          >
            Student Verification Queue ({filteredApplications.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-dillaGreen text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-200/70'
            }`}
          >
            Batch Submission Log ({submissions.length})
          </button>
          <button
            onClick={() => setActiveTab('customFields')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'customFields'
                ? 'bg-dillaGreen text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-200/70'
            }`}
          >
            Campus Custom Fields ({campusFields.length})
          </button>
        </div>
      </div>

      {/* Notifications */}
      {message && (
        <div className="bg-emerald-50 border-l-4 border-emerald-600 text-emerald-900 p-4 rounded-xl flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <Icon name="check-circle" className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-semibold">{message}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-emerald-700 hover:text-emerald-950 font-bold ml-4">
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-900 p-4 rounded-xl flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <Icon name="alert-circle" className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-semibold">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-700 hover:text-rose-950 font-bold ml-4">
            ×
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Enrolled</p>
            <div className="p-2.5 bg-emerald-50 text-dillaGreen rounded-xl">
              <Icon name="users" className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-dillaDarkGreen mt-2">{stats.totalStudents}</p>
          <p className="text-xs text-slate-500 mt-1">Students enrolled in {userCampus}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Awaiting Inspection</p>
            <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl">
              <Icon name="clock" className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-amber-700 mt-2">{stats.pendingReview}</p>
          <p className="text-xs text-slate-500 mt-1">Requires Dean review</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Returned to Student</p>
            <div className="p-2.5 bg-rose-50 text-rose-700 rounded-xl">
              <Icon name="alert-circle" className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-rose-700 mt-2">{stats.returnedForCorrection}</p>
          <p className="text-xs text-slate-500 mt-1">Corrections requested</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Approved Beneficiaries</p>
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
              <Icon name="check" className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-emerald-700 mt-2">{stats.approved}</p>
          <p className="text-xs text-slate-500 mt-1">Approved by Super Admin</p>
        </div>
      </div>

      {/* TAB 1: APPLICATIONS & BATCH ROSTER */}
      {activeTab === 'applications' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Search Applications
                </label>
                <Input
                  placeholder="Search by student name, ID number, or department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-10 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Filter Department
                </label>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-dillaGreen/30 focus:border-dillaGreen text-xs"
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Filter Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-dillaGreen/30 focus:border-dillaGreen text-xs"
                >
                  <option value="">All Statuses</option>
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

          {/* BATCH ROSTER SUBMISSION ACTION BAR */}
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50/50 to-blue-50/40 rounded-2xl p-4 sm:p-5 border border-emerald-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <label className="flex items-center gap-2 cursor-pointer bg-white px-3.5 py-2 rounded-xl border border-slate-300 shadow-2xs">
                <input
                  type="checkbox"
                  checked={isAllFilteredSelected}
                  onChange={handleSelectAllFiltered}
                  className="rounded border-slate-300 text-dillaGreen focus:ring-dillaGreen w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-800">Select All Filtered</span>
              </label>

              {/* Distinction between selected students vs all filtered */}
              <div className="px-3.5 py-2 bg-dillaDarkGreen text-white rounded-xl text-xs font-bold shadow-2xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-dillaGold animate-pulse"></span>
                <span>Selected: {selectedStudentIds.length} of {filteredApplications.length} students</span>
              </div>

              {selectedStudentIds.length > 0 && (
                <button
                  onClick={() => setSelectedStudentIds([])}
                  className="text-xs text-slate-600 hover:text-slate-950 underline font-bold cursor-pointer"
                >
                  Clear Selection
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto">
              <Input
                placeholder="Roster batch remarks (e.g. Verified Semester 1)..."
                value={submissionNotes}
                onChange={(e) => setSubmissionNotes(e.target.value)}
                className="w-full sm:w-64 text-xs h-10"
              />
              <Button
                onClick={handleBatchSubmit}
                disabled={selectedStudentIds.length === 0 || isSubmittingBatch}
                variant="primary"
                className="w-full sm:w-auto text-xs font-bold px-4 py-2.5 whitespace-nowrap shadow-md"
              >
                <Icon name="upload" className="w-3.5 h-3.5" />
                {isSubmittingBatch
                  ? 'Submitting...'
                  : `Submit Batch (${selectedStudentIds.length}) to Admin`}
              </Button>
            </div>
          </div>

          {/* Applications List */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-dillaDarkGreen">
                  Campus Student Applications ({filteredApplications.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Select verified non-cafeteria students and submit the official roster batch to Super Admin
                </p>
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-500">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-dillaGreen border-t-transparent mb-3"></div>
                <p className="text-sm font-semibold text-slate-700">Loading campus student applications...</p>
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Icon name="search" className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                <p className="text-base font-bold text-slate-800">No applications match your criteria</p>
                <p className="text-xs text-slate-500 mt-1">Try clearing filters or search term</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredApplications.map((app) => {
                  const isSelected = selectedStudentIds.includes(app.studentId)
                  return (
                    <div
                      key={app.id}
                      className={`p-4 sm:p-5 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                        isSelected
                          ? 'bg-emerald-50/60 border-l-4 border-dillaGreen'
                          : 'hover:bg-[#f8faf9]'
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectStudent(app.studentId)}
                          className="mt-1 w-4 h-4 rounded border-slate-300 text-dillaGreen focus:ring-dillaGreen cursor-pointer"
                        />
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            <h3 className="font-bold text-slate-900 text-base">{app.studentName}</h3>
                            <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200">
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
                      </div>

                      <div className="flex items-center gap-2 pt-2 lg:pt-0 flex-shrink-0">
                        <ActionMenu items={[
                          {
                            label: 'View Full Dossier',
                            icon: 'eye',
                            onClick: () => { setDetailStudentId(app.studentId || app.id); setDetailInitialData(app); setShowDetailModal(true) },
                          },
                          {
                            label: 'Review Registration Slip',
                            icon: 'file-text',
                            onClick: () => handleReview(app.id),
                          },
                          {
                            label: 'Return for Correction',
                            icon: 'refresh',
                            disabled: app.status === 'return-for-correction' || app.status === 'returned-for-correction',
                            className: 'text-rose-700',
                            onClick: () => handleReturnForCorrection(app.id),
                          },
                          {
                            label: 'Reset Password',
                            icon: 'key',
                            onClick: () => { setResetTargetStudent(app); setCustomPassword('') },
                          },
                        ]} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: BATCH SUBMISSION HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="pb-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-dillaDarkGreen">
                Campus Roster Batch Submission History
              </h2>
              <p className="text-xs text-slate-500">
                Log of batch student rosters submitted to the central Super Admin
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-800 rounded-lg border border-slate-200">
              {submissions.length} Submissions Logged
            </span>
          </div>

          {loadingHistory ? (
            <div className="p-8 text-center text-slate-500">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-dillaGreen border-t-transparent mb-2"></div>
              <p className="text-xs font-semibold">Loading submission history...</p>
            </div>
          ) : submissions.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Icon name="file-text" className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-medium">No batch submissions recorded yet for {userCampus}</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-[#f1f5f3] text-dillaDarkGreen font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Batch Number</th>
                    <th className="py-3 px-4">Date Submitted</th>
                    <th className="py-3 px-4">Students</th>
                    <th className="py-3 px-4">Submitted By</th>
                    <th className="py-3 px-4">Notes & Filters</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {submissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-dillaGreen">{sub.batchNumber}</td>
                      <td className="py-3 px-4 text-slate-700">
                        {new Date(sub.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">{sub.studentCount} students</td>
                      <td className="py-3 px-4 text-slate-700 font-medium">{sub.submittedBy}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {sub.notes && <p className="text-slate-800 italic">"{sub.notes}"</p>}
                        {sub.filtersApplied && (
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Filters: {JSON.stringify(sub.filtersApplied)}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 bg-blue-50 text-blue-900 rounded-full font-bold border border-blue-200 text-[10px] uppercase">
                          {sub.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CAMPUS CUSTOM FIELDS */}
      {activeTab === 'customFields' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="pb-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-dillaDarkGreen">
                Campus Custom Fields ({userCampus})
              </h2>
              <p className="text-xs text-slate-500">
                Define campus-specific student fields. Super Admin is automatically notified on definition.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateCampusField} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">
              Add New Custom Field for {userCampus}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Field Key (Slug) *
                </label>
                <Input
                  placeholder="e.g. library_clearance_no"
                  value={newField.fieldKey}
                  onChange={(e) => setNewField((p) => ({ ...p, fieldKey: e.target.value }))}
                  required
                  className="text-slate-900 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Field Label *
                </label>
                <Input
                  placeholder="e.g. Library Clearance Number"
                  value={newField.label}
                  onChange={(e) => setNewField((p) => ({ ...p, label: e.target.value }))}
                  required
                  className="text-slate-900 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Field Type *
                </label>
                <select
                  value={newField.fieldType}
                  onChange={(e) => setNewField((p) => ({ ...p, fieldType: e.target.value }))}
                  className="w-full h-10 px-3 border border-slate-300 rounded-lg text-slate-900 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-dillaGreen/30 focus:border-dillaGreen"
                >
                  <option value="text">Text (Single-line)</option>
                  <option value="textarea">Long Text</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="select">Dropdown (Select)</option>
                  <option value="checkbox">Checkbox (Yes/No)</option>
                </select>
              </div>
            </div>

            {newField.fieldType === 'select' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Dropdown Options (Comma-separated) *
                </label>
                <Input
                  placeholder="Option A, Option B, Option C"
                  value={newField.optionsStr}
                  onChange={(e) => setNewField((p) => ({ ...p, optionsStr: e.target.value }))}
                  className="text-slate-900 text-xs"
                />
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={newField.isRequired}
                  onChange={(e) => setNewField((p) => ({ ...p, isRequired: e.target.checked }))}
                  className="rounded border-slate-300 text-dillaGreen focus:ring-dillaGold"
                />
                <span>Mandatory (Required Field for {userCampus} Students)</span>
              </label>

              <Button
                type="submit"
                variant="primary"
                className="text-xs px-5 py-2 font-bold shadow-sm"
              >
                Create Field & Notify Admin
              </Button>
            </div>
          </form>

          {/* Table of Fields */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-[#f1f5f3] text-dillaDarkGreen font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Label & Key</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Scope</th>
                  <th className="py-3 px-4">Validation</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {campusFields.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-6 text-center text-slate-400">
                      No custom fields available for {userCampus}.
                    </td>
                  </tr>
                ) : (
                  campusFields.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{f.label}</p>
                        <p className="font-mono text-[11px] text-slate-500">{f.fieldKey}</p>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">{f.fieldType}</td>
                      <td className="py-3 px-4">
                        {f.campus ? (
                          <span className="text-dillaGreen font-bold">{f.campus}</span>
                        ) : (
                          <span className="text-slate-500 font-medium">Global (Central)</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {f.isRequired ? (
                          <span className="text-rose-800 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[10px]">
                            Required
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[10px]">Optional</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            f.isActive
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                              : 'bg-slate-100 text-slate-600 border-slate-300'
                          }`}
                        >
                          {f.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {f.campus && f.campus.toLowerCase() === userCampus.toLowerCase() ? (
                          <button
                            onClick={() => handleDeleteCampusField(f)}
                            className="text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                          >
                            Delete
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[10px] italic">Central Field</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Authorized Student Password Reset Modal */}
      {resetTargetStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-dillaDarkGreen">Authorized Student Password Reset</h3>
              <button
                onClick={() => setResetTargetStudent(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-950 mb-4">
              <p className="font-bold">Dean Authority Scoping:</p>
              <p className="mt-0.5">
                As Campus Dean for <strong>{userCampus}</strong>, you are authorized to reset credentials for student{' '}
                <strong>{resetTargetStudent.studentName}</strong> ({resetTargetStudent.studentId}).
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Custom Password (Optional)
                </label>
                <Input
                  type="text"
                  placeholder="Leave empty for auto-generated password"
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  className="text-slate-900"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Default: <code>Student@Dilla2026!</code>
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <Button
                  variant="outline"
                  onClick={() => setResetTargetStudent(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleExecutePasswordReset}
                  disabled={resettingPassword}
                  variant="primary"
                >
                  {resettingPassword ? 'Resetting...' : 'Confirm Reset Password'}
                </Button>
              </div>
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

export default CampusDeanDashboard
