/**
 * use-mobile-viewport.js —— 手机视口自适应核心
 * 移植自 ai-virtual-phone 实战方案（useAndroidCaretKeyboardLift + 焦点守卫）：
 *
 * 1. --screen-h：JS 实时写入真实可视高度(px)。布局高度不依赖 dvh，
 *    老内核/WebView 也稳；地址栏收起、键盘弹出都跟着走。
 * 2. --mobile-keyboard-lift：当"压缩高度"仍不足以让聚焦输入框露出键盘上方时，
 *    整个壳做最小量上移（只抬需要的像素，封顶键盘高度），transform + 过渡动画。
 * 3. 焦点守卫：iOS 部分收起键盘路径不触发 visualViewport resize，偏移会卡死。
 *    "没有聚焦的可编辑元素就不可能有键盘"——以此确定性归零。
 * 4. rAF 合批 + 50/250/600ms 延迟复查，覆盖键盘弹出/收起动画期。
 */

const GAP = 36 // 输入框与键盘之间保留的呼吸空隙(px)
const KEYBOARD_MIN_INSET = 80 // 小于这个值视为"没有键盘"

function isEditable(el) {
  if (!(el instanceof HTMLElement)) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  return el.isContentEditable === true
}

/**
 * @param {() => void} [onMeasure] 每次视口/键盘状态变化后回调（诊断角标用）
 */
export function useMobileViewport(onMeasure) {
  const root = document.documentElement
  let focused = null
  let raf = 0
  let lift = 0
  const timers = []

  function syncHeight() {
    const vv = window.visualViewport
    const h = vv ? vv.height : window.innerHeight
    root.style.setProperty('--screen-h', `${Math.round(h)}px`)
  }

  function applyLift(next) {
    const rounded = Math.max(0, Math.round(next))
    if (Math.abs(rounded - lift) < 2) return // 抖动过滤
    lift = rounded
    if (rounded > 0) root.style.setProperty('--mobile-keyboard-lift', `${rounded}px`)
    else root.style.removeProperty('--mobile-keyboard-lift')
  }

  function update() {
    raf = 0
    syncHeight()

    const vv = window.visualViewport
    // 守卫：焦点已离开可编辑元素 → 不可能有键盘 → 归零
    if (!focused || document.activeElement !== focused || !isEditable(focused) || !vv) {
      applyLift(0)
      onMeasure?.()
      return
    }

    const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
    if (inset < KEYBOARD_MIN_INSET) {
      applyLift(0) // 键盘没弹出，或浏览器已自行压缩布局视口
      onMeasure?.()
      return
    }

    // 最小抬升：聚焦元素底缘(还原当前 lift 后的自然位置) + 空隙 - 键盘顶缘
    const keyboardTop = vv.offsetTop + vv.height
    const rect = focused.getBoundingClientRect()
    const naturalBottom = rect.bottom + lift
    const needed = Math.max(0, naturalBottom + GAP - keyboardTop)
    applyLift(Math.min(inset, needed))
    onMeasure?.()
  }

  function request() {
    if (raf) window.cancelAnimationFrame(raf)
    raf = window.requestAnimationFrame(update)
  }

  // focus 切换时 focusout 先于 focusin，延迟分批复查避免误归零；也覆盖键盘动画
  function scheduleBatch() {
    request()
    for (const d of [50, 250, 600]) timers.push(window.setTimeout(update, d))
  }

  function onFocusIn(e) {
    if (!isEditable(e.target)) return
    focused = e.target
    scheduleBatch()
  }

  function onFocusOut() {
    focused = null
    applyLift(0)
  }

  function onCaret() {
    if (focused) request()
  }

  function mount() {
    syncHeight()
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    document.addEventListener('click', onCaret, true)
    document.addEventListener('keyup', onCaret, true)
    document.addEventListener('input', onCaret, true)
    window.visualViewport?.addEventListener('resize', onCaret)
    window.visualViewport?.addEventListener('scroll', onCaret)
    window.addEventListener('resize', onCaret)
    window.addEventListener('orientationchange', scheduleBatch)
  }

  function unmount() {
    if (raf) window.cancelAnimationFrame(raf)
    for (const t of timers) window.clearTimeout(t)
    document.removeEventListener('focusin', onFocusIn)
    document.removeEventListener('focusout', onFocusOut)
    document.removeEventListener('click', onCaret, true)
    document.removeEventListener('keyup', onCaret, true)
    document.removeEventListener('input', onCaret, true)
    window.visualViewport?.removeEventListener('resize', onCaret)
    window.visualViewport?.removeEventListener('scroll', onCaret)
    window.removeEventListener('resize', onCaret)
    window.removeEventListener('orientationchange', scheduleBatch)
    applyLift(0)
  }

  return { mount, unmount }
}
