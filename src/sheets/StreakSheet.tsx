import { useState } from 'react';
import { Sheet } from '../components/Sheet';
import { SHIELD_MAX } from '../lib/backlog';
import { fmtLong, parse } from '../lib/date';
import { DROP_GAP, LEVEL_MAX, levels, THRESHOLD, tierOf, type Levels } from '../lib/levels';
import { dayMark, monthWeeks, nextShieldText, shiftMonth, type DayMark } from '../lib/streak';
import { useApp } from '../state/app';
import { Icon } from '../ui/icons';

const SAYS: Record<DayMark, string> = {
  clear: 'clear', shield: 'missed, a shield kept the streak', miss: 'missed', rest: 'nothing due', today: 'today, not clear yet', future: '', before: '',
};
/** Days that keep a run going, so the band behind them joins up. */
const RUN: DayMark[] = ['clear', 'shield', 'rest'];

/** What the level's score is, and what reaches the next level or keeps the top one (TODAY-22). */
function levelText(lv: Levels): { text: string; fill: number } {
  const on = lv.score === null ? '' : `${lv.score}% of your practice days on target in the last 14 days. `;
  if (lv.level === LEVEL_MAX) return { text: `${on}Stay at ${THRESHOLD[LEVEL_MAX] - DROP_GAP}% or more to keep Level ${LEVEL_MAX}.`, fill: lv.score ?? 0 };
  const need = THRESHOLD[lv.level + 1];
  return { text: `${on}Reach ${need}% and on ${fmtLong(lv.nextCheck)} you move up to Level ${lv.level + 1}.`, fill: Math.min(100, (lv.score ?? 0) / need * 100) };
}

/** Tap the streak on Today: the streak, the shields, and a month of days (TODAY-20). */
export function StreakSheet() {
  const { data, c, T, closeSheet } = useApp();
  const first = data.categories.reduce((m, x) => x.startDate < m ? x.startDate : m, T).slice(0, 7);
  const [month, setMonth] = useState(T.slice(0, 7));
  const mark = (d: string) => dayMark(c, data.categories, d, T);
  const todayClear = mark(T) === 'clear';
  const lv = levels(c, data.categories, T), lt = lv && levelText(lv);
  const title = parse(`${month}-01`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <Sheet label="Streak" onClose={closeSheet}>
      <div className="sk-head">
        <b>{c.streak}</b><span>day streak{c.best > c.streak ? ` · best ${c.best}` : ''}</span>
      </div>

      <div className="sk-shields" role="img" aria-label={`${c.shields} of ${SHIELD_MAX} shields`}>
        {Array.from({ length: SHIELD_MAX }, (_, i) => <span key={i} className={i < c.shields ? 'held' : ''}><Icon.shield /></span>)}
      </div>
      <p className="sk-next">{nextShieldText(c, todayClear)}</p>

      {lv && lt && (
        <div className="sk-level">
          <p className="sk-lv"><b>Level {lv.level}</b> · {tierOf(lv.level)}</p>
          <span className="lv-bar" role="img" aria-label={`${Math.round(lt.fill)}% of the way`}><i style={{ width: `${lt.fill}%` }} /></span>
          <p className="sk-lv-text">{lt.text}</p>
        </div>
      )}

      <div className="sk-cal">
        <div className="sk-month">
          <button type="button" className="sk-nav" aria-label="Previous month" disabled={month <= first} onClick={() => setMonth(shiftMonth(month, -1))}><Icon.up /></button>
          <h3>{title}</h3>
          <button type="button" className="sk-nav next" aria-label="Next month" disabled={month >= T.slice(0, 7)} onClick={() => setMonth(shiftMonth(month, 1))}><Icon.up /></button>
        </div>
        <div className="sk-grid">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((x, i) => <span key={i} className="sk-wd" aria-hidden="true">{x}</span>)}
          {monthWeeks(month).flatMap((week, w) => week.map((d, i) => {
            if (!d) return <span key={`${w}-${i}`} />;
            const m = mark(d), prev = week[i - 1], next = week[i + 1];
            // two rest days side by side don't draw a band: only a run of clear days does
            const joins = (n: string | null | undefined) => !!n && RUN.includes(m) && RUN.includes(mark(n)) && !(m === 'rest' && mark(n) === 'rest');
            const l = joins(prev), r = joins(next);
            const day = parse(d).getDate();
            return (
              <span key={d} className={`sk-day ${m}${l ? ' l' : ''}${r ? ' r' : ''}${d === T ? ' now' : ''}`} title={SAYS[m] || undefined}
                aria-label={`${parse(d).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}${SAYS[m] ? `: ${SAYS[m]}` : ''}`}>
                {m === 'shield' ? <Icon.shield /> : <i>{day}</i>}
              </span>
            );
          }))}
        </div>
        <p className="legend sk-legend">
          <span><i className="k-clear" />Clear</span>
          <span><i className="k-shield"><Icon.shield /></i>Shield</span>
          <span><i className="k-miss" />Missed</span>
          <span><i className="k-rest" />Nothing due</span>
        </p>
      </div>

      <p className="sk-how">A day is clear when every practice is done, carried-over minutes included. Every 3 clear days in a row earn a shield, and you can hold {SHIELD_MAX}. Miss a day and a shield keeps your streak; the minutes still carry over.</p>
    </Sheet>
  );
}
