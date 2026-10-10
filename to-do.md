# TikTym to-do

Everything still pending, in the order it should happen. Tick items off as they're done, and add new ones here rather than anywhere else.

**Owner:** **You** means it needs your accounts, devices or a decision. **Claude** means it can be done in a coding session once anything it depends on is in place.

**Last updated:** 8 October 2026


## Setup layout

- [ ] **Claude (optional, not started):** replace the browser's plain confirm and "Type DELETE" boxes with an in-app confirmation sheet.

## 2. Check by hand before release

These can't be automated, or need the real project and a real phone. IDs refer to [FEATURES.md](FEATURES.md).

- [ ] From 11 October: run `firebase firestore:backups:list --project tiktym` and check a daily backup appears each day (SYNC-17)
- [ ] Once, before real promotion: a restore drill. Restore the latest backup into a new database (README › Backups and restoring), check it in the console, then delete it (SYNC-17)
- [ ] A day after signing up with the spare test account (without logging anything), check the first-minute nudge arrives (NOTIF-04)
- [ ] After the comeback email is deployed: the next morning, `firebase functions:log --only comebackDaily` shows how many were queued; for a test account left 3 full days without an entry, check the comeback arrives at about 9 am, only once (NOTIF-07)
- [ ] The first Monday after the weekly recap is deployed: check it arrives at about 8 am for an account that logged last week, that the numbers match History for that week, and that the function's log says how many went (NOTIF-06)
- [ ] After push reminders are deployed: on an iPhone with TikTym on the home screen and on Android Chrome, allow reminders, set a time 15 minutes ahead, and check the reminder arrives once, names what's left, and opens TikTym; `firebase functions:log --only reminderSend` shows it (NOTIF-09)
- [ ] After push reminders are deployed: on an iPhone with TikTym on the home screen and notifications allowed, the icon shows the number of practices left today, updates after the reminder, and clears when the day is clear (NOTIF-13)
- [ ] **You:** remove the last line of the LinkedIn page description ("TikTym is built by Pramal IT Services Private Limited.") in LinkedIn › Edit page
- [ ] Install on Android (APP-04); the app opens full screen as "TikTym"
- [ ] Haptics on Android when logging (APP-17)
- [ ] **You:** after the fix, run the 5-minute Meditation test again: the chime should play right as the timer reaches its target (TIMER-05).
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


**Phase 2: App stores**

- [ ] **You:** open a Google Play developer account (US$25).
- [ ] **Claude:** package the PWA for Google Play (Trusted Web Activity) and write the store listing (GTM-07).

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


- [ ] **Claude (before scale):** load only recent months on app open, using the offline cache for older ones. Today every open downloads a user's full history: fine now, but after a year it is about 230 KB and 17 reads per open, which makes Firestore's free 10 GiB/month egress the first limit for long-time users.
- [ ] **Idea (from content, 9 October 2026):** hours towards mastery: each practice's lifetime hours against 10,000 (e.g. "Course study: 42 of 10,000 hours"), for the 10,000-hour posts. Decide after first users' feedback.
- [ ] **Idea (from content, 9 October 2026):** a challenge view for 100 Days, 100 Minutes (30 Exercise, 30 Reading, 30 Upskilling, 10 Meditation; a day counts when Today is cleared, carried minutes included): "Day 34 of 100", days won, and a shareable challenge card. Only if the challenge goes ahead; streaks and the progress card cover the start.
- [ ] Phase 2, needs Blaze: push reminders, streak-at-risk alerts, a weekly recap, and a timer alert while the app is closed (Cloud Functions + FCM).

## Notifications (see NOTIFICATIONS.md)

Decided 10 October 2026: everything on by default, each switchable off in Setup or from any email. Emails come from "Praveen from TikTym" <hello@tiktym.com>, replies to the support Gmail; the welcome goes out after first-run Start.

- [ ] **You:** create a Resend API key (Sending access, tiktym.com) and store it with `firebase functions:secrets:set RESEND_API_KEY --project tiktym`. Never paste it into chat or code.
- [ ] **You:** send a personal welcome email to each new sign-up until the automatic one is live.
- [ ] **You:** have a lawyer check the updated Terms and Privacy Policy, especially on-by-default analytics on the website.
- [ ] **You:** upgrade Resend to a paid plan at about 50 active users; the free plan's 100 emails a day runs out on Mondays at about 80 (NOTIFICATIONS.md › Scaling the emails).
- [ ] **Claude:** before 2 November (the 100 Days challenge): move the weekly recap onto the queue the comeback already uses (one task per person, rate-limited, retried), querying `mail/{uid}.lastLogged` so only active people are looked at; batch sending if needed. Today's recap loop stops at about 500 people (NOTIFICATIONS.md › Scaling the emails).
- [ ] **Claude:** news broadcast: Praveen approves the text, it goes to everyone with News on; first use, announcing 100 Days, 100 Minutes in late October.
- [ ] **Claude:** first-week tips emails on days 3 and 6, only while still active (Tips and reminders).
- [ ] **Claude:** monthly progress email on the 1st (Weekly recap switch), first on 1 November.
- [ ] **Claude:** the "at most one email a day, mornings IST" rule across all scheduled emails.
- [ ] **Claude:** streak-at-risk push (evening, 3+ day streak, nothing logged), within the one-push-a-day rule. After daily reminders are live.
- [ ] **Claude:** phase 1 in-app: install tip, first-week tips, milestone celebrations, progress-card reminder, What's new dot, feedback ask.

## 7. Housekeeping

- [ ] **You (optional):** rename the GitHub repo from `karma-pwa` to `tiktym` (Settings › Repository name), then run `git remote set-url origin https://github.com/urpraveench/tiktym.git`.
- [ ] **Claude:** watch for a Firebase release that drops the flagged `@grpc/grpc-js` version from `npm audit`. It only affects Firebase's Node build, never the app in the browser. Don't run `npm audit fix --force`; it downgrades Firebase.

## Done

Move items here when they're finished, newest first, so there's a record.

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
