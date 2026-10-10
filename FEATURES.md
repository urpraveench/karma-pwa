# TikTym features and scenarios

This is the scope of TikTym: every feature the app has, written as scenarios, with the test that covers each one. Keep it current. When you add or change a feature, add or update its rows here first, then write the test and fill in the Coverage column.

**Last reviewed:** 7 October 2026, after adding the emulator and edge-case tests.

## How to read this

Each scenario has an ID (for example `LOG-04`) that you can quote in commits, issues and test names.

| Coverage | Meaning |
|---|---|
| **E2E** `file` | A Playwright browser test in `e2e/` checks it. `firebase/…` and `firebase-google/…` tests run the app in Firebase mode against the local emulators |
| **Unit** `file` | A Vitest test in `tests/` checks it |
| **Emulator** `file` | A Vitest test in `tests-emulator/` checks it against the local Firebase emulators |
| **Gap** | Not tested yet. Candidate for a new test |
| **Manual** | Needs a real Firebase project, a real phone, or real time passing. Check by hand before a release |

A row covered only in part says so in brackets, for example "E2E `today.spec.ts` (the default is a Gap)". The summary counts those rows as tested, so read the brackets when hunting for gaps.

Summary of coverage at the time of writing:

| Area | Scenarios | Tested | Gap | Manual |
|---|---|---|---|---|
| 1. Accounts and sign-in | 28 | 25 | 0 | 3 |
| 2. First run | 12 | 11 | 0 | 1 |
| 3. Backlog rules | 13 | 13 | 0 | 0 |
| 4. Today screen | 16 | 16 | 0 | 0 |
| 5. Moments | 14 | 14 | 0 | 0 |
| 6. Logging minutes | 20 | 20 | 0 | 0 |
| 7. Focus timer | 22 | 19 | 0 | 3 |
| 8. History | 9 | 9 | 0 | 0 |
| 9. Insights | 23 | 23 | 0 | 0 |
| 10. Practices (Setup) | 23 | 23 | 0 | 0 |
| 11. Settings and data (Setup) | 19 | 18 | 0 | 1 |
| 12. Sync and storage | 17 | 15 | 0 | 2 |
| 13. App shell, PWA and platform | 35 | 30 | 0 | 5 |
| 14. Marketing and sharing | 22 | 22 | 0 | 0 |
| 15. Analytics | 12 | 12 | 0 | 0 |
| 16. Notifications | 5 | 5 | 0 | 0 |
| **Total** | **290** | **275** | **0** | **15** |

---

## 1. Accounts and sign-in

The app has two modes, set by `VITE_BACKEND`. **Test mode** (`local`) keeps data in the browser behind a fixed demo login. **Firebase mode** uses Firebase Auth and Firestore.

### Test mode

| ID | Scenario | Expected | Coverage |
|---|---|---|---|
| AUTH-01 | Open the app signed out | Login screen with the TikTym mark, heading and tagline "100 minutes a day for your productive life." | E2E `auth.spec.ts` |
| AUTH-02 | Test-mode hint | Shows the demo email and password when `VITE_SHOW_DEV_HINT` is on | E2E `auth.spec.ts` |
| AUTH-03 | Submit with an empty field | "Enter your email and password." | E2E `auth.spec.ts` |
| AUTH-04 | Wrong email or password | "That email and password don't match the test login." | E2E `auth.spec.ts` |
| AUTH-05 | Correct demo login (email is case-insensitive) | Opens Today | E2E `auth.spec.ts` |
| AUTH-06 | Reload while signed in | Stays signed in | E2E `auth.spec.ts` |
| AUTH-07 | Sign out (Setup › Sign out, confirm) | Returns to login; data stays on the device for next sign-in | E2E `auth.spec.ts` |
| AUTH-08 | Google button in test mode | Toast: Google sign-in isn't set up yet | E2E `auth.spec.ts` |

### Firebase mode

