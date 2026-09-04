import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://127.0.0.1:8000',
      '/resumes': 'http://127.0.0.1:8000',
      '/analysis': 'http://127.0.0.1:8000',
      '/jobs': 'http://127.0.0.1:8000',
      '/health': 'http://127.0.0.1:8000',
    },
  },
})
