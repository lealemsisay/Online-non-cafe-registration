import React, { useState, useRef, useEffect } from 'react'
import { Input, Button, Select } from '@/components/forms'
import Icon from '@/components/icons/Icon'

const RegistrationForm = ({
  initialData = {},
  onSubmit,
  onUpload,
  studentId,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    studentId: studentId || initialData?.studentId || '',
    fullName: initialData?.fullName || '',
    gender: initialData?.gender || 'Male',
    campus: initialData?.campus || 'Main Campus',
    department: initialData?.department || 'Computer Science',
    program: initialData?.program || 'Regular Degree',
    yearOfStudy: initialData?.yearOfStudy || '1',
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    academicYear: initialData?.academicYear || '2023/2024',
    isNonCafeteria: initialData?.isNonCafeteria !== false,
    declaration: false,
    pdfFileName: 'cost_sharing_registration_slip.pdf',
  })

  const [campusList, setCampusList] = useState(['Main Campus', 'Odaya Campus', 'Haru Campus'])
  const [academicYears, setAcademicYears] = useState(['2023/2024', '2024/2025'])
  const [uploadProgress, setUploadProgress] = useState(100)
  const [uploadError, setUploadError] = useState(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({
        ...prev,
        ...initialData,
        studentId: studentId || initialData.studentId || prev.studentId,
        isNonCafeteria: true,
      }))
    }
  }, [initialData, studentId])

  useEffect(() => {
    // Fetch live campuses and academic years
    const token = localStorage.getItem('token')
    fetch('/api/campuses', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.campuses && data.campuses.length > 0) {
          setCampusList(data.campuses.map((c) => c.name))
        }
      })
      .catch(() => {})

    fetch('/api/settings', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.academicYears && data.academicYears.length > 0) {
          setAcademicYears(data.academicYears)
        }
      })
      .catch(() => {})
  }, [])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleFileChange = (file) => {
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setUploadError('Only PDF registration slips are accepted')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size exceeds the 5MB limit')
      return
    }

    setUploadError(null)
    setUploadProgress(20)
    setFormData((prev) => ({ ...prev, pdfFileName: file.name }))

    // Simulate reliable upload
    const timer = setInterval(() => {
      setUploadProgress((p) => {
        if (p >= 100) {
          clearInterval(timer)
          setUploadSuccess(true)
          if (onUpload) onUpload(file)
          return 100
        }
        return p + 40
      })
    }, 150)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setUploadError(null)

    if (!formData.studentId || !formData.fullName) {
      setUploadError('Student ID and Full Name are required.')
      return
    }

    if (!formData.declaration) {
      setUploadError(
        'Please confirm and check the non-cafeteria student declaration checkbox below.'
      )
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white shadow-sm rounded-xl p-8 border border-slate-200 max-w-3xl mx-auto">
      {/* Form Header */}
      <div className="text-center pb-6 border-b border-slate-200 mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-dillaNavy text-white flex items-center justify-center font-bold text-xs">
            DU
          </div>
          <span className="text-xs uppercase tracking-wider font-bold text-dillaNavy">
            Dilla University Registrar
          </span>
        </div>
        <h1 className="text-2xl font-bold text-dillaNavy">
          Cost-Sharing Registration Application
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Official enrollment form for Non-Cafeteria cost-sharing beneficiaries
        </p>
      </div>

      {uploadError && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-4 rounded-md mb-6 flex items-center gap-2 text-sm shadow-sm">
          <Icon name="alert" className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Academic & Identity Information */}
        <div>
          <h2 className="text-sm font-bold text-dillaNavy uppercase tracking-wider mb-3">
            1. Student Identification
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Student ID / Admission Number *
              </label>
              <Input
                name="studentId"
                type="text"
                placeholder="e.g. DUC2023-001"
                value={formData.studentId}
                onChange={handleChange}
                required
                className="w-full text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Full Name *
              </label>
              <Input
                name="fullName"
                type="text"
                placeholder="First Middle Last"
                value={formData.fullName}
                onChange={handleChange}
                required
                className="w-full text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Gender *
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-dillaNavy text-sm"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Campus *
              </label>
              <select
                name="campus"
                value={formData.campus}
                onChange={handleChange}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-dillaNavy text-sm"
              >
                {campusList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Academic Program */}
        <div>
          <h2 className="text-sm font-bold text-dillaNavy uppercase tracking-wider mb-3">
            2. Academic Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Department *
              </label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-dillaNavy text-sm"
              >
                <option value="Computer Science">Computer Science</option>
                <option value="Information Technology">Information Technology</option>
                <option value="Software Engineering">Software Engineering</option>
                <option value="Business Administration">Business Administration</option>
                <option value="Economics">Economics</option>
                <option value="Civil Engineering">Civil Engineering</option>
                <option value="Medicine & Health Sciences">Medicine & Health Sciences</option>
                <option value="Law">Law</option>
                <option value="Agriculture & Natural Resources">Agriculture</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Program Type *
              </label>
              <select
                name="program"
                value={formData.program}
                onChange={handleChange}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-dillaNavy text-sm"
              >
                <option value="Regular Degree">Regular Degree</option>
                <option value="Continuing Education">Continuing Education</option>
                <option value="Postgraduate Degree">Postgraduate</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Year of Study *
              </label>
              <select
                name="yearOfStudy"
                value={formData.yearOfStudy}
                onChange={handleChange}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-dillaNavy text-sm"
              >
                <option value="1">Year 1</option>
                <option value="2">Year 2</option>
                <option value="3">Year 3</option>
                <option value="4">Year 4</option>
                <option value="5">Year 5</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Academic Year *
              </label>
              <select
                name="academicYear"
                value={formData.academicYear}
                onChange={handleChange}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-dillaNavy text-sm"
              >
                {academicYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Phone Number
              </label>
              <Input
                name="phone"
                type="tel"
                placeholder="+251 9..."
                value={formData.phone}
                onChange={handleChange}
                className="w-full text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <Input
                name="email"
                type="email"
                placeholder="student@du.edu.et"
                value={formData.email}
                onChange={handleChange}
                className="w-full text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Document Upload */}
        <div>
          <h2 className="text-sm font-bold text-dillaNavy uppercase tracking-wider mb-2">
            3. Verification Document Upload (PDF)
          </h2>
          <p className="text-xs text-slate-500 mb-3">
            Please attach your official registration slip issued by the registrar.
          </p>

          <input
            type="file"
            ref={fileRef}
            accept=".pdf,application/pdf"
            onChange={(e) => handleFileChange(e.target.files?.[0])}
            className="hidden"
          />

          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-dillaNavy rounded-xl p-6 text-center cursor-pointer transition-all hover:bg-slate-50"
          >
            <div className="w-12 h-12 rounded-full bg-blue-50 text-dillaNavy flex items-center justify-center mx-auto mb-2">
              <Icon name="upload" className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">
              {formData.pdfFileName
                ? `Attached: ${formData.pdfFileName}`
                : 'Click to upload registration slip (PDF)'}
            </p>
            <p className="text-xs text-slate-400 mt-1">Maximum file size: 5MB</p>

            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="mt-3 w-48 mx-auto bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-dillaNavy h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            )}
          </div>
        </div>

        {/* Official Declaration */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="isNonCafeteria"
              checked={formData.isNonCafeteria}
              onChange={handleChange}
              className="mt-1 w-4 h-4 text-dillaNavy rounded border-slate-300 focus:ring-dillaNavy"
            />
            <span className="text-xs text-slate-700 font-medium">
              I certify that I am a registered <strong>Non-Cafeteria student</strong> who does not consume meals at the university dining hall and am applying for the monthly cost-sharing subsistence allowance.
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer pt-2 border-t border-slate-200">
            <input
              type="checkbox"
              name="declaration"
              checked={formData.declaration}
              onChange={handleChange}
              className="mt-1 w-4 h-4 text-dillaNavy rounded border-slate-300 focus:ring-dillaNavy"
            />
            <span className="text-xs text-slate-700 font-bold">
              I hereby declare that all information entered is true and accurate. I understand that falsification will lead to disciplinary action and loss of university cost-sharing allowances. *
            </span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-slate-200">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel || (() => (window.location.href = '/'))}
            className="w-full sm:w-auto border-slate-300 text-slate-700"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto bg-dillaNavy hover:bg-slate-800 text-white font-medium shadow-sm px-6"
          >
            {isSubmitting ? 'Submitting Application...' : 'Submit Application for Review'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default RegistrationForm