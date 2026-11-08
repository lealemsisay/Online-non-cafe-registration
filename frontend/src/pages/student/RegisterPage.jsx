import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import RegistrationForm from './RegistrationForm'
import Icon from '@/components/icons/Icon'

const RegisterPage = () => {
  const navigate = useNavigate()
  const studentId = localStorage.getItem('studentId') || localStorage.getItem('userId') || 'DUC2023-001'
  const userName = localStorage.getItem('userName') || ''
  const userCampus = localStorage.getItem('userCampus') || 'Main Campus'
  const token = localStorage.getItem('token')

  // Check if user is already logged in (imported student)
  const hasToken = !!token

  const [initialData, setInitialData] = useState({
    studentId,
    fullName: userName,
    campus: userCampus,
    academicYear: '2023/2024',
    isNonCafeteria: true,
  })

  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    // If user is already logged in (has token from import), redirect to dashboard
    if (hasToken) {
      navigate('/dashboard')
      return
    }
  }, [navigate, hasToken])

  useEffect(() => {
    if (studentId) {
      fetch(`/api/profile?id=${studentId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.student || data?.user) {
            const s = data.student || data.user
            setInitialData({
              studentId: s.studentId || studentId,
              fullName: s.fullName || s.name || userName,
              gender: s.gender || 'Male',
              campus: s.campus || userCampus,
              department: s.department || 'Computer Science',
              program: s.program || 'Regular Degree',
              yearOfStudy: s.yearOfStudy || '1',
              academicYear: s.academicYear || '2023/2024',
              phone: s.phone || '',
              email: s.email || '',
              photoUrl: s.photoUrl || '',
              customValues: s.customValues || data.customValues || {},
              isNonCafeteria: true,
            })
          }
        })
        .catch(() => {})
    }
  }, [studentId, userName, userCampus, token])

  const handleSubmit = async (formData) => {
    setError(null)
    setMessage(null)
    try {
      const response = await fetch('/api/student/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()
      if (!response.ok) {
        setError(data.message || 'Registration failed')
        return
      }

      setMessage('Registration application submitted successfully! Redirecting to student portal...')
      setTimeout(() => {
        navigate('/')
      }, 1200)
    } catch (err) {
      console.error(err)
      setError('Network error submitting registration')
    }
  }

  const handleUpload = async (file) => {
    console.log('PDF file attached:', file.name)
  }

  return (
    <div className="py-4 space-y-4">
      {!hasToken && (
        <div className="bg-white shadow-xl rounded-2xl p-8 sm:p-10 border border-slate-200 max-w-2xl mx-auto">
          <div className="bg-dillaDarkGreen text-white p-6 text-center mb-8">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-3 shadow-lg border border-slate-200 flex items-center justify-center">
              <Icon name="lock" className="w-8 h-8 text-white" />
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold">
              Student Registration Disabled
            </h1>
            <p className="text-white/80 mt-2 text-lg">
              Student self-registration has been disabled. Student accounts must be imported by an authorized Admin or Super Admin.
            </p>
          </div>

          {error && (
            <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-900 p-4 rounded-xl mb-6 flex items-center gap-2">
              <Icon name="alert-circle" className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="bg-emerald-50 border-l-4 border-emerald-600 text-emerald-900 p-4 rounded-xl mb-6 flex items-center gap-2">
              <Icon name="check-circle" className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>{message}</span>
            </div>
          )}
        </div>
      )}

      {hasToken && (
        <RegistrationForm
          studentId={studentId}
          initialData={initialData}
          onSubmit={handleSubmit}
          onUpload={handleUpload}
          onCancel={() => navigate('/')}
        />
      )}
    </div>
  )
}

export default RegisterPage
