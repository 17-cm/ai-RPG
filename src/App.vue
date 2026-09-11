<script setup>
/**
 * 链路验证 Demo —— 一个最简"玩家输入 → 代理 → 模型 → 回复"循环。
 * 你的游戏 UI 直接替换这个组件即可；请求函数 sendMessage() 的写法可以照搬。
 */
import { ref, nextTick } from 'vue'

const messages = ref([]) // {role: 'user'|'assistant', content}
const input = ref('')
const busy = ref(false)
const error = ref('')
const listEl = ref(null)

async function sendMessage() {
  const text = input.value.trim()
  if (!text || busy.value) return

  input.value = ''
  error.value = ''
  messages.value.push({ role: 'user', content: text })
  busy.value = true
  await scrollToBottom()

  try {
    // 生产环境这个请求会被 Vercel/Netlify 的函数接住；本地开发由 Vite 代理转给 dev-server
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: messages.value }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
    messages.value.push({ role: 'assistant', content: data.reply })
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
    await scrollToBottom()
  }
}

async function scrollToBottom() {
  await nextTick()
  if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight
}
</script>

<template>
  <header class="bar">
    <h1>🎮 AI 小游戏 · 骨架已就位</h1>
    <p class="dim">下面是一个最小验证循环：发一句话，能收到模型回复就说明"前端→代理→模型"全通了。</p>
  </header>

  <main ref="listEl" class="chat">
    <p v-if="messages.length === 0" class="dim placeholder">
      还没有对话。先在项目根目录建 <code>.env</code> 填入 <code>OPENAI_API_KEY</code>（见 README），
      然后在下方输入内容试试。
    </p>
    <div v-for="(m, i) in messages" :key="i" :class="['msg', m.role]">
      <span class="who">{{ m.role === 'user' ? '你' : 'AI' }}</span>
      <span class="content">{{ m.content }}</span>
    </div>
    <div v-if="busy" class="msg assistant"><span class="who">AI</span><span class="content dim">思考中…</span></div>
  </main>

  <p v-if="error" class="error">⚠ {{ error }}</p>

  <footer class="inputbar">
    <input
      v-model="input"
      :disabled="busy"
      placeholder="输入内容，回车发送"
      @keydown.enter="sendMessage"
    />
    <button :disabled="busy || !input.trim()" @click="sendMessage">发送</button>
  </footer>
</template>

<style scoped>
.bar h1 {
  font-size: 18px;
  margin: 4px 0;
}
.dim {
  color: var(--dim);
  font-size: 13px;
}
.bar p {
  margin: 4px 0 12px;
}
.chat {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 0;
}
.placeholder {
  margin-top: 40px;
  text-align: center;
}
.msg {
  max-width: 85%;
  padding: 8px 12px;
  border-radius: 10px;
  line-height: 1.6;
  font-size: 15px;
  white-space: pre-wrap;
  word-break: break-word;
}
.msg.user {
  align-self: flex-end;
  background: var(--user);
}
.msg.assistant {
  align-self: flex-start;
  background: var(--ai);
}
.who {
  font-size: 11px;
  color: var(--dim);
  margin-right: 8px;
}
.error {
  color: #ff8f8f;
  font-size: 13px;
  margin: 6px 2px;
}
.inputbar {
  display: flex;
  gap: 8px;
  padding-top: 10px;
}
.inputbar input {
  flex: 1;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #2c3648;
  background: var(--panel);
  color: var(--text);
  font-size: 15px;
  outline: none;
}
.inputbar input:focus {
  border-color: var(--accent);
}
.inputbar button {
  padding: 10px 18px;
  border-radius: 8px;
  border: none;
  background: var(--accent);
  color: #fff;
  font-size: 15px;
  cursor: pointer;
}
.inputbar button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
