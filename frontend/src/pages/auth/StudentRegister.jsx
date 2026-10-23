import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Input, Button, Select } from '@/components/forms'
import Icon from '@/components/icons/Icon'
import Footer from '@/components/layout/Footer'

const StudentRegister = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    fullName: '',
    studentId: '',
    username: '',
    email: '',
    campus: 'Main Campus',
    department: 'Computer Science',
    gender: 'Male',
    program: 'Regular Degree',
    yearOfStudy: '1',
    phone: '',
    password: '',
    confirmPassword: '',
  })

  const [campuses, setCampuses] = useState(['Main Campus', 'Odaya Campus', 'Haru Campus'])
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetch('/api/campuses')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.campuses && data.campuses.length > 0) {
          setCampuses(data.campuses.map((c) => c.name))
        }
      })
      .catch(() => {})
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'studentId' && !prev.username ? { username: value } : {}),
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please verify your password entry.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'student', // strictly enforced
          fullName: formData.fullName.trim(),
          studentId: formData.studentId.trim(),
          username: (formData.username || formData.studentId).trim(),
          email: formData.email.trim(),
          campus: formData.campus,
          department: formData.department,
          gender: formData.gender,
          program: formData.program,
          yearOfStudy: formData.yearOfStudy,
          phone: formData.phone.trim(),
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Registration failed. Please check your data.')
        setLoading(false)
        return
      }

      // Auto login on successful registration
      if (data.token && data.user) {
        localStorage.setItem('token', data.token)
        localStorage.setItem('userRole', 'student')
        localStorage.setItem('userName', data.user.name || formData.fullName)
        localStorage.setItem('userCampus', data.user.campus || formData.campus)
        localStorage.setItem('userId', data.user.id)
        localStorage.setItem('studentId', data.user.studentId || formData.studentId)
        localStorage.setItem('userEmail', data.user.email || formData.email)

        setSuccess('Account created successfully! Redirecting to student portal...')
        setTimeout(() => {
          window.location.href = '/'
        }, 1200)
      } else {
        setSuccess('Account created! Please sign in with your credentials.')
        setTimeout(() => {
          navigate('/login')
        }, 1500)
      }
    } catch (err) {
      setError('Network error during registration. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8faf9] flex flex-col justify-between">
      {/* Top Banner */}
      <div className="bg-dillaDarkGreen text-white py-2 px-4 sm:px-8 border-b-2 border-dillaGold shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-dillaGold font-serif font-bold text-xs sm:text-sm">
              ዲላ ዩኒቨርሲቲ • DILLA UNIVERSITY
            </span>
            <span className="text-white/40 hidden sm:inline">|</span>
            <span className="text-[11px] text-emerald-200 italic hidden sm:inline">
              "University of the Green Land"
            </span>
          </div>
          <div className="text-[11px] text-white/80 hidden md:flex items-center gap-3">
            <span>Student Admission & Registrar Directorate</span>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 my-6">
        <div className="bg-white shadow-xl rounded-2xl w-full max-w-2xl border border-slate-200 overflow-hidden">
          {/* Card Header */}
          <div className="bg-gradient-to-r from-dillaDarkGreen via-[#12442c] to-dillaGreen p-6 text-white text-center border-b border-dillaGold/40">
            <div className="w-14 h-14 rounded-2xl bg-white p-1.5 mx-auto mb-2 shadow-md flex items-center justify-center">
              <img
                src="/dilla-logo.png"
                alt="Dilla University Emblem"
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-white">
              DILLA UNIVERSITY
            </h1>
            <p className="text-xs font-serif text-dillaGold mt-0.5 font-medium">
              Student Cost-Sharing Self-Registration
            </p>
          </div>

          <div className="p-6 sm:p-8">
            <div className="bg-emerald-50 border-l-4 border-dillaGreen p-3.5 rounded-lg mb-6 text-xs text-emerald-950 flex items-start gap-2.5">
              <Icon name="info" className="w-4 h-4 text-dillaGreen flex-shrink-0 mt-0.5" />
              <div>
                <strong>Notice:</strong> This registration form is for regular undergraduate and postgraduate students applying for non-cafeteria cost-sharing subsistence verification. Administrative roles (Deans/Super Admins) must be provisioned centrally.
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-800 p-3.5 rounded-lg mb-6 text-xs sm:text-sm flex items-start gap-2 shadow-2xs">
                <Icon name="alert-circle" className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 p-3.5 rounded-lg mb-6 text-xs sm:text-sm flex items-start gap-2 shadow-2xs">
                <Icon name="check-circle" className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Full Student Name *
                  </label>
                  <Input
                    name="fullName"
                    placeholder="e.g. Abebe Bikila"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Student ID / Admission No. *
                  </label>
                  <Input
                    name="studentId"
                    placeholder="e.g. DUC2024-001"
                    value={formData.studentId}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Username for Login *
                  </label>
                  <Input
                    name="username"
                    placeholder="Choose username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <Input
                    name="email"
                    type="email"
                    placeholder="student@du.edu.et"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Campus *
                  </label>
                  <Select
                    name="campus"
                    options={campuses}
                    value={formData.campus}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Department *
                  </label>
                  <Select
                    name="department"
                    options={[
                      'Computer Science',
                      'Information Technology',
                      'Software Engineering',
                      'Business & Economics',
                      'Civil Engineering',
                      'Electrical Engineering',
                      'Medicine & Health Sciences',
                      'Nursing',
                      'Natural & Computational Sciences',
                      'Law',
                      'Agriculture & Natural Resources',
                    ]}
                    value={formData.department}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Gender *
                  </label>
                  <Select
                    name="gender"
                    options={['Male', 'Female']}
                    value={formData.gender}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Year of Study *
                  </label>
                  <Select
                    name="yearOfStudy"
                    options={['1', '2', '3', '4', '5']}
                    value={formData.yearOfStudy}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <Input
                    name="phone"
                    type="tel"
                    placeholder="+251 9..."
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Password (min 6 characters) *
                  </label>
                  <Input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create secure password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Confirm Password *
                  </label>
                  <Input
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                    className="rounded border-slate-300 text-dillaGreen focus:ring-dillaGold"
                  />
                  <span>Show password characters</span>
                </label>
              </div>

              <Button
                type="submit"
                disabled={loading}
                variant="primary"
                className="w-full mt-3 py-2.5 text-sm font-bold shadow-md"
              >
                {loading ? 'Creating Student Profile...' : 'Complete Registration & Access Portal'}
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-200 text-center text-xs text-slate-600">
              Already have an active student account?{' '}
              <Link
                to="/login"
                className="font-bold text-dillaGreen hover:text-dillaDarkGreen hover:underline ml-1"
              >
                Sign In to Portal
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Footer compact />
    </div>
  )
}

export default StudentRegister
