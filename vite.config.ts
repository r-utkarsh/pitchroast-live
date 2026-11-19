import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const appKey = env.VITE_NEXCONN_APP_KEY || env.NEXCONN_APP_KEY || '';

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_NEXCONN_APP_KEY': JSON.stringify(appKey),
    },
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: 'http://localhost:8787',
          changeOrigin: false,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  };
});
