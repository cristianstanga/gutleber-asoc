import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'

const gitHash = (() => {
  try { return execSync('git rev-parse --short HEAD').toString().trim() } catch { return 'dev' }
})()

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(`v2.0 · ${gitHash}`),
  },
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api':      { target: 'http://localhost:3001', changeOrigin: true },
      '/uploads':  { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
})
