import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input, Button } from '@/components/forms'
import Icon from '@/components/icons/Icon'

const ChangePasswordPage = () => {
  const navigate = useNavigate()
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!oldPassword || !newPassword) {
      setError('Current password and new password are required.')
      return
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.')
      return
    }

    setLoading(true)
    const token = localStorage.getItem('token')

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          oldPassword,
          newPassword,
          confirmPassword,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || 'Failed to change password')
        setLoading(false)
        return
      }

      localStorage.removeItem('mustChangePassword')
      setSuccess('Password changed successfully! Redirecting to your dashboard...')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')

      setTimeout(() => {
        const role = localStorage.getItem('userRole')
        if (role === 'admin' || role === 'viceDean') navigate('/admin', { replace: true })
        else if (role === 'dean') navigate('/dean', { replace: true })
        else navigate('/', { replace: true })
      }, 1500)
    } catch (err) {
      setError('Network error while changing password. Please try again.')
      setLoading(false)
    }
  }

  const userName = localStorage.getItem('userName') || 'User'

  return (
    <div className="min-h-screen bg-[#f8faf9] flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="bg-white shadow-xl rounded-2xl w-full max-w-md border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-dillaDarkGreen via-[#12442c] to-dillaGreen p-6 text-white text-center border-b border-dillaGold/40">
          <div className="w-16 h-16 rounded-2xl bg-white p-1.5 mx-auto mb-3 shadow-md flex items-center justify-center">
            <Icon name="key" className="w-full h-full text-dillaGreen" />
          </div>
          <h1 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-white">
            First-Time Password Change
          </h1>
          <p className="text-xs font-serif text-dillaGold mt-0.5 font-medium">
            DILLA UNIVERSITY - Online Cost-Sharing Registration System
          </p>
        </div>

        <div className="p-6 sm:p-8">
          <div className="mb-6 text-center">
            <h2 className="text-lg font-bold text-slate-800">Change Your Password</h2>
            <p className="text-xs text-slate-500 mt-1">
              Hello, <strong>{userName}</strong>. You are logging in for the first time with your initial
              credentials. Please set a new password before accessing your dashboard.
            </p>
          </div>

          {error && (
            <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-xs sm:text-sm p-3.5 rounded-lg mb-5 flex items-start gap-2 shadow-2xs">
              <Icon name="alert-circle" className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 text-xs sm:text-sm p-3.5 rounded-lg mb-5 flex items-start gap-2 shadow-2xs">
              <Icon name="check-circle" className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Current Password (your Student ID)
              </label>
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your current password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
                className="text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                New Password (min 6 characters)
              </label>
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Confirm New Password
              </label>
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Re-enter your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="text-slate-900"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-600 pt-1">
              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="rounded border-slate-300 text-dillaGreen focus:ring-dillaGold"
                />
                <span>Show password characters</span>
              </label>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <Button
                type="submit"
                disabled={loading}
                variant="primary"
                className="w-full font-bold shadow-md"
              >
                {loading ? 'Updating...' : 'Change Password & Continue'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ChangePasswordPage
