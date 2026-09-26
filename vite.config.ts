import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    target: 'es2022',
    // Rollbard's name corpora dominate the bundle. This is a local Electron app
    // loaded from disk, so there is no network round-trip to amortise and code
    // splitting would only add chunk-loading complexity for no user benefit.
    chunkSizeWarningLimit: 1200,
  },
  server: { port: 5173, strictPort: true },
});
