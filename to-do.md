# TikTym to-do

Everything still pending, in the order it should happen. Tick items off as they're done, and add new ones here rather than anywhere else.

**Owner:** **You** means it needs your accounts, devices or a decision. **Claude** means it can be done in a coding session once anything it depends on is in place.

**Last updated:** 8 October 2026


## Setup layout

- [ ] **Claude (optional, not started):** replace the browser's plain confirm and "Type DELETE" boxes with an in-app confirmation sheet.

## 2. Check by hand before release

These can't be automated, or need the real project and a real phone. IDs refer to [FEATURES.md](FEATURES.md).

- [ ] Install on Android (APP-04); the app opens full screen as "TikTym"
- [ ] Haptics on Android when logging (APP-17)
- [ ] **You:** after the fix, run the 5-minute Meditation test again: the chime should play right as the timer reaches its target (TIMER-05).
- [ ] The loading screen shows briefly on a slow connection (FIRST-03)
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

- [ ] **You (blocked, 8 October 2026):** Firebase refuses to save template changes for this project: "Email template updates are currently unavailable for this project. For assistance with template changes, contact Firebase support." Likely an anti-spam restriction on new or Spark-plan projects (unconfirmed). The plain default email works and reaches the inbox, so it stays for now. After moving to Blaze, try pasting `email/password-reset.html` again; if it's still refused, ask Firebase support (console › ? › Contact support). If it's never allowed, send account emails ourselves (Cloud Function + Resend or Brevo from noreply@tiktym.com, needs Blaze) (AUTH-29).
- [ ] **You:** before moving to the paid Blaze plan, set budget alerts on the billing account. Alerts notify you; they don't cap spend.

## Go-to-market (see GTM.md)


**Phase 0: Foundations**

- [ ] **You:** stay on the free Spark plan for now (decided 8 October). Watch usage weekly in Firebase › Usage and billing; GTM.md › "Capacity on the free plan" lists the limits and what hits them first. Move to Blaze with a budget alert before any real promotion.
- [ ] **Claude (optional):** first-run choice of practices, so people can adjust the defaults before day one; the current defaults already suit professionals (GTM-03).

**Phase 1: Website**

Move the app to `app.tiktym.com` (GTM-06, GTM-08, GTM-09). The same Hosting site serves both addresses, so the old one keeps working; nothing is deployed until the new address is live.


**Phase 2: App stores**

- [ ] **You:** open a Google Play developer account (US$25).
- [ ] **Claude:** package the PWA for Google Play (Trusted Web Activity) and write the store listing (GTM-07).

**Phase 3: Launch**

- [ ] **You:** set up a TikTym company page on LinkedIn; post 3 times a week (building in public, "busy weeks carry forward", monthly progress with Insights screenshots).
- [ ] **You:** run a 30-day learning challenge with your network, using TikTym.
- [ ] **You:** take part in r/developersIndia, r/IndianWorkplace and tech Slack/Discord communities before sharing TikTym.
- [ ] **You:** list 10 productivity or career newsletters and creators and pitch them.

## Anonymous usage totals


## 5. Remaining test gaps

From FEATURES.md › "What's left to test". None left: every scenario has a test, or is under "Check by hand before release".


## 6. Features not built yet

- [ ] **Claude:** look into a narrow race found while testing (8 October 2026): in Firebase mode, an entry logged about 40 ms before the page reloads was lost, every time; with 300 ms or more it is always kept. Likely Firestore hadn't put the write in its offline queue yet. No one closes the app that fast, but check whether locking the phone straight after a quick tap can lose one, and whether waiting for the queue on `pagehide` helps. It may also explain the occasionally flaky Google test AUTH-19, which logs and then at once opens a second device.
- [ ] **Claude (before scale):** load only recent months on app open, using the offline cache for older ones. Today every open downloads a user's full history: fine now, but after a year it is about 230 KB and 17 reads per open, which makes Firestore's free 10 GiB/month egress the first limit for long-time users.
- [ ] Phase 2, needs Blaze: push reminders, streak-at-risk alerts, a weekly recap, and a timer alert while the app is closed (Cloud Functions + FCM).

## 7. Housekeeping

- [ ] **You (optional):** rename the GitHub repo from `karma-pwa` to `tiktym` (Settings › Repository name), then run `git remote set-url origin https://github.com/urpraveench/tiktym.git`.
- [ ] **Claude:** watch for a Firebase release that drops the flagged `@grpc/grpc-js` version from `npm audit`. It only affects Firebase's Node build, never the app in the browser. Don't run `npm audit fix --force`; it downgrades Firebase.

## Done

Move items here when they're finished, newest first, so there's a record.

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
