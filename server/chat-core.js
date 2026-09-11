/**
 * chat-core.js —— 唯一的一份"调模型"逻辑
 *
 * 本地 dev-server.js、Vercel 的 api/chat.js、Netlify 的 functions/chat.js
 * 都调用这里的函数。改提示词、换参数只需要动这一个文件。
 *
 * 环境变量（本地写 .env，线上在平台后台填）：
 *   OPENAI_API_KEY    必填，模型厂商的 Key
 *   OPENAI_BASE_URL   默认 https://api.deepseek.com （OpenAI 官方填 https://api.openai.com/v1）
 *   GAME_MODEL        默认 deepseek-chat
 *   SYSTEM_PROMPT     游戏主持人设定，不填用内置默认
 */

const DEFAULT_SYSTEM_PROMPT = [
  '你是一个文字小游戏的主持人。玩家通过输入与你交互推进游戏。',
  '每次回复保持简短（150 字以内），营造氛围，并在结尾给玩家留出行动空间。',
  '这只是链路验证用的默认设定，请换成你自己游戏的玩法提示词。',
].join('\n')

export class ApiError extends Error {
  constructor(message, status = 500) {
    super(message)
    this.status = status
  }
}

/**
 * @param {Array<{role: string, content: string}>} messages 对话历史（含最新一条玩家输入）
 * @returns {Promise<{reply: string, usage: object|null}>}
 */
export async function chatWithModel(messages) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new ApiError(
      'OPENAI_API_KEY 未设置。本地：复制 .env.example 为 .env 并填入 Key；线上：在 Vercel/Netlify 后台 Environment Variables 里添加。',
      500,
    )
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new ApiError('messages 不能为空', 400)
  }

  const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '')
  const model = process.env.GAME_MODEL || 'deepseek-chat'
  const systemPrompt = process.env.SYSTEM_PROMPT || DEFAULT_SYSTEM_PROMPT

  const payload = {
    model,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    temperature: 0.9,
    max_tokens: 500,
  }

  let res
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })
  } catch (e) {
    throw new ApiError(`无法连接模型服务（${baseUrl}）：${e.message}`, 502)
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new ApiError(`模型服务返回 ${res.status}：${text.slice(0, 300)}`, res.status)
  }

  const data = await res.json()
  const reply = data?.choices?.[0]?.message?.content
  if (typeof reply !== 'string') {
    throw new ApiError('模型返回格式不符合 OpenAI 兼容规范，请检查 BASE_URL / GAME_MODEL', 502)
  }
  return { reply, usage: data.usage ?? null }
}
