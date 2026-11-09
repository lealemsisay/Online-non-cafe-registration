import { pool } from '@/drizzle/client'
import { authorize, setCorsHeaders } from '@/lib/auth'
import path from 'path'
import fs from 'fs'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
}

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return

  const { studentId } = req.query

  if (!studentId) {
    res.setHeader('Allow', ['GET'])
    return res.status(400).json({ message: 'studentId query parameter is required' })
  }

  const auth = authorize(req, ['admin', 'dean', 'student'])
  if (auth.error) return res.status(auth.status).json({ message: auth.error })

  const client = await pool.connect()
  try {
    let targetStudentId = studentId
    if (auth.user.role === 'student') {
      const ownStudentId = auth.user.studentId || auth.user.username || auth.user.id || ''
      if (!ownStudentId) {
        return res.status(403).json({ message: 'Unable to identify the student.' })
      }
      if (targetStudentId.toLowerCase() !== ownStudentId.toLowerCase()) {
        return res.status(403).json({ message: 'Forbidden: Students can only view their own data.' })
      }
    }

    // Get student basic info
    const studentRes = await client.query(
      `SELECT id, studentId, fullName as studentName, gender, phone, email, department, program, yearOfStudy, campus, academicYear, applicationStatus, registrationStatus, isNonCafeteria, customValues, customFields FROM student WHERE studentId = $1 OR id::text = $1`,
      [targetStudentId]
    )

    if (studentRes.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found.' })
    }

    const student = studentRes.rows[0]

    // Get all documents for this student
    const docRes = await client.query(
      `SELECT id, filename, path, filename AS "storedName", uploaded_at, description FROM document_metadata WHERE student_id = $1 ORDER BY uploaded_at DESC`,
      [targetStudentId]
    )

    // Get custom fields values
    const customValues = student.customValues || {}
    const customFields = student.customFields || []

    // Build custom fields data
    const fieldsData = []
    customFields.forEach((field) => {
      const val = customValues[field.fieldKey] !== undefined ? customValues[field.fieldKey] : field.value
      fieldsData.push({
        key: field.fieldKey,
        label: field.label,
        type: field.fieldType,
        value: val !== null && val !== undefined && String(val).trim() !== '' ? (val === 'true' ? 'Yes' : val === 'false' ? 'No' : String(val)) : '— Not specified —'
      })
    })

    // Return all student data and documents
    return res.status(200).json({
      success: true,
      student: {
        id: student.id,
        studentId: student.studentId,
        studentName: student.studentName,
        gender: student.gender,
        phone: student.phone,
        email: student.email,
        department: student.department,
        program: student.program,
        yearOfStudy: student.yearOfStudy,
        campus: student.campus,
        academicYear: student.academicYear,
        applicationStatus: student.applicationStatus,
        registrationStatus: student.registrationStatus,
        isNonCafeteria: student.isNonCafeteria !== false,
      },
      customFields: fieldsData,
      documents: docRes.rows.map((d) => ({
        id: d.id,
        filename: d.filename,
        storedName: d.storedName,
        uploadedAt: d.uploaded_at,
        description: d.description,
      })),
    })
  } catch (error) {
    console.error('Document student error:', error)
    return res.status(500).json({ message: 'Internal server error retrieving student data.', detail: error.message })
  } finally {
    client.release()
  }
}