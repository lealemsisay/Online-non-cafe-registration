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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full p-6 relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1 rounded-lg"
          aria-label="Close dialog"
        >
          ✕
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 bg-dillaNavy/10 text-dillaNavy rounded-xl">
            <Icon name="sliders-horizontal" className="w-5 h-5 text-dillaNavy" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-dillaNavy">Change Password</h3>
            <p className="text-xs text-gray-500">Update your account login password</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm p-3 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border-l-4 border-green-500 text-green-700 text-sm p-3 rounded-lg">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Current Password
            </label>
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter current password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              New Password (min 6 characters)
            </label>
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter new strong password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Confirm New Password
            </label>
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center justify-between text-xs text-gray-600 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                className="rounded border-gray-300 text-dillaNavy focus:ring-dillaGold"
              />
              <span>Show passwords</span>
            </label>
          </div>

          <div className="flex items-center gap-3 pt-3">
            <Button
              type="button"
              onClick={handleClose}
              className="flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-dillaNavy text-white hover:bg-opacity-95"
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
