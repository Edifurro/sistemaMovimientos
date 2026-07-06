import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import inspector from 'vite-plugin-vue-inspector'

export default defineConfig({
  plugins: [
    vue(),
    inspector({
      enabled: true,
      toggleKey: 'ctrl-shift-i',
      inspectorMode: 'default'
    })
  ],
  server: {
    port: 3000,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
})
