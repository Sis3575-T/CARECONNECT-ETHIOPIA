import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5176,
    strictPort: true,
    host: true
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../../shared'),
      '@': path.resolve(__dirname, './src')
    }
  }
});
