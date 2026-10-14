import { activeCats, dayAll, dueOn, targetMinutesOn, usualHour, type Calc } from './backlog';
import { comebackText, rollText, voiceOf } from './voice';
import { addDays, fmtShort, hourLabel, monthName, parse, ymd } from './date';
import { firstName } from './user';
import { sum } from './util';
import type { AppData, Category, DateStr, User } from './types';

// One context-aware card per day on the Today screen. The highest-priority match wins.

export type MomentKey = 'month' | 'comeback' | 'weekend' | 'minimum' | 'bestmonth' | 'monday' | 'habit' | 'roll' | 'start';

export interface Moment {
  key: MomentKey;
  prio: number;
  /** CSS colour (may be a var()). */
  tone: string;
  title: string;
  body: string;
  recap?: boolean;
  stats?: [value: string | number, label: string][];
  /** Progress bar width, 0–100. */
  bar?: number;
  /** Comeback and minimum-day modes: the headline shows `minGoal` instead of the full amount owed. */
  minMode?: boolean;
  minGoal?: number;
  cta?: { label: string; cat: string; goal: number } | null;
}

export interface MomentContext {
  data: AppData;
  user: User | null;
  /** The moment key the user hid for today, if any. */
  hidden: string | null;
  now?: Date;
}

/** The practice still due today with the smallest target: the easiest place to start (MOM-10, TODAY-18). */
export function easiestPending(cats: Category[], c: Calc, T: DateStr): Category | undefined {
  return cats.filter(x => c.per[x.id].today.end > 0).sort((a, b) => targetMinutesOn(a, T) - targetMinutesOn(b, T))[0];
}

const round5 = (v: number) => Math.max(5, Math.round(v / 5) * 5);

