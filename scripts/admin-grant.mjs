// npm run admin:grant -- <email> [--revoke] [--project <id>]
// Gives an account the admin console (ADMIN-01), or takes it away, by setting the `admin` custom claim with the Admin
// SDK. Uses your Google login: run `gcloud auth application-default login` first. No app or function can set the claim.
import { createRequire } from 'node:module';
import { nextClaims, parseGrantArgs } from './admin-claims.mjs';

// firebase-admin is installed for the functions, not the app.
const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const args = parseGrantArgs(process.argv.slice(2));
if (args.error) {
  console.error(args.error);
  process.exit(1);
}

initializeApp({ credential: applicationDefault(), projectId: args.project });
const auth = getAuth();
const user = await auth.getUserByEmail(args.email).catch(e => {
  if (e?.code === 'auth/user-not-found') {
    console.error(`No account with ${args.email} in ${args.project}. Sign in to the app with it once, then run this again.`);
  } else {
    console.error(`Couldn't look up ${args.email} in ${args.project}: ${e?.message || e}`);
    if (/quota project|x-goog-user-project|adc-troubleshooting|PERMISSION_DENIED|insufficient/i.test(String(e?.message))) {
      console.error(`Try: gcloud auth application-default set-quota-project ${args.project}`);
    }
  }
  process.exit(1);
});
await auth.setCustomUserClaims(user.uid, nextClaims(user.customClaims, args.revoke));
console.log(args.revoke ? `${args.email} is no longer an admin.` : `${args.email} is now an admin. Sign out and in again on admin.tiktym.com to pick it up.`);

const admins = [];
let page;
do {
  page = await auth.listUsers(1000, page?.pageToken);
  admins.push(...page.users.filter(u => u.customClaims?.admin === true).map(u => u.email ?? u.uid));
} while (page.pageToken);
console.log(`Admins in ${args.project}: ${admins.join(', ') || 'none'}`);
