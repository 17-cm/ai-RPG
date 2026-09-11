/**
 * Vercel Serverless Function 入口
 * 部署后自动暴露为 POST /api/chat（与前端同源，无需处理 CORS）
 */
import { chatWithModel, ApiError } from '../server/chat-core.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '仅支持 POST' })
  }
  try {
    const { messages } = req.body ?? {}
    const result = await chatWithModel(messages)
    return res.status(200).json(result)
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 500
    return res.status(status).json({ error: e.message || '未知错误' })
  }
}
