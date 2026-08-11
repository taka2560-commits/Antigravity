import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: '測量座標管理アプリ (Antigravity)',
        short_name: '測量座標管理',
        description: '測量現場で活用できる多機能な座標管理・計算ツール',
        theme_color: '#2e3440',
        background_color: '#eceff4',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,par}'],
        maximumFileSizeToCacheInBytes: 25 * 1024 * 1024
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'pdf-vendor': ['jspdf', 'jspdf-autotable', 'html2canvas'],
          'sheet-vendor': ['xlsx', 'papaparse'],
          'map-vendor': ['leaflet', 'react-leaflet', 'proj4'],
          'chart-vendor': ['recharts']
        }
      }
    }
  },
  server: {
    proxy: {
      '/api/geoid': {
        target: 'https://vldb.gsi.go.jp/sokuchi/surveycalc/geoid/calcgh/cgi/geoidcalc.pl',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/geoid/, '')
      }
    }
  }
})
