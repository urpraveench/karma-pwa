import { useEffect, useRef, useState } from 'react';
import { dayLabel } from '../lib/date';
import type { Category, DateStr } from '../lib/types';
import { parseVoiceLog, type VoiceLogEntry } from '../lib/voiceLog';
import { useApp } from '../state/app';
import { Icon } from '../ui/icons';

interface SpeechAlternative { transcript: string }
interface SpeechResult { readonly isFinal: boolean; readonly length: number; [index: number]: SpeechAlternative }
interface SpeechResultList { readonly length: number; [index: number]: SpeechResult }
interface SpeechEvent { resultIndex: number; results: SpeechResultList }
interface SpeechErrorEvent { error: string }
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: SpeechEvent) => void) | null;
  onerror: ((event: SpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
}
type SpeechConstructor = new () => SpeechRecognitionLike;

const speechConstructor = () => {
  const w = window as typeof window & { SpeechRecognition?: SpeechConstructor; webkitSpeechRecognition?: SpeechConstructor };
  return w.SpeechRecognition || w.webkitSpeechRecognition;
};

const speechError = (code: string) => {
  if (code === 'not-allowed' || code === 'service-not-allowed') return 'Microphone permission was blocked. Type your update instead.';
  if (code === 'no-speech') return 'I did not hear anything. Try again or type your update.';
  if (code === 'audio-capture') return 'No microphone was found. Type your update instead.';
  return 'Voice input stopped. Try again or type your update.';
};

interface Draft extends VoiceLogEntry { key: number }

/** Voice and typed natural-language logging. Nothing is saved until the reviewed batch is confirmed. */
export function VoiceLog({ categories, date, today, onBack }: { categories: Category[]; date: DateStr; today: DateStr; onBack(): void }) {
  const { logEntries, closeSheet } = useApp();
  const [text, setText] = useState('');
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [reviewed, setReviewed] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const seq = useRef(0);
  const supported = !!speechConstructor();

  useEffect(() => () => recognition.current?.abort(), []);

  const resetReview = (next: string) => { setText(next); setDrafts([]); setUnmatched([]); setReviewed(false); setError(''); };
  const listen = () => {
    const Speech = speechConstructor();
    if (!Speech) { setError('Voice input is not available in this browser. Type your update instead.'); return; }
    recognition.current?.abort();
    const rec = new Speech(); recognition.current = rec;
    rec.lang = navigator.language || 'en-IN'; rec.continuous = false; rec.interimResults = true;
    rec.onstart = () => { setListening(true); setError(''); };
    rec.onresult = event => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) transcript += `${event.results[i][0]?.transcript || ''} `;
      resetReview(transcript.trim());
    };
    rec.onerror = event => { setListening(false); setError(speechError(event.error)); };
    rec.onend = () => setListening(false);
    try { rec.start(); } catch { setListening(false); setError('Voice input could not start. Type your update instead.'); }
  };
  const review = () => {
    const result = parseVoiceLog(text, categories);
    setDrafts(result.entries.map(entry => ({ ...entry, key: ++seq.current })));
    setUnmatched(result.unmatched); setReviewed(true); setError('');
  };
  const save = () => {
    if (!drafts.length || unmatched.length || drafts.some(x => !(x.minutes > 0 && x.minutes <= 1440))) return;
    closeSheet();
    logEntries(drafts.map(x => ({ catId: x.catId, mins: x.minutes, date })), 'voice');
  };

  return (
    <div className="voice-log">
      <div className="voice-head">
        <div><h2>Say what you did</h2><p>{dayLabel(date, today)}</p></div>
        <button type="button" className={`voice-mic${listening ? ' listening' : ''}`} onClick={listen} aria-label={listening ? 'Listening' : 'Use microphone'} aria-pressed={listening} disabled={listening}>
          <Icon.mic />
        </button>
      </div>
      <label className="flabel" htmlFor="voice-update">One or more practices</label>
      <textarea id="voice-update" className="in voice-input" rows={3} value={text} onChange={e => resetReview(e.target.value)} placeholder="Walked 20, read 15" />
      <p className="voice-privacy">{supported ? (listening ? 'Listening… speak naturally.' : 'Your browser handles your voice. TikTym does not store the audio or transcript.') : 'Voice input is unavailable here. You can type the same words.'}</p>
      {error && <p className="voice-error" role="alert">{error}</p>}
      <button type="button" className="btn btn-2 voice-review" onClick={review} disabled={!text.trim()}>Review entries</button>

      {reviewed && <div className="voice-results">
        {drafts.map((draft, index) => <div className="voice-row" key={draft.key}>
          <select className="in" aria-label={`Practice for entry ${index + 1}`} value={draft.catId} onChange={e => setDrafts(xs => xs.map(x => x.key === draft.key ? { ...x, catId: e.target.value } : x))}>
            {categories.map(cat => <option value={cat.id} key={cat.id}>{cat.name}</option>)}
          </select>
          <input className="in" type="number" inputMode="numeric" min="1" max="1440" aria-label={`Minutes for entry ${index + 1}`} value={draft.minutes} onChange={e => setDrafts(xs => xs.map(x => x.key === draft.key ? { ...x, minutes: Number(e.target.value) } : x))} />
          <button type="button" className="x" aria-label={`Remove entry ${index + 1}`} onClick={() => setDrafts(xs => xs.filter(x => x.key !== draft.key))}>×</button>
        </div>)}
        {unmatched.length > 0 && <div className="voice-unmatched" role="alert"><b>I could not match:</b> {unmatched.map(x => `“${x}”`).join(', ')}. Edit the words above and review again.</div>}
        {!drafts.length && !unmatched.length && <p className="voice-empty">Add a practice and its minutes, for example “walked 20”.</p>}
        {drafts.length > 0 && !unmatched.length && <button type="button" className="btn voice-save" onClick={save} disabled={drafts.some(x => !(x.minutes > 0 && x.minutes <= 1440))}>
          Log {drafts.length} {drafts.length === 1 ? 'entry' : 'entries'}
        </button>}
      </div>}
      <button type="button" className="link voice-back" onClick={onBack}>Back to minute buttons</button>
    </div>
  );
}
