import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Icon from '@/components/icons/Icon'
import Footer from '@/components/layout/Footer'

const LoginPage = () => {
  const [studentId, setStudentId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('session') === 'expired') {
      setError('Your session has expired. Please sign in again.')
    }
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: studentId.trim(), password }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        setError(errorData.message || 'Login failed. Please check your credentials.')
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
      localStorage.setItem('profileComplete', data.user.profileComplete === true ? 'true' : 'false')

      if (data.requiresPasswordChange || data.user.forcePasswordChange || data.user.mustChangePassword) {
        localStorage.setItem('mustChangePassword', 'true')
        window.location.href = '/change-password'
        setLoading(false)
        return
      }

      if (data.user.role === 'student' && data.user.profileComplete !== true) {
        window.location.href = '/profile-completion'
        setLoading(false)
        return
      }

      if (data.user.role === 'student') {
        window.location.href = '/'
      } else if (data.user.role === 'dean' || data.user.role === 'viceDean') {
        window.location.href = '/dean'
      } else if (data.user.role === 'admin') {
        window.location.href = '/admin'
      }
    } catch (err) {
      setError('Server connection error. Please try again later.')
      setLoading(false)
    }
  }

  const fillQuickAccount = (id, pw) => {
    setStudentId(id)
    setPassword(pw)
    setError('')
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#f4f6f4' }}>
      {/* ── Top University Header Bar ── */}
      <header style={{ backgroundColor: '#1a6b3a' }} className="shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between">
          {/* Logo + Name */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md overflow-hidden flex-shrink-0">
              <img
                src="/dilla-logo.png"
                alt="Dilla University"
                className="w-10 h-10 object-contain"
              />
            </div>
            <div className="leading-tight">
              <div className="text-white font-bold text-base sm:text-lg tracking-wide" style={{ fontFamily: 'serif' }}>
                DILLA UNIVERSITY
              </div>
              <div className="text-yellow-300 text-xs sm:text-sm font-medium" style={{ fontFamily: 'serif' }}>
                ዲላ ዩኒቨርሲቲ
              </div>
            </div>
          </div>

          {/* Right side info */}
          <div className="hidden md:flex items-center gap-6 text-xs text-green-100">
            <span className="italic text-green-200">"University of the Green Land"</span>
            <span className="text-yellow-300 font-semibold">Cost-Sharing Portal</span>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 flex items-center justify-center py-10 px-4">
        <div className="w-full max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">

            {/* ── Left Column: Description ── */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-6">
              {/* Welcome text */}
              <div className="text-slate-700 text-sm sm:text-base leading-relaxed max-w-sm">
                <span
                  className="float-left text-6xl font-bold mr-2 leading-none"
                  style={{ color: '#8B0000', fontFamily: 'Georgia, serif', lineHeight: '0.8' }}
                >
                  T
                </span>
                <span style={{ color: '#1a6b3a' }}>
                  his portal is designed to provide cost-sharing registration
                  services for students, campus deans, and administrative staff
                  at Dilla University.
                </span>
              </div>

              {/* DU Circular Seal */}
              <div className="flex flex-col items-center gap-2 mt-4">
                <div
                  className="rounded-full overflow-hidden border-4 shadow-xl"
                  style={{ borderColor: '#1a6b3a', width: 200, height: 200 }}
                >
                  <img
                    src="/dilla-logo.png"
                    alt="Dilla University Seal"
                    className="w-full h-full object-contain bg-white p-2"
                  />
                </div>
                <p className="text-xs text-slate-500 italic font-medium mt-1">
                  UNIVERSITY OF THE GREEN LAND
                </p>
              </div>

              {/* Register link */}
              <p className="text-xs text-slate-600 mt-2">
                New Non-Cafeteria student?{' '}
                <Link
                  to="/register"
                  className="font-bold hover:underline"
                  style={{ color: '#1a6b3a' }}
                >
                  Self-Register here →
                </Link>
              </p>
            </div>

            {/* ── Right Column: Login Form ── */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              {/* Card top accent */}
              <div style={{ backgroundColor: '#1a6b3a' }} className="h-2 w-full" />

              <div className="p-8">
                <h2 className="text-xl font-bold text-slate-800 mb-1 text-center">
                  Login to your account
                </h2>
                <p className="text-xs text-slate-500 text-center mb-6">
                  Enter your credentials to access the portal
                </p>

                {error && (
                  <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-sm p-3 rounded-lg mb-5 flex items-start gap-2">
                    <Icon name="alert-circle" className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                  {/* Username field */}
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <Icon name="user" className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      placeholder="User name"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                      style={{ '--tw-ring-color': '#1a6b3a' }}
                    />
                  </div>

                  {/* Password field */}
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <Icon name="lock" className="w-5 h-5" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-10 pr-12 py-3 border border-slate-300 rounded-lg text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                      style={{ '--tw-ring-color': '#1a6b3a' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-semibold"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>

                  {/* Forgot password */}
                  <div className="text-right -mt-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                      className="text-xs font-semibold hover:underline cursor-pointer"
                      style={{ color: '#1a6b3a' }}
                    >
                      Forgot password?
                    </button>
                  </div>

                  {/* Login button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 text-white font-bold rounded-lg text-sm transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                    style={{ backgroundColor: loading ? '#2d8a56' : '#1a6b3a' }}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Signing in...
                      </span>
                    ) : (
                      'Login'
                    )}
                  </button>
                </form>

                {/* Quick Dev Logins */}
                <div className="mt-6 pt-5 border-t border-slate-200">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 text-center flex items-center justify-center gap-1.5">
                    <Icon name="key" className="w-3.5 h-3.5 text-yellow-500" />
                    Quick Test Logins (Dev)
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => fillQuickAccount('admin', 'admin@123')}
                      className="px-2 py-1.5 text-xs bg-purple-50 text-purple-900 hover:bg-purple-100 rounded-lg border border-purple-200 font-bold transition-all cursor-pointer"
                    >
                      Super Admin
                    </button>
                    <button
                      type="button"
                      onClick={() => fillQuickAccount('dean', 'dean@123')}
                      className="px-2 py-1.5 text-xs bg-blue-50 text-blue-900 hover:bg-blue-100 rounded-lg border border-blue-200 font-bold transition-all cursor-pointer"
                    >
                      Campus Dean
                    </button>
                    <button
                      type="button"
                      onClick={() => fillQuickAccount('vicedean', 'vicedean@123')}
                      className="px-2 py-1.5 text-xs bg-teal-50 text-teal-900 hover:bg-teal-100 rounded-lg border border-teal-200 font-bold transition-all cursor-pointer"
                    >
                      Vice Dean
                    </button>
                    <button
                      type="button"
                      onClick={() => fillQuickAccount('student', 'student@123')}
                      className="px-2 py-1.5 text-xs bg-emerald-50 text-emerald-900 hover:bg-emerald-100 rounded-lg border border-emerald-200 font-bold transition-all cursor-pointer"
                    >
                      Student
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* ── Forgot Password Modal ── */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 relative">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 font-bold text-lg cursor-pointer"
            >
              ✕
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: '#e8f5ef' }}
              >
                <Icon name="key" className="w-5 h-5" style={{ color: '#1a6b3a' }} />
              </div>
              <div>
                <h3 className="text-lg font-bold" style={{ color: '#0d3d22' }}>Password Reset Policy</h3>
                <p className="text-xs text-slate-500">Dilla University Authorization Hierarchy</p>
              </div>
            </div>
            <div className="text-xs text-slate-700 space-y-2.5 leading-relaxed">
              <p>Password resets follow role authority:</p>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <p>
                  <strong className="text-emerald-900">Students:</strong> Contact your Campus Dean or the University Super Admin.
                </p>
                <p>
                  <strong className="text-blue-900">Campus Deans / Vice Deans:</strong> Contact the University Super Admin.
                </p>
                <p>
                  <strong className="text-purple-900">Super Admin:</strong> System administrator authorized password reset.
                </p>
              </div>
              <p className="text-slate-400 text-[11px]">
                Dev passwords: <code>admin@123</code>, <code>dean@123</code>, <code>vicedean@123</code>, <code>student@123</code>
              </p>
            </div>
            <button
              onClick={() => setShowForgotModal(false)}
              className="w-full mt-5 py-2.5 text-white font-bold rounded-lg text-sm transition-all cursor-pointer"
              style={{ backgroundColor: '#1a6b3a' }}
            >
              Understood
            </button>
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <Footer compact />
    </div>
  )
}

export default LoginPage
