import { defineConfig } from 'vite';
import { rename } from 'fs/promises';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  plugins: [
    {
      name: 'landing-page-routing',
      // Dev: serve landing.html when visiting /
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url === '/' || req.url === '') req.url = '/landing.html';
          next();
        });
      },
      // Build: rename dist/landing.html → dist/index.html for Cloudflare
      async closeBundle() {
        try { await rename('./dist/landing.html', './dist/index.html'); } catch {}
      }
    }
  ],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    cssCodeSplit: false,
    rollupOptions: {
      input: {
        landing: './landing.html', // landing page → served at /
        app:     './app.html',     // main app     → served at /app.html
      },
      output: {
        manualChunks: {
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  server: {
    port: 3000,
    strictPort: false,
  },
});
