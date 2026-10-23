import { pool } from '@/drizzle/client'
import { authorize, setCorsHeaders } from '@/lib/auth'
import { createNotification } from '@/lib/notifications'

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return

  // Accessible by Campus Dean and Super Admin
  const auth = authorize(req, ['dean', 'admin'])
  if (auth.error) return res.status(auth.status).json({ message: auth.error })

  const user = auth.user
  const userRole = user.role
  const userCampus = user.campus

  // GET: Retrieve submission history
  if (req.method === 'GET') {
    const client = await pool.connect()
    try {
      const { campus, limit = 50 } = req.query || {}

      let query = `
        SELECT 
          id, 
          batch_number AS "batchNumber", 
          campus, 
          submitted_by AS "submittedBy", 
          student_count AS "studentCount", 
          student_ids AS "studentIds", 
          filters_applied AS "filtersApplied", 
          notes, 
          status, 
          created_at AS "createdAt", 
          updated_at AS "updatedAt"
        FROM campus_submission
        WHERE 1=1
      `
      const params = []

      if (userRole === 'dean') {
        params.push(userCampus || '')
        query += ` AND LOWER(campus) = LOWER($${params.length})`
      } else if (userRole === 'admin' && campus) {
        params.push(campus)
        query += ` AND LOWER(campus) = LOWER($${params.length})`
      }

      params.push(parseInt(limit) || 50)
      query += ` ORDER BY created_at DESC LIMIT $${params.length}`

      const result = await client.query(query, params)
      return res.status(200).json({ submissions: result.rows })
    } catch (error) {
      console.error('Error fetching submissions:', error)
      return res.status(500).json({ message: 'Error fetching submissions' })
    } finally {
      client.release()
    }
  }

  // POST: Submit a student roster batch to Super Admin
  if (req.method === 'POST') {
    const { studentIds, filters, notes } = req.body || {}

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: 'studentIds array is required and must contain at least one student' })
    }

    const client = await pool.connect()
    try {
      // 1. Fetch all selected students
      const studentsRes = await client.query(
        `SELECT id, student_id AS "studentId", full_name AS "fullName", campus, application_status AS "applicationStatus"
         FROM student
         WHERE student_id = ANY($1::text[]) OR id::text = ANY($1::text[])`,
        [studentIds]
      )

      if (studentsRes.rows.length === 0) {
        return res.status(404).json({ message: 'None of the specified students were found' })
      }

      const students = studentsRes.rows

      // 2. ENFORCE CAMPUS RESTRICTIONS (Task 2 & 3):
      // Campus Deans can ONLY submit students from their own campus
      const effectiveCampus = userRole === 'dean' ? userCampus : (students[0]?.campus || 'Main Campus')

      if (userRole === 'dean') {
        const foreignStudent = students.find(
          (s) => !s.campus || s.campus.toLowerCase() !== (userCampus || '').toLowerCase()
        )
        if (foreignStudent) {
          return res.status(403).json({
            message: `Forbidden: Student '${foreignStudent.fullName}' (${foreignStudent.studentId}) belongs to '${foreignStudent.campus}', not '${userCampus}'.`,
          })
        }
      }

      // 3. PREVENT DUPLICATE SUBMISSIONS (Task 3):
      // Check if any student is already submitted in an active/pending batch or already approved
      const alreadyApproved = students.filter((s) => s.applicationStatus === 'approved')
      if (alreadyApproved.length > 0) {
        return res.status(409).json({
          message: `Cannot submit batch: ${alreadyApproved.length} student(s) are already approved.`,
          alreadyApproved: alreadyApproved.map((s) => ({ id: s.studentId, name: s.fullName })),
        })
      }

      // Check for pending batch overlap
      const pendingBatchesRes = await client.query(
        `SELECT batch_number, student_ids 
         FROM campus_submission 
         WHERE status = 'submitted' AND LOWER(campus) = LOWER($1)`,
        [effectiveCampus]
      )

      const alreadyBatchedIds = new Set()
      pendingBatchesRes.rows.forEach((b) => {
        const ids = Array.isArray(b.student_ids) ? b.student_ids : []
        ids.forEach((id) => alreadyBatchedIds.add(String(id).toLowerCase()))
      })

      const duplicateSubmissions = students.filter((s) =>
        alreadyBatchedIds.has(s.studentId.toLowerCase())
      )

      if (duplicateSubmissions.length > 0) {
        return res.status(409).json({
          message: `Duplicate submission prevented: ${duplicateSubmissions.length} student(s) are already included in a pending batch.`,
          duplicateStudents: duplicateSubmissions.map((s) => ({ id: s.studentId, name: s.fullName })),
        })
      }

      // 4. Generate unique Batch Number
      const campusCode = (effectiveCampus || 'CAMPUS').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase()
      const batchNumber = `BATCH-${campusCode}-${Date.now().toString().slice(-6)}`
      const normalizedStudentIds = students.map((s) => s.studentId)

      // 5. Insert campus_submission record
      const insertRes = await client.query(
        `INSERT INTO campus_submission (
           batch_number, campus, submitted_by, student_count, student_ids, filters_applied, notes, status, created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'submitted', NOW(), NOW())
         RETURNING id, batch_number AS "batchNumber", campus, submitted_by AS "submittedBy", student_count AS "studentCount", student_ids AS "studentIds", filters_applied AS "filtersApplied", notes, status, created_at AS "createdAt", updated_at AS "updatedAt"`,
        [
          batchNumber,
          effectiveCampus,
          user.username || user.name || 'Campus Dean',
          normalizedStudentIds.length,
          JSON.stringify(normalizedStudentIds),
          filters ? JSON.stringify(filters) : null,
          notes ? String(notes).trim() : null,
        ]
      )

      const submission = insertRes.rows[0]

      // 6. Update student application statuses to 'super-admin-review'
      await client.query(
        `UPDATE student 
         SET application_status = 'super-admin-review',
             dean_review = 'batch_submitted',
             dean_comments = COALESCE($1, dean_comments),
             updated_at = NOW()
         WHERE student_id = ANY($2::text[])`,
        [notes || 'Submitted in campus batch roster', normalizedStudentIds]
      )

      // 7. Insert Audit Log
      await client.query(
        `INSERT INTO audit_log (action, performed_by, target_id, target_type, details)
         VALUES ('batch_submission', $1, $2, 'submission', $3)`,
        [
          user.username || user.name,
          batchNumber,
          `Batch submission of ${normalizedStudentIds.length} students from ${effectiveCampus} by ${user.username}`,
        ]
      )

      // 8. NOTIFICATIONS (Task 3 & 5):
      // A) Notify Super Admin / Central Admin
      await createNotification(
        {
          recipientRole: 'admin',
          campus: effectiveCampus,
          title: 'Campus Student Roster Submitted',
          message: `Campus Dean ${user.username || user.name} submitted roster ${batchNumber} with ${normalizedStudentIds.length} students from ${effectiveCampus}.`,
          type: 'info',
          link: '/admin/applications',
        },
        client
      )

      // B) Notify Campus Dean confirming submission
      await createNotification(
        {
          recipientId: user.username,
          recipientRole: 'dean',
          campus: effectiveCampus,
          title: 'Student Roster Submission Confirmed',
          message: `Your student roster ${batchNumber} (${normalizedStudentIds.length} students) has been submitted to the Super Admin for authorization.`,
          type: 'success',
          link: '/dean',
        },
        client
      )

      return res.status(201).json({
        success: true,
        message: `Batch ${batchNumber} with ${normalizedStudentIds.length} students submitted successfully to Super Admin.`,
        submission,
      })
    } catch (error) {
      console.error('Error submitting campus roster:', error)
      return res.status(500).json({ message: 'Error submitting campus roster' })
    } finally {
      client.release()
    }
  }

  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).json({ message: 'Method not allowed' })
}
