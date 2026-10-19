import React, { useState, useRef } from 'react'
import { Input } from '@/components/forms'
import { Button } from '@/components/forms'
import { Select } from '@/components/forms'
import { StatusBadge } from '@/components/status/StatusBadge'
import Icon from '@/components/icons/Icon'

const RegistrationForm = ({
  initialData,
  onSubmit,
  onUpload,
  onFileChange,
  studentId
}) => {
  const [formData, setFormData] = useState({
    studentId: studentId || '',
    fullName: initialData?.fullName || '',
    gender: initialData?.gender || 'Male',
    campus: initialData?.campus || '',
    department: initialData?.department || '',
    program: initialData?.program || '',
    yearOfStudy: initialData?.yearOfStudy || '1',
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    academicYear: initialData?.academicYear || '',
    isNonCafeteria: initialData?.isNonCafeteria || false,
    declaration: false,
    pdfFile: null,
  })

  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState(null)
  const fileRef = useRef(null)

  const handleChange = (e) => {
    const { name, value, files, type } = e.target
    if (type === 'file') {
      onFileChange(files?.[0])
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }))
    }
  }

  const handleFileChange = (file) => {
    if (!file) {
      setUploadError('No file selected')
      return
    }

    if (!file.type || !file.type.includes('application/pdf')) {
      setUploadError('Please upload a PDF file only')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size must be less than 5MB')
      return
    }

    setUploadProgress(0)
    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 99) {
          clearInterval(interval)
          return 100
        }
        return prev + 1
      })
    }, 30)

    // Real upload would go here
    setTimeout(() => {
      clearInterval(interval)
      setUploadProgress(100)
      setUploadError(null)
      onUpload(file)
    }, 1500)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.declaration) {
      setUploadError('Please accept the declaration')
      return
    }
    onSubmit(formData)
  }

  return (
    <div className="bg-white shadow-2xl rounded-2xl p-8 border border-gray-200 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-dillaNavy mb-6 text-center">
        Cost-Sharing Registration Form
      </h2>

      {uploadError && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded mb-4">
          {uploadError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          name="studentId"
          type="text"
          placeholder="Student ID / Admission Number"
          value={formData.studentId}
          onChange={handleChange}
          required
        />

        <Input
          name="fullName"
          placeholder="Full Name"
          value={formData.fullName}
          onChange={handleChange}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            name="gender"
            placeholder="Gender"
            value={formData.gender}
            onChange={handleChange}
            required
          />
          <Select
            name="yearOfStudy"
            placeholder="Year of Study"
            options={['1', '2', '3', '4', '5']}
            value={formData.yearOfStudy}
            onChange={handleChange}
          />
        </div>

        <Input
          name="campus"
          placeholder="Campus"
          value={formData.campus}
          onChange={handleChange}
          required
        />

        <Input
          name="department"
          placeholder="Department"
          value={formData.department}
          onChange={handleChange}
          required
        />

        <Input
          name="program"
          placeholder="Program"
          value={formData.program}
          onChange={handleChange}
          required
        />

        <Input
          name="phone"
          placeholder="Phone Number"
          value={formData.phone}
          onChange={handleChange}
          type="tel"
        />

        <Input
          name="email"
          placeholder="Email Address"
          value={formData.email}
          onChange={handleChange}
          type="email"
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            name="academicYear"
            placeholder="Academic Year"
            value={formData.academicYear}
            onChange={handleChange}
            required
          />
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isNonCafeteria}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  isNonCafeteria: e.target.checked,
                }))}
                className="rounded border-gray-300 focus:ring-dillaGold"
              />
              <span className="text-gray-700">I declare I am a non-cafeteria student</span>
            </label>
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="file"
              ref={fileRef}
              accept=".pdf"
              onChange={(e) => handleFileChange(e.target.files?.[0])}
              className="hidden"
            />
            <div
              className="flex items-center gap-2 px-4 py-2 border-2 border-dillaNavy/20 rounded hover:border-dillaNavy cursor-pointer"
            >
              <Icon className="w-5 h-5 text-dillaGold" name="upload" />
              <span>
                PDF Registration Slip Upload
                {formData.pdfFile && (
                  <div className="text-sm text-dillaTeal">
                    {formData.pdfFile.name}
                  </div>
                )}
              </span>
            </div>
          </label>
        </div>

        {formData.pdfFile && (
          <div className="mt-4 p-3 bg-dillaGray rounded-lg">
            <p className="text-sm text-dillaTeal">
              PDF must contain your Student ID/admission number and cost-sharing registration information
            </p>
          </div>
        )}

        <div className="mt-6">
          <Button type="submit" disabled={uploadProgress < 100} className="w-full">
            {uploadProgress > 0 ? `Uploading... ${uploadProgress}%` : 'Submit Application'}
          </Button>
        </div>

        {!uploadProgress && (
          <Button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-2 w-full text-sm text-dillaNavy border border-dillaNavy rounded mt-2"
          >
            Upload PDF
          </Button>
        )}

        {uploadError && (
          <p className="mt-2 text-sm text-red-600">
            {uploadError}
          </p>
        )}
      </form>
    </div>
  )
}

export default RegistrationForm