import React, { useState, useEffect } from 'react'
import { Button } from '@/components/forms'
import { StatusBadge } from '@/components/status/StatusBadge'
import Icon from '@/components/icons/Icon'

const StudentDashboard = () => {
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const userId = localStorage.getItem('userId')
    const token = localStorage.getItem('token')
    const userName = localStorage.getItem('userName')
    const userCampus = localStorage.getItem('userCampus')

    if (userId) {
      fetch(`/api/profile?id=${userId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
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
              createdAt: s.createdAt || new Date().toISOString(),
            })
          } else {
            // Fallback for newly created student account
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
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Official Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-dillaGold"></span>
              <span className="text-xs uppercase tracking-wider font-bold text-dillaNavy">
                Student Self-Service Portal
              </span>
            </div>
            <h1 className="text-2xl font-bold text-dillaNavy mt-1">
              Dilla University Cost-Sharing Registration
            </h1>
            <p className="text-sm text-slate-600 mt-0.5">
              Non-Cafeteria Student Subsidy Application & Academic Cost-Sharing Verification
            </p>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge status={appStatus} />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center text-slate-500">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-dillaNavy border-t-transparent mb-3"></div>
          <p className="text-sm font-medium">Loading your cost-sharing application status...</p>
        </div>
      ) : (
        <>
          {/* Status Alert Banner */}
          {isReturned && (
            <div className="bg-amber-50 border-l-4 border-amber-500 p-5 rounded-xl shadow-sm">
              <div className="flex items-start gap-3">
                <Icon name="alert-circle" className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-amber-900">
                    Application Returned for Correction
                  </h3>
                  <p className="text-xs text-amber-800 mt-1">
                    Your campus dean has requested modifications to your application. Please review the reviewer comments below, update your details or slip, and re-submit.
                  </p>
                  {student?.deanComments && (
                    <div className="mt-2 p-3 bg-white/80 rounded border border-amber-200 text-xs text-amber-950 font-medium">
                      <strong>Dean's Comments:</strong> "{student.deanComments}"
                    </div>
                  )}
                  <div className="mt-3">
                    <Button
                      onClick={handleStartOrEditRegistration}
                      className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-4 py-2"
                    >
                      Update & Re-Submit Application
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isApproved && (
            <div className="bg-emerald-50 border-l-4 border-emerald-500 p-5 rounded-xl shadow-sm">
              <div className="flex items-start gap-3">
                <Icon name="check-circle" className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-emerald-900">
                    Cost-Sharing Non-Cafeteria Subsidy Approved!
                  </h3>
                  <p className="text-xs text-emerald-800 mt-1">
                    Congratulations! Your application has received final approval from the University Super Admin for academic year <strong>{student?.academicYear}</strong>. You are officially enrolled as a non-cafeteria cost-sharing student beneficiary.
                  </p>
                </div>
              </div>
            </div>
          )}

          {isRejected && (
            <div className="bg-red-50 border-l-4 border-red-500 p-5 rounded-xl shadow-sm">
              <div className="flex items-start gap-3">
                <Icon name="alert" className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-red-900">
                    Cost-Sharing Application Rejected
                  </h3>
                  <p className="text-xs text-red-800 mt-1">
                    Your application was rejected during verification. If you believe this is in error, please visit your Campus Dean's office with your original student ID and registration slip.
                  </p>
                </div>
              </div>
            </div>
          )}

          {isPendingDean && (
            <div className="bg-blue-50 border-l-4 border-dillaNavy p-5 rounded-xl shadow-sm">
              <div className="flex items-start gap-3">
                <Icon name="clock" className="w-6 h-6 text-dillaNavy flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-dillaNavy">
                    Application Under Campus Dean Review
                  </h3>
                  <p className="text-xs text-blue-900 mt-1">
                    Your cost-sharing application has been submitted and is currently being inspected by the Campus Dean of <strong>{student?.campus}</strong>. You will be notified once the review is completed.
                  </p>
                </div>
              </div>
            </div>
          )}

          {isPendingAdmin && (
            <div className="bg-purple-50 border-l-4 border-purple-600 p-5 rounded-xl shadow-sm">
              <div className="flex items-start gap-3">
                <Icon name="clock" className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-purple-900">
                    Verified by Campus Dean — Awaiting Super Admin Final Approval
                  </h3>
                  <p className="text-xs text-purple-800 mt-1">
                    Your Campus Dean has verified your registration slip and credentials. Your application is now queued for final university authorization.
                  </p>
                </div>
              </div>
            </div>
          )}

          {isDraft && (
            <div className="bg-slate-50 border-l-4 border-slate-400 p-5 rounded-xl shadow-sm">
              <div className="flex items-start gap-3">
                <Icon name="file-text" className="w-6 h-6 text-slate-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Registration Application Not Yet Submitted
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    You have not yet completed the cost-sharing registration for non-cafeteria benefits. Please fill out the form and upload your valid registration slip.
                  </p>
                  <div className="mt-3">
                    <Button
                      onClick={handleStartOrEditRegistration}
                      className="bg-dillaNavy hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2"
                    >
                      Begin Cost-Sharing Registration Form
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Student Profile Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-dillaNavy text-white flex items-center justify-center font-bold text-base">
                  {student?.name?.charAt(0) || 'S'}
                </div>
                <div>
                  <h2 className="text-base font-bold text-dillaNavy">{student?.name}</h2>
                  <p className="text-xs text-slate-500 font-mono">Student ID: {student?.id}</p>
                </div>
              </div>

              {(isDraft || isReturned) && (
                <Button
                  onClick={handleStartOrEditRegistration}
                  variant="outline"
                  className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium"
                >
                  Edit Registration Details
                </Button>
              )}
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Campus</p>
                  <p className="text-sm font-bold text-slate-800 mt-1">{student?.campus}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Department</p>
                  <p className="text-sm font-bold text-slate-800 mt-1">{student?.department}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Academic Year</p>
                  <p className="text-sm font-bold text-slate-800 mt-1">{student?.academicYear}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Program</p>
                  <p className="text-sm font-bold text-slate-800 mt-1">{student?.program || 'Regular'}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Year of Study</p>
                  <p className="text-sm font-bold text-slate-800 mt-1">Year {student?.yearOfStudy}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cafeteria Status</p>
                  <p className="text-sm font-bold text-emerald-700 mt-1 flex items-center gap-1">
                    <Icon name="check" className="w-4 h-4 text-emerald-600" />
                    Non-Cafeteria Declared
                  </p>
                </div>
              </div>
            </div>

            {/* Document Verification Box */}
            <div className="bg-slate-50 p-5 border-t border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg border border-slate-200 text-dillaNavy">
                    <Icon name="file-text" className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Registration Slip PDF Document</p>
                    <p className="text-xs text-slate-500">Official proof of semester cost-sharing non-cafeteria status</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => window.open('/api/documents/1', '_blank')}
                    variant="outline"
                    className="border-slate-300 text-slate-700 hover:bg-white text-xs px-3 py-1.5 h-8 font-medium"
                  >
                    View Document
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