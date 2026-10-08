import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';

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
    });
  }
});
