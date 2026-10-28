import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_WIREMOCK_TARGET || 'http://localhost:8080';

  return {
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        '/__admin': {
          target,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            antd: ['antd', '@ant-design/icons'],
            vendor: ['axios', 'dayjs'],
          },
        },
      },
    },
  };
});
