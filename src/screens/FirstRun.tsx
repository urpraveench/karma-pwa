import { useState, type FormEvent } from 'react';
import { addOwn, firstChoices, STEP, stepMinutes } from '../lib/firstRun';
import { haptic } from '../lib/feedback';
import { useApp } from '../state/app';
import { useFeedback } from '../ui/feedback';

/** "What do you want to make time for?": a new account picks its practices before day one (FIRST-01, FIRST-08 to FIRST-11). */
export function FirstRun() {
  const { choosePractices } = useApp();
  const { toast } = useFeedback();
  const [items, setItems] = useState(firstChoices);
  const [own, setOwn] = useState('');
  const picked = items.filter(i => i.picked);

  const toggle = (i: number) => { setItems(cs => cs.map((c, k) => k === i ? { ...c, picked: !c.picked } : c)); haptic(6); };
  const step = (i: number, by: number) => { setItems(cs => stepMinutes(cs, i, by)); haptic(4); };
  const add = (e: FormEvent) => { e.preventDefault(); if (!own.trim()) return; setItems(cs => addOwn(cs, own)); setOwn(''); haptic(6); };
  const start = () => {
    if (!picked.length) { toast('Pick at least one practice'); return; }
    choosePractices(picked);
  };

  return (
    <main className="first-run">
      <p className="date">Welcome to TikTym</p>
      <h1 className="fr-title">What do you want to make time for?</h1>
      <p className="lead">Pick a few to start with. Each gets a small daily target, and you can change everything later in Setup.</p>
      <div className="list">
        {items.map((it, i) => (
          <div className={`li fr-item${it.picked ? ' on' : ''}`} key={it.name}>
            <button className="fr-pick" type="button" aria-pressed={it.picked} onClick={() => toggle(i)}>
              <span className="tick" aria-hidden="true" />
              <span className="t">{it.name}<small>{it.minutes} min a day</small></span>
            </button>
            {it.picked && (
              <span className="fr-mins">
                <button className="x" type="button" aria-label={`${STEP} fewer minutes of ${it.name}`} onClick={() => step(i, -STEP)}>−</button>
                <button className="x" type="button" aria-label={`${STEP} more minutes of ${it.name}`} onClick={() => step(i, STEP)}>+</button>
              </span>
            )}
          </div>
        ))}
      </div>
      <form className="fr-own" onSubmit={add}>
        <label className="sr" htmlFor="fr-own">Add your own</label>
        <input className="in" id="fr-own" maxLength={40} placeholder="Add your own, e.g. Guitar" value={own} onChange={e => setOwn(e.target.value)} enterKeyHint="done" />
        <button className="chip" type="submit">Add</button>
      </form>
      <div className="fr-start">
        <button className="btn" type="button" onClick={start}>
          {picked.length ? `Start with ${picked.length} practice${picked.length === 1 ? '' : 's'}` : 'Pick at least one'}
        </button>
      </div>
    </main>
  );
}
