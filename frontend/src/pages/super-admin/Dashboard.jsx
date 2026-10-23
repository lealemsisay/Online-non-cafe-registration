import React, { useState, useEffect } from 'react'
import { Input, Button } from '@/components/forms'
import { StatusBadge } from '@/components/status/StatusBadge'
import Icon from '@/components/icons/Icon'

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState({
    totalRegistered: 0,
    totalSubmitted: 0,
    pendingDeanReview: 0,
    pendingSuperAdmin: 0,
    approved: 0,
    rejected: 0,
    totalBatches: 0,
  })
  const [scheduleInfo, setScheduleInfo] = useState({ isOpen: true, reason: '', startDate: null, endDate: null })
  const [applications, setApplications] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [loading, setLoading] = useState(true)

  const loadData = () => {
    setLoading(true)
    const token = localStorage.getItem('token')
    const headers = token ? { Authorization: `Bearer ${token}` } : {}

    Promise.all([
      fetch('/api/users', { headers }).then((r) => (r.ok ? r.json() : null)),
      fetch('/api/submissions', { headers }).then((r) => (r.ok ? r.json() : null)),
      fetch('/api/settings', { headers }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([userData, subData, settingsData]) => {
        const rawUsers = (userData?.users || userData?.applications || []).filter(
          (u) => !u.role || u.role === 'student'
        )

        const apps = rawUsers.map((u) => ({
          id: u.studentId || u.id,
          studentId: u.studentId || u.username || u.id,
          studentName: u.fullName || u.name || 'Student',
          department: u.department || 'General',
          campus: u.campus || 'Main Campus',
          status: u.applicationStatus || u.status || 'submitted',
          academicYear: u.academicYear || '2023/2024',
          finding: u.deanFinding || u.deanReview || 'registered',
          deanComments: u.deanComments || '',
          submittedAt: u.createdAt || u.submittedAt || new Date().toISOString(),
        }))

        const batches = subData?.submissions || []

        setApplications(apps)
        setStats({
          totalRegistered: apps.length,
          totalSubmitted: apps.filter((a) => a.status !== 'draft').length,
          pendingDeanReview: apps.filter((a) => a.status === 'submitted' || a.status === 'dean-review').length,
          pendingSuperAdmin: apps.filter((a) => a.status === 'super-admin-review').length,
          approved: apps.filter((a) => a.status === 'approved').length,
          rejected: apps.filter((a) => a.status === 'rejected').length,
          totalBatches: batches.length,
        })

        if (settingsData?.registrationWindow) {
          setScheduleInfo(settingsData.registrationWindow)
        }
      })
      .catch((err) => {
        console.error('Error fetching admin dashboard data:', err)
      })
      .finally(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredApplications = applications.filter((app) => {
    const term = searchTerm.toLowerCase().trim()
    const matchesSearch =
      !term ||
      (app.studentName && app.studentName.toLowerCase().includes(term)) ||
      (app.studentId && app.studentId.toLowerCase().includes(term)) ||
      (app.department && app.department.toLowerCase().includes(term)) ||
      (app.campus && app.campus.toLowerCase().includes(term))

    const matchesStatus = !selectedStatus || app.status === selectedStatus

    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Executive Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-dillaDarkGreen via-[#12442c] to-dillaGreen p-6 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-white p-1.5 shadow-md flex items-center justify-center flex-shrink-0">
                <img
                  src="/dilla-logo.png"
                  alt="Dilla University Official Seal"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider font-bold text-dillaGold">
                    Central Administration
                  </span>
                  <span className="text-white/40">•</span>
                  <span className="text-xs text-emerald-200 font-medium">
                    Super Admin Console
                  </span>
                </div>
                <h1 className="font-serif text-2xl font-bold tracking-tight text-white mt-0.5">
                  Cost-Sharing Executive Overview
                </h1>
                <p className="text-xs text-white/80 mt-0.5">
                  University-wide registration metrics, campus dean oversight, and final non-cafeteria authorizations
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-start sm:self-center">
              <Button
                onClick={loadData}
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-bold"
              >
                <Icon name="refresh" className="w-4 h-4 text-dillaGold" />
                Refresh Metrics
              </Button>
              <Button
                onClick={() => (window.location.href = '/admin/applications')}
                variant="gold"
                className="text-xs font-bold shadow-md"
              >
                Manage Applications →
              </Button>
            </div>
          </div>
        </div>

        {/* Status Strip */}
        <div className="bg-[#f1f5f3] px-6 py-2.5 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-700">
          <div className="flex items-center gap-4">
            <span><strong>Institution:</strong> Dilla University</span>
            <span>•</span>
            <span><strong>Campuses:</strong> 3 Campuses</span>
            <span>•</span>
            <span><strong>Active Batches:</strong> {stats.totalBatches} Submitted</span>
          </div>
          <div className="flex items-center gap-2">
            {scheduleInfo.isOpen ? (
              <span className="text-dillaGreen font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Registration Window Open
              </span>
            ) : (
              <span className="text-rose-700 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                Registration Window Closed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Enrolled</p>
            <div className="p-2 bg-emerald-50 text-dillaGreen rounded-lg">
              <Icon name="users" className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-dillaDarkGreen mt-1.5">{stats.totalRegistered}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">All campuses</p>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Roster Batches</p>
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
              <Icon name="file-text" className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-blue-700 mt-1.5">{stats.totalBatches}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Campus submissions</p>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Awaiting Dean</p>
            <div className="p-2 bg-amber-50 text-amber-700 rounded-lg">
              <Icon name="clock" className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-700 mt-1.5">{stats.pendingDeanReview}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Pending dean review</p>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Awaiting Admin</p>
            <div className="p-2 bg-purple-50 text-purple-700 rounded-lg">
              <Icon name="shield" className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-purple-700 mt-1.5">{stats.pendingSuperAdmin}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Dean endorsed; in queue</p>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Approved</p>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <Icon name="check" className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-1.5">{stats.approved}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Active beneficiaries</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Search University Applications
            </label>
            <Input
              placeholder="Search by student ID, student name, department, or campus..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 text-slate-900"
            />
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
              <option value="">All Application Statuses</option>
              <option value="submitted">Submitted (New)</option>
              <option value="dean-review">Campus Dean Review</option>
              <option value="super-admin-review">Super Admin Review</option>
              <option value="return-for-correction">Returned for Correction</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Applications Overview List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-dillaDarkGreen">
              Recent Application Records ({filteredApplications.length})
            </h2>
            <p className="text-xs text-slate-500">Live feed of non-cafeteria cost-sharing submissions across all campuses</p>
          </div>
          <Button
            onClick={() => (window.location.href = '/admin/applications')}
            variant="outline"
            className="text-xs font-semibold"
          >
            Open Full Applications Workspace →
          </Button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-dillaGreen border-t-transparent mb-3"></div>
            <p className="text-sm font-semibold text-slate-700">Loading university applications...</p>
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-sm font-bold text-slate-800">No applications match your filter.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredApplications.slice(0, 10).map((app) => (
              <div
                key={app.id}
                className="p-5 hover:bg-[#f8faf9] transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
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
                      <strong>Campus:</strong> {app.campus}
                    </span>
                    <span>
                      <strong>Department:</strong> {app.department}
                    </span>
                    <span>
                      <strong>Academic Year:</strong> {app.academicYear}
                    </span>
                    <span>
                      <strong>Submitted:</strong> {new Date(app.submittedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() =>
                      (window.location.href = `/admin/applications?id=${app.id || app.studentId}`)
                    }
                    variant="primary"
                    className="text-xs px-3.5 py-1.5 h-8 font-semibold shadow-xs"
                  >
                    View in Workspace →
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default SuperAdminDashboard
