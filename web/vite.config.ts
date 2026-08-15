import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // In dev the API runs separately; proxying keeps cookies same-origin so
    // the httpOnly session works exactly as it does in production.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8055',
        changeOrigin: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
