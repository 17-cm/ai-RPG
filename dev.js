/**
 * dev.js —— npm run dev 的真正入口：一条命令同时起
 *   1. Vite 前端开发服务器（默认 5173）
 *   2. 本地 API 模拟服务 dev-server.js（8787）
 * 任一进程退出/被 Ctrl+C 时，另一个也一起收掉。
 */
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = dirname(fileURLToPath(import.meta.url))
const isWin = process.platform === 'win32'

const children = []

function run(name, cmd, args) {
  const child = spawn(cmd, args, { cwd: root, stdio: 'inherit', shell: isWin })
  child.on('exit', (code) => {
    console.log(`[dev] ${name} 退出 (code ${code})`)
    shutdown(code ?? 0)
  })
  children.push(child)
}

let shuttingDown = false
function shutdown(code) {
  if (shuttingDown) return
  shuttingDown = true
  for (const c of children) c.kill('SIGINT')
  setTimeout(() => process.exit(code), 300).unref()
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

run('api', process.execPath, [
  '--env-file-if-exists=.env',
  '--env-file-if-exists=.env.local',
  join(root, 'dev-server.js'),
])
run('web', process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js')])
