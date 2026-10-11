import { expect, test, signIn, toast } from './helpers';

const denyMicrophone = async (page: import('@playwright/test').Page) => {
  await page.addInitScript(() => {
    class PresentMediaRecorder { static isTypeSupported() { return true; } }
    Object.defineProperty(window, 'MediaRecorder', { configurable: true, value: PresentMediaRecorder });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: () => Promise.reject(new DOMException('Blocked for test', 'NotAllowedError')) },
    });
  });
};

const openTypedVoice = async (page: import('@playwright/test').Page) => {
  await denyMicrophone(page);
  await signIn(page);
  await page.click('.tab-log');
  await page.getByRole('button', { name: 'Type instead' }).click();
};

const fakeRecording = async (page: import('@playwright/test').Page, failFirstAI = false, waitForAbort = false, stopUnexpectedly = false, busyFirstAI = false) => {
  await page.addInitScript(({ failFirst, waitForAbort, stopUnexpectedly, busyFirst }) => {
    const stats = { permissionRequests: 0, recorderStarts: 0, trackStops: 0, aiCalls: 0, aiAborts: 0 };
    (window as unknown as { __voiceStats: typeof stats }).__voiceStats = stats;
    const track = { stop: () => { stats.trackStops++; } };
    const stream = { getTracks: () => [track], getAudioTracks: () => [track] };
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: async () => { stats.permissionRequests++; return stream; } },
    });
    class FakeMediaRecorder {
      static isTypeSupported(type: string) { return type === 'audio/webm;codecs=opus'; }
      state = 'inactive';
      mimeType: string;
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(_stream: unknown, options?: { mimeType?: string }) { this.mimeType = options?.mimeType || 'audio/webm'; }
      start() {
        this.state = 'recording';
        stats.recorderStarts++;
        if (stopUnexpectedly) window.setTimeout(() => {
          if (this.state !== 'recording') return;
          this.state = 'inactive';
          this.ondataavailable?.({ data: new Blob(['recorded voice'], { type: this.mimeType }) });
          this.onstop?.();
        }, 20);
      }
      stop() {
        if (this.state === 'inactive') return;
        this.state = 'inactive';
        this.ondataavailable?.({ data: new Blob(['recorded voice'], { type: this.mimeType }) });
        this.onstop?.();
      }
    }
    Object.defineProperty(window, 'MediaRecorder', { configurable: true, value: FakeMediaRecorder });
    window.__TIKTYM_VOICE_AI__ = async ({ categories, signal }) => {
      stats.aiCalls++;
      if (waitForAbort) return await new Promise((_resolve, reject) => signal?.addEventListener('abort', () => {
        stats.aiAborts++;
        reject(new DOMException('Cancelled for test', 'AbortError'));
      }, { once: true }));
      if (busyFirst && stats.aiCalls === 1) throw new Error('[429 RESOURCE_EXHAUSTED] busy for test');
      if (failFirst && stats.aiCalls === 1) throw Object.assign(new Error('offline'), { code: 'ai/fetch-error' });
      const exercise = categories.find(category => category.name === 'Exercise')!;
      return {
        transcript: 'I did an exercise for 5 minutes today',
        entries: [{ categoryId: exercise.id, minutes: 5 }],
        unresolved: [],
      };
    };
  }, { failFirst: failFirstAI, waitForAbort, stopUnexpectedly, busyFirst: busyFirstAI });
};

const crashingRecorder = async (page: import('@playwright/test').Page) => {
  await page.addInitScript(() => {
    const stats = { trackStops: 0 };
    (window as unknown as { __crashStats: typeof stats }).__crashStats = stats;
    const track = { stop: () => { stats.trackStops++; } };
    const stream = { getTracks: () => [track], getAudioTracks: () => [track] };
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: async () => stream },
    });
    class CrashingMediaRecorder {
      static isTypeSupported() { return true; }
      state = 'inactive';
      mimeType = 'audio/webm';
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      onerror: (() => void) | null = null;
      start() {
        this.state = 'recording';
        setTimeout(() => {
          this.onerror?.();
          this.state = 'inactive';
          this.ondataavailable?.({ data: new Blob(['partial'], { type: this.mimeType }) });
          this.onstop?.();
        }, 20);
      }
      stop() {
        this.state = 'inactive';
        this.onstop?.();
      }
    }
    Object.defineProperty(window, 'MediaRecorder', { configurable: true, value: CrashingMediaRecorder });
  });
};

