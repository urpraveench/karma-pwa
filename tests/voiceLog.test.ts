import { describe, expect, it } from 'vitest';
import { parseVoiceLog } from '../src/lib/voiceLog';

const categories = [
  { id: 'exercise', name: 'Exercise' },
  { id: 'reading', name: 'Reading' },
  { id: 'study', name: 'Course study' },
  { id: 'meditation', name: 'Meditation' },
];

describe('voice log phrase matching', () => {
  it('matches natural verbs, digits and number words (LOG-25)', () => {
    expect(parseVoiceLog('walked 20, read fifteen', categories)).toEqual({
      entries: [
        { catId: 'exercise', minutes: 20, source: 'walked 20' },
        { catId: 'reading', minutes: 15, source: 'read fifteen' },
      ],
      unmatched: [],
    });
  });

  it('finds several entries even when speech has no punctuation (LOG-25)', () => {
    expect(parseVoiceLog('I exercised for thirty minutes then studied forty five minutes', categories).entries).toEqual([
      { catId: 'exercise', minutes: 30, source: 'i exercised for thirty' },
      { catId: 'study', minutes: 45, source: 'minutes then studied forty five' },
    ]);
  });

  it('prefers an exact practice over a broad related practice (LOG-25)', () => {
    const withWalking = [...categories, { id: 'walking', name: 'Walking' }];
    expect(parseVoiceLog('walked twenty', withWalking).entries[0]).toMatchObject({ catId: 'walking', minutes: 20 });
  });

  it('accepts custom multi-word practice names (LOG-25)', () => {
    expect(parseVoiceLog('piano scales one hundred and twenty', [{ id: 'piano', name: 'Piano scales' }]).entries[0])
      .toMatchObject({ catId: 'piano', minutes: 120 });
  });

  it('returns unclear, missing and invalid parts instead of guessing (LOG-27)', () => {
    expect(parseVoiceLog('danced 20, reading', categories)).toEqual({ entries: [], unmatched: ['danced 20', 'reading'] });
    expect(parseVoiceLog('reading 2000', categories)).toEqual({ entries: [], unmatched: ['reading 2000'] });
    expect(parseVoiceLog('reading', categories)).toEqual({ entries: [], unmatched: ['reading'] });
  });

  it('rejects a semantic tie instead of picking the first practice (LOG-27)', () => {
    expect(parseVoiceLog('ran 10', [{ id: 'exercise', name: 'Exercise' }, { id: 'walking', name: 'Walking' }]))
      .toEqual({ entries: [], unmatched: ['ran 10'] });
  });
});
