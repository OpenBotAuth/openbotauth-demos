import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    cors: true,
    fs: {
      // Allow serving files from the entire workspace
      allow: ['..', '../..']
    }
  }
})

