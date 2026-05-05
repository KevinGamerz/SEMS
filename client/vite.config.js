import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { spawn } from 'child_process'
import path from 'path'

// Auto-start the backend server
function startBackend() {
  return {
    name: 'start-backend',
    configureServer() {
      const serverDir = path.resolve(import.meta.dirname, '../server')
      const child = spawn('node', ['src/index.js'], {
        cwd: serverDir,
        stdio: 'inherit',
        shell: true
      })
      child.on('error', (err) => {
        console.error('[VITE] Failed to start backend:', err.message)
      })
      child.on('exit', (code) => {
        if (code) console.error(`[VITE] Backend exited with code ${code}`)
      })
      // Kill backend when vite exits
      process.on('exit', () => child.kill())
      process.on('SIGTERM', () => child.kill())
    }
  }
}

export default defineConfig({
  plugins: [startBackend(), react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
