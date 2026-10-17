// Records the motion logo (the animated SVGs from `npm run brand:kit`) into videos in public/brand/motion/:
// end cards as MP4 with sound, a transparent WebM to go over footage, and a GIF for emails (GTM-24).
// Run with `npm run brand:motion` after `npm run brand:kit`. Needs Chrome and ffmpeg.
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { duration, soundWav } from './logo-motion.ts';

const SVG = fileURLToPath(new URL('../public/brand/svg/', import.meta.url));
const OUT = fileURLToPath(new URL('../public/brand/motion/', import.meta.url));
const HOLD = 1.65; // the finished logo stays on screen this long, so each video is 4 seconds
const SECONDS = +(duration(true) + HOLD).toFixed(2);

// Backgrounds from the brand: dark and light. `logo` is the lockup's width in pixels.
const DARK = '#0F1B19', LIGHT = '#EDF0EA';
const VIDEOS = [
  { file: 'tiktym-end-card-vertical-dark.mp4', svg: 'tagline-stacked-color-on-dark', w: 1080, h: 1920, logo: 760, bg: DARK },
  { file: 'tiktym-end-card-vertical-light.mp4', svg: 'tagline-stacked-color', w: 1080, h: 1920, logo: 760, bg: LIGHT },
  { file: 'tiktym-end-card-wide-dark.mp4', svg: 'tagline-horizontal-color-on-dark', w: 1920, h: 1080, logo: 1100, bg: DARK },
  { file: 'tiktym-end-card-wide-light.mp4', svg: 'tagline-horizontal-color', w: 1920, h: 1080, logo: 1100, bg: LIGHT },
  { file: 'tiktym-tagline-stacked-white.webm', svg: 'tagline-stacked-white', w: 1080, h: 1080, logo: 760, bg: null }, // transparent
  { file: 'tiktym-horizontal-color.gif', svg: 'horizontal-color', w: 600, h: 200, logo: 520, bg: '#FFFFFF', fps: 15 },
];

const tmp = mkdtempSync(join(tmpdir(), 'tiktym-motion-'));
const wav = join(tmp, 'sound.wav');
writeFileSync(wav, soundWav(SECONDS));
mkdirSync(OUT, { recursive: true });

const ffmpeg = (...args) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args]);
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
for (const v of VIDEOS) {
  const fps = v.fps ?? 30, frames = Math.round(SECONDS * fps), dir = join(tmp, v.file);
  mkdirSync(dir);
  const svg = readFileSync(`${SVG}tiktym-${v.svg}-animated.svg`, 'utf8').replace(/width="[^"]+" height="[^"]+"/, `width="${v.logo}"`);
  await page.setViewportSize({ width: v.w, height: v.h });
  await page.setContent(`<html><body style="margin:0;width:${v.w}px;height:${v.h}px;display:grid;place-items:center;background:${v.bg ?? 'transparent'}">${svg}</body></html>`);
  // Step through the animation frame by frame, rather than recording it live, so no frame is ever dropped.
  for (let i = 0; i < frames; i++) {
    await page.evaluate(ms => document.getAnimations().forEach(a => { a.pause(); a.currentTime = ms; }), i * 1000 / fps);
    await page.screenshot({ path: join(dir, `${String(i).padStart(4, '0')}.png`), omitBackground: !v.bg });
  }
  const input = ['-framerate', String(fps), '-i', join(dir, '%04d.png')], out = join(OUT, v.file);
  if (v.file.endsWith('.mp4')) {
    ffmpeg(...input, '-i', wav, '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', out);
  } else if (v.file.endsWith('.webm')) {
    ffmpeg(...input, '-i', wav, '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', '32', '-auto-alt-ref', '0',
      '-c:a', 'libopus', '-b:a', '96k', '-shortest', out);
  } else {
    // One palette for the whole clip, and no loop: it plays once and stays on the logo.
    ffmpeg(...input, '-vf', 'split[a][b];[a]palettegen=max_colors=64[p];[b][p]paletteuse=dither=none', '-loop', '-1', out);
  }
  console.log(`wrote ${v.file}`);
}
await browser.close();
rmSync(tmp, { recursive: true, force: true });
