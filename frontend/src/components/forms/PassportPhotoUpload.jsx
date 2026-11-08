import React, { useState, useEffect, useRef } from 'react'
import Icon from '@/components/icons/Icon'

const FORMAT_MIMES = { jpg: ['image/jpeg', 'image/jpg'], png: ['image/png'], webp: ['image/webp'] }
const FORMAT_EXTS = { jpg: ['.jpg', '.jpeg'], png: ['.png'], webp: ['.webp'] }
const FORMAT_LABELS = { jpg: 'JPG/JPEG', png: 'PNG', webp: 'WebP' }
const DEFAULT_PHOTO_SETTINGS = {
  maxSizeMB: 8,
  allowedFormats: ['jpg', 'png'],
  required: false,
  aspectRatio: { enabled: false, width: 3, height: 4, tolerancePercent: 10 },
  minWidth: null,
  minHeight: null,
  maxWidth: null,
  maxHeight: null,
}

// Mirrors the server-side checks (the server always re-validates).
const validateDimensions = (w, h, s) => {
  if (s.minWidth && w < s.minWidth) return `Photo width (${w}px) is below the minimum of ${s.minWidth}px.`
  if (s.minHeight && h < s.minHeight) return `Photo height (${h}px) is below the minimum of ${s.minHeight}px.`
  if (s.maxWidth && w > s.maxWidth) return `Photo width (${w}px) exceeds the maximum of ${s.maxWidth}px.`
  if (s.maxHeight && h > s.maxHeight) return `Photo height (${h}px) exceeds the maximum of ${s.maxHeight}px.`
  if (s.aspectRatio?.enabled) {
    const target = s.aspectRatio.width / s.aspectRatio.height
    const deviation = Math.abs(w / h - target) / target
    if (deviation > (s.aspectRatio.tolerancePercent || 0) / 100) {
      return `Photo aspect ratio must be about ${s.aspectRatio.width}:${s.aspectRatio.height} (±${s.aspectRatio.tolerancePercent}%). Your photo is ${w}×${h}px.`
    }
  }
  return null
}

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
  const [photoSettings, setPhotoSettings] = useState(DEFAULT_PHOTO_SETTINGS)
  const maxPhotoSizeMB = photoSettings.maxSizeMB
  const formatText = photoSettings.allowedFormats.map((f) => FORMAT_LABELS[f] || f).join(', ')
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

  // Fetch the admin-configured photo rules (size, formats, dimensions, required) from the database
  useEffect(() => {
    const token = localStorage.getItem('token')
    fetch('/api/settings', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.photoSettings) {
          setPhotoSettings({ ...DEFAULT_PHOTO_SETTINGS, ...data.photoSettings })
        } else {
          const configuredLimit = data?.systemSettings?.maxPhotoSizeMB || data?.systemSettings?.max_photo_size_mb
          if (configuredLimit && Number(configuredLimit) >= 1) {
            setPhotoSettings((p) => ({ ...p, maxSizeMB: Number(configuredLimit) }))
          }
        }
      })
      .catch(() => {})
  }, [])

  const handleFileSelect = (e) => {
    setError(null)
    setSuccessMessage(null)
    const file = e.target.files?.[0]
    if (!file) return

    const rejectFile = (message) => {
      setError(message)
      setPreview(null)
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }

    // 1. Validate file extension and MIME type against the allowed formats
    const allowedExts = photoSettings.allowedFormats.flatMap((f) => FORMAT_EXTS[f] || [])
    const allowedMimes = photoSettings.allowedFormats.flatMap((f) => FORMAT_MIMES[f] || [])
    const fileName = file.name.toLowerCase()
    if (!allowedExts.some((ext) => fileName.endsWith(ext)) || !allowedMimes.includes(file.type.toLowerCase())) {
      rejectFile(`Unsupported file format. Please upload a genuine photo in one of these formats: ${formatText}.`)
      return
    }

    // 2. Validate file size against dynamic admin-configured limit
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > maxPhotoSizeMB) {
      rejectFile(
        `File size (${fileSizeMB.toFixed(2)} MB) exceeds the university maximum limit of ${maxPhotoSizeMB} MB. Please select a smaller photo.`
      )
      return
    }

    // 3. Read image, check dimensions / aspect ratio, then create preview
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result
      const img = new Image()
      img.onload = () => {
        const problem = validateDimensions(img.naturalWidth, img.naturalHeight, photoSettings)
        if (problem) {
          rejectFile(problem)
          return
        }
        setSelectedFile(file)
        setPreview(dataUrl)
      }
      img.onerror = () => rejectFile('The selected file could not be read as an image.')
      img.src = dataUrl
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
            {photoSettings.required && <span className="text-rose-600 ml-1" title="Required">*</span>}
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
              Standard white or light background, front-facing, head and shoulders visible. Allowed: <strong>{formatText}</strong> up to <strong>{maxPhotoSizeMB} MB</strong>.
              {photoSettings.aspectRatio?.enabled && (
                <> Aspect ratio about <strong>{photoSettings.aspectRatio.width}:{photoSettings.aspectRatio.height}</strong>.</>
              )}
              {(photoSettings.minWidth || photoSettings.minHeight || photoSettings.maxWidth || photoSettings.maxHeight) && (
                <>
                  {' '}Size in pixels:{' '}
                  {photoSettings.minWidth || photoSettings.minHeight
                    ? `at least ${photoSettings.minWidth || '-'}×${photoSettings.minHeight || '-'}`
                    : ''}
                  {(photoSettings.minWidth || photoSettings.minHeight) && (photoSettings.maxWidth || photoSettings.maxHeight) ? ', ' : ''}
                  {photoSettings.maxWidth || photoSettings.maxHeight
                    ? `at most ${photoSettings.maxWidth || '-'}×${photoSettings.maxHeight || '-'}`
                    : ''}
                  .
                </>
              )}
              {photoSettings.required && <span className="text-rose-700 font-semibold"> A photo is required.</span>}
            </p>
          </div>

          {!readOnly && (
            <div className="space-y-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept={photoSettings.allowedFormats.flatMap((f) => FORMAT_MIMES[f] || []).join(",")}
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
