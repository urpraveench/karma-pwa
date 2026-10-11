# TikTym

Habit-tracking PWA: React 19 + TypeScript + Vite, Firebase (Auth + Firestore) for sync, localStorage in test mode. The marketing website is plain HTML in `site/`. See README.md for setup, FEATURES.md for every scenario, to-do.md for pending work, GTM.md for the go-to-market plan, OUTREACH.md for day-to-day outreach tasks and logs, CHANGELOG.md for what changed in each release, written for users. NOTIFICATIONS.md is the plan for onboarding emails, reminders and push notifications.

## Workflow for every change

Follow these steps, in order, for every feature, fix or change. Don't skip one because a change looks small.

1. **Log it in `to-do.md`.** Before writing code, add the work as one or more `- [ ]` items in the right section, marked **You** or **Claude**. Split a big task into items small enough to commit one at a time.
2. **Update `FEATURES.md`.** Add or change the scenario rows the work affects, each with an ID, the expected behaviour, and Coverage set to `Gap` for now. Removed behaviour: delete its rows. Recount the summary table from the rows; don't edit the numbers by hand.
3. **Build it and test it.** Write the code and the tests together. Every new or changed scenario gets a test (unit in `tests/`, emulator in `tests-emulator/`, browser in `e2e/`), with its FEATURES ID in the test name, for example `(LOG-04)`. Then set the row's Coverage to the test file. If users would notice the change, add a line for it under "Coming next" in CHANGELOG.md, in their words, and run `npm run site:updates` (a unit test fails if the website's What's new page doesn't match the changelog). Use `Manual` only for what can't be automated (real phone, real Firebase project), and add that check to to-do.md › "Check by hand before release".
4. **Check in one to-do item at a time.** When an item is done and its tests pass, tick it in to-do.md, move it to the **Done** section with the date, and commit the code, tests, FEATURES.md and to-do.md together in one commit. Then start the next item. Never bundle several to-do items into one commit.

Before each commit, run the checks for what changed. All must pass:

- `npm test` and `npx tsc --noEmit`: always
- `npm run test:e2e:headless`: for any UI or behaviour change
- `npm run test:emulator`: for changes to `src/store/`, `src/auth.ts` or `firestore.rules`

Gate the commit on each command's exit code (`set -o pipefail` when piping output), never on a printed summary line: Playwright prints failures above its last line, and the emulator projects retry once, so a summary can look green when it isn't.

If browser tests fail only by timing out (a page or Chrome slow to start) while the machine is busy, check `uptime`; rerun with `--workers=2` rather than changing the test, and say so.

Push only when the user asks.

If the user asks for something that skips a step (for example "just fix it quickly"), still do steps 1 to 4, but say so in one line rather than asking.

## Releasing

Every deploy gets a new version, so the app's version label and update bar mean something.

1. Bump the version: `npm version patch --no-git-tag-version` for fixes (1.0.0 → 1.0.1), `npm version minor --no-git-tag-version` for new features (1.0.1 → 1.1.0). Use `major` only for a change users must relearn.
2. In CHANGELOG.md, turn "## Coming next" into `## 1.0.1 · <date> · <short title>` (skip this for a release with nothing users would notice, and fold its fixes into the next entry), then run `npm run site:updates`. Commit the bump, the changelog and `site/updates/` together ("Release 1.0.1"), after the work it ships, so the build isn't stamped `-dirty`. A unit test fails if the changelog's newest version isn't the app's version. Before that commit, run `npm test` and the website tests (`npx playwright test --project=Website --project="Website (desktop)"`), since the changelog change alters the website.
3. `firebase deploy --only hosting:app` (it rebuilds `dist/` first), then check https://app.tiktym.com/version.json shows the new version and commit. If `firestore.rules` changed, deploy them in the same command (`--only hosting:app,firestore:rules`); an app that writes something the live rules don't allow fails silently.
   Then deploy the website too (`firebase deploy --only hosting:site`, which rebuilds the What's new page first) so tiktym.com/updates/ shows the release. If the release changes anything the clips show, re-record them first (`npm run site:clips`) and check them by eye.
4. Add a line under Done in to-do.md: "Released 1.0.1: <what changed>".

## Commands

| Command | Use |
|---|---|
| `npm run dev` | Dev server, test mode |
| `npm test` | Unit tests |
| `npm run test:emulator` | Rules and store tests on the Firebase emulators (needs Java 21+) |
| `npm run test:e2e:headless` | Browser tests, test mode and Firebase mode |
| `npm run test:e2e` | Browser tests in a visible window, then opens the HTML report |
| `npm run test:all` | All three suites |
| `npm run build` | Type-check and production build into `dist/` |
| `npm run site:clips` | Re-record the website's feature clips from the real app |
| `npm run site:install-videos` | Re-record the website's install videos (iOS simulator and Android emulator, from the live app) |
| `npm run site:updates` | Rebuild the website's What's new page (`site/updates/`) from CHANGELOG.md |
| `npm run og:image` | Redraw the link-preview image (app and website) |
| `npm run brand:kit` | Redraw the logo set in `public/brand/` (every lockup and colour, SVG and PNG) |

## Conventions

- Logic with no UI goes in `src/lib/` as pure functions that take their inputs (data, date, user) as parameters; never read React state or localStorage there. This keeps it unit-testable.
- Browser tests run on a fixed clock (Wednesday 7 October 2026) and `en-GB`. Seed history with `seedData` and `signInWith` from `e2e/helpers.ts`. A test-mode browser test fails on any console error or warning.
- Never deploy a build made with `VITE_USE_EMULATORS=true`. `firebase deploy` rebuilds `dist/` first, so a normal deploy is safe.
- The website loads Google Analytics with the real ID by default, so any test or script that opens a website page must block Google's tag and collection servers (as `e2e/site/site.spec.ts` does). Never open tiktym.com pages in automated checks without that.
- Don't run `npm audit fix --force`; it downgrades Firebase. The `@grpc/grpc-js` warning is in Firebase's Node build, not the browser app.
