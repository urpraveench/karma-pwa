# TikTym to-do

Everything still pending, in the order it should happen. Tick items off as they're done, and add new ones here rather than anywhere else.

**Owner:** **You** means it needs your accounts, devices or a decision. **Claude** means it can be done in a coding session once anything it depends on is in place.

**Last updated:** 13 October 2026

## In progress

Nothing right now.

## Setup layout

- [ ] **Claude (optional, not started):** replace the browser's plain confirm and "Type DELETE" boxes with an in-app confirmation sheet.

## 2. Check by hand before release

- [ ] Tonight (14 Oct): the 7 pm reminder's second line reads in your tier's voice, not "Even 5 minutes counts." unless you're at Level 5 or 6 (COACH-07)
- [ ] Mon 19 Oct: a level card appears on Today only if your level moved (LVL-11)
These can't be automated, or need the real project and a real phone. IDs refer to [FEATURES.md](FEATURES.md).

- [ ] From 11 October: run `firebase firestore:backups:list --project tiktym` and check a daily backup appears each day (SYNC-17)
- [ ] Once, before real promotion: a restore drill. Restore the latest backup into a new database (README › Backups and restoring), check it in the console, then delete it (SYNC-17)
- [ ] A day after signing up with the spare test account (without logging anything), check the first-minute nudge arrives (NOTIF-04)
- [ ] After the comeback email is deployed: the next morning, `firebase functions:log --only comebackDaily` shows how many were queued; for a test account left 3 full days without an entry, check the comeback arrives at about 9 am, only once (NOTIF-07)
- [ ] The first Monday after the weekly recap is deployed: check it arrives at about 8 am for an account that logged last week, that the numbers match History for that week, and that the function's log says how many went (NOTIF-06)
- [ ] On Android Chrome: allow reminders, set a time 15 minutes ahead, and check the reminder arrives once, names what's left, shows the white ring in the status bar, and opens TikTym; `firebase functions:log --only reminderSend` shows it (NOTIF-09). iPhone checked 10 October
- [ ] After the "one tap away" email is deployed: sign in with a spare Google account, stop at the practice picker, and check the email arrives about a day later, once; then tap Start and check the welcome still arrives (NOTIF-15, NOTIF-03)
- [ ] After the evening log check is deployed: on a day with nothing logged, check "Did you log what you did today?" arrives at about 8 pm, once, and not on a day you logged; `firebase functions:log --only reminderSend` shows "evening check sent" or why it skipped (NOTIF-18)
- [ ] After practice reminders are deployed: give a practice a reminder 15 minutes ahead, and check "Time for <practice>" arrives once at that time; then log that practice in full and check the next day's doesn't come once it's done (NOTIF-19)
- [ ] On iPhone: log a practice in full and check the icon's number drops by one; clear the day and check the number disappears (NOTIF-13). The count itself was checked 10 October
- [ ] After the admin totals are deployed: the next morning, `adminStats/<yesterday>` in the Firestore console has accounts, sign-ups and active loggers that look right against Authentication, and `emails` counts any emails sent; `firebase functions:log --only adminStatsNightly` says "admin totals saved" (ADMIN-04)
- [ ] After the admin console is deployed: Email › Send a test to me arrives in the TikTym template with a working unsubscribe link; then send a real broadcast to "Active in the last 7 days" and check `adminLog/<id>` counts it as sent, a second account with News off is counted under `skippedWhy.off`, and nobody gets it twice (ADMIN-07 to ADMIN-09)
- [ ] After the admin console is deployed: Push › Send a test to my devices arrives on your phone and opens TikTym at the chosen path; a broadcast sent after 10 pm India time arrives at about 10 am, once, and `adminLog/<id>` shows it as held, then sent (ADMIN-10, ADMIN-11)
- [ ] After the admin console is deployed: Costs shows this month's spend once the FOCUS export has data (if it says a column isn't found, the FOCUS table's names differ from the spec's: fix `billingQuery` in `functions/src/costs.ts`) and a number for every limit; a limit saying "Couldn't read" means a missing permission (grant the functions' service account Monitoring Viewer, BigQuery Data Viewer and BigQuery Job User) or a metric name that differs on the real project (fix it in `functions/src/costs.ts`). Check Firestore reads roughly match the Firebase console's Usage tab (ADMIN-13)
- [ ] After the admin console is deployed: Health lists the functions that ran in the last 24 hours with sensible run counts (reminders every 15 minutes, the nightly totals once), and its Logs links open each function's logs (ADMIN-14)
- [ ] After the push-topic fix is deployed: on an iPhone with TikTym on the home screen, the 8 pm evening check arrives on a day with nothing logged, and a practice reminder arrives at its time; Health shows reminderSend with no errors the next day (NOTIF-21)
- [ ] **You:** remove the last line of the LinkedIn page description ("TikTym is built by Pramal IT Services Private Limited.") in LinkedIn › Edit page
- [ ] Install on Android (APP-04); the app opens full screen as "TikTym"
- [ ] Haptics on Android when logging (APP-17)
- [ ] **You:** after the fix, run the 5-minute Meditation test again: the chime should play right as the timer reaches its target (TIMER-05).
- [ ] **You:** on a real iPhone and Android phone, tap the centre microphone and say "walked 20, read 15"; check the sound bars move, "Understanding…" appears, both entries reach the review screen without being saved, and blocking microphone access leaves typing usable (LOG-26, LOG-29). The full flow was checked in Chrome on a Mac on 11 October.
- [ ] A Firestore failure on load returns to sign-in with a clear message (FIRST-04)
- [ ] A Firebase SDK failure to load shows its message (AUTH-22)
- [ ] Test mode never downloads the Firebase SDK: check the network tab (SYNC-14)
- [ ] Deleting an account after a long session asks you to sign in again first (SET-15)
- [ ] Confirm, and tell users, that the goal alert can't fire while the app is closed (TIMER-21)

## 3. Google sign-in

Google sign-in works on https://tiktym.web.app: in Safari, on a laptop, and in the installed iPhone app.

- [ ] **You:** if Google's email field ever again shows no cursor or keyboard in the installed iPhone app, note the iOS version and tell Claude. Seen once on iPhone 14 Plus on 8 October 2026; not reproduced since, nor in the simulator.

## 4. Public launch

**Terms and Privacy** (India-only launch)

- [ ] **You:** read https://tiktym.web.app/terms/ and https://tiktym.web.app/privacy/ and get them checked by a lawyer if you can. Points to confirm: the 18+ age limit, the ₹1,000 liability cap, the 30-day shutdown notice, and naming a person as Grievance Officer (currently the email only).

**App Check** (only the real TikTym app can use your Firebase data; reCAPTCHA Enterprise, free on the Spark plan)

- [ ] **You:** **don't turn on Enforce while on the Spark plan.** When the 10,000 monthly reCAPTCHA checks run out, Google refuses new ones, and with Enforce on that would lock users out. Turn on Enforce for Cloud Firestore and Authentication after moving to Blaze, once Firebase › App Check › APIs shows mostly **Verified** requests.

**Trademark**

- [ ] **You (optional):** file TikTym as a trademark in India, classes 9 and 42 (about ₹4,500 per class).

Preliminary findings (web search, 8 October 2026; not legal advice):

- **TikTim** (tiktim.com), by Chawk Technology: a live daily-planner and productivity app with tasks, reminders and goals. Nearly the same name, spoken identically, in the same category as TikTym. This is the closest conflict.
- **TikTok** (ByteDance) actively opposes "Tik…" names, for example *TickTickTrader* (2023) and domain cases like *tikitoks.com*. It lost against *TIKI* in Singapore (2024), where the visual differences were judged enough. "TikTym" shares "Tik" and the "-T…" rhythm, so expect scrutiny if you file.
- Similar productivity apps: *TikTik, Simple Timer* (time tracking) and *TikTikTik* (metronome).
- `tiktym.com` is registered (GoDaddy, since December 2023, owner not checked). `tiktym.app` and `tiktym.in` lookups were inconclusive.
- Where to search formally: India's trademark search (ipindiaonline.gov.in/tmrpublicsearch), the USPTO (tmsearch.uspto.gov) and WIPO's Global Brand Database (branddb.wipo.int), in class 9 (software) and 42 (online services).

**Other launch items**


## Go-to-market (see GTM.md)


**Phase 0: Foundations**


**Phase 1: Website**

Move the app to `app.tiktym.com` (GTM-06, GTM-08, GTM-09). The same Hosting site serves both addresses, so the old one keeps working; nothing is deployed until the new address is live.


**Phase 3: Instagram** (plan in OUTREACH.md › Instagram, started 12 October 2026)

- [ ] **You:** finish the profile: Business account (category App page), bio, link and contact from OUTREACH.md › Profile text; profile picture and highlight covers from Downloads › TikTym Instagram › Profile
- [ ] **You:** post the 9 in the order in Downloads › TikTym Instagram › CAPTIONS.txt (captions, covers, alt text included), pin 3, then announce from your personal Instagram and Invite friends

**Phase 2: App stores**

Google Play (started 12 October 2026; changed 13 October from a Trusted Web Activity to a Capacitor app with the ledger, see GTM.md › Strategy). Native changes need a Play release; the screens are the same React app as the website.

- [ ] **You (this week):** recruit 15 Android testers for the closed test and the 100 Days challenge (your current users lean iPhone, so ask Android users directly); note them in OUTREACH.md
- [ ] **Claude (by Fri 16 Oct):** Android shell: Capacitor around the existing app (`com.tiktym.app`), native Google sign-in passed to Firebase, push through FCM with a second sending path on the server, offline from the bundled files; upload key kept outside the repo
- [ ] **Claude (Fri 16 Oct):** speed check on a low-end Android emulator: opens in about 2 seconds or less, scrolling smooth; if not, report before going further
- [ ] **Claude (by Sun 1 Nov):** the ledger: Usage access reader (per-app minutes stay on the phone; only daily totals for social, video and games sync), app groups the person can change, "Invested · Scrolled" on Today and Insights against 100 a day, 700 a week and about 3,000 a month, a home-screen widget, and an optional ongoing notification
- [ ] **Claude (before submitting):** check Play's current policy on Usage access and write the Data safety answers to match
- [ ] **You (each build):** install it on your Android phone with Claude's checklist and report what you see
- [ ] **You:** send Claude the app signing key's SHA-256 fingerprint (Play Console › Test and release › App integrity › App signing).
- [ ] **Claude:** store listing: short and full description, 512 px icon, 1024×500 feature graphic, phone screenshots from the real app, and draft answers for Data safety, Content rating and Target audience (18+).
- [ ] **You:** fill in the Play Console forms (Claude's drafts), give reviewers a test login, upload the app, and start a closed test.
- [ ] **You:** 12 or more testers opted in to the closed test for 14 days in a row before Google allows production (a personal account's rule); with the closed test starting 2 November, production is 16 November at the earliest. The current users are the natural testers.
- [ ] **Claude (before submitting):** a personal account lists you, not the company named in the Terms, as the developer: check what the store listing shows and propose the matching wording for the Terms and Privacy Policy
- [ ] **You:** apply for production, then publish.
- [ ] **You and Claude (Mon 30 Nov):** the ledger test: at least half the Android testers scroll 15% or more less and invest more in week 4 than week 1. Pass: public release, then the iPhone app. Fail: interview testers, try the swap prompt (GTM.md › Strategy)
- [ ] **You (early November, as a hedge):** enrol in the Apple Developer Program (US$99/year) and request the Family Controls entitlement, so approval isn't the bottleneck if the test passes

**Phase 3: Launch**

Day-to-day outreach (tasks by date, messages, tracking links, share and feedback logs, weekly review) lives in [OUTREACH.md](OUTREACH.md).

- [ ] **You:** Google Search Console: use URL inspection › Request indexing for https://tiktym.com/ and https://tiktym.com/updates/.
- [ ] **You:** Bing Webmaster Tools: Import from Google Search Console (Bing feeds ChatGPT search, Copilot and DuckDuckGo).
- [ ] **You:** post on the TikTym LinkedIn page 2 or 3 times a week (page set up 8 October) (building in public, "busy weeks carry forward", monthly progress with Insights screenshots).
- [ ] **You:** run a 30-day learning challenge with your network, using TikTym.
- [ ] **You:** take part in r/developersIndia, r/IndianWorkplace and tech Slack/Discord communities before sharing TikTym.
- [ ] **You:** list 10 productivity or career newsletters and creators and pitch them.

## Anonymous usage totals


## 5. Remaining test gaps

From FEATURES.md › "What's left to test". None left: every scenario has a test, or is under "Check by hand before release".


## 6. Features not built yet

Help people add TikTym to their home screen (friends didn't know how; most only know app stores). Part of 1.8.0.

- [ ] **Deferred (10 October 2026, your call):** while a timer runs, Today's big number stays at saved points even though the beads already show the timer's minutes, so the two disagree (found by Praveen). Proposed: the number counts down live (capped at what the practice still needs), no extra line in the circle, and "20 of 30 · timing" on the practice's row.
- [ ] **Deferred (10 October 2026, your call):** the weekend card's "291 short, about 146 a day" doesn't match Today's "195 left" (the card splits the week's shortfall evenly and counts every minute; Today asks for carried minutes per practice). Proposed: the card says "Clear today's 195, including 95 carried over, then tomorrow's 100, and the week is done", with stats done this week / weekly goal / left today (MOM-03).

No more blank screen on a slow connection (reported by a friend, 8 October 2026). Before anything showed, a phone downloaded Google's font stylesheet (which blocks the first paint), about 100 KB of app code and, in Firebase mode, about 190 KB of Firebase SDK, with nothing on screen. Branch `fix/slow-start`.




- [ ] **Deferred (12 October 2026, your call):** new users often see no streak badge on Today: it's hidden with no streak and fewer than 2 days showing up in a row (seen with an early user: "Good morning, Malleswari" on one line, nothing at the top right), so the streak calendar is reachable only from Insights. Proposed: always show it once there are practices; with neither, "Start a streak" in gold with this week's dots, opening the Streak sheet (TODAY-03, TODAY-04, TODAY-20).
- [ ] **Claude (before scale):** load only recent months on app open, using the offline cache for older ones. Today every open downloads a user's full history: fine now, but after a year it is about 230 KB and 17 reads per open, which makes Firestore's free 10 GiB/month egress the first limit for long-time users.
- [ ] **Idea (from content, 9 October 2026):** hours towards mastery: each practice's lifetime hours against 10,000 (e.g. "Course study: 42 of 10,000 hours"), for the 10,000-hour posts. Decide after first users' feedback.
- [ ] **Idea (from content, 9 October 2026):** a challenge view for 100 Days, 100 Minutes (30 Exercise, 30 Reading, 30 Upskilling, 10 Meditation; a day counts when Today is cleared, carried minutes included): "Day 34 of 100", days won, and a shareable challenge card. Only if the challenge goes ahead; streaks and the progress card cover the start.
- [ ] Phase 2, needs Blaze: push reminders, streak-at-risk alerts, a weekly recap, and a timer alert while the app is closed (Cloud Functions + FCM).

## Notifications (see NOTIFICATIONS.md)

**Parked 13 October 2026 until the ledger test (30 Nov):** the monthly progress email, first-week tips and streak-at-risk push below; the news broadcast for the challenge still goes out (it recruits testers). Decided 10 October 2026: everything on by default, each switchable off in Setup or from any email. Emails come from "Praveen from TikTym" <hello@tiktym.com>, replies to the support Gmail; the welcome goes out after first-run Start.

- [ ] **You:** create a Resend API key (Sending access, tiktym.com) and store it with `firebase functions:secrets:set RESEND_API_KEY --project tiktym`. Never paste it into chat or code.
- [ ] **You:** send a personal welcome email to each new sign-up until the automatic one is live.
- [ ] **You:** have a lawyer check the updated Terms and Privacy Policy, especially on-by-default analytics on the website.
- [ ] **You:** upgrade Resend to a paid plan at about 50 active users; the free plan's 100 emails a day runs out on Mondays at about 80 (NOTIFICATIONS.md › Scaling the emails).
- [ ] **Claude:** news broadcast: Praveen approves the text, it goes to everyone with News on; first use, announcing 100 Days, 100 Minutes in late October. Sent from the admin console's email composer (below).
- [ ] **Claude:** first-week tips emails on days 3 and 6, only while still active (Tips and reminders).
- [ ] **Claude:** monthly progress email on the 1st (Weekly recap switch), first on 1 November.
- [ ] **Claude:** the "at most one email a day, mornings IST" rule across all scheduled emails.
- [ ] **Claude:** streak-at-risk push (evening, 3+ day streak, nothing logged), within the one-push-a-day rule. After daily reminders are live.
- [ ] **Claude:** phase 1 in-app: install tip, first-week tips, milestone celebrations, progress-card reminder, What's new dot, feedback ask.

## Admin console (admin.tiktym.com)

Decided 13 October 2026: a separate admin app in this repo and Firebase project, for Praveen only. Access is an `admin` custom claim that only a server script can set; every action runs in a Cloud Function that checks it, so `firestore.rules` stay closed to apps. Every send is recorded in `adminLog/`. FEATURES.md › 17. Admin console.


## 7. Housekeeping

- [ ] **You (email avatar, free):** let hello@tiktym.com receive mail (it has no MX records, so mail to it bounces): ImprovMX (free) forwarding hello@ to your Gmail, with its two MX records in GoDaddy DNS; then create a Google account for hello@tiktym.com ("Use your existing email") and set its photo to `public/brand/png/tiktym-app-icon.png`, so Gmail shows the TikTym logo instead of a blank avatar. Not guaranteed for automated mail, but works for most Gmail readers.
- [ ] **You:** add a DMARC record in GoDaddy DNS: TXT `_dmarc` = `v=DMARC1; p=none; rua=mailto:praveen.cherukuru@gmail.com` (monitor only; helps the emails stay out of spam, and is the first step to BIMI).
- [ ] **Later (BIMI, when worth ₹40,000+ a year):** the verified logo in Gmail needs DMARC at quarantine or reject, the logo as SVG Tiny PS, and a VMC (registered trademark) or CMC (logo in public use 12 months, so late 2027 at the earliest).
- [ ] **You (optional):** rename the GitHub repo from `karma-pwa` to `tiktym` (Settings › Repository name), then run `git remote set-url origin https://github.com/urpraveench/tiktym.git`.
- [ ] **Claude:** watch for a Firebase release that drops the flagged `@grpc/grpc-js` version from `npm audit`. It only affects Firebase's Node build, never the app in the browser. Don't run `npm audit fix --force`; it downgrades Firebase.

## Done

Move items here when they're finished, newest first, so there's a record.

- [x] **Claude:** motion logo videos in `public/brand/motion/` (`npm run brand:motion`), with a tick for each bead and a chime on the gold bead: end cards as MP4 (vertical 1080×1920 and wide 1920×1080, dark and light), a transparent WebM to go over footage, and a GIF for emails (GTM-24). Online at app.tiktym.com/brand/ from the next app deploy, 17 October 2026
- [x] **Claude:** animated SVG logos in `public/brand/svg/` (`npm run brand:kit`): the ring, ring + name, and both lockups with the brand line, in colour, colour on dark and white; playing once, then holding the static logo, and showing the static logo straight away when the viewer has reduced motion turned on (GTM-23), 17 October 2026
- [x] **You:** opened a **Personal** Google Play developer account (identity verified) and created the app "TikTym": package `com.tiktym.app`, Free, English (India), Play App Signing on. 17 October 2026
- [x] **Claude:** link Instagram (@tiktym.app) beside LinkedIn: Setup › About, the website footer (home and What's new), the structured data's sameAs, and llms.txt (GTM-10, GTM-16, GTM-17), 16 October 2026
- [x] **Claude:** a second tab, or the Android app reopened within a few seconds of closing, kept running without Firestore's offline storage ("Falling back to memory cache": only one copy of the app could own it), so that session's changes weren't kept on the device; use Firestore's multi-tab storage so every copy shares it (SYNC-18). Found by the Android speed check. 16 October 2026
- [x] **You:** chose a **Personal** Google Play developer account instead of waiting for Dun & Bradstreet's D-U-N-S number for the company (requested 13 October). Personal accounts need 12 or more testers in a closed test for 14 days before production. 16 October 2026
- [x] **You:** checked 1.16.0 on your phone: the "Your level and your coach" screen showed once with a sensible level, no morning splash on top, and the Streak sheet shows the level (LVL-13, TODAY-22). 14 October 2026
- [x] Released 1.16.0: levels (10, from how consistent you've been, moving each Monday) setting the streak, shield and backlog rules; the coach's voice by tier in the app, reminders and the comeback email; a one-screen welcome; the morning splash at 10 seconds. App, functions and website deployed, 14 October 2026
- [x] **Claude:** `LEVELS_FROM` set to the release day, 14 October 2026; the Firebase-mode settings sync test finds the backlog buttons by name, since they read "1", "2", "3" once levels began (LVL-10). 14 October 2026
- [x] **Claude:** the levels introduction no longer tells an account with under a week of history that its Level 1 came from its last 4 weeks; it says everyone starts at Level 1, as for a new account (LVL-13). On the `levels` branch, 14 October 2026
- [x] **Claude:** the levels introduction cut to one screen, asked by Praveen: "Your level and your coach": TikTym helps you reach your goals, your level shows where you stand today, your coach guides you from here (LVL-13). On the `levels` branch, 14 October 2026
- [x] **Claude:** the levels introduction: three screens the first time levels apply (once per device, in place of that morning's splash, never on the day an account starts), in the person's own level and rules; the "Meet your level" card on Today is gone, since the introduction covers it (LVL-13, LVL-11). On the `levels` branch, 14 October 2026
- [x] **Claude:** the morning splash stays 10 seconds instead of 7, asked by Praveen (TODAY-21). On the `levels` branch, ships with it, 14 October 2026
- [x] **Claude:** phase 5: the daily and practice reminders' line and the comeback email's opening in the coach's voice by tier; the server works out the level with the app's rules (COACH-07, COACH-08). On the `levels` branch, 14 October 2026
- [x] **Claude:** phase 4: a card on Today when the level moves, and level progress in Insights; the coach names the practice lifting the score and the one dragging it; the level's text says what keeps the level when the score is under its threshold (LVL-11, LVL-12, TODAY-22). On the `levels` branch, 14 October 2026
- [x] **Claude:** phase 3: the coach's voice by tier (Starting gentle to Relentless blunt; Steady as before levels) on the evening nudge, the "All clear" celebration, the on-a-roll and comeback cards, and Insights' quiet-week line (COACH-01 to COACH-06). On the `levels` branch, 14 October 2026
- [x] **Claude:** phase 2c: the backlog limit follows the level when the person hasn't picked one (Levels 1–3: 1 day; 4–6: 2; 7–8: 3; 9–10: none), with Setup showing "Auto" (LVL-10). On the `levels` branch, 14 October 2026
- [x] **Claude:** the level's score counts a practice-day as on target from 80% of its target, so someone doing 25 of 30 minutes a day doesn't score 0% (LVL-02). On the `levels` branch, 14 October 2026
- [x] **Claude:** phase 2b: practice streaks by level: Levels 1–2 allow 2 missed days a week, 3–4 one, 5 one a fortnight, 6 up none; each practice-day judged like its level's clear day (LVL-09). On the `levels` branch, 14 October 2026
- [x] **Claude:** phase 2a: the streak, shields and the evening nudge follow each day's level: what makes a clear day, shields earned and held (a shield to start at Levels 1–2), days before levels keep the old rules; the Streak sheet explains the current level's rules; shared with the functions (LVL-06 to LVL-08, CALC-10, CALC-14, CALC-15, TODAY-13, TODAY-20). On the `levels` branch, 14 October 2026
- [x] **Claude:** phase 1: the level from history (score, starting level, weekly moves) in `src/lib/levels.ts`, shown on the Streak sheet with the score and what reaches the next level; streak rules unchanged (LVL-01 to LVL-05, TODAY-22). On the `levels` branch, 14 October 2026
- [x] Released 1.15.0: the coloured button logs only today's minutes and a red "+N carried" button clears the backlog; "How did it feel?" only after a focus timer session; iPhone evening check and practice reminders. App and website deployed, 14 October 2026
- [x] **Claude:** CLAUDE.md › Branches: `main` is production, live fixes branch off `main`, feature branches like `android` merge in only when they ship and take `main` after each release, deploy only from `main`. 14 October 2026
- [x] **Claude:** "How did it feel?" only after a focus timer session, not after every quick tap or typed entry; the question made every toast twice as tall and covered the row just logged (LOG-31). 14 October 2026
- [x] **Claude:** the coloured button logs only what's left of today's target; once that's done, a red "+N carried" button clears the backlog on purpose; the row reads "0 of 60, 120 carried" and "Today's 60 done, 120 carried"; the toast says what's still carried; the website's feature list says "One tap logs today's minutes" (LOG-01, LOG-32, TODAY-11). From a user who did 60 minutes of Exercise and got 180 logged. 14 October 2026
- [x] **Claude:** minutes logged count toward today's target first, then the carried-over backlog, so "carried" means backlog still owed after today's part (CALC-13, CALC-16). 13 October 2026
- [x] **Claude:** bug fixed: iPhone users didn't get the 8 pm evening check or practice reminders, because Apple's push service refused topics whose length isn't valid Base64 (`BadWebPushTopic`, found via the Health page). Every topic is now padded to a valid length, and refused pushes are logged with the reason instead of retried (NOTIF-21); deployed (reminderSend, adminPushTest, broadcastPushSend, with adminHealth's fix), 13 October 2026
- [x] **Claude:** Health lists each function once, under its readable name with Cloud Run's counts, instead of twice (Cloud Run service and Cloud Function) (found by Praveen) (ADMIN-14), 13 October 2026
- [x] **Claude:** "One person" audience on the Email and Push pages (asked by Praveen; deployed): type their account's email; the preview or Check says if there's no such account, their News is off or they have no device; History shows who it went to (ADMIN-07, ADMIN-08, ADMIN-10, ADMIN-12), 13 October 2026
- [x] Deployed the admin console: 13 new admin functions (metrics, email, push, history, costs, health, the nightly totals and the two send queues), the existing functions updated (each email now counted in `adminStats`), and https://admin.tiktym.com live (HTTPS, noindex); a call without the admin claim is refused. The app itself is unchanged, so no app release, 13 October 2026
- [x] **Claude:** Costs reads the FOCUS billing export (finds the billing dataset and table itself, FOCUS or Standard; "no data yet" before the first rows), and the Resend limit is the paid plan's 50,000 a month with no daily cap (ADMIN-13), 13 October 2026
- [x] **You:** Cloud Billing export to BigQuery turned on, as FOCUS usage cost (dataset `gcp_billing_immutable_014531_E38200_BE39C7_us`, US; no tables yet on 13 October), and Resend upgraded, 13 October 2026
- [x] **You:** admin access granted to praveen.cherukuru@gmail.com with `npm run admin:grant` (the only admin), 13 October 2026
- [x] **Claude:** `admin:grant` said "No account" for any failed lookup; it now shows the real error, and suggests `gcloud auth application-default set-quota-project tiktym` when Google asks for a quota project (needed with a personal login), 13 October 2026
- [x] **You:** admin.tiktym.com added to Authentication's authorized domains and the reCAPTCHA Enterprise key's domains, 13 October 2026
- [x] **Claude:** function health: Health page with each function's runs and errors in the last 24 hours, errors first, with links to logs, from the new `adminHealth` function (ADMIN-14). Not deployed yet, 13 October 2026
- [x] **You:** admin hosting site `tiktym-admin` created and admin.tiktym.com pointed at it (DNS resolves to tiktym-admin.web.app; the HTTPS certificate was still being issued on 13 October), 13 October 2026
- [x] **Claude:** costs and limits: Costs page with this month's Google Cloud spend by service (BigQuery billing export) and use against each limit (Resend from TikTym's counts; App Check, Firestore reads and writes, Hosting transfer from Cloud Monitoring), each part failing on its own; the new `adminCosts` function (ADMIN-13). Not deployed yet, 13 October 2026
- [x] **Claude:** send history: History page with the newest 50 sends and tests and their progress, from the new `adminHistory` function (ADMIN-12). Not deployed yet, 13 October 2026
- [x] **Claude:** push composer: Push page (audience, title, text, link in the app, notification mock), test on my devices, count then send with a second tap; `adminPushCount`, `adminPushTest`, `adminPushSend` and the `broadcastPushSend` queue (held until 10 am where it's night, once per person) (ADMIN-10, ADMIN-11). Not deployed yet, 13 October 2026
- [x] **Claude:** email composer: Email page (audience, subject, heading, text, optional button), preview in the TikTym template with "up to N people", send a test to me, send with a second tap; `adminEmailPreview`, `adminEmailTest`, `adminEmailSend` and the `broadcastSend` queue (News on only, once per person, not on a day already emailed; outcomes counted in `adminLog/`) (ADMIN-07, ADMIN-08, ADMIN-09). Not deployed yet, 13 October 2026
- [x] **Claude:** metrics page, the console's first page: six tiles with the change from a week before, 30-day charts of sign-ups, active loggers, entries and minutes with tooltips and a table, from the new `adminMetrics` function (admins only, 60 reads an open) (ADMIN-06). Not deployed yet, 13 October 2026
- [x] **Claude:** the admin app: `admin/` page and `src/admin/`, its own build (`npm run admin:build` → `dist-admin/`) and hosting target `admin` (site `tiktym-admin`, noindex), Google sign-in, "This account isn't an admin" for anyone without the claim; browser tests on the emulators (ADMIN-05). Not deployed yet, 13 October 2026
- [x] **Claude:** nightly account totals in `adminStats/{day}` at 00:30 India time (`adminStatsNightly`): accounts, sign-ups, started, active loggers (1, 7, 28 days), activation, 7-day retention, accounts with push; each sent email counted by type as it goes (ADMIN-04). Not deployed yet, 13 October 2026
- [x] **Claude:** admin access: `npm run admin:grant -- <email>` sets or removes the `admin` claim and lists who has it; `adminCheck` in functions lets in only that claim (wired into each admin function as it's built); `adminStats/` and `adminLog/` closed to every app, admins included (ADMIN-01, ADMIN-02, ADMIN-03), 13 October 2026
- [x] Released 1.14.0: a reminder for each practice ("Remind me" on the practice sheet; NOTIF-19, NOTIF-20, PRAC-24), the start-date box hidden until Change (PRAC-12), plain-words load errors with Reload (AUTH-22, FIRST-04), an old open copy reloads into the new version (APP-33); functions deployed with the new `reminderPractices` trigger; app.tiktym.com/version.json shows 1.14.0 and tiktym.com/updates/ shows the release, 13 October 2026
- [x] **Claude:** editing a practice shows the start-date box before Change is tapped: a `display:block` rule beats the `hidden` attribute. Hide it until Change (PRAC-12). Not released yet, 13 October 2026
- [x] **Claude:** practice reminders 2/2: "Remind me" on the practice sheet (off, or a time from 7 am to 9:45 pm), the time shown in Setup's practice list, changelog line (PRAC-24). Not released yet, 12 October 2026
- [x] **Claude:** practice reminders 1/2 (user feedback, 12 October 2026: "remind me to draft the mail at 10 am"): the server sends "Time for Reading" at a practice's own reminder time, only if that practice is still due today, once a day; practices set for the same time share one notification; the 15-minute job finds them by slot (NOTIF-19, NOTIF-20). Built and unit-tested, not deployed yet, 12 October 2026
- [x] 12 Oct 2026: a copy of the app left open from before an update, whose code files the server no longer has, reloads itself once into the new version instead of failing to start; at most once a minute, never offline (APP-33) (Claude)
- [x] 12 Oct 2026: when TikTym can't start or can't load the account's data, the login screen says so in plain words with a Reload button that loads the newest version, instead of "Check your connection and .env.local" or "Check Firestore rules"; offline says offline (AUTH-22, FIRST-04) (Claude)
- [x] 12 Oct 2026: price isn't the pitch (GTM-22): "free" removed from the website hero, facts, closing line and descriptions, the app's link preview, the Terms summary, the preview image and the outreach templates; only the FAQ, llms.txt and the Terms' price section answer it. Needs a website and app deploy (Claude)

- [x] 12 Oct 2026: Instagram account @tiktym.app created, name "TikTym Productivity Coach" (You)
- [x] 12 Oct 2026: Instagram launch set in Downloads › TikTym Instagram: profile picture, 5 highlight covers, 5 reels with covers (recorded from the app at full resolution), 4 carousels (28 slides), CAPTIONS.txt with order, captions, hashtags and alt text (Claude)

- [x] Released 1.13.0: reminders on by default with the phone asked on the first tap (NOTIF-12, FIRST-13), the morning idea splash (TODAY-21), the Evening log check switch (NOTIF-18), "around 7 am" (MOM-07); functions deployed with the 8 pm check; Privacy Policy mentions it, 12 October 2026
- [x] **Claude:** the usual-time card said "around 07. 45 left today" (the browser's British hour format); now "around 7 am" (MOM-07). Found while recording the 1.13 walkthrough, 12 October 2026
- [x] **Claude:** reminders on by default for every user, no asking screens (Praveen's call, 12 October 2026): the 7 pm reminder and 8 pm log check are on in every account and Setup shows them on; the Today "Remind me" card and any sign-up prompt are gone; the phone's own Allow popup, which no app can skip, is triggered by the first tap anywhere in the app, once per open (NOTIF-12, FIRST-13). Released in 1.13.0, 12 October 2026
- [x] **Claude:** 8 pm evening log check, "Did you log what you did today? Tap the mic and just say it.", for every account with notifications allowed, on by default with a Setup switch: only if nothing is logged that day and something was due, not after a daily reminder set between 7 and 8 pm (the 7 pm default and the 8 pm check both go) (asked by Praveen) (NOTIF-18). Privacy Policy updated. Deployed in 1.13.0, 12 October 2026
- [x] **Claude:** today's idea as a full-screen card on the first open of each day, then Today; closes with "Start my day", a tap, or after 7 seconds; not on the account's first day (asked by Praveen) (TODAY-21). Released in 1.13.0, 12 October 2026
- [x] Released 1.12.1: links Chrome hands to the installed app reuse its open window (APP-32). Functions deployed with the email home-screen hint (NOTIF-17) and the queued weekly recap (`recapSend`, NOTIF-16), after Monday 12 October's run of the old loop sent 6 recaps, 12 October 2026
- [x] **Claude:** the manifest's `launch_handler` (navigate-existing), so a link Chrome hands to the installed app reuses an open TikTym window (Android outside Gmail's own browser, computers) (APP-32). Released in 1.12.1, 12 October 2026
- [x] **Claude:** emails say "Added TikTym to your home screen? Open it from there, so you stay signed in." under each button and in the plain text (not the welcome): a link can't open the home-screen app on iPhone, whose browser also doesn't share its sign-in (found by Praveen) (NOTIF-17). Deployed, 12 October 2026
- [x] **Claude:** website shows the AI (asked by Praveen: the site read like a basic tracker): hero line and a "Log by voice with AI" fact under the unchanged brand line, How it works "Say it, time it, or tap it", a first feature card with the voice clip (its poster shows the AI's entries), shields in the features intro and Today card, a privacy line and an FAQ on AI, "Stored in India" instead of "Your data stays in India" (voice may be processed outside India), link-preview and search descriptions, llms.txt. Only voice is called AI; the coaching isn't (GTM-21). Live on tiktym.com, 12 October 2026
- [x] **Claude:** website clip of voice logging (tap the microphone, the AI's entries to review, save), with the microphone and AI faked through the voice tests' hook; all clips re-recorded for 1.12's streak header, without the reminder offer (GTM-05), 12 October 2026
- [x] Released 1.12.0: streak calendar (week dots on Today, Streak sheet with shields and a month of clear, shielded and missed days; also from Insights) and the gold "shield kept your streak" message; the logo set is live at app.tiktym.com/brand/, 11 October 2026
- [x] **Claude:** streak calendar (asked by Praveen: "I'm just seeing only the number"): this week's days as dots under the streak on Today; tapping it, or Insights › Consistency's streak line, opens a Streak sheet with the shields as icons, how far off the next one is, and a month calendar of clear days (joined by a gold band), days a shield saved, missed days and rest days (TODAY-20, CALC-15). Not released yet, 11 October 2026
- [x] **Claude:** "A shield kept your N-day streak yesterday" shows in gold with a shield icon instead of the red warning style, since it's good news (TODAY-17). Not released yet, 11 October 2026
- [x] Released 1.11.0: streak shields (3 clear days earn one, up to 3), one-tap mood after logging with an Insights line, "Just 7 minutes" on Today, Today's idea, centred toasts; website clips re-recorded, 11 October 2026
- [x] **Claude:** toasts slide straight up into place instead of starting half their width to the right and jumping back to centre, 11 October 2026
- [x] **Claude:** "Today's idea": one short line a day on Today, from a set written for TikTym (TODAY-19), 11 October 2026
- [x] **Claude:** "Just 7 minutes" button on Today that starts a timer on the easiest practice still due (TODAY-18), 11 October 2026
- [x] **Claude:** one-tap mood after logging: the toast offers 😞 😐 🙂, saved with the entry; Insights says which practice leaves you feeling good (LOG-31, INS-21), 11 October 2026
- [x] **Claude:** streak shields come faster: three clear days in a row earn one, and up to three can be held; the 3-day celebration line gives way to the shield line (CALC-14, LOG-05), 11 October 2026
- [x] **Claude:** streak shields: seven clear days in a row earn a shield (2 at most); a missed day spends one instead of breaking the streak. Shown on Today and in the celebration (CALC-14, TODAY-17, LOG-05), 11 October 2026
- [x] Released 1.10.2: faster voice updates (no fresh reCAPTCHA check per call); the voice function logs its timing, 11 October 2026
- [x] **Claude:** voice calls reuse the app's App Check token instead of running a fresh reCAPTCHA check each time, saving up to about a second per voice update (LOG-30), 11 October 2026
- [x] **Claude:** `understandVoice` now logs "voice understood" with Gemini's time (aiMs), the whole call (totalMs), recording size and token counts, never the audio or words (LOG-30), 11 October 2026
- [x] Released 1.10.1: the recording wave follows the voice and keeps moving while recording, 11 October 2026
- [x] **Claude:** the recording wave now moves: bars follow the voice's loudness instead of high-pitch bands that speech barely reaches, the wave travels gently even in silence, and with Reduce Motion it rises and falls in place (LOG-26), 11 October 2026
- [x] Checked: voice logging works on app.tiktym.com through `understandVoice`; two calls passed sign-in and App Check with no AI errors in the log (LOG-30), 11 October 2026
- [x] **Claude:** fixed voice failing with "Sign in again" on 1.10.0: `understandVoice` asked to consume App Check tokens, which its account had no permission for; it now only verifies them (LOG-30), 11 October 2026
- [x] Released 1.10.0: voice logging from the centre microphone in a compact sheet, through TikTym's `understandVoice` function (5 a minute, 50 a day per account); `understandVoice` and `voiceUsageCleanup` deployed, weekly recap still held for Monday, 11 October 2026
- [x] **You:** added a billing budget with email alerts and disabled the Firebase AI Logic API, so browsers can no longer call Gemini directly, 11 October 2026
- [x] **Claude:** voice AI moved behind TikTym's own `understandVoice` Cloud Function: signed-in, App Check with replay protection, at most 5 voice updates a minute and 50 a day per account (server-only `voiceUsage/{uid}`, deleted with the account), Gemini on Vertex AI through the function's service account; the app no longer uses Firebase AI Logic. Privacy Policy updated (LOG-30), 11 October 2026
- [x] **Claude:** compact voice sheet: timer inside the recorder, no separate Listening/help lines, links on one row, shorter privacy note, transcript as one quoted line in review; the recording sheet now uses under half the screen (LOG-26), 11 October 2026
- [x] **Claude:** replaced unreliable browser dictation with one-tap recorded-audio voice logging: a moving waveform with cancel and finish controls, Firebase AI transcription and practice matching, editable review before saving, retry with the same recording, and typed/manual fallbacks. Recordings and transcripts are not stored by TikTym. App Check and signed-in-user protection are enforced; the exact phrase "I did an exercise for 5 minutes today" reached Exercise · 5 minutes through a real Chrome microphone and Firebase AI without saving it (LOG-10, LOG-26, LOG-29), 11 October 2026
- [x] **Claude:** conversational voice phrases now understand "I did an exercise for 5 minutes today", durations before or after the practice, time words and hours, and ignore chapter/page numbers when an explicit duration is present (LOG-25, LOG-27), 11 October 2026
- [x] **Claude:** voice-first logging: the centre action is now a microphone, starts listening in one tap, and automatically shows the transcript and matched entries; "Enter minutes manually" keeps the old minute buttons easy to reach (LOG-10, LOG-26), 11 October 2026
- [x] **Claude:** voice logging 2/2: the log sheet now has microphone and typed input, editable review, safe handling for unclear speech and microphone errors, and a one-step batch save with one Undo; the Privacy Policy explains browser speech processing (LOG-26 to LOG-29), 11 October 2026
- [x] **Claude:** voice logging 1/2: phrases such as "walked 20, read fifteen" become proposed practice-and-minute entries; digits, number words, custom practice names and unclear or ambiguous phrases are covered by unit tests (LOG-25, LOG-27), 11 October 2026
- [x] **Claude:** logo set in `public/brand/` (`npm run brand:kit`): the ring, the wordmark, ring + name side by side and stacked, and both with the brand line, each in colour, colour on dark, black and white, as SVG (text outlined) and transparent PNG, plus the app icon; a README says which to use where. Kept out of the app's offline cache; online at app.tiktym.com/brand/ from the next app deploy, 11 October 2026
- [x] **Claude:** weekly recap moved onto the queue (NOTIF-16): the Monday 8 am job queries only accounts with an entry in the last two weeks (`mail/{uid}.lastLogged`) and queues one named task each (`recap-<uid>-<week>`, so a rerun can't queue twice); `recapSend` sends 2 a second, retries 3 times, checks again before sending, and skips the week if another email went that day. No more 9-minute limit or listing every sign-up, 10 October 2026
- [x] App badge checked live on iPhone: the icon showed 4, matching the practices left in the reminder (NOTIF-13), 10 October 2026
- [x] Daily reminder checked live on iPhone (home-screen app): queued at the 8:30 pm IST slot and delivered 6 seconds later, naming the 4 practices left; the server's queue permission works (NOTIF-09), 10 October 2026
- [x] 10 October 2026: **Claude:** "one tap away" email for people who sign in but never tap Start on the first-run screen (NOTIF-15). Seen 10 October 2026: account `mcgg…` signed in with Google at 13:29 and got no welcome. Sign-up records `mail/{uid}.startDueAt` (an Auth trigger), the hourly job sends once about a day later if still not started and Tips and reminders is on; the welcome no longer assumes `mail/{uid}` doesn't exist yet.
- [x] Released 1.9.0: daily push reminders at a chosen time, the app badge (practices left today), and the weekly recap and comeback emails in What's new; functions `reminderSettings`, `reminderDevices`, `remindersDue` (every 15 minutes) and `reminderSend` (queue) deployed with the `VAPID_PRIVATE_KEY` secret, 10 October 2026
- [x] **Claude:** Android reminders show a white TikTym ring as their small icon, instead of Chrome's (`scripts/badge-icon.mjs`), 10 October 2026
- [x] **Claude:** push reminders 5/5: Privacy Policy and Terms describe push reminders and the badge; changelog line. Not released yet, 10 October 2026
- [x] **Claude:** push reminders 4/5: app badge, practices still due today on the home-screen icon (iPhone home screen and installed desktop apps; not Android), set while open, cleared when the day is clear, refreshed by each reminder; "Show count on app icon", on by default. NOTIFICATIONS.md › App badge (NOTIF-13). Not deployed yet, 10 October 2026
- [x] **Claude:** push reminders 3/5: in the app: the service worker shows the reminder and opens TikTym on tap; a "Remind me tomorrow" card on Today after the first entry (never on first open); Setup › Daily reminder with a time; deleting the account removes its devices (NOTIF-12, NOTIF-14). Not deployed yet, 10 October 2026
- [x] **Claude:** push reminders 2/5: sending. TikTym's own web-push keys; each device that allows notifications is saved in the account; every 15 minutes a job queues a reminder for the people whose chosen time it is (the queue design), once a day, skipped when today is clear; expired devices removed (NOTIF-09, NOTIF-11). Built and unit-tested, not deployed yet, 10 October 2026
- [x] **Claude:** push reminders 1/5: the server counts the practices still due today with the app's own code (a generated copy of `src/lib/backlog.ts`, checked identical by a unit test), so reminders and the badge always agree with Today (NOTIF-10)., 10 October 2026
- [x] **You:** submitted `sitemap.xml` in Google Search Console, 10 October 2026
- [x] **Claude:** install guides on the website: the two with a video (iPhone Safari, Android Chrome) first, the two without as plain cards below, with no empty video space (GTM-20), 10 October 2026
- [x] **Claude:** comeback email after 3 full days with nothing logged, once per absence (Tips and reminders), on the scalable design: a trigger keeps each account's last-logged date, a daily 9 am job queries only people away 4 to 14 days and queues one task each (rate-limited, retried); waits a day if another email went that day (NOTIF-07, NOTIF-08). Built, unit-tested and deployed (functions `trackLastLogged`, `comebackDaily` at 9 am India time, `comebackSend` on a Cloud Tasks queue), 10 October 2026
- [x] Deployed the weekly recap (function `weeklyRecap`, Mondays 8 am India time); the first goes out Monday 12 October for 5 to 11 October, 10 October 2026
- [x] **Claude:** weekly recap email, Monday 8 am IST, for anyone active in the last 2 weeks (Weekly recap switch): last week's minutes against the targets, days shown up, best day, each practice with a bar, the show-up streak, one gentle suggestion; a quiet week gets a no-catching-up note instead (NOTIF-06). Built and unit-tested; sends from the first Monday after the functions deploy, 10 October 2026
- [x] **You:** messaged Gopi, Charuthi and Kiran about emails and usage statistics now being on, 10 October 2026
- [x] Checked live with a test account: the welcome email arrives in the inbox (not spam), and its unsubscribe link turns the switch off in Setup (NOTIF-03, NOTIF-05), 10 October 2026
- [x] Website deployed with the install videos; all four files load on tiktym.com, 10 October 2026
- [x] Install videos on the website: iPhone Safari (iOS simulator, driven by a UI test) and Android Chrome (emulator, driven over adb), recorded from the live 1.8.0 app with `npm run site:install-videos` and shown next to their guides; the Android guide now mentions Android's extra "Add to home screen" confirmation. Chrome on iPhone can't run in the simulator, so its guide has steps only (GTM-20), 10 October 2026
- [x] Released 1.8.0: "100 minutes a day for your productive life"; Notifications and privacy settings with emails and usage statistics on by default; the welcome email, first-minute nudge and unsubscribe page (Cloud Functions in asia-south1, first deploy; the welcome function needed a retry while Google set up event permissions); install help for each phone and browser; updated Privacy Policy and Terms. Checked live: version.json 1.8.0 (build efa1dcc; the first upload was stamped -dirty and was redeployed clean), the website's new title and What's new 1.8.0, and a forged unsubscribe link rejected, 10 October 2026
- [x] Install steps for each browser: the website has guides for iPhone Safari, iPhone Chrome, Android Chrome and Samsung Internet (the visitor's own first, marked "Your phone"); the app's guide has separate Chrome-on-iPhone steps, and Safari's mention ⋯ on newer iPhones (APP-28, GTM-19), 10 October 2026
- [x] Website Install section: the visitor's own phone first ("Your phone"), and an open-in-browser warning inside WhatsApp, Instagram, Facebook or LinkedIn; WhatsApp messages in OUTREACH.md say to open in the browser first (GTM-19), 10 October 2026
- [x] Install help: a card on Today after the first logged minutes (Install button on Android, Share › Add to Home Screen with icons on iPhone, "open in browser" with Copy the link inside WhatsApp, Instagram, Facebook or LinkedIn); Not now snoozes 3 days, twice ends it; hidden once installed; and Setup › Add TikTym to your home screen (APP-27 to APP-31). The card and the Setup row went in one commit because they share the guide, 10 October 2026
- [x] New brand line in the LinkedIn cover, post image and video (in Downloads), and in the OUTREACH.md messages; the LinkedIn tagline and description wording is a task in OUTREACH.md, 10 October 2026
- [x] New brand line in the emails: header image "TikTym · 100 minutes a day", the welcome's daily total "N minutes a day · your productive life", and tip 1 "Every minute counts towards your N" using each person's own total (NOTIF-03), 10 October 2026
- [x] New brand line on the website: title and link preview, hero ("100 minutes a day for your productive life" with 30/30/30/10), how it works ("counts towards your 100"), the professionals section (wellbeing, not only learning; "Start your 100 minutes today"; 100 minutes as the suggested start), the closing, search description, llms.txt and structured data (GTM-04). Not deployed yet, 10 October 2026
- [x] New brand line in the app: sign-in tagline, install description, link preview text and image ("100 minutes a day for your productive life", 30 to move · 30 to read · 30 to grow · 10 to breathe), share message, and the progress card ("for a productive life", "100 minutes a day") (AUTH-01, GTM-01, SHARE-02), 10 October 2026
- [x] Removed the one-time notice on Today (Praveen tells existing users himself); the Privacy Policy now promises to announce significant changes "in the app or by email or message", 10 October 2026
- [x] Existing accounts get emails and usage statistics on straight away; the one-time notice on Today only informs. The device's choice is stored under a new name from 1.8.0, so earlier stored "no"s (mostly the old unticked sign-up box) no longer count; turning it off from 1.8.0 on is respected (Praveen's decision, 10 October 2026; ANA-01, NOTIF-02)
- [x] The first email switch is now "Tips and reminders" (welcome, first-week tips, the first-minute nudge and comeback); the email schedule and rules are in NOTIFICATIONS.md, and the Privacy Policy and Terms list every planned email, 10 October 2026
- [x] Removed the unused branded password-reset template (`email/password-reset.html`, which Firebase never accepted) and its test; password resets use Firebase's default email. The header image stays for the welcome and first-minute emails, 10 October 2026
- [x] Company name removed outside the legal sections (emails, password-reset template, website and What's new footers, structured data, llms.txt, Terms summary and footers); kept in Privacy section 1, Terms section 1 and the grievance contact. Emails sign off "Praveen · Helping busy people like you make time for what matters." with no title, 10 October 2026
- [x] Email design in TikTym's brand: Bricolage Grotesque headline where supported, practices with their colour dots and the daily total in gold, three numbered tips, the nudge's "5 min today" card; previews in Downloads (NOTIF-03, NOTIF-04), 10 October 2026
- [x] Cloud Functions (asia-south1): welcome after first-run Start, an hourly first-minute nudge for accounts a day in with nothing logged, and app.tiktym.com/unsubscribe (asks first; Gmail's one-click works); server-only mail/ records, out of apps' reach; the service worker leaves /unsubscribe to the network. Built and tested, not deployed (NOTIF-03 to NOTIF-05), 10 October 2026
- [x] Email building blocks in functions/src/mail.ts: the welcome and first-minute emails (HTML and plain text, TikTym's style, from Praveen), signed one-tap unsubscribe links with Gmail's unsubscribe headers, and who gets what; unit-tested. Not sending yet (NOTIF-03 to NOTIF-05), 10 October 2026
- [x] Website Analytics on by default with a notice (OK, Opt out); opting out stops it, removes the cookies and is remembered; the privacy promise says so. Website tests now block Google's servers, so they can't report to the real property (ANA-04, LEGAL-05). Not deployed yet, 10 October 2026
- [x] Setup › Notifications and privacy (three email types and usage statistics, all on to start); Analytics on by default once signed in, kept off where a device said no, and for older accounts only after the one-time notice on Today (ANA-01, ANA-03, NOTIF-01, NOTIF-02). Not deployed yet, 10 October 2026
- [x] Privacy Policy and Terms (dated 10 October) describe on-by-default emails, phone reminders and usage statistics, Resend as the email processor, backups kept up to 8 weeks, and how to turn each off; the sign-in screen says what an account includes (LEGAL-05, LEGAL-07). Not deployed until the settings and emails exist, 10 October 2026
- [x] Resend account created and tiktym.com verified for sending (SPF and DKIM at GoDaddy), 10 October 2026
- [x] Automatic Firestore backups: daily (kept 7 days) and weekly on Sunday (kept 8 weeks); restore steps in README (SYNC-17), 10 October 2026
- [x] Monthly budget alert set on the billing account, and the project moved to the Blaze plan, 10 October 2026
- [x] Home page description shortened from 194 to 140 characters, as Bing Webmaster Tools asked; every page's description is now checked to be 25 to 160 characters (GTM-18), 9 October 2026
- [x] Google Search Console: tiktym.com verified as a Domain property, 9 October 2026
- [x] Website deployed with robots.txt, sitemap.xml, llms.txt and structured data; all checked live. The app's robots.txt goes out with the next app release, 9 October 2026
- [x] Structured data on tiktym.com (organisation with its LinkedIn page, website, TikTym as a free web app, and the FAQ word for word, checked by a test) and tiktym.com/llms.txt for AI tools (GTM-16, GTM-17), 9 October 2026
- [x] robots.txt and sitemap.xml for tiktym.com (the sitemap is rebuilt with What's new, dated by the newest release), and a real robots.txt for app.tiktym.com (GTM-15), 9 October 2026
- [x] Website FAQ, first question: "How is TikTym different from other habit apps?" (GTM-14), 9 October 2026
- [x] Test fix: the What's new website test no longer expects a "Coming next" card; it checks one is first only when there is one. It failed after 1.7.2 shipped everything (the release ran only the changelog unit tests, not the website tests), 9 October 2026
- [x] Released 1.7.2: "12 min" on the running timer (Gopi's feedback), Follow TikTym on LinkedIn and What's new in Setup › About. Website redeployed: What's new shows 1.7.2. Checked live, 9 October 2026
- [x] Website deployed with What's new: https://tiktym.com/updates/ is live (with and without the trailing slash) and linked from the footer. The app's What's new link goes out with the next app release, 9 October 2026
- [x] CLAUDE.md: user-visible changes get a "Coming next" line in CHANGELOG.md; each release turns it into the version's entry, rebuilds What's new and redeploys the website, 9 October 2026
- [x] "What's new" in Setup › About opens tiktym.com/updates/ (GTM-13); goes out with the next app release, 9 October 2026
- [x] CHANGELOG.md for users (1.0 to 1.7.1, plus "Coming next"), built into a What's new page at tiktym.com/updates/ by `npm run site:updates`, which also runs before every website deploy; linked from the website footer, with pictures for choosing practices and editing entries (GTM-11, GTM-12), 9 October 2026
- [x] Test fix: signing in again with Google clicks the emulator's saved account until its pop-up closes; it sometimes ignored the first click (AUTH-19; 16 of 16 passed without retries after), 9 October 2026
- [x] The running timer's button on Today shows "12 min" (number over a small "min") instead of "12′", after Gopi found the ′ confusing (TIMER-09); goes out with the next app release, 9 October 2026
- [x] Website deployed with the LinkedIn link in the footer; checked live on tiktym.com. The app's "Follow TikTym on LinkedIn" row waits for the next app release, 9 October 2026
- [x] The TikTym LinkedIn page is linked from Setup › About ("Follow TikTym on LinkedIn") and the website footer (GTM-10), 9 October 2026
- [x] Released 1.7.1: Continue with Google first on the sign-in screen. Checked live: version.json shows 1.7.1 and the live code has the new layout, 9 October 2026
- [x] Test fix: the Google tests click the emulator's "Add new account" until its form shows; it sometimes ignored the first click, which made AUTH-19 and AUTH-24 flaky (12 of 12 passed without retries after), 9 October 2026
- [x] Test fix: the tab-bar scroll test (APP-01) scrolls instantly, since a mouse-wheel scroll could still be animating after the tap and fail it now and then, 9 October 2026
- [x] Continue with Google is now the main button at the top of the sign-in screen; email and password sit below "or use your email" (AUTH-30), 9 October 2026
- [x] Checked on a real phone with a new account: the "What do you want to make time for?" screen works (FIRST-08), 9 October 2026
- [x] Released 1.7.0: a new account chooses its practices before day one. Checked live: https://app.tiktym.com/version.json shows 1.7.0 and the live code has the new screen, 9 October 2026
- [x] A new account chooses its practices before day one: "What do you want to make time for?" with eight suggestions (the four old defaults ticked), − and + for minutes, and "Add your own"; nothing is saved until Start (GTM-03, FIRST-01, FIRST-08 to FIRST-12), 8 October 2026
- [x] Released 1.6.2: a start screen instead of a blank page on slow connections, with slow, stuck and offline messages; fonts no longer block the first paint. Checked live on a throttled phone connection (50 KB/s): start screen at 1.3 s, sign-in at 9.3 s, where it was blank for all 9 s before, 8 October 2026
- [x] Google's font stylesheet loads in the background instead of holding up the first paint; the page draws in the system font until it arrives (APP-26), 8 October 2026
- [x] A start screen from the first byte (in index.html, before any code arrives), kept up while Firebase starts and data loads: "Loading TikTym…", "Your connection seems slow" after 5 seconds, Reload after 20, an offline message, and a reload by itself when the connection returns (FIRST-03, FIRST-05, FIRST-06, FIRST-07), 8 October 2026
- [x] OUTREACH.md: outreach tasks by date, ready messages, tracking links per channel, share and feedback logs, weekly review, 8 October 2026
- [x] LinkedIn company page set up (logo, cover, tagline); first post published with a 16-second app video (founder story: office, home, sleep, repeat), 8 October 2026
- [x] Released 1.6.1: changes made just before the app closes are kept (SYNC-16). Checked live: https://app.tiktym.com/version.json shows 1.6.1, 8 October 2026
- [x] Changes made just before the app closes are kept: each one is noted in localStorage until Firestore confirms it, and anything unconfirmed is shown and sent again on the next open. A log, edit or delete followed at once by a reload failed 2 times in 3 before; now passes every time (SYNC-16), 8 October 2026
- [x] Checked on iPhone: the moved bar on the old app, sign-in with email and Google at https://app.tiktym.com in Safari and from the new home-screen app, editing an entry, reordering practices (GTM-06, GTM-09), 8 October 2026
- [x] Released 1.6.0: the app moves to https://app.tiktym.com (old address redirects; installed apps show a "TikTym has moved" bar), edit a logged entry, reorder practices, failed deletes now say so, better text contrast in dark and light. Website redeployed with new links and clips. Checked live: both addresses serve 1.6.0, the old one redirects with path and query kept, 8 October 2026
- [x] Text contrast checked on every screen, sheet and the focus timer in dark and light (WCAG AA). Fixed what it found: white text on the green and amber practice colours (fills now 8% darker), the time-of-day bar's Morning and Night labels, the light-mode streak number, and "points so far" on the dark focus timer (APP-14, APP-25), 8 October 2026
- [x] Days follow the phone's time zone: checked in Los Angeles and India at times when UTC is on another date (APP-11), 8 October 2026
- [x] The service worker never answers or caches Firestore and Auth requests: checked with it running, in Firebase mode (APP-08), 8 October 2026
- [x] A save Firestore refuses shows "Could not save. Check your connection." after the screen has updated; deleting an entry (and its Undo) now says so too instead of failing silently (SET-18, SYNC-13), 8 October 2026
- [x] Reorder practices in Setup with Move up and Move down; new practices always go last (PRAC-20, PRAC-22, PRAC-23), 8 October 2026
- [x] Tap an entry in History to change its practice, day, minutes or note, with Undo, or delete it (HIST-07, HIST-08, HIST-09), 8 October 2026
- [x] Stores can change a logged entry, including moving it to another month in one batch (SYNC-15), 8 October 2026
- [x] `app.tiktym.com` connected to Hosting site `tiktym` (DNS points at Firebase; certificate pending), added to Authorized domains, the OAuth client (redirect URI and JavaScript origin) and the reCAPTCHA key, 8 October 2026
- [x] The old address in a browser tab goes to the same page on `app.tiktym.com` (GTM-08); an app installed from it keeps working with a "TikTym has moved" bar and an Open button (GTM-09); not deployed until the domain is connected, 8 October 2026
- [x] Everything points at `app.tiktym.com`: sign-in domain (`.env.local`), link preview, website buttons, Terms and Privacy links, Analytics cross-domain list, docs (GTM-06); not deployed until the domain is connected, 8 October 2026
- [x] Google Sheet set to refresh every morning, 7–8 am IST (STAT-04), 8 October 2026
- [x] Anonymous daily totals arriving in Firestore `stats` (seen through the Sheet), 8 October 2026
- [x] Google Sheet set up; Refresh pulls the anonymous totals from Firestore (STAT-04), 8 October 2026
- [x] Google Sheets report for the anonymous totals: `tools/sheets/` (Apps Script, manifest, setup guide) (STAT-04), 8 October 2026
- [x] Released 1.5.0 (commit 8cd3aeb) with the new Firestore rules: anonymous daily totals, 8 October 2026
- [x] Privacy Policy explains the anonymous daily totals (LEGAL-06), 8 October 2026
- [x] Anonymous daily totals for everyone in Firestore `stats/{date}`, batched, no identifiers (STAT-01, STAT-02), 8 October 2026
- [x] Security rules for anonymous totals: only small increments to known counters, no reads from apps (STAT-03), 8 October 2026
- [x] Google Analytics data retention set to 14 months, matching the Privacy Policy; Google signals are switched off by the app and website on every hit, 8 October 2026
- [x] Progress card shared from the iPhone and looks right (SHARE-03), 8 October 2026
- [x] Released 1.4.0 (commit 7fabc30): shareable progress card in Insights, 8 October 2026
- [x] Shareable progress card: Insights › Share, 1080×1350 preview, Share or Download, practice-names switch (SHARE-02, SHARE-03, SHARE-04), 8 October 2026
- [x] Progress card stats: month's time, streak, best, active days, top three practices (SHARE-01), 8 October 2026
- [x] A new deploy reaches the installed iPhone app: the "New version ready" bar appeared and Reload updated it (APP-07), 8 October 2026
- [x] Google Analytics is capturing data from the app and the website (seen in Reports › Realtime), 8 October 2026
- [x] Released 1.3.1 (commit f960cbc): analytics consent at sign-up, no card on Today, 8 October 2026
- [x] Analytics consent moved to an unticked checkbox on Create account; no card on Today; Setup › Privacy switch kept; Privacy Policy updated (ANA-01, LEGAL-05), 8 October 2026
- [x] Released 1.3.0 (commit e31e592) and the website: consent-based Google Analytics in both, updated Privacy Policy, 8 October 2026
- [x] Privacy Policy and website wording updated for optional, consent-based Google Analytics (LEGAL-05), 8 October 2026
- [x] Consent-based Google Analytics on the website, same property: consent bar, open_app clicks by location, domains linked to the app (ANA-04), 8 October 2026
- [x] Consent-based Google Analytics in the app: asks once on Today, Setup › Privacy switch, page views and anonymous events (ANA-01, ANA-02, ANA-03, ANA-05), 8 October 2026
- [x] Released 1.2.1 (commit 72abb4e): goal chime fix for iPhone, 8 October 2026
- [x] Fixed: the goal chime could play minutes late on iPhone. It now wakes suspended audio first, skips the sound rather than playing it late, and every tap keeps audio awake (TIMER-05), 8 October 2026
- [x] https://tiktym.com and https://www.tiktym.com both serve the website, 8 October 2026
- [x] Branded password-reset email written (`email/password-reset.html`), header image live at www.tiktym.com/email/header.png (`npm run email:header` redraws it) (AUTH-29), 8 October 2026
- [x] Password-reset email arrives in the Gmail inbox (not spam), sender "TikTym", subject "Reset your password for TikTym" (AUTH-28), 8 October 2026
- [x] Account emails sent from tiktym.com: domain verified in Firebase; SPF, `firebase=tiktym` and both DKIM records confirmed in DNS (AUTH-28), 8 October 2026
- [x] App Check token time to live set to 7 days, so the free 10,000 reCAPTCHA checks a month cover about 2,000 daily users, 8 October 2026
- [x] Released 1.2.0 (commit e878f1a): link previews for WhatsApp, LinkedIn and X; Send feedback in Setup, 8 October 2026
- [x] Website live at https://tiktym-site.web.app (tiktym.com once the domain is connected): Home, How it works, four features with clips, For working professionals, Install, Privacy, FAQ (GTM-04), 8 October 2026
- [x] Feature clips recorded from the real app with `npm run site:clips`: Today, focus timer, backlog, Insights (GTM-05), 8 October 2026
- [x] Send feedback in Setup › About, an email to support with the version filled in (GTM-02), 8 October 2026
- [x] Link previews: title, description and a 1200×630 preview image (`npm run og:image` redraws it) (GTM-01), 8 October 2026
- [x] IP India phonetic search for "TikTim", classes 9 and 42: no results. Name TikTym settled for India. First audience changed to working professionals (GTM.md), 8 October 2026
- [x] GTM decisions: keep the name TikTym (IP India search for "TikTym": no results), domain tiktym.com is owned, first audience is exam students. Plan in GTM.md, 8 October 2026
- [x] Password after Google sign-in: Forgot password set a new one and email/password sign-in works alongside Google (AUTH-26). The reset email went to spam; see Other launch items, 8 October 2026
- [x] Released 1.1.0 (commit 6184127): Terms of Service and Privacy Policy for India, linked from login and Setup, reCAPTCHA notice, available offline, 8 October 2026
- [x] Terms and Privacy linked from the login screen and Setup › About; Google's reCAPTCHA notice on the login screen when App Check is on; both pages available offline (AUTH-21, LEGAL-03, LEGAL-04), 8 October 2026
- [x] Privacy Policy for India's DPDP Act 2023 at `/privacy/`, based on what the app actually stores (LEGAL-02), 8 October 2026
- [x] Terms of Service for India at `/terms/` (LEGAL-01), 8 October 2026
- [x] Company details for the legal pages: Pramal IT Services Private Limited, CIN U72900AP2022PTC121639 (Andhra Pradesh); India-only launch, 8 October 2026
- [x] Released 1.0.2 (commit 227cb92): App Check with reCAPTCHA Enterprise, 8 October 2026
- [x] App Check live in 1.0.2: reCAPTCHA Enterprise loads, Firebase issues App Check tokens (200), no visible badge, no console errors (APP-24), 8 October 2026
- [x] Fraud Defense (reCAPTCHA Enterprise) web key created and registered in Firebase › App Check, 8 October 2026
- [x] App Check switched to the reCAPTCHA Enterprise provider, which takes Google Cloud Fraud Defense keys (site key only, free on Spark) (APP-24), 8 October 2026
- [x] Preliminary trademark search for "TikTym": findings under Public launch › Trademark, 8 October 2026
- [x] App Check code (reCAPTCHA v3), switched on by `VITE_RECAPTCHA_SITE_KEY`; off in test mode and with the emulators (APP-24), 8 October 2026
- [x] Version shown on the login page and in Setup › About (APP-21), shipped in 1.0.0; recorded late, 8 October 2026
- [x] On iPhone 14 Plus: the "New version ready (1.0.1)" bar appeared, Reload updated the app, and the Danger zone shows at the bottom of Setup (APP-22, SET-19), 8 October 2026
- [x] Released 1.0.1 (commit eebd399): Danger zone in Setup, keeping Start over and Delete account away from Sign out, 8 October 2026
- [x] Danger zone: Start over and Delete account moved to a red section at the bottom of Setup, away from Sign out (SET-19), 8 October 2026
- [x] Google sign-in works in the installed app on iPhone 14 Plus: iOS filled the saved account with Face ID and the app came back signed in (AUTH-27), 8 October 2026
- [x] No further app change needed for Google sign-in in the installed iPhone app: the redirect fix (1.0.0) works. The earlier unfocusable email field didn't recur (AUTH-27), 8 October 2026
- [x] iPhone simulator set up (iOS 18.6, iPhone 16 Plus). It did not reproduce the stuck email field: Google's page took focus and typing, 8 October 2026
- [x] Released 1.0.0 (commit 730b51e): first versioned release. Version on login and Setup › About, "New version ready" bar, Google sign-in in iPhone home-screen apps, service worker fix for Google sign-in, 8 October 2026
- [x] "New version ready" bar with Reload, on every screen including login, pinned while scrolling (APP-22), 8 October 2026
- [x] Version numbering: 1.0.0 in package.json, builds stamped with commit and date, `version.json` published and never cached, bump rule in CLAUDE.md (APP-23), 8 October 2026
- [x] Fixed: in iPhone home-screen apps, Google sign-in uses a full-page redirect instead of a pop-up that opened in Safari and never came back (AUTH-27), 8 October 2026
- [x] Google sign-in works in Safari on iPhone 14 Plus and in a laptop browser (AUTH-19), 8 October 2026
- [x] Google switched on (`VITE_ENABLE_GOOGLE=true`) and deployed; the live pop-up reaches Google's sign-in page, 8 October 2026
- [x] Sign-in address `https://tiktym.web.app/__/auth/handler` registered on the tiktym project's OAuth client, 8 October 2026
- [x] Fixed: the offline service worker no longer answers Firebase's `/__/` addresses, which had blocked the Google sign-in pop-up (APP-20), 8 October 2026
- [x] `tiktym.web.app` confirmed under Authorized domains, 8 October 2026
- [x] Google sign-in provider enabled in Firebase, with a support email, 8 October 2026
- [x] Google with an email that already has a password account opens the same account, with its data; tested against the emulator (AUTH-24). No error message needed: Firebase links them, 8 October 2026
- [x] Google sign-in tested end to end against the Auth emulator: first sign-in, defaults, greeting, same data on a second device (AUTH-19, AUTH-25), 8 October 2026
- [x] Timer catches up at once after time away, on iPhone 14 Plus (TIMER-22), 8 October 2026
- [x] Content clears the notch and home indicator on iPhone 14 Plus (APP-18), 8 October 2026
- [x] Installs on iPhone 14 Plus and opens full screen as "TikTym" (APP-03), 8 October 2026
- [x] Screen stays on during a focus timer, checked on a phone (TIMER-07), 8 October 2026
- [x] Installed on a phone as an app and signed in, 8 October 2026
- [x] First real account created and signed in on https://tiktym.web.app, 8 October 2026
- [x] Email/Password sign-in turned on, 8 October 2026
- [x] Deployed to https://tiktym.web.app; loads in Firebase mode, service worker installs, no console errors, 8 October 2026
- [x] `.env.local` filled in from the web app config (Firebase mode, auth domain `tiktym.web.app`), 8 October 2026
- [x] Firestore database created in `asia-south1` (Mumbai), with rules and indexes deployed, 8 October 2026
- [x] Web app `TikTym` added to the Firebase project, 8 October 2026
- [x] Project ID `tiktym` set in `.firebaserc`, 8 October 2026
- [x] Firebase project `tiktym` created; Hosting site is https://tiktym.web.app, 8 October 2026
- [x] Firebase CLI logged in again (`firebase login --reauth`, run outside the repo), 8 October 2026
- [x] Delete account in the app (Setup › Delete account removes all data, then the account), 7 October 2026
- [x] Firebase mode, security rules and sync tested against the local emulators, 7 October 2026
- [x] Browser and unit test suites with HTML reports, 7 October 2026
- [x] Moved to React + TypeScript + Vite, installable and offline-ready, 7 October 2026
- [x] Rebranded from Karma to TikTym, 7 October 2026
