
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2022',
    outDir: 'dist',
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  // Optimize dependencies to prevent Rollup trace errors with Angular
  optimizeDeps: {
    include: [
      '@angular/core',
      '@angular/common',
      '@angular/compiler',
      '@angular/platform-browser',
      '@angular/forms',
      'rxjs',
      'zone.js'
    ]
  },
  esbuild: {
    target: 'es2022',
    keepNames: true,
    supported: {
      'top-level-await': true
    },
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
        useDefineForClassFields: false
      }
    }
  },
  define: {
    // Safely inject the process.env object with the API Key for Vercel
    'process.env': {
      API_KEY: process.env.API_KEY || ''
    }
  }
});
