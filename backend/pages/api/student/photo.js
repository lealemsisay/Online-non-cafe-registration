import { pool } from '@/drizzle/client'
import { authorize, setCorsHeaders } from '@/lib/auth'
import { getPhotoSettings, validatePhotoBuffer, describeFormats } from '@/lib/photo-settings'
import fs from 'fs'
import path from 'path'

// Allow payload sizes up to 15MB for base64 photo payloads (enforcing the configurable 1-10MB limit in code)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
}

const photoDir = path.join(process.cwd(), 'uploads', 'photos')
if (!fs.existsSync(photoDir)) {
  try {
    fs.mkdirSync(photoDir, { recursive: true })
  } catch (e) {
    // ignore
  }
}

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return

  // GET: Serve photo file or retrieve photo URL
  if (req.method === 'GET') {
    const requestedFile = req.query?.file
    const requestedId = req.query?.id

    if (requestedFile) {
      // Prevent directory traversal
      const safeFilename = path.basename(requestedFile)
      const filePath = path.join(photoDir, safeFilename)

      if (fs.existsSync(filePath)) {
        const ext = path.extname(safeFilename).toLowerCase()
        const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg'
        res.setHeader('X-Content-Type-Options', 'nosniff')
        res.setHeader('Content-Type', mimeType)
        res.setHeader('Cache-Control', 'public, max-age=86400')
        const fileStream = fs.createReadStream(filePath)
        return fileStream.pipe(res)
      } else {
        return res.status(404).json({ message: 'Photo not found' })
      }
    }

    if (req.query?.settings === 'true') {
      const settingsClient = await pool.connect()
      try {
        return res.status(200).json({ photoSettings: await getPhotoSettings(settingsClient) })
      } finally {
        settingsClient.release()
      }
    }

    if (requestedId) {
      const client = await pool.connect()
      try {
        const r = await client.query(
          'SELECT photo_url AS "photoUrl" FROM student WHERE student_id = $1 OR id::text = $1',
          [requestedId]
        )
        const photoUrl = r.rows[0]?.photoUrl || null
        return res.status(200).json({ photoUrl })
      } finally {
        client.release()
      }
    }

    return res.status(400).json({ message: 'Missing file or id parameter' })
  }

  // POST: Upload and validate passport photo
  if (req.method === 'POST') {
    const auth = authorize(req, ['student', 'dean', 'admin'])
    if (auth.error) return res.status(auth.status).json({ message: auth.error })

    const client = await pool.connect()
    try {
      // 1. Load the admin-configured photo settings (size, formats, dimensions, aspect ratio)
      const photoSettings = await getPhotoSettings(client)

      const body = req.body || {}
      const { image, studentId, targetUserId } = body

      if (!image) {
        return res.status(400).json({ message: 'No image data provided.' })
      }

      // 2. Identify target user/student and enforce role-based permissions
      let targetId = (studentId || targetUserId || auth.user.studentId || auth.user.username || auth.user.id).trim()

      if (auth.user.role === 'student') {
        // Students can ONLY upload their own photo
        const ownStudentId = (auth.user.studentId || auth.user.username || '').toLowerCase()
        const ownId = (auth.user.id || '').toLowerCase()
        if (targetId.toLowerCase() === 'new' || !targetId) {
          targetId = auth.user.studentId || auth.user.username || auth.user.id || 'student'
        } else if (targetId.toLowerCase() !== ownStudentId && targetId.toLowerCase() !== ownId) {
          return res.status(403).json({ message: 'Forbidden: Students cannot modify photos of other students.' })
        }
      } else if (auth.user.role === 'dean') {
        // Deans can only upload for students in their assigned campus or their own profile
        if (targetId.toLowerCase() !== (auth.user.id || '').toLowerCase() && targetId.toLowerCase() !== (auth.user.username || '').toLowerCase()) {
          const checkRes = await client.query(
            'SELECT campus FROM student WHERE student_id = $1 OR id::text = $1',
            [targetId]
          )
          if (checkRes.rows.length > 0) {
            const studentCampus = checkRes.rows[0].campus
            if (studentCampus && studentCampus.toLowerCase() !== (auth.user.campus || '').toLowerCase()) {
              return res.status(403).json({ message: 'Forbidden: Dean cannot upload photos for students of another campus.' })
            }
          }
        }
      }

      // 3. Process base64 payload
      let base64Data = image
      let declaredMime = 'image/jpeg'
      if (image.includes(';base64,')) {
        const parts = image.split(';base64,')
        declaredMime = parts[0].replace('data:', '').toLowerCase()
        base64Data = parts[1]
      }

      // Validate declared MIME against the allowed formats
      const mimeToFormat = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
      const declaredFormat = mimeToFormat[declaredMime]
      if (!declaredFormat || !photoSettings.allowedFormats.includes(declaredFormat)) {
        return res.status(400).json({
          message: `Unsupported image format. Allowed formats: ${describeFormats(photoSettings.allowedFormats)}.`,
        })
      }

      const buffer = Buffer.from(base64Data, 'base64')

      // 4-5. Deep inspection of the real file content: size, real format (magic bytes),
      // pixel dimensions and aspect ratio, against the configured limits.
      const check = validatePhotoBuffer(buffer, photoSettings)
      if (!check.ok) {
        return res.status(400).json({ message: check.error, ...(check.details || {}) })
      }
      if (check.info.format !== declaredFormat) {
        return res.status(400).json({
          message: 'The file content does not match its declared image type.',
        })
      }
      const sizeInMB = check.details.sizeMB
      const maxPhotoSizeMB = check.details.maxAllowedMB

      const ext = check.info.format === 'png' ? '.png' : check.info.format === 'webp' ? '.webp' : '.jpg'
      const cleanTarget = targetId.replace(/[^a-zA-Z0-9_-]/g, '_')
      const fileName = `photo-${cleanTarget}-${Date.now()}${ext}`
      const filePath = path.join(photoDir, fileName)

      // 6. Write file to disk
      fs.writeFileSync(filePath, buffer)

      const photoUrl = `/api/student/photo?file=${fileName}`

      // 7. Persist photoUrl in database for student and user
      await client.query(
        'UPDATE student SET photo_url = $1, updated_at = NOW() WHERE student_id = $2 OR id::text = $2',
        [photoUrl, targetId]
      )

      await client.query(
        'UPDATE app_user SET photo_url = $1, updated_at = NOW() WHERE username = $2 OR id::text = $2',
        [photoUrl, targetId]
      )

      return res.status(200).json({
        success: true,
        photoUrl,
        filename: fileName,
        sizeInMB,
        width: check.info.width,
        height: check.info.height,
        maxAllowedMB: maxPhotoSizeMB,
        message: 'Student passport photo uploaded and securely verified successfully.',
      })
    } catch (error) {
      console.error('Photo upload error:', error)
      return res.status(500).json({ message: 'Internal server error processing photo upload.', detail: error.message })
    } finally {
      client.release()
    }
  }

  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).json({ message: 'Method not allowed' })
}
