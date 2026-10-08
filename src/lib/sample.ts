import { dueOn, targetMinutesOn } from './backlog';
import { addDays, parse, today } from './date';
import { firstChoices, startingCategories } from './firstRun';
import { newId } from './util';
import type { AppData, Category, DateStr, Log, Settings } from './types';

/** The four practices ticked on first run (FIRST-01), used by Start over and the sample data. */
export function defaultCategories(start: DateStr): Category[] {
  return startingCategories(firstChoices().filter(c => c.picked), start);
}

/** Ten weeks of realistic history: improving overall, weak Saturdays, meditation slipping lately. */
export function sampleData(settings: Settings = {}, asOf: DateStr = today()): AppData {
  const DAYS = 70, start = addDays(asOf, -DAYS), cats = defaultCategories(start), logs: Log[] = [];
  cats[2].targets[0].days = [1, 2, 3, 4, 5]; // course study on weekdays
  let seed = 11; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const carry = cats.map(() => 0), cap = 2;
  for (let i = 0; i <= DAYS; i++) {
    const d = addDays(start, i), isToday = d === asOf, wd = parse(d).getDay();
    cats.forEach((c, ci) => {
      const due = dueOn(c, d); carry[ci] = Math.min(carry[ci], cap * targetMinutesOn(c, d));
      const owed = carry[ci] + due; if (!owed) return;
      let m: number;
      if (isToday) m = ci < 2 ? Math.round(due * .5) : 0;
      else {
        let p = .8 + i / DAYS * .12;                      // improving over time
        if (wd === 6) p -= .45;                           // weak Saturdays
        if (ci === 3 && i > DAYS - 9) p = .3;             // meditation slipping lately
        if (i > DAYS - 9 && ci !== 3) p = 1;              // a recent run on the rest
        const r = rnd();
        if (r > p) m = 0;
        else if (rnd() < .12 && due) m = Math.round(due * (.4 + rnd() * .4) / 5) * 5;  // partial day
        else m = owed;                                    // full day, catching up on anything carried
      }
      carry[ci] = Math.max(0, owed - (m || 0));
      const hour = ci === 0 ? 7 : ci === 3 ? 6 : ci === 1 ? 21 : 19;
      if (m > 0) logs.push({ id: newId(), catId: c.id, date: d, minutes: m, note: '', createdAt: isToday ? Date.now() - 3600e3 : parse(d).getTime() + hour * 3600e3 + ci * 60e3 });
    });
  }
  return { categories: cats, logs, settings: { ...settings, seeded: true } };
}
