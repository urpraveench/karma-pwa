import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import { AUDIENCE_TEXT, draftOf, EMPTY_FORM, formProblem, peopleText, type Audience, type Draft, type EmailForm } from './email';

// Write an email, preview it as people will see it, send a test to yourself, then send it to an audience with a
// second tap (ADMIN-07 to ADMIN-09). Sending queues one email per person on the server; the History page follows it.

type Preview = { key: string; subject: string; html: string; count: number };
type Step = { kind: 'idle' } | { kind: 'busy'; what: string } | { kind: 'confirm' } | { kind: 'done'; text: string } | { kind: 'error'; text: string };

const call = <R,>(name: string, draft: Draft) => httpsCallable<{ draft: Draft }, R>(functions, name)({ draft }).then(r => r.data);
/** The server's message, without the HTTP status the SDK adds ("… [400]"). */
const failed = (e: unknown) => ((e as { message?: string })?.message || String(e)).replace(/\s*\[\d{3}\]$/, '');

export function EmailPage() {
  const [form, setForm] = useState<EmailForm>(EMPTY_FORM);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [step, setStep] = useState<Step>({ kind: 'idle' });
  const problem = formProblem(form);
  const key = JSON.stringify(draftOf(form));
  const current = preview?.key === key ? preview : null; // a preview of an older draft can't be sent
  const busy = step.kind === 'busy';

  const set = (patch: Partial<EmailForm>) => { setForm(f => ({ ...f, ...patch })); if (step.kind !== 'busy') setStep({ kind: 'idle' }); };

  const run = async (what: string, job: () => Promise<string | void>) => {
    setStep({ kind: 'busy', what });
    try { const text = await job(); setStep(text ? { kind: 'done', text } : { kind: 'idle' }); } catch (e) { setStep({ kind: 'error', text: failed(e) }); }
  };

  const doPreview = () => run('Preparing the preview…', async () => {
    const draft = draftOf(form);
    const p = await call<Omit<Preview, 'key'>>('adminEmailPreview', draft);
    setPreview({ ...p, key: JSON.stringify(draft) });
  });
  const doTest = () => run('Sending a test…', async () => `Test sent to ${(await call<{ to: string }>('adminEmailTest', draftOf(form))).to}.`);
  const doSend = () => run('Queueing…', async () => {
    const r = await call<{ queued: number }>('adminEmailSend', draftOf(form));
    setPreview(null); // sent: the same draft needs a new preview to go out again
    return `Queued for ${r.queued.toLocaleString('en-GB')} ${r.queued === 1 ? 'person' : 'people'}. It sends 2 a second; History shows how it went.`;
  });

  return (
    <>
      <div className="head"><h2>Email</h2><span className="muted">From Praveen from TikTym &lt;hello@tiktym.com&gt;</span></div>
      <div className="compose">
        <form className="form" onSubmit={e => { e.preventDefault(); if (!problem) doPreview(); }}>
          <fieldset>
            <legend>Who gets it</legend>
            {(Object.keys(AUDIENCE_TEXT) as Audience[]).map(a => (
              <label className="choice" key={a}>
                <input type="radio" name="audience" checked={form.audience === a} onChange={() => set({ audience: a })} />
                <span><b>{AUDIENCE_TEXT[a].label}</b><span className="muted">{AUDIENCE_TEXT[a].hint}</span></span>
              </label>
            ))}
            <p className="muted small">Only people with News about TikTym on get it, never twice, and not on a day they already had a TikTym email.</p>
          </fieldset>
          <label>Subject<input value={form.subject} maxLength={120} onChange={e => set({ subject: e.target.value })} /></label>
          <label>Heading<input value={form.title} maxLength={80} onChange={e => set({ title: e.target.value })} /></label>
          <label>Text<textarea rows={9} value={form.body} maxLength={5000} onChange={e => set({ body: e.target.value })} />
            <span className="muted small">"Hi name," is added for you. A blank line starts a new paragraph; **bold** works.</span>
          </label>
          <div className="row">
            <label>Button label (optional)<input value={form.buttonLabel} maxLength={40} onChange={e => set({ buttonLabel: e.target.value })} /></label>
            <label>Button link<input value={form.buttonUrl} placeholder="https://app.tiktym.com/" onChange={e => set({ buttonUrl: e.target.value })} /></label>
          </div>
          {problem && (form.subject || form.title || form.body) && <p className="muted small">{problem}</p>}
          <div className="actions">
            <button className="btn" type="submit" disabled={!!problem || busy}>Preview</button>
            <button className="btn" type="button" disabled={!!problem || busy} onClick={doTest}>Send a test to me</button>
            <button className="btn primary" type="button" disabled={!current || busy} onClick={() => setStep({ kind: 'confirm' })}>
              {current ? `Send to ${peopleText(current.count)}…` : 'Preview to send'}
            </button>
          </div>
          {step.kind === 'confirm' && current && (
            <div className="confirm" role="alertdialog" aria-label="Confirm sending">
              <p><b>This goes to {peopleText(current.count)}</b> ({AUDIENCE_TEXT[form.audience].label.toLowerCase()}). It can't be undone.</p>
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
          {current ? (
            <>
              <p className="muted small">Subject: <b>{current.subject}</b> · as you'd get it</p>
              <iframe title="Email preview" sandbox="" srcDoc={current.html} />
            </>
          ) : (
            <p className="muted">{preview ? 'The draft changed. Preview it again to see it and send it.' : 'Preview shows the email here, exactly as people will get it.'}</p>
          )}
        </section>
      </div>
    </>
  );
}
