import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

// The website's feature clips (npm run site:clips). Re-record them after any visible change to the app.
const CLIPS = ['today', 'timer', 'backlog', 'insights'];

describe('website feature clips (GTM-05)', () => {
  for (const name of CLIPS) {
    it(`${name}: an MP4 clip with a poster, small enough for mobile data`, () => {
      const mp4 = `site/clips/${name}.mp4`, jpg = `site/clips/${name}.jpg`;
      expect(existsSync(mp4), mp4).toBe(true);
      expect(existsSync(jpg), jpg).toBe(true);
      expect(readFileSync(mp4).subarray(4, 8).toString()).toBe('ftyp'); // MP4 container
      expect([...readFileSync(jpg).subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]); // JPEG
      expect(statSync(mp4).size).toBeLessThan(400_000);
      // the app must fill the frame: a recording size larger than the page pads it with flat grey (128,128,128)
      const frame = execFileSync('ffmpeg', ['-loglevel', 'error', '-ss', '1', '-i', mp4, '-frames:v', '1', '-vf', 'scale=39:84', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']);
      let grey = 0, n = 0;
      for (let y = 42; y < 84; y++) for (let x = 20; x < 39; x++, n++) {
        const o = (y * 39 + x) * 3;
        if ([0, 1, 2].every(c => Math.abs(frame[o + c] - 128) < 10)) grey++;
      }
      expect(grey / n, 'share of the bottom-right quarter that is padding grey').toBeLessThan(0.5);
    });
  }
});
