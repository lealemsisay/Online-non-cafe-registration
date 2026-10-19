import React, { useState, useEffect } from 'react'
import { Input } from '@/components/forms'
import { Button } from '@/components/forms'
import { StatusBadge } from '@/components/status/StatusBadge'
import Icon from '@/components/icons/Icon'
import { PDFViewer } from '@/components/pdf-viewer/PDFViewer'

const CampusDeanReview = () => {
  const url = new URL(window.location.href)
  const pathnameParts = window.location.pathname.split('/').filter(Boolean)
  const routeId = pathnameParts.length >= 3 && pathnameParts[1] === 'review' ? pathnameParts[2] : null
  const applicationId = url.searchParams.get('id') || routeId || 'DUC2023-001'

  const [application, setApplication] = useState({
    id: applicationId,
    studentId: applicationId,
    studentName: 'Student Applicant',
    department: 'Computer Science',
    campus: localStorage.getItem('userCampus') || 'Main Campus',
    academicYear: '2023/2024',
    pdfUrl: '/api/documents/1',
    status: 'dean-review',
    submittedAt: '2024-01-15',
  })

  const [reviewFinding, setReviewFinding] = useState('registered')
  const [deanComments, setDeanComments] = useState('')
  const [isReviewing, setIsReviewing] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (applicationId) {
      fetch(`/api/profile?id=${applicationId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.student || data?.user) {
            const s = data.student || data.user
            setApplication((prev) => ({
              ...prev,
              id: s.id || applicationId,
              studentId: s.studentId || applicationId,
              studentName: s.fullName || s.name || 'Student Applicant',
              department: s.department || 'Computer Science',
              campus: s.campus || 'Main Campus',
              academicYear: s.academicYear || '2023/2024',
              status: s.applicationStatus || 'dean-review',
            }))
            if (s.deanReview) setReviewFinding(s.deanReview)
            if (s.deanComments) setDeanComments(s.deanComments)
          }
        })
        .catch(() => {})
    }
  }, [applicationId])

  const handleCompleteReview = async () => {
    setIsReviewing(true)
    setFeedbackMsg('')
    const token = localStorage.getItem('token')
    try {
      const res = await fetch('/api/review/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          applicationId: application.id || applicationId,
          finding: reviewFinding,
          comments: deanComments,
        }),
      })
      if (res.ok) {
        setFeedbackMsg('Review recorded successfully! Returning to dashboard...')
      }
    } catch (err) {
      console.error('Error submitting review:', err)
    }

    setTimeout(() => {
      setIsReviewing(false)
      window.location.href = '/dean'
    }, 1200)
  }

  return (
    <div className="bg-white shadow-2xl rounded-2xl p-8 border border-gray-200 max-w-4xl mx-auto">
      {feedbackMsg && (
        <div className="mb-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded">
          {feedbackMsg}
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-dillaNavy">
            Application Review: {application.studentName}
          </h2>
          <p className="text-dillaGray">
            Student ID: {application.studentId} • {application.department} • {application.campus}
          </p>
        </div>
        <StatusBadge status={application.status} />
      </div>

      <div className="grid grid-cols-1 gap-6 mb-8">
        <div>
          <h3 className="text-lg font-medium text-dillaNavy mb-3">PDF Verification</h3>
          
          <div className="bg-dillaGray rounded-lg p-4 h-64">
            <PDFViewer
              src={application.pdfUrl}
              loading={true}
              onDownload={() => window.open(application.pdfUrl, '_blank')}
            />
            <div className="mt-3 text-sm text-dillaTeal">
              PDF must contain Student ID: {application.studentId}
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-dillaNavy mb-3">Review Findings</h3>
          
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="registered"
                  checked={reviewFinding === 'registered'}
                  onChange={(e) => setReviewFinding(e.target.value)}
                  className="rounded border-gray-300 focus:ring-dillaGold"
                />
                <span>Registered</span>
              </label>
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="not_registered"
                  checked={reviewFinding === 'not_registered'}
                  onChange={(e) => setReviewFinding(e.target.value)}
                  className="rounded border-gray-300 focus:ring-dillaGold"
                />
                <span>Not Registered</span>
              </label>
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="unable_to_verify"
                  checked={reviewFinding === 'unable_to_verify'}
                  onChange={(e) => setReviewFinding(e.target.value)}
                  className="rounded border-gray-300 focus:ring-dillaGold"
                />
                <span>Unable to Verify</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-dillaNavy mb-3">Dean's Comments</h3>
        <textarea
          value={deanComments}
          onChange={(e) => setDeanComments(e.target.value)}
          placeholder="Enter your review comments regarding the student's registration status..."
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dillaGold focus:border-dillaGold resize-none text-sm"
        />
      </div>

      <div className="mt-8 pt-8 border-t border-gray-100">
        <Button
          onClick={handleCompleteReview}
          disabled={isReviewing}
          className="w-full"
        >
          {isReviewing ? 'Recording review...' : 'Complete Review and Forward to Super Admin'}
        </Button>
      </div>
    </div>
  )
}

export default CampusDeanReview