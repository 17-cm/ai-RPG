/**
 * dev-server.js —— 本地开发时模拟线上云函数
 * 监听 8787，提供 POST /api/chat（Vite 会把前端的 /api 请求转发过来）
 * 由 dev.js 自动带 --env-file 启动，一般不需要单独运行。
 */
import { createServer } from 'node:http'
import { chatWithModel, ApiError } from './server/chat-core.js'

const PORT = process.env.PORT || 8787

function readBody(req) {
  return new Promise((resolve, reject) => {
    let buf = ''
    req.on('data', (c) => {
      buf += c
      if (buf.length > 1e6) {
        reject(new ApiError('请求体过大', 413))
        req.destroy()
      }
    })
    req.on('end', () => {
      try {
        resolve(buf ? JSON.parse(buf) : {})
      } catch {
        reject(new ApiError('请求体不是合法 JSON', 400))
      }
    })
    req.on('error', reject)
  })
}

const server = createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')

  if (req.method === 'GET' && req.url === '/api/health') {
    res.end(JSON.stringify({ ok: true, keyConfigured: Boolean(process.env.OPENAI_API_KEY) }))
    return
  }

  if (req.method === 'POST' && req.url === '/api/chat') {
    try {
      const { messages } = await readBody(req)
      const result = await chatWithModel(messages)
      res.end(JSON.stringify(result))
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 500
      res.writeHead(status)
      res.end(JSON.stringify({ error: e.message || '未知错误' }))
    }
    return
  }

  res.writeHead(404)
  res.end(JSON.stringify({ error: 'Not Found' }))
})

server.listen(PORT, () => {
  console.log(`[dev-api] http://localhost:${PORT}/api/chat  (模型: ${process.env.GAME_MODEL || 'deepseek-chat'})`)
})
