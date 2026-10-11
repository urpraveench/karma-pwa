import { describe, expect, it } from 'vitest';
import { validateVoiceUnderstanding } from '../src/lib/voiceAI';
import { recordingMimeType } from '../src/lib/voiceCapture';

const categories = [{ id: 'move' }, { id: 'read' }];

describe('voice recording formats', () => {
  it('uses Opus on browsers that support it and MP4 on iPhone-style support', () => {
    expect(recordingMimeType(type => type === 'audio/webm;codecs=opus')).toBe('audio/webm;codecs=opus');
    expect(recordingMimeType(type => type === 'audio/mp4')).toBe('audio/mp4');
    expect(recordingMimeType(() => false)).toBeUndefined();
  });
});

describe('AI voice result validation', () => {
  it('keeps allowed whole-minute entries and combines the same practice', () => {
    expect(validateVoiceUnderstanding({
      transcript: 'walked ten and five more',
      entries: [{ categoryId: 'move', minutes: 10 }, { categoryId: 'move', minutes: 5 }],
      unresolved: [],
    }, categories)).toEqual({
      transcript: 'walked ten and five more',
      entries: [{ catId: 'move', minutes: 15, source: 'walked ten and five more' }],
      unmatched: [],
    });
  });

  it('does not let unknown practices or invalid minutes become logs', () => {
    const result = validateVoiceUnderstanding({
      transcript: 'did something for far too long',
      entries: [{ categoryId: 'unknown', minutes: 5 }, { categoryId: 'read', minutes: 2000 }],
      unresolved: [],
    }, categories);
    expect(result.entries).toEqual([]);
    expect(result.unmatched).toEqual(['did something for far too long']);
  });

  it('blocks the whole review when repeated entries add up past one day', () => {
    const result = validateVoiceUnderstanding({
      transcript: 'moved 800 and another 800, read 5',
      entries: [{ categoryId: 'move', minutes: 800 }, { categoryId: 'move', minutes: 800 }, { categoryId: 'read', minutes: 5 }],
      unresolved: [],
    }, categories);
    expect(result.entries).toEqual([{ catId: 'read', minutes: 5, source: 'moved 800 and another 800, read 5' }]);
    expect(result.unmatched).toEqual(['moved 800 and another 800, read 5']);
  });

  it('blocks saving when AI returns more entries than the review can show', () => {
    const result = validateVoiceUnderstanding({
      transcript: 'nine separate movement entries',
      entries: Array.from({ length: 9 }, () => ({ categoryId: 'move', minutes: 1 })),
      unresolved: [],
    }, categories);
    expect(result.entries).toEqual([{ catId: 'move', minutes: 8, source: 'nine separate movement entries' }]);
    expect(result.unmatched).toEqual(['nine separate movement entries']);
  });
});
