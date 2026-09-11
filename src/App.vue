<script setup>
/**
 * 手机自适应游戏壳：顶栏(状态) / 故事区(滚动) / 输入坞(键盘感知)。
 * 玩法内核仍是 sendMessage() → /api/chat → 模型。
 */
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue'

const messages = ref([]) // {role: 'user'|'assistant', content}
const input = ref('')
const busy = ref(false)
const error = ref('')
const listEl = ref(null)
const inputEl = ref(null)

/* ---- 开发期视口诊断角标（生产构建自动移除） ---- */
const isDev = import.meta.env.DEV
const vp = ref('')
function updateBadge() {
  const vv = window.visualViewport
  const ua = navigator.userAgent
  const kernel = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox|FxiOS/.test(ua) ? 'Firefox' : /MicroMessenger/.test(ua) ? '微信' : /Quark/.test(ua) ? '夸克' : /UCBrowser/.test(ua) ? 'UC' : /Chrome|CriOS/.test(ua) ? 'Chrome' : /Safari/.test(ua) ? 'Safari' : '?'
  vp.value =
    `页面视口 ${window.innerWidth}×${window.innerHeight} | 可视 ${vv ? Math.round(vv.width) + '×' + Math.round(vv.height) : '?'} | ` +
    `屏幕 ${screen.width}×${screen.height} dpr${devicePixelRatio} | ${kernel}` +
    (window.innerWidth > 800 && screen.width < 600 ? ' ⚠桌面模式(meta未生效)' : '')
}

/* ---- 键盘/视口自适应：把真实可视高度写进 --screen-h ---- */
function fitViewport() {
  const h = window.visualViewport ? window.visualViewport.height : window.innerHeight
  document.documentElement.style.setProperty('--screen-h', `${h}px`)
  updateBadge()
  // 视口变化后让故事区停在底部
  scrollToBottom()
}
onMounted(() => {
  fitViewport()
  window.visualViewport?.addEventListener('resize', fitViewport)
  window.addEventListener('orientationchange', fitViewport)
})
onBeforeUnmount(() => {
  window.visualViewport?.removeEventListener('resize', fitViewport)
  window.removeEventListener('orientationchange', fitViewport)
})

/* ---- 游戏循环 ---- */
async function sendMessage() {
  const text = input.value.trim()
  if (!text || busy.value) return

  input.value = ''
  error.value = ''
  messages.value.push({ role: 'user', content: text })
  busy.value = true
  await scrollToBottom()

  try {
    // 线上由 Vercel/Netlify 函数接住；本地由 Vite 代理转给 dev-server
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
    inputEl.value?.focus() // 手机键盘保持不收起
  }
}

async function scrollToBottom() {
  await nextTick()
  if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight
}
</script>

<template>
  <div v-if="isDev" class="vpbadge">{{ vp }}</div>

  <header class="topbar">
    <div class="brand">🎮 AI-RPG</div>
    <div class="stats">
      <span class="chip">Lv.1</span>
      <span class="chip">❤ 100</span>
      <span class="chip">🪙 0</span>
    </div>
  </header>

  <main ref="listEl" class="stage">
    <p v-if="messages.length === 0" class="dim placeholder">
      冒险尚未开始。<br />
      <small>（在 .env 填入 OPENAI_API_KEY 后，输入任意内容即可开始）</small>
    </p>
    <div v-for="(m, i) in messages" :key="i" :class="['msg', m.role]">
      <span class="who">{{ m.role === 'user' ? '你' : '旁白' }}</span>
      <span class="content">{{ m.content }}</span>
    </div>
    <div v-if="busy" class="msg assistant">
      <span class="who">旁白</span><span class="content dim">思考中…</span>
    </div>
  </main>

  <p v-if="error" class="error">⚠ {{ error }}</p>

  <footer class="dock">
    <input
      ref="inputEl"
      v-model="input"
      :disabled="busy"
      placeholder="你要做什么？"
      enterkeyhint="send"
      autocomplete="off"
      @keydown.enter.prevent="sendMessage"
    />
    <button :disabled="busy || !input.trim()" @click="sendMessage">发送</button>
  </footer>
</template>

<style scoped>
/* ---- 视口诊断角标（仅 dev） ---- */
.vpbadge {
  position: fixed;
  top: calc(var(--sat, 0px) + 4px);
  right: 8px;
  z-index: 99;
  font-size: 10px;
  line-height: 1.4;
  padding: 3px 8px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.65);
  color: #ffd76a;
  pointer-events: none;
  max-width: 60vw;
}

/* ---- 顶栏 ---- */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  user-select: none;
}
.brand {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.5px;
}
.stats {
  display: flex;
  gap: 6px;
}
.chip {
  font-size: 12px;
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--panel);
  border: 1px solid var(--line);
  white-space: nowrap;
}

/* ---- 故事区（唯一可滚动区域） ---- */
.stage {
  flex: 1;
  min-height: 0; /* flex 子项可滚动的关键 */
  overflow-y: auto;
  overscroll-behavior: contain; /* 滚到边界不带动页面 */
  -webkit-overflow-scrolling: touch;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 4px 0;
}
.placeholder {
  margin-top: 15vh;
  text-align: center;
  line-height: 2;
}
.dim {
  color: var(--dim);
  font-size: 13px;
}
.msg {
  max-width: 86%;
  padding: 9px 12px;
  border-radius: 12px;
  line-height: 1.65;
  font-size: clamp(14px, 3.9vw, 16px); /* 小屏不挤、大屏不糊 */
  white-space: pre-wrap;
  word-break: break-word;
  user-select: text; /* 剧情允许长按复制 */
}
.msg.user {
  align-self: flex-end;
  background: var(--user);
  border-bottom-right-radius: 4px;
}
.msg.assistant {
  align-self: flex-start;
  background: var(--ai);
  border-bottom-left-radius: 4px;
}
.who {
  display: block;
  font-size: 11px;
  color: var(--dim);
  margin-bottom: 2px;
}
.error {
  color: #ff8f8f;
  font-size: 13px;
  margin: 0 2px;
  user-select: text;
}

/* ---- 输入坞 ---- */
.dock {
  display: flex;
  gap: 8px;
  padding-top: 2px;
}
.dock input {
  flex: 1;
  min-height: 46px; /* ≥44px 触控标准 */
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--text);
  font-size: 16px; /* iOS：<16px 聚焦会自动放大页面 */
  outline: none;
}
.dock input:focus {
  border-color: var(--accent);
}
.dock button {
  min-height: 46px;
  min-width: 68px;
  padding: 10px 16px;
  border-radius: 10px;
  border: none;
  background: var(--accent);
  color: #fff;
  font-size: 15px;
  cursor: pointer;
}
.dock button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
