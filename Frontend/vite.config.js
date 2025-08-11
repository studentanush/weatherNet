// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import cesium from 'vite-plugin-cesium'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(), // Place React first to ensure it's processed properly
    cesium() // Cesium is often last to avoid conflicts
  ],
})