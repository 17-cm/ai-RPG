<script setup>
/**
 * 游戏壳 v3：自然滚动 + fixed 钉底输入坞 + 键盘最小抬升（附加层）。
 * 玩法内核 sendMessage() → /api/chat → 模型。
 */
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useMobileViewport } from './use-mobile-viewport'

const messages = ref([]) // {role: 'user'|'assistant', content}
const input = ref('')
const busy = ref(false)
const error = ref('')
const inputEl = ref(null)

/* ---- 开发期视口诊断角标（生产构建自动移除） ---- */
const isDev = import.meta.env.DEV
const vp = ref('')
function updateBadge() {
  if (!isDev) return
  const vv = window.visualViewport
  const ua = navigator.userAgent
  const kernel = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox|FxiOS/.test(ua) ? 'Firefox' : /MicroMessenger/.test(ua) ? '微信' : /Quark/.test(ua) ? '夸克' : /UCBrowser/.test(ua) ? 'UC' : /Chrome|CriOS/.test(ua) ? 'Chrome' : /Safari/.test(ua) ? 'Safari' : '?'
  const lift = getComputedStyle(document.documentElement).getPropertyValue('--mobile-keyboard-lift').trim() || '0'
  vp.value =
    `视口 ${window.innerWidth}×${window.innerHeight} | 可视 ${vv ? Math.round(vv.width) + '×' + Math.round(vv.height) : '?'} | 抬 ${lift} | ` +
    `屏 ${screen.width}×${screen.height} dpr${devicePixelRatio} ${kernel}` +
    (window.innerWidth > 800 && screen.width < 600 ? ' ⚠桌面模式' : '')
}

/* ---- 手机视口/键盘适配（ai-virtual-phone 方案；纯附加层，坏了也不影响钉底） ---- */
const mvp = useMobileViewport(updateBadge)
onMounted(() => {
  mvp.mount()
  updateBadge()
})
onBeforeUnmount(() => mvp.unmount())

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
    inputEl.value?.focus()
  }
}

async function scrollToBottom() {
  await nextTick()
  window.scrollTo(0, document.documentElement.scrollHeight)
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

  <main class="stage">
    <p v-if="messages.length === 0" class="dim placeholder">
      冒险尚未开始。<br />
      <small>（输入框已用 fixed 钉死屏幕底部，与页面高度无关）</small>
    </p>
    <div v-for="(m, i) in messages" :key="i" :class="['msg', m.role]">
      <span class="who">{{ m.role === 'user' ? '你' : '旁白' }}</span>
      <span class="content">{{ m.content }}</span>
    </div>
    <div v-if="busy" class="msg assistant">
      <span class="who">旁白</span><span class="content dim">思考中…</span>
    </div>
  </main>

  <footer class="dock">
    <p v-if="error" class="error">⚠ {{ error }}</p>
    <div class="dockrow">
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
    </div>
  </footer>
</template>

<style scoped>
/* ---- 视口诊断角标（仅 dev） ---- */
.vpbadge {
  position: fixed;
  top: 4px;
  right: 8px;
  z-index: 99;
  font-size: 10px;
  line-height: 1.4;
  padding: 3px 8px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.7);
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
  padding-top: 16px; /* 给角标让位 */
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

/* ---- 故事区：自然文档流，整页滚动 ---- */
.stage {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 0;
  min-height: 45vh;
}
.placeholder {
  margin-top: 18vh;
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
  font-size: clamp(14px, 3.9vw, 16px);
  white-space: pre-wrap;
  word-break: break-word;
  user-select: text;
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

/* ---- 输入坞：fixed 钉屏幕底（本方案的主角，不依赖任何高度计算） ---- */
.dock {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  max-width: 520px;
  margin: 0 auto;
  padding: 8px 12px calc(env(safe-area-inset-bottom, 0px) + 8px);
  background: linear-gradient(transparent, var(--bg) 22%);

  /* 键盘最小抬升直接作用在 dock 上（use-mobile-viewport 写入变量）。
     transform 加在 fixed 元素自身不影响其钉底语义，只改变绘制位置。 */
  transform: translate3d(0, calc(-1 * var(--mobile-keyboard-lift, 0px)), 0);
  transition: transform 0.18s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform;
}
.dockrow {
  display: flex;
  gap: 8px;
}
.error {
  color: #ff8f8f;
  font-size: 13px;
  margin: 0 2px 6px;
  user-select: text;
}
.dock input {
  flex: 1;
  min-height: 46px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--text);
  font-size: 16px; /* iOS <16px 聚焦会放大页面 */
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
