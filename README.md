# ai-RPG —— AI 玩法内核小游戏脚手架

Vite + Vue 3 前端，玩法内核通过云函数代理调用大模型（OpenAI 兼容格式，厂商可换）。
一个仓库同时支持 **Vercel** 和 **Netlify** 部署，本地开发零配置。

## 架构

```
浏览器 (Vue, 静态文件)
   │  POST /api/chat  { messages: [...] }
   ▼
代理层（三处入口共享 server/chat-core.js 同一份逻辑）
   ├─ 本地开发   dev-server.js        （npm run dev 自动起）
   ├─ Vercel    api/chat.js
   └─ Netlify   netlify/functions/chat.js（/api/chat 由 netlify.toml 重定向）
   │  带 OPENAI_API_KEY 转发
   ▼
模型 API（默认 DeepSeek，改环境变量即换厂商）
```

**API Key 只存在于代理层的环境变量里，永远不会进前端代码。**

## 本地开发

```bash
npm install
cp .env.example .env    # 填入 OPENAI_API_KEY
npm run dev             # 同时起前端(5173) + 本地API(8787)
```

打开 http://localhost:5173 ，在页面里发一句话，收到 AI 回复 = 全链路打通。

## 部署（以 Vercel 为例，Netlify 同理）

1. 把本目录推到 GitHub：
   ```bash
   git init && git add -A && git commit -m "init"
   gh repo create ai-game --public --source=. --push
   # 或手动在 GitHub 建空仓库后 git remote add origin ... && git push
   ```
2. 打开 vercel.com → Add New → Project → Import 该仓库
   （框架会被识别为 Vite，构建命令/输出目录已在 vercel.json 写好）
3. **Environment Variables** 页面添加：
   - `OPENAI_API_KEY`（必填）
   - `OPENAI_BASE_URL` / `GAME_MODEL` / `SYSTEM_PROMPT`（可选，不设走默认）
4. Deploy。几十秒后得到 `https://你的项目.vercel.app`

Netlify 对应操作：app.netlify.com → Add new site → Import from Git，
环境变量在 Site settings → Environment variables 里加，其余全自动。

## 换模型厂商

只改环境变量，代码零改动：

| 厂商 | OPENAI_BASE_URL | GAME_MODEL 示例 |
|---|---|---|
| DeepSeek（默认） | `https://api.deepseek.com` | `deepseek-chat` |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |
| 月之暗面 | `https://api.moonshot.cn/v1` | `moonshot-v1-8k` |
| 智谱 | `https://open.bigmodel.cn/api/paas/v4` | `glm-4-flash` |
| 阿里百炼 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-plus` |

## 开始写你的游戏

- 玩法提示词：`SYSTEM_PROMPT` 环境变量（或改 `server/chat-core.js` 里的默认值）
- 游戏 UI：重写 `src/App.vue`，`sendMessage()` 的请求写法可直接照搬
- 需要"游戏状态"（血量、分数、回合）：让模型按约定格式返回 JSON，
  在 `chat-core.js` 里解析校验后再回给前端——服务端解析可以防玩家篡改

## 注意事项

- 公开的游戏链接会被人刷接口：上线后至少给 `/api/chat` 加每 IP 限次
- 免费额度：Vercel/Netlify 个人版均 100GB 流量/月，函数调用量足够小游戏玩
- 本 demo 为非流式回复；要打字机效果需把代理改成 SSE 流式转发（README 之外再聊）
