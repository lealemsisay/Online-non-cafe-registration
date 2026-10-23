import React, { useState } from 'react'
import { Input, Button } from '@/components/forms'
import Icon from '@/components/icons/Icon'

const ChangePasswordModal = ({ isOpen, onClose }) => {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

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

      setSuccess('Password changed successfully! You can now use your new password.')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => {
        onClose()
        setSuccess('')
      }, 1800)
    } catch (err) {
      setError('Network error while changing password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setError('')
    setSuccess('')
    setOldPassword('')
    setNewPassword('')
    setConfirmPassword('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 sm:p-7 relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 font-bold text-lg cursor-pointer"
          aria-label="Close dialog"
        >
          ✕
        </button>

        <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-3">
          <div className="p-2.5 bg-dillaGreen/10 text-dillaGreen rounded-xl">
            <Icon name="key" className="w-5 h-5 text-dillaGreen" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-dillaDarkGreen font-serif">Change Account Password</h3>
            <p className="text-xs text-slate-500">Update your university portal credentials</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-xs sm:text-sm p-3.5 rounded-xl shadow-2xs">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 text-xs sm:text-sm p-3.5 rounded-xl shadow-2xs">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Current Password
            </label>
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter current password"
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
              placeholder="Enter new strong password"
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
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="text-slate-900"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
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

          <div className="flex items-center gap-3 pt-3 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1 font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              variant="primary"
              className="flex-1 font-bold shadow-md"
            >
              {loading ? 'Updating...' : 'Save Password'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ChangePasswordModal
