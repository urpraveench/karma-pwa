# TikTym

A progressive web app (PWA) for tracking daily practice minutes as points (1 minute = 1 point), with carry-forward backlog per practice. It is plain HTML/JS with no build step, hosted on Firebase Hosting with Firestore, and stays within the Spark (free) plan.

## How the backlog works

For each practice, every day:

```
owed today    = carried from yesterday + today's target
carried after = max(0, owed today − minutes logged today)
```

Example: the target is 100. On day 1 you log 40, so 60 carries over. On day 2 you owe 160. You log 130, so 30 carries over.

- **Backlog limit (Setup, default 2 days):** a practice can carry at most N days of its target into a new day. Older misses are forgiven. Choose None for strict full debt.
- Logging more than you owe does not bank credit for future days.
- Logging for a past date (backfill) recalculates everything after it.
- Changing a target applies from today. Past days keep their old target, because target history is stored per practice.
- Archiving a practice clears its backlog and stops new targets from accruing. Deleting a practice removes its logs too.
- Days of the week can be set per practice. Unscheduled days add nothing to what you owe.

## Run locally (test mode)

`config.js` ships with `mode: 'local'`. Sign in with `demo@tiktym.local` / `tiktym123`. Data is stored in the browser's localStorage.

```bash
cd public && npx serve .      # or: python3 -m http.server 8080
```

Setup › **Load sample data** generates 3 weeks of history so you can see the backlog and insights in action.

## Deploy to Firebase (Spark plan)

1. Create a project in the Firebase Console. Add a **Web app** and copy its config.
2. Go to **Build › Firestore Database** and create a database in production mode. Pick a region close to you, such as `asia-south1`.
3. Go to **Build › Authentication › Sign-in method** and enable **Email/Password**. Under **Users**, add your temporary account.
4. Edit `public/config.js`: set `mode: 'firebase'`, paste the `firebase` block, and set `showDevHint: false`.
5. Put your project ID in `.firebaserc`.
6. Deploy:
   ```bash
   npm i -g firebase-tools
   firebase login
   firebase deploy --only hosting,firestore
   ```
7. On your phone, open `https://<project>.web.app` and use **Share › Add to Home Screen** (iOS) or **Install app** (Android).

## ⏰ Reminder: Google sign-in (to do later)

No separate API key is needed. Firebase handles OAuth for web apps.

- [ ] In Authentication › Sign-in method, enable **Google** and set a support email.
- [ ] Under Authentication › Settings › Authorized domains, confirm that `<project>.web.app` and `<project>.firebaseapp.com` are listed, plus any custom domain.
- [ ] In `config.js`, set `enableGoogle: true`.
- [ ] In `config.js`, set `firebase.authDomain` to `<project>.web.app` (your hosting domain). This avoids third-party-storage failures for Google sign-in on iOS Safari and installed PWAs.
- [ ] Redeploy with `firebase deploy --only hosting`.

Until that's done, the Google button shows a reminder instead of signing in.

## Focus timer

Tap ▶ on any practice. Focus view shows one bead per target minute, the clock, points so far and time to target. The screen stays awake (Wake Lock API). The mini-player stays visible on every tab, and you can pause or resume. At the target it plays a chime, vibrates on Android, and keeps counting overtime. Stopping logs the whole minutes. Timer state lives on the device, keyed to its start time, so closing the app doesn't lose it. An alert only fires while the app is open, because background alerts need push notifications (not built yet).

## Moments (context-aware Today screen)

The layout stays the same every day, but one card and the headline goal adapt. The highest-priority match wins. Users can hide a card for the day with ✕.

| Priority | Moment | Trigger |
|---|---|---|
| 100 | Month recap | 1st–3rd of a month, with last month's data |
| 95 | Comeback | Nothing logged for 2+ days |
| 90 | Weekend push | Sat/Sun and under 92% of the weekly pace |
| 85 | Minimum day | Last 7 days under 60% of target |
| 80 | Best month in reach | Last 2 days of the month |
| 60 | Fresh week | Monday |
| 55 | Usual time | Within 1 hour of the median hour a practice is logged (30 days, at least 5 entries) |
| 40 | On a roll | Streak of 3 or more |
| 30 | Start small | New user |

In comeback and minimum-day modes, the mala headline shows a 5–15 minute minimum instead of the full amount owed. A "days showing up" streak counts any day with an entry.

## Data model (Firestore)

```
users/{uid}/categories/{id}   { id, name, color, order, startDate, archivedFrom, targets:[{from, minutes, days:[0-6]}] }
users/{uid}/months/{YYYY-MM}  { entries: { [logId]: { id, catId, date, minutes, note, createdAt } } }
users/{uid}/meta/settings     { seeded, schema: 2, backlogCap }
```

The rules in `firestore.rules` restrict each user to their own `users/{uid}` tree. Logs are bucketed one doc per month, so an app open costs about (categories + months + 1) reads. A user with a year of history is around 17 reads per open, compared with about 1,500 under the old one-doc-per-log layout. Old data migrates automatically on first load (schema 1 to 2). Firestore offline persistence is enabled, so logging works without signal and syncs later.

## Notes

- `config.js` values are not secrets. Firebase web config only identifies the project, and security is enforced by the rules and Auth.
- Test-mode credentials are a UI gate only. Don't put real data in test mode on a shared device.
- Dates use the phone's local time zone.

## Public (B2C) launch checklist

- [ ] `config.js`: `mode: 'firebase'`, `showDevHint: false`, and set `legal` links to real Terms and Privacy pages.
- [ ] In Authentication, enable Email/Password (self sign-up is built in) and Google. Customise the password-reset email template.
- [ ] Turn on **App Check** (reCAPTCHA Enterprise) so only your app can call Firestore.
- [ ] Set budget alerts on the billing account before moving to Blaze. Alerts notify you; they do not cap spend.
- [ ] Account deletion: Setup › Delete account removes all data, then the auth user. App stores require an in-app deletion path.
- [ ] Phase 2 (needs Blaze): Cloud Functions + FCM for reminders, streak-at-risk pushes and a weekly recap.
