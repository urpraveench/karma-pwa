export type VoiceCaptureErrorCode = 'permission' | 'missing-microphone' | 'microphone-busy' | 'unsupported' | 'recording';

export type VoiceCaptureSnapshot =
  | { kind: 'requesting' }
  | { kind: 'recording'; startedAt: number }
  | { kind: 'finishing' }
  | { kind: 'ready'; blob: Blob }
  | { kind: 'error'; code: VoiceCaptureErrorCode }
  | { kind: 'cancelled' };

const MIME_TYPES = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'];
let captureSequence = 0;

/** Pick Chrome's compact Opus recording when available, then iPhone's MP4 format. */
export function recordingMimeType(supported: (type: string) => boolean): string | undefined {
  return MIME_TYPES.find(supported);
}

/**
 * Bar heights (0 to 1) for the recording wave: taller in the middle, travelling with `time` (ms; pass 0 to hold it
 * still for Reduce Motion), and growing with `loudness` (0 to 1). Silence still shows a small moving wave.
 */
export function waveLevels(loudness: number, count: number, time: number): number[] {
  const size = 0.3 + 0.7 * Math.min(1, Math.max(0, loudness));
  return Array.from({ length: count }, (_, index) => {
    const middle = Math.sin(Math.PI * (index + 0.5) / count);
    const wave = 0.55 + 0.45 * Math.sin(index * 0.9 - time / 150);
    return Math.max(0.08, Math.min(1, size * middle * wave));
  });
}

function captureError(error: unknown): VoiceCaptureErrorCode {
  const name = error instanceof DOMException ? error.name : (error as { name?: string } | null)?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'permission';
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return 'missing-microphone';
  if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') return 'microphone-busy';
  return 'recording';
}

type Listener = () => void;
type BlobWaiter = { resolve(blob: Blob): void; reject(error: Error): void };

/**
 * Owns one microphone recording. It begins from the user's tap, before React renders the sheet,
 * which keeps iPhone's microphone permission tied to that tap.
 */
export class VoiceCapture {
  readonly id = ++captureSequence;
  private snapshot: VoiceCaptureSnapshot = { kind: 'requesting' };
  private listeners = new Set<Listener>();
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private analyser: AnalyserNode | null = null;
  private audioContext: AudioContext | null = null;
  private samples: Uint8Array<ArrayBuffer> | null = null;
  private loudness = 0;
  private waiters: BlobWaiter[] = [];
  private closed = false;
  private readonly onPageHide = () => this.cancel();
  private readonly onVisibilityChange = () => { if (document.visibilityState === 'hidden') this.cancel(); };

  constructor() {
    window.addEventListener('pagehide', this.onPageHide, { once: true });
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.prepareAudioMeter();
    void this.start();
  }

  getSnapshot = (): VoiceCaptureSnapshot => this.snapshot;

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private publish(snapshot: VoiceCaptureSnapshot) {
    this.snapshot = snapshot;
    this.listeners.forEach(listener => listener());
  }

  private prepareAudioMeter() {
    try {
      this.audioContext = new AudioContext();
      void this.audioContext.resume().catch(() => undefined);
    } catch {
      this.audioContext = null;
    }
  }

  private async start() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      this.fail('unsupported');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      });
      if (this.closed) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      this.stream = stream;
      this.connectAudioMeter(stream);
      const mimeType = recordingMimeType(type => MediaRecorder.isTypeSupported?.(type) ?? false);
      this.recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      this.recorder.ondataavailable = event => { if (event.data.size) this.chunks.push(event.data); };
      this.recorder.onerror = () => this.fail('recording');
      this.recorder.onstop = () => this.completeRecording();
      this.recorder.start();
      this.publish({ kind: 'recording', startedAt: Date.now() });
    } catch (error) {
      this.fail(captureError(error));
    }
  }

  private connectAudioMeter(stream: MediaStream) {
    const context = this.audioContext;
    if (!context) return;
    try {
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      context.createMediaStreamSource(stream).connect(analyser);
      this.analyser = analyser;
      this.samples = new Uint8Array(analyser.fftSize);
      void context.resume().catch(() => undefined);
    } catch {
      void context.close().catch(() => undefined);
      this.audioContext = null;
      this.analyser = null;
      this.samples = null;
    }
  }

  /** Current bar heights for the recording wave (see waveLevels). The same stream is also being recorded. */
  levels(count: number, time: number): number[] {
    if (this.analyser && this.samples) {
      // Loudness of the whole voice (RMS of the waveform): speech sits in a few low bands, so per-band bars barely move.
      this.analyser.getByteTimeDomainData(this.samples);
      let sum = 0;
      for (const sample of this.samples) sum += ((sample - 128) / 128) ** 2;
      const now = Math.min(1, Math.sqrt(sum / this.samples.length) * 5);
      this.loudness = Math.max(now, this.loudness * 0.85); // rise at once, fall gently
    }
    return waveLevels(this.loudness, count, time);
  }

  finish(): Promise<Blob> {
    if (this.snapshot.kind === 'ready') return Promise.resolve(this.snapshot.blob);
    if (this.snapshot.kind !== 'recording' || !this.recorder) return Promise.reject(new Error('Recording is not active'));
    const result = new Promise<Blob>((resolve, reject) => this.waiters.push({ resolve, reject }));
    this.publish({ kind: 'finishing' });
    try {
      this.recorder.stop();
    } catch {
      this.fail('recording');
    }
    return result;
  }

  private completeRecording() {
    if (this.closed) return;
    this.closed = true;
    const type = this.recorder?.mimeType || this.chunks.find(chunk => chunk.type)?.type || 'audio/webm';
    const blob = new Blob(this.chunks, { type });
    if (this.recorder) {
      this.recorder.ondataavailable = null;
      this.recorder.onstop = null;
      this.recorder.onerror = null;
    }
    this.recorder = null;
    this.chunks = [];
    this.cleanupHardware();
    this.publish({ kind: 'ready', blob });
    this.waiters.splice(0).forEach(waiter => waiter.resolve(blob));
  }

  private fail(code: VoiceCaptureErrorCode) {
    if (this.closed) return;
    this.closed = true;
    const recorder = this.recorder;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.onerror = null;
      if (recorder.state !== 'inactive') {
        try { recorder.stop(); } catch { /* the browser may already be stopping it */ }
      }
    }
    this.recorder = null;
    this.chunks = [];
    this.cleanupHardware();
    this.publish({ kind: 'error', code });
    const error = new Error(code);
    this.waiters.splice(0).forEach(waiter => waiter.reject(error));
  }

  cancel() {
    if (this.closed) return;
    this.closed = true;
    const recorder = this.recorder;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.onerror = null;
      if (recorder.state !== 'inactive') {
        try { recorder.stop(); } catch { /* already stopped */ }
      }
    }
    this.recorder = null;
    this.chunks = [];
    this.cleanupHardware();
    this.publish({ kind: 'cancelled' });
    const error = new Error('Recording cancelled');
    this.waiters.splice(0).forEach(waiter => waiter.reject(error));
  }

  private cleanupHardware() {
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = null;
    this.analyser?.disconnect();
    this.analyser = null;
    this.samples = null;
    if (this.audioContext) void this.audioContext.close().catch(() => undefined);
    this.audioContext = null;
    window.removeEventListener('pagehide', this.onPageHide);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }
}

export function beginVoiceCapture() {
  return new VoiceCapture();
}
