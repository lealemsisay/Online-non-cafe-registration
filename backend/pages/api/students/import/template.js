import { authorize, setCorsHeaders } from '@/lib/auth'
import { buildTemplate } from '@/lib/student-import'

export default function handler(req, res) {
  if (setCorsHeaders(req, res)) return

  const auth = authorize(req, ['admin', 'dean'])
  if (auth.error) return res.status(auth.status).json({ message: auth.error })

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const format = req.query?.format || req.query?.fileFormat || 'csv'
  const template = buildTemplate(format)

  res.setHeader('Content-Type', template.contentType)
  res.setHeader('Content-Disposition', `attachment; filename="${template.fileName}"`)
  res.setHeader('Content-Length', template.buffer.length)
  return res.status(200).send(template.buffer)
}
