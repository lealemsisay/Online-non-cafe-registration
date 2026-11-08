import { pool } from '@/drizzle/client'
import { authorize, setCorsHeaders, hashPassword } from '@/lib/auth'
import {
  buildTemplate,
  decodeBase64File,
  fileExtension,
  isProfileComplete,
  isSupportedUpload,
  parseWorkbook,
  asString,
  toBoolean,
} from '@/lib/student-import'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
}

const MAX_FILE_BYTES = 10 * 1024 * 1024

function summarize(records, created, duplicates, rejected) {
  return {
    totalRecords: records,
    newRecords: created,
    importedRecords: 0,
    duplicateRecords: duplicates,
    rejectedRecords: rejected,
    profileIncompleteRecords: 0,
  }
}

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return

  // Super Admin and Campus Dean can import students
  const auth = authorize(req, ['admin', 'dean'])
  if (auth.error) return res.status(auth.status).json({ message: auth.error })

  // GET: download import template (csv default, xlsx optional)
  if (req.method === 'GET') {
    const template = buildTemplate(req.query?.format || req.query?.fileFormat || 'csv')
    res.setHeader('Content-Type', template.contentType)
    res.setHeader('Content-Disposition', `attachment; filename="${template.fileName}"`)
    res.setHeader('Content-Length', template.buffer.length)
    return res.status(200).send(template.buffer)
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { fileBase64, fileName, dryRun } = req.body || {}

  if (!fileBase64) {
    return res.status(400).json({ message: 'No file provided. Upload an .xlsx or .csv file.' })
  }
  if (!isSupportedUpload(fileName)) {
    return res.status(400).json({
      message: 'Unsupported file format. Please upload .xlsx, .xls or .csv files only.',
      fileType: fileExtension(fileName) || 'unknown',
    })
  }

  let buffer
  try {
    buffer = decodeBase64File(fileBase64)
  } catch {
    return res.status(400).json({ message: 'The uploaded file could not be decoded.' })
  }
  if (!buffer || buffer.length === 0) {
    return res.status(400).json({ message: 'The uploaded file is empty.' })
  }
  if (buffer.length > MAX_FILE_BYTES) {
    return res.status(400).json({
      message: `File size (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds the 10 MB limit.`,
    })
  }

  let parsed
  try {
    parsed = parseWorkbook(buffer, fileName)
  } catch (error) {
    return res.status(400).json({ message: 'Unable to read the uploaded file.', detail: error.message })
  }

  const { records, missingColumns } = parsed
  if (missingColumns.length > 0) {
    return res.status(400).json({
      message: 'The uploaded file is missing mandatory columns.',
      missingColumns,
      requiredColumns: ['student_name', 'student_id'],
    })
  }
  if (records.length === 0) {
    return res.status(400).json({ message: 'No data rows were found in the uploaded file.' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Collect identifiers from the file (case-insensitive de-duplication).
    const studentIds = []
    const registrarIds = []
    for (const record of records) {
      const sid = asString(record.student_id)
      const rid = asString(record.registrar_id)
      if (sid) studentIds.push(sid.toLowerCase())
      if (rid) registrarIds.push(rid.toLowerCase())
    }
    const uniqueStudentIds = [...new Set(studentIds)]
    const uniqueRegistrarIds = [...new Set(registrarIds)]

    const existingStudentIds = new Set()
    const existingRegistrarIds = new Set()
    if (uniqueStudentIds.length || uniqueRegistrarIds.length) {
      const existingRes = await client.query(
        `SELECT LOWER(student_id) AS sid, LOWER(registrar_id) AS rid
           FROM student
          WHERE (student_id IS NOT NULL AND LOWER(student_id) = ANY($1::text[]))
             OR (registrar_id IS NOT NULL AND LOWER(registrar_id) = ANY($2::text[]))`,
        [uniqueStudentIds, uniqueRegistrarIds]
      )
      for (const row of existingRes.rows) {
        if (row.sid) existingStudentIds.add(row.sid)
        if (row.rid) existingRegistrarIds.add(row.rid)
      }
    }

    const seenStudentIds = new Set()
    const seenRegistrarIds = new Set()
    const accepted = []
    const duplicates = []
    const rejected = []

    for (const record of records) {
      const studentId = asString(record.student_id)
      const studentName = asString(record.student_name)
      const registrarId = asString(record.registrar_id)
      const sidKey = studentId.toLowerCase()
      const ridKey = registrarId.toLowerCase()

      if (!studentId) {
        rejected.push({ row: record._row, student_id: '', student_name: studentName, reason: 'Student ID is required.' })
        continue
      }
      if (!studentName) {
        rejected.push({ row: record._row, student_id: studentId, student_name: '', reason: 'Student name is required.' })
        continue
      }

      const base = {
        row: record._row,
        student_id: studentId,
        registrar_id: registrarId || null,
        student_name: studentName,
      }

      if (existingStudentIds.has(sidKey) || (ridKey && existingRegistrarIds.has(ridKey))) {
        duplicates.push({
          ...base,
          reason: 'Student already exists (matched by student ID or registrar ID). Existing record preserved.',
        })
        continue
      }
      if (seenStudentIds.has(sidKey) || (ridKey && seenRegistrarIds.has(ridKey))) {
        duplicates.push({
          ...base,
          reason: 'Duplicate entry inside the uploaded file. Only the first occurrence was kept.',
        })
        continue
      }

      seenStudentIds.add(sidKey)
      if (ridKey) seenRegistrarIds.add(ridKey)

      accepted.push({
        ...base,
        gender: asString(record.gender),
        campus: asString(record.campus),
        department: asString(record.department),
        program: asString(record.program),
        year_of_study: asString(record.year_of_study),
        academic_year: asString(record.academic_year),
        phone: asString(record.phone),
        email: asString(record.email),
        is_non_cafeteria: toBoolean(record.is_non_cafeteria),
        profile_complete: isProfileComplete(record),
      })
    }

    const summary = summarize(records.length, accepted.length, duplicates.length, rejected.length)
    summary.profileIncompleteRecords = accepted.filter((r) => !r.profile_complete).length

    if (dryRun) {
      await client.query('ROLLBACK')
      return res.status(200).json({
        success: true,
        dryRun: true,
        message: `Preview ready: ${accepted.length} new, ${duplicates.length} duplicate, ${rejected.length} rejected out of ${records.length} rows.`,
        summary,
        new: accepted,
        duplicates,
        rejected,
      })
    }

    // Hash each student's ID as their individual initial password.
    // Each imported student logs in with username = student_id, password = student_id,
    // and is forced to change it on first login.
    let imported = 0
    for (const row of accepted) {
      const initialPassword = row.student_id
      const passwordHash = await hashPassword(initialPassword)

      await client.query(
        `INSERT INTO student (
           student_id, registrar_id, full_name, gender, campus, department, program,
           year_of_study, phone, email, academic_year, is_non_cafeteria, profile_complete,
           registration_status, application_status, approval_status
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
           'draft', 'draft', 'pending'
         )`,
        [
          row.student_id,
          row.registrar_id,
          row.student_name,
          row.gender || null,
          row.campus || null,
          row.department || null,
          row.program || null,
          row.year_of_study || null,
          row.phone || null,
          row.email || null,
          row.academic_year || null,
          row.is_non_cafeteria,
          row.profile_complete,
        ]
      )

      // Create a login account only when one does not already exist.
      // ON CONFLICT DO NOTHING guarantees passwords/roles are never overwritten.
      await client.query(
        `INSERT INTO app_user (username, password_hash, full_name, role, campus, email, status, must_change_password)
         VALUES ($1, $2, $3, 'student', $4, $5, 'active', true)
         ON CONFLICT (username) DO NOTHING`,
        [row.student_id, passwordHash, row.student_name, row.campus || null, row.email || null]
      )

      imported += 1
    }

    summary.importedRecords = imported

    const performedBy = auth.user.username || auth.user.name || 'admin'
    await client.query(
      `INSERT INTO audit_log (action, performed_by, target_id, target_type, details)
       VALUES ('bulk_student_import', $1, 'import', 'student_import', $2)`,
      [
        performedBy,
        JSON.stringify({
          fileName,
          ...summary,
          performedBy,
          timestamp: new Date().toISOString(),
        }),
      ]
    )

    await client.query('COMMIT')

    return res.status(200).json({
      success: true,
      dryRun: false,
      message: `Import complete: ${imported} new, ${duplicates.length} duplicate, ${rejected.length} rejected out of ${records.length} rows.`,
      summary,
      new: accepted,
      duplicates,
      rejected,
    })
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } catch {
      // ignore rollback errors
    }
    console.error('Student import error:', error)
    return res.status(500).json({ message: 'Error processing student import', detail: error.message })
  } finally {
    client.release()
  }
}
