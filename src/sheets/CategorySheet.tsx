import { useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { WHY } from '../components/Reminders';
import { Sheet } from '../components/Sheet';
import { addDays, fmtShort } from '../lib/date';
import { haptic } from '../lib/feedback';
import { practiceRemindTime, REMINDER_TIMES, timeLabel } from '../lib/reminders';
import { COLORS, DAY_NAMES, WD } from '../lib/util';
import { useApp } from '../state/app';
import { usePushStatus } from '../state/push';
import { useFeedback } from '../ui/feedback';

const PRESETS = [10, 15, 20, 30, 45, 60];

/** Add a practice, or edit one when `id` is given. */
export function CategorySheet({ id }: { id?: string }) {
  const { data, T, saveCategory, toggleArchive, deleteCategory, closeSheet } = useApp();
  const { toast } = useFeedback();
  const ex = id ? data.categories.find(c => c.id === id) : undefined;
  const cur = ex ? (ex.targets.filter(t => t.from <= T).pop() || ex.targets[0]) : null;
  const [name, setName] = useState(ex?.name || '');
  const [minutes, setMinutes] = useState(String(cur?.minutes ?? 20));
  const [days, setDays] = useState<number[]>(cur ? [...cur.days] : [0, 1, 2, 3, 4, 5, 6]);
  const [start, setStart] = useState(ex?.startDate || T);
  const [color, setColor] = useState(ex?.color || COLORS[data.categories.length % COLORS.length]);
  const [remind, setRemind] = useState(ex ? practiceRemindTime(ex) ?? '' : '');
  const [editStart, setEditStart] = useState(false);
  const push = usePushStatus();
  const why = push ? WHY[push] : undefined;
  const startRef = useRef<HTMLInputElement>(null);

  const step = (d: number) => { setMinutes(v => String(Math.max(1, (parseInt(v, 10) || 0) + d))); haptic(4); };
  const toggleDay = (d: number) => setDays(ds => ds.includes(d) ? ds.filter(x => x !== d) : [...ds, d]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const n = name.trim(), m = parseInt(minutes, 10);
    if (!n) { toast('Give the practice a name'); return; }
    if (!(m > 0 && m <= 1440)) { toast('Minutes a day must be between 1 and 1440'); return; }
    if (!days.length) { toast('Pick at least one day'); return; }
    saveCategory(ex?.id, { name: n, color, minutes: m, days, start: start || T, remind: remind || null });
  }

  const starts: [string, string][] = [[T, 'Today'], [addDays(T, -1), 'Yesterday'], [addDays(T, -7), 'Last week']];
  return (
    <Sheet onClose={closeSheet} label={ex ? 'Edit practice' : 'Add practice'}>
      <h2>{ex ? 'Edit practice' : 'Add practice'}</h2>
      <form onSubmit={submit}>
        <div className="field"><label htmlFor="cn">Name</label>
          <input className="in" id="cn" maxLength={40} required value={name} onChange={e => setName(e.target.value)} autoFocus={!ex} placeholder="e.g. Journaling" enterKeyHint="done" /></div>
        <div className="field"><span className="flabel">Minutes a day</span>
          <div className="stepper">
            <button type="button" onClick={() => step(-5)} aria-label="5 fewer">−</button>
            <input inputMode="numeric" pattern="[0-9]*" value={minutes} onChange={e => setMinutes(e.target.value)} aria-label="Minutes a day" />
            <button type="button" onClick={() => step(5)} aria-label="5 more">+</button>
          </div>
          <div className="preset">{PRESETS.map(v => <button type="button" className="chip" key={v} onClick={() => { setMinutes(String(v)); haptic(4); }}>{v}</button>)}</div>
        </div>
        <div className="field"><span className="flabel">Which days</span>
          <div className="days">{[1, 2, 3, 4, 5, 6, 0].map(d => <button type="button" key={d} onClick={() => toggleDay(d)} aria-pressed={days.includes(d)} aria-label={DAY_NAMES[d]}>{WD[d]}</button>)}</div>
        </div>
        <div className="field"><span className="flabel">Start counting</span>
          {ex ? <>
            {!editStart && <div className="since"><span>Since {fmtShort(start)}</span>
              <button type="button" className="link" onClick={() => { setEditStart(true); requestAnimationFrame(() => { startRef.current?.focus(); try { startRef.current?.showPicker(); } catch { /* unsupported */ } }); }}>Change</button></div>}
            <input ref={startRef} className="in" type="date" value={start} max={T} hidden={!editStart} style={{ marginTop: 8 }}
              onChange={e => { if (e.target.value && e.target.value <= T) setStart(e.target.value); }} />
          </> : (
            <div className="seg seg-full" role="group" aria-label="Start">
              {starts.map(([d, l]) => <button type="button" key={d} onClick={() => setStart(d)} aria-pressed={start === d}>{l}</button>)}
            </div>
          )}
        </div>
        <div className="field"><label className="flabel" htmlFor="cr">Remind me</label>
          <select className="in" id="cr" value={remind} onChange={e => setRemind(e.target.value)}>
            <option value="">Off</option>
            {REMINDER_TIMES.map(t => <option key={t} value={t}>{timeLabel(t)}</option>)}
          </select>
          {remind && <p className="hint" style={{ textAlign: 'left', marginTop: 6 }}>{why ?? `A push at ${timeLabel(remind)}, only if it's still to do that day.`}</p>}
        </div>
        <div className="field"><span className="flabel">Colour</span>
          <div className="swatches">{COLORS.map(c => <button type="button" className="sw" key={c} onClick={() => setColor(c)} style={{ '--c': c } as CSSProperties} aria-pressed={c === color} aria-label={`Colour ${c}`} />)}</div>
        </div>
        <p className="hint" style={{ textAlign: 'left' }}>{ex ? 'New minutes or days apply from today. Past days keep their old target.' : 'Days before the start never add to your backlog.'}</p>
        <button className="btn" type="submit">{ex ? 'Save changes' : 'Add practice'}</button>
        {ex && (
          <div className="row2" style={{ marginTop: 10 }}>
            <button type="button" className="btn btn-2" onClick={() => toggleArchive(ex.id)}>{ex.archivedFrom ? 'Restore' : 'Archive'}</button>
            <button type="button" className="btn btn-danger" onClick={() => deleteCategory(ex.id)}>Delete</button>
          </div>
        )}
      </form>
    </Sheet>
  );
}
