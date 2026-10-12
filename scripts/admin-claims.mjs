// The pure half of `npm run admin:grant` (ADMIN-01): reading its arguments and working out the account's new claims.

/** `<email> [--revoke] [--project <id>]`, or an error message. */
export function parseGrantArgs(argv) {
  let email = '', revoke = false, project = 'tiktym';
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--revoke') revoke = true;
    else if (a === '--project') project = argv[++i] ?? '';
    else if (!a.startsWith('-') && !email) email = a.trim().toLowerCase();
    else return { error: `Unknown argument: ${a}` };
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'Usage: npm run admin:grant -- <email> [--revoke] [--project <id>]' };
  if (!project) return { error: '--project needs a project ID' };
  return { email, revoke, project };
}

/** The account's claims with `admin` set or removed, keeping any others. */
export function nextClaims(current, revoke) {
  const claims = { ...(current ?? {}) };
  if (revoke) delete claims.admin;
  else claims.admin = true;
  return claims;
}
