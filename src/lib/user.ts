import type { User } from './types';

/** A friendly first name from the display name, or from the email's local part. */
export function firstName(user: User | null): string {
  const raw = user?.name && user.name !== 'Test user' ? user.name : (user?.email || '').split('@')[0];
  const w = (raw || '').split(/[\s._\-0-9]+/).filter(Boolean)[0];
  return w && w.length > 1 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : '';
}

export function greeting(user: User | null, hour = new Date().getHours()): string {
  const n = firstName(user);
  return (hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening') + (n ? `, ${n}` : '');
}
