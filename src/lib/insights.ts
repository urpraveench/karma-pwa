import { byOrder, targetMinutesOn, type Calc, type DayRow } from './backlog';
import { addDays, parse } from './date';
import { practiceStreak } from './levels';
import { DAY_NAMES, sum } from './util';
import type { AppData, Category, DateStr } from './types';

// Everything the Insights screen shows, computed without any UI so it can be tested.

export interface Day { d: DateStr; due: number; done: number; end: number; owed: number; byCat: Record<string, number> }
export type StripCell = 'none' | 'rest' | 'met' | 'part' | 'miss' | 'today';
export interface PracticeHealth { cat: Category; st: number; hr14: number | null; hrPrev: number | null; misses: number; n7: number; strip: StripCell[]; total: number; target: number }
export interface CoachLine { tone: string; strong: string; rest: string }
export interface WeekStat { value: number; prev: number | null }

const DUE = 'var(--due)', OK = 'var(--ok)', GOLD = 'var(--gold)';
const STREAK_MILESTONES = [3, 7, 14, 21, 30, 50, 75, 100, 108, 150, 200, 365];
const HOUR_MILESTONES = [5, 10, 25, 50, 100, 200, 300, 500, 750, 1000];
/** Name, from hour, to hour, bar colour, and a text colour that stays readable on that bar in light and dark. */
export const TOD_BUCKETS = [['Morning', 5, 12, 'var(--gold)', '#16302E'], ['Afternoon', 12, 17, '#3E5BA9', '#fff'], ['Evening', 17, 22, '#8A4FA3', '#fff'], ['Night', 22, 29, 'var(--ink)', 'var(--bg)']] as const;

export const isClear = (r: { owed: number; end: number }) => r.owed > 0 && r.end === 0;

/** Share of target met over rows that had something due, as a whole percent. */
export function hit(rows: (Pick<DayRow, 'due' | 'done'> | undefined)[]): number | null {
  const r = rows.filter((x): x is Pick<DayRow, 'due' | 'done'> => !!x && x.due > 0);
  return r.length ? Math.round(sum(r.map(x => Math.min(x.done, x.due))) / sum(r.map(x => x.due)) * 100) : null;
}

