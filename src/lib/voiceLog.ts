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
const FILLERS = new Set([
  'i', 'did', 'do', 'done', 'have', 'was', 'went', 'for', 'of', 'on', 'in', 'at', 'a', 'an', 'the', 'my',
  'spent', 'spend', 'logged', 'log', 'minutes', 'minute', 'mins', 'min', 'hours', 'hour', 'hrs', 'hr',
  'and', 'then', 'just', 'about', 'around', 'today', 'yesterday', 'this', 'morning', 'afternoon', 'evening', 'tonight',
]);
const CONNECTORS = new Set(['and', 'then']);
const MINUTE_UNITS = new Set(['minutes', 'minute', 'mins', 'min']);
const HOUR_UNITS = new Set(['hours', 'hour', 'hrs', 'hr']);

// Common practice words people say differently from how they name the practice.
const GROUPS = [
  new Set(['exercise', 'workout', 'gym', 'walk', 'run', 'yoga', 'cycle', 'cycling', 'move', 'movement', 'cardio', 'lift', 'weights', 'pushup', 'swim']),
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
  lifted: 'lift', lifting: 'lift', weightlifting: 'lift',
  swam: 'swim', swimming: 'swim',
  'push-ups': 'pushup', pushups: 'pushup',
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

type Duration = { start: number; numberEnd: number; end: number; minutes: number };

function durationAt(tokens: Token[], start: number): Duration | null {
  if (tokens[start]?.raw === 'half') {
    const unit = tokens[start + 1]?.raw === 'a' || tokens[start + 1]?.raw === 'an' ? start + 2 : start + 1;
    if (HOUR_UNITS.has(tokens[unit]?.raw)) return { start, numberEnd: unit, end: unit + 1, minutes: 30 };
  }
  if ((tokens[start]?.raw === 'a' || tokens[start]?.raw === 'an') && HOUR_UNITS.has(tokens[start + 1]?.raw)) {
    return { start, numberEnd: start + 1, end: start + 2, minutes: 60 };
  }
  const number = numberAt(tokens, start);
  if (!number) return null;
  const unit = tokens[number.end]?.raw;
  if (MINUTE_UNITS.has(unit)) return { start, numberEnd: number.end, end: number.end + 1, minutes: number.value };
  if (HOUR_UNITS.has(unit)) return { start, numberEnd: number.end, end: number.end + 1, minutes: number.value * 60 };
  return null;
}

function explicitDurations(tokens: Token[]): Duration[] {
  const found: Duration[] = [];
  for (let i = 0; i < tokens.length;) {
    const duration = durationAt(tokens, i);
    if (duration) { found.push(duration); i = duration.end; } else i++;
  }
  return found;
}

const afterLastConnector = (tokens: Token[]) => {
  let at = -1;
  tokens.forEach((token, index) => { if (CONNECTORS.has(token.raw)) at = index; });
  return tokens.slice(at + 1);
};
const beforeFirstConnector = (tokens: Token[]) => {
  const at = tokens.findIndex(token => CONNECTORS.has(token.raw));
  return at < 0 ? tokens : tokens.slice(0, at);
};

function parseExplicit(tokens: Token[], categories: NamedCategory[]): VoiceLogResult {
  const durations = explicitDurations(tokens);
  const entries: VoiceLogEntry[] = [], unmatched: string[] = [];
  const claimedGap = new Set<number>();
  const source = tokens.map(token => token.raw).join(' ');

  durations.forEach((duration, index) => {
    const leftGap = tokens.slice(index ? durations[index - 1].end : 0, duration.start);
    const rightGap = tokens.slice(duration.end, index + 1 < durations.length ? durations[index + 1].start : tokens.length);
    const left = claimedGap.has(index - 1) ? [] : afterLastConnector(leftGap);
    const right = beforeFirstConnector(rightGap);
    const leftCat = matchCategory(activityTokens(left), categories);
    const rightCat = matchCategory(activityTokens(right), categories);
    let cat = leftCat || rightCat;
    let usedRight = !leftCat && !!rightCat;
    if (leftCat && rightCat && leftCat.id === rightCat.id) { cat = leftCat; usedRight = false; }
    // When activities sit on both sides, spoken English usually attaches a duration to the activity before it.
    if (leftCat && rightCat && leftCat.id !== rightCat.id) { cat = leftCat; usedRight = false; }
    if (usedRight && !rightGap.some(token => CONNECTORS.has(token.raw))) claimedGap.add(index);

    if (cat && duration.minutes >= 1 && duration.minutes <= 1440) entries.push({ catId: cat.id, minutes: duration.minutes, source });
    else unmatched.push(source);
  });
  return { entries, unmatched };
}

function parseBare(tokens: Token[], categories: NamedCategory[]): VoiceLogResult {
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
  if (!foundNumber) unmatched.push(tokens.map(t => t.raw).join(' '));
  return { entries, unmatched };
}

/**
 * Turns a short spoken update into proposed log entries. This never saves anything: callers must show the result
 * for review first. The matching stays on the device and deliberately rejects unclear practice names.
 */
export function parseVoiceLog(text: string, categories: NamedCategory[]): VoiceLogResult {
  const entries: VoiceLogEntry[] = [], unmatched: string[] = [];
  for (const clause of text.split(/[,.;!?\n]+/)) {
    const tokens = words(clause);
    if (!tokens.length) continue;
    const result = explicitDurations(tokens).length ? parseExplicit(tokens, categories) : parseBare(tokens, categories);
    entries.push(...result.entries); unmatched.push(...result.unmatched);
  }
  return { entries, unmatched: [...new Set(unmatched.filter(Boolean))] };
}
