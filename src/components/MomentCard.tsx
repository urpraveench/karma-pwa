import type { CSSProperties } from 'react';
import type { Moment } from '../lib/moments';
import { Icon } from '../ui/icons';

export function MomentCard({ m, timerOn, onHide, onGo }: { m: Moment; timerOn: boolean; onHide(): void; onGo(cat: string, goal: number): void }) {
  return (
    <section className={'moment' + (m.recap ? ' m-recap' : '')} style={{ '--tone': m.tone } as CSSProperties} aria-label={m.title}>
      <button className="x m-x" onClick={onHide} aria-label="Hide for today"><Icon.x /></button>
      <h2 className="m-title">{m.title}</h2>
      <p className="m-body">{m.body}</p>
      {m.stats && <div className="m-stats">{m.stats.map(([v, l]) => <div key={l}><b>{v}</b><span>{l}</span></div>)}</div>}
      {m.bar != null && <div className="bar m-bar"><i style={{ width: `${m.bar}%` }} /></div>}
      {m.cta && !timerOn && (
        <button className="m-cta" onClick={() => onGo(m.cta!.cat, m.cta!.goal)}><Icon.play /><span>{m.cta.label}</span></button>
      )}
    </section>
  );
}
