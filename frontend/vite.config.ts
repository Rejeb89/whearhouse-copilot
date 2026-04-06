import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 3000 },
  preview: { port: 3000, host: '0.0.0.0' },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress visx related warnings
        if (warning.message?.includes('@visx')) return
        warn(warning)
      }
    }
  }
})
