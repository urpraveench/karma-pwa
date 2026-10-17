import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { cues, duration, FILLED, fillDelay, motionStyle, soundWav } from '../scripts/logo-motion';

// The motion logo (npm run brand:kit). Its look is checked by eye when it changes; these check its timing and that
// every animated file ends on, and falls back to, the exact static logo.
const LOCKUPS = ['mark', 'horizontal', 'tagline-horizontal', 'tagline-stacked'];
const THEMES = ['color', 'color-on-dark', 'white'];
const svg = (name: string) => readFileSync(`public/brand/svg/${name}.svg`, 'utf8');

describe('animated logo (GTM-23)', () => {
  it('fills the 18 beads clockwise, one every 50 ms, then pulses the gold bead (GTM-23)', () => {
    const ticks = cues().filter(c => c.sound === 'tick').map(c => c.at);
    expect(ticks).toHaveLength(FILLED);
    expect(ticks[0]).toBe(0.45);
    ticks.slice(1).forEach((at, k) => expect(at - ticks[k]).toBeCloseTo(0.05));
    expect(cues().at(-1)).toEqual({ at: 1.45, sound: 'chime' });
    expect(duration(false)).toBe(1.85);
    expect(duration(true)).toBe(2.35);
  });

  it('turns the animation off for reduced motion, and keeps colour keyframes apart per colour (GTM-23)', () => {
    const css = motionStyle({ id: 'color', ink: '#16302E', rest: '#CBD5CA', name: 'left' });
    expect(css).toContain('@media (prefers-reduced-motion:reduce){.tm-r,.tm-b,.tm-g,.tm-p,.tm-n,.tm-l{animation:none}}');
    expect(css).toContain('@keyframes tm-fill-color{from{fill:#CBD5CA}');
    expect(css).toContain('to{fill:#16302E}');
    expect(motionStyle({ id: 'x', ink: '#000', rest: '#999', name: null })).not.toContain('tm-name');
  });

  for (const lockup of LOCKUPS) for (const theme of THEMES) {
    const name = `tiktym-${lockup}-${theme}`;
    it(`${name}-animated.svg ends on the static logo, beads filling in order (GTM-23)`, () => {
      expect(existsSync(`public/brand/svg/${name}-animated.svg`)).toBe(true);
      const animated = svg(`${name}-animated`);
      expect(animated).toContain('prefers-reduced-motion');
      // Without the motion (its style, groups, classes and delays), it's the static file, byte for byte.
      const still = animated.replace(/<style>.*?<\/style>/, '').replace(/<g class="tm-[a-z]">|<\/g>/g, '')
        .replace(/ class="tm-[a-z]"/g, '').replace(/ style="[^"]*"/g, '');
      expect(still).toBe(svg(name));
      const delays = [...animated.matchAll(/class="tm-b" style="animation-delay:0\.1s,([\d.]+)s"/g)].map(m => +m[1]);
      expect(delays).toEqual(Array.from({ length: FILLED }, (_, k) => fillDelay(k)));
      expect(animated.match(/class="tm-r"/g)).toHaveLength(27 - FILLED);
      expect(animated.includes('class="tm-n"')).toBe(lockup !== 'mark');
      expect(animated.includes('class="tm-l"')).toBe(lockup.startsWith('tagline'));
    });
  }
});

describe('motion logo sound (GTM-24)', () => {
  it('is a mono 16-bit WAV, silent until the first tick, with the chime the loudest part (GTM-24)', () => {
    const rate = 8000, wav = soundWav(3, rate), view = new DataView(wav.buffer);
    expect(new TextDecoder().decode(wav.subarray(0, 4))).toBe('RIFF');
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint16(34, true)).toBe(16);
    expect(view.getUint32(40, true)).toBe(3 * rate * 2);
    const at = (s: number) => Math.abs(view.getInt16(44 + Math.round(s * rate) * 2, true));
    const peak = (from: number, to: number) => { let m = 0; for (let s = from; s < to; s += 1 / rate) m = Math.max(m, at(s)); return m; };
    expect(peak(0, 0.449)).toBe(0);
    expect(peak(0.45, 0.5)).toBeGreaterThan(1000);
    expect(peak(1.45, 1.6)).toBeGreaterThan(peak(0.45, 1.4));
  });
});

// The videos (npm run brand:motion): checked for format, length, sound and that they start empty and end on the logo.
const VIDEOS = [
  { file: 'tiktym-end-card-vertical-dark.mp4', w: 1080, h: 1920, audio: true },
  { file: 'tiktym-end-card-vertical-light.mp4', w: 1080, h: 1920, audio: true },
  { file: 'tiktym-end-card-wide-dark.mp4', w: 1920, h: 1080, audio: true },
  { file: 'tiktym-end-card-wide-light.mp4', w: 1920, h: 1080, audio: true },
  { file: 'tiktym-tagline-stacked-white.webm', w: 1080, h: 1080, audio: true },
  { file: 'tiktym-horizontal-color.gif', w: 600, h: 200, audio: false },
];
const probe = (file: string, entries: string) =>
  execFileSync('ffprobe', ['-v', 'error', '-show_entries', entries, '-of', 'json', file], { encoding: 'utf8' });
/** Share of a frame (scaled down) that differs from its first pixel, the background. */
function inked(file: string, at: number) {
  const codec = file.endsWith('.webm') ? ['-c:v', 'libvpx-vp9'] : []; // keeps the WebM's transparency
  const px = execFileSync('ffmpeg', ['-loglevel', 'error', ...codec, '-ss', String(at), '-i', file, '-frames:v', '1',
    '-vf', 'scale=60:60', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-']);
  let n = 0;
  for (let o = 0; o < px.length; o += 4) if ([0, 1, 2, 3].some(c => Math.abs(px[o + c] - px[c]) > 24)) n++;
  return n / (px.length / 4);
}

describe('motion logo videos (GTM-24)', () => {
  for (const v of VIDEOS) {
    it(`${v.file}: ${v.w}×${v.h}, 4 seconds${v.audio ? ' with sound' : ''}, empty at the start and the logo at the end (GTM-24)`, () => {
      const file = `public/brand/motion/${v.file}`;
      expect(existsSync(file), file).toBe(true);
      expect(statSync(file).size).toBeLessThan(400_000);
      const info = JSON.parse(probe(file, 'format=duration:stream=codec_type,width,height:stream_tags=alpha_mode'));
      expect(+info.format.duration).toBeCloseTo(4, 1);
      const video = info.streams.find((s: { codec_type: string }) => s.codec_type === 'video');
      expect([video.width, video.height]).toEqual([v.w, v.h]);
      expect(info.streams.some((s: { codec_type: string }) => s.codec_type === 'audio')).toBe(v.audio);
      if (v.file.endsWith('.webm')) expect(video.tags?.alpha_mode).toBe('1');
      expect(inked(file, 0)).toBe(0);
      expect(inked(file, 3.9)).toBeGreaterThan(0.03);
    });
  }

  it('the GIF plays once and stays on the logo (GTM-24)', () => {
    // A looping GIF carries the NETSCAPE2.0 extension; without it, mail apps play it once.
    expect(readFileSync('public/brand/motion/tiktym-horizontal-color.gif').includes('NETSCAPE2.0')).toBe(false);
  });
});
