// How the Costs page shows spend and limits (ADMIN-13). Pure, so it's unit-tested (tests/adminCosts.test.ts).
import type { Billing, Level } from '../../functions/src/costs';

export interface LimitRow { id: string; label: string; limit: number; unit: 'count' | 'bytes'; link: string; used: number | null; level: Level | null; error?: string }
export interface Costs { billing: ({ status: 'ok' } & Billing) | { status: 'unavailable'; reason: string }; limits: LimitRow[] }

const MB = 1024 * 1024;
const amount = (v: number, unit: LimitRow['unit']) => (unit === 'bytes' ? `${Math.round(v / MB).toLocaleString('en-GB')} MB` : Math.round(v).toLocaleString('en-GB'));

/** "1,234 of 50,000 (2%)" or "120 MB of 360 MB (33%)". */
export const usedText = (l: LimitRow & { used: number }) => `${amount(l.used, l.unit)} of ${amount(l.limit, l.unit)} (${Math.round((l.used / l.limit) * 100)}%)`;

/** The level in words, so it never rests on colour alone. */
export const LEVEL_TEXT: Record<Level, string> = { ok: 'OK', amber: 'Over 70%', red: 'Over 90%' };

export const money = (v: number, currency: string) => new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(v);
