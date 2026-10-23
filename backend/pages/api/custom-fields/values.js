import { pool } from '@/drizzle/client'
import { authorize, setCorsHeaders } from '@/lib/auth'

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return

  const auth = authorize(req, ['admin', 'dean', 'student'])
  if (auth.error) return res.status(auth.status).json({ message: auth.error })

  const user = auth.user
  const userRole = user.role
  const userCampus = user.campus

  // GET: Retrieve custom field values for a student
  if (req.method === 'GET') {
    const rawStudentId = req.query?.studentId || (userRole === 'student' ? user.studentId || user.username : null)
    if (!rawStudentId) {
      return res.status(400).json({ message: 'studentId query parameter is required' })
    }

    const client = await pool.connect()
    try {
      // 1. Verify access permissions
      const studentRes = await client.query(
        `SELECT id, student_id AS "studentId", full_name AS "fullName", campus FROM student WHERE student_id = $1 OR id::text = $1`,
        [rawStudentId]
      )

      if (studentRes.rows.length === 0) {
        return res.status(404).json({ message: 'Student record not found' })
      }

      const student = studentRes.rows[0]

      if (userRole === 'student') {
        const myId = (user.studentId || user.username || '').toLowerCase()
        if (student.studentId.toLowerCase() !== myId && student.id !== user.id) {
          return res.status(403).json({ message: 'Forbidden: Cannot access custom field values for another student' })
        }
      } else if (userRole === 'dean') {
        if (student.campus && userCampus && student.campus.toLowerCase() !== userCampus.toLowerCase()) {
          return res.status(403).json({ message: 'Forbidden: Cannot access custom fields for students of another campus' })
        }
      }

      // 2. Fetch definitions applicable to this campus
      const fieldsRes = await client.query(
        `SELECT id, field_key AS "fieldKey", label, field_type AS "fieldType", options, is_required AS "isRequired", campus
         FROM custom_field_definition
         WHERE is_active = true AND (campus IS NULL OR LOWER(campus) = LOWER($1))
         ORDER BY campus NULLS FIRST, created_at ASC`,
        [student.campus || 'Main Campus']
      )

      // 3. Fetch existing values
      const valuesRes = await client.query(
        `SELECT field_id AS "fieldId", field_key AS "fieldKey", value
         FROM student_custom_value
         WHERE student_id = $1`,
        [student.studentId]
      )

      const valuesMap = {}
      valuesRes.rows.forEach((r) => {
        valuesMap[r.fieldKey] = r.value
      })

      const fieldsWithValues = fieldsRes.rows.map((f) => ({
        ...f,
        value: valuesMap[f.fieldKey] !== undefined ? valuesMap[f.fieldKey] : null,
      }))

      return res.status(200).json({
        studentId: student.studentId,
        customValues: valuesMap,
        fieldsWithValues,
      })
    } catch (error) {
      console.error('Error fetching custom field values:', error)
      return res.status(500).json({ message: 'Error fetching custom field values' })
    } finally {
      client.release()
    }
  }

  // POST / PUT: Save custom field values for a student
  if (req.method === 'POST' || req.method === 'PUT') {
    const { studentId: bodyStudentId, values } = req.body || {}
    const rawStudentId = bodyStudentId || (userRole === 'student' ? user.studentId || user.username : null)

    if (!rawStudentId) {
      return res.status(400).json({ message: 'studentId is required' })
    }

    if (!values || typeof values !== 'object') {
      return res.status(400).json({ message: 'values object is required' })
    }

    const client = await pool.connect()
    try {
      // 1. Verify student exists
      const studentRes = await client.query(
        `SELECT id, student_id AS "studentId", full_name AS "fullName", campus FROM student WHERE student_id = $1 OR id::text = $1`,
        [rawStudentId]
      )

      if (studentRes.rows.length === 0) {
        return res.status(404).json({ message: 'Student record not found' })
      }

      const student = studentRes.rows[0]

      if (userRole === 'student') {
        const myId = (user.studentId || user.username || '').toLowerCase()
        if (student.studentId.toLowerCase() !== myId && student.id !== user.id) {
          return res.status(403).json({ message: 'Forbidden: Cannot edit custom field values for another student' })
        }
      } else if (userRole === 'dean') {
        if (student.campus && userCampus && student.campus.toLowerCase() !== userCampus.toLowerCase()) {
          return res.status(403).json({ message: 'Forbidden: Cannot edit custom fields for students of another campus' })
        }
      }

      // 2. Fetch applicable definitions
      const defsRes = await client.query(
        `SELECT id, field_key AS "fieldKey", label, field_type AS "fieldType", options, is_required AS "isRequired"
         FROM custom_field_definition
         WHERE is_active = true AND (campus IS NULL OR LOWER(campus) = LOWER($1))`,
        [student.campus || 'Main Campus']
      )

      const definitions = defsRes.rows

      // 3. Validate inputs
      const validatedEntries = []
      for (const def of definitions) {
        const val = values[def.fieldKey]
        const valStr = val !== undefined && val !== null ? String(val).trim() : ''

        // Required check
        if (def.isRequired && valStr === '') {
          return res.status(400).json({
            message: `Custom field '${def.label}' is required.`,
            fieldKey: def.fieldKey,
          })
        }

        // Type checks if value provided
        if (valStr !== '') {
          if (def.fieldType === 'number') {
            const num = Number(valStr)
            if (isNaN(num)) {
              return res.status(400).json({
                message: `Field '${def.label}' must be a valid number.`,
                fieldKey: def.fieldKey,
              })
            }
          } else if (def.fieldType === 'date') {
            const d = new Date(valStr)
            if (isNaN(d.getTime())) {
              return res.status(400).json({
                message: `Field '${def.label}' must be a valid date.`,
                fieldKey: def.fieldKey,
              })
            }
          } else if (def.fieldType === 'select') {
            const allowed = Array.isArray(def.options) ? def.options : []
            if (allowed.length > 0 && !allowed.includes(valStr)) {
              return res.status(400).json({
                message: `Field '${def.label}' has an invalid option '${valStr}'. Allowed: ${allowed.join(', ')}`,
                fieldKey: def.fieldKey,
              })
            }
          } else if (def.fieldType === 'checkbox') {
            // Normalize checkbox boolean
            if (valStr !== 'true' && valStr !== 'false' && valStr !== '1' && valStr !== '0') {
              // Accept true/false
            }
          }
        }

        if (val !== undefined && val !== null) {
          validatedEntries.push({
            fieldId: def.id,
            fieldKey: def.fieldKey,
            value: typeof val === 'boolean' ? (val ? 'true' : 'false') : valStr,
          })
        }
      }

      // 4. Upsert values into student_custom_value
      for (const entry of validatedEntries) {
        await client.query(
          `INSERT INTO student_custom_value (student_id, field_id, field_key, value, updated_at)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (student_id, field_id) DO UPDATE
           SET value = EXCLUDED.value, updated_at = NOW()`,
          [student.studentId, entry.fieldId, entry.fieldKey, entry.value]
        )
      }

      return res.status(200).json({
        success: true,
        message: 'Custom field values saved successfully',
        savedCount: validatedEntries.length,
      })
    } catch (error) {
      console.error('Error saving custom field values:', error)
      return res.status(500).json({ message: 'Error saving custom field values' })
    } finally {
      client.release()
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT'])
  return res.status(405).json({ message: 'Method not allowed' })
}