export function moment(c: Calc, { data, user, hidden, now: clock = new Date() }: MomentContext): Moment | null {
  const T = ymd(clock), now = parse(T), hour = clock.getHours(), cats = activeCats(data.categories, T), t = c.totals;
  if (!cats.length) return null;
  const earliest = cats.reduce((m, x) => x.startDate < m ? x.startDate : m, T);
  const histDays = Math.round((parse(T).getTime() - parse(earliest).getTime()) / 864e5);
  const pending = cats.filter(x => c.per[x.id].today.end > 0);
  const easiest = easiestPending(cats, c, T);
  const minGoal = easiest ? Math.min(15, round5(Math.min(targetMinutesOn(easiest, T), c.per[easiest.id].today.end))) : 10;
  const out: Moment[] = [];
  const add = (key: MomentKey, prio: number, o: Omit<Moment, 'key' | 'prio'>) => { if (hidden !== key) out.push({ key, prio, ...o }); };
  const name = firstName(user), logged = new Set(data.logs.map(l => l.date));
  const sched = (from: DateStr, to: DateStr) => {
    let due = 0, met = 0, clear = 0, days = 0;
    for (let d = from < earliest ? earliest : from; d <= to; d = addDays(d, 1)) {
      const r = dayAll(c, data.categories, d);
      if (r.due > 0) { due += r.due; met += Math.min(r.done, r.due); }
      if (r.owed > 0) { days++; if (r.end === 0) clear++; }
    }
    return { due, met, clear, days, hit: due ? Math.round(met / due * 100) : null };
  };
  const goalFor = (catId: string, min = 10) => Math.min(60, Math.max(min, c.per[catId].today.end));

  // 1. month recap, first three days of a month
  if (now.getDate() <= 3) {
    const pmStart = ymd(new Date(now.getFullYear(), now.getMonth() - 1, 1)), pmEnd = addDays(ymd(new Date(now.getFullYear(), now.getMonth(), 1)), -1);
    const ppStart = ymd(new Date(now.getFullYear(), now.getMonth() - 2, 1));
    const ptsIn = (a: DateStr, b: DateStr) => sum(data.logs.filter(l => l.date >= a && l.date <= b).map(l => l.minutes));
    const pts = ptsIn(pmStart, pmEnd), prev = ptsIn(ppStart, addDays(pmStart, -1));
    if (pts > 0) {
      const st = sched(pmStart, pmEnd);
      let best: { name: string; p: number } | null = null;
      for (const cat of cats) {
        let due = 0, dn = 0;
        for (let d = pmStart; d <= pmEnd; d = addDays(d, 1)) { const r = c.per[cat.id].byDate.get(d); if (r) { due += r.due; dn += Math.min(r.done, r.due); } }
        if (due && (!best || dn / due > best.p)) best = { name: cat.name, p: dn / due };
      }
      const delta = prev ? Math.round((pts - prev) / prev * 100) : null;
      add('month', 100, {
        recap: true, tone: 'var(--gold)', title: `${monthName(pmStart)}, wrapped${name ? `, ${name}` : ''}`,
        body: delta === null ? 'Your first full month on record. Here\'s what you built.' : delta >= 0 ? `${delta}% more practice than ${monthName(ppStart)}. That's real growth.` : `${-delta}% less than ${monthName(ppStart)}. A new month is a clean page.`,
        stats: [[`${(pts / 60).toFixed(pts >= 600 ? 0 : 1)} h`, 'practised'], [`${st.clear}/${st.days}`, 'days cleared'], [best ? `${Math.round(best.p * 100)}%` : '—', best ? `${best.name}, your best` : 'best practice']],
        cta: easiest && { label: `${minGoal} min of ${easiest.name} to start ${monthName(T).slice(0, 3)}`, cat: easiest.id, goal: minGoal },
      });
    }
  }
  // 2. comeback: nothing logged for the last two days, and nothing yet today
  if (easiest && histDays >= 3 && !logged.has(T) && !logged.has(addDays(T, -1)) && !logged.has(addDays(T, -2))) {
    let gap = 1; while (gap < 90 && !logged.has(addDays(T, -gap)) && addDays(T, -gap) >= earliest) gap++;
    add('comeback', 95, {
      tone: '#0E7490', minMode: true, minGoal, title: name ? `Welcome back, ${name}.` : 'Welcome back.',
      body: comebackText(voiceOf(c.level?.level), gap - 1, minGoal, easiest.name),
      cta: { label: `Start ${minGoal} min of ${easiest.name}`, cat: easiest.id, goal: minGoal },
    });
  }
  // 3. weekend push: Sat/Sun and behind the weekly pace
  const dow = (now.getDay() + 6) % 7, mon = addDays(T, -dow);
  let wkTarget = 0, wkDone = 0, toDate = 0; const gaps: Record<string, number> = {};
  for (let i = 0; i < 7; i++) {
    const d = addDays(mon, i);
    for (const cat of cats) {
      const r = c.per[cat.id].byDate.get(d), due = d <= T ? (r?.due || 0) : dueOn(cat, d); wkTarget += due;
      if (d <= T) { wkDone += r?.done || 0; if (d < T) toDate += due; gaps[cat.id] = (gaps[cat.id] || 0) + due - (r?.done || 0); }
    }
  }
  const short = wkTarget - wkDone;
  if (dow >= 5 && wkTarget > 0 && short > 0 && wkDone < toDate * .92) {
    const left = 7 - dow, perDay = Math.ceil(short / left);
    const focus = [...pending].sort((a, b) => (gaps[b.id] || 0) - (gaps[a.id] || 0))[0];
    add('weekend', 90, {
      tone: '#A0740A', title: dow === 5 ? `Weekend push${name ? `, ${name}` : ''}` : 'Last day of the week',
      body: `You're ${short} points short of this week's ${wkTarget}. ${left === 2 ? `About ${perDay} a day this weekend closes it.` : `${short} today closes it.`}${focus ? ` Biggest gap: ${focus.name}.` : ''}`,
      stats: [[wkDone, 'done this week'], [wkTarget, 'weekly goal'], [perDay, left === 2 ? 'a day to close' : 'to close today']], bar: Math.min(100, wkDone / wkTarget * 100),
      cta: focus && { label: `Start ${focus.name}`, cat: focus.id, goal: goalFor(focus.id) },
    });
  }
  // 4. minimum day: last 7 days under 60% of target
  const wk7 = sched(addDays(T, -7), addDays(T, -1));
  if (easiest && wk7.hit !== null && wk7.due > 0 && histDays >= 5 && wk7.hit < 60 && t.done < minGoal) {
    add('minimum', 85, {
      tone: '#A0740A', minMode: true, minGoal, title: 'Make today a minimum day.',
      body: `Last week came in at ${wk7.hit}% of target. Skip the full ${t.end} today. ${minGoal} minutes keeps the chain alive, and small wins compound.`,
      cta: { label: `Do ${minGoal} min of ${easiest.name}`, cat: easiest.id, goal: minGoal },
    });
  }
  // 5. best month in reach: last two days of a month
  const monthEnd = addDays(ymd(new Date(now.getFullYear(), now.getMonth() + 1, 1)), -1), daysLeftM = Math.round((parse(monthEnd).getTime() - now.getTime()) / 864e5) + 1;
  if (daysLeftM <= 2) {
    const mStart = ymd(new Date(now.getFullYear(), now.getMonth(), 1)), mPts = sum(data.logs.filter(l => l.date >= mStart).map(l => l.minutes));
    const byMonth: Record<string, number> = {};
    data.logs.filter(l => l.date < mStart).forEach(l => { const k = l.date.slice(0, 7); byMonth[k] = (byMonth[k] || 0) + l.minutes; });
    const bestPrev = Math.max(0, ...Object.values(byMonth));
    if (bestPrev > 0 && mPts < bestPrev && bestPrev - mPts <= Math.max(t.owed, 30) * daysLeftM * 1.5)
      add('bestmonth', 80, {
        tone: 'var(--ok)', title: 'Best month in reach.', body: `${bestPrev - mPts + 1} more points by ${fmtShort(monthEnd)} makes ${monthName(T)} your best month yet.`, bar: mPts / bestPrev * 100,
        cta: easiest && { label: `Start ${easiest.name}`, cat: easiest.id, goal: goalFor(easiest.id) },
      });
    else if (bestPrev > 0 && mPts >= bestPrev)
      add('bestmonth', 80, { tone: 'var(--ok)', title: `${monthName(T)} is already your best month.`, body: `${mPts} points so far, ahead of your previous best of ${bestPrev}. Finish it strong.` });
  }
  // 6. fresh week (Monday)
  if (dow === 0) {
    const lw = sched(addDays(T, -7), addDays(T, -1));
    if (lw.hit !== null) add('monday', 60, {
      tone: 'var(--ok)', title: 'Fresh week.', body: `Last week: ${lw.hit}% of target and ${lw.clear} clear day${lw.clear === 1 ? '' : 's'}. Clear today and you're already ahead of it.`,
      cta: easiest && { label: `Start with ${easiest.name}`, cat: easiest.id, goal: goalFor(easiest.id) },
    });
  }
  // 7. habit cue: within an hour of when this practice is usually logged
  for (const cat of pending) {
    const h = usualHour(data.logs, cat.id, T);
    if (h !== null && Math.abs(h - hour) <= 1) {
      add('habit', 55, {
        tone: cat.color, title: `It's your usual ${cat.name} time.`, body: `You usually get ${cat.name} done around ${hourLabel(h)}. ${c.per[cat.id].today.end} left today.`,
        cta: { label: `Start ${cat.name}`, cat: cat.id, goal: goalFor(cat.id, 5) },
      });
      break;
    }
  }
  // 8. on a roll
  if (c.streak >= 3 && c.keepLeft > 0) add('roll', 40, {
    tone: 'var(--gold)', title: c.best - c.streak <= 1 && c.best > c.streak ? 'A new record is one day away.' : `Day ${c.streak + 1} is waiting.`,
    body: rollText(voiceOf(c.level?.level), c.streak, c.keepLeft),
  });
  // 9. new user
  if (histDays < 3 && !logged.has(T) && easiest) add('start', 30, {
    tone: 'var(--ok)', title: name ? `Start small, ${name}.` : 'Start small.', body: 'Log anything today, even 5 minutes. Showing up is the habit; the points follow.',
    cta: { label: `Start ${minGoal} min of ${easiest.name}`, cat: easiest.id, goal: minGoal },
  });
  return out.sort((a, b) => b.prio - a.prio)[0] || null;
}
