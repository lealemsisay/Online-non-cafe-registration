import React, { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/forms'
import Icon from '@/components/icons/Icon'

const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv']
const MAX_FILE_BYTES = 10 * 1024 * 1024

const emptySummary = {
  totalRecords: 0,
  newRecords: 0,
  importedRecords: 0,
  duplicateRecords: 0,
  rejectedRecords: 0,
  profileIncompleteRecords: 0,
}

const ImportStudents = ({ isOpen, onClose, onImportSuccess }) => {
  const [file, setFile] = useState(null)
  const [fileName, setFileName] = useState('')
  const [fileBase64, setFileBase64] = useState('')
  const [loading, setLoading] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [preview, setPreview] = useState(null)
  const [committed, setCommitted] = useState(false)
  const [activeView, setActiveView] = useState('new')
  const inputRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    setFile(null)
    setFileName('')
    setFileBase64('')
    setError(null)
    setMessage(null)
    setPreview(null)
    setCommitted(false)
    setActiveView('new')
    setLoading(false)
    setPreviewing(false)
    if (inputRef.current) inputRef.current.value = ''
  }, [isOpen])

  if (!isOpen) return null

  const resetFile = () => {
    setFile(null)
    setFileName('')
    setFileBase64('')
    setPreview(null)
    setCommitted(false)
    setError(null)
    setMessage(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleFileChange = (event) => {
    const selected = event.target.files?.[0]
    if (!selected) return

    const ext = '.' + (selected.name.split('.').pop() || '').toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setError('Unsupported file format. Please upload an .xlsx, .xls or .csv file.')
      resetFile()
      return
    }
    if (selected.size > MAX_FILE_BYTES) {
      setError(`File size (${(selected.size / (1024 * 1024)).toFixed(2)} MB) exceeds the 10 MB limit.`)
      resetFile()
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setFile(selected)
      setFileName(selected.name)
      setFileBase64(typeof reader.result === 'string' ? reader.result : '')
      setPreview(null)
      setCommitted(false)
      setError(null)
      setMessage(null)
      setActiveView('new')
    }
    reader.onerror = () => setError('Unable to read the selected file.')
    reader.readAsDataURL(selected)
  }

  const downloadTemplate = async (format) => {
    setError(null)
    try {
      const res = await fetch(`/api/students/import?format=${format}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      if (!res.ok) {
        setError('Failed to download the template.')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `dilla_student_import_template.${format}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch {
      setError('Network error while downloading the template.')
    }
  }

  const submitImport = async (dryRun) => {
    if (!fileBase64) {
      setError('Please select a file first.')
      return
    }
    setError(null)
    setMessage(null)
    if (dryRun) setPreviewing(true)
    else setLoading(true)

    try {
      const res = await fetch('/api/students/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ fileBase64, fileName, dryRun }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        if (Array.isArray(data.missingColumns) && data.missingColumns.length) {
          setError(`${data.message} Missing: ${data.missingColumns.join(', ')}`)
        } else {
          setError(data.message || 'Import request failed.')
        }
        return
      }

      setPreview(data)
      setMessage(data.message || null)
      if (!dryRun) setCommitted(true)
    } catch {
      setError('Network error during import.')
    } finally {
      if (dryRun) setPreviewing(false)
      else setLoading(false)
    }
  }

  const handleClose = () => {
    if (committed) onImportSuccess?.()
    onClose?.()
  }

  const summary = preview?.summary || emptySummary
  const newRows = preview?.new || []
  const duplicateRows = preview?.duplicates || []
  const rejectedRows = preview?.rejected || []
  const hasResults = Boolean(preview)

  const downloadErrorReport = () => {
    const rows = [
      ['Row', 'Student ID', 'Student Name', 'Status', 'Reason'],
      ...rejectedRows.map((r) => [r.row ?? '', r.student_id ?? '', r.student_name ?? '', 'Rejected', r.reason || '']),
      ...duplicateRows.map((r) => [r.row ?? '', r.student_id ?? '', r.student_name ?? '', 'Duplicate', r.reason || '']),
    ]
    const csv = rows
      .map((row) =>
        row
          .map((value) => {
            const str = value == null ? '' : String(value)
            return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
          })
          .join(',')
      )
      .join('\r\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv; charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'dilla_student_import_errors.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const tabs = [
    { key: 'new', label: `New (${newRows.length})`, tone: 'emerald' },
    { key: 'duplicate', label: `Duplicates (${duplicateRows.length})`, tone: 'amber' },
    { key: 'rejected', label: `Rejected (${rejectedRows.length})`, tone: 'rose' },
  ]

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between gap-4 p-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-dillaGreen/10 text-dillaGreen flex items-center justify-center">
              <Icon name="upload" className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-dillaDarkGreen">Bulk Student Import</h3>
              <p className="text-xs text-slate-500">
                Upload an Excel or CSV file. Only <strong>student_name</strong> and <strong>student_id</strong> are required.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-700 font-bold p-1 rounded-lg cursor-pointer"
            aria-label="Close"
            disabled={loading || previewing}
          >
            ✕
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {error && (
            <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-900 text-xs sm:text-sm p-3.5 rounded-xl flex items-start justify-between gap-3">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="font-bold text-rose-700 hover:text-rose-950 cursor-pointer">✕</button>
            </div>
          )}
          {message && (
            <div className={`border-l-4 text-xs sm:text-sm p-3.5 rounded-xl flex items-start justify-between gap-3 ${
              committed
                ? 'bg-emerald-50 border-emerald-600 text-emerald-900'
                : 'bg-sky-50 border-sky-500 text-sky-900'
            }`}>
              <span>{message}</span>
              <button onClick={() => setMessage(null)} className="font-bold opacity-70 hover:opacity-100 cursor-pointer">✕</button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="border border-dashed border-slate-300 rounded-xl p-4 bg-slate-50/60">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Step 1 · Select file</p>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
                disabled={loading || previewing}
              />
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => inputRef.current?.click()}
                  className="text-xs font-bold"
                  disabled={loading || previewing}
                >
                  Choose File
                </Button>
                <span className="text-xs text-slate-600 truncate" title={fileName || undefined}>
                  {fileName || 'No file selected'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">Accepted: .xlsx, .xls, .csv · Max 10 MB</p>
            </div>

            <div className="border border-slate-200 rounded-xl p-4">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Templates</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" onClick={() => downloadTemplate('xlsx')} className="text-xs font-bold text-dillaGreen">
                  <Icon name="download" className="w-3.5 h-3.5 mr-1" /> Excel
                </Button>
                <Button variant="ghost" onClick={() => downloadTemplate('csv')} className="text-xs font-bold text-dillaGreen">
                  <Icon name="download" className="w-3.5 h-3.5 mr-1" /> CSV
                </Button>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Columns: student_name*, student_id*, registrar_id, gender, campus, department, program, year_of_study, academic_year, phone, email, is_non_cafeteria
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => submitImport(true)}
              disabled={!fileBase64 || loading || previewing}
              className="text-xs font-bold"
            >
              {previewing ? 'Validating…' : 'Preview & Validate'}
            </Button>
          </div>

          {hasResults && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                  <p className="text-lg font-extrabold text-slate-800">{summary.totalRecords}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total rows</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">
                  <p className="text-lg font-extrabold text-emerald-700">{summary.newRecords}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">New</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center">
                  <p className="text-lg font-extrabold text-amber-700">{summary.duplicateRecords}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Duplicates</p>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-center">
                  <p className="text-lg font-extrabold text-rose-700">{summary.rejectedRecords}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Rejected</p>
                </div>
              </div>

              {summary.profileIncompleteRecords > 0 && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  {summary.profileIncompleteRecords} new record(s) have incomplete profiles and will be saved with the information available.
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
                {tabs.map((tab) => {
                  const active = activeView === tab.key
                  const tone = tab.tone === 'emerald'
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : tab.tone === 'amber'
                    ? 'bg-amber-500 border-amber-500 text-white'
                    : 'bg-rose-600 border-rose-600 text-white'
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveView(tab.key)}
                      className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-colors cursor-pointer ${
                        active ? tone : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {tab.label}
                    </button>
                  )
                })}
                {(duplicateRows.length > 0 || rejectedRows.length > 0) && (
                  <button
                    type="button"
                    onClick={downloadErrorReport}
                    className="ml-auto px-3 py-1.5 text-[11px] font-bold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Download error report
                  </button>
                )}
              </div>

              <div className="max-h-56 overflow-auto border border-slate-200 rounded-xl">
                {activeView === 'new' && (
                  <table className="min-w-full text-xs">
                    <thead className="bg-[#f1f5f3] sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-bold text-dillaDarkGreen">Row</th>
                        <th className="px-3 py-2 text-left font-bold text-dillaDarkGreen">Student ID</th>
                        <th className="px-3 py-2 text-left font-bold text-dillaDarkGreen">Name</th>
                        <th className="px-3 py-2 text-left font-bold text-dillaDarkGreen">Campus</th>
                        <th className="px-3 py-2 text-left font-bold text-dillaDarkGreen">Department</th>
                        <th className="px-3 py-2 text-left font-bold text-dillaDarkGreen">Profile</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {newRows.length === 0 ? (
                        <tr><td colSpan="6" className="px-3 py-6 text-center text-slate-400">No new records.</td></tr>
                      ) : newRows.map((r) => (
                        <tr key={`${r.row}-${r.student_id}`} className="hover:bg-slate-50">
                          <td className="px-3 py-2 text-slate-500">{r.row}</td>
                          <td className="px-3 py-2 font-mono font-bold text-dillaGreen">{r.student_id}</td>
                          <td className="px-3 py-2 font-semibold text-slate-900">{r.student_name}</td>
                          <td className="px-3 py-2 text-slate-700">{r.campus || '—'}</td>
                          <td className="px-3 py-2 text-slate-700">{r.department || '—'}</td>
                          <td className="px-3 py-2">
                            {r.profile_complete ? (
                              <span className="text-emerald-700 font-bold">Complete</span>
                            ) : (
                              <span className="text-amber-700 font-bold">Incomplete</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeView === 'duplicate' && (
                  <table className="min-w-full text-xs">
                    <thead className="bg-[#f1f5f3] sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-bold text-dillaDarkGreen">Row</th>
                        <th className="px-3 py-2 text-left font-bold text-dillaDarkGreen">Student ID</th>
                        <th className="px-3 py-2 text-left font-bold text-dillaDarkGreen">Name</th>
                        <th className="px-3 py-2 text-left font-bold text-dillaDarkGreen">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {duplicateRows.length === 0 ? (
                        <tr><td colSpan="4" className="px-3 py-6 text-center text-slate-400">No duplicates.</td></tr>
                      ) : duplicateRows.map((r, i) => (
                        <tr key={`${r.row}-${r.student_id}-${i}`} className="hover:bg-slate-50">
                          <td className="px-3 py-2 text-slate-500">{r.row}</td>
                          <td className="px-3 py-2 font-mono font-bold text-slate-800">{r.student_id}</td>
                          <td className="px-3 py-2 font-semibold text-slate-900">{r.student_name}</td>
                          <td className="px-3 py-2 text-amber-800">{r.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeView === 'rejected' && (
                  <table className="min-w-full text-xs">
                    <thead className="bg-[#f1f5f3] sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-bold text-dillaDarkGreen">Row</th>
                        <th className="px-3 py-2 text-left font-bold text-dillaDarkGreen">Student ID</th>
                        <th className="px-3 py-2 text-left font-bold text-dillaDarkGreen">Name</th>
                        <th className="px-3 py-2 text-left font-bold text-dillaDarkGreen">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rejectedRows.length === 0 ? (
                        <tr><td colSpan="4" className="px-3 py-6 text-center text-slate-400">No rejected rows.</td></tr>
                      ) : rejectedRows.map((r, i) => (
                        <tr key={`${r.row}-${r.student_id}-${i}`} className="hover:bg-slate-50">
                          <td className="px-3 py-2 text-slate-500">{r.row}</td>
                          <td className="px-3 py-2 font-mono font-bold text-slate-800">{r.student_id || '—'}</td>
                          <td className="px-3 py-2 font-semibold text-slate-900">{r.student_name || '—'}</td>
                          <td className="px-3 py-2 text-rose-700">{r.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <button
            type="button"
            onClick={resetFile}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
            disabled={loading || previewing}
          >
            Clear
          </button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleClose} disabled={loading || previewing} className="text-xs font-bold">
              {committed ? 'Done' : 'Cancel'}
            </Button>
            {!committed && hasResults && summary.newRecords > 0 && (
              <Button
                variant="primary"
                onClick={() => submitImport(false)}
                disabled={loading || previewing}
                className="text-xs font-bold"
              >
                {loading ? 'Importing…' : `Confirm Import (${summary.newRecords})`}
              </Button>
            )}
            {!committed && hasResults && summary.newRecords === 0 && (
              <Button variant="primary" onClick={handleClose} className="text-xs font-bold">
                Done
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ImportStudents
