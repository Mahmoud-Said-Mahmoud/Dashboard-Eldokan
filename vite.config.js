import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    proxy: {
      '/wp-json': {
        target: 'https://www.eldokan.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
