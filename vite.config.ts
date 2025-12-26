import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2022',
    outDir: 'dist',
    rollupOptions: {
      // CRITICAL: We tell Vite NOT to bundle these, because they are loaded via CDN (esm.sh) in index.html
      // This keeps the build extremely fast and light.
      external: [
        '@angular/core',
        '@angular/common',
        '@angular/compiler',
        '@angular/platform-browser',
        '@angular/forms',
        '@google/genai',
        'rxjs',
        'rxjs/operators',
        'zone.js',
        'tslib'
      ]
    }
  },
  // This allows process.env.API_KEY to be replaced by the Vercel Environment Variable during build
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
});