import React, { useState, useEffect } from 'react'
import { Input } from '@/components/forms'
import { Button } from '@/components/forms'
import { StatusBadge } from '@/components/status/StatusBadge'
import Icon from '@/components/icons/Icon'

const CampusDeanDashboard = () => {
  const [stats, setStats] = useState({
    totalStudents: 47,
    newApplications: 12,
    pendingReview: 5,
    reviewed: 30,
    returnedForCorrection: 3,
    approved: 24,
    rejected: 4,
  })
  const [applications, setApplications] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userCampus = localStorage.getItem('userCampus') || 'Main Campus'

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
          campus: u.campus || userCampus,
          status: u.applicationStatus || u.status || 'dean-review',
          academicYear: u.academicYear || '2023/2024',
          submittedAt: u.createdAt || u.submittedAt || new Date().toISOString(),
        }))

        if (apps.length > 0) {
          setApplications(apps)
          const pending = apps.filter((a) => a.status === 'dean-review' || a.status === 'submitted').length
          const approved = apps.filter((a) => a.status === 'approved').length
          setStats({
            totalStudents: apps.length,
            newApplications: apps.filter((a) => a.status === 'submitted').length,
            pendingReview: pending,
            reviewed: apps.filter((a) => a.status !== 'submitted').length,
            returnedForCorrection: apps.filter((a) => a.status === 'returned-for-correction').length,
            approved,
            rejected: apps.filter((a) => a.status === 'rejected').length,
          })
        } else {
          // Default placeholder fallback
          setApplications([
            {
              id: 'DUC2023-001',
              studentId: 'DUC2023-001',
              studentName: 'John Kamau',
              department: 'Computer Science',
              campus: userCampus,
              status: 'dean-review',
              academicYear: '2023/2024',
              submittedAt: '2024-01-15',
            },
            {
              id: 'DUC2023-045',
              studentId: 'DUC2023-045',
              studentName: 'Wangari Njuguna',
              department: 'Business',
              campus: userCampus,
              status: 'submitted',
              academicYear: '2023/2024',
              submittedAt: '2024-01-20',
            },
          ])
        }
      })
      .catch(() => {
        // Fallback
        setApplications([
          {
            id: 'DUC2023-001',
            studentId: 'DUC2023-001',
            studentName: 'John Kamau',
            department: 'Computer Science',
            campus: userCampus,
            status: 'dean-review',
            academicYear: '2023/2024',
            submittedAt: '2024-01-15',
          },
        ])
      })
  }, [])

  const handleReview = (applicationId) => {
    window.location.href = `/dean/review/${applicationId}`
  }

  const handleReturnForCorrection = (applicationId) => {
    window.location.href = `/dean/return/${applicationId}`
  }

  return (
    <div className="bg-dillaGray min-h-screen p-6 sm:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-dillaNavy">
          Campus Dean Dashboard
        </h1>
        <p className="text-dillaGray">Main Campus</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-3xl font-bold text-dillaNavy">{stats.totalStudents}</p>
          <p className="text-dillaGray small">Total Students Registered</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-3xl font-bold text-dillaTeal">{stats.newApplications}</p>
          <p className="text-dillaGray small">New Applications</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-3xl font-bold text-dillaNavy">{stats.pendingReview}</p>
          <p className="text-dillaGray small">Pending Review</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
          <p className="text-dillaGray small">Approved</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
        <h2 className="text-lg font-medium text-dillaNavy mb-4">Applications Awaiting Your Review</h2>
        
        <div className="grid grid-cols-1 gap-4">
          {applications
            .filter((app) => !selectedStatus || app.status === selectedStatus)
            .map((app) => (
              <div
                key={app.id}
                className="p-4 rounded-lg border border-gray-100 hover:border-dillaGold transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-dillaNavy">
                    {app.studentName} ({app.studentId})
                  </h3>
                  <StatusBadge status={app.status} />
                </div>
                <p className="text-sm text-dillaGray mb-1">
                  Department: {app.department} • Campus: {app.campus}
                </p>
                <p className="text-xs text-dillaGray">
                  Submitted: {new Date(app.submittedAt).toLocaleDateString()}
                </p>
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <Button
                    onClick={() => handleReview(app.id)}
                    className="w-full text-sm text-dillaNavy mb-2"
                  >
                    Review Application
                  </Button>
                  {app.status !== 'returned-for-correction' && (
                    <Button
                      onClick={() => handleReturnForCorrection(app.id)}
                      className="w-full text-sm text-red-600 mb-2"
                    >
                      Return for Correction
                    </Button>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-medium text-dillaNavy mb-4">Search Applications</h2>
        <Input
          placeholder="Search by Student ID, name, or department"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="mt-2 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dillaGold focus:border-dillaGold"
        >
          <option value="">Filter by Status</option>
          <option value="submitted">Submitted</option>
          <option value="dean-review">Campus Dean Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
    </div>
  )
}

export default CampusDeanDashboard