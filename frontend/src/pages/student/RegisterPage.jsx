import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import RegistrationForm from './RegistrationForm'

const RegisterPage = () => {
  const navigate = useNavigate()
  const studentId = localStorage.getItem('studentId') || localStorage.getItem('userId') || 'DUC2023-001'
  const userName = localStorage.getItem('userName') || ''
  const userCampus = localStorage.getItem('userCampus') || 'Main Campus'
  const token = localStorage.getItem('token')

  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

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
      }, 1500)
    } catch (err) {
      console.error(err)
      setError('Network error submitting registration')
    }
  }

  const handleUpload = async (file) => {
    // PDF upload handled
    console.log('PDF file attached:', file.name)
  }

  return (
    <div className="py-6">
      {message && (
        <div className="max-w-2xl mx-auto mb-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded">
          {message}
        </div>
      )}
      {error && (
        <div className="max-w-2xl mx-auto mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
          {error}
        </div>
      )}
      <RegistrationForm
        studentId={studentId}
        initialData={{
          fullName: userName,
          campus: userCampus,
          academicYear: '2023/2024',
          isNonCafeteria: true,
        }}
        onSubmit={handleSubmit}
        onUpload={handleUpload}
        onFileChange={(f) => console.log('File changed', f?.name)}
      />
    </div>
  )
}

export default RegisterPage
