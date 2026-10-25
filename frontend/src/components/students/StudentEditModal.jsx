import React, { useState, useEffect } from 'react'
import Icon from '@/components/icons/Icon'
import { Input, Button, Select } from '@/components/forms'
import PassportPhotoUpload from '@/components/forms/PassportPhotoUpload'

const StudentEditModal = ({
  isOpen,
  onClose,
  student,
  onStudentUpdated,
  userRole = 'admin',
}) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    department: '',
    program: '',
    yearOfStudy: '1',
    campus: '',
    gender: 'Male',
    photoUrl: '',
    isNonCafeteria: true,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (student) {
      setFormData({
        fullName: student.fullName || student.name || student.studentName || '',
        email: student.email || '',
        phone: student.phone || '',
        department: student.department || 'Computer Science',
        program: student.program || 'Regular Degree',
        yearOfStudy: student.yearOfStudy || '1',
        campus: student.campus || 'Main Campus',
        gender: student.gender || 'Male',
        photoUrl: student.photoUrl || '',
        isNonCafeteria: student.isNonCafeteria !== false,
      })
      setError(null)
    }
  }, [student, isOpen])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, loading, onClose])

  if (!isOpen || !student) return null

  const studentIdentifier = student.studentId || student.username || student.id

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const token = localStorage.getItem('token')

    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          id: studentIdentifier,
          name: formData.fullName,
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          department: formData.department,
          program: formData.program,
          yearOfStudy: formData.yearOfStudy,
          campus: formData.campus,
          gender: formData.gender,
          photoUrl: formData.photoUrl,
          isNonCafeteria: formData.isNonCafeteria,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        if (onStudentUpdated) {
          onStudentUpdated({
            ...student,
            ...formData,
          })
        }
        onClose()
      } else {
        setError(data.message || 'Failed to update student record.')
      }
    } catch (err) {
      console.error('Update error:', err)
      setError('Network error occurred while saving student changes.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col relative overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        <div className="bg-gradient-to-r from-dillaDarkGreen to-dillaGreen text-white p-5 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="font-serif text-lg sm:text-xl font-bold">
              Edit Student Record
            </h3>
            <p className="text-xs text-emerald-100 font-mono mt-0.5">
              ID: {studentIdentifier} • {student.fullName || student.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Icon name="x" className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 font-medium">
              <Icon name="alert-circle" className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Photo Management */}
          <PassportPhotoUpload
            photoUrl={formData.photoUrl}
            studentId={studentIdentifier}
            onPhotoUploaded={(url) => setFormData((prev) => ({ ...prev, photoUrl: url }))}
            label="Passport Photograph"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Student Name
              </label>
              <Input
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
                className="h-10 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email Address
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="h-10 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Phone Number
              </label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+251-9XX-XXXXXX"
                className="h-10 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Gender
              </label>
              <Select
                name="gender"
                options={['Male', 'Female']}
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Department
              </label>
              <Select
                name="department"
                options={[
                  'Computer Science',
                  'Information Technology',
                  'Business & Economics',
                  'Civil Engineering',
                  'Electrical Engineering',
                  'Medicine & Health Sciences',
                  'Agriculture',
                  'Law',
                ]}
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Program Stream
              </label>
              <Select
                name="program"
                options={['Regular Degree', 'Extension', 'Weekend', 'Summer']}
                value={formData.program}
                onChange={(e) => setFormData({ ...formData, program: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Year of Study
              </label>
              <Select
                name="yearOfStudy"
                options={['1', '2', '3', '4', '5']}
                value={formData.yearOfStudy}
                onChange={(e) => setFormData({ ...formData, yearOfStudy: e.target.value })}
              />
            </div>

            {userRole === 'admin' ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Campus Assignment
                </label>
                <Select
                  name="campus"
                  options={['Main Campus', 'Odaya Campus', 'Haru Campus', 'Health Campus']}
                  value={formData.campus}
                  onChange={(e) => setFormData({ ...formData, campus: e.target.value })}
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Campus (Fixed)
                </label>
                <Input
                  value={formData.campus}
                  disabled
                  className="h-10 bg-slate-100 text-slate-500 cursor-not-allowed"
                />
              </div>
            )}
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isNonCafeteria}
                onChange={(e) => setFormData({ ...formData, isNonCafeteria: e.target.checked })}
                className="w-4 h-4 rounded text-dillaGreen focus:ring-dillaGold"
              />
              <span>Non-Cafeteria Cost-Sharing Subsidy Eligible</span>
            </label>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <Button
              type="submit"
              disabled={loading}
              variant="primary"
              className="font-bold text-xs"
            >
              {loading ? 'Saving Changes...' : 'Save Student Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default StudentEditModal
