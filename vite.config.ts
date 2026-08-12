import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages 部署路径: https://zitery.github.io/vaccine-quiz-pwa/
  base: '/vaccine-quiz-pwa/',
  plugins: [react()],
})
