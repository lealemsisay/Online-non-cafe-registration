import React, { useState, useEffect, useRef } from 'react'
import Icon from '@/components/icons/Icon'

const PassportPhotoUpload = ({
  photoUrl,
  currentPhotoUrl,
  onPhotoUploaded,
  onPhotoSaved,
  studentId,
  readOnly = false,
  className = '',
  label = 'Student Passport-Size Photograph',
}) => {
  const initialPhoto = photoUrl || currentPhotoUrl || null
  const [currentPhoto, setCurrentPhoto] = useState(initialPhoto)
  const [preview, setPreview] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [maxPhotoSizeMB, setMaxPhotoSizeMB] = useState(8)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const fileInputRef = useRef(null)

  // Sync external photoUrl
  useEffect(() => {
    const nextPhoto = photoUrl || currentPhotoUrl
    if (nextPhoto) {
      setCurrentPhoto(nextPhoto)
    }
  }, [photoUrl, currentPhotoUrl])

  // Fetch current admin-configured upload size limit from DB
  useEffect(() => {
    const token = localStorage.getItem('token')
    fetch('/api/settings', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const configuredLimit =
          data?.systemSettings?.maxPhotoSizeMB ||
          data?.systemSettings?.max_photo_size_mb
        if (configuredLimit && Number(configuredLimit) >= 1) {
          setMaxPhotoSizeMB(Number(configuredLimit))
        }
      })
      .catch(() => {})
  }, [])

  const handleFileSelect = (e) => {
    setError(null)
    setSuccessMessage(null)
    const file = e.target.files?.[0]
    if (!file) return

    // 1. Validate file extension and MIME type
    const allowedExtensions = ['.jpg', '.jpeg', '.png']
    const fileName = file.name.toLowerCase()
    const hasValidExt = allowedExtensions.some((ext) => fileName.endsWith(ext))
    const validMimes = ['image/jpeg', 'image/jpg', 'image/png']

    if (!hasValidExt || !validMimes.includes(file.type.toLowerCase())) {
      setError('Unsupported file format. Please upload a genuine JPG, JPEG, or PNG passport photo.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    // 2. Validate file size against dynamic admin-configured limit
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > maxPhotoSizeMB) {
      setError(
        `File size (${fileSizeMB.toFixed(2)} MB) exceeds the university maximum limit of ${maxPhotoSizeMB} MB. Please select a smaller photo.`
      )
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    // 3. Read image and create preview
    setSelectedFile(file)
    const reader = new FileReader()
    reader.onload = () => {
      setPreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!preview || !selectedFile) return
    setLoading(true)
    setError(null)
    setSuccessMessage(null)

    const token = localStorage.getItem('token')
    try {
      const res = await fetch('/api/student/photo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          image: preview,
          studentId: studentId || localStorage.getItem('studentId') || localStorage.getItem('userId'),
        }),
      })

      const data = await res.json()
      if (res.ok && data.photoUrl) {
        setCurrentPhoto(data.photoUrl)
        setPreview(null)
        setSelectedFile(null)
        setSuccessMessage('Passport photograph saved successfully!')
        if (onPhotoUploaded) {
          onPhotoUploaded(data.photoUrl)
        }
        if (onPhotoSaved) {
          onPhotoSaved(data.photoUrl)
        }
      } else {
        setError(data.message || 'Failed to upload photo. Please verify file and try again.')
      }
    } catch (err) {
      console.error('Upload error:', err)
      setError('Network error occurred while uploading photograph.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelSelection = () => {
    setPreview(null)
    setSelectedFile(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const displayPhoto = preview || currentPhoto

  return (
    <div className={`space-y-3 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">
            {label}
          </label>
          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
            Max: <strong className="text-dillaGreen">{maxPhotoSizeMB} MB</strong>
          </span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
        {/* Passport Photo Frame (Strict 3:4 Aspect Ratio) */}
        <div className="relative group w-32 h-40 rounded-xl overflow-hidden bg-slate-200 border-2 border-slate-300 shadow-md flex-shrink-0 flex items-center justify-center">
          {displayPhoto ? (
            <img
              src={displayPhoto}
              alt="Passport photograph"
              className="w-full h-full object-cover object-top transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-3 text-slate-400 text-center">
              <Icon name="user" className="w-12 h-12 stroke-[1.5] text-slate-400" />
              <span className="text-[10px] font-bold text-slate-500 uppercase mt-1">
                Passport Photo
              </span>
              <span className="text-[9px] text-slate-400">3x4 cm</span>
            </div>
          )}

          {preview && (
            <div className="absolute top-1 right-1 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs">
              Preview
            </div>
          )}
        </div>

        {/* Upload Controls & Guidelines */}
        <div className="flex-1 space-y-2.5 text-center sm:text-left">
          <div>
            <h4 className="text-xs font-bold text-slate-900">
              {currentPhoto ? 'Passport Photograph on File' : 'Upload Official Student Photograph'}
            </h4>
            <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
              Standard white or light background, front-facing, head and shoulders visible. Allowed: <strong>JPG, JPEG, PNG</strong> up to <strong>{maxPhotoSizeMB} MB</strong>.
            </p>
          </div>

          {!readOnly && (
            <div className="space-y-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/jpeg,image/png,image/jpg"
                className="hidden"
                id="passport-photo-input"
              />

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                {!preview ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 text-xs font-bold text-dillaDarkGreen bg-white hover:bg-amber-50 border border-slate-300 hover:border-dillaGold rounded-xl transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                  >
                    <Icon name="camera" className="w-4 h-4 text-dillaGreen" />
                    <span>{currentPhoto ? 'Replace Photo' : 'Select Photo'}</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleUpload}
                      className="px-4 py-2 text-xs font-bold text-white bg-dillaDarkGreen hover:bg-dillaGreen rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                    >
                      {loading ? (
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Icon name="check" className="w-4 h-4" />
                      )}
                      <span>Save Photo</span>
                    </button>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleCancelSelection}
                      className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 p-2 rounded-lg flex items-center gap-1.5 font-medium">
              <Icon name="alert-circle" className="w-3.5 h-3.5 flex-shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 p-2 rounded-lg flex items-center gap-1.5 font-medium">
              <Icon name="check-circle" className="w-3.5 h-3.5 flex-shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PassportPhotoUpload
