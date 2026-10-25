import React, { useState, useEffect } from 'react'
import { Button } from '@/components/forms'
import { StatusBadge } from '@/components/status/StatusBadge'
import Icon from '@/components/icons/Icon'

const StudentDashboard = () => {
  const [student, setStudent] = useState(null)
  const [registrationWindow, setRegistrationWindow] = useState({ isOpen: true })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const userId = localStorage.getItem('userId')
    const token = localStorage.getItem('token')
    const userName = localStorage.getItem('userName')
    const userCampus = localStorage.getItem('userCampus')
    const headers = token ? { Authorization: `Bearer ${token}` } : {}

    // Check registration window schedule
    fetch('/api/settings', { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.registrationWindow) setRegistrationWindow(d.registrationWindow)
      })
      .catch(() => {})

    if (userId) {
      fetch(`/api/profile?id=${userId}`, { headers })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.user || data?.student) {
            const s = data.student || {}
            const u = data.user || {}
            setStudent({
              id: s.studentId || u.studentId || u.username || userId,
              name: s.fullName || u.fullName || u.name || userName || 'Student',
              campus: s.campus || u.campus || userCampus || 'Main Campus',
              department: s.department || 'Computer Science',
              program: s.program || 'Regular Degree',
              yearOfStudy: s.yearOfStudy || '1',
              academicYear: s.academicYear || '2023/2024',
              registrationStatus: s.registrationStatus || 'submitted',
              applicationStatus: s.applicationStatus || 'submitted',
              approvalStatus: s.approvalStatus || 'pending',
              isNonCafeteria: s.isNonCafeteria !== false,
              deanReview: s.deanReview,
              deanComments: s.deanComments,
              superAdminReview: s.superAdminReview,
              superAdminComments: s.superAdminComments,
              customFields: s.customFields || [],
              customValues: s.customValues || {},
              photoUrl: s.photoUrl || u.photoUrl || null,
              createdAt: s.createdAt || new Date().toISOString(),
            })
          } else {
            setStudent({
              id: localStorage.getItem('studentId') || userId || 'DUC2023-001',
              name: userName || 'Student',
              campus: userCampus || 'Main Campus',
              department: 'Computer Science',
              program: 'Regular Degree',
              yearOfStudy: '1',
              academicYear: '2023/2024',
              registrationStatus: 'draft',
              applicationStatus: 'draft',
              approvalStatus: 'pending',
              isNonCafeteria: true,
              customFields: [],
            })
          }
        })
        .catch((err) => {
          console.error('Error fetching profile:', err)
          setStudent({
            id: localStorage.getItem('studentId') || userId || 'DUC2023-001',
            name: userName || 'Student',
            campus: userCampus || 'Main Campus',
            department: 'Computer Science',
            academicYear: '2023/2024',
            registrationStatus: 'draft',
            applicationStatus: 'draft',
          })
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      setLoading(false)
    }
  }, [])

  const handleStartOrEditRegistration = () => {
    window.location.href = '/student/register'
  }

  const appStatus = student?.applicationStatus || 'draft'
  const isReturned = appStatus === 'return-for-correction' || appStatus === 'returned-for-correction'
  const isDraft = appStatus === 'draft'
  const isApproved = appStatus === 'approved'
  const isRejected = appStatus === 'rejected'
  const isPendingDean = appStatus === 'submitted' || appStatus === 'dean-review'
  const isPendingAdmin = appStatus === 'super-admin-review'

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Official Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-dillaDarkGreen via-[#12442c] to-dillaGreen p-6 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-white p-1.5 shadow-md flex items-center justify-center flex-shrink-0">
                <img
                  src="/dilla-logo.png"
                  alt="Dilla University Crest"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider font-bold text-dillaGold">
                    Student Portal
                  </span>
                  <span className="text-white/40">•</span>
                  <span className="text-xs text-emerald-200 italic font-medium">
                    "University of the Green Land"
                  </span>
                </div>
                <h1 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-white mt-0.5">
                  Cost-Sharing Registration Status
                </h1>
                <p className="text-xs text-white/80 mt-0.5">
                  Non-Cafeteria Student Subsidy Application & Academic Cost-Sharing Verification
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <StatusBadge status={appStatus} />
            </div>
          </div>
        </div>

        {/* Quick summary strip */}
        <div className="bg-[#f1f5f3] px-6 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-700">
          <div className="flex items-center gap-4">
            <span><strong>Campus:</strong> {student?.campus || 'Main Campus'}</span>
            <span>•</span>
            <span><strong>Academic Year:</strong> {student?.academicYear || '2023/2024'}</span>
            <span>•</span>
            <span><strong>Student ID:</strong> <code className="font-bold">{student?.id}</code></span>
          </div>
          <div className="text-dillaGreen font-semibold">
            Cost-Sharing Subsidy Status: <span className="font-bold uppercase">{student?.applicationStatus || 'Draft'}</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center text-slate-500">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-dillaGreen border-t-transparent mb-3"></div>
          <p className="text-sm font-semibold text-slate-700">Loading your cost-sharing application status...</p>
        </div>
      ) : (
        <>
          {/* Registration Window Banner */}
          {!registrationWindow.isOpen && (
            <div className="bg-slate-900 text-white p-4 rounded-xl shadow-md flex items-start gap-3 border border-slate-800">
              <Icon name="clock" className="w-5 h-5 text-dillaGold flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-bold text-dillaGold">Registration Window Closed</h3>
                <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">
                  {registrationWindow.reason || 'The university cost-sharing registration window is currently closed. New registrations and modifications are unavailable, but your account and existing submission records remain securely accessible.'}
                </p>
              </div>
            </div>
          )}

          {/* Status Alert Banners */}
          {isReturned && (
            <div className="bg-amber-50 border-l-4 border-amber-500 p-5 rounded-xl shadow-sm">
              <div className="flex items-start gap-3">
                <Icon name="alert-circle" className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-amber-950">
                    Application Returned for Correction
                  </h3>
                  <p className="text-xs text-amber-900 mt-1">
                    Your campus dean has requested modifications to your application. Please review the reviewer comments below, update your details or slip, and re-submit.
                  </p>
                  {student?.deanComments && (
                    <div className="mt-2.5 p-3.5 bg-white rounded-lg border border-amber-200 text-xs text-amber-950 font-medium shadow-2xs">
                      <strong>Dean's Verification Remarks:</strong> "{student.deanComments}"
                    </div>
                  )}
                  <div className="mt-3.5">
                    <Button
                      onClick={handleStartOrEditRegistration}
                      variant="gold"
                      className="text-xs px-4 py-2"
                    >
                      Update & Re-Submit Application
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isApproved && (
            <div className="bg-emerald-50 border-l-4 border-emerald-600 p-5 rounded-xl shadow-sm">
              <div className="flex items-start gap-3">
                <Icon name="check-circle" className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-emerald-950">
                    Cost-Sharing Non-Cafeteria Subsidy Officially Approved!
                  </h3>
                  <p className="text-xs text-emerald-900 mt-1 leading-relaxed">
                    Congratulations! Your application has received final authorization from the University Super Admin for academic year <strong>{student?.academicYear}</strong>. You are officially enrolled as a verified non-cafeteria cost-sharing student beneficiary.
                  </p>
                </div>
              </div>
            </div>
          )}

          {isRejected && (
            <div className="bg-rose-50 border-l-4 border-rose-500 p-5 rounded-xl shadow-sm">
              <div className="flex items-start gap-3">
                <Icon name="alert" className="w-6 h-6 text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-rose-950">
                    Cost-Sharing Application Ineligible or Rejected
                  </h3>
                  <p className="text-xs text-rose-900 mt-1 leading-relaxed">
                    Your application was marked ineligible during verification. If you believe this is in error, please visit your Campus Dean's office at <strong>{student?.campus}</strong> with your original student ID and registration slip.
                  </p>
                </div>
              </div>
            </div>
          )}

          {isPendingDean && (
            <div className="bg-blue-50 border-l-4 border-dillaGreen p-5 rounded-xl shadow-sm">
              <div className="flex items-start gap-3">
                <Icon name="clock" className="w-6 h-6 text-dillaGreen flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-dillaDarkGreen">
                    Application Under Campus Dean Review
                  </h3>
                  <p className="text-xs text-blue-900 mt-1 leading-relaxed">
                    Your cost-sharing application has been successfully submitted and is currently being inspected by the Campus Dean of <strong>{student?.campus}</strong>. You will receive an update once the review is verified.
                  </p>
                </div>
              </div>
            </div>
          )}

          {isPendingAdmin && (
            <div className="bg-purple-50 border-l-4 border-purple-600 p-5 rounded-xl shadow-sm">
              <div className="flex items-start gap-3">
                <Icon name="shield" className="w-6 h-6 text-purple-700 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-purple-950">
                    Dean Verified — Queued for Super Admin Final Authorization
                  </h3>
                  <p className="text-xs text-purple-900 mt-1 leading-relaxed">
                    Your Campus Dean has verified your non-cafeteria registration slip. Your application is now in the central university queue for final approval and disbursement enrollment.
                  </p>
                </div>
              </div>
            </div>
          )}

          {isDraft && (
            <div className="bg-white border-l-4 border-dillaGold p-5 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-start gap-3">
                <Icon name="file-text" className="w-6 h-6 text-dillaGoldDark flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Cost-Sharing Registration Not Yet Submitted
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    You have not yet completed the cost-sharing registration for non-cafeteria monthly subsistence benefits. Please fill out the official form and attach your semester registration slip.
                  </p>
                  <div className="mt-3.5">
                    <Button
                      onClick={handleStartOrEditRegistration}
                      variant="primary"
                      className="text-xs font-bold px-4 py-2"
                    >
                      Begin Cost-Sharing Registration Form →
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Student Profile Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {student?.photoUrl ? (
                  <div className="w-12 h-16 rounded-lg overflow-hidden border border-slate-300 shadow-xs flex-shrink-0 bg-slate-100">
                    <img
                      src={student.photoUrl}
                      alt={student?.name}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-dillaDarkGreen text-white flex items-center justify-center font-bold text-base shadow-xs">
                    {student?.name?.charAt(0) || 'S'}
                  </div>
                )}
                <div>
                  <h2 className="text-base font-bold text-slate-900">{student?.name}</h2>
                  <p className="text-xs text-slate-500 font-mono">Admission No: {student?.id}</p>
                </div>
              </div>

              {(isDraft || isReturned) && (
                <Button
                  onClick={handleStartOrEditRegistration}
                  variant="outline"
                  className="text-xs font-semibold px-3 py-1.5"
                >
                  Edit Registration Details
                </Button>
              )}
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Campus</p>
                  <p className="text-sm font-bold text-dillaGreen mt-1">{student?.campus}</p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Department</p>
                  <p className="text-sm font-bold text-slate-800 mt-1">{student?.department}</p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Academic Year</p>
                  <p className="text-sm font-bold text-slate-800 mt-1">{student?.academicYear}</p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Program Type</p>
                  <p className="text-sm font-bold text-slate-800 mt-1">{student?.program || 'Regular Degree'}</p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Year of Study</p>
                  <p className="text-sm font-bold text-slate-800 mt-1">Year {student?.yearOfStudy}</p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cafeteria Status</p>
                  <p className="text-sm font-bold text-emerald-800 mt-1 flex items-center gap-1">
                    <Icon name="check" className="w-4 h-4 text-emerald-600" />
                    Non-Cafeteria Declared
                  </p>
                </div>
              </div>

              {/* Campus Custom Fields Display */}
              {student?.customFields && student.customFields.length > 0 && (
                <div className="pt-5 mt-6 border-t border-slate-200">
                  <h3 className="text-xs font-bold text-dillaDarkGreen uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Icon name="sliders-horizontal" className="w-3.5 h-3.5 text-dillaGold" />
                    Campus-Specific Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {student.customFields.map((cf) => (
                      <div key={cf.fieldKey} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{cf.label}</p>
                        <p className="text-sm font-bold text-slate-900 mt-0.5">
                          {cf.value !== null && cf.value !== undefined && cf.value !== ''
                            ? cf.value
                            : 'Not specified'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Document Verification Box */}
            <div className="bg-[#f8faf9] p-5 border-t border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-dillaDarkGreen shadow-2xs">
                    <Icon name="file-text" className="w-5 h-5 text-dillaGreen" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Registration Slip PDF Document</p>
                    <p className="text-[11px] text-slate-500">Official proof of semester non-cafeteria cost-sharing enrollment</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => window.open('/api/documents/1', '_blank')}
                    variant="outline"
                    className="text-xs px-3 py-1.5 font-semibold"
                  >
                    View Attached Document ↗
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default StudentDashboard
