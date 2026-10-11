import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { Sheet } from '../components/Sheet';
import { VoiceLog } from '../components/VoiceLog';
import { activeCats } from '../lib/backlog';
import { addDays, dayLabel, parse } from '../lib/date';
import { haptic } from '../lib/feedback';
import { useApp, type LogMethod } from '../state/app';
import { useTimer } from '../state/timer';
import { useFeedback } from '../ui/feedback';
import { Icon } from '../ui/icons';

const TILES = [5, 10, 15, 20, 30, 45, 60];

/** Big tiles, one tap logs, no typing. */
export function LogSheet({ catId: initialCat, custom: initialCustom = false }: { catId?: string; custom?: boolean }) {
  const { data, c, T, logEntry, closeSheet } = useApp();
  const { start } = useTimer();
  const { toast } = useFeedback();
  const cats = activeCats(data.categories, T);
  const [catId, setCatId] = useState(() => initialCat || (cats.find(x => c.per[x.id].today.end > 0) || cats[0])?.id);
  const [date, setDate] = useState(T);
  const [other, setOther] = useState(false);
  const [note, setNote] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [custom, setCustom] = useState(initialCustom);
  const [voice, setVoice] = useState(false);
  const cat = cats.find(x => x.id === catId) || cats[0];
  const left = (cat && c.per[cat.id]?.byDate.get(date)?.end) ?? 0;
  const [mins, setMins] = useState(() => String(left > 0 ? Math.min(left, 25) : 25));
  const minsRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (custom) { minsRef.current?.focus(); minsRef.current?.select(); } }, [custom]);
  if (!cat) return null;

  const log = (v: number, method: LogMethod) => { closeSheet(); logEntry(cat.id, v, date, note.trim(), method); };
  const submitCustom = (e: FormEvent) => {
    e.preventDefault();
    const v = parseInt(mins, 10);
    if (!(v > 0)) { toast('Enter the minutes'); return; }
    log(v, 'custom');
  };
  const days: [string, string][] = [[T, 'Today'], [addDays(T, -1), 'Yesterday'], [addDays(T, -2), parse(addDays(T, -2)).toLocaleDateString(undefined, { weekday: 'short' })]];

  return (
    <Sheet onClose={closeSheet}>
      {voice ? <VoiceLog categories={cats} date={date} today={T} onBack={() => setVoice(false)} /> : <>
      <div className="pick" role="group" aria-label="Practice">
        {cats.map(x => {
          const l = c.per[x.id].today.end;
          return <button type="button" className="chip" key={x.id} style={{ '--c': x.color } as CSSProperties} aria-pressed={x.id === cat.id}
            onClick={() => { setCatId(x.id); haptic(6); }}>{x.name}{l > 0 && <small>{l}</small>}</button>;
        })}
      </div>
      <div className="seg seg-full" role="group" aria-label="Day">
        {days.map(([d, l]) => <button type="button" key={d} aria-pressed={!other && date === d} onClick={() => { setOther(false); setDate(d); }}>{l}</button>)}
        <button type="button" aria-pressed={other} onClick={() => { setOther(true); setDate(addDays(T, -3)); }}>Earlier</button>
      </div>
      {other && <>
        <label className="sr" htmlFor="ld">Date</label>
        <input className="in" type="date" id="ld" value={date} max={T} onChange={e => setDate(e.target.value && e.target.value <= T ? e.target.value : T)} />
      </>}
      <button type="button" className="voice-open" onClick={() => setVoice(true)}><Icon.mic /><span><b>Say or type your update</b><small>Try “walked 20, read 15”</small></span></button>
      <div style={{ '--c': cat.color } as CSSProperties}>
        {left > 0
          ? <button type="button" className="tile-all" onClick={() => log(left, 'all_left')}><span>All that's left</span><b>{left}</b></button>
          : <p className="sheet-sub" style={{ margin: '0 0 12px' }}>{cat.name} is clear {dayLabel(date, T)}. Extra minutes still go into your history.</p>}
        <div className="tiles">
          {TILES.map(v => <button type="button" className="tile" key={v} onClick={() => log(v, 'tile')} aria-label={`Log ${v} minutes`}>{v}</button>)}
          <button type="button" className="tile tile-ghost" onClick={() => setCustom(x => !x)}>Other</button>
        </div>
      </div>
      {custom && (
        <form className="custom" onSubmit={submitCustom}>
          <div className="stepper">
            <button type="button" onClick={() => { setMins(v => String(Math.max(1, (parseInt(v, 10) || 0) - 1))); haptic(4); }} aria-label="1 fewer">−</button>
            <input ref={minsRef} inputMode="numeric" pattern="[0-9]*" value={mins} onChange={e => setMins(e.target.value)} aria-label="Minutes" />
            <button type="button" onClick={() => { setMins(v => String(Math.max(1, (parseInt(v, 10) || 0) + 1))); haptic(4); }} aria-label="1 more">+</button>
          </div>
          <button className="btn" type="submit">Log these minutes</button>
        </form>
      )}
      {noteOpen && <input className="in" autoFocus maxLength={120} placeholder="What did you do?" value={note} onChange={e => setNote(e.target.value)} style={{ marginTop: 12 }} />}
      <div className="sheet-foot">
        {date === T
          ? <button type="button" className="link" onClick={() => start(cat.id)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 16, height: 16, display: 'inline-grid' }}><Icon.play /></span>Start a timer instead</button>
          : <span />}
        {!noteOpen && <button type="button" className="link" onClick={() => setNoteOpen(true)}>Add a note</button>}
      </div>
      </>}
    </Sheet>
  );
}
