import React, { useState, useEffect } from 'react'
import { Button, Input } from '@/components/forms'
import { StatusBadge } from '@/components/status/StatusBadge'
import Icon from '@/components/icons/Icon'

const Reports = () => {
  const [activeTab, setActiveTab] = useState('roster') // 'roster', 'summary', 'history'
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  // Data State
  const [students, setStudents] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 15, totalCount: 0, totalPages: 1 })
  const [metrics, setMetrics] = useState({ total: 0, approved: 0, pending: 0, rejected: 0, byCampus: {}, byDepartment: {}, byAcademicYear: {} })
  const [campuses, setCampuses] = useState([])
  const [departments, setDepartments] = useState([])
  const [academicYears, setAcademicYears] = useState([])
  const [reportHistory, setReportHistory] = useState([])

  // Filters State
  const [search, setSearch] = useState('')
  const [selectedCampus, setSelectedCampus] = useState('')
  const [selectedDept, setSelectedDept] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')

  const fetchReports = async (page = 1) => {
    setLoading(true)
    setError(null)
    const token = localStorage.getItem('token')

    try {
      const q = new URLSearchParams({
        page: String(page),
        limit: String(pagination.limit),
        search: search.trim(),
        campus: selectedCampus,
        department: selectedDept,
        academicYear: selectedYear,
        status: selectedStatus,
      })

      const res = await fetch(`/api/reports?${q.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      if (res.ok) {
        const data = await res.json()
        setStudents(data.students || [])
        setPagination(data.pagination || { page: 1, limit: 15, totalCount: 0, totalPages: 1 })
        if (data.metrics) setMetrics(data.metrics)
        if (data.campuses) setCampuses(data.campuses)
        if (data.departments) setDepartments(data.departments)
        if (data.academicYears) setAcademicYears(data.academicYears)
        if (data.reportHistory) setReportHistory(data.reportHistory)
      } else {
        const errData = await res.json()
        setError(errData.message || 'Failed to fetch report records')
      }
    } catch (e) {
      console.error('Error fetching reports:', e)
      setError('Network error loading reports. Please verify your connection.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports(1)
  }, [selectedCampus, selectedDept, selectedYear, selectedStatus])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    fetchReports(1)
  }

  const handleExport = async (format) => {
    setExporting(true)
    setError(null)
    setMessage(null)
    const token = localStorage.getItem('token')

    try {
      const payload = {
        format,
        campus: selectedCampus || 'all',
        department: selectedDept || 'all',
        academicYear: selectedYear || 'all',
        status: selectedStatus || 'all',
        search: search.trim(),
        reportType: 'cost_sharing_beneficiaries',
      }

      const res = await fetch('/api/reports/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errData = await res.json()
        setError(errData.message || 'Failed to export report')
        setExporting(false)
        return
      }

      // Read blob and trigger browser download
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const ext = format === 'xlsx' ? 'xlsx' : 'csv'
      const dateTag = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      link.setAttribute('download', `Dilla_University_Cost_Sharing_Report_${dateTag}.${ext}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      setMessage(`Report exported successfully as .${ext}! Recorded in audit history.`)
      fetchReports(pagination.page)
    } catch (e) {
      console.error('Export error:', e)
      setError('Network error exporting report.')
    } finally {
      setExporting(false)
    }
  }

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
                    Office of the Registrar
                  </span>
                  <span className="text-white/40">•</span>
                  <span className="text-xs text-emerald-200 font-medium">
                    Institutional Reports & Analytics
                  </span>
                </div>
                <h1 className="font-serif text-2xl font-bold tracking-tight text-white mt-0.5">
                  Cost-Sharing Beneficiary Reports
                </h1>
                <p className="text-xs text-white/80 mt-0.5">
                  Official statistical distributions, paginated beneficiary rosters, and multi-format exports for Dilla University
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
              <Button
                onClick={() => handleExport('xlsx')}
                variant="gold"
                disabled={exporting}
                className="text-xs font-bold shadow-md flex items-center gap-1.5"
                title="Download formatted Excel (.xlsx) file"
              >
                <Icon name="file-text" className="w-4 h-4 text-dillaDarkGreen" />
                <span>{exporting ? 'Generating...' : 'Export Excel (.xlsx)'}</span>
              </Button>
              <Button
                onClick={() => handleExport('csv')}
                variant="outline"
                disabled={exporting}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-bold flex items-center gap-1.5"
                title="Download standard CSV (.csv) file"
              >
                <Icon name="download" className="w-4 h-4 text-white" />
                <span>Export CSV</span>
              </Button>
              <Button
                onClick={() => window.print()}
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-bold flex items-center gap-1.5"
              >
                <Icon name="printer" className="w-4 h-4 text-white" />
                <span>Print</span>
              </Button>
            </div>
          </div>
        </div>

        {/* High-Level Summary Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 bg-[#f8faf9] border-t border-slate-200">
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-dillaGreen flex items-center justify-center font-bold text-sm">
              <Icon name="users" className="w-5 h-5 text-dillaGreen" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Enrolled</span>
              <span className="text-xl font-bold text-slate-900">{metrics.total}</span>
            </div>
          </div>

          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm">
              <Icon name="check-circle" className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Approved Beneficiaries</span>
              <span className="text-xl font-bold text-slate-900">{metrics.approved}</span>
            </div>
          </div>

          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-sm">
              <Icon name="clock" className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Pending Review</span>
              <span className="text-xl font-bold text-slate-900">{metrics.pending}</span>
            </div>
          </div>

          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold text-sm">
              <Icon name="alert-circle" className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Rejected / Corrections</span>
              <span className="text-xl font-bold text-slate-900">{metrics.rejected}</span>
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

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('roster')}
          className={`pb-3 px-5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'roster'
              ? 'border-dillaGreen text-dillaGreen'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Icon name="file-text" className="w-4 h-4" />
          Beneficiary Roster ({pagination.totalCount})
        </button>
        <button
          onClick={() => setActiveTab('summary')}
          className={`pb-3 px-5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'summary'
              ? 'border-dillaGreen text-dillaGreen'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Icon name="grid" className="w-4 h-4" />
          Statistical Summary
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'history'
              ? 'border-dillaGreen text-dillaGreen'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Icon name="clock" className="w-4 h-4" />
          Export History ({reportHistory.length})
        </button>
      </div>

      {/* TAB 1: BENEFICIARY ROSTER */}
      {activeTab === 'roster' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              <div className="md:col-span-2">
                <Input
                  placeholder="Search by student name, ID, or department..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 text-slate-900"
                />
              </div>

              <div>
                <select
                  value={selectedCampus}
                  onChange={(e) => setSelectedCampus(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-dillaGreen/30"
                >
                  <option value="">All Campuses</option>
                  {campuses.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-dillaGreen/30"
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-dillaGreen/30"
                >
                  <option value="">All Statuses</option>
                  <option value="approved">Approved</option>
                  <option value="dean-review">Dean Review</option>
                  <option value="super-admin-review">Super Admin Review</option>
                  <option value="rejected">Rejected</option>
                  <option value="return-for-correction">Returned for Correction</option>
                </select>
              </div>
            </form>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-[#f1f5f3]">
                  <tr>
                    <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">Student ID</th>
                    <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">Full Name</th>
                    <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">Campus</th>
                    <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">Department</th>
                    <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">Year</th>
                    <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">Cafeteria</th>
                    <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-slate-500 font-semibold">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-5 h-5 border-2 border-dillaGreen border-t-transparent rounded-full animate-spin"></div>
                          <span>Loading official report records...</span>
                        </div>
                      </td>
                    </tr>
                  ) : students.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-slate-500 font-medium">
                        No report records found matching the specified filters.
                      </td>
                    </tr>
                  ) : (
                    students.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-dillaGreen whitespace-nowrap">{s.studentId}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{s.fullName}</td>
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{s.campus}</td>
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{s.department}</td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{s.yearOfStudy ? `Year ${s.yearOfStudy}` : 'N/A'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusBadge status={s.applicationStatus || 'submitted'} />
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          {s.isNonCafeteria ? (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded font-semibold text-[10px] border border-amber-200">Non-Cafeteria</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-semibold text-[10px]">Cafeteria</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                          {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Bar */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 font-medium">
              <div>
                Showing page <span className="font-bold text-slate-900">{pagination.page}</span> of{' '}
                <span className="font-bold text-slate-900">{pagination.totalPages}</span> ({pagination.totalCount} total students)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => fetchReports(pagination.page - 1)}
                  disabled={pagination.page <= 1 || loading}
                  variant="outline"
                  className="px-3 py-1.5 text-xs font-semibold"
                >
                  Previous
                </Button>
                <Button
                  onClick={() => fetchReports(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages || loading}
                  variant="outline"
                  className="px-3 py-1.5 text-xs font-semibold"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STATISTICAL SUMMARY */}
      {activeTab === 'summary' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Campus Breakdown Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
            <h3 className="font-serif text-base font-bold text-dillaDarkGreen mb-3 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Icon name="building" className="w-4 h-4 text-dillaGreen" />
              Enrollment by University Campus
            </h3>
            <div className="space-y-3">
              {Object.entries(metrics.byCampus || {}).map(([campusName, counts]) => (
                <div key={campusName} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block">{campusName}</span>
                    <span className="text-slate-500 text-[11px]">Approved: {counts.approved} • Pending: {counts.pending}</span>
                  </div>
                  <span className="px-2.5 py-1 bg-white font-bold text-dillaGreen rounded-lg border border-slate-200 text-xs">
                    {counts.total} Students
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Department Breakdown Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
            <h3 className="font-serif text-base font-bold text-dillaDarkGreen mb-3 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Icon name="book-open" className="w-4 h-4 text-dillaGreen" />
              Enrollment by Academic Department
            </h3>
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {Object.entries(metrics.byDepartment || {}).map(([deptName, counts]) => (
                <div key={deptName} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 truncate mr-2">{deptName}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100/70 px-1.5 py-0.5 rounded">
                      {counts.approved} Appr
                    </span>
                    <span className="font-bold text-slate-700">{counts.total}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: EXPORT HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="p-4 bg-[#f8faf9] border-b border-slate-200">
            <h3 className="font-serif text-sm font-bold text-dillaDarkGreen">
              Audit Log: Report Generation & Export History
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Persistent PostgreSQL audit records tracking all generated spreadsheets, creators, campus scopes, and timestamps
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-[#f1f5f3]">
                <tr>
                  <th className="px-4 py-3 text-left font-bold text-dillaDarkGreen uppercase tracking-wider">Timestamp</th>
                  <th className="px-4 py-3 text-left font-bold text-dillaDarkGreen uppercase tracking-wider">Creator</th>
                  <th className="px-4 py-3 text-left font-bold text-dillaDarkGreen uppercase tracking-wider">Campus Scope</th>
                  <th className="px-4 py-3 text-left font-bold text-dillaDarkGreen uppercase tracking-wider">Format</th>
                  <th className="px-4 py-3 text-left font-bold text-dillaDarkGreen uppercase tracking-wider">Record Count</th>
                  <th className="px-4 py-3 text-left font-bold text-dillaDarkGreen uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportHistory.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-6 text-center text-slate-500 font-medium">
                      No report export history recorded yet.
                    </td>
                  </tr>
                ) : (
                  reportHistory.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-slate-600">
                        {h.createdAt ? new Date(h.createdAt).toLocaleString() : 'N/A'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {h.creatorUsername} <span className="text-[10px] text-slate-500">({h.creatorRole})</span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{h.campusScope || 'All Campuses'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                          h.fileFormat === 'xlsx' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {h.fileFormat}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-800">{h.recordCount} rows</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-full text-[10px] border border-emerald-200">
                          {h.status || 'completed'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default Reports
