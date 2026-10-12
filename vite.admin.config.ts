import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The admin console (admin.tiktym.com): its own page and build, so none of it ships in the app at app.tiktym.com.
// Reads the same .env.local Firebase keys as the app. npm run admin:dev / admin:build.
export default defineConfig({
  root: 'admin',
  envDir: '..',
  plugins: [react()],
  server: { port: 5174, fs: { allow: ['..'] } },
  build: { outDir: '../dist-admin', emptyOutDir: true },
});
