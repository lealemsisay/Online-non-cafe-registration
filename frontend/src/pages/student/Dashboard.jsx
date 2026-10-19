import React, { useState, useEffect } from 'react'
import { Input } from '@/components/forms'
import { Button } from '@/components/forms'
import { StatusBadge } from '@/components/status/StatusBadge'
import Icon from '@/components/icons/Icon'

const StudentDashboard = () => {
  const [student, setStudent] = useState(null)
  const [applicationStatus, setApplicationStatus] = useState('draft')
  const [reviewFeedback, setReviewFeedback] = useState('')
  const [showProfile, setShowProfile] = useState(false)

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
          if (data?.user) {
            const studentInfo = {
              id: data.student?.studentId || data.user.studentId || data.user.username || userId,
              name: data.student?.fullName || data.user.fullName || data.user.name || userName || 'Demo Student',
              campus: data.student?.campus || data.user.campus || userCampus || 'Main Campus',
              department: data.student?.department || 'Computer Science',
              academicYear: data.student?.academicYear || '2023/2024',
              registrationStatus: data.student?.registrationStatus || 'submitted',
              applicationStatus: data.student?.applicationStatus || 'submitted',
              approvalStatus: data.student?.approvalStatus || 'pending',
            }
            setStudent(studentInfo)
            setApplicationStatus(studentInfo.applicationStatus || 'submitted')
            setShowProfile(true)
          } else {
            setStudent({
              id: localStorage.getItem('studentId') || 'DUC2023-001',
              name: userName || 'Demo Student',
              campus: userCampus || 'Main Campus',
              department: 'Computer Science',
              academicYear: '2023/2024',
            })
          }
        })
        .catch(() => {
          setStudent({
            id: localStorage.getItem('studentId') || 'DUC2023-001',
            name: userName || 'Demo Student',
            campus: userCampus || 'Main Campus',
            department: 'Computer Science',
            academicYear: '2023/2024',
          })
        })
    }
  }, [])

  const handleStartRegistration = () => {
    window.location.href = '/student/register'
  }

  const handleSubmitApplication = () => {
    window.location.href = '/student/register'
  }

  return (
    <div className="min-h-screen bg-dillaGray p-6 sm:p-8">
      {showProfile ? (
        <div className="max-w-md mx-auto bg-white shadow-2xl rounded-2xl p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-dillaNavy mb-6 text-center">
            {student ? `Welcome, ${student.name}` : 'Cost-Sharing Registration'}
          </h2>
          
          {student && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-gray-600 small">Student ID</p>
                <p className="font-medium">{student.id || ''}</p>
              </div>
              <div>
                <p className="text-gray-600 small">Campus</p>
                <p className="font-medium">{student.campus || ''}</p>
              </div>
              <div>
                <p className="text-gray-600 small">Department</p>
                <p className="font-medium">{student.department || ''}</p>
              </div>
              <div>
                <p className="text-gray-600 small">Academic Year</p>
                <p className="font-medium">{student.academicYear || ''}</p>
              </div>
            </div>
          )}

          <div>
            <p className="text-gray-600 small">Current Status</p>
            <StatusBadge status={applicationStatus} />
          </div>

          <Button
            onClick={handleSubmitApplication}
            disabled={applicationStatus !== 'draft'}
            className="mt-4"
          >
            {applicationStatus === 'draft' ? 'Start Registration' : 'Submit Application'}
          </Button>

          <Button
            onClick={() => setShowProfile(false)}
            className="mt-2 w-full text-sm text-dillaNavy border border-dillaNavy rounded mt-4"
          >
            Cancel
          </Button>
        </div>
      ) : (
        <div className="max-w-md mx-auto py-12">
          <h1 className="text-3xl font-bold text-dillaNavy mb-4 text-center">
            Dilla University
          </h1>
          <h2 className="text-xl text-dillaGray mb-8 text-center">Cost-Sharing Registration System</h2>

          <div className="bg-white shadow rounded-2xl p-8 text-center">
            <Icon className="w-12 h-12 text-dillaGold mb-4" name="user-check" />
            <h3 className="text-2xl font-bold text-dillaNavy mb-2">Student Registration</h3>
            <p className="text-dillaGray mb-4">
              Welcome non-cafeteria students! Please complete the registration form below to apply for cost-sharing benefits.
            </p>
            <Button onClick={handleStartRegistration} className="mt-6 w-full">
              Begin Registration
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default StudentDashboard