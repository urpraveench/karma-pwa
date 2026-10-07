// Haptics and the goal chime. All best-effort: unsupported browsers just stay quiet.

export const haptic = (p: number | number[]) => { try { navigator.vibrate?.(p); } catch { /* unsupported */ } };

let audio: AudioContext | null = null;

/** Call from a user gesture so the chime is allowed to play later. */
export function primeAudio() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audio ||= new Ctx();
    void audio.resume();
  } catch { /* no audio */ }
}

export function chime() {
  try {
    if (!audio) return;
    const a = audio, t0 = a.currentTime;
    ([[660, 0], [880, .18], [1100, .36]] as const).forEach(([f, d]) => {
      const o = a.createOscillator(), g = a.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0, t0 + d); g.gain.linearRampToValueAtTime(.25, t0 + d + .02); g.gain.exponentialRampToValueAtTime(.001, t0 + d + .5);
      o.connect(g).connect(a.destination); o.start(t0 + d); o.stop(t0 + d + .55);
    });
  } catch { /* no audio */ }
}
