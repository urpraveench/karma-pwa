import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import { EMPTY_PUSH, PUSH_AUDIENCE_TEXT, pushDraftOf, pushProblem, type PushAudience, type PushDraft, type PushForm } from './push';

// Write a push notification, see roughly how it looks, test it on your own devices, count who it reaches, then send
// with a second tap (ADMIN-10, ADMIN-11). Pushes that would land at night wait until 10 am in each person's time zone.

type Step = { kind: 'idle' } | { kind: 'busy'; what: string } | { kind: 'confirm' } | { kind: 'done'; text: string } | { kind: 'error'; text: string };

const call = <R,>(name: string, draft: PushDraft) => httpsCallable<{ draft: PushDraft }, R>(functions, name)({ draft }).then(r => r.data);
const failed = (e: unknown) => ((e as { message?: string })?.message || String(e)).replace(/\s*\[\d{3}\]$/, '');
const people = (n: number) => `${n.toLocaleString('en-GB')} ${n === 1 ? 'person' : 'people'}`;

export function PushPage() {
  const [form, setForm] = useState<PushForm>(EMPTY_PUSH);
  const [counted, setCounted] = useState<{ key: string; count: number; note?: string } | null>(null);
  const [step, setStep] = useState<Step>({ kind: 'idle' });
  const problem = pushProblem(form);
  const key = JSON.stringify(pushDraftOf(form));
  const count = counted?.key === key ? counted.count : null;
  const note = counted?.key === key ? counted.note : undefined;
  const whom = (n: number) => (form.audience === 'person' ? form.to.trim().toLowerCase() : people(n));
  const busy = step.kind === 'busy';

  const set = (patch: Partial<PushForm>) => { setForm(f => ({ ...f, ...patch })); if (!busy) setStep({ kind: 'idle' }); };
  const run = async (what: string, job: () => Promise<string | void>) => {
    setStep({ kind: 'busy', what });
    try { const text = await job(); setStep(text ? { kind: 'done', text } : { kind: 'idle' }); } catch (e) { setStep({ kind: 'error', text: failed(e) }); }
  };

  const doCount = () => run('Counting…', async () => {
    const draft = pushDraftOf(form);
    const r = await call<{ count: number; note?: string }>('adminPushCount', draft);
    setCounted({ key: JSON.stringify(draft), count: r.count, note: r.note });
  });
  const doTest = () => run('Sending a test…', async () => {
    const r = await call<{ devices: number }>('adminPushTest', pushDraftOf(form));
    return `Test sent to ${r.devices} of your devices.`.replace('1 of your devices', 'your device');
  });
  const doSend = () => run('Queueing…', async () => {
    const r = await call<{ queued: number; held: number }>('adminPushSend', pushDraftOf(form));
    setCounted(null);
    return `Queued for ${people(r.queued)}${r.held ? `; ${r.held.toLocaleString('en-GB')} of them at night where they are, so theirs waits until 10 am` : ''}. History shows how it went.`;
  });

  return (
    <>
      <div className="head"><h2>Push</h2><span className="muted">To phones and computers that allowed TikTym's notifications</span></div>
      <div className="compose">
        <form className="form" onSubmit={e => { e.preventDefault(); if (!problem) doCount(); }}>
          <fieldset>
            <legend>Who gets it</legend>
            {(Object.keys(PUSH_AUDIENCE_TEXT) as PushAudience[]).map(a => (
              <label className="choice" key={a}>
                <input type="radio" name="push-audience" checked={form.audience === a} onChange={() => set({ audience: a })} />
                <span><b>{PUSH_AUDIENCE_TEXT[a].label}</b><span className="muted">{PUSH_AUDIENCE_TEXT[a].hint}</span></span>
              </label>
            ))}
            {form.audience === 'person' && (
              <label>Their email<input type="email" value={form.to} placeholder="name@example.com" onChange={e => set({ to: e.target.value })} /></label>
            )}
            <p className="muted small">Each person gets it once, on all their devices. Between 10 pm and 7 am in their time zone, it waits until 10 am.</p>
          </fieldset>
          <label>Title<input value={form.title} maxLength={60} onChange={e => set({ title: e.target.value })} /></label>
          <label>Text<textarea rows={3} value={form.body} maxLength={160} onChange={e => set({ body: e.target.value })} />
            <span className="muted small">{form.body.trim().length} of 160 characters</span>
          </label>
          <label>Opens (optional)<input value={form.url} placeholder="/" onChange={e => set({ url: e.target.value })} />
            <span className="muted small">A path in the app; empty opens Today.</span>
          </label>
          {problem && (form.to || form.title || form.body || form.url) && <p className="muted small">{problem}</p>}
          <div className="actions">
            <button className="btn" type="submit" disabled={!!problem || busy}>{form.audience === 'person' ? 'Check' : 'Count people'}</button>
            <button className="btn" type="button" disabled={!!problem || busy} onClick={doTest}>Send a test to my devices</button>
            <button className="btn primary" type="button" disabled={count === null || count === 0 || busy} onClick={() => setStep({ kind: 'confirm' })}>
              {count === null ? (form.audience === 'person' ? 'Check to send' : 'Count to send') : count === 0 ? 'Nobody to send to' : `Send to ${whom(count)}…`}
            </button>
          </div>
          {note && <p className="error" role="alert">{note}</p>}
          {step.kind === 'confirm' && count !== null && (
            <div className="confirm" role="alertdialog" aria-label="Confirm sending">
              <p><b>This goes to {whom(count)}</b> ({PUSH_AUDIENCE_TEXT[form.audience].label.toLowerCase()}). It can't be undone.</p>
              <div className="actions">
                <button className="btn primary" type="button" onClick={doSend}>Yes, send it</button>
                <button className="btn" type="button" onClick={() => setStep({ kind: 'idle' })}>Cancel</button>
              </div>
            </div>
          )}
          {step.kind === 'busy' && <p className="muted" aria-busy="true">{step.what}</p>}
          {step.kind === 'done' && <p className="ok" role="status">{step.text}</p>}
          {step.kind === 'error' && <p className="error" role="alert">{step.text}</p>}
        </form>
        <section className="preview" aria-label="Preview">
          <p className="muted small">Roughly how it looks; each phone draws its own.</p>
          <div className="notif">
            <img src="/icon.svg" alt="" width={36} height={36} />
            <div>
              <b>{form.title.trim() || 'Title'}</b>
              <span>{form.body.trim() || 'Text'}</span>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
