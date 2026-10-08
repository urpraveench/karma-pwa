import type { Page } from '@playwright/test';
import { expect, signIn, test } from './helpers';

// The goal chime (TIMER-05) on a fake Web Audio engine: it records what the app plays, and can behave like
// iOS, which suspends audio and keeps it suspended until something wakes it.
async function fakeAudio(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>;
    const log: { at: number; state: string }[] = [];
    let t = 0;
    const ctl = { state: 'running', resumable: true, resumes: 0 };
    class FakeAudioContext {
      destination = {};
      get state() { return ctl.state; }
      get currentTime() { return ctl.state === 'running' ? (t += 0.01) : t; }
      resume() { ctl.resumes++; if (ctl.resumable) ctl.state = 'running'; return ctl.resumable ? Promise.resolve() : new Promise(() => {}); }
      createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: (d: unknown) => d }; }
      createOscillator() {
        return { type: '', frequency: { value: 0 }, connect: (g: unknown) => g, stop() {},
          start: () => log.push({ at: Date.now(), state: ctl.state }) };
      }
    }
    w.AudioContext = FakeAudioContext;
    w.__chime = { log, ctl };
  });
}
const chime = (page: Page) => page.evaluate(() => (window as unknown as { __chime: { log: { state: string }[]; ctl: { resumes: number } } }).__chime);
const setAudio = (page: Page, state: string, resumable: boolean) =>
  page.evaluate(([s, r]) => { const c = (window as unknown as { __chime: { ctl: { state: string; resumable: boolean } } }).__chime.ctl; c.state = s as string; c.resumable = r as boolean; }, [state, resumable] as const);

test.describe('goal chime (TIMER-05)', () => {
  test.beforeEach(async ({ page }) => {
    await fakeAudio(page);
    await signIn(page);
    await page.locator('.cat').nth(3).locator('.tbtn').click(); // Meditation, 10-minute target
    await expect(page.locator('.focus')).toBeVisible();
  });

  test('plays at the target', async ({ page }) => {
    await page.clock.fastForward('10:01');
    await expect.poll(async () => (await chime(page)).log.length).toBe(3); // three rising tones
  });

  test('wakes audio that iOS suspended, and plays at the target, not later', async ({ page }) => {
    await setAudio(page, 'suspended', true);
    await page.clock.fastForward('10:01');
    await expect.poll(async () => (await chime(page)).log.length).toBe(3);
    expect((await chime(page)).log.every(n => n.state === 'running')).toBe(true); // scheduled only once awake
  });

  test("skips the sound rather than playing it late when audio can't be woken", async ({ page }) => {
    await setAudio(page, 'suspended', false);
    await page.clock.fastForward('10:01');
    await expect(page.locator('.toast span')).toContainText('target reached'); // the visual alert still fires
    await page.clock.fastForward(5000);
    // audio comes back minutes later (iOS on the next tap): nothing queued may play now
    await setAudio(page, 'running', true);
    await page.clock.fastForward('03:00');
    expect((await chime(page)).log.length).toBe(0);
  });

  test('a tap anywhere wakes suspended audio, ready for the target', async ({ page }) => {
    await setAudio(page, 'suspended', true);
    const before = (await chime(page)).ctl.resumes;
    await page.locator('.f-name').click();
    expect((await chime(page)).ctl.resumes).toBeGreaterThan(before);
  });
});
