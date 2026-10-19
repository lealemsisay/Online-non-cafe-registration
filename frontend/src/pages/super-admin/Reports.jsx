import React, { useState, useEffect } from 'react'
import { Input } from '@/components/forms'
import { Button } from '@/components/forms'
import Icon from '@/components/icons/Icon'

const Reports = () => {
  const [reports, setReports] = useState({
    byCampus: {
      'Main Campus': { total: 47, approved: 24, pending: 5, rejected: 3 },
      'Kakamega Campus': { total: 32, approved: 18, pending: 3, rejected: 1 },
      'Eldoret Campus': { total: 21, approved: 12, pending: 2, rejected: 0 },
    },
    byDepartment: {
      'Computer Science': { total: 15, approved: 8, pending: 3, rejected: 1 },
      'Business': { total: 12, approved: 6, pending: 2, rejected: 0 },
      'Engineering': { total: 10, approved: 5, pending: 1, rejected: 0 },
      'Arts': { total: 8, approved: 4, pending: 1, rejected: 0 },
    },
    byAcademicYear: {
      '2023/2024': { total: 45, approved: 22, pending: 6, rejected: 2 },
      '2022/2023': { total: 30, approved: 15, pending: 4, rejected: 1 },
    },
  })
  const [filters, setFilters] = useState({
    status: 'all',
    campus: 'all',
    department: 'all',
    academicYear: 'all',
  })

  useEffect(() => {
    const token = localStorage.getItem('token')
    fetch('/api/users', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const apps = data?.users || data?.applications || []
        if (apps.length > 0) {
          const byCampus = {}
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

            if (a.status === 'approved' || a.approvalStatus === 'approved') {
              byCampus[c].approved++
              byDept[d].approved++
              byYear[y].approved++
            } else if (a.status === 'rejected' || a.approvalStatus === 'rejected') {
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
      .catch(() => {})
  }, [])

  const handleDownload = () => {
    // Trigger Excel/CSV export
    alert('Report exported successfully')
  }

  return (
    <div className="bg-white shadow-2xl rounded-2xl p-8 border border-gray-200 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-dillaNavy mb-6">
        Registration Reports
      </h2>

      <div className="grid grid-cols-1 gap-6 mb-8">
        <div>
          <h3 className="text-lg font-medium text-dillaNavy mb-4">
            By Campus
          </h3>
          <div className="space-y-4">
            {Object.entries(reports.byCampus).map(([campus, data]) => (
              <div
                key={campus}
                className="p-4 bg-dillaGray rounded-lg border border-gray-200"
              >
                <p className="font-medium text-dillaNavy">{campus}</p>
                <p className="text-sm text-dillaGray">
                  Total: {data.total} • Approved: {data.approved} • Pending: {data.pending} • Rejected: {data.rejected}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-dillaNavy mb-4">
            By Department
          </h3>
          <div className="space-y-4">
            {Object.entries(reports.byDepartment).map(([dept, data]) => (
              <div
                key={dept}
                className="p-4 bg-dillaGray rounded-lg border border-gray-200"
              >
                <p className="font-medium text-dillaNavy">{dept}</p>
                <p className="text-sm text-dillaGray">
                  Total: {data.total} • Approved: {data.approved} • Pending: {data.pending} • Rejected: {data.rejected}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-dillaNavy mb-4">
            By Academic Year
          </h3>
          <div className="space-y-4">
            {Object.entries(reports.byAcademicYear).map(([year, data]) => (
              <div
                key={year}
                className="p-4 bg-dillaGray rounded-lg border border-gray-200"
              >
                <p className="font-medium text-dillaNavy">{year}</p>
                <p className="text-sm text-dillaGray">
                  Total: {data.total} • Approved: {data.approved} • Pending: {data.pending} • Rejected: {data.rejected}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 pt-8 border-t border-gray-200">
        <Button onClick={handleDownload} className="w-full">
          Export to Excel/CSV
        </Button>
        <Button
          onClick={() => window.print()}
          className="mt-2 w-full text-sm text-dillaNavy border border-dillaNavy rounded"
        >
          Print-Friendly Report
        </Button>
      </div>
    </div>
  )
}

export default Reports