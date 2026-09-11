/**
 * Netlify Function 入口
 * 部署后自动暴露为 POST /.netlify/functions/chat
 * 前端统一请求 /api/chat，由 netlify.toml 里的 redirect 规则映射过来。
 */
import { chatWithModel, ApiError } from '../../server/chat-core.js'

export async function handler(event) {
  const json = (statusCode, body) => ({
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  })

  if (event.httpMethod !== 'POST') {
    return json(405, { error: '仅支持 POST' })
  }
  try {
    const parsed = event.body ? JSON.parse(event.body) : {}
    const result = await chatWithModel(parsed.messages)
    return json(200, result)
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 500
    return json(status, { error: e.message || '未知错误' })
  }
}
