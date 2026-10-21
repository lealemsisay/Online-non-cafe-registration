import React, { useState } from 'react'
import { Input } from '@/components/forms'
import { Button } from '@/components/forms'
import Icon from '@/components/icons/Icon'

const LoginPage = () => {
  const [studentId, setStudentId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-dillaGray via-white to-dillaTeal/10 flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white shadow-2xl rounded-2xl w-full max-w-md p-6 sm:p-8 border-2 border-dillaNavy/20 border-t-4 border-t-dillaGold">
        <div className="flex items-center gap-3 mb-8">
          <Icon className="w-6 h-6 text-dillaGold" name="building" />
          <h1 className="text-2xl font-bold text-dillaNavy">DILLA UNIVERSITY</h1>
        </div>
        
        <h2 className="text-xl font-semibold text-dillaNavy mb-6 text-center">Cost-Sharing Registration</h2>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded mb-6 animate-shake">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="student-id" className="block text-sm font-semibold text-dillaNavy">
              Student ID, Username, or Email
            </label>
            <Input
              id="student-id"
              type="text"
              placeholder="Enter your ID or email"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              required
              autoComplete="username"
              className="w-full px-4 py-3 border border-dillaNavy/25 bg-dillaNavy/5 rounded-lg text-dillaDarkGray placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-dillaTeal focus:border-dillaTeal transition-colors"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-semibold text-dillaNavy">
              Password
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 pr-12 border border-dillaTeal/30 bg-dillaTeal/5 rounded-lg text-dillaDarkGray placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-dillaTeal focus:border-dillaTeal transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-dillaNavy"
                aria-label="Toggle password visibility"
              >
                {showPassword ? '👁️' : '🙈'}
              </button>
            </div>
          </div>

          <div className="flex justify-center pt-1">
            <Button
              type="submit"
              disabled={loading}
              className="w-full sm:w-2/3 bg-dillaNavy text-white hover:bg-dillaTeal focus:ring-dillaTeal"
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </div>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <a href="#" className="text-dillaNavy hover:text-dillaGold transition-colors">Forgot password?</a>
        </div>
      </div>
    </div>
  )
}

export default LoginPage