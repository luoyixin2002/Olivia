
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2022',
    outDir: 'dist',
  },
  esbuild: {
    // Critical for Angular to work without the official plugin
    target: 'es2022',
    keepNames: true,
    supported: {
      'top-level-await': true
    },
    // These ensure decorators are transpiled in a way Angular JIT understands
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
        useDefineForClassFields: false
      }
    }
  },
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
  }
});
