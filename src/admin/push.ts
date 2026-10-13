// The push composer's form (ADMIN-10). Pure, so it's unit-tested (tests/adminPush.test.ts); the server checks the same
// rules again (functions/src/pushBroadcast.ts).
import type { PushAudience, PushDraft } from '../../functions/src/pushBroadcast';
import { isEmail } from './email';

export type { PushAudience, PushDraft };

export interface PushForm { audience: PushAudience; to: string; title: string; body: string; url: string }

export const EMPTY_PUSH: PushForm = { audience: 'devices', to: '', title: '', body: '', url: '' };

export const PUSH_AUDIENCE_TEXT: Record<PushAudience, { label: string; hint: string }> = {
  devices: { label: 'Everyone with notifications on', hint: 'Every account with a device that allowed notifications' },
  active7: { label: 'Active in the last 7 days', hint: 'Of those, people who logged something in the last 7 days' },
  person: { label: 'One person', hint: 'One account, by the email it signs in with' },
};

export function pushProblem(f: PushForm): string | null {
  if (f.audience === 'person' && !isEmail(f.to)) return 'Enter the email their TikTym account uses.';
  if (!f.title.trim()) return 'Write a title.';
  if (f.title.trim().length > 60) return 'Keep the title to 60 characters.';
  if (!f.body.trim()) return 'Write the text.';
  if (f.body.trim().length > 160) return 'Keep the text to 160 characters.';
  if (f.url.trim() && !/^\/(?!\/)[^\s"<>]*$/.test(f.url.trim())) return 'The link must be a path in the app, starting with / (like /?tab=insights).';
  return null;
}

export const pushDraftOf = (f: PushForm): PushDraft => ({
  audience: f.audience, title: f.title.trim(), body: f.body.trim(), url: f.url.trim() || '/',
  ...(f.audience === 'person' ? { to: f.to.trim().toLowerCase() } : {}),
});
