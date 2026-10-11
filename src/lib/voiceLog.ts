import type { Category } from './types';

export interface VoiceLogEntry {
  catId: string;
  minutes: number;
  source: string;
}

export interface VoiceLogResult {
  entries: VoiceLogEntry[];
  unmatched: string[];
}

type NamedCategory = Pick<Category, 'id' | 'name'>;
type Token = { value: string; raw: string };

const ONES: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};
const NUMBER_WORDS = new Set([...Object.keys(ONES), ...Object.keys(TENS), 'hundred']);
const FILLERS = new Set(['i', 'did', 'do', 'done', 'for', 'on', 'spent', 'spend', 'logged', 'log', 'minutes', 'minute', 'mins', 'min', 'and', 'then']);

// Common practice words people say differently from how they name the practice.
const GROUPS = [
  new Set(['exercise', 'workout', 'gym', 'walk', 'run', 'yoga', 'cycle', 'cycling', 'move', 'movement']),
  new Set(['read', 'reading', 'book']),
  new Set(['study', 'course', 'learn', 'learning', 'lesson', 'class', 'upskill', 'upskilling']),
  new Set(['meditate', 'meditation', 'mindful', 'mindfulness', 'breathe', 'breathing']),
  new Set(['code', 'coding', 'program', 'programming']),
  new Set(['journal', 'journaling', 'write', 'writing']),
  new Set(['language', 'languages']),
];

const canonical: Record<string, string> = {
  walked: 'walk', walking: 'walk', walks: 'walk',
  ran: 'run', running: 'run', runs: 'run',
  exercised: 'exercise', exercising: 'exercise', exercises: 'exercise',
  worked: 'workout', workouts: 'workout',
  read: 'read', reads: 'read', reading: 'read',
  studied: 'study', studies: 'study', studying: 'study',
  learned: 'learn', learnt: 'learn', learns: 'learn', learning: 'learn',
  meditated: 'meditate', meditating: 'meditate', meditation: 'meditate',
  breathed: 'breathe', breath: 'breathe', breathing: 'breathe',
  coded: 'code', codes: 'code', coding: 'code',
  programmed: 'program', programming: 'program',
  journaled: 'journal', journals: 'journal', journaling: 'journal',
  wrote: 'write', written: 'write', writes: 'write', writing: 'write',
  cycled: 'cycle', cycles: 'cycle', cycling: 'cycle',
};

function words(text: string): Token[] {
  return [...text.toLowerCase().matchAll(/[a-z0-9]+/g)].map(m => ({ raw: m[0], value: canonical[m[0]] || m[0] }));
}

function numberAt(tokens: Token[], start: number): { value: number; end: number } | null {
  const first = tokens[start]?.raw;
  if (!first) return null;
  if (/^\d+$/.test(first)) return { value: Number(first), end: start + 1 };
  if (!NUMBER_WORDS.has(first)) return null;

  let value = 0, current = 0, i = start, used = false;
  while (i < tokens.length) {
    const word = tokens[i].raw;
    if (ONES[word]) { current += ONES[word]; used = true; i++; continue; }
    if (TENS[word]) { current += TENS[word]; used = true; i++; continue; }
    if (word === 'hundred' && current > 0) { current *= 100; used = true; i++; continue; }
    if (word === 'and' && used && NUMBER_WORDS.has(tokens[i + 1]?.raw)) { i++; continue; }
    break;
  }
  value += current;
  return used ? { value, end: i } : null;
}

function activityTokens(tokens: Token[]): Token[] {
  const cleaned = tokens.filter(t => !FILLERS.has(t.raw));
  // Speech recognition often writes "worked out" as two words.
  return cleaned.map((t, i) => t.value === 'out' && cleaned[i - 1]?.raw === 'worked' ? { ...t, value: 'workout' } : t)
    .filter((t, i, all) => !(t.raw === 'worked' && all[i + 1]?.raw === 'out'));
}

function groupFor(token: string) {
  return GROUPS.findIndex(group => group.has(token));
}

function matchCategory(activity: Token[], categories: NamedCategory[]): NamedCategory | null {
  const activityValues = new Set(activity.map(t => t.value));
  const activityRaw = activity.map(t => t.raw).join(' ');
  const scored = categories.map(cat => {
    const catTokens = words(cat.name);
    const catValues = catTokens.map(t => t.value);
    const exact = activityRaw.includes(catTokens.map(t => t.raw).join(' '));
    const allTokens = catValues.length > 0 && catValues.every(t => activityValues.has(t));
    const direct = catValues.filter(t => activityValues.has(t)).length;
    const semantic = catValues.some(catToken => {
      const group = groupFor(catToken);
      return group >= 0 && activity.some(t => GROUPS[group].has(t.value));
    });
    return { cat, score: exact ? 100 + catValues.length : allTokens ? 80 + catValues.length : direct ? 60 + direct : semantic ? 30 : 0 };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);
  if (!scored.length || scored[1]?.score === scored[0].score) return null;
  return scored[0].cat;
}

/**
 * Turns a short spoken update into proposed log entries. This never saves anything: callers must show the result
 * for review first. The matching stays on the device and deliberately rejects unclear practice names.
 */
export function parseVoiceLog(text: string, categories: NamedCategory[]): VoiceLogResult {
  const tokens = words(text);
  if (!tokens.length) return { entries: [], unmatched: [] };

  const entries: VoiceLogEntry[] = [], unmatched: string[] = [];
  let activityStart = 0, foundNumber = false;
  for (let i = 0; i < tokens.length;) {
    const number = numberAt(tokens, i);
    if (!number) { i++; continue; }
    foundNumber = true;
    const activity = activityTokens(tokens.slice(activityStart, i));
    const source = [...tokens.slice(activityStart, i).map(t => t.raw), ...tokens.slice(i, number.end).map(t => t.raw)].join(' ').trim();
    const cat = matchCategory(activity, categories);
    if (cat && number.value >= 1 && number.value <= 1440) entries.push({ catId: cat.id, minutes: number.value, source });
    else unmatched.push(source || tokens.slice(i, number.end).map(t => t.raw).join(' '));
    activityStart = number.end;
    i = number.end;
  }

  const tail = activityTokens(tokens.slice(activityStart));
  if (tail.length) unmatched.push(tokens.slice(activityStart).map(t => t.raw).join(' '));
  if (!foundNumber) unmatched.push(text.trim());
  return { entries, unmatched: [...new Set(unmatched.filter(Boolean))] };
}
