
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2022',
    outDir: 'dist',
    // REMOVED: rollupOptions with external. We now want to BUNDLE everything.
  },
  define: {
    // This allows Vite to perform static replacement of process.env.API_KEY string
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
  }
});
