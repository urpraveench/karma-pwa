import { useState, type CSSProperties, type FormEvent } from 'react';
import { Sheet } from '../components/Sheet';
import { byOrder } from '../lib/backlog';
import { haptic } from '../lib/feedback';
import { useApp } from '../state/app';
import { useFeedback } from '../ui/feedback';

/** Change a logged entry's practice, day, minutes or note, or delete it (HIST-07, HIST-08, HIST-09). */
export function EditLogSheet({ id }: { id: string }) {
  const { data, T, updateLog, deleteLog, closeSheet } = useApp();
  const { toast } = useFeedback();
  const log = data.logs.find(l => l.id === id);
  // archived practices are left out, except the entry's own, so editing the minutes never moves it
  const cats = [...data.categories].sort(byOrder).filter(c => !c.archivedFrom || c.id === log?.catId);
  const [catId, setCatId] = useState(log?.catId ?? '');
  const [date, setDate] = useState(log?.date ?? T);
  const [mins, setMins] = useState(String(log?.minutes ?? ''));
  const [note, setNote] = useState(log?.note ?? '');
  if (!log) return null;

  const step = (d: number) => { setMins(v => String(Math.max(1, (parseInt(v, 10) || 0) + d))); haptic(4); };
  function submit(e: FormEvent) {
    e.preventDefault();
    const m = parseInt(mins, 10);
    if (!(m > 0 && m <= 1440)) { toast('Enter between 1 and 1440 minutes'); return; }
    updateLog(log!.id, { catId, date, minutes: m, note: note.trim() });
  }

  return (
    <Sheet onClose={closeSheet}>
      <h2>Edit entry</h2>
      <form onSubmit={submit}>
        {cats.length > 0 && (
          <div className="pick" role="group" aria-label="Practice">
            {cats.map(x => <button type="button" className="chip" key={x.id} style={{ '--c': x.color } as CSSProperties} aria-pressed={x.id === catId}
              onClick={() => { setCatId(x.id); haptic(6); }}>{x.name}</button>)}
          </div>
        )}
        <div className="field"><label htmlFor="ed">Day</label>
          <input className="in" type="date" id="ed" value={date} max={T} onChange={e => { if (e.target.value && e.target.value <= T) setDate(e.target.value); }} /></div>
        <div className="field"><span className="flabel">Minutes</span>
          <div className="stepper">
            <button type="button" onClick={() => step(-1)} aria-label="1 fewer">−</button>
            <input inputMode="numeric" pattern="[0-9]*" value={mins} onChange={e => setMins(e.target.value)} aria-label="Minutes" />
            <button type="button" onClick={() => step(1)} aria-label="1 more">+</button>
          </div>
        </div>
        <div className="field"><label htmlFor="en">Note</label>
          <input className="in" id="en" maxLength={120} placeholder="What did you do?" value={note} onChange={e => setNote(e.target.value)} /></div>
        <button className="btn" type="submit">Save changes</button>
        <button type="button" className="btn btn-danger" style={{ marginTop: 10 }} onClick={() => { closeSheet(); deleteLog(log.id); }}>Delete entry</button>
      </form>
    </Sheet>
  );
}
