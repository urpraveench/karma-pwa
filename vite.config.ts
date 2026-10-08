import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// What this build is: the package.json version, the git commit (with -dirty if there were uncommitted
// changes), and when it was built. Shown in the app and published as version.json so the app can tell
// when a newer build is live.
const git = (cmd: string) => { try { return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return ''; } };
const BUILD = {
  version: JSON.parse(readFileSync('package.json', 'utf8')).version as string,
  commit: (git('git rev-parse --short HEAD') || 'unknown') + (git('git status --porcelain') ? '-dirty' : ''),
  builtAt: new Date().toISOString(),
};

const versionFile: Plugin = {
  name: 'tiktym-version-file',
  apply: 'build',
  generateBundle() { this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify(BUILD) + '\n' }); },
};

export default defineConfig({
  define: { __BUILD__: JSON.stringify(BUILD) },
  plugins: [
    react(),
    versionFile,
    VitePWA({
      // A new deploy activates on the next load, without asking.
      registerType: 'autoUpdate',
      includeManifestIcons: false, // the precache glob below already covers icons/
      manifest: {
        name: 'TikTym',
        short_name: 'TikTym',
        description: 'One minute, one point. Track daily practices and clear your backlog.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#EDF0EA',
        theme_color: '#EDF0EA',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // The app shell (hashed JS/CSS + index.html) is precached, so the app opens offline.
        // Firebase chunks are only fetched in firebase mode; cache them when used rather than up front.
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        globIgnores: ['**/index.esm-*.js', '**/firebase*.js', '**/og.png'], // og.png is only for link previews
        navigateFallback: 'index.html',
        // Firebase Hosting's reserved addresses, such as the Google sign-in relay page /__/auth/handler,
        // must reach the network; answering them with the app shell breaks sign-in.
        navigateFallbackDenylist: [/^\/__\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === self.location.origin && /\/assets\/(index\.esm|firebase).*\.js$/.test(url.pathname),
            handler: 'CacheFirst', // hashed filenames never change
            options: { cacheName: 'firebase-sdk', expiration: { maxEntries: 10 } },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts', expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 3600 }, cacheableResponse: { statuses: [0, 200] } },
          },
          // Firestore and Auth traffic is never matched, so it always goes to the network (Firestore has its own offline cache).
        ],
      },
    }),
  ],
  test: {
    include: ['tests/**/*.test.ts'],
    // npm run test:report sets REPORT=1 to add the HTML report.
    reporters: process.env.REPORT ? ['default', ['html', { outputDir: 'reports/unit' }]] : ['default'],
  },
});
