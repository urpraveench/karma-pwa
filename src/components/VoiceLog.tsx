import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { dayLabel } from '../lib/date';
import type { Category, DateStr } from '../lib/types';
import { understandVoice, VoiceAIError, type VoiceUnderstanding } from '../lib/voiceAI';
import { beginVoiceCapture, type VoiceCapture, type VoiceCaptureErrorCode } from '../lib/voiceCapture';
import { parseVoiceLog, type VoiceLogEntry } from '../lib/voiceLog';
import { useApp } from '../state/app';

interface Draft extends VoiceLogEntry { key: number }
type Phase = 'capture' | 'processing' | 'review' | 'typed' | 'processing-error';
const MAX_SECONDS = 30;
const BAR_COUNT = 17;

const captureMessage = (code: VoiceCaptureErrorCode) => {
  if (code === 'permission') return 'Microphone access is off. Allow it in your browser settings, then try again.';
  if (code === 'missing-microphone') return 'I could not find a microphone on this device.';
  if (code === 'microphone-busy') return 'Another app may be using the microphone. Close it, then try again.';
  if (code === 'unsupported') return 'Voice recording is not available in this browser.';
  return 'The recording stopped unexpectedly. Try again or type your update.';
};

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

const retryPause = (signal: AbortSignal) => new Promise<void>((resolve, reject) => {
  const timer = window.setTimeout(resolve, 800);
  signal.addEventListener('abort', () => {
    window.clearTimeout(timer);
    reject(new DOMException('Voice processing cancelled', 'AbortError'));
  }, { once: true });
});

