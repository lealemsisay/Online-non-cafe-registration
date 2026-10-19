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
    <div className="min-h-screen bg-dillaGray flex items-center justify-center p-4">
      <div className="bg-white shadow-2xl rounded-2xl w-full max-w-md p-8 border border-gray-200">
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

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            type="text"
            placeholder="Student ID, Username, or Email"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            required
          />
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
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

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Logging in...' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <a href="#" className="text-dillaNavy hover:text-dillaGold transition-colors">Forgot password?</a>
        </div>
      </div>
    </div>
  )
}

export default LoginPage