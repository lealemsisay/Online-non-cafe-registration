import React, { useState, useEffect } from 'react'
import Icon from '@/components/icons/Icon'
import { Input, Button, Select } from '@/components/forms'
import PassportPhotoUpload from '@/components/forms/PassportPhotoUpload'
import ChangePasswordModal from '@/components/auth/ChangePasswordModal'

const ProfilePage = () => {
  const [profile, setProfile] = useState(null)
  const [studentData, setStudentData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  // Form editable states
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    gender: 'Male',
    department: '',
    photoUrl: '',
    customValues: {},
  })

  const loadProfile = () => {
    setLoading(true)
    setError(null)
    const token = localStorage.getItem('token')
    const userId = localStorage.getItem('userId')

    fetch(`/api/profile?id=${encodeURIComponent(userId || '')}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load user profile.')
        return res.json()
      })
      .then((data) => {
        const u = data?.user || {}
        const s = data?.student || null
        setProfile(u)
        setStudentData(s)

        setFormData({
          fullName: u.fullName || u.name || '',
          email: u.email || '',
          phone: u.phone || s?.phone || '',
          gender: s?.gender || 'Male',
          department: s?.department || u.department || '',
          photoUrl: u.photoUrl || s?.photoUrl || '',
          customValues: s?.customValues || {},
        })
      })
      .catch((err) => {
        console.error('Error loading profile:', err)
        setError('Error loading profile details. Please try again.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadProfile()
  }, [])

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setMessage(null)

    const token = localStorage.getItem('token')
    const userId = localStorage.getItem('userId')

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          userId: userId,
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          gender: formData.gender,
          department: profile?.role === 'student' ? formData.department : undefined,
          photoUrl: formData.photoUrl,
          customValues: formData.customValues,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setMessage('Your profile has been updated successfully!')
        setIsEditing(false)
        if (formData.fullName) {
          localStorage.setItem('userName', formData.fullName)
        }
        loadProfile()
      } else {
        setError(data.message || 'Failed to update profile.')
      }
    } catch (err) {
      console.error('Save profile error:', err)
      setError('Network error saving profile changes.')
    } finally {
      setSaving(false)
    }
  }

  const role = profile?.role || localStorage.getItem('userRole') || 'student'
  const isStudent = role === 'student'
  const isDean = role === 'dean'
  const isAdmin = role === 'admin'

  const roleTitle = isAdmin
    ? 'Super Administrator Profile'
    : isDean
    ? 'Campus Dean Profile'
    : 'Student Account & Dossier'

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header Banner */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-dillaDarkGreen via-[#12442c] to-dillaGreen text-white p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            {/* Passport Photo Frame */}
            <div className="w-28 h-36 rounded-xl bg-white/10 border-2 border-white/30 overflow-hidden shadow-lg flex-shrink-0 flex items-center justify-center bg-slate-100">
              {formData.photoUrl ? (
                <img
                  src={formData.photoUrl}
                  alt={profile?.fullName || 'User'}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 p-2">
                  <Icon name="user" className="w-12 h-12 text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase mt-1">
                    No Photo
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="text-xs uppercase tracking-wider font-bold text-dillaGold">
                  {roleTitle}
                </span>
                <span className="text-white/40">•</span>
                <span className="text-xs text-emerald-200 font-medium">
                  {profile?.campus || 'Dilla University'}
                </span>
              </div>

              <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1 truncate">
                {profile?.fullName || profile?.name || 'User Profile'}
              </h1>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mt-2">
                <span className="font-mono text-xs font-bold bg-black/25 text-emerald-100 px-3 py-1 rounded-md border border-white/10">
                  ID: {profile?.username || profile?.studentId || '-'}
                </span>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-dillaGold text-dillaDarkGreen uppercase tracking-wider">
                  {role === 'admin' ? 'Super Admin' : role === 'dean' ? 'Campus Dean' : 'Student'}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 flex-shrink-0 w-full sm:w-auto">
              {!isEditing ? (
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="gold"
                  className="text-xs font-bold px-4 py-2 flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Icon name="edit" className="w-3.5 h-3.5 text-dillaDarkGreen" />
                  <span>Edit Profile</span>
                </Button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-xs font-semibold text-white/90 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(true)}
                className="px-4 py-2 text-xs font-semibold text-emerald-100 hover:text-white bg-black/20 hover:bg-black/30 border border-white/10 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Icon name="key" className="w-3.5 h-3.5 text-dillaGold" />
                <span>Change Password</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {message && (
        <div className="bg-emerald-50 border-l-4 border-emerald-600 text-emerald-900 text-xs sm:text-sm p-4 rounded-xl flex items-center justify-between shadow-2xs">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="text-emerald-700 hover:text-emerald-950 font-bold ml-4">✕</button>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-900 text-xs sm:text-sm p-4 rounded-xl flex items-center justify-between shadow-2xs">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-700 hover:text-rose-950 font-bold ml-4">✕</button>
        </div>
      )}

      {/* Profile Form / Details Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
        <form onSubmit={handleSaveProfile} className="space-y-6">
          {/* Photo upload section (Only in Edit Mode) */}
          {isEditing && (
            <div className="border-b border-slate-200 pb-6">
              <PassportPhotoUpload
                photoUrl={formData.photoUrl}
                studentId={profile?.username || profile?.studentId}
                onPhotoUploaded={(url) => setFormData((prev) => ({ ...prev, photoUrl: url }))}
                label="Update Profile / Passport Photograph"
              />
            </div>
          )}

          {/* Personal Information Section */}
          <div>
            <h3 className="text-xs font-bold text-dillaDarkGreen uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
              <Icon name="user" className="w-4 h-4 text-dillaGold" />
              Account & Personal Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name
                </label>
                {isEditing ? (
                  <Input
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                    className="h-10 text-slate-900"
                  />
                ) : (
                  <p className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900">
                    {profile?.fullName || profile?.name || '-'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Address
                </label>
                {isEditing ? (
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-10 text-slate-900"
                  />
                ) : (
                  <p className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900">
                    {profile?.email || 'Not specified'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Phone Number
                </label>
                {isEditing ? (
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+251-9XX-XXXXXX"
                    className="h-10 text-slate-900"
                  />
                ) : (
                  <p className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900">
                    {formData.phone || 'Not specified'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Assigned Campus (Institutional)
                </label>
                <p className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600">
                  {profile?.campus || 'Main Campus'} (Protected)
                </p>
              </div>
            </div>
          </div>

          {/* Student Specific Registration Fields */}
          {isStudent && (
            <div>
              <h3 className="text-xs font-bold text-dillaDarkGreen uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                <Icon name="book-open" className="w-4 h-4 text-dillaGold" />
                Academic Registration Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Department
                  </label>
                  <p className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900">
                    {studentData?.department || profile?.department || '-'}
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Program
                  </label>
                  <p className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900">
                    {studentData?.program || 'Regular Degree'}
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Academic Year
                  </label>
                  <p className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900">
                    {studentData?.academicYear || '2023/2024'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Save Action Buttons (Only in Edit Mode) */}
          {isEditing && (
            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <Button
                type="submit"
                disabled={saving}
                variant="primary"
                className="font-bold text-xs px-5 py-2"
              >
                {saving ? 'Saving Updates...' : 'Save Profile Changes'}
              </Button>
            </div>
          )}
        </form>
      </div>

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  )
}

export default ProfilePage
