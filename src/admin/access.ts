// What the admin console shows for who's signed in (ADMIN-05). This only decides the screen: the data comes from
// Cloud Functions that check the same `admin` claim on the server (functions/src/admin.ts).

export type AdminView =
  | { kind: 'loading' }
  | { kind: 'signed-out' }
  | { kind: 'not-admin'; email: string }
  | { kind: 'admin'; email: string };

export function adminView(user: { email: string | null; uid: string } | null, claims: Record<string, unknown> | null): AdminView {
  if (!user) return { kind: 'signed-out' };
  const email = user.email || user.uid;
  return claims?.admin === true ? { kind: 'admin', email } : { kind: 'not-admin', email };
}
