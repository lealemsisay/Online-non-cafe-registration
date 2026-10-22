import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Input, Button } from '@/components/forms'
import { StatusBadge } from '@/components/status/StatusBadge'
import Icon from '@/components/icons/Icon'
import { PDFViewer } from '@/components/pdf-viewer/PDFViewer'

const CampusDeanReview = () => {
  const navigate = useNavigate()
  const { id: paramId } = useParams()
  const location = useLocation()

  const isReturnRoute = location.pathname.includes('/dean/return')
  const searchParams = new URLSearchParams(location.search)
  const targetId = paramId || searchParams.get('id') || 'DUC2023-001'

  const [application, setApplication] = useState({
    id: targetId,
    studentId: targetId,
    studentName: 'Student Applicant',
    department: 'Computer Science',
    campus: localStorage.getItem('userCampus') || 'Main Campus',
    academicYear: '2023/2024',
    pdfUrl: '/api/documents/1',
    status: isReturnRoute ? 'return-for-correction' : 'dean-review',
    submittedAt: '2024-01-15',
    phone: '',
    email: '',
  })

  const [reviewFinding, setReviewFinding] = useState(
    isReturnRoute ? 'return-for-correction' : 'registered'
  )
  const [deanComments, setDeanComments] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Password Reset Modal State
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false)
  const [customPassword, setCustomPassword] = useState('')
  const [resettingPassword, setResettingPassword] = useState(false)

  const userCampus = localStorage.getItem('userCampus') || 'Main Campus'

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (targetId) {
      fetch(`/api/profile?id=${targetId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.student || data?.user) {
            const s = data.student || data.user
            setApplication({
              id: s.id || targetId,
              studentId: s.studentId || targetId,
              studentName: s.fullName || s.name || 'Student Applicant',
              department: s.department || 'Computer Science',
              campus: s.campus || userCampus,
              academicYear: s.academicYear || '2023/2024',
              status: s.applicationStatus || 'dean-review',
              pdfUrl: '/api/documents/1',
              submittedAt: s.createdAt || new Date().toISOString(),
              phone: s.phone || '',
              email: s.email || '',
            })
            if (s.deanReview && !isReturnRoute) {
              setReviewFinding(s.deanReview)
            }
            if (s.deanComments) {
              setDeanComments(s.deanComments)
            }
          }
        })
        .catch((err) => {
          console.error('Error loading student profile:', err)
        })
    }
  }, [targetId, isReturnRoute, userCampus])

  const handleSubmitReview = async (overrideFinding = null) => {
    setIsSubmitting(true)
    setFeedbackMsg('')
    setErrorMsg('')
    const token = localStorage.getItem('token')
    const findingToSubmit = overrideFinding || reviewFinding

    try {
      const res = await fetch('/api/review/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          applicationId: application.id || targetId,
          finding: findingToSubmit,
          comments: deanComments,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setFeedbackMsg(
          findingToSubmit === 'return-for-correction'
            ? 'Application successfully returned to student for correction.'
            : 'Review completed successfully! Application forwarded to Super Admin for final approval.'
        )
        setTimeout(() => {
          navigate('/dean')
        }, 1500)
      } else {
        setErrorMsg(data.message || 'Failed to submit review')
      }
    } catch (err) {
      console.error('Error submitting review:', err)
      setErrorMsg('Network error submitting review.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleExecutePasswordReset = async () => {
    setErrorMsg('')
    setFeedbackMsg('')
    setResettingPassword(true)
    const token = localStorage.getItem('token')

    try {
      const res = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          userId: application.id || application.studentId,
          targetUsername: application.studentId,
          newPassword: customPassword.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setFeedbackMsg(
          `Password for student '${application.studentName}' successfully reset to: ${data.resetPassword}`
        )
        setShowPasswordResetModal(false)
        setCustomPassword('')
      } else {
        setErrorMsg(data.message || 'Failed to reset student password')
      }
    } catch (e) {
      setErrorMsg('Network error while resetting password.')
    } finally {
      setResettingPassword(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Navigation header */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => navigate('/dean')}
          className="border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center gap-2 text-xs"
        >
          <Icon name="arrow-left" className="w-4 h-4" />
          Back to Dean Dashboard
        </Button>

        <Button
          variant="outline"
          onClick={() => setShowPasswordResetModal(true)}
          className="border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center gap-2 text-xs font-medium"
        >
          <Icon name="key" className="w-4 h-4 text-dillaNavy" />
          Reset Student Password
        </Button>
      </div>

      {feedbackMsg && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 p-4 rounded-md flex items-center gap-2 shadow-sm">
          <Icon name="check-circle" className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span className="text-sm font-medium">{feedbackMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-4 rounded-md flex items-center gap-2 shadow-sm">
          <Icon name="alert" className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span className="text-sm font-medium">{errorMsg}</span>
        </div>
      )}

      {/* Main Review Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Banner */}
        <div className="bg-gradient-to-r from-dillaNavy to-slate-900 text-white p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-dillaGold">
                {userCampus} Non-Cafeteria Verification
              </span>
              <h1 className="text-2xl font-bold mt-1">{application.studentName}</h1>
              <p className="text-xs text-slate-300 mt-1">
                ID: {application.studentId} • {application.department} • {application.campus}
              </p>
            </div>
            <div>
              <StatusBadge status={application.status} />
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Student Profile Info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs">
            <div>
              <p className="text-slate-500 font-semibold uppercase">Academic Year</p>
              <p className="text-slate-800 font-bold mt-0.5">{application.academicYear}</p>
            </div>
            <div>
              <p className="text-slate-500 font-semibold uppercase">Department</p>
              <p className="text-slate-800 font-bold mt-0.5">{application.department}</p>
            </div>
            <div>
              <p className="text-slate-500 font-semibold uppercase">Campus</p>
              <p className="text-slate-800 font-bold mt-0.5">{application.campus}</p>
            </div>
            <div>
              <p className="text-slate-500 font-semibold uppercase">Submitted Date</p>
              <p className="text-slate-800 font-bold mt-0.5">
                {new Date(application.submittedAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* PDF Slip Verification */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-dillaNavy flex items-center gap-2">
                <Icon name="file-text" className="w-5 h-5 text-dillaNavy" />
                Submitted Registration Slip & Documentation
              </h2>
              <span className="text-xs text-slate-500">PDF verification required</span>
            </div>

            <div className="bg-slate-100 rounded-lg p-4 border border-slate-200">
              <PDFViewer
                src={application.pdfUrl}
                loading={false}
                onDownload={() => window.open(application.pdfUrl, '_blank')}
              />
              <div className="mt-3 text-xs text-slate-600 flex items-center gap-2">
                <Icon name="info" className="w-4 h-4 text-dillaNavy" />
                <span>Verify that the document contains Student ID: <strong>{application.studentId}</strong> and official registrar stamps.</span>
              </div>
            </div>
          </div>

          {/* Dean Verification Finding */}
          <div>
            <h2 className="text-base font-bold text-dillaNavy mb-3">Dean's Verification Decision</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label
                className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                  reviewFinding === 'registered'
                    ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="reviewFinding"
                  value="registered"
                  checked={reviewFinding === 'registered'}
                  onChange={(e) => setReviewFinding(e.target.value)}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <p className="text-sm font-bold text-slate-800">Verified & Registered</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Student is authenticated, verified non-cafe, and approved to forward to Super Admin.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                  reviewFinding === 'return-for-correction'
                    ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="reviewFinding"
                  value="return-for-correction"
                  checked={reviewFinding === 'return-for-correction'}
                  onChange={(e) => setReviewFinding(e.target.value)}
                  className="mt-1 text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <p className="text-sm font-bold text-slate-800">Return for Correction</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Missing documentation or unclear slips. Student will be notified to update.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                  reviewFinding === 'not_registered'
                    ? 'border-red-500 bg-red-50/50 ring-2 ring-red-500/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="reviewFinding"
                  value="not_registered"
                  checked={reviewFinding === 'not_registered'}
                  onChange={(e) => setReviewFinding(e.target.value)}
                  className="mt-1 text-red-600 focus:ring-red-500"
                />
                <div>
                  <p className="text-sm font-bold text-slate-800">Not Registered / Disqualified</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Student is not enrolled or is already in campus cafeteria.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Dean's Comments */}
          <div>
            <label className="block text-sm font-bold text-dillaNavy mb-1">
              Campus Dean Verification Remarks & Notes
            </label>
            <textarea
              value={deanComments}
              onChange={(e) => setDeanComments(e.target.value)}
              placeholder="Enter specific verification details or correction requirements for the student..."
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dillaNavy text-sm text-slate-800"
            />
            <p className="text-xs text-slate-500 mt-1">
              Comments are recorded in the audit trail and shown to the student if returned for correction.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/dean')}
              className="w-full sm:w-auto border-slate-300 text-slate-700"
            >
              Cancel
            </Button>

            <Button
              onClick={() => handleSubmitReview('return-for-correction')}
              disabled={isSubmitting}
              className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-medium"
            >
              Return for Correction
            </Button>

            <Button
              onClick={() => handleSubmitReview()}
              disabled={isSubmitting}
              className="w-full sm:w-auto bg-dillaNavy hover:bg-slate-800 text-white font-medium shadow-sm"
            >
              {isSubmitting
                ? 'Recording Decision...'
                : reviewFinding === 'return-for-correction'
                ? 'Submit Return for Correction'
                : 'Submit & Forward to Super Admin'}
            </Button>
          </div>
        </div>
      </div>

      {/* Authorized Student Password Reset Modal */}
      {showPasswordResetModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-dillaNavy">Authorized Student Password Reset</h3>
              <button
                onClick={() => setShowPasswordResetModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 mb-4">
              <p className="font-semibold">Dean Authority Scoping:</p>
              <p className="mt-0.5">
                Resetting credentials for student <strong>{application.studentName}</strong> (
                {application.studentId}) in {application.campus}.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Custom Password (Optional)
                </label>
                <Input
                  type="text"
                  placeholder="Leave empty for auto-generated password"
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  className="w-full text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <Button
                  variant="outline"
                  onClick={() => setShowPasswordResetModal(false)}
                  className="border-slate-300 text-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleExecutePasswordReset}
                  disabled={resettingPassword}
                  className="bg-dillaNavy text-white hover:bg-slate-800"
                >
                  {resettingPassword ? 'Resetting...' : 'Confirm Reset Password'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CampusDeanReview