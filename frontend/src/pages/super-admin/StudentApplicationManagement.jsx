import React, { useState, useEffect } from 'react'
import { Input } from '@/components/forms'
import { Button } from '@/components/forms'
import { StatusBadge } from '@/components/status/StatusBadge'
import Icon from '@/components/icons/Icon'

const StudentApplicationManagement = () => {
  const [applications, setApplications] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')

  const [actionMessage, setActionMessage] = useState(null)

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
          department: u.department || 'General',
          campus: u.campus || 'Main Campus',
          academicYear: u.academicYear || '2023/2024',
          status: u.applicationStatus || u.status || 'super-admin-review',
          finding: u.deanFinding || 'registered',
          deanComments: u.deanComments || 'Verified by Dean',
          submittedAt: u.createdAt || u.submittedAt || new Date().toISOString(),
          pdfUrl: `/api/documents/${u.studentId || u.id}`,
        }))

        if (apps.length > 0) {
          setApplications(apps)
        } else {
          setApplications([
            {
              id: 'DUC2023-001',
              studentId: 'DUC2023-001',
              studentName: 'John Kamau',
              department: 'Computer Science',
              campus: 'Main Campus',
              academicYear: '2023/2024',
              status: 'approved',
              finding: 'registered',
              deanComments: 'Verified as registered cost-sharing beneficiary',
              submittedAt: '2024-01-15',
              pdfUrl: '/api/documents/1',
            },
            {
              id: 'DUC2023-045',
              studentId: 'DUC2023-045',
              studentName: 'Wangari Njuguna',
              department: 'Business',
              campus: 'Main Campus',
              academicYear: '2023/2024',
              status: 'dean-review',
              finding: 'not_registered',
              deanComments: 'PDF verified - student not in cost-sharing registry',
              submittedAt: '2024-01-20',
              pdfUrl: '/api/documents/2',
            },
            {
              id: 'DUC2023-078',
              studentId: 'DUC2023-078',
              studentName: 'Peter Otieno',
              department: 'Engineering',
              campus: 'Kakamega Campus',
              academicYear: '2023/2024',
              status: 'dean-review',
              finding: 'registered',
              deanComments: 'Under Campus Dean review',
              submittedAt: '2024-01-22',
              pdfUrl: '/api/documents/3',
            },
          ])
        }
      })
      .catch(() => {})
  }

  useEffect(() => {
    loadApplications()
    // Check if query params have action
    const params = new URLSearchParams(window.location.search)
    const action = params.get('action')
    const id = params.get('id')
    if (action === 'approve' && id) {
      approveApplication(id)
    } else if (action === 'reject' && id) {
      rejectApplication(id)
    }
  }, [])

  const viewApplication = (id) => {
    alert(`Viewing Application: ${id}\nDetails and verification slip available.`)
  }

  const approveApplication = async (id) => {
    const token = localStorage.getItem('token')
    try {
      const res = await fetch('/api/approval/final', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          applicationId: id,
          decision: 'approved',
          comments: 'Approved by Super Admin',
        }),
      })
      if (res.ok) {
        setActionMessage(`Application ${id} approved successfully!`)
        setApplications((prev) =>
          prev.map((a) => (a.id === id || a.studentId === id ? { ...a, status: 'approved' } : a))
        )
      } else {
        const err = await res.json()
        setActionMessage(`Error: ${err.message || 'Failed to approve application'}`)
      }
    } catch (e) {
      setActionMessage(`Network error approving application ${id}`)
    }
  }

  const rejectApplication = async (id) => {
    const token = localStorage.getItem('token')
    try {
      const res = await fetch('/api/approval/final', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          applicationId: id,
          decision: 'rejected',
          comments: 'Rejected by Super Admin',
        }),
      })
      if (res.ok) {
        setActionMessage(`Application ${id} rejected.`)
        setApplications((prev) =>
          prev.map((a) => (a.id === id || a.studentId === id ? { ...a, status: 'rejected' } : a))
        )
      } else {
        const err = await res.json()
        setActionMessage(`Error: ${err.message || 'Failed to reject application'}`)
      }
    } catch (e) {
      setActionMessage(`Network error rejecting application ${id}`)
    }
  }

  const returnForCorrection = (id) => {
    setActionMessage(`Application ${id} flagged for student correction.`)
    setApplications((prev) =>
      prev.map((a) => (a.id === id || a.studentId === id ? { ...a, status: 'return-for-correction' } : a))
    )
  }

  return (
    <div className="bg-white shadow-2xl rounded-2xl p-8 border border-gray-200 max-w-7xl mx-auto">
      {actionMessage && (
        <div className="mb-4 bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded">
          {actionMessage}
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-dillaNavy">
          Student & Application Management
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Applications</option>
            <option value="by-campus">By Campus</option>
            <option value="by-department">By Department</option>
            <option value="by-status">By Status</option>
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="dean-review">Campus Dean Review</option>
            <option value="super-admin-review">Super Admin Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="return-for-correction">Correction Required</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-lg overflow-hidden">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="p-3 text-left text-dillaNavy">Student ID</th>
              <th className="p-3 text-left text-dillaNavy">Student Name</th>
              <th className="p-3 text-left text-dillaNavy">Department</th>
              <th className="p-3 text-left text-dillaNavy">Campus</th>
              <th className="p-3 text-left text-dillaNavy">Academic Year</th>
              <th className="p-3 text-left text-dillaNavy">Status</th>
              <th className="p-3 text-right text-dillaNavy">Actions</th>
            </tr>
          </thead>
          <tbody>
            {applications
              .filter(
                (app) =>
                  (!setSearchTerm || app.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || app.studentId.toLowerCase().includes(searchTerm.toLowerCase())) &&
                  (selectedFilter === 'all' || selectedStatus === 'all' || app.status === selectedStatus || app.finding === selectedStatus)
              )
              .map((app) => (
                <tr key={app.id} className="border-b border-gray-100 hover:bg-dillaGray/10">
                  <td className="p-3 font-medium text-dillaNavy">{app.studentId}</td>
                  <td className="p-3 text-dillaGray">{app.studentName}</td>
                  <td className="p-3 text-dillaGray">{app.department}</td>
                  <td className="p-3 text-dillaGray">{app.campus}</td>
                  <td className="p-3 text-dillaGray">{app.academicYear}</td>
                  <td className="p-3">
                    <StatusBadge status={app.status} />
                  </td>
                  <td className="p-3 text-right">
                    <Button
                      onClick={() => viewApplication(app.id)}
                      className="text-dillaNavy text-sm hover:text-dillaGold mr-1"
                    >
                      View
                    </Button>
                    {app.status === 'dean-review' && (
                      <Button
                        onClick={() => approveApplication(app.id)}
                        className="text-green-600 text-sm hover:text-green-800 mr-1"
                      >
                        Approve
                      </Button>
                    )}
                    {app.status === 'dean-review' && (
                      <Button
                        onClick={() => rejectApplication(app.id)}
                        className="text-red-600 text-sm hover:text-red-800 mr-1"
                      >
                        Reject
                      </Button>
                    )}
                    {app.status !== 'approved' && app.status !== 'rejected' && (
                      <Button
                        onClick={() => returnForCorrection(app.id)}
                        className="text-dillaGold text-sm hover:text-gold-800"
                      >
                        Return
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default StudentApplicationManagement