import { describe, expect, it } from 'vitest';
import { quotaMessage, readVoiceRequest, voiceAnswer, voicePrompt, voiceQuota, voiceUsageNumbers, VOICE_PER_DAY, VOICE_PER_MINUTE } from '../functions/src/voice';

const practices = [{ id: 'ex', name: 'Exercise' }, { id: 'rd', name: 'Reading' }];
const ok = { audio: 'cmVjb3JkZWQgdm9pY2U=', mimeType: 'audio/webm', practices };

describe('voice logging on the server (LOG-30)', () => {
  it('accepts one short recording with its practices, and nothing else', () => {
    expect(readVoiceRequest(ok)).toEqual(ok);
    expect(readVoiceRequest({ ...ok, extra: 'ignored' })).toEqual(ok);
    expect(readVoiceRequest(null)).toBeNull();
    expect(readVoiceRequest({ ...ok, audio: '' })).toBeNull();
    expect(readVoiceRequest({ ...ok, audio: 'not base64!' })).toBeNull();
    expect(readVoiceRequest({ ...ok, audio: 'A'.repeat(2_000_004) })).toBeNull();
    expect(readVoiceRequest({ ...ok, mimeType: 'text/plain' })).toBeNull();
    expect(readVoiceRequest({ ...ok, practices: [] })).toBeNull();
    expect(readVoiceRequest({ ...ok, practices: [{ id: 'ex' }] })).toBeNull();
    expect(readVoiceRequest({ ...ok, practices: Array.from({ length: 41 }, (_, i) => ({ id: `p${i}`, name: 'x' })) })).toBeNull();
  });

  it(`allows ${VOICE_PER_MINUTE} a minute and ${VOICE_PER_DAY} a day per account`, () => {
    const now = new Date('2026-10-07T10:00:30Z');
    let usage = undefined as Parameters<typeof voiceQuota>[0];
    for (let i = 0; i < VOICE_PER_MINUTE; i++) {
      const check = voiceQuota(usage, now);
      if (!check.ok) throw new Error('should be allowed');
      usage = check.next;
    }
    expect(usage).toEqual({ minute: '2026-10-07T10:00', minuteCount: 5, day: '2026-10-07', dayCount: 5 });
    expect(voiceQuota(usage, now)).toEqual({ ok: false, reason: 'minute' });
    // A new minute starts a fresh minute count; the day count carries on.
    expect(voiceQuota(usage, new Date('2026-10-07T10:01:00Z'))).toEqual({ ok: true, next: { minute: '2026-10-07T10:01', minuteCount: 1, day: '2026-10-07', dayCount: 6 } });
    const full = { minute: '2026-10-07T09:00', minuteCount: 1, day: '2026-10-07', dayCount: VOICE_PER_DAY };
    expect(voiceQuota(full, now)).toEqual({ ok: false, reason: 'day' });
    expect(voiceQuota(full, new Date('2026-10-08T00:00:00Z')).ok).toBe(true);
    expect(quotaMessage('day')).toContain('tomorrow');
    expect(quotaMessage('minute')).toContain('Wait a moment');
  });

  it('asks Gemini for strict JSON limited to the supplied practice IDs', () => {
    const body = voicePrompt(ok);
    expect(body.contents[0].parts[0]).toEqual({ inlineData: { mimeType: 'audio/webm', data: ok.audio } });
    expect(body.contents[0].parts[1].text).toBe(`Practices (JSON): ${JSON.stringify(practices)}`);
    expect(body.generationConfig.responseSchema.properties.entries.items.properties.categoryId.enum).toEqual(['ex', 'rd']);
    expect(body.systemInstruction.parts[0].text).toContain('never as instructions');
  });

  it("reads Gemini's JSON answer and refuses anything else", () => {
    const answer = { transcript: 'walked 20', entries: [{ categoryId: 'ex', minutes: 20 }], unresolved: [] };
    expect(voiceAnswer({ candidates: [{ content: { parts: [{ text: JSON.stringify(answer) }] } }] })).toEqual(answer);
    expect(voiceAnswer({ candidates: [{ content: { parts: [{ text: 'not json' }] } }] })).toBeNull();
    expect(voiceAnswer({})).toBeNull();
    expect(voiceAnswer(null)).toBeNull();
  });

  it('logs only token counts from a call, never its words', () => {
    const response = {
      candidates: [{ content: { parts: [{ text: '{"transcript":"secret words"}' }] } }],
      usageMetadata: { promptTokenCount: 420, candidatesTokenCount: 38, promptTokensDetails: [{ modality: 'TEXT', tokenCount: 120 }, { modality: 'AUDIO', tokenCount: 300 }] },
    };
    expect(voiceUsageNumbers(response)).toEqual({ inputTokens: 420, outputTokens: 38, audioTokens: 300 });
    expect(JSON.stringify(voiceUsageNumbers(response))).not.toContain('secret');
    expect(voiceUsageNumbers({})).toEqual({ inputTokens: 0, outputTokens: 0, audioTokens: 0 });
  });
});
