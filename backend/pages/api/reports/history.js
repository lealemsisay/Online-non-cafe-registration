import { pool } from '@/drizzle/client'
import { authorize, setCorsHeaders } from '@/lib/auth'

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return

  const auth = authorize(req, ['admin', 'dean'])
  if (auth.error) return res.status(auth.status).json({ message: auth.error })

  const user = auth.user
  const userRole = user.role
  const userCampus = user.campus

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const client = await pool.connect()
  try {
    const { page = 1, limit = 20 } = req.query || {}
    const pageNum = Math.max(1, parseInt(page, 10) || 1)
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20))
    const offset = (pageNum - 1) * limitNum

    let whereClause = '1=1'
    const params = []

    if (userRole === 'dean') {
      params.push(userCampus || '')
      whereClause += ` AND (campus_scope IS NULL OR LOWER(campus_scope) = LOWER($${params.length}))`
    }

    const countRes = await client.query(`SELECT COUNT(*) AS count FROM report_history WHERE ${whereClause}`, params)
    const totalCount = parseInt(countRes.rows[0]?.count || 0, 10)

    params.push(limitNum)
    const limitIdx = params.length
    params.push(offset)
    const offsetIdx = params.length

    const query = `
      SELECT 
        id, 
        report_type AS "reportType", 
        creator_username AS "creatorUsername", 
        creator_role AS "creatorRole", 
        campus_scope AS "campusScope", 
        parameters, 
        file_format AS "fileFormat", 
        record_count AS "recordCount", 
        status, 
        created_at AS "createdAt"
      FROM report_history
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `
    const result = await client.query(query, params)

    return res.status(200).json({
      history: result.rows,
      pagination: {
        totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum) || 1,
      },
    })
  } catch (error) {
    console.error('Error fetching report history:', error)
    return res.status(500).json({ message: 'Error fetching report history', detail: error.message })
  } finally {
    client.release()
  }
}
