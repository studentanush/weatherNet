// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import cesium from 'vite-plugin-cesium'
import tailwindcss from '@tailwindcss/vite'
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), 
    cesium()
  ],
  
    server: {
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '3c8d1de0d7a1.ngrok-free.app' // ✅ Add your ngrok URL here
    ]
  }
})