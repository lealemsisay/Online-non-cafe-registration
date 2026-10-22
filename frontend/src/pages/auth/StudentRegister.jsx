import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Input, Button, Select } from '@/components/forms'
import Icon from '@/components/icons/Icon'

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

  const [campuses, setCampuses] = useState(['Main Campus', 'Kakamega Campus', 'Eldoret Campus'])
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
      // Default username to studentId if username not manually set
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
      setError('Passwords do not match.')
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
          fullName: formData.fullName,
          studentId: formData.studentId,
          username: formData.username || formData.studentId,
          email: formData.email,
          campus: formData.campus,
          department: formData.department,
          gender: formData.gender,
          program: formData.program,
          yearOfStudy: formData.yearOfStudy,
          phone: formData.phone,
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Registration failed')
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

        setSuccess('Account created successfully! Logging you in...')
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
    <div className="min-h-screen bg-dillaGray flex items-center justify-center p-4 py-8">
      <div className="bg-white shadow-2xl rounded-2xl w-full max-w-xl p-6 sm:p-8 border border-gray-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-dillaNavy flex items-center justify-center shadow-xs">
            <Icon className="w-6 h-6 text-dillaGold" name="building" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-dillaNavy leading-none">
              DILLA UNIVERSITY
            </h1>
            <span className="text-xs text-gray-500 font-medium tracking-wide">
              Student Self-Registration Portal
            </span>
          </div>
        </div>

        <div className="bg-blue-50 border-l-4 border-dillaNavy text-dillaNavy p-3.5 rounded-lg mb-6 text-xs sm:text-sm">
          <strong>Notice:</strong> This registration portal is for prospective and current non-cafeteria students applying for cost-sharing registration. Campus Dean and Super Admin accounts cannot be created here.
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3.5 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-3.5 rounded-lg mb-6 text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Full Name *
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
              <label className="block text-xs font-semibold text-gray-700 mb-1">
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
              <label className="block text-xs font-semibold text-gray-700 mb-1">
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
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Email Address
              </label>
              <Input
                name="email"
                type="email"
                placeholder="student@dilla.edu.et"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
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
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Department *
              </label>
              <Select
                name="department"
                options={[
                  'Computer Science',
                  'Information Technology',
                  'Business & Economics',
                  'Engineering & Technology',
                  'Health Sciences',
                  'Natural & Computational Sciences',
                  'Social Sciences & Humanities',
                  'Law',
                  'Agriculture',
                ]}
                value={formData.department}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Gender</label>
              <Select
                name="gender"
                options={['Male', 'Female']}
                value={formData.gender}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Year of Study</label>
              <Select
                name="yearOfStudy"
                options={['1', '2', '3', '4', '5']}
                value={formData.yearOfStudy}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Phone</label>
              <Input
                name="phone"
                type="tel"
                placeholder="+251-9..."
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Password (min 6 characters) *
              </label>
              <div className="relative">
                <Input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Confirm Password *
              </label>
              <div className="relative">
                <Input
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-600">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                className="rounded border-gray-300 text-dillaNavy focus:ring-dillaGold"
              />
              <span>Show password</span>
            </label>
          </div>

          <Button type="submit" disabled={loading} className="w-full mt-2 py-2.5">
            {loading ? 'Creating Student Account...' : 'Complete Self-Registration'}
          </Button>
        </form>

        <div className="mt-6 pt-5 border-t border-gray-200 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-dillaNavy hover:text-dillaGold transition-colors">
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  )
}

export default StudentRegister
