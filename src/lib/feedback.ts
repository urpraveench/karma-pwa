// Haptics and the goal chime. All best-effort: unsupported browsers just stay quiet.

export const haptic = (p: number | number[]) => { try { navigator.vibrate?.(p); } catch { /* unsupported */ } };

let audio: AudioContext | null = null;
let listening = false;
const WAKE_WAIT_MS = 1500;

/** Resume audio the browser suspended. iOS suspends web audio readily, and only resumes it reliably on a tap. */
export function wakeAudio() {
  if (audio && audio.state !== 'running') audio.resume().catch(() => {});
}

/** Call from a user gesture so the chime is allowed to play later. */
export function primeAudio() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audio ||= new Ctx();
    void audio.resume();
    if (!listening) {
      // Keep audio awake while the app is used: every tap or key press wakes it if it was suspended.
      listening = true;
      addEventListener('pointerdown', wakeAudio, { capture: true, passive: true });
      addEventListener('keydown', wakeAudio, true);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) wakeAudio(); });
    }
  } catch { /* no audio */ }
}

/**
 * The goal chime. If audio is suspended it's woken first; if it can't be woken quickly, the chime is skipped rather
 * than queued, because a suspended context would otherwise play it whenever audio next wakes, minutes late.
 */
export async function chime() {
  const a = audio;
  if (!a) return;
  try {
    if (a.state !== 'running') {
      const woke = await Promise.race([
        a.resume().then(() => true, () => false),
        new Promise<boolean>(done => setTimeout(() => done(false), WAKE_WAIT_MS)),
      ]);
      if (!woke || (a.state as string) !== 'running') return;
    }
    const t0 = a.currentTime + 0.05;
    ([[660, 0], [880, .18], [1100, .36]] as const).forEach(([f, d]) => {
      const o = a.createOscillator(), g = a.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0, t0 + d); g.gain.linearRampToValueAtTime(.25, t0 + d + .02); g.gain.exponentialRampToValueAtTime(.001, t0 + d + .5);
      o.connect(g).connect(a.destination); o.start(t0 + d); o.stop(t0 + d + .55);
    });
  } catch { /* no audio */ }
}
