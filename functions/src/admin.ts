// The admin console's access rule (ADMIN-02): only a signed-in account carrying the `admin` custom claim, which only
// `npm run admin:grant` can set, may call an admin function. index.ts turns the answer into an HttpsError.

export type AdminCaller = { uid: string; token: Record<string, unknown> } | undefined;

/** 'ok' for an admin; otherwise the HttpsError code to refuse with. */
export function adminCheck(auth: AdminCaller): 'ok' | 'unauthenticated' | 'permission-denied' {
  if (!auth?.uid) return 'unauthenticated';
  return auth.token.admin === true ? 'ok' : 'permission-denied';
}
