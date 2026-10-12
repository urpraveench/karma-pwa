import { describe, expect, it } from 'vitest';
import { adminView } from '../src/admin/access';

describe('admin sign-in (ADMIN-05)', () => {
  it('shows sign-in when signed out, the console only with the admin claim, and "not an admin" otherwise', () => {
    expect(adminView(null, null)).toEqual({ kind: 'signed-out' });
    expect(adminView({ uid: 'p', email: 'p@x.com' }, { admin: true })).toEqual({ kind: 'admin', email: 'p@x.com' });
    expect(adminView({ uid: 'm', email: 'm@x.com' }, {})).toEqual({ kind: 'not-admin', email: 'm@x.com' });
    expect(adminView({ uid: 'm', email: 'm@x.com' }, { admin: 'true' })).toEqual({ kind: 'not-admin', email: 'm@x.com' });
    expect(adminView({ uid: 'm', email: null }, null)).toEqual({ kind: 'not-admin', email: 'm' });
  });
});