/** One-tap recording, AI understanding, and a required review before anything is saved. */
export function VoiceLog({
  categories, date, today, initialCapture, onCaptureChange, onCancel, onBack,
}: {
  categories: Category[];
  date: DateStr;
  today: DateStr;
  initialCapture: VoiceCapture;
  onCaptureChange(capture: VoiceCapture | null): void;
  onCancel(): void;
  onBack(): void;
}) {
  const { logEntries, closeSheet } = useApp();
  const [capture, setCapture] = useState(initialCapture);
  const captureState = useSyncExternalStore(capture.subscribe, capture.getSnapshot, capture.getSnapshot);
  const [phase, setPhase] = useState<Phase>('capture');
  const [text, setText] = useState('');
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [audio, setAudio] = useState<Blob | null>(null);
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState(() => Array.from({ length: BAR_COUNT }, () => 0.12));
  const seq = useRef(0);
  const requestSeq = useRef(0);
  const requestController = useRef<AbortController | null>(null);
  const finishing = useRef(false);
  const finishButton = useRef<HTMLButtonElement>(null);
  const processingTitle = useRef<HTMLHeadingElement>(null);
  const reviewTitle = useRef<HTMLHeadingElement>(null);

  const applyResult = useCallback((result: VoiceUnderstanding) => {
    setText(result.transcript);
    setDrafts(result.entries.map(entry => ({ ...entry, key: ++seq.current })));
    setUnmatched(result.unmatched);
    setError('');
    setPhase('review');
  }, []);

  const processAudio = useCallback(async (blob: Blob) => {
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    const request = ++requestSeq.current;
    setPhase('processing');
    setError('');
    try {
      let result: VoiceUnderstanding;
      try {
        result = await understandVoice(blob, categories, controller.signal);
      } catch (cause) {
        if (!(cause instanceof VoiceAIError && cause.retryable) || controller.signal.aborted) throw cause;
        await retryPause(controller.signal);
        result = await understandVoice(blob, categories, controller.signal);
      }
      if (request === requestSeq.current) applyResult(result);
    } catch (cause) {
      if (request !== requestSeq.current || controller.signal.aborted) return;
      setError(cause instanceof VoiceAIError ? cause.userMessage : 'I could not understand that recording. Try again or type your update.');
      setPhase('processing-error');
    } finally {
      if (requestController.current === controller) requestController.current = null;
    }
  }, [applyResult, categories]);

  const cancelProcessing = useCallback(() => {
    requestSeq.current++;
    requestController.current?.abort();
    requestController.current = null;
  }, []);

  const finishRecording = useCallback(async () => {
    if (finishing.current || capture.getSnapshot().kind !== 'recording') return;
    finishing.current = true;
    setPhase('processing');
    try {
      const blob = await capture.finish();
      setAudio(blob);
      await processAudio(blob);
    } catch {
      setError('The recording stopped unexpectedly. Try again or type your update.');
      setPhase('processing-error');
    } finally {
      finishing.current = false;
    }
  }, [capture, processAudio]);

  useEffect(() => {
    if (phase !== 'capture' || captureState.kind !== 'recording') return;
    const startedAt = captureState.startedAt;
    const update = () => {
      const seconds = Math.min(MAX_SECONDS, Math.floor((Date.now() - startedAt) / 1000));
      setElapsed(seconds);
      if (seconds >= MAX_SECONDS) void finishRecording();
    };
    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [captureState, finishRecording, phase]);

  useEffect(() => {
    if (phase !== 'capture' || captureState.kind !== 'recording') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setLevels(Array.from({ length: BAR_COUNT }, (_, index) => 0.2 + (index % 4) * 0.1));
      return;
    }
    let frame = 0;
    let last = 0;
    const draw = (time: number) => {
      if (time - last > 70) { setLevels(capture.levels(BAR_COUNT)); last = time; }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [capture, captureState.kind, phase]);

  useEffect(() => {
    if (phase !== 'capture' || captureState.kind !== 'ready' || finishing.current) return;
    setAudio(captureState.blob);
    void processAudio(captureState.blob);
  }, [captureState, phase, processAudio]);

  useEffect(() => {
    if (phase === 'capture' && captureState.kind === 'recording') finishButton.current?.focus();
  }, [captureState.kind, phase]);

  useEffect(() => {
    if (phase === 'processing') processingTitle.current?.focus();
    if (phase === 'review') reviewTitle.current?.focus();
  }, [phase]);

  useEffect(() => () => { requestController.current?.abort(); }, []);

  const startAgain = () => {
    cancelProcessing();
    capture.cancel();
    const next = beginVoiceCapture();
    setCapture(next);
    onCaptureChange(next);
    setAudio(null);
    setElapsed(0);
    setLevels(Array.from({ length: BAR_COUNT }, () => 0.12));
    setError('');
    setPhase('capture');
  };

  const typeInstead = () => {
    cancelProcessing();
    capture.cancel();
    onCaptureChange(null);
    setAudio(null);
    setError('');
    setPhase('typed');
  };

  const cancelAndClose = () => {
    cancelProcessing();
    capture.cancel();
    onCancel();
  };

  const enterManually = () => {
    cancelProcessing();
    capture.cancel();
    onBack();
  };

  const reviewTypedText = () => {
    const result = parseVoiceLog(text, categories);
    applyResult({ transcript: text.trim(), ...result });
  };

  const editText = () => {
    setAudio(null);
    setDrafts([]);
    setUnmatched([]);
    setPhase('typed');
  };

  const save = () => {
    if (!drafts.length || unmatched.length || drafts.some(entry => !(entry.minutes > 0 && entry.minutes <= 1440))) return;
    closeSheet();
    logEntries(drafts.map(entry => ({ catId: entry.catId, mins: entry.minutes, date })), 'voice');
  };

  const totalMinutes = drafts.reduce((sum, draft) => sum + draft.minutes, 0);
  const day = dayLabel(date, today);
  const recordingPrivacy = Boolean(audio) || phase === 'processing'
    || (phase === 'capture' && ['requesting', 'recording', 'finishing', 'ready'].includes(captureState.kind));
  const captureError = phase !== 'capture' ? ''
    : captureState.kind === 'error' ? captureMessage(captureState.code)
      : captureState.kind === 'cancelled' ? 'The recording ended when the app went into the background. Try again or type your update.'
        : '';

  return (
    <div className="voice-log">
      {phase === 'capture' && <>
        <div className="voice-title"><h2 id="voice-title">Log with your voice</h2><p>Say what you did and for how long.</p></div>
        <div className="voice-stage" aria-live="polite">
          {captureState.kind === 'requesting' && <div className="voice-wait" aria-busy="true"><span className="voice-spinner" aria-hidden="true" />Starting microphone…</div>}
          {(captureState.kind === 'recording' || captureState.kind === 'finishing') && <>
            <strong className="voice-status">Listening…</strong>
            <span className="voice-time">{clock(elapsed)} / 0:30</span>
            <div className="voice-recorder">
              <button type="button" className="voice-control voice-cancel" onClick={cancelAndClose} aria-label="Cancel recording">×</button>
              <div className="voice-wave" aria-hidden="true">
                {levels.map((level, index) => <i key={index} style={{ height: `${Math.round(7 + level * 27)}px` }} />)}
              </div>
              <button ref={finishButton} type="button" className="voice-control voice-finish" onClick={() => void finishRecording()} aria-label="Finish recording" disabled={captureState.kind !== 'recording'}>✓</button>
            </div>
            <span className="voice-help">Tap ✓ when you’re done.</span>
          </>}
          {captureError && <div className="voice-problem" role="alert"><strong>{captureError}</strong><button type="button" className="btn btn-2" onClick={startAgain}>Try microphone again</button></div>}
        </div>
        <button type="button" className="link voice-type" onClick={typeInstead}>Type instead</button>
      </>}

      {phase === 'processing' && <>
        <div className="voice-title"><h2 ref={processingTitle} tabIndex={-1} id="voice-title">Understanding your update…</h2><p>This usually takes a few seconds.</p></div>
        <div className="voice-stage voice-processing" aria-live="polite" aria-busy="true">
          <div className="voice-processing-pill" aria-hidden="true"><span className="voice-spinner" /></div>
        </div>
        <button type="button" className="link voice-type" onClick={cancelAndClose}>Cancel</button>
      </>}

      {phase === 'processing-error' && <>
        <div className="voice-title"><h2 id="voice-title">That did not work</h2><p>Your minutes have not been saved.</p></div>
        <div className="voice-problem voice-problem-wide" role="alert"><strong>{error}</strong>
          {audio && <button type="button" className="btn btn-2" onClick={() => void processAudio(audio)}>Try this recording again</button>}
          <button type="button" className="btn btn-2" onClick={startAgain}>Record again</button>
        </div>
        <button type="button" className="link voice-type" onClick={typeInstead}>Type instead</button>
      </>}

      {phase === 'typed' && <>
        <div className="voice-title"><h2 id="voice-title">Type what you did</h2><p>You can also use the microphone on your phone’s keyboard.</p></div>
        <label className="flabel" htmlFor="voice-update">One or more practices</label>
        <textarea id="voice-update" className="in voice-input" rows={3} autoFocus value={text} onChange={event => setText(event.target.value)} placeholder="I exercised for 5 minutes today" />
        <button type="button" className="btn btn-2 voice-review" onClick={reviewTypedText} disabled={!text.trim()}>Review entries</button>
        <button type="button" className="link voice-type" onClick={startAgain}>Record instead</button>
      </>}

      {phase === 'review' && <>
        <div className="voice-title"><h2 ref={reviewTitle} tabIndex={-1} id="voice-title">Here’s what I found</h2><p>{day}</p></div>
        {text && <details className="voice-transcript"><summary>What I heard</summary><p>{text}</p></details>}
        <div className="voice-results">
          {drafts.map((draft, index) => <div className="voice-row" key={draft.key}>
            <select className="in" aria-label={`Practice for entry ${index + 1}`} value={draft.catId} onChange={event => setDrafts(items => items.map(item => item.key === draft.key ? { ...item, catId: event.target.value } : item))}>
              {categories.map(category => <option value={category.id} key={category.id}>{category.name}</option>)}
            </select>
            <input className="in" type="number" inputMode="numeric" min="1" max="1440" aria-label={`Minutes for entry ${index + 1}`} value={draft.minutes} onChange={event => setDrafts(items => items.map(item => item.key === draft.key ? { ...item, minutes: Number(event.target.value) } : item))} />
            <button type="button" className="x" aria-label={`Remove entry ${index + 1}`} onClick={() => setDrafts(items => items.filter(item => item.key !== draft.key))}>×</button>
          </div>)}
          {unmatched.length > 0 && <div className="voice-unmatched" role="alert"><b>Needs a quick edit:</b> {unmatched.map(item => `“${item}”`).join(', ')}.</div>}
          {!drafts.length && !unmatched.length && <p className="voice-empty">I did not find a practice and duration in that update.</p>}
          {(unmatched.length > 0 || !drafts.length) && <button type="button" className="btn btn-2" onClick={editText}>Edit what I heard</button>}
          {drafts.length > 0 && !unmatched.length && <button type="button" className="btn voice-save" onClick={save} disabled={drafts.some(entry => !(entry.minutes > 0 && entry.minutes <= 1440))}>
            {drafts.length === 1 ? `Log ${totalMinutes} minutes` : `Log ${drafts.length} entries · ${totalMinutes} min`}
          </button>}
        </div>
      </>}

      <p className="voice-privacy">{recordingPrivacy
        ? 'Your recording and active practice names are sent to Google only to understand this update. TikTym does not save the recording or transcript.'
        : 'Typed updates stay on this device. TikTym saves only the practice and minutes you confirm.'}</p>
      <button type="button" className="link voice-back" onClick={enterManually}>Enter minutes manually</button>
    </div>
  );
}
