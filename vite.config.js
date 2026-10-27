import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  // `npm run dev` : l'API tourne sur le serveur Node local (npm run dev:server)
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