export function buildInsights(data: AppData, c: Calc, T: DateStr, range: number) {
  const cats = [...data.categories].sort(byOrder);
  if (!data.logs.length || !cats.length) return null;
  const act = cats.filter(x => !x.archivedFrom || x.archivedFrom > T);
  const earliest = cats.reduce((m, x) => x.startDate < m ? x.startDate : m, T);
  const day = (d: DateStr): Day => {
    let due = 0, done = 0, end = 0, owed = 0; const byCat: Record<string, number> = {};
    for (const cat of cats) { const r = c.per[cat.id]?.byDate.get(d); if (!r) continue; due += r.due; done += r.done; end += r.end; owed += r.owed; byCat[cat.id] = r.done; }
    return { d, due, done, end, owed, byCat };
  };
  /** Up to `n` days ending at `endD`, never before the first practice started. */
  const span = (n: number, endD: DateStr = T) => { const a: DateStr[] = []; for (let i = n - 1; i >= 0; i--) { const d = addDays(endD, -i); if (d >= earliest) a.push(d); } return a; };

  // --- this week vs the same point last week (Monday-based) ---
  const dow = (parse(T).getDay() + 6) % 7;
  const thisW = span(dow + 1).map(day), lastW = span(dow + 1, addDays(T, -7)).map(day);
  const pts = (rows: Day[]) => sum(rows.map(r => r.done)), clr = (rows: Day[]) => rows.filter(isClear).length;
  const lastWHas = lastW.length > 0;
  const week = {
    points: { value: pts(thisW), prev: lastWHas ? pts(lastW) : null } as WeekStat,
    hit: { value: hit(thisW) ?? 0, prev: lastWHas ? hit(lastW) : null } as WeekStat,
    clear: { value: clr(thisW), prev: lastWHas ? clr(lastW) : null } as WeekStat,
    showDelta: lastWHas,
  };

  // --- practice health ---
  const health: PracticeHealth[] = act.map(cat => {
    const P = c.per[cat.id].byDate, rows = (n: number, e?: DateStr) => span(n, e).map(d => P.get(d)).filter((r): r is DayRow => !!r);
    const st = practiceStreak(P, c.level, T);
    const last7 = rows(7, addDays(T, -1)).filter(r => r.due > 0);
    const strip = span(14).map((d): StripCell => {
      const r = P.get(d); if (!r) return 'none'; if (!r.due) return r.done ? 'met' : 'rest';
      if (d === T && r.done < r.due) return r.done ? 'part' : 'today';
      return r.done >= r.due ? 'met' : r.done > 0 ? 'part' : 'miss';
    });
    return { cat, st, hr14: hit(rows(14)), hrPrev: hit(rows(14, addDays(T, -14))), misses: last7.filter(r => r.done < r.due).length, n7: last7.length,
      strip, total: sum([...P.values()].map(r => r.done)), target: targetMinutesOn(cat, T) };
  });

  // --- weekday rhythm (last 8 weeks) ---
  const wdRows: Day[][] = [[], [], [], [], [], [], []];
  span(56, addDays(T, -1)).forEach(d => wdRows[parse(d).getDay()].push(day(d)));
  const wdHit = wdRows.map(r => r.filter(x => x.due > 0).length >= 2 ? hit(r) : null);
  const valid = wdHit.map((v, i) => [v, i] as const).filter((x): x is readonly [number, number] => x[0] !== null);
  const weakest = valid.length >= 4 ? valid.reduce((a, b) => b[0] < a[0] ? b : a) : null;
  const strongest = valid.length >= 4 ? valid.reduce((a, b) => b[0] > a[0] ? b : a) : null;
  const otherAvg = weakest ? Math.round(sum(valid.filter(([, i]) => i !== weakest[1]).map(([v]) => v)) / Math.max(1, valid.length - 1)) : 0;

  // --- backlog pace ---
  const r14 = span(14, addDays(T, -1)).map(day);
  const surplus = r14.length ? (sum(r14.map(r => r.done)) - sum(r14.map(r => r.due))) / r14.length : 0;
  const backlog = c.totals.carryLeft;

  // --- coach lines (rule-based, highest priority first) ---
  const tips: (CoachLine & { score: number })[] = [], add = (score: number, tone: string, strong: string, rest = '') => tips.push({ score, tone, strong, rest });
  if (c.streak > 0 && c.best > c.streak && c.best - c.streak <= 3) add(96, GOLD, `${c.best - c.streak + 1} more clear day${c.best - c.streak ? 's' : ''} sets a new record.`, ` Your best run is ${c.best}.`);
  if (c.streak >= 3 && c.streak === c.best) add(88, GOLD, `This is your longest run ever: ${c.streak} clear days.`, ' Every day from here is a new record.');
  health.forEach(p => {
    if (p.n7 >= 4 && p.misses >= 3) add(90 + p.misses, DUE, `${p.cat.name} is slipping.`, ` Missed ${p.misses} of the last ${p.n7} days. It's ${p.target} minutes, so do it first tomorrow.`);
    if (p.hr14 !== null && p.hrPrev !== null && p.hr14 - p.hrPrev >= 15) add(72, OK, `${p.cat.name} is climbing.`, ` ${p.hr14}% of target over two weeks, up from ${p.hrPrev}%.`);
    if (p.st >= 5) add(50 + Math.min(p.st, 30), OK, `${p.st} days straight on ${p.cat.name}.`, ' That\'s how habits form. Protect it.');
  });
  if (weakest && otherAvg - weakest[0] >= 20) add(78, DUE, `${DAY_NAMES[weakest[1]]}s are your weak spot.`, ` ${weakest[0]}% of target, against ${otherAvg}% on other days. Plan something small for ${DAY_NAMES[weakest[1]]}.`);
  if (backlog > 0 && r14.length >= 5) {
    if (surplus > 0.5) { const n = Math.ceil(backlog / surplus); add(62, OK, `Backlog cleared in about ${n} day${n === 1 ? '' : 's'}`, ' at your current pace.'); }
    else add(80, DUE, 'Your backlog isn\'t shrinking.', ` ${Math.ceil(backlog / 7)} extra points a day clears all ${backlog} within a week.`);
  }
  if (lastWHas && pts(lastW) > 0) {
    const d = Math.round((pts(thisW) - pts(lastW)) / pts(lastW) * 100);
    if (d >= 10) add(58, OK, `You're ${d}% ahead of last week`, ' at this point in the week.');
    if (d <= -15) add(66, DUE, `You're ${-d}% behind last week`, ` at this point. Today's ${c.totals.end} points would close most of the gap.`);
  }
  // the practice that most often leaves you feeling good (LOG-31), from the last 60 days of rated entries
  const since60 = addDays(T, -60);
  const lift = data.categories.map(cat => {
    const rated = data.logs.filter(l => l.catId === cat.id && l.feel && l.date >= since60 && l.date <= T);
    return { cat, n: rated.length, good: rated.filter(l => l.feel === 3).length };
  }).filter(x => x.n >= 5 && x.good / x.n >= 0.6).sort((a, b) => b.good / b.n - a.good / a.n)[0];
  if (lift) add(70, OK, `${lift.cat.name} lifts you.`, ` You felt good after ${lift.good} of ${lift.n} sessions in the last two months.`);
  tips.sort((a, b) => b.score - a.score);
  // lead with one win, then up to two fixes: wins keep motivation up, fixes give direction
  const win = tips.find(t => t.tone !== DUE), fixes = tips.filter(t => t.tone === DUE);
  const coach: CoachLine[] = win ? [win, ...fixes.slice(0, 2)] : fixes.slice(0, 3);
  if (coach.length < 3) coach.push(...tips.filter(t => !coach.includes(t)).slice(0, 3 - coach.length));
  if (!coach.length) coach.push({ tone: OK, strong: 'Steady.', rest: ' Nothing is slipping. Keep showing up and the streak takes care of itself.' });

  // --- milestones + records ---
  const totalMin = sum(data.logs.map(l => l.minutes)), hours = totalMin / 60;
  const nextOf = (v: number, list: number[]) => list.find(x => x > v) ?? Math.ceil((v + 1) / 100) * 100;
  const prevOf = (v: number, list: number[]) => [0, ...list].filter(x => x <= v).pop()!;
  const allDays: Day[] = []; for (let d = earliest; d <= T; d = addDays(d, 1)) allDays.push(day(d));
  const milestones = {
    streak: { value: c.streak, prev: prevOf(c.streak, STREAK_MILESTONES), next: nextOf(c.streak, STREAK_MILESTONES) },
    hours: { value: hours, prev: prevOf(hours, HOUR_MILESTONES), next: nextOf(hours, HOUR_MILESTONES) },
    bestDay: allDays.reduce((m, r) => r.done > m.done ? r : m, { done: 0, d: T } as Pick<Day, 'done' | 'd'>),
    clearDays: allDays.filter(isClear).length,
  };

  // --- time of day, by when entries were saved in the last 30 days ---
  const since = addDays(T, -30), tod = [0, 0, 0, 0];
  data.logs.filter(l => l.date >= since && l.createdAt).forEach(l => {
    let h = new Date(l.createdAt).getHours(); if (h < 5) h += 24;
    const i = TOD_BUCKETS.findIndex(b => h >= b[1] && h < b[2]); if (i >= 0) tod[i] += l.minutes;
  });

  return {
    cats, earliest, dow, day, week, health, coach, milestones, tod,
    weekday: { hit: wdHit, weakest, strongest },
    detail: span(range).map(day),
  };
}

export type Insights = NonNullable<ReturnType<typeof buildInsights>>;
