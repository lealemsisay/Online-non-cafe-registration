import React, { useState, useEffect } from 'react'
import Icon from '@/components/icons/Icon'
import { StatusBadge } from '@/components/status/StatusBadge'

const StudentDetailModal = ({
  isOpen,
  onClose,
  studentId,
  initialData = null,
}) => {
  const [student, setStudent] = useState(initialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isOpen && studentId) {
      setLoading(true)
      setError(null)
      const token = localStorage.getItem('token')
      fetch(`/api/profile?id=${encodeURIComponent(studentId)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((res) => {
          if (!res.ok) throw new Error('Unable to fetch complete student record.')
          return res.json()
        })
        .then((data) => {
          if (data?.student || data?.user) {
            setStudent({
              ...(data.student || {}),
              ...(data.user || {}),
              customValues: data.student?.customValues || {},
              customFields: data.student?.customFields || [],
            })
          } else {
            setStudent(initialData)
          }
        })
        .catch((err) => {
          console.error('Fetch student details error:', err)
          if (initialData) {
            setStudent(initialData)
          } else {
            setError(err.message)
          }
        })
        .finally(() => setLoading(false))
    } else if (initialData) {
      setStudent(initialData)
    }
  }, [isOpen, studentId, initialData])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const s = student || {}
  const fullName = s.fullName || s.name || s.studentName || 'Student Record'
  const sid = s.studentId || s.username || s.id || '-'
  const photo = s.photoUrl || null
  const campus = s.campus || '-'
  const department = s.department || '-'
  const program = s.program || '-'
  const yearOfStudy = s.yearOfStudy || '-'
  const academicYear = s.academicYear || '-'
  const gender = s.gender || '-'
  const phone = s.phone || '-'
  const email = s.email || '-'
  const isNonCafe = s.isNonCafeteria !== false
  const regStatus = s.registrationStatus || '-'
  const appStatus = s.applicationStatus || s.status || 'submitted'
  const approvalStatus = s.approvalStatus || 'pending'
  const deanReview = s.deanReview || s.deanFinding || null
  const deanComments = s.deanComments || null
  const superAdminReview = s.superAdminReview || null
  const superAdminComments = s.superAdminComments || null
  const customFields = s.customFields || []
  const customValues = s.customValues || {}

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[92vh] flex flex-col relative overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header Banner */}
        <div className="bg-gradient-to-r from-dillaDarkGreen via-[#12442c] to-dillaGreen text-white p-5 sm:p-6 flex-shrink-0 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="Close modal"
          >
            <Icon name="x" className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Passport Photo Preview Frame */}
            <div className="w-20 h-24 sm:w-24 sm:h-28 rounded-xl bg-slate-100 border-2 border-white/30 overflow-hidden shadow-md flex-shrink-0 flex items-center justify-center">
              {photo ? (
                <img
                  src={photo}
                  alt={fullName}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                  <Icon name="user" className="w-8 h-8 text-slate-400" />
                  <span className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">No Photo</span>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-bold text-dillaGold">
                  Complete Student Dossier
                </span>
                <span className="text-white/40">•</span>
                <span className="text-xs text-emerald-200 font-medium">
                  {campus}
                </span>
              </div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-white mt-0.5 truncate">
                {fullName}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className="font-mono text-xs font-bold bg-black/20 text-emerald-100 px-2.5 py-0.5 rounded-md border border-white/10">
                  ID: {sid}
                </span>
                <StatusBadge status={appStatus} />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {loading && (
            <div className="py-8 text-center text-slate-500">
              <span className="inline-block w-6 h-6 border-3 border-dillaGreen border-t-transparent rounded-full animate-spin mb-2" />
              <p className="font-semibold text-xs">Loading complete student registration data...</p>
            </div>
          )}

          {error && !loading && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 font-medium">
              <Icon name="alert-circle" className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Academic & Enrollment Details */}
          <div>
            <h3 className="text-xs font-bold text-dillaDarkGreen uppercase tracking-wider mb-2.5 flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
              <Icon name="book-open" className="w-4 h-4 text-dillaGold" />
              Academic & Enrollment Information
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Campus</p>
                <p className="font-bold text-slate-900 mt-0.5 text-xs">{campus}</p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Department</p>
                <p className="font-bold text-slate-900 mt-0.5 text-xs">{department}</p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Program</p>
                <p className="font-bold text-slate-900 mt-0.5 text-xs">{program}</p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Year of Study</p>
                <p className="font-bold text-slate-900 mt-0.5 text-xs">Year {yearOfStudy}</p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Academic Year</p>
                <p className="font-bold text-slate-900 mt-0.5 text-xs">{academicYear}</p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Gender</p>
                <p className="font-bold text-slate-900 mt-0.5 text-xs">{gender}</p>
              </div>
            </div>
          </div>

          {/* 2. Contact Information */}
          <div>
            <h3 className="text-xs font-bold text-dillaDarkGreen uppercase tracking-wider mb-2.5 flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
              <Icon name="mail" className="w-4 h-4 text-dillaGold" />
              Contact & Identification
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                <Icon name="phone" className="w-4 h-4 text-dillaGreen flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Phone Number</p>
                  <p className="font-bold text-slate-900 mt-0.5 text-xs">{phone || 'Not specified'}</p>
                </div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                <Icon name="mail" className="w-4 h-4 text-dillaGreen flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Address</p>
                  <p className="font-bold text-slate-900 mt-0.5 text-xs truncate">{email || 'Not specified'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Cost-Sharing & Cafeteria Status */}
          <div>
            <h3 className="text-xs font-bold text-dillaDarkGreen uppercase tracking-wider mb-2.5 flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
              <Icon name="file-text" className="w-4 h-4 text-dillaGold" />
              Cost-Sharing Registration Status
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Non-Cafeteria Subsidy</p>
                <p className={`font-bold mt-0.5 text-xs ${isNonCafe ? 'text-emerald-700' : 'text-slate-700'}`}>
                  {isNonCafe ? 'Yes (Requested)' : 'No (Standard)'}
                </p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Registration Status</p>
                <p className="font-bold text-slate-900 mt-0.5 text-xs uppercase">{regStatus}</p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Application Status</p>
                <p className="font-bold text-slate-900 mt-0.5 text-xs uppercase">{appStatus}</p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Institutional Approval</p>
                <p className="font-bold text-slate-900 mt-0.5 text-xs uppercase">{approvalStatus}</p>
              </div>
            </div>
          </div>

          {/* 4. Dean and Admin Verification Findings */}
          {(deanReview || deanComments || superAdminReview || superAdminComments) && (
            <div>
              <h3 className="text-xs font-bold text-dillaDarkGreen uppercase tracking-wider mb-2.5 flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                <Icon name="user-check" className="w-4 h-4 text-dillaGold" />
                Institutional Review & Comments
              </h3>
              <div className="space-y-2.5">
                {(deanReview || deanComments) && (
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
                    <p className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">
                      Campus Dean Finding: <strong>{deanReview || 'Recorded'}</strong>
                    </p>
                    {deanComments && (
                      <p className="text-xs text-amber-950 mt-1 italic">"{deanComments}"</p>
                    )}
                  </div>
                )}
                {(superAdminReview || superAdminComments) && (
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                    <p className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider">
                      Super Admin Review: <strong>{superAdminReview || 'Approved'}</strong>
                    </p>
                    {superAdminComments && (
                      <p className="text-xs text-emerald-950 mt-1 italic">"{superAdminComments}"</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5. Dynamic Custom Fields Configured by Admin */}
          <div>
            <h3 className="text-xs font-bold text-dillaDarkGreen uppercase tracking-wider mb-2.5 flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
              <Icon name="sliders-horizontal" className="w-4 h-4 text-dillaGold" />
              Dynamic Registration & Custom Fields
            </h3>
            {(() => {
              // Combine configured definitions with any historical saved values
              const combinedFields = [...customFields]
              Object.entries(customValues).forEach(([key, val]) => {
                if (!combinedFields.some((f) => f.fieldKey === key)) {
                  combinedFields.push({
                    fieldKey: key,
                    label: key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
                    fieldType: 'archived',
                    value: val,
                  })
                }
              })

              if (combinedFields.length === 0) {
                return (
                  <p className="text-slate-400 italic text-[11px] p-2 bg-slate-50 rounded-lg">
                    No custom fields configured for this student.
                  </p>
                )
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {combinedFields.map((cf) => {
                    const rawVal = customValues[cf.fieldKey] !== undefined ? customValues[cf.fieldKey] : cf.value
                    const displayVal = rawVal !== null && rawVal !== undefined && String(rawVal).trim() !== '' 
                      ? (rawVal === 'true' ? 'Yes' : rawVal === 'false' ? 'No' : String(rawVal))
                      : '— Not specified —'

                    return (
                      <div key={cf.fieldKey} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                            {cf.label}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">
                            {cf.fieldType}
                          </span>
                        </div>
                        <p className={`font-bold mt-0.5 text-xs ${displayVal === '— Not specified —' ? 'text-slate-400 italic font-normal' : 'text-slate-900'}`}>
                          {displayVal}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
          <div className="text-[11px] text-slate-500">
            Dilla University Online Cost-Sharing Registration System
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  )
}

export default StudentDetailModal
