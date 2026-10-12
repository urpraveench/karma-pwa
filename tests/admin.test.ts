import { describe, expect, it } from 'vitest';
import { adminCheck } from '../functions/src/admin';
import { nextClaims, parseGrantArgs } from '../scripts/admin-claims.mjs';

describe('granting admin (ADMIN-01)', () => {
  it('reads an email, --revoke and --project', () => {
    expect(parseGrantArgs(['Praveen@Example.com'])).toEqual({ email: 'praveen@example.com', revoke: false, project: 'tiktym' });
    expect(parseGrantArgs(['a@b.co', '--revoke', '--project', 'demo-tiktym'])).toEqual({ email: 'a@b.co', revoke: true, project: 'demo-tiktym' });
  });

  it('refuses a missing or bad email, unknown flags and a missing project', () => {
    expect(parseGrantArgs([]).error).toMatch(/Usage/);
    expect(parseGrantArgs(['not-an-email']).error).toMatch(/Usage/);
    expect(parseGrantArgs(['a@b.co', '--force']).error).toMatch(/Unknown argument: --force/);
    expect(parseGrantArgs(['a@b.co', 'c@d.co']).error).toMatch(/Unknown argument: c@d.co/);
    expect(parseGrantArgs(['a@b.co', '--project']).error).toMatch(/--project/);
  });

  it('sets or removes only the admin claim, keeping any others', () => {
    expect(nextClaims(undefined, false)).toEqual({ admin: true });
    expect(nextClaims({ beta: 1 }, false)).toEqual({ beta: 1, admin: true });
    expect(nextClaims({ beta: 1, admin: true }, true)).toEqual({ beta: 1 });
    expect(nextClaims(null, true)).toEqual({});
  });
});

describe('admin functions refuse others (ADMIN-02)', () => {
  it('lets in only a signed-in account whose admin claim is exactly true', () => {
    expect(adminCheck({ uid: 'p', token: { admin: true } })).toBe('ok');
    expect(adminCheck(undefined)).toBe('unauthenticated');
    expect(adminCheck({ uid: '', token: { admin: true } })).toBe('unauthenticated');
    expect(adminCheck({ uid: 'm', token: {} })).toBe('permission-denied');
    expect(adminCheck({ uid: 'm', token: { admin: 'true' } })).toBe('permission-denied');
    expect(adminCheck({ uid: 'm', token: { admin: 1 } })).toBe('permission-denied');
  });
});
