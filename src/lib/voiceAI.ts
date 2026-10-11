import { config } from '../config';
import type { Category } from './types';
import type { VoiceLogEntry } from './voiceLog';

export interface VoiceUnderstanding {
  transcript: string;
  entries: VoiceLogEntry[];
  unmatched: string[];
}

interface RawVoiceUnderstanding {
  transcript?: unknown;
  entries?: unknown;
  unresolved?: unknown;
  unmatched?: unknown;
}

export class VoiceAIError extends Error {
  constructor(public readonly userMessage: string, public readonly retryable = false) { super(userMessage); }
}

const textList = (value: unknown) => Array.isArray(value)
  ? value.filter((item): item is string => typeof item === 'string').map(item => item.trim()).filter(Boolean).slice(0, 8)
  : [];

/** Treat model output as untrusted before it can become a saved log. */
export function validateVoiceUnderstanding(value: unknown, categories: Pick<Category, 'id'>[]): VoiceUnderstanding {
  const raw = value && typeof value === 'object' ? value as RawVoiceUnderstanding : {};
  const allowed = new Set(categories.map(category => category.id));
  const fullTranscript = typeof raw.transcript === 'string' ? raw.transcript.trim() : '';
  const transcript = fullTranscript.slice(0, 600);
  const totals = new Map<string, number>();
  let rejected = fullTranscript.length > 600;
  if (Array.isArray(raw.entries)) {
    if (raw.entries.length > 8) rejected = true;
    raw.entries.slice(0, 8).forEach(value => {
      const entry = value as { categoryId?: unknown; catId?: unknown; minutes?: unknown } | null;
      const catId = typeof entry?.categoryId === 'string' ? entry.categoryId : entry?.catId;
      const minutes = entry?.minutes;
      if (typeof catId !== 'string' || !allowed.has(catId) || !Number.isInteger(minutes) || !(Number(minutes) > 0 && Number(minutes) <= 1440)) {
        rejected = true;
        return;
      }
      totals.set(catId, (totals.get(catId) || 0) + Number(minutes));
    });
  }
  if ([...totals.values()].some(minutes => minutes > 1440)) rejected = true;
  const entries = [...totals].filter(([, minutes]) => minutes <= 1440).map(([catId, minutes]) => ({ catId, minutes, source: transcript }));
  const unmatched = textList(raw.unresolved ?? raw.unmatched);
  if ((rejected || (!entries.length && !unmatched.length)) && transcript) unmatched.push(transcript);
  return { transcript, entries, unmatched: [...new Set(unmatched)].slice(0, 8) };
}

function blobBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('Could not read recording'));
    reader.onload = () => resolve(String(reader.result).split(',', 2)[1] || '');
    reader.readAsDataURL(blob);
  });
}

function aiError(error: unknown): VoiceAIError {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return new VoiceAIError('You are offline. Reconnect and try this recording again.');
  const code = String((error as { code?: unknown } | null)?.code || '');
  const message = String((error as { message?: unknown } | null)?.message || '');
  const statusInMessage = message.match(/\[(\d{3})\b/)?.[1];
  const status = Number((error as { customErrorData?: { status?: unknown } } | null)?.customErrorData?.status || statusInMessage || 0);
  if (code === 'functions/resource-exhausted') return new VoiceAIError(message || 'Voice processing is busy right now. Try again in a moment.');
  if (code === 'functions/unavailable' || code === 'functions/deadline-exceeded') return new VoiceAIError('Voice processing is busy right now. Try this recording again in a moment.', true);
  if (code === 'functions/unauthenticated') return new VoiceAIError('Sign in again, then retry your recording.');
  if (code === 'functions/invalid-argument' || code === 'functions/internal') return new VoiceAIError('I could not understand that recording. Try again or type your update.');
  if (code === 'functions/not-found') return new VoiceAIError('AI voice logging is not ready yet. Type your update instead.');
  if (status === 401) return new VoiceAIError('Sign in again, then retry your recording.');
  if (status === 429) return new VoiceAIError('Voice processing is busy right now. Try this recording again in a moment.', true);
  if (status === 403 || status === 404 || code.includes('api-not-enabled') || code.includes('permission-denied') || code.includes('app-check')) {
    return new VoiceAIError('AI voice logging is not ready yet. Type your update instead.');
  }
  if (code.includes('fetch') || code.includes('timeout') || code.includes('network')) {
    return new VoiceAIError('I could not reach voice processing. Check your connection and try again.');
  }
  return new VoiceAIError('I could not understand that recording. Try again or type your update.');
}

/** Send one short in-memory recording to TikTym's voice function, then discard it after this request. */
export async function understandVoice(blob: Blob, categories: Pick<Category, 'id' | 'name'>[], signal?: AbortSignal): Promise<VoiceUnderstanding> {
  if (signal?.aborted) throw new DOMException('Voice processing cancelled', 'AbortError');
  if (!blob.size) throw new VoiceAIError('I did not hear anything. Try again or type your update.');
  if (blob.size > 10 * 1024 * 1024) throw new VoiceAIError('That recording is too long. Try a shorter update.');
  if (!categories.length) throw new VoiceAIError('Add a practice before using voice logging.');

  if (config.backend === 'local') {
    const testHook = window.__TIKTYM_VOICE_AI__;
    if (!testHook) throw new VoiceAIError('AI voice logging is available in the signed-in app. Type your update instead.');
    try {
      return validateVoiceUnderstanding(await testHook({ blob, categories, signal }), categories);
    } catch (error) {
      if (error instanceof VoiceAIError) throw error;
      throw aiError(error);
    }
  }

  try {
    const [{ getFunctions, httpsCallable }, { app, auth }] = await Promise.all([
      import('firebase/functions'), import('../store/firebaseClient'),
    ]);
    await auth.authStateReady();
    if (!auth.currentUser) throw new VoiceAIError('Sign in again, then retry your recording.');
    // TikTym's understandVoice function (functions/src/index.ts) asks Gemini and enforces the per-account limit.
    const call = httpsCallable(getFunctions(app, 'asia-south1'), 'understandVoice', { timeout: 40_000, limitedUseAppCheckTokens: true });
    const data = await blobBase64(blob);
    const mimeType = (blob.type || 'audio/webm').split(';', 1)[0];
    const practices = categories.map(({ id, name }) => ({ id, name }));
    const result = await new Promise<unknown>((resolve, reject) => {
      signal?.addEventListener('abort', () => reject(new DOMException('Voice processing cancelled', 'AbortError')), { once: true });
      call({ audio: data, mimeType, practices }).then(r => resolve(r.data), reject);
    });
    return validateVoiceUnderstanding(result, categories);
  } catch (error) {
    if (error instanceof VoiceAIError) throw error;
    throw aiError(error);
  }
}
