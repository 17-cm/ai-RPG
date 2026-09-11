import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    host: true, // 监听 0.0.0.0，手机浏览器可通过映射端口访问
    // 本地开发时，前端发出的 /api/* 请求转发给 dev-server.js（模拟线上云函数）
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
})
