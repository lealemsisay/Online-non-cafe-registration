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
  })
  const [applications, setApplications] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [loading, setLoading] = useState(true)

  const loadData = () => {
    setLoading(true)
    const token = localStorage.getItem('token')

    fetch('/api/users', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const rawUsers = (data?.users || data?.applications || []).filter(
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

        setApplications(apps)
        setStats({
          totalRegistered: apps.length,
          totalSubmitted: apps.filter((a) => a.status !== 'draft').length,
          pendingDeanReview: apps.filter((a) => a.status === 'submitted' || a.status === 'dean-review').length,
          pendingSuperAdmin: apps.filter((a) => a.status === 'super-admin-review').length,
          approved: apps.filter((a) => a.status === 'approved').length,
          rejected: apps.filter((a) => a.status === 'rejected').length,
        })
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
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-dillaGold"></span>
              <span className="text-xs uppercase tracking-wider font-bold text-dillaNavy">
                Executive Portal
              </span>
            </div>
            <h1 className="text-2xl font-bold text-dillaNavy mt-1">
              Super Admin Overview
            </h1>
            <p className="text-sm text-slate-600 mt-0.5">
              University-wide cost-sharing registration metrics, campus oversight, and approvals
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={loadData}
              variant="outline"
              className="border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center gap-2 text-xs"
            >
              <Icon name="refresh" className="w-4 h-4 text-dillaNavy" />
              Refresh Metrics
            </Button>
            <Button
              onClick={() => (window.location.href = '/admin/applications')}
              className="bg-dillaNavy hover:bg-slate-800 text-white text-xs px-4 py-2 font-medium shadow-sm"
            >
              Manage Applications
            </Button>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Enrolled</p>
            <div className="p-2 bg-blue-50 text-dillaNavy rounded-lg">
              <Icon name="users" className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-dillaNavy mt-3">{stats.totalRegistered}</p>
          <p className="text-xs text-slate-500 mt-1">Across all Dilla campuses</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending Dean Review</p>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Icon name="clock" className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-amber-600 mt-3">{stats.pendingDeanReview}</p>
          <p className="text-xs text-slate-500 mt-1">Awaiting campus dean action</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Awaiting Admin Approval</p>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Icon name="check-circle" className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-purple-600 mt-3">{stats.pendingSuperAdmin}</p>
          <p className="text-xs text-slate-500 mt-1">Dean verified; queued for you</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Final Approved</p>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Icon name="check" className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-emerald-600 mt-3">{stats.approved}</p>
          <p className="text-xs text-slate-500 mt-1">Active non-cafeteria beneficiaries</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Search All University Applications
            </label>
            <Input
              placeholder="Search by student ID, student name, department, or campus..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-slate-800"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Filter Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full h-10 px-3 border border-slate-300 rounded-lg text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-dillaNavy text-sm"
            >
              <option value="">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="dean-review">Dean Review</option>
              <option value="super-admin-review">Super Admin Review</option>
              <option value="return-for-correction">Returned for Correction</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Applications Overview List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-dillaNavy">
              Recent Application Submissions ({filteredApplications.length})
            </h2>
            <p className="text-xs text-slate-500">Live feed of non-cafeteria cost-sharing applications</p>
          </div>
          <Button
            onClick={() => (window.location.href = '/admin/applications')}
            variant="outline"
            className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium"
          >
            Open Full Application Workspace →
          </Button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-dillaNavy border-t-transparent mb-3"></div>
            <p className="text-sm font-medium">Loading university applications...</p>
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-sm font-semibold text-slate-700">No applications match your filter.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredApplications.slice(0, 10).map((app) => (
              <div
                key={app.id}
                className="p-5 hover:bg-slate-50/70 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-dillaNavy text-base">{app.studentName}</h3>
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
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
                    className="bg-dillaNavy hover:bg-slate-800 text-white text-xs px-3 py-1.5 h-8 font-medium shadow-sm"
                  >
                    View in Workspace
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