import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Input, Button } from '@/components/forms'
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
      setError('Your session has expired or authentication is required. Please sign in to continue.')
    }
  }, [])

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

      if (data.user.role === 'student') {
        window.location.href = '/'
      } else if (data.user.role === 'dean') {
        window.location.href = '/dean'
      } else if (data.user.role === 'admin' || data.user.role === 'viceDean') {
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
    <div className="min-h-screen bg-[#f8faf9] flex flex-col justify-between">
      {/* Official Top University Header Bar */}
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
          <div className="text-[11px] text-white/80 hidden md:flex items-center gap-4">
            <span>Official Academic Portal</span>
            <span>•</span>
            <span>P.O. Box 419, Dilla</span>
            <span>•</span>
            <a href="https://www.du.edu.et" target="_blank" rel="noopener noreferrer" className="text-dillaGold hover:underline">
              du.edu.et ↗
            </a>
          </div>
        </div>
      </div>

      {/* Main Login Container */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 my-6">
        <div className="bg-white shadow-xl rounded-2xl w-full max-w-lg border border-slate-200 overflow-hidden">
          {/* Card Banner */}
          <div className="bg-gradient-to-r from-dillaDarkGreen via-[#12442c] to-dillaGreen p-6 text-white text-center border-b border-dillaGold/40">
            <div className="w-16 h-16 rounded-2xl bg-white p-1.5 mx-auto mb-3 shadow-md flex items-center justify-center">
              <img
                src="/dilla-logo.png"
                alt="Dilla University Official Emblem"
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-white">
              DILLA UNIVERSITY
            </h1>
            <p className="text-xs font-serif text-dillaGold mt-0.5 font-medium">
              ዲላ ዩኒቨርሲቲ • The Green Earth University
            </p>
            <div className="mt-2 inline-block px-3 py-1 bg-black/20 rounded-full border border-white/10">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-emerald-100">
                Online Cost-Sharing Registration System
              </span>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="mb-6 text-center">
              <h2 className="text-lg font-bold text-slate-800">
                Portal Authentication
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter your credentials to access your student or administrative dashboard
              </p>
            </div>

            {error && (
              <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-xs sm:text-sm p-3.5 rounded-lg mb-5 flex items-start gap-2 shadow-2xs">
                <Icon name="alert-circle" className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Username, Student ID, or Email *
                </label>
                <Input
                  type="text"
                  placeholder="e.g. DUC2023-001, dean, admin, or email"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  required
                  className="h-10 text-slate-900"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Password *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-xs text-dillaGreen hover:text-dillaDarkGreen font-semibold hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter account password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-10 text-slate-900 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-dillaGreen text-xs font-semibold p-1"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                variant="primary"
                className="w-full py-2.5 mt-2 text-sm font-bold shadow-md"
              >
                {loading ? 'Authenticating...' : 'Sign In to Portal'}
              </Button>
            </form>

            {/* Development Quick-Fill Helper Chips */}
            <div className="mt-6 pt-5 border-t border-slate-200">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5 text-center flex items-center justify-center gap-1.5">
                <Icon name="key" className="w-3.5 h-3.5 text-dillaGold" />
                Quick Test Role Logins (Development)
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => fillQuickAccount('admin', 'admin@123')}
                  className="px-2 py-1.5 text-xs bg-purple-50 text-purple-900 hover:bg-purple-100 rounded-lg border border-purple-200 font-bold transition-all text-center shadow-2xs cursor-pointer"
                >
                  Super Admin
                </button>
                <button
                  type="button"
                  onClick={() => fillQuickAccount('dean', 'dean@123')}
                  className="px-2 py-1.5 text-xs bg-blue-50 text-blue-900 hover:bg-blue-100 rounded-lg border border-blue-200 font-bold transition-all text-center shadow-2xs cursor-pointer"
                >
                  Campus Dean
                </button>
                <button
                  type="button"
                  onClick={() => fillQuickAccount('student', 'student@123')}
                  className="px-2 py-1.5 text-xs bg-emerald-50 text-emerald-900 hover:bg-emerald-100 rounded-lg border border-emerald-200 font-bold transition-all text-center shadow-2xs cursor-pointer"
                >
                  Student
                </button>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 text-center text-xs text-slate-600">
              Applying as a new Non-Cafeteria student beneficiary?{' '}
              <Link
                to="/register"
                className="font-bold text-dillaGreen hover:text-dillaDarkGreen hover:underline inline-flex items-center gap-0.5 ml-1"
              >
                Self-Register here →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 relative">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 font-bold text-lg"
            >
              ✕
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-dillaGreen/10 text-dillaGreen rounded-xl flex items-center justify-center">
                <Icon name="key" className="w-5 h-5 text-dillaGreen" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-dillaDarkGreen">Password Reset Policy</h3>
                <p className="text-xs text-slate-500">Dilla University Authorization Hierarchy</p>
              </div>
            </div>
            <div className="text-xs text-slate-700 space-y-2.5 leading-relaxed">
              <p>
                In compliance with university security standards, password resets follow role authority:
              </p>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <p>
                  <strong className="text-emerald-900 font-bold">Students:</strong> Contact your Campus Dean or the University Super Admin for authorized password resets.
                </p>
                <p>
                  <strong className="text-blue-900 font-bold">Campus Deans:</strong> Contact the University Super Admin to reset your dean account credentials.
                </p>
                <p>
                  <strong className="text-purple-900 font-bold">Super Admin:</strong> System administrator authorized password reset.
                </p>
              </div>
              <p className="text-slate-500 text-[11px]">
                For development testing, standard dev passwords are: <code>admin@123</code>, <code>dean@123</code>, <code>student@123</code>.
              </p>
            </div>
            <Button
              onClick={() => setShowForgotModal(false)}
              className="w-full mt-5"
              variant="primary"
            >
              Understood
            </Button>
          </div>
        </div>
      )}

      {/* Footer */}
      <Footer compact />
    </div>
  )
}

export default LoginPage