| ID | Scenario | Expected | Coverage |
|---|---|---|---|
| AUTH-10 | Sign in with email and password | Opens Today; session persists across reloads and app restarts | E2E `firebase/account.spec.ts` |
| AUTH-11 | Switch to "Create an account" | Heading text changes; password label shows "(6+ characters)" | E2E `firebase/account.spec.ts` |
| AUTH-12 | Sign up | Creates the account and opens Today with default practices | E2E `firebase/account.spec.ts` |
| AUTH-13 | Sign up with an existing email | "That email already has an account. Sign in instead." | E2E `firebase/account.spec.ts` |
| AUTH-14 | Sign up with a short password | "Use at least 6 characters." | E2E `firebase/account.spec.ts` |
| AUTH-15 | Wrong credentials | "That email and password don't match." | E2E `firebase/account.spec.ts` |
| AUTH-16 | Invalid email, too many attempts, or no connection | Matching friendly message; anything unknown shows "Something went wrong: <code>" | E2E `firebase/account.spec.ts` (invalid email; too-many-attempts and no-connection are Manual) |
| AUTH-17 | Forgot password with no email entered | "Enter your email above, then tap Forgot password again." | E2E `firebase/account.spec.ts` |
| AUTH-18 | Forgot password with an email | Toast: a reset link is on its way (shown whether or not the account exists) | E2E `firebase/account.spec.ts` |
| AUTH-19 | Google sign-in when enabled | Popup sign-in; falls back to a redirect if the popup is blocked; opens Today; signing in again on another device returns to the same data | E2E `firebase-google/google.spec.ts` (emulator; a real phone is in to-do.md) |
| AUTH-20 | Google sign-in when `VITE_ENABLE_GOOGLE` is off | Toast explaining it isn't set up | E2E `firebase/account.spec.ts` |
| AUTH-21 | Legal links | "By continuing you agree to the Terms and Privacy Policy" on the login screen, and Terms and Privacy links in Setup › About; both open the pages | E2E `legal.spec.ts` |
| AUTH-22 | Firebase SDK fails to load | Login screen with "Could not load Firebase. Check your connection and .env.local." | Manual |
| AUTH-23 | Sign out | Returns to login | E2E `firebase/account.spec.ts` |
| AUTH-24 | Google with an email that already has a password account | Opens that same account with its data (Firebase's default: one account per email) | E2E `firebase-google/google.spec.ts` |
| AUTH-26 | Password after Google takes over an unverified account | In production, Firebase removes the password from an account whose email was never verified once Google signs in with that email; sign in with Google from then on, or use Forgot password to set a new one | Manual: checked on iPhone, 8 October 2026 |
| AUTH-27 | Google sign-in in an app installed on an iPhone or iPad home screen | Uses a full-page redirect instead of a pop-up (a pop-up opens in Safari, whose storage the installed app can't see) and comes back signed in | E2E `firebase-google/google.spec.ts` (emulated iPhone home-screen app; a real iPhone is in to-do.md) |
| AUTH-28 | Account emails reach the inbox | Password-reset and other account emails come from a TikTym-owned domain with SPF and DKIM, named "TikTym", and arrive in the inbox rather than spam | Manual: checked in Gmail on iPhone, 8 October 2026 |
| AUTH-30 | Google first | Continue with Google is the main button, straight under the tagline; email and password sit below "or use your email", with a lighter Sign in button. Same order when creating an account | E2E `auth.spec.ts`, `firebase/account.spec.ts` |
| AUTH-25 | First Google sign-in | Creates the account, seeds the default practices, greets by the Google first name | E2E `firebase-google/google.spec.ts` |

## 2. First run

| ID | Scenario | Expected | Coverage |
|---|---|---|---|
| FIRST-01 | First sign-in with no data | "What do you want to make time for?" before Today, with Exercise 30, Reading 30, Course study 30 and Meditation 10 ticked. Start right away and those four begin today, every day, as before | E2E `first-run.spec.ts`, `firebase/account.spec.ts`, Unit `firstRun.test.ts` |
| FIRST-02 | User deletes every practice | Defaults are not re-seeded on the next load (the `seeded` flag is kept) | E2E `firebase/account.spec.ts` |
| FIRST-03 | Loading screen | From the very first moment, before any code arrives: the TikTym name and "Loading TikTym…". The same screen stays up while Firebase starts and data loads, so the page is never blank | E2E `loading.spec.ts`, `firebase/loading.spec.ts` |
| FIRST-05 | Slow connection | After 5 seconds still loading: "Your connection seems slow. TikTym is still loading, and it opens instantly next time." | E2E `loading.spec.ts` |
| FIRST-06 | Stuck loading | After 20 seconds: "Still loading? Check your connection, then try again." with a Reload button | E2E `loading.spec.ts` |
| FIRST-07 | Offline on first visit | "You're offline. TikTym needs a connection the first time it opens; after that it works offline." with a Reload button; when the connection returns, it loads by itself | E2E `loading.spec.ts` |
| FIRST-08 | Choosing practices | Eight suggestions for working professionals (also Coding practice 30, Language learning 15, Journaling 10, Walking 20); tap to tick or untick. Start creates the ticked ones, every day from today, in the order shown | E2E `first-run.spec.ts`, Unit `firstRun.test.ts` |
| FIRST-09 | Adjusting minutes | − and + beside a ticked practice change its daily target by 5 minutes, from 5 to 240 | E2E `first-run.spec.ts`, Unit `firstRun.test.ts` |
| FIRST-10 | Adding your own | "Add your own" adds a ticked practice of 20 minutes; a name already on the list ticks that one instead | E2E `first-run.spec.ts`, Unit `firstRun.test.ts` |
| FIRST-11 | Nothing ticked | The Start button says "Pick at least one" and does nothing | E2E `first-run.spec.ts` |
| FIRST-12 | Leaving before Start | Nothing is saved, so the next open (on any device) asks again; once started, it never asks again, even if every practice is later deleted (FIRST-02) | E2E `first-run.spec.ts` |
| FIRST-04 | Data fails to load | Back to login with "Could not load your data. Check Firestore rules and your connection." | Manual |

## 3. Backlog rules

The core engine: one minute logged is one point. Per practice, per day: `owed = carried in + today's target`, and `carried out = max(0, owed − logged)`.

| ID | Scenario | Expected | Coverage |
|---|---|---|---|
| CALC-01 | Log less than the target | The shortfall carries to the next day (target 100, log 40: 60 carries; next day owes 160) | Unit `backlog.test.ts` |
| CALC-02 | Log more than owed | Extra minutes are history only; no credit carries forward | Unit `backlog.test.ts` |
| CALC-03 | Backlog limit, default 2 days | A practice carries at most 2 days of its target into a new day; older misses are forgiven | Unit `backlog.test.ts` |
| CALC-04 | Backlog limit "None" | Full debt carries, uncapped | Unit `backlog.test.ts` |
| CALC-05 | Unscheduled weekday | Adds nothing to what's owed | Unit `backlog.test.ts` |
| CALC-06 | Target changed | The new target applies from its start date; earlier days keep the old one | Unit `backlog.test.ts` |
| CALC-07 | Days before a practice's start date | Never owed | Unit `backlog.test.ts` |
| CALC-08 | Archived practice | Backlog clears from the archive date; nothing accrues; excluded from today's totals | Unit `backlog.test.ts` |
| CALC-09 | Backfill a past day | Every later day is recalculated | Unit `backlog.test.ts` |
| CALC-10 | Streak | Consecutive days ending with nothing owed; today counts only once it is clear; days with nothing due don't break or extend it | Unit `backlog.test.ts` |
| CALC-11 | Best streak | Longest run on record, including the current one | Unit `backlog.test.ts` |
| CALC-12 | "Days showing up" streak | Consecutive days with any entry; starts from yesterday if today has none yet | Unit `backlog.test.ts` |
| CALC-13 | Carried over still to clear | Today's carried-in minutes not yet worked off | Unit `backlog.test.ts` |

## 4. Today screen

| ID | Scenario | Expected | Coverage |
|---|---|---|---|
| TODAY-01 | Header | Long date and a greeting by time of day (morning before 12, afternoon before 17, evening after), with first name | E2E `auth.spec.ts`, `today-states.spec.ts` |
| TODAY-02 | First name | From the display name; in test mode, or with no name, from the email (`asha.k@…` → "Asha") | Unit `moments.test.ts` |
| TODAY-03 | Streak badge | "N day streak", with "best N" when the best is higher | E2E `today-states.spec.ts` |
| TODAY-04 | No streak, but 2+ days showing up | "N days showing up" instead | E2E `today-states.spec.ts` |
| TODAY-05 | Mala | 108 beads: practice colours for minutes done, red for carried-over minutes still owed, grey for still due, gold marker at the top | E2E `today-states.spec.ts` |
| TODAY-06 | Mala animation | Beads animate in on first load and after loading sample data | E2E `today-states.spec.ts` |
| TODAY-07 | Centre: points left | Big number of points left today, plus "N carried over" when there is carried backlog | E2E `today.spec.ts`, `today-states.spec.ts` |
| TODAY-08 | Centre: all done | "All clear" with points logged today | E2E `today.spec.ts` |
| TODAY-09 | Centre: nothing due | "Rest day · Nothing due today" | E2E `today-states.spec.ts` |
| TODAY-10 | Centre: minimum mode | In comeback and minimum-day moments: minutes still needed to make today count, with the full amount as a smaller "if you go all in" | E2E `today-states.spec.ts` |
| TODAY-11 | Practice rows | Name, colour stripe, "N of M, K carried" or "Done, N logged" or "Rest day", and a progress bar showing done and carried | E2E `today.spec.ts`, `today-states.spec.ts` |
| TODAY-12 | Archived practices | Not shown on Today | E2E `today-states.spec.ts` |
| TODAY-13 | Streak nudge | After 6 pm with a streak and points left, and no moment card: "Clear N more to keep your K-day streak" | E2E `today-states.spec.ts` |
| TODAY-14 | Focus timer tip | Shown until dismissed or a timer is first started; hidden when a moment card or timer is showing | E2E `today-states.spec.ts` |
| TODAY-15 | No active practices | "No practices yet. Add one in Setup." | E2E `log-sheet.spec.ts` |
| TODAY-16 | Practice order | Rows follow the practice order set in Setup | E2E `today.spec.ts` |

## 5. Moments

One card on Today adapts to the situation. The highest-priority match wins. Any card can be hidden for the rest of the day with ✕.

| ID | Moment (priority) | When it shows | Coverage |
|---|---|---|---|
| MOM-01 | Month recap (100) | 1st to 3rd of a month, with last month's data: hours practised, days cleared, best practice, change versus the month before | Unit `moments-more.test.ts` |
| MOM-02 | Comeback (95) | Nothing logged today, yesterday or the day before (history of 3+ days). Switches Today to minimum mode | Unit `moments.test.ts` |
| MOM-03 | Weekend push (90) | Saturday or Sunday and under 92% of the weekly pace: points short, per-day amount to close it, biggest gap | Unit `moments-more.test.ts` |
| MOM-04 | Minimum day (85) | Last 7 days under 60% of target (history of 5+ days). Minimum mode | Unit `moments-more.test.ts` |
| MOM-05 | Best month in reach (80) | Last 2 days of the month: points needed to beat the best month, or "already your best month" | Unit `moments-more.test.ts` |
| MOM-06 | Fresh week (60) | Monday: last week's percentage and clear days | Unit `moments-more.test.ts` |
| MOM-07 | Usual time (55) | Within an hour of the median time a pending practice is logged (last 30 days, 5+ entries) | Unit `moments.test.ts` |
| MOM-08 | On a roll (40) | Streak of 3+ with points left; "A new record is one day away" when one more day beats the best | Unit `moments-more.test.ts` |
| MOM-09 | Start small (30) | New user (under 3 days of history) with nothing logged today | Unit `moments.test.ts`, E2E `today.spec.ts` |
| MOM-10 | Minimum goal | 5 to 15 minutes, rounded to 5, from the easiest pending practice | Unit `moments.test.ts` |
| MOM-11 | Card action button | Starts a focus timer on the suggested practice with the suggested goal; hidden while a timer runs | E2E `today-states.spec.ts` |
| MOM-12 | Hide for today | ✕ hides that card until tomorrow, surviving reloads; a lower-priority card may take its place | E2E `today.spec.ts`, `today-states.spec.ts`, Unit `moments.test.ts` |
| MOM-13 | Reaching the minimum | Logging past the minimum goal shows "Today counts. Anything more is a bonus." | E2E `today-states.spec.ts` |
| MOM-14 | No active practices | No card | Unit `moments.test.ts` |

## 6. Logging minutes

### Quick log

| ID | Scenario | Expected | Coverage |
|---|---|---|---|
| LOG-01 | Tap the coloured "+N" button on a practice | Logs everything left for today; toast "Name done for today" | E2E `today.spec.ts` |
| LOG-02 | Tap ✓ on a cleared practice | Opens the log sheet for that practice | E2E `log-sheet.spec.ts` |
| LOG-03 | Undo from the toast | Removes the entry and restores the totals; toast "Undone" | E2E `today.spec.ts` |
| LOG-04 | Clear the last pending practice | Full-screen "All clear" celebration with the streak; tap anywhere to close, or Undo last entry | E2E `today.spec.ts`, `today-states.spec.ts` |
| LOG-05 | Streak milestones in the celebration | Extra line at 3, 7, 21, 30, 50, 100 and 108 days | E2E `today-states.spec.ts` |

### Log sheet

| ID | Scenario | Expected | Coverage |
|---|---|---|---|
| LOG-10 | Open from the + tab button | Preselects the first practice with time left (or the first practice) | E2E `today.spec.ts` |
| LOG-11 | Open from a practice name | Preselects that practice | E2E `today.spec.ts` |
| LOG-12 | + with no active practices | Toast "Add a practice in Setup first"; no sheet | E2E `log-sheet.spec.ts` |
| LOG-13 | Practice chips | One per active practice, showing minutes left today | E2E `log-sheet.spec.ts` |
| LOG-14 | Day buttons | Today, Yesterday, the weekday of 2 days ago, and Earlier | E2E `log-sheet.spec.ts` |
| LOG-15 | Earlier | Shows a date picker defaulting to 3 days ago; future dates aren't allowed | E2E `log-sheet.spec.ts` |
| LOG-16 | "All that's left" tile | Logs the remaining minutes for the chosen day | E2E `log-sheet.spec.ts` |
| LOG-17 | Practice already clear that day | "Name is clear today. Extra minutes still go into your history." | E2E `log-sheet.spec.ts` |
| LOG-18 | Minute tiles (5, 10, 15, 20, 30, 45, 60) | One tap logs and closes the sheet; toast "+N Name" | E2E `today.spec.ts` |
| LOG-19 | Backfill toast | Adds ", yesterday" or the date | E2E `today.spec.ts` |
| LOG-20 | Other | Stepper (±1, minimum 1), default 25 or what's left if smaller | E2E `today.spec.ts`, `log-sheet.spec.ts` |
| LOG-21 | Add a note | Up to 120 characters, saved with the entry and shown in History | E2E `today.spec.ts`, `history.spec.ts` |
| LOG-22 | "Start a timer instead" | Only for today; starts a focus timer on the chosen practice | E2E `log-sheet.spec.ts` |
| LOG-23 | Close | Tap outside, or press Escape | E2E `today.spec.ts`, `log-sheet.spec.ts` |
| LOG-24 | Invalid amount | Outside 1 to 1440: "Enter between 1 and 1440 minutes"; empty Other: "Enter the minutes" | E2E `log-sheet.spec.ts` |

## 7. Focus timer

| ID | Scenario | Expected | Coverage |
|---|---|---|---|
| TIMER-01 | Start with ▶ on a practice | Opens the full-screen focus view | E2E `timer.spec.ts` |
| TIMER-02 | Default target | Minutes left today, capped at 120; 25 if under 5 are left | E2E `timer.spec.ts` |
| TIMER-03 | Focus view | Practice name, one bead per target minute (up to 60), progress ring, clock, "N points so far", time to target | E2E `timer.spec.ts` |
| TIMER-04 | Change target | Chips for 15, 25, 45, and "(all left)" when 5 to 180 minutes are left | E2E `timer.spec.ts`, `today-states.spec.ts` |
| TIMER-05 | Target reached | Beads turn gold, chime, vibration on Android, toast; counting continues as overtime. If iOS has suspended audio, it's woken first; if it can't be woken at once, the chime is skipped rather than played late. Any tap wakes suspended audio | E2E `timer.spec.ts`, `chime.spec.ts` (with a fake audio engine; real sound and vibration are Manual) |
| TIMER-06 | Tab title | Shows the running clock and practice; resets to "TikTym" when stopped | E2E `timer.spec.ts` |
| TIMER-07 | Screen stays awake | Wake Lock held while the focus view is open, re-acquired on return; "Screen stays on" shown | Manual |
| TIMER-08 | Minimise | Mini-player above the tab bar on every tab: clock, practice, pause, stop, progress line | E2E `timer.spec.ts` |
| TIMER-09 | Live minutes on Today | The practice's ▶ shows the running minutes as a number over a small "min" ("12 min", not "12′"); mala shows pulsing live beads | E2E `timer.spec.ts` |
| TIMER-10 | Reopen | Tap the mini-player or the live minutes button | E2E `timer.spec.ts` |
| TIMER-11 | Pause and resume | From the focus view or the mini-player; paused time isn't counted; clock blinks | E2E `timer.spec.ts` |
| TIMER-12 | Stop and log | Logs the whole minutes, same toasts and celebration as manual logging | E2E `timer.spec.ts` |
| TIMER-13 | Stop under a minute | "Under a minute, so nothing was logged" | E2E `timer.spec.ts` |
| TIMER-14 | Stop after more than 4 hours | Confirm before logging; if declined, opens the log sheet's Other entry instead | E2E `timer.spec.ts` |
| TIMER-15 | Discard | Throws the time away; asks first if 2+ minutes have run | E2E `timer.spec.ts` |
| TIMER-16 | Start a second timer while one runs | Asks to stop and log the first, then starts the new one | E2E `timer.spec.ts` |
| TIMER-17 | Tap ▶ on the running practice | Reopens the focus view | E2E `log-sheet.spec.ts` |
| TIMER-18 | Reload or close the app | Timer keeps running from its start time (stored on the device) | E2E `timer.spec.ts` |
| TIMER-19 | Practice deleted while its timer runs | Timer is cleared | E2E `timer.spec.ts` |
| TIMER-20 | Escape | Closes the focus view (timer keeps running) | E2E `timer.spec.ts` |
| TIMER-21 | Alert while the app is closed | Not supported: the goal alert only fires while the app is open | Manual (document only) |
| TIMER-22 | Return to the app after time away | Clock and title catch up immediately | Manual |

## 8. History

| ID | Scenario | Expected | Coverage |
|---|---|---|---|
| HIST-01 | No entries | "Nothing logged yet. Tap the + button to log your first minutes." | E2E `history.spec.ts` |
| HIST-02 | Entries | Grouped by day, newest first, last 60 days with entries; "Today" or the date, and the day's total points | E2E `history.spec.ts` |
| HIST-03 | Entry row | Practice colour, name, note, minutes | E2E `history.spec.ts` |
| HIST-04 | Delete an entry | Removed with an Undo toast; totals and backlog recalculate | E2E `history.spec.ts` |
| HIST-05 | Entry for a deleted practice | Not possible today, because deleting a practice deletes its logs. Shown as "Deleted practice" if it ever happens | E2E `history.spec.ts` |
| HIST-06 | Only 60 days shown | Older days are kept, just not listed | E2E `history.spec.ts` |
| HIST-07 | Edit an entry | Tap an entry: a sheet with its practice, day (no future dates), minutes (1 to 1440) and note filled in. Save changes updates History, Today and Insights at once; toast "Entry updated" with Undo | E2E `history.spec.ts` |
| HIST-08 | Delete from the edit sheet | "Delete entry" removes it, with Undo, as HIST-04 | E2E `history.spec.ts` |
| HIST-09 | Entry for an archived practice | Its own practice is offered too, so changing the minutes or note doesn't move it | E2E `history.spec.ts` |

## 9. Insights

Needs at least one entry. Before that: "Log a couple of days and this page starts coaching you…"

| ID | Scenario | Expected | Coverage |
|---|---|---|---|
| INS-01 | Empty state | Message above | E2E `insights.spec.ts`, Unit `insights.test.ts` |
| INS-02 | Header | "Since <first start date>" | E2E `insights.spec.ts` |

### What to do next (coach)

Up to 3 lines: one win first, then up to two fixes, filled with the next best lines. Falls back to "Steady. Nothing is slipping…".

| ID | Coach line | When | Coverage |
|---|---|---|---|
| INS-10 | New record close | Current streak is within 3 days of the best | Unit `coach.test.ts` |
| INS-11 | Longest run ever | Streak of 3+ that equals the best | Unit `coach.test.ts` |
| INS-12 | Practice slipping | Missed 3+ of the last 4–7 scheduled days | Unit `insights.test.ts` |
| INS-13 | Practice climbing | Last 14 days at least 15 points above the 14 before | Unit `coach.test.ts` |
| INS-14 | Days straight on a practice | 5+ day streak on one practice | Unit `coach.test.ts` |
| INS-15 | Weak weekday | One weekday 20+ points below the others (8 weeks of data) | Unit `coach.test.ts` |
| INS-16 | Backlog clearing | Backlog and a surplus pace: days until cleared | Unit `coach.test.ts` |
| INS-17 | Backlog not shrinking | Backlog and no surplus: extra points a day to clear it in a week | Unit `coach.test.ts` |
| INS-18 | Ahead of last week | 10%+ ahead at the same point in the week | Unit `coach.test.ts` |
| INS-19 | Behind last week | 15%+ behind | Unit `coach.test.ts` |
| INS-20 | Always something | At least one line | Unit `insights.test.ts` |

### Panels

| ID | Scenario | Expected | Coverage |
|---|---|---|---|
| INS-30 | This week | Points, % of target, clear days, each against the same point last week (↑ ↓ or "same as last week"; "no data last week") | Unit `insights.test.ts`, E2E `insights.spec.ts` |
| INS-31 | Consistency | 16-week calendar, Monday rows on top: cleared, partial shades, missed, rest day outline, today outlined; tooltip per day | E2E `insights.spec.ts` (renders; colours are a Gap) |
| INS-32 | Practice health | Per active practice: 14-day strip (met, partial, missed, rest, today), streak, % of target with trend, total hours | E2E `insights.spec.ts`, Unit `insights.test.ts` |
| INS-33 | Next milestones | Next streak milestone (3, 7, 14, 21, 30, 50, 75, 100, 108, 150, 200, 365) and next hours milestone (5 to 1000), with progress bars | Unit `insights.test.ts` |
| INS-34 | Records | Hours practised, longest streak, best day, days ended clear | Unit `insights.test.ts`, E2E `insights.spec.ts` |
| INS-35 | Your rhythm | % of target by weekday over 8 weeks; strongest and weakest named once 4+ weekdays have data | E2E `insights.spec.ts`, Unit `insights.test.ts` |
| INS-36 | When you log | Share of minutes by morning, afternoon, evening and night over 30 days | E2E `insights.spec.ts` |
| INS-37 | Daily points | Stacked bars by practice with the day's target tick; 7, 30 or 90 days | E2E `insights.spec.ts` |
| INS-38 | Backlog chart | Points still owed at the end of each day over the same range | E2E `insights.spec.ts` |
| INS-39 | Range remembered | The chosen range stays while switching tabs (resets on reload) | E2E `insights.spec.ts` |

## 10. Practices (Setup)

| ID | Scenario | Expected | Coverage |
|---|---|---|---|
| PRAC-01 | List | Every practice in order, with minutes, days, start date and an Archived badge | E2E `setup.spec.ts` |
| PRAC-02 | Header | "N points due on a day like today" | E2E `setup.spec.ts` |
| PRAC-03 | Add | Name (required, up to 40 characters), minutes, days, start, colour; toast "Added Name" | E2E `setup.spec.ts` |
| PRAC-04 | Empty name | The form won't submit | E2E `setup.spec.ts` |
| PRAC-05 | Minutes | Stepper ±5, presets 10 to 60, must be 1 to 1440 | E2E `setup.spec.ts` |
| PRAC-06 | No days picked | "Pick at least one day" | E2E `setup.spec.ts` |
| PRAC-07 | Start counting (new) | Today, Yesterday or Last week; earlier days never add backlog | E2E `setup.spec.ts` |
| PRAC-08 | Colour | 8 swatches; a new practice gets the next colour in turn | E2E `setup.spec.ts` |
| PRAC-09 | Edit name or colour | Saved; target history unchanged | Unit `categories.test.ts` |
| PRAC-10 | Edit minutes or days | Applies from today; past days keep the old target | E2E `setup.spec.ts`, Unit `categories.test.ts` |
| PRAC-11 | Edit twice in one day | Replaces today's change instead of stacking another | Unit `categories.test.ts` |
| PRAC-12 | Change start date | Date picker, no future dates; targets before the new start are dropped | E2E `setup.spec.ts`, Unit `categories.test.ts` |
| PRAC-13 | Archive | Hidden from Today, backlog cleared, history kept; toast says so | E2E `setup.spec.ts` |
| PRAC-14 | Restore | Back on Today; starts accruing again from the restore day | E2E `setup.spec.ts` (accrual is a Gap) |
| PRAC-15 | Delete | Confirm, then the practice and all its logs are removed | E2E `setup.spec.ts` |
| PRAC-16 | Delete declined | Nothing changes | E2E `setup.spec.ts` |
| PRAC-17 | Day picker order | Monday first | E2E `setup.spec.ts` |
| PRAC-18 | Edit sheet hint | "New minutes or days apply from today. Past days keep their old target." | E2E `setup.spec.ts` |
| PRAC-19 | Close without saving | Tap outside or Escape; nothing changes | E2E `setup.spec.ts` |
| PRAC-20 | Order | New practices go last, even after deletions left gaps | E2E `setup.spec.ts`, Unit `categories.test.ts` |
| PRAC-21 | Archived practice in Insights | Kept in history charts, left out of practice health | E2E `setup.spec.ts` |
| PRAC-22 | Reorder | Move up and Move down beside each practice in Setup; the new order shows on Today, the log sheet and Setup, and is saved | E2E `setup.spec.ts`, Unit `categories.test.ts` |
| PRAC-23 | Reorder at the ends | The first practice can't move up and the last can't move down | E2E `setup.spec.ts`, Unit `categories.test.ts` |

## 11. Settings and data (Setup)

| ID | Scenario | Expected | Coverage |
|---|---|---|---|
| SET-01 | Backlog limit | None, 1, 2 or 3 days (default 2); toast confirms; totals recalculate immediately | E2E `setup.spec.ts` |
| SET-02 | Theme | System, Light or Dark; applies immediately and persists on this device | E2E `setup.spec.ts` |
| SET-03 | System theme | Follows the phone's light or dark setting | E2E `app.spec.ts` |
| SET-04 | Load sample data | Confirm, then replaces everything with 10 weeks of realistic history | E2E `setup.spec.ts`, `insights.spec.ts` |
| SET-05 | Export | Downloads `tiktym-backup-<date>.json` with practices, logs and settings | E2E `setup.spec.ts` |
| SET-06 | Import a backup | Confirm with counts, then replaces everything | E2E `setup.spec.ts` |
| SET-07 | Import a non-backup file | "That file isn't a TikTym backup" | E2E `setup.spec.ts` |
| SET-08 | Import the same file twice | Works both times | E2E `setup.spec.ts` |
| SET-09 | Start over | Confirm, then deletes all logs and resets the default practices | E2E `setup.spec.ts` |
| SET-10 | Any confirm declined | Nothing changes | E2E `setup.spec.ts` |
| SET-11 | Account panel | Name and email; "Test mode" or "Synced with Firebase" badge | E2E `setup.spec.ts` |
| SET-12 | Sign out | Confirm first | E2E `auth.spec.ts` |
| SET-13 | Delete account (Firebase only) | Type DELETE to confirm; removes all data, then the account | E2E `firebase/account.spec.ts` |
| SET-14 | Delete account, not confirmed | "Account not deleted" | E2E `firebase/account.spec.ts` |
| SET-15 | Delete account needing a recent sign-in | Asks to sign in again and signs out | Manual |
| SET-16 | Test-mode note | Explains data stays in this browser | E2E `setup.spec.ts` |
| SET-17 | Settings sync | Backlog limit is saved with the account; theme is per device | E2E `firebase/account.spec.ts` |
| SET-18 | Save fails | "Could not save. Check your connection." | E2E `firebase/save-fails.spec.ts` |
| SET-19 | Destructive actions kept apart | Account shows only name, email and Sign out. Start over and Delete account (Firebase mode only) sit in a red "Danger zone", the last section of Setup, below About | E2E `setup.spec.ts`, `firebase/account.spec.ts` |

## 12. Sync and storage

| ID | Scenario | Expected | Coverage |
|---|---|---|---|
| SYNC-01 | Test mode storage | One localStorage entry per user on this device | E2E `auth.spec.ts` (persists across sign-in) |
| SYNC-02 | Test mode storage full or blocked | "Could not save on this device", shown after the action's own toast so it isn't hidden | E2E `app.spec.ts` |
| SYNC-03 | Firestore layout | Practices one doc each; logs bucketed one doc per month; settings one doc | Unit `firestore-store.test.ts`, Emulator `tests-emulator/store.test.ts` |
| SYNC-04 | Reads per app open | About (practices + months + 1), not one per log | Unit `firestore-store.test.ts` |
| SYNC-05 | Old data (schema 1) | Migrated to monthly buckets on first load, all logs kept, old docs removed | Unit `firestore-store.test.ts`, Emulator `tests-emulator/store.test.ts` |
| SYNC-06 | Add and delete a log | Touches only that entry in its month doc | Unit `firestore-store.test.ts`, Emulator `tests-emulator/store.test.ts` |
| SYNC-07 | Delete a practice | Removes its logs from every month, then the practice | Unit `firestore-store.test.ts`, Emulator `tests-emulator/store.test.ts` |
| SYNC-08 | Replace all (sample, import, start over) | Wipes and rewrites, in batches of 400 | Unit `firestore-store.test.ts`, Emulator `tests-emulator/store.test.ts` |
| SYNC-09 | Delete account | All data first, then the auth user | Unit `firestore-store.test.ts`, Emulator `tests-emulator/store.test.ts` |
| SYNC-10 | Security rules | Each user can read and write only `users/{their uid}` | Emulator `tests-emulator/rules.test.ts` |
| SYNC-11 | Offline logging | Firestore's offline cache: logging works without signal and syncs later | E2E `firebase/account.spec.ts` |
| SYNC-12 | Two devices | Changes on one show on the other after reopening | E2E `firebase/account.spec.ts` |
| SYNC-13 | Optimistic updates | The screen updates immediately; a failed save shows a toast | E2E `firebase/save-fails.spec.ts` |
| SYNC-14 | Firebase SDK only in Firebase mode | Test mode never downloads it | Manual (check the network tab) |
| SYNC-15 | Edit a log | Same month: only that entry changes. Another month: removed from the old month and added to the new one in one batch | Unit `firestore-store.test.ts`, Emulator `tests-emulator/store.test.ts` |
| SYNC-16 | Closing right after a change | A log, edit, delete, practice change or settings change made just before the app closes or reloads is kept: it's shown when the app opens again and sent to Firebase then. Changes Firebase refuses aren't retried | Unit `outbox.test.ts`, E2E `firebase/quick-close.spec.ts` |
| SYNC-17 | Backups | Firestore backs up the whole database every day (kept 7 days) and every Sunday (kept 8 weeks), so a bad bug or deletion can be undone by restoring into a new database | Manual (`firebase firestore:backups:schedules:list`; a restore drill) |

## 13. App shell, PWA and platform

| ID | Scenario | Expected | Coverage |
|---|---|---|---|
| APP-01 | Tab bar | Today, Insights, + (log), History, Setup; current tab highlighted; switching scrolls to top | E2E `app.spec.ts` |
| APP-02 | Installable | Manifest with name, icons (including maskable) and standalone display | E2E `pwa.spec.ts` |
| APP-03 | Install on iPhone | Share › Add to Home Screen; opens full screen as "TikTym" | Manual |
| APP-04 | Install on Android | Install app prompt | Manual |
| APP-05 | Opens offline | App shell is precached; signed-in app opens with no connection | E2E `pwa.spec.ts` |
| APP-06 | Deep links offline | Any path falls back to the app | E2E `pwa.spec.ts` |
| APP-07 | Updates | A new deploy activates on the next app load | Manual: checked on iPhone, 8 October 2026 (the update bar, APP-22, is tested) |
| APP-08 | Firestore and Auth traffic | Never cached by the service worker | E2E `firebase/sw-network.spec.ts` |
| APP-09 | Midnight | Date, greeting, totals and moment roll over within a minute | E2E `today-states.spec.ts` |
| APP-10 | Returning to the app | Screen refreshes immediately | E2E `app.spec.ts` |
| APP-11 | Time zone | Days follow the phone's local time zone | E2E `timezone.spec.ts` |
| APP-12 | Escape key | Closes the focus view first, otherwise the open sheet | E2E `today.spec.ts`, `timer.spec.ts` |
| APP-13 | Toasts | One at a time; Undo where the action can be undone | E2E (many specs) |
| APP-14 | Dark mode colours | Every screen readable in dark: text contrast at least 4.5:1 (3:1 for large text) on login, Today, Insights, History, Setup and the sheets | E2E `colours.spec.ts` |
| APP-15 | Reduced motion | Animations off when the phone asks for reduced motion | E2E `app.spec.ts` |
| APP-16 | Screen readers | Buttons have labels (for example "Log 30 minutes of Reading"); dialogs are marked as dialogs | E2E `app.spec.ts` |
| APP-17 | Haptics | Light vibration on log, pick and steps (Android) | Manual |
| APP-18 | Safe areas | Content clears the notch and home indicator | Manual |
| APP-19 | Console | No errors or warnings during normal use | E2E (every test-mode test fails on a console error or warning) |
| APP-20 | Firebase's reserved addresses (`/__/…`, e.g. the Google sign-in relay page) | Always loaded from the network, never answered by the service worker with the app | E2E `pwa.spec.ts` |
| APP-21 | Version shown | Login page and Setup › About show the version, commit and build date, e.g. "TikTym 1.0.0 · 63836b6 · 8 Oct 2026" | E2E `app.spec.ts` |
| APP-22 | Newer version live | A bar at the top of every screen, including login: "New version ready (1.0.1)" with Reload; Reload loads the new version. No bar when up to date, offline, or in the dev server | E2E `app.spec.ts` (the offline case isn't tested) |
| APP-23 | Version file | Each build publishes `version.json` (version, commit, build date); the service worker never caches it | Unit `version.test.ts`, E2E `pwa.spec.ts` |
| APP-24 | App Check | With `VITE_RECAPTCHA_SITE_KEY` set, the app attaches a reCAPTCHA Enterprise (Google Cloud Fraud Defense) App Check token to Firebase requests; without it, and in test mode or with the emulators, App Check is off | Unit `app-check.test.ts` (the on/off switch; live tokens are checked in the Firebase console, see to-do.md) |
| APP-25 | Light mode colours | The same contrast check as APP-14, in light: login, Today, Insights, History, Setup, the sheets and the focus timer | E2E `colours.spec.ts` |
| APP-26 | Fonts don't block the first paint | The page draws straight away in the system font and switches to TikTym's fonts when they arrive | E2E `loading.spec.ts` |
| APP-27 | Install on Android | On Android Chrome, Samsung Internet or Edge, the install card's Install button opens the browser's own install dialog; once installed, the card goes away | E2E `install.spec.ts`, Unit `install.test.ts` |
| APP-28 | Add to home screen on iPhone | In Safari, the install card shows two steps with the real icons: tap Share (at the bottom of Safari, or inside ⋯ on newer iPhones), then Add to Home Screen; and, if there's no Share button, open the page in Safari first. In Chrome (or Firefox or Edge) on iPhone: tap Share in the address bar, then Add to Home Screen | E2E `install.spec.ts`, Unit `install.test.ts` |
| APP-29 | Opened inside another app | In WhatsApp's, Instagram's, Facebook's or LinkedIn's built-in browser (where installing is impossible), the card says to open TikTym in the phone's browser first and how (⋯ › Open in browser) | E2E `install.spec.ts`, Unit `install.test.ts` |
| APP-30 | When the install card shows | On Today, only after the first minutes are logged, never once TikTym is installed. Not now hides it for 3 days; a second Not now hides it for good on Today | E2E `install.spec.ts`, Unit `install.test.ts` |
| APP-31 | Install from Setup | Setup › "Add TikTym to your home screen" opens the same guide at any time; the row is hidden once TikTym is installed | E2E `install.spec.ts` |
| LEGAL-01 | Terms page | `/terms/` shows the Terms of Service under Indian law: operator Pramal IT Services Private Limited (CIN), eligibility, accounts, acceptable use, your data, no medical advice, availability, liability, termination, governing law and courts in Andhra Pradesh, grievance contact | E2E `legal.spec.ts` |
| LEGAL-02 | Privacy page | `/privacy/` shows, for India's DPDP Act 2023: what's collected (account, practice data, device storage, reCAPTCHA signals), why, where it's stored (Mumbai), processors (Google), retention, rights (access, correction, export, erasure, grievance, Data Protection Board), 18+, changes, contact | E2E `legal.spec.ts` |
| LEGAL-03 | reCAPTCHA notice | With App Check on, the login screen says "Protected by reCAPTCHA" with links to Google's Privacy Policy and Terms, as Google requires when the badge is hidden | Unit `app-check.test.ts` (when it shows); E2E `legal.spec.ts` (hidden while App Check is off). Shown live with App Check on: checked after each release |
| LEGAL-04 | Legal pages offline | `/terms/` and `/privacy/` open without a connection once the app has been installed | E2E `pwa.spec.ts` |


## 14. Marketing and sharing

| ID | Scenario | Expected | Coverage |
|---|---|---|---|
| GTM-01 | Link preview | Sharing the app's link (WhatsApp, LinkedIn, X, Slack) shows the TikTym title, a one-line description and a 1200×630 preview image | E2E `app.spec.ts` (how each service renders it: checked live after release) |
| GTM-02 | Send feedback | Setup › About › Send feedback opens an email to support with the app version and build filled in | Unit `feedback.test.ts`, E2E `setup.spec.ts` |
| GTM-10 | Follow on LinkedIn | Setup › About has "Follow TikTym on LinkedIn" and the website footer has a LinkedIn link; both open https://www.linkedin.com/company/tiktym/ in a new tab | E2E `setup.spec.ts`, `site/site.spec.ts` |
| GTM-11 | What's new page | tiktym.com/updates lists each release people would notice, newest first: version, date, a short title, what changed in plain words, and a picture for headline features; "Coming in the next update" sits at the top while there is any | E2E `site/site.spec.ts`, Unit `changelog.test.ts` |
| GTM-12 | Built from the changelog | The page is generated from CHANGELOG.md (`npm run site:updates`), and again before every website deploy, so the two never disagree; the website footer links to it | Unit `changelog.test.ts`, E2E `site/site.spec.ts` |
| GTM-13 | What's new in the app | Setup › About has "What's new", opening tiktym.com/updates/ in a new tab | E2E `setup.spec.ts` |
| GTM-14 | How TikTym is different | The website's first FAQ question, "How is TikTym different from other habit apps?": every minute counts, busy days carry forward but never pile up, one balanced daily target, made for demanding jobs; free, no ads, offline, data in India | E2E `site/site.spec.ts` |
| GTM-15 | Search engines can crawl | tiktym.com/robots.txt allows everything and names the sitemap; tiktym.com/sitemap.xml lists the home page and What's new (dated by the newest release); app.tiktym.com/robots.txt is a real robots file, not the app's page | Unit `changelog.test.ts`, E2E `site/site.spec.ts`, `app.spec.ts` |
| GTM-16 | Structured data | The home page describes, in schema.org JSON-LD, the organisation (with its LinkedIn page), the website, TikTym as a free web app, and the FAQ, word for word as shown on the page | E2E `site/site.spec.ts` |
| GTM-17 | Summary for AI tools | tiktym.com/llms.txt: a short plain-text summary of what TikTym is, who it's for, how it differs, and its links | E2E `site/site.spec.ts` |
| GTM-18 | Search descriptions | Every page on tiktym.com and the app has a description of 25 to 160 characters (what search results show); the home page's matches its structured data | E2E `site/site.spec.ts`, `legal.spec.ts` |
| GTM-19 | Install help on the website | Step-by-step guides for iPhone Safari, iPhone Chrome, Android Chrome and Samsung Internet; the visitor's own phone and browser first, marked "Your phone"; inside WhatsApp, Instagram, Facebook or LinkedIn, a warning to open the page in the browser before installing | E2E `site/site.spec.ts` |
| GTM-20 | Install videos | A short screen recording next to the iPhone Safari and Android Chrome guides, recorded from the live app on the iOS simulator and Android emulator (`npm run site:install-videos`; Chrome on iPhone can't run in the simulator, so it has steps only), loading only when scrolled to, playing muted and looping like the feature clips | E2E `site/site.spec.ts` |
| SHARE-01 | Progress card stats | This calendar month's minutes (as hours), current and best streak, days with entries this month, and the top three practices by time this month | Unit `share.test.ts` |
| SHARE-02 | Progress card image | Insights › Share opens a preview of a 1080×1350 image: TikTym brand, the month's time, streak, active days, top practices with their colours, tiktym.com | E2E `share.spec.ts` |
| SHARE-03 | Sharing the card | Share opens the phone's share sheet with the image (LinkedIn, Instagram, WhatsApp); where sharing images isn't supported, Download saves it as a PNG | E2E `share.spec.ts` (real share sheet checked on iPhone, 8 October 2026) |
| SHARE-04 | Hiding practice names | Names are shown by default; a switch replaces them with "Practice 1", "Practice 2" and so on | E2E `share.spec.ts` |
| GTM-05 | Feature clips | `npm run site:clips` records short looping MP4 clips of the real app (sample data, fixed date) for the website: Today, quick log, focus timer, backlog, Insights; each with a poster image | Unit `site-clips.test.ts` (files and sizes; content checked by eye at recording) |
| GTM-04 | Website | `tiktym.com` (`site/`): Home with the pitch and "Open TikTym", How it works, Features with clips, For working professionals, Install (iPhone, Android), Privacy promise, FAQ, links to Terms and Privacy; fast and readable on a phone, no console errors | E2E `site/site.spec.ts` (phone and desktop) |
| GTM-06 | App address | The app lives at `app.tiktym.com`: sign-in (email and Google, including the installed iPhone app) goes through it, and the link preview, website buttons, Terms and Privacy links point to it | E2E `app.spec.ts`, `site/site.spec.ts`; sign-in at the new address: Manual |
| GTM-08 | Old address in a browser | Opening `tiktym.web.app` or `tiktym.firebaseapp.com` in a browser tab goes straight to the same page on `app.tiktym.com` (path, query and #fragment kept); Terms, Privacy and the sign-in handler stay where they are | Unit `moved.test.ts`, E2E `moved.spec.ts` |
| GTM-09 | App installed from the old address | Keeps working as before, with a bar above every screen: "TikTym has moved. Open app.tiktym.com and add it to your home screen" and an Open button that opens the new address in the browser. Data stays in the account, so nothing is lost | Unit `moved.test.ts`, E2E `moved.spec.ts` |


## 15. Analytics

| ID | Scenario | Expected | Coverage |
|---|---|---|---|
| ANA-01 | On by default | No checkbox at sign-up: the sign-in screen says an account includes usage statistics. Signed in, Analytics is on for every account, new or from before 10 October 2026, unless this device turned it off from 1.8.0 on. Choices stored before 1.8.0 (mostly the old unticked sign-up box) no longer count. The sign-in screen itself is never measured | E2E `analytics/analytics.spec.ts`, `firebase/account.spec.ts` |
| ANA-02 | What's measured in the app | Once on: a page view per tab, and events for logging minutes (how), finishing a timer, adding a practice and signing in (method). No names, emails or practice names; advertising features off | E2E `analytics/analytics.spec.ts` (what reaches Google: checked in GA Realtime) |
| ANA-03 | Change your mind | Setup › Notifications and privacy › "Usage statistics" switches it off (or back on) at any time; off stops sending, removes Analytics cookies, and is remembered on the device | E2E `analytics/analytics.spec.ts` |
| ANA-04 | Website analytics | On by default: Google Analytics loads straight away unless this visitor opted out, with a notice offering OK and Opt out. Opt out stops it at once, removes the cookies and is remembered; OK hides the notice for good. Ads off, clicks on "Open TikTym" counted, the app's domain linked (same GA4 property as the app). Tests block Google's servers, so they never report to the real property | E2E `site/site.spec.ts` |
| ANA-05 | Off without a measurement ID | Builds without `VITE_GA_MEASUREMENT_ID` (test mode, the emulators) never load Analytics and show no Usage statistics switch | E2E `app.spec.ts` |
| LEGAL-05 | Privacy wording matches | The Privacy Policy describes Google Analytics as on unless turned off: what's collected, why, how to turn it off in the app (Setup › Notifications and privacy) and on the website (Opt out) | E2E `legal.spec.ts` |
| STAT-01 | Anonymous daily totals | For every Firebase-mode user, with no consent needed because nothing identifies anyone: `stats/{date}` counts active devices, sign-ups, entries (total and by method), minutes, timers started and reaching their target, practices added and progress cards shared. No user ID, device ID, names, notes or cookies are sent | Unit `stats.test.ts`, E2E `firebase/account.spec.ts` (emulator) |
| STAT-02 | Batched writes | Counts collect in the app and are saved together (after about 15 seconds, and when the app is hidden or closed), so a typical user adds 2–3 writes a day; active devices count once per device per day using only a local date | Unit `stats.test.ts` |
| STAT-03 | Totals are tamper-resistant and private | Firestore rules let signed-in users only add 0–100 to known counters (minutes 0–5,000) on a correctly named day document; no new fields, no decreases, no reads from any app | Emulator `tests-emulator/rules.test.ts` |
| STAT-04 | Totals in Google Sheets | An Apps Script reads `stats/{date}` with the owner's Google login (app rules unchanged) into a Daily totals tab: one row per day with gaps as zeros, hours, entries per device and timer completion %, and a Notes column that survives refreshes; plus Weekly totals with week-on-week change, starter charts, a TikTym › Refresh menu and a daily refresh | Unit `sheets.test.ts` (data logic); fetching in Google: checked 8 October 2026; daily trigger set up 8 October 2026 |
| LEGAL-06 | Totals disclosed | The Privacy Policy explains the anonymous daily totals and why they aren't personal data | E2E `legal.spec.ts` |
| LEGAL-07 | On by default, disclosed | Before an account is created, the sign-in screen says it includes emails about your practice and usage statistics, each switchable off in Setup or from any email. The Privacy Policy lists the emails, phone reminders, Resend (USA) as the email processor, backups kept up to 8 weeks, and how to turn each off; the Terms say the same in Your account | E2E `legal.spec.ts` |

## 16. Notifications

See NOTIFICATIONS.md for the plan. Emails and usage statistics are on by default; each can be turned off.

| ID | Scenario | Expected | Coverage |
|---|---|---|---|
| NOTIF-01 | Notifications and privacy settings | Setup has "Notifications and privacy": Tips and reminders, Weekly recap, News about TikTym (emails) and Usage statistics, all on to start; one tap turns each off. Email choices are saved in the account, so the server respects them on any device | E2E `notifications.spec.ts`, Unit `notifications.test.ts` |
| NOTIF-03 | Welcome email | Once, when a new account taps Start on first run, if "Tips and reminders" is on: from "Praveen from TikTym" <hello@tiktym.com>, replies to the support address; greets by first name, lists the chosen practices and minutes, explains carry-forward and adding TikTym to the home screen, with an Open TikTym button | Unit `mail.test.ts`, Emulator `tests-emulator/rules.test.ts` (sending: Manual, checked live 10 Oct) |
| NOTIF-04 | First-minute nudge | Once, about 24 hours after first-run Start, only if nothing has been logged and tips are on: suggests 5 minutes of the shortest practice, with an Open TikTym button | Unit `mail.test.ts` (sending: Manual) |
| NOTIF-05 | One-tap unsubscribe | Every email has a signed unsubscribe link and the List-Unsubscribe headers. Opening the link shows an Unsubscribe button (so email scanners that open links can't unsubscribe anyone); the button, or Gmail's own one-click button (RFC 8058), turns that email type off in the account without signing in. A tampered link does nothing. The service worker never answers /unsubscribe | Unit `mail.test.ts`, E2E `pwa.spec.ts` (live page: Manual) |
| NOTIF-06 | Weekly recap email | Mondays at 8 am India time, if "Weekly recap" is on and something was logged in the last two weeks: last week (Monday to Sunday) in minutes against the targets, days shown up, best day, each practice with a bar, the show-up streak, how it compares with the week before (never as a telling-off), and one gentle suggestion. A practice that started mid-week counts from its start. A week with nothing logged gets a short "no catching up needed, 5 minutes today" note instead. Once per account per week | Unit `recap.test.ts` (sending: Manual) |

---

## Not built yet

Planned or deliberately out of scope. Move a row into the tables above when it ships.

| Feature | Notes |
|---|---|
| Emails: first-week tips, comeback, weekly recap, monthly progress, news | Cloud Functions + Resend; schedule in NOTIFICATIONS.md |
| Push reminders and streak-at-risk alerts | Cloud Functions + Firebase Cloud Messaging |
| Timer alert while the app is closed | Needs push notifications |
| Branded password-reset email | Firebase's default is used; could be sent through Resend later |
| Hours towards mastery; 100 Days challenge view | Ideas in to-do.md |

## What's left to test

**Gaps** (testable, no test yet): none.

**Manual** (check by hand before a release, on a real phone and the real Firebase project):

- AUTH-19 Google sign-in, AUTH-21 legal links, AUTH-22 Firebase failing to load, SET-15 re-sign-in before deleting an account
- FIRST-03 loading screen, FIRST-04 data failing to load
- TIMER-07 screen stays awake, TIMER-21 no alert while closed, TIMER-22 catching up after time away
- SYNC-14 the Firebase SDK is not downloaded in test mode
- APP-03 and APP-04 installing on iPhone and Android, APP-07 updates after a deploy, APP-17 haptics, APP-18 safe areas
