// Files in public/ that only the website (app.tiktym.com) needs, left out of the Android app's install so its download
// stays small (AND-12): the logo kit, the link-preview image, the web's notification worker (the app uses FCM, AND-08)
// and robots.txt. vite.config.ts removes them from dist-android after a native build.
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';

export const WEB_ONLY = ['brand', 'og.png', 'push-sw.js', 'robots.txt'];

/** Vite plugin for the native build: deletes WEB_ONLY from the build's output folder once it's written. */
export function dropWebOnly() {
  let outDir = '';
  return {
    name: 'drop-web-only',
    apply: 'build',
    configResolved(c) { outDir = resolve(c.root, c.build.outDir); },
    closeBundle() { for (const f of WEB_ONLY) rmSync(resolve(outDir, f), { recursive: true, force: true }); },
  };
}
