import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
 const env = loadEnv(mode, process.cwd(), '');
 return {
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/core-api': { target: env.CORE_API_PROXY_TARGET || 'https://rbase-core-api.onrender.com', changeOrigin: true, rewrite: path => path.replace(/^\/core-api/, '') },
      '/gotit-api': { target: env.GOTIT_API_PROXY_TARGET || 'https://gotit-backend.onrender.com', changeOrigin: true, rewrite: path => path.replace(/^\/gotit-api/, '') },
    },
  },
}; });
