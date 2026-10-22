import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Input, Button } from '@/components/forms'
import Icon from '@/components/icons/Icon'

const LoginPage = () => {
  const [studentId, setStudentId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ studentId: studentId.trim(), password }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        setError(errorData.message || 'Login failed')
        setLoading(false)
        return
      }

      const data = await response.json()
      localStorage.setItem('token', data.token)
      localStorage.setItem('userRole', data.user.role)
      localStorage.setItem('userName', data.user.name)
      localStorage.setItem('userCampus', data.user.campus || '')
      localStorage.setItem('userId', data.user.id)
      localStorage.setItem('studentId', data.user.studentId || '')
      localStorage.setItem('userEmail', data.user.email || '')

      if (data.user.role === 'student') {
        window.location.href = '/'
      } else if (data.user.role === 'dean') {
        window.location.href = '/dean'
      } else if (data.user.role === 'admin') {
        window.location.href = '/admin'
      }
    } catch (err) {
      setError('Server error. Please try again.')
      setLoading(false)
    }
  }

  const fillQuickAccount = (id, pw) => {
    setStudentId(id)
    setPassword(pw)
    setError('')
  }

  return (
    <div className="min-h-screen bg-dillaGray flex items-center justify-center p-4">
      <div className="bg-white shadow-2xl rounded-2xl w-full max-w-md p-6 sm:p-8 border border-gray-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-dillaNavy flex items-center justify-center shadow-xs">
            <Icon className="w-6 h-6 text-dillaGold" name="building" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-dillaNavy leading-none">
              DILLA UNIVERSITY
            </h1>
            <span className="text-[11px] text-gray-500 font-medium tracking-wide uppercase">
              Online Cost-Sharing Portal
            </span>
          </div>
        </div>
        
        <h2 className="text-lg font-semibold text-dillaNavy mb-5 text-center border-b border-gray-100 pb-3">
          Sign In to Your Account
        </h2>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 text-sm p-3.5 rounded-lg mb-5 animate-shake">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Username, Student ID, or Email
            </label>
            <Input
              type="text"
              placeholder="e.g. admin, dean, student, or DUC2023-001"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-dillaNavy"
                aria-label="Toggle password visibility"
              >
                {showPassword ? '👁️' : '🙈'}
              </button>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full py-2.5 mt-2">
            {loading ? 'Authenticating...' : 'Sign In'}
          </Button>
        </form>

        {/* Development Quick-Fill Helper Chips */}
        <div className="mt-5 pt-4 border-t border-gray-100">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 text-center">
            Quick Dev Test Logins
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => fillQuickAccount('admin', 'admin@123')}
              className="px-2 py-1.5 text-xs bg-purple-50 text-purple-800 hover:bg-purple-100 rounded-lg border border-purple-200 font-medium transition-colors"
            >
              Super Admin
            </button>
            <button
              type="button"
              onClick={() => fillQuickAccount('dean', 'dean@123')}
              className="px-2 py-1.5 text-xs bg-blue-50 text-blue-800 hover:bg-blue-100 rounded-lg border border-blue-200 font-medium transition-colors"
            >
              Campus Dean
            </button>
            <button
              type="button"
              onClick={() => fillQuickAccount('student', 'student@123')}
              className="px-2 py-1.5 text-xs bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-lg border border-emerald-200 font-medium transition-colors"
            >
              Student
            </button>
          </div>
        </div>

        <div className="mt-5 space-y-2 text-center text-xs">
          <div>
            <button
              type="button"
              onClick={() => setShowForgotModal(true)}
              className="text-gray-500 hover:text-dillaNavy transition-colors font-medium cursor-pointer"
            >
              Forgot password or need a reset?
            </button>
          </div>
          <div className="pt-2 border-t border-gray-100 text-sm text-gray-700">
            Non-cafeteria student?{' '}
            <Link
              to="/register"
              className="text-dillaNavy font-semibold hover:text-dillaGold transition-colors inline-flex items-center gap-1"
            >
              Self-Register here →
            </Link>
          </div>
        </div>
      </div>

      {/* Forgot Password Information Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full p-6 relative">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1"
            >
              ✕
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-dillaNavy/10 text-dillaNavy rounded-xl">
                <Icon name="sliders-horizontal" className="w-5 h-5 text-dillaNavy" />
              </div>
              <h3 className="text-lg font-bold text-dillaNavy">Password Reset Policy</h3>
            </div>
            <div className="text-xs text-gray-600 space-y-2.5 leading-relaxed">
              <p>
                In compliance with university security policy, password resets follow a role hierarchy:
              </p>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
                <p><strong>Students:</strong> Your Campus Dean or Super Admin can reset your password.</p>
                <p><strong>Campus Deans:</strong> Contact the University Super Admin to reset your dean account.</p>
                <p><strong>Super Admin:</strong> System administrator level reset authorized.</p>
              </div>
              <p className="text-gray-500">
                For development testing, standard dev passwords are: <code>role@123</code> (e.g., <code>admin@123</code>, <code>dean@123</code>, <code>student@123</code>).
              </p>
            </div>
            <Button
              onClick={() => setShowForgotModal(false)}
              className="w-full mt-5 bg-dillaNavy text-white"
            >
              Got it
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default LoginPage