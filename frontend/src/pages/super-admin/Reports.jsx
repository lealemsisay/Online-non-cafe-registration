import React, { useState, useEffect } from 'react'
import { Button } from '@/components/forms'
import Icon from '@/components/icons/Icon'

const Reports = () => {
  const [reports, setReports] = useState({
    byCampus: {
      'Main Campus': { total: 0, approved: 0, pending: 0, rejected: 0 },
      'Odaya Campus': { total: 0, approved: 0, pending: 0, rejected: 0 },
      'Haru Campus': { total: 0, approved: 0, pending: 0, rejected: 0 },
    },
    byDepartment: {
      'Computer Science': { total: 0, approved: 0, pending: 0, rejected: 0 },
      'Information Technology': { total: 0, approved: 0, pending: 0, rejected: 0 },
      'Business Administration': { total: 0, approved: 0, pending: 0, rejected: 0 },
      'Civil Engineering': { total: 0, approved: 0, pending: 0, rejected: 0 },
    },
    byAcademicYear: {
      '2023/2024': { total: 0, approved: 0, pending: 0, rejected: 0 },
      '2024/2025': { total: 0, approved: 0, pending: 0, rejected: 0 },
    },
  })
  const [rawApplications, setRawApplications] = useState([])
  const [selectedCampusFilter, setSelectedCampusFilter] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    fetch('/api/users', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const apps = (data?.users || data?.applications || []).filter(
          (u) => !u.role || u.role === 'student'
        )
        setRawApplications(apps)

        if (apps.length > 0) {
          const byCampus = {
            'Main Campus': { total: 0, approved: 0, pending: 0, rejected: 0 },
            'Odaya Campus': { total: 0, approved: 0, pending: 0, rejected: 0 },
            'Haru Campus': { total: 0, approved: 0, pending: 0, rejected: 0 },
          }
          const byDept = {}
          const byYear = {}

          apps.forEach((a) => {
            const c = a.campus || 'Main Campus'
            const d = a.department || 'General'
            const y = a.academicYear || '2023/2024'

            if (!byCampus[c]) byCampus[c] = { total: 0, approved: 0, pending: 0, rejected: 0 }
            if (!byDept[d]) byDept[d] = { total: 0, approved: 0, pending: 0, rejected: 0 }
            if (!byYear[y]) byYear[y] = { total: 0, approved: 0, pending: 0, rejected: 0 }

            byCampus[c].total++
            byDept[d].total++
            byYear[y].total++

            const st = (a.applicationStatus || a.status || '').toLowerCase()
            if (st === 'approved') {
              byCampus[c].approved++
              byDept[d].approved++
              byYear[y].approved++
            } else if (st === 'rejected') {
              byCampus[c].rejected++
              byDept[d].rejected++
              byYear[y].rejected++
            } else {
              byCampus[c].pending++
              byDept[d].pending++
              byYear[y].pending++
            }
          })

          setReports({
            byCampus,
            byDepartment: byDept,
            byAcademicYear: byYear,
          })
        }
      })
      .catch((err) => {
        console.error('Error fetching reports:', err)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const handleDownloadCSV = () => {
    // Generate real CSV from applications
    const headers = [
      'Student ID',
      'Full Name',
      'Campus',
      'Department',
      'Academic Year',
      'Status',
      'Cafeteria Status',
      'Submitted Date',
    ]

    const rows = rawApplications.map((app) => [
      `"${app.studentId || app.username || ''}"`,
      `"${app.fullName || app.name || ''}"`,
      `"${app.campus || ''}"`,
      `"${app.department || ''}"`,
      `"${app.academicYear || '2023/2024'}"`,
      `"${app.applicationStatus || app.status || 'submitted'}"`,
      '"Non-Cafeteria"',
      `"${app.createdAt ? new Date(app.createdAt).toISOString().split('T')[0] : ''}"`,
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `dilla_university_cost_sharing_report_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const campusEntries = Object.entries(reports.byCampus).filter(
    ([campus]) => !selectedCampusFilter || campus === selectedCampusFilter
  )

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-dillaGold"></span>
              <span className="text-xs uppercase tracking-wider font-bold text-dillaNavy">
                Analytics & Reporting
              </span>
            </div>
            <h1 className="text-2xl font-bold text-dillaNavy mt-1">
              Cost-Sharing Beneficiary Reports
            </h1>
            <p className="text-sm text-slate-600 mt-0.5">
              Comprehensive statistical summaries across Dilla University campuses and departments
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleDownloadCSV}
              className="bg-dillaNavy hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 flex items-center gap-2 shadow-sm"
            >
              <Icon name="download" className="w-4 h-4 text-dillaGold" />
              Export to CSV
            </Button>
            <Button
              onClick={() => window.print()}
              variant="outline"
              className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold px-4 py-2 flex items-center gap-2"
            >
              <Icon name="printer" className="w-4 h-4 text-slate-600" />
              Print Report
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Filter by Campus:
            </label>
            <select
              value={selectedCampusFilter}
              onChange={(e) => setSelectedCampusFilter(e.target.value)}
              className="h-9 px-3 border border-slate-300 rounded-lg text-slate-800 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-dillaNavy"
            >
              <option value="">All Campuses</option>
              {Object.keys(reports.byCampus).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <span className="text-xs text-slate-500">
            Total records processed: <strong>{rawApplications.length}</strong>
          </span>
        </div>
      </div>

      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* By Campus */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h2 className="text-base font-bold text-dillaNavy flex items-center gap-2">
              <Icon name="building" className="w-5 h-5 text-dillaNavy" />
              Campus Distribution
            </h2>
            <span className="text-xs text-slate-400 font-semibold uppercase">Campuses</span>
          </div>

          <div className="space-y-3">
            {campusEntries.map(([campus, data]) => (
              <div key={campus} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center mb-1">
                  <p className="font-bold text-sm text-dillaNavy">{campus}</p>
                  <span className="text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                    Total: {data.total}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-200 text-xs">
                  <div>
                    <span className="text-emerald-700 font-semibold">Approved:</span>{' '}
                    <strong>{data.approved}</strong>
                  </div>
                  <div>
                    <span className="text-amber-700 font-semibold">Pending:</span>{' '}
                    <strong>{data.pending}</strong>
                  </div>
                  <div>
                    <span className="text-red-700 font-semibold">Rejected:</span>{' '}
                    <strong>{data.rejected}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Department */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h2 className="text-base font-bold text-dillaNavy flex items-center gap-2">
              <Icon name="book-open" className="w-5 h-5 text-dillaNavy" />
              Department Breakdown
            </h2>
            <span className="text-xs text-slate-400 font-semibold uppercase">Programs</span>
          </div>

          <div className="space-y-3">
            {Object.entries(reports.byDepartment).map(([dept, data]) => (
              <div key={dept} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center mb-1">
                  <p className="font-bold text-sm text-dillaNavy">{dept}</p>
                  <span className="text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                    Total: {data.total}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-200 text-xs">
                  <div>
                    <span className="text-emerald-700 font-semibold">Approved:</span>{' '}
                    <strong>{data.approved}</strong>
                  </div>
                  <div>
                    <span className="text-amber-700 font-semibold">Pending:</span>{' '}
                    <strong>{data.pending}</strong>
                  </div>
                  <div>
                    <span className="text-red-700 font-semibold">Rejected:</span>{' '}
                    <strong>{data.rejected}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Academic Year */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h2 className="text-base font-bold text-dillaNavy flex items-center gap-2">
              <Icon name="calendar" className="w-5 h-5 text-dillaNavy" />
              Academic Year Breakdown
            </h2>
            <span className="text-xs text-slate-400 font-semibold uppercase">Years</span>
          </div>

          <div className="space-y-3">
            {Object.entries(reports.byAcademicYear).map(([year, data]) => (
              <div key={year} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center mb-1">
                  <p className="font-bold text-sm text-dillaNavy">{year}</p>
                  <span className="text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                    Total: {data.total}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-200 text-xs">
                  <div>
                    <span className="text-emerald-700 font-semibold">Approved:</span>{' '}
                    <strong>{data.approved}</strong>
                  </div>
                  <div>
                    <span className="text-amber-700 font-semibold">Pending:</span>{' '}
                    <strong>{data.pending}</strong>
                  </div>
                  <div>
                    <span className="text-red-700 font-semibold">Rejected:</span>{' '}
                    <strong>{data.rejected}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Reports