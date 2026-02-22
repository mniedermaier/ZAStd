import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  define: {
    __BUILD_DATE__: JSON.stringify(
      new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')
    ),
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@zastd/engine': path.resolve(__dirname, '../engine/src'),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
        },
      },
    },
  },
});
