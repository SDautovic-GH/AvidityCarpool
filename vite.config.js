import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const buildId = String(Date.now());

const emitVersionPlugin = () => ({
  name: 'emit-version-json',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'version.json',
      source: JSON.stringify({ buildId }),
    });
  },
});

export default defineConfig({
  plugins: [react(), tailwindcss(), emitVersionPlugin()],
  define: {
    __APP_BUILD_ID__: JSON.stringify(buildId),
  },
  base: '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          vendor: ['react', 'react-dom', 'lucide-react'],
        },
      },
    },
  },
});
