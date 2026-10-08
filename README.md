# TikTym

A progressive web app (PWA) for tracking daily practice minutes as points (1 minute = 1 point), with carry-forward backlog per practice. Built with React, TypeScript and Vite, hosted on Firebase Hosting with Firestore, and stays within the Spark (free) plan.

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

With no `.env.local`, the app runs in test mode. Sign in with `demo@tiktym.local` / `tiktym123`. Data is stored in the browser's localStorage.

```bash
npm install
npm run dev        # dev server at http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve dist/ locally, with the service worker
```

Setup › **Load sample data** generates 10 weeks of history so you can see the backlog and insights in action.

## Testing

Every feature and scenario, with the test that covers it, is listed in [FEATURES.md](FEATURES.md).

| Command | What it does |
|---|---|
| `npm test` | Unit tests (Vitest): backlog engine, moments, coach lines, insights, practice edits, Firestore store (in-memory fake) |
| `npm run test:emulator` | Starts the Firebase emulators, then runs the security-rules tests and the Firestore store against a real (local) Firestore |
| `npm run test:e2e` | Browser tests (Playwright) in a visible Chrome window, then opens the HTML report: totals, duration per test, and a screenshot and trace for any failure |
| `npm run test:e2e:headless` | The same browser tests without a window or report server, for CI |
| `npm run test:report` | Unit tests, then opens Vitest's HTML report |
| `npm run test:all` | Unit, emulator and headless browser tests, stopping at the first failing suite |

The browser tests run two production builds as a phone (Pixel 7, `en-GB`, a fixed clock of Wednesday 7 October 2026), so results don't depend on the machine or the date:

- **Test mode** (`dist-e2e/`): sign-in, Today, logging, the focus timer, History, Setup, Insights, offline use, and accessibility basics. Any console error or warning fails the test.
- **Firebase mode** (`dist-e2e-firebase/`, files in `e2e/firebase/`): sign-up, sign-in errors, password reset, sync between two devices, offline logging, and delete account, against the local Auth and Firestore emulators.
- **Firebase mode with Google on** (`dist-e2e-google/`, files in `e2e/firebase-google/`): Google sign-in, using the Auth emulator's pretend Google accounts.

Requirements: Google Chrome, and Java 21 or newer for the Firebase emulators. On a Mac, `brew install openjdk@21`; the scripts pick it up from Homebrew automatically. The emulators run under a `demo-tiktym` project, so they never touch your real Firebase project and need no login. Reports are written to `reports/`; stop a report server with Ctrl+C.

## Configuration

Settings are Vite env vars. Copy `.env.example` to `.env.local` and fill it in. Vite reads them at build time, so rebuild after a change.

| Variable | Meaning |
|---|---|
| `VITE_BACKEND` | `local` (test mode) or `firebase` |
| `VITE_SHOW_DEV_HINT` | Show the test login on the sign-in screen (test mode only) |
| `VITE_ENABLE_GOOGLE` | Enable the Google sign-in button |
| `VITE_TERMS_URL`, `VITE_PRIVACY_URL` | Legal links shown at sign-up |
| `VITE_FIREBASE_*` | The web app config from the Firebase Console |

## Deploy to Firebase (Spark plan)

1. Create a project in the Firebase Console. Add a **Web app** and copy its config.
2. Go to **Build › Firestore Database** and create a database in production mode. Pick a region close to you, such as `asia-south1`.
3. Go to **Build › Authentication › Sign-in method** and enable **Email/Password**. Under **Users**, add your temporary account.
4. In `.env.local`, set `VITE_BACKEND=firebase` and paste the config into the `VITE_FIREBASE_*` variables. Set `VITE_FIREBASE_AUTH_DOMAIN` to `<project>.web.app`.
5. Put your project ID in `.firebaserc`.
6. Deploy. `firebase.json` runs `npm run build` first and serves `dist/`:
   ```bash
   npm i -g firebase-tools
   firebase login
   firebase deploy --only hosting:app,firestore
   ```
7. On your phone, open `https://<project>.web.app` and use **Share › Add to Home Screen** (iOS) or **Install app** (Android).

## Google sign-in

Switched on with `VITE_ENABLE_GOOGLE=true`; the setup steps are in [to-do.md](to-do.md).

Sign-in goes through `https://tiktym.web.app/__/auth/handler` because `VITE_FIREBASE_AUTH_DOMAIN` is the hosting domain, which keeps Google sign-in working in iOS Safari and installed apps. That address must be listed under Authorized redirect URIs on the project's OAuth client in Google Cloud Console, or Google rejects sign-in with `redirect_uri_mismatch`. The service worker leaves all `/__/` addresses to the network (see `navigateFallbackDenylist` in `vite.config.ts`).

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

## Website

The marketing website (tiktym.com) is plain HTML and CSS in `site/`, with no build step. It's a second Firebase Hosting site in the same project:

| Hosting target | Site | Serves | Deploy |
|---|---|---|---|
| `app` | `tiktym` (tiktym.web.app) | the app, from `dist/` | `firebase deploy --only hosting:app` |
| `site` | `tiktym-site` (tiktym-site.web.app) | the website, from `site/` | `firebase deploy --only hosting:site` |

Account emails: the password-reset message body is `email/password-reset.html`, pasted into Firebase › Authentication › Templates; its header image is `site/email/header.png` (`npm run email:header`).

Its feature clips are recorded from the real app with `npm run site:clips` (sample data, a fixed date, a phone-sized window), and its preview image is drawn by `npm run og:image`. The browser tests check it on a phone and a desktop.

## Offline and updates

`vite-plugin-pwa` generates the service worker. It precaches the app shell (`index.html`, the hashed JS and CSS, and the icons), so the app opens without a connection. Google Fonts and the Firebase SDK are cached the first time they load. Firestore and Auth requests are never intercepted; Firestore's own offline cache handles data. A new deploy activates on the next app load.

## Code layout

```
src/lib/       pure logic: dates, backlog engine, moments, insights, practice edits, timer state
src/store/     persistence: localStorage (test mode) and Firestore adapters behind one interface
src/state/     React state: session, data and actions (app.tsx), focus timer (timer.tsx), theme
src/screens/   Login, Today, Insights, History, Setup
src/sheets/    log minutes, add or edit a practice
src/timer/     focus view and mini-player
src/auth.ts    sign-in for both modes; the Firebase SDK loads only in firebase mode
tests/         Vitest unit tests
```

## Notes

- `VITE_FIREBASE_*` values are not secrets. Firebase web config only identifies the project, and security is enforced by the rules and Auth.
- Test-mode credentials are a UI gate only. Don't put real data in test mode on a shared device.
- Dates use the phone's local time zone.

## Usage totals

The app counts anonymous daily totals (Firestore `stats/{date}`; see the Privacy Policy). To chart them, set up the Google Sheet in [tools/sheets/README.md](tools/sheets/README.md).

## Pending work

Everything still to do, including the public launch checklist, is tracked in [to-do.md](to-do.md). The go-to-market plan is in [GTM.md](GTM.md).
