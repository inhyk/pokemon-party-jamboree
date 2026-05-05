import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true
      }
    }
  },
  build: {
    outDir: 'dist'
  },
  resolve: {
    alias: {
      'shared': path.resolve(__dirname, '../shared/index.js')
    }
  },
});
