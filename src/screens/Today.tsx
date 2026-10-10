import type { CSSProperties } from 'react';
import { Mala, malaFills } from '../components/Mala';
import { MomentCard } from '../components/MomentCard';
import { activeCats, showUpStreak } from '../lib/backlog';
import { fmtLong } from '../lib/date';
import { greeting } from '../lib/user';
import { useApp } from '../state/app';
import { useTimer } from '../state/timer';
import { Icon } from '../ui/icons';

export function Today() {
  const { data, c, T, moment: m, user, now, intro, tipHidden, hideTip, hideMoment, logEntry, openSheet } = useApp();
  const { timer: tm, cat: timerCat, minute, start, openFocus } = useTimer();
  const t = c.totals, cats = activeCats(data.categories, T);
  const minMode = !!m?.minMode && t.end > 0 && t.done < (m.minGoal ?? 0);
  const su = showUpStreak(data.logs, T);

  let center;
  if (minMode) center = <><span className="big">{m!.minGoal! - t.done}</span><span className="lbl">minutes to make today count</span><span className="soft">{t.end} if you go all in</span></>;
  else if (t.owed === 0) center = <><span className="clear-word">Rest day</span><span className="lbl">Nothing due today</span></>;
  else if (t.end === 0) center = <><span className="clear-word">All clear</span><span className="lbl">{t.done} points logged today</span></>;
  else center = <><span className="big">{t.end}</span><span className="lbl">points left today</span>{t.carryLeft > 0 && <span className="carry">{t.carryLeft} carried over</span>}</>;

  const showNudge = !m && c.streak > 0 && t.end > 0 && now.getHours() >= 18;
  const live = tm && timerCat && cats.some(x => x.id === tm.catId) ? { color: timerCat.color, minutes: minute } : undefined;

  return (
    <>
      <header className="top">
        <div><p className="date">{fmtLong(T)}</p><h1 className="hello">{greeting(user, now.getHours())}</h1></div>
        {c.streak ? (
          <div className="streak" title="Days in a row with nothing pending"><b>{c.streak}</b><span>day streak</span>{c.best > c.streak && <small>best {c.best}</small>}</div>
        ) : su >= 2 ? (
          <div className="streak" title="Days in a row with at least one entry"><b>{su}</b><span>days showing up</span></div>
        ) : null}
      </header>
      {m && <MomentCard m={m} timerOn={!!tm} onHide={() => hideMoment(m.key)} onGo={(cat, goal) => start(cat, goal || undefined)} />}
      <section className={`mala ${intro ? 'intro' : ''} ${m ? 'sm' : ''}`} aria-label={`Today: ${t.doneCap} of ${t.owed} points done`}>
        <Mala fills={malaFills(c, cats, live)} />
        <div className="mala-center">{center}</div>
      </section>
      <p className="legend">
        <span><i style={{ background: 'var(--ink)' }} />Logged</span>
        <span><i style={{ background: 'var(--due)' }} />Carried over</span>
        <span><i style={{ background: 'var(--line)' }} />Still due</span>
      </p>
      {showNudge && <div className="nudge">Clear {t.end} more to keep your {c.streak}-day streak</div>}
      {!tm && !m && cats.length > 0 && !tipHidden && (
        <div className="tip">
          <span className="tip-play"><Icon.play /></span>
          <p><b>Try a focus timer.</b> Tap ▶ on any practice, do the work, then tap stop. The minutes log themselves.</p>
          <button className="x" onClick={hideTip} aria-label="Dismiss tip"><Icon.x /></button>
        </div>
      )}
      {cats.length ? cats.map(cat => {
        const r = c.per[cat.id].today, owed = Math.max(r.owed, 1);
        const doneW = r.owed ? Math.min(100, r.done / owed * 100) : (r.done ? 100 : 0);
        const carryLeft = Math.max(0, r.opening - r.done), carryW = carryLeft / owed * 100;
        const meta = r.owed === 0 && r.done === 0 ? 'Rest day' : r.end === 0 ? `Done, ${r.done} logged` : `${r.done} of ${r.owed}${carryLeft ? `, ${carryLeft} carried` : ''}`;
        const isLive = tm?.catId === cat.id;
        return (
          <div className="cat" key={cat.id} style={{ '--c': cat.color } as CSSProperties}>
            <button className="cat-open" onClick={() => openSheet({ kind: 'log', catId: cat.id })}>
              <span className="cat-stripe" />
              <span>
                <span className="cat-name">{cat.name}</span><span className="cat-meta">{meta}</span>
                <span className="bar"><i className="b-done" style={{ width: `${doneW}%` }} /><i className="b-carry" style={{ width: `${carryW}%` }} /></span>
              </span>
            </button>
            {isLive
              ? <button className="tbtn live" onClick={openFocus} aria-label={`Open the running ${cat.name} timer`}><b>{minute}</b> <small>min</small></button>
              : <button className="tbtn" onClick={() => start(cat.id)} aria-label={`Start a ${cat.name} timer`}><Icon.play /></button>}
            {r.end > 0
              ? <button className="qbtn" onClick={() => logEntry(cat.id, r.end, T, '', 'quick')} aria-label={`Log ${r.end} minutes of ${cat.name}`}>+{r.end}</button>
              : <button className="qbtn done" onClick={() => openSheet({ kind: 'log', catId: cat.id })} aria-label={`Log more ${cat.name}`}>✓</button>}
          </div>
        );
      }) : <div className="empty">No practices yet. Add one in Setup.</div>}
      {cats.length > 0 && <p className="row-hint">▶ starts a timer. The coloured button logs everything left. Tap a name for other amounts.</p>}
    </>
  );
}