test.describe('Voice log', () => {
  test('reviews, edits and removes typed entries before saving (LOG-28)', async ({ page }) => {
    await openTypedVoice(page);
    await page.fill('.voice-input', 'walked 20, read fifteen');
    await page.click('.voice-review');

    await expect(page.locator('.voice-row')).toHaveCount(2);
    await expect(page.locator('.voice-row select option:checked')).toHaveText(['Exercise', 'Reading']);
    await expect(page.locator('.voice-row input').nth(0)).toHaveValue('20');
    await expect(page.locator('.voice-row input').nth(1)).toHaveValue('15');
    await page.locator('.voice-row input').first().fill('25');
    await page.getByRole('button', { name: 'Remove entry 2' }).click();
    await expect(page.locator('.voice-row')).toHaveCount(1);
    await page.click('.voice-save');
    await expect(toast(page)).toHaveText('+25 Exercise');
  });

  test('saves several typed entries with one confirmation and one Undo (LOG-28)', async ({ page }) => {
    await openTypedVoice(page);
    await page.fill('.voice-input', 'exercise 20 reading 15');
    await page.click('.voice-review');
    await page.click('.voice-save');

    await expect(toast(page)).toHaveText('Logged 2 entries · 35 minutes');
    await expect(page.locator('.mala-center .big')).toHaveText('65');
    await page.click('.tundo');
    await expect(toast(page)).toHaveText('Undone');
    await expect(page.locator('.mala-center .big')).toHaveText('100');
  });

  test('shows unclear words and saves nothing until they are fixed (LOG-27)', async ({ page }) => {
    await openTypedVoice(page);
    await page.fill('.voice-input', 'danced 20 read 15');
    await page.click('.voice-review');

    await expect(page.locator('.voice-unmatched')).toContainText('“danced 20”');
    await expect(page.locator('.voice-save')).toHaveCount(0);
    await expect(page.locator('.mala-center .big')).toHaveText('100');
    await page.getByRole('button', { name: 'Edit what I heard' }).click();
    await page.fill('.voice-input', 'exercised 20 read 15');
    await page.click('.voice-review');
    await expect(page.locator('.voice-save')).toBeVisible();
  });

  test('records in one tap in a compact sheet, understands the audio and saves it (LOG-10, LOG-26)', async ({ page }) => {
    await fakeRecording(page);
    await signIn(page);
    await page.click('.tab-log');

    await expect(page.getByRole('heading', { name: 'Log with your voice' })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveAccessibleName('Log with your voice');
    await expect(page.getByText('Listening…')).toBeAttached();
    await expect(page.locator('.voice-recorder .voice-time')).toHaveText(/0:0\d/);
    await expect(page.locator('.voice-privacy')).toContainText('sent to Google');
    // Compact: the recording sheet stays in the lower part of the screen.
    const viewport = page.viewportSize()!;
    expect((await page.getByRole('dialog').boundingBox())!.height).toBeLessThan(viewport.height * 0.45);
    await expect(page.locator('.voice-wave i')).toHaveCount(17);
    // The wave travels while recording, even before any sound reaches it.
    const heights = () => page.locator('.voice-wave i').evaluateAll(bars => bars.map(bar => (bar as HTMLElement).style.height).join());
    const first = await heights();
    await expect.poll(heights).not.toBe(first);
    await expect(page.getByRole('button', { name: 'Cancel recording' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Finish recording' })).toBeFocused();
    await expect.poll(() => page.evaluate(() => (window as unknown as { __voiceStats: { permissionRequests: number } }).__voiceStats.permissionRequests)).toBe(1);
    await expect.poll(() => page.evaluate(() => (window as unknown as { __voiceStats: { recorderStarts: number } }).__voiceStats.recorderStarts)).toBe(1);

    await page.getByRole('button', { name: 'Finish recording' }).click();
    await expect(page.getByRole('heading', { name: 'Here’s what I found' })).toBeVisible();
    await expect(page.locator('.voice-transcript')).toContainText('I did an exercise for 5 minutes today');
    await expect(page.locator('.voice-row select option:checked')).toHaveText('Exercise');
    await expect(page.locator('.voice-row input')).toHaveValue('5');
    await expect(page.locator('.voice-unmatched')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => (window as unknown as { __voiceStats: { aiCalls: number; trackStops: number } }).__voiceStats.aiCalls)).toBe(1);
    await expect.poll(() => page.evaluate(() => (window as unknown as { __voiceStats: { aiCalls: number; trackStops: number } }).__voiceStats.trackStops)).toBe(1);
    await page.click('.voice-save');
    await expect(toast(page)).toHaveText('+5 Exercise');
    await expect(page.locator('.mala-center .big')).toHaveText('95');
  });

  test('manual minute buttons stay one link away while recording (LOG-10)', async ({ page }) => {
    await fakeRecording(page);
    await signIn(page);
    await page.click('.tab-log');
    await page.getByRole('button', { name: 'Enter minutes manually' }).click();
    await expect(page.locator('.pick .chip')).toHaveText(['Exercise30', 'Reading30', 'Course study30', 'Meditation10']);
    await expect(page.locator('.tile', { hasText: /^10$/ })).toBeVisible();
    await expect.poll(() => page.evaluate(() => (window as unknown as { __voiceStats: { trackStops: number } }).__voiceStats.trackStops)).toBe(1);
  });

  test('explains blocked microphone access and keeps both fallbacks (LOG-29)', async ({ page }) => {
    await denyMicrophone(page);
    await signIn(page);
    await page.click('.tab-log');
    await expect(page.locator('.voice-problem')).toContainText('Microphone access is off');
    await expect(page.getByRole('button', { name: 'Try microphone again' })).toBeVisible();
    await page.getByRole('button', { name: 'Type instead' }).click();
    await expect(page.locator('.voice-privacy')).toContainText('Typed updates stay on this device');
    await page.fill('.voice-input', 'read 15');
    await page.click('.voice-review');
    await expect(page.locator('.voice-row select option:checked')).toHaveText('Reading');
    await expect(page.getByRole('button', { name: 'Enter minutes manually' })).toBeVisible();
  });

  test('keeps the recording for one-tap retry after AI fails (LOG-29)', async ({ page }) => {
    await fakeRecording(page, true);
    await signIn(page);
    await page.click('.tab-log');
    await page.getByRole('button', { name: 'Finish recording' }).click();
    await expect(page.locator('.voice-problem')).toContainText('could not reach voice processing');
    await expect(page.locator('.mala-center .big')).toHaveText('100');
    await page.getByRole('button', { name: 'Try this recording again' }).click();
    await expect(page.getByRole('heading', { name: 'Here’s what I found' })).toBeVisible();
    await expect.poll(() => page.evaluate(() => (window as unknown as { __voiceStats: { aiCalls: number; recorderStarts: number } }).__voiceStats.aiCalls)).toBe(2);
    await expect.poll(() => page.evaluate(() => (window as unknown as { __voiceStats: { aiCalls: number; recorderStarts: number } }).__voiceStats.recorderStarts)).toBe(1);
  });

  test('retries one temporary busy response without interrupting the user (LOG-29)', async ({ page }) => {
    await fakeRecording(page, false, false, false, true);
    await signIn(page);
    await page.click('.tab-log');
    await page.getByRole('button', { name: 'Finish recording' }).click();

    await expect(page.getByRole('heading', { name: 'Here’s what I found' })).toBeVisible();
    await expect(page.locator('.voice-row select option:checked')).toHaveText('Exercise');
    await expect(page.locator('.voice-row input')).toHaveValue('5');
    await expect.poll(() => page.evaluate(() => (window as unknown as { __voiceStats: { aiCalls: number; recorderStarts: number } }).__voiceStats.aiCalls)).toBe(2);
    await expect.poll(() => page.evaluate(() => (window as unknown as { __voiceStats: { aiCalls: number; recorderStarts: number } }).__voiceStats.recorderStarts)).toBe(1);
    await expect(page.getByRole('heading', { name: 'That did not work' })).toHaveCount(0);
  });

  test('explains the voice limit in plain words and keeps typing available (LOG-30)', async ({ page }) => {
    await fakeRecording(page);
    await page.addInitScript(() => {
      window.__TIKTYM_VOICE_AI__ = async () => {
        throw Object.assign(new Error('You have used voice logging 50 times today. Type your update, or try voice again tomorrow.'), { code: 'functions/resource-exhausted' });
      };
    });
    await signIn(page);
    await page.click('.tab-log');
    await page.getByRole('button', { name: 'Finish recording' }).click();
    await expect(page.locator('.voice-problem')).toContainText('used voice logging 50 times today');
    await expect(page.locator('.mala-center .big')).toHaveText('100');
    await expect(page.getByRole('button', { name: 'Type instead' })).toBeVisible();
  });

  test('keeps the recorder error visible when the browser stops after an error (LOG-29)', async ({ page }) => {
    await crashingRecorder(page);
    await signIn(page);
    await page.click('.tab-log');

    await expect(page.locator('.voice-problem')).toContainText('recording stopped unexpectedly');
    await page.waitForTimeout(100);
    await expect(page.locator('.voice-problem')).toContainText('recording stopped unexpectedly');
    await expect(page.getByRole('button', { name: 'Try microphone again' })).toBeVisible();
    await expect.poll(() => page.evaluate(() => (window as unknown as { __crashStats: { trackStops: number } }).__crashStats.trackStops)).toBe(1);
  });

  test('continues to review if the browser ends a usable recording by itself (LOG-29)', async ({ page }) => {
    await fakeRecording(page, false, false, true);
    await signIn(page);
    await page.click('.tab-log');

    await expect(page.getByRole('heading', { name: 'Here’s what I found' })).toBeVisible();
    await expect(page.locator('.voice-row select option:checked')).toHaveText('Exercise');
    await expect(page.locator('.voice-row input')).toHaveValue('5');
    await expect.poll(() => page.evaluate(() => (window as unknown as { __voiceStats: { aiCalls: number; trackStops: number } }).__voiceStats.aiCalls)).toBe(1);
    await expect.poll(() => page.evaluate(() => (window as unknown as { __voiceStats: { aiCalls: number; trackStops: number } }).__voiceStats.trackStops)).toBe(1);
  });

  test('stops recording if the app goes into the background (LOG-29)', async ({ page }) => {
    await fakeRecording(page);
    await signIn(page);
    await page.click('.tab-log');

    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(page.locator('.voice-problem')).toContainText('recording ended when the app went into the background');
    await expect.poll(() => page.evaluate(() => (window as unknown as { __voiceStats: { trackStops: number } }).__voiceStats.trackStops)).toBe(1);
    await expect(page.getByRole('button', { name: 'Try microphone again' })).toBeVisible();
  });

  test('stops the old microphone if the voice sheet is replaced (LOG-29)', async ({ page }) => {
    await fakeRecording(page);
    await signIn(page);
    await page.click('.tab-log');
    await expect.poll(() => page.evaluate(() => (window as unknown as { __voiceStats: { recorderStarts: number } }).__voiceStats.recorderStarts)).toBe(1);

    await page.locator('.tab-log').evaluate(element => (element as HTMLButtonElement).click());
    await expect.poll(() => page.evaluate(() => (window as unknown as { __voiceStats: { recorderStarts: number } }).__voiceStats.recorderStarts)).toBe(2);
    await expect.poll(() => page.evaluate(() => (window as unknown as { __voiceStats: { trackStops: number } }).__voiceStats.trackStops)).toBe(1);
    await page.getByRole('button', { name: 'Cancel recording' }).click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { __voiceStats: { trackStops: number } }).__voiceStats.trackStops)).toBe(2);
  });

  test('Cancel during understanding aborts the AI request (LOG-29)', async ({ page }) => {
    await fakeRecording(page, false, true);
    await signIn(page);
    await page.click('.tab-log');
    await page.getByRole('button', { name: 'Finish recording' }).click();
    await expect(page.getByRole('heading', { name: 'Understanding your update…' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Understanding your update…' })).toBeFocused();

    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => (window as unknown as { __voiceStats: { aiAborts: number } }).__voiceStats.aiAborts)).toBe(1);
  });

  test('keeps keyboard focus inside the voice sheet and returns it on close (LOG-29)', async ({ page }) => {
    await fakeRecording(page);
    await signIn(page);
    await page.click('.tab-log');

    await expect(page.getByRole('button', { name: 'Finish recording' })).toBeFocused();
    for (let step = 0; step < 8; step++) {
      await page.keyboard.press('Tab');
      await expect.poll(() => page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')))).toBe(true);
    }

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('.tab-log')).toBeFocused();
    await expect.poll(() => page.evaluate(() => (window as unknown as { __voiceStats: { trackStops: number } }).__voiceStats.trackStops)).toBe(1);
  });
});
