import { expect, test, signIn, toast } from './helpers';

const typeInsteadOfSpeaking = async (page: import('@playwright/test').Page) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: undefined });
    Object.defineProperty(window, 'webkitSpeechRecognition', { configurable: true, value: undefined });
  });
};

test.describe('Voice log', () => {
  test('reviews, edits and removes matched entries before saving (LOG-28)', async ({ page }) => {
    await typeInsteadOfSpeaking(page);
    await signIn(page);
    await page.click('.tab-log');
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

  test('saves several entries with one confirmation and one Undo (LOG-28)', async ({ page }) => {
    await typeInsteadOfSpeaking(page);
    await signIn(page);
    await page.click('.tab-log');
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
    await typeInsteadOfSpeaking(page);
    await signIn(page);
    await page.click('.tab-log');
    await page.fill('.voice-input', 'danced 20 read 15');
    await page.click('.voice-review');

    await expect(page.locator('.voice-unmatched')).toContainText('“danced 20”');
    await expect(page.locator('.voice-save')).toHaveCount(0);
    await expect(page.locator('.mala-center .big')).toHaveText('100');
    await page.fill('.voice-input', 'exercised 20 read 15');
    await page.click('.voice-review');
    await expect(page.locator('.voice-save')).toBeVisible();
  });

  test('the main microphone listens once and reviews the transcript automatically (LOG-10, LOG-26)', async ({ page }) => {
    await page.addInitScript(() => {
      class FakeSpeechRecognition {
        lang = ''; continuous = false; interimResults = false;
        onstart: (() => void) | null = null;
        onresult: ((event: { resultIndex: number; results: Array<Array<{ transcript: string }> & { isFinal: boolean }> }) => void) | null = null;
        onerror: ((event: { error: string }) => void) | null = null;
        onend: (() => void) | null = null;
        start() {
          this.onstart?.();
          setTimeout(() => {
            const result = Object.assign([{ transcript: 'I did an exercise for 5 minutes today' }], { isFinal: true });
            this.onresult?.({ resultIndex: 0, results: [result] });
            this.onend?.();
          }, 0);
        }
        abort() {}
      }
      Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: FakeSpeechRecognition });
      Object.defineProperty(window, 'webkitSpeechRecognition', { configurable: true, value: FakeSpeechRecognition });
    });
    await signIn(page);
    await page.click('.tab-log');
    await expect(page.locator('.voice-input')).toHaveValue('I did an exercise for 5 minutes today');
    await expect(page.locator('.voice-row select option:checked')).toHaveText('Exercise');
    await expect(page.locator('.voice-row input')).toHaveValue('5');
    await expect(page.locator('.voice-unmatched')).toHaveCount(0);
    await expect(page.locator('.voice-save')).toBeVisible();
    await expect(page.locator('.mala-center .big')).toHaveText('100');
    await page.click('.voice-save');
    await expect(toast(page)).toHaveText('+5 Exercise');
    await expect(page.locator('.mala-center .big')).toHaveText('95');
  });

  test('manual minute buttons are one link away from the microphone (LOG-10)', async ({ page }) => {
    await typeInsteadOfSpeaking(page);
    await signIn(page);
    await page.click('.tab-log');
    await page.getByRole('button', { name: 'Enter minutes manually' }).click();
    await expect(page.locator('.pick .chip')).toHaveText(['Exercise30', 'Reading30', 'Course study30', 'Meditation10']);
    await expect(page.locator('.tile', { hasText: /^10$/ })).toBeVisible();
  });

  test('keeps typed input available when microphone permission is blocked (LOG-29)', async ({ page }) => {
    await page.addInitScript(() => {
      class BlockedSpeechRecognition {
        lang = ''; continuous = false; interimResults = false;
        onstart: (() => void) | null = null;
        onresult = null;
        onerror: ((event: { error: string }) => void) | null = null;
        onend: (() => void) | null = null;
        start() { this.onstart?.(); this.onerror?.({ error: 'not-allowed' }); this.onend?.(); }
        abort() {}
      }
      Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: BlockedSpeechRecognition });
      Object.defineProperty(window, 'webkitSpeechRecognition', { configurable: true, value: BlockedSpeechRecognition });
    });
    await signIn(page);
    await page.click('.tab-log');
    await expect(page.locator('.voice-error')).toHaveText('Microphone permission was blocked. Type your update instead.');
    await page.fill('.voice-input', 'read 15');
    await page.click('.voice-review');
    await expect(page.locator('.voice-row select option:checked')).toHaveText('Reading');
  });
});
