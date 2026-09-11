import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Packaged Electron loads index.html via file:// — absolute asset paths
// ("/assets/...") resolve to the filesystem root and fail, showing a blank
// white screen. Use relative paths so assets resolve next to index.html.
// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
})
