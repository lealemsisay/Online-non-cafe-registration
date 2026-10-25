import React, { useState, useRef, useEffect } from 'react'
import { Input, Button } from '@/components/forms'
import Icon from '@/components/icons/Icon'
import PassportPhotoUpload from '@/components/forms/PassportPhotoUpload'

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
    photoUrl: initialData?.photoUrl || '',
  })

  // Dynamic Custom Fields
  const [customFields, setCustomFields] = useState([])
  const [customValues, setCustomValues] = useState(initialData?.customValues || {})

  const defaultDepartments = [
    'Computer Science',
    'Information Technology',
    'Software Engineering',
    'Business Administration',
    'Economics',
    'Civil Engineering',
    'Electrical Engineering',
    'Medicine & Health Sciences',
    'Nursing',
    'Law',
    'Agriculture & Natural Resources',
  ]
  const defaultBatches = ['2021', '2022', '2023', '2024', '2025', '2026']
  const defaultPrograms = ['Regular Degree', 'Continuing Education', 'Postgraduate Degree']

  const [campusList, setCampusList] = useState(['Main Campus', 'Odaya Campus', 'Haru Campus'])
  const [academicYears, setAcademicYears] = useState(['2023/2024', '2024/2025'])
  const [departmentsList, setDepartmentsList] = useState(defaultDepartments)
  const [batchesList, setBatchesList] = useState(defaultBatches)
  const [programsList, setProgramsList] = useState(defaultPrograms)
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
      if (initialData.customValues) {
        setCustomValues(initialData.customValues)
      }
    }
  }, [initialData, studentId])

  useEffect(() => {
    const token = localStorage.getItem('token')
    const headers = token ? { Authorization: `Bearer ${token}` } : {}

    fetch('/api/campuses', { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.campuses && data.campuses.length > 0) {
          setCampusList(data.campuses.map((c) => c.name))
        }
      })
      .catch(() => {})

    fetch('/api/settings', { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.academicYears && data.academicYears.length > 0) {
          setAcademicYears(data.academicYears)
        }
        if (data?.departments && data.departments.length > 0) {
          setDepartmentsList(data.departments)
        }
        if (data?.batches && data.batches.length > 0) {
          setBatchesList(data.batches)
        }
        if (data?.programs && data.programs.length > 0) {
          setProgramsList(data.programs)
        }
      })
      .catch(() => {})
  }, [])

  // Fetch applicable custom fields for the selected campus
  useEffect(() => {
    const token = localStorage.getItem('token')
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    const campusParam = encodeURIComponent(formData.campus || 'Main Campus')

    fetch(`/api/custom-fields?campus=${campusParam}`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setCustomFields(data?.customFields || [])
      })
      .catch(() => {})
  }, [formData.campus])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleCustomFieldChange = (fieldKey, value) => {
    setCustomValues((prev) => ({
      ...prev,
      [fieldKey]: value,
    }))
  }

  const handleFileChange = (file) => {
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setUploadError('Only official PDF registration slips are accepted')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size exceeds the 5MB institutional limit')
      return
    }

    setUploadError(null)
    setUploadProgress(20)
    setFormData((prev) => ({ ...prev, pdfFileName: file.name }))

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
      setUploadError('Student ID and Full Name are mandatory.')
      return
    }

    if (!formData.declaration) {
      setUploadError(
        'Please check the certification declaration checkbox at the bottom before submitting.'
      )
      return
    }

    // Validate required custom fields
    for (const f of customFields) {
      if (f.isRequired) {
        const val = customValues[f.fieldKey]
        if (val === undefined || val === null || String(val).trim() === '') {
          setUploadError(`Mandatory campus field required: '${f.label}'`)
          return
        }
      }
    }

    setIsSubmitting(true)
    try {
      await onSubmit({
        ...formData,
        customValues,
        photoUrl: formData.photoUrl || '',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white shadow-xl rounded-2xl p-6 sm:p-10 border border-slate-200 max-w-4xl mx-auto">
      {/* Form Header */}
      <div className="text-center pb-6 border-b border-slate-200 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-white p-1.5 mx-auto mb-3 shadow-md border border-slate-200 flex items-center justify-center">
          <img
            src="/dilla-logo.png"
            alt="Dilla University Crest"
            className="w-full h-full object-contain"
          />
        </div>
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className="text-xs uppercase tracking-wider font-bold text-dillaGreen">
            DILLA UNIVERSITY REGISTRAR DIRECTORATE
          </span>
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-dillaDarkGreen">
          Cost-Sharing Subsidy Registration Application
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Official enrollment form for Non-Cafeteria cost-sharing student beneficiaries
        </p>
      </div>

      {uploadError && (
        <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-800 p-4 rounded-xl mb-6 flex items-start gap-2.5 text-xs sm:text-sm shadow-2xs">
          <Icon name="alert-circle" className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 1. Passport Photo Upload */}
        <div>
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
            <span className="w-6 h-6 rounded-full bg-dillaGreen text-white text-xs font-bold flex items-center justify-center">
              1
            </span>
            <h2 className="text-sm font-bold text-dillaDarkGreen uppercase tracking-wider">
              Passport-Size Photo
            </h2>
          </div>
          <p className="text-xs text-slate-600 mb-3">
            Upload a clear, recent passport-size photograph. The photo will be displayed on your registration record and viewed by the Campus Dean and Admin during verification.
          </p>
          <div className="flex justify-center">
            <PassportPhotoUpload
              currentPhotoUrl={formData.photoUrl}
              studentId={formData.studentId || 'new'}
              onPhotoSaved={(url) => setFormData((prev) => ({ ...prev, photoUrl: url }))}
            />
          </div>
        </div>

        {/* 2. Student Identification */}
        <div>
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
            <span className="w-6 h-6 rounded-full bg-dillaGreen text-white text-xs font-bold flex items-center justify-center">
              2
            </span>
            <h2 className="text-sm font-bold text-dillaDarkGreen uppercase tracking-wider">
              Student Identification
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Student ID / Admission Number *
              </label>
              <Input
                name="studentId"
                type="text"
                placeholder="e.g. DUC2023-001"
                value={formData.studentId}
                onChange={handleChange}
                required
                className="text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Full Student Name *
              </label>
              <Input
                name="fullName"
                type="text"
                placeholder="First Middle Last"
                value={formData.fullName}
                onChange={handleChange}
                required
                className="text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Gender *
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-dillaGreen/30 focus:border-dillaGreen text-sm"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Campus *
              </label>
              <select
                name="campus"
                value={formData.campus}
                onChange={handleChange}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-dillaGreen/30 focus:border-dillaGreen text-sm"
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

        {/* 3. Academic Details */}
        <div>
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
            <span className="w-6 h-6 rounded-full bg-dillaGreen text-white text-xs font-bold flex items-center justify-center">
              3
            </span>
            <h2 className="text-sm font-bold text-dillaDarkGreen uppercase tracking-wider">
              Academic Program & Contact
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Department *
              </label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-dillaGreen/30 focus:border-dillaGreen text-sm"
              >
                {departmentsList.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Program Type *
              </label>
              <select
                name="program"
                value={formData.program}
                onChange={handleChange}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-dillaGreen/30 focus:border-dillaGreen text-sm"
              >
                {programsList.map((prog) => (
                  <option key={prog} value={prog}>
                    {prog}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Year of Study *
              </label>
              <select
                name="yearOfStudy"
                value={formData.yearOfStudy}
                onChange={handleChange}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-dillaGreen/30 focus:border-dillaGreen text-sm"
              >
                <option value="1">Year 1</option>
                <option value="2">Year 2</option>
                <option value="3">Year 3</option>
                <option value="4">Year 4</option>
                <option value="5">Year 5</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Academic Year *
              </label>
              <select
                name="academicYear"
                value={formData.academicYear}
                onChange={handleChange}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-dillaGreen/30 focus:border-dillaGreen text-sm"
              >
                {academicYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Phone Number
              </label>
              <Input
                name="phone"
                type="tel"
                placeholder="+251 9..."
                value={formData.phone}
                onChange={handleChange}
                className="text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <Input
                name="email"
                type="email"
                placeholder="student@du.edu.et"
                value={formData.email}
                onChange={handleChange}
                className="text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* 4. Campus Custom Information */}
        {customFields.filter((f) => f.visibleStudent !== false).length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
              <span className="w-6 h-6 rounded-full bg-dillaGreen text-white text-xs font-bold flex items-center justify-center">
                4
              </span>
              <h2 className="text-sm font-bold text-dillaDarkGreen uppercase tracking-wider">
                Additional Campus-Specific Information
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              {[...customFields]
                .filter((f) => f.visibleStudent !== false)
                .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                .map((field) => {
                  const val = customValues[field.fieldKey] !== undefined ? customValues[field.fieldKey] : ''
                  const isLocked = Boolean(initialData?.studentId && field.isStudentEditable === false)
                  const fieldPlaceholder = field.placeholder || `Enter ${field.label}...`

                  const renderLabel = () => (
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        {field.label} {field.isRequired && <span className="text-rose-600">*</span>}
                      </label>
                      {isLocked && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                          Institution Locked
                        </span>
                      )}
                    </div>
                  )

                  const renderHelp = () =>
                    field.helpText ? (
                      <p className="text-[11px] text-slate-500 mt-1 leading-tight">{field.helpText}</p>
                    ) : null

                  if (field.fieldType === 'textarea') {
                    return (
                      <div key={field.id || field.fieldKey} className="md:col-span-2">
                        {renderLabel()}
                        <textarea
                          rows={3}
                          value={val}
                          disabled={isLocked}
                          onChange={(e) => handleCustomFieldChange(field.fieldKey, e.target.value)}
                          placeholder={fieldPlaceholder}
                          required={field.isRequired}
                          className={`w-full px-3 py-2 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-dillaGreen/30 focus:border-dillaGreen ${
                            isLocked ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200' : 'bg-white text-slate-900 border-slate-300'
                          }`}
                        />
                        {renderHelp()}
                      </div>
                    )
                  }

                  if (field.fieldType === 'select') {
                    const opts = Array.isArray(field.options) ? field.options : []
                    return (
                      <div key={field.id || field.fieldKey}>
                        {renderLabel()}
                        <select
                          value={val}
                          disabled={isLocked}
                          onChange={(e) => handleCustomFieldChange(field.fieldKey, e.target.value)}
                          required={field.isRequired}
                          className={`w-full h-10 px-3 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-dillaGreen/30 focus:border-dillaGreen ${
                            isLocked ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200' : 'bg-white text-slate-900 border-slate-300'
                          }`}
                        >
                          <option value="">-- Select {field.label} --</option>
                          {opts.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                        {renderHelp()}
                      </div>
                    )
                  }

                  if (field.fieldType === 'radio') {
                    const opts = Array.isArray(field.options) ? field.options : []
                    return (
                      <div key={field.id || field.fieldKey} className="md:col-span-2">
                        {renderLabel()}
                        <div className="flex flex-wrap gap-4 pt-1">
                          {opts.map((opt) => (
                            <label key={opt} className={`flex items-center gap-2 text-xs font-medium cursor-pointer ${isLocked ? 'text-slate-400' : 'text-slate-700'}`}>
                              <input
                                type="radio"
                                name={field.fieldKey}
                                value={opt}
                                checked={val === opt}
                                disabled={isLocked}
                                onChange={(e) => handleCustomFieldChange(field.fieldKey, e.target.value)}
                                className="text-dillaGreen focus:ring-dillaGold h-4 w-4"
                                required={field.isRequired && !val}
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                        {renderHelp()}
                      </div>
                    )
                  }

                  if (field.fieldType === 'checkbox') {
                    return (
                      <div key={field.id || field.fieldKey} className="flex flex-col justify-center pt-2">
                        <label className={`flex items-center gap-2 cursor-pointer text-xs font-bold ${isLocked ? 'text-slate-400' : 'text-slate-700'}`}>
                          <input
                            type="checkbox"
                            checked={val === 'true' || val === true}
                            disabled={isLocked}
                            onChange={(e) =>
                              handleCustomFieldChange(field.fieldKey, e.target.checked ? 'true' : 'false')
                            }
                            className="rounded border-slate-300 text-dillaGreen focus:ring-dillaGold w-4 h-4"
                          />
                          <span>
                            {field.label} {field.isRequired && <span className="text-rose-600">*</span>}
                          </span>
                        </label>
                        {isLocked && (
                          <span className="text-[10px] text-amber-700 mt-1 font-medium">Institution Locked</span>
                        )}
                        {renderHelp()}
                      </div>
                    )
                  }

                  if (field.fieldType === 'department') {
                    return (
                      <div key={field.id || field.fieldKey}>
                        {renderLabel()}
                        <select
                          value={val}
                          disabled={isLocked}
                          onChange={(e) => handleCustomFieldChange(field.fieldKey, e.target.value)}
                          required={field.isRequired}
                          className={`w-full h-10 px-3 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-dillaGreen/30 focus:border-dillaGreen ${
                            isLocked ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200' : 'bg-white text-slate-900 border-slate-300'
                          }`}
                        >
                          <option value="">-- Select Department --</option>
                          {departmentsList.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                        {renderHelp()}
                      </div>
                    )
                  }

                  if (field.fieldType === 'batch') {
                    return (
                      <div key={field.id || field.fieldKey}>
                        {renderLabel()}
                        <select
                          value={val}
                          disabled={isLocked}
                          onChange={(e) => handleCustomFieldChange(field.fieldKey, e.target.value)}
                          required={field.isRequired}
                          className={`w-full h-10 px-3 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-dillaGreen/30 focus:border-dillaGreen ${
                            isLocked ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200' : 'bg-white text-slate-900 border-slate-300'
                          }`}
                        >
                          <option value="">-- Select Batch --</option>
                          {batchesList.map((b) => (
                            <option key={b} value={b}>
                              Batch {b}
                            </option>
                          ))}
                        </select>
                        {renderHelp()}
                      </div>
                    )
                  }

                  if (field.fieldType === 'academic_year') {
                    return (
                      <div key={field.id || field.fieldKey}>
                        {renderLabel()}
                        <select
                          value={val}
                          disabled={isLocked}
                          onChange={(e) => handleCustomFieldChange(field.fieldKey, e.target.value)}
                          required={field.isRequired}
                          className={`w-full h-10 px-3 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-dillaGreen/30 focus:border-dillaGreen ${
                            isLocked ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200' : 'bg-white text-slate-900 border-slate-300'
                          }`}
                        >
                          <option value="">-- Select Academic Year --</option>
                          {academicYears.map((ay) => (
                            <option key={ay} value={ay}>
                              {ay}
                            </option>
                          ))}
                        </select>
                        {renderHelp()}
                      </div>
                    )
                  }

                  if (field.fieldType === 'file') {
                    return (
                      <div key={field.id || field.fieldKey} className="md:col-span-2">
                        {renderLabel()}
                        <div className="flex items-center gap-3">
                          <input
                            type="file"
                            disabled={isLocked}
                            onChange={(e) => {
                              const f = e.target.files?.[0]
                              if (f) handleCustomFieldChange(field.fieldKey, f.name)
                            }}
                            className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-dillaGreen file:text-white hover:file:bg-dillaDarkGreen cursor-pointer"
                          />
                        </div>
                        {val && <p className="text-[11px] text-emerald-700 font-medium mt-1">Attached: {val}</p>}
                        {renderHelp()}
                      </div>
                    )
                  }

                  const inputType =
                    field.fieldType === 'number'
                      ? 'number'
                      : field.fieldType === 'email'
                      ? 'email'
                      : field.fieldType === 'phone' || field.fieldType === 'tel'
                      ? 'tel'
                      : field.fieldType === 'date'
                      ? 'date'
                      : 'text'

                  return (
                    <div key={field.id || field.fieldKey}>
                      {renderLabel()}
                      <Input
                        type={inputType}
                        value={val}
                        disabled={isLocked}
                        onChange={(e) => handleCustomFieldChange(field.fieldKey, e.target.value)}
                        placeholder={fieldPlaceholder}
                        required={field.isRequired}
                        className={`text-xs ${
                          isLocked ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'text-slate-900 bg-white'
                        }`}
                      />
                      {renderHelp()}
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {/* 5. Document Upload */}
        <div>
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
            <span className="w-6 h-6 rounded-full bg-dillaGreen text-white text-xs font-bold flex items-center justify-center">
              {customFields.length > 0 ? '5' : '4'}
            </span>
            <h2 className="text-sm font-bold text-dillaDarkGreen uppercase tracking-wider">
              Verification Document Upload (PDF Registration Slip)
            </h2>
          </div>
          <p className="text-xs text-slate-600 mb-3">
            Please attach your official registration slip issued by the Dilla University Registrar.
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
            className="border-2 border-dashed border-slate-300 hover:border-dillaGreen rounded-2xl p-6 text-center cursor-pointer transition-all hover:bg-emerald-50/30 bg-slate-50"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-dillaGreen flex items-center justify-center mx-auto mb-2 shadow-2xs">
              <Icon name="upload" className="w-6 h-6 text-dillaGreen" />
            </div>
            <p className="text-sm font-bold text-slate-800">
              {formData.pdfFileName
                ? `Attached: ${formData.pdfFileName}`
                : 'Click to select and upload your semester registration slip (PDF)'}
            </p>
            <p className="text-xs text-slate-500 mt-1">Accepted format: PDF • Maximum file size: 5MB</p>

            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="mt-3 w-48 mx-auto bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-dillaGreen h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            )}
          </div>
        </div>

        {/* 5. Official Declaration */}
        <div className="p-5 bg-[#f1f5f3] rounded-2xl border border-slate-300 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="isNonCafeteria"
              checked={formData.isNonCafeteria}
              onChange={handleChange}
              className="mt-1 w-4 h-4 text-dillaGreen rounded border-slate-300 focus:ring-dillaGold"
            />
            <span className="text-xs text-slate-800 font-semibold leading-relaxed">
              I certify that I am a registered <strong>Non-Cafeteria student</strong> who does not consume meals at the university cafeteria dining facilities and am applying for the monthly cost-sharing subsistence allowance.
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer pt-3 border-t border-slate-300">
            <input
              type="checkbox"
              name="declaration"
              checked={formData.declaration}
              onChange={handleChange}
              className="mt-1 w-4 h-4 text-dillaGreen rounded border-slate-300 focus:ring-dillaGold"
            />
            <span className="text-xs text-slate-900 font-bold leading-relaxed">
              I hereby declare that all information entered is true and accurate. I understand that falsification will lead to disciplinary action, cancellation of registration, and loss of university cost-sharing allowances. *
            </span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-slate-200">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel || (() => (window.location.href = '/'))}
            className="w-full sm:w-auto font-semibold text-slate-700"
          >
            Cancel Application
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting}
            variant="primary"
            className="w-full sm:w-auto px-6 py-2.5 font-bold shadow-md"
          >
            {isSubmitting ? 'Submitting Application...' : 'Submit Application for Review →'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default RegistrationForm
