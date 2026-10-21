import React, { useState, useEffect } from 'react'
import { Input } from '@/components/forms'
import { Button } from '@/components/forms'
import { StatusBadge } from '@/components/status/StatusBadge'
import Icon from '@/components/icons/Icon'
import { Table } from '@/components/tables'

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState({
    totalRegistered: 0,
    totalSubmitted: 0,
    pendingDeanReview: 0,
    pendingSuperAdmin: 0,
    approved: 0,
    rejected: 0,
    byCampus: {
      'Main Campus': { total: 47, approved: 24, pending: 5 },
      'Kakamega Campus': { total: 32, approved: 18, pending: 3 },
      'Eldoret Campus': { total: 21, approved: 12, pending: 2 },
    },
  })
  const [applications, setApplications] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')

    fetch('/api/users', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const apps = (data?.users || data?.applications || []).map((u) => ({
          id: u.studentId || u.id,
          studentId: u.studentId,
          studentName: u.fullName || u.studentName || 'Student',
          department: u.department || 'General',
          campus: u.campus || 'Main Campus',
          status: u.applicationStatus || u.status || 'super-admin-review',
          academicYear: u.academicYear || '2023/2024',
          finding: u.deanFinding || 'registered',
          deanComments: u.deanComments || 'Campus Dean verified',
          submittedAt: u.createdAt || u.submittedAt || new Date().toISOString(),
        }))

        if (apps.length > 0) {
          setApplications(apps)
          setStats((prev) => ({
            ...prev,
            totalRegistered: apps.length,
            totalSubmitted: apps.filter((a) => a.status !== 'draft').length,
            pendingDeanReview: apps.filter((a) => a.status === 'submitted' || a.status === 'dean-review').length,
            pendingSuperAdmin: apps.filter((a) => a.status === 'super-admin-review').length,
            approved: apps.filter((a) => a.status === 'approved').length,
            rejected: apps.filter((a) => a.status === 'rejected').length,
          }))
        } else {
          // Default placeholder
          setApplications([
            {
              id: 'DUC2023-001',
              studentId: 'DUC2023-001',
              studentName: 'John Kamau',
              department: 'Computer Science',
              campus: 'Main Campus',
              status: 'super-admin-review',
              academicYear: '2023/2024',
              finding: 'registered',
              deanComments: 'Student verified as registered cost-sharing beneficiary',
              submittedAt: '2024-01-15',
            },
            {
              id: 'DUC2023-045',
              studentId: 'DUC2023-045',
              studentName: 'Wangari Njuguna',
              department: 'Business',
              campus: 'Main Campus',
              status: 'dean-review',
              academicYear: '2023/2024',
              finding: 'not_registered',
              deanComments: 'PDF verified - student not in cost-sharing registry',
              submittedAt: '2024-01-20',
            },
          ])
        }
      })
      .catch(() => {})
  }, [])

  const handleApprove = (applicationId) => {
    window.location.href = `/admin/applications?action=approve&id=${applicationId}`
  }

  const handleReject = (applicationId) => {
    window.location.href = `/admin/applications?action=reject&id=${applicationId}`
  }

  const handleReturnForCorrection = (applicationId) => {
    window.location.href = `/admin/applications?action=return&id=${applicationId}`
  }

  return (
    <div className="bg-dillaGray min-h-screen p-6 sm:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-dillaNavy">
          Super Admin Dashboard
        </h1>
        <p className="text-sm font-medium text-dillaDarkGray">University-wide Administration</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-dillaNavy/5 p-4 rounded-lg shadow-sm border-2 border-dillaNavy/30 transition-all duration-200 hover:-translate-y-1 hover:border-dillaNavy hover:shadow-md">
          <p className="text-3xl font-bold text-dillaNavy">{stats.totalRegistered}</p>
          <p className="text-sm font-medium text-dillaDarkGray">Total Registered</p>
        </div>
        <div className="bg-dillaTeal/5 p-4 rounded-lg shadow-sm border-2 border-dillaTeal/30 transition-all duration-200 hover:-translate-y-1 hover:border-dillaTeal hover:shadow-md">
          <p className="text-3xl font-bold text-dillaTeal">{stats.totalSubmitted}</p>
          <p className="text-sm font-medium text-dillaDarkGray">Total Submitted</p>
        </div>
        <div className="bg-dillaNavy/5 p-4 rounded-lg shadow-sm border-2 border-dillaNavy/30 transition-all duration-200 hover:-translate-y-1 hover:border-dillaNavy hover:shadow-md">
          <p className="text-3xl font-bold text-dillaNavy">{stats.pendingDeanReview}</p>
          <p className="text-sm font-medium text-dillaDarkGray">Pending Campus Dean Review</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg shadow-sm border-2 border-purple-600/30 transition-all duration-200 hover:-translate-y-1 hover:border-purple-600 hover:shadow-md">
          <p className="text-3xl font-bold text-purple-600">{stats.pendingSuperAdmin}</p>
          <p className="text-sm font-medium text-dillaDarkGray">Pending Super Admin Approval</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border-2 border-dillaNavy/10">
          <h3 className="text-lg font-medium text-dillaNavy mb-4">Recent Applications</h3>
          <div className="grid grid-cols-1 gap-4">
            {applications
              .filter((app) => !selectedStatus || app.status === selectedStatus)
              .map((app) => (
                <div
                  key={app.id}
                  className="p-4 rounded-lg border border-dillaTeal/20 bg-dillaTeal/5 transition-all duration-200 hover:-translate-y-0.5 hover:border-dillaTeal hover:shadow-md"
                >
                  <h3 className="font-medium text-dillaNavy">
                    {app.studentName} ({app.studentId})
                  </h3>
                  <p className="text-sm text-dillaDarkGray mb-2">
                    {app.department} • {app.campus}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={app.status} />
                    <p className="text-xs font-medium text-dillaDarkGray">
                    {new Date(app.submittedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border-2 border-dillaTeal/10">
          <h3 className="text-lg font-medium text-dillaNavy mb-4">Filter</h3>
          <Input
            placeholder="Search by Student ID, name, department, or campus"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="mt-2 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dillaGold focus:border-dillaGold"
          >
            <option value="">All Statuses</option>
            <option value="pending-dean">Pending Dean Review</option>
            <option value="dean-review">Dean Review</option>
            <option value="pending-super">Pending Super Admin</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>
    </div>
  )
}

export default SuperAdminDashboard