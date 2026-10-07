# TikTym

Habit-tracking PWA: React 19 + TypeScript + Vite, Firebase (Auth + Firestore) for sync, localStorage in test mode. See README.md for setup, FEATURES.md for every scenario, to-do.md for pending work.

## Workflow for every change

Follow these steps, in order, for every feature, fix or change. Don't skip one because a change looks small.

1. **Log it in `to-do.md`.** Before writing code, add the work as one or more `- [ ]` items in the right section, marked **You** or **Claude**. Split a big task into items small enough to commit one at a time.
2. **Update `FEATURES.md`.** Add or change the scenario rows the work affects, each with an ID, the expected behaviour, and Coverage set to `Gap` for now. Removed behaviour: delete its rows. Recount the summary table from the rows; don't edit the numbers by hand.
3. **Build it and test it.** Write the code and the tests together. Every new or changed scenario gets a test (unit in `tests/`, emulator in `tests-emulator/`, browser in `e2e/`), with its FEATURES ID in the test name, for example `(LOG-04)`. Then set the row's Coverage to the test file. Use `Manual` only for what can't be automated (real phone, real Firebase project), and add that check to to-do.md › "Check by hand before release".
4. **Check in one to-do item at a time.** When an item is done and its tests pass, tick it in to-do.md, move it to the **Done** section with the date, and commit the code, tests, FEATURES.md and to-do.md together in one commit. Then start the next item. Never bundle several to-do items into one commit.

Before each commit, run the checks for what changed. All must pass:

- `npm test` and `npx tsc --noEmit`: always
- `npm run test:e2e:headless`: for any UI or behaviour change
- `npm run test:emulator`: for changes to `src/store/`, `src/auth.ts` or `firestore.rules`

Push only when the user asks.

If the user asks for something that skips a step (for example "just fix it quickly"), still do steps 1 to 4, but say so in one line rather than asking.

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

## Conventions

- Logic with no UI goes in `src/lib/` as pure functions that take their inputs (data, date, user) as parameters; never read React state or localStorage there. This keeps it unit-testable.
- Browser tests run on a fixed clock (Wednesday 7 October 2026) and `en-GB`. Seed history with `seedData` and `signInWith` from `e2e/helpers.ts`. A test-mode browser test fails on any console error or warning.
- Never deploy a build made with `VITE_USE_EMULATORS=true`. `firebase deploy` rebuilds `dist/` first, so a normal deploy is safe.
- Don't run `npm audit fix --force`; it downgrades Firebase. The `@grpc/grpc-js` warning is in Firebase's Node build, not the browser app.
