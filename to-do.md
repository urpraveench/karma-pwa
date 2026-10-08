# TikTym to-do

Everything still pending, in the order it should happen. Tick items off as they're done, and add new ones here rather than anywhere else.

**Owner:** **You** means it needs your accounts, devices or a decision. **Claude** means it can be done in a coding session once anything it depends on is in place.

**Last updated:** 8 October 2026

## 1. Go live on Firebase

The app is live at https://tiktym.web.app (project `tiktym`, Firestore in `asia-south1`) and installed on a phone. Nothing left here.


## Setup layout

- [ ] **Claude (optional, not started):** replace the browser's plain confirm and "Type DELETE" boxes with an in-app confirmation sheet.

## 2. Check by hand before release

These can't be automated, or need the real project and a real phone. IDs refer to [FEATURES.md](FEATURES.md).

- [ ] Install on Android (APP-04); the app opens full screen as "TikTym"
- [ ] Haptics on Android when logging (APP-17)
- [ ] The goal chime plays (TIMER-05)
- [ ] A new deploy reaches the installed app on its next open (APP-07)
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

- [ ] **You:** around 10 October 2026, check Firebase › App Check › APIs: Cloud Firestore and Authentication should show mostly **Verified** requests. Then turn on **Enforce** for both. Firebase › App Check also has a debug token option if you ever need to run the real app on localhost after that.

**Trademark**

- [ ] **You:** search IP India once more for **TikTim** in phonetic mode, classes 9 and 42, to rule out the closest app; then consider filing TikTym in classes 9 and 42 (about ₹4,500 per class).

Preliminary findings (web search, 8 October 2026; not legal advice):

- **TikTim** (tiktim.com), by Chawk Technology: a live daily-planner and productivity app with tasks, reminders and goals. Nearly the same name, spoken identically, in the same category as TikTym. This is the closest conflict.
- **TikTok** (ByteDance) actively opposes "Tik…" names, for example *TickTickTrader* (2023) and domain cases like *tikitoks.com*. It lost against *TIKI* in Singapore (2024), where the visual differences were judged enough. "TikTym" shares "Tik" and the "-T…" rhythm, so expect scrutiny if you file.
- Similar productivity apps: *TikTik, Simple Timer* (time tracking) and *TikTikTik* (metronome).
- `tiktym.com` is registered (GoDaddy, since December 2023, owner not checked). `tiktym.app` and `tiktym.in` lookups were inconclusive.
- Where to search formally: India's trademark search (ipindiaonline.gov.in/tmrpublicsearch), the USPTO (tmsearch.uspto.gov) and WIPO's Global Brand Database (branddb.wipo.int), in class 9 (software) and 42 (online services).

**Other launch items**

- [ ] **You:** account emails (password reset) land in spam because they come from `noreply@tiktym.firebaseapp.com`. Send them from a domain you own: Firebase › Authentication › Templates › **Customize domain**, then add the DNS records Firebase shows (SPF and DKIM) at your domain's DNS host. Tell Claude which domain (AUTH-28).
- [ ] **You:** customise the password-reset email template in Authentication › Templates: sender name **TikTym**, a clear subject such as "Reset your TikTym password", and a reply-to address.
- [ ] **You:** after both, send yourself a reset email and check it arrives in the inbox, not spam (AUTH-28).
- [ ] **You:** before moving to the paid Blaze plan, set budget alerts on the billing account. Alerts notify you; they don't cap spend.

## Go-to-market (see GTM.md)

**Phase 0: Foundations**

- [ ] **You:** add `tiktym.com` (website) and `app.tiktym.com` (app) as custom domains in Firebase › Hosting, and add the DNS records Firebase shows at GoDaddy. Claude will set up the second Hosting site first.
- [ ] **You:** move the Firebase project to the **Blaze** plan and set a budget alert (for example ₹500 a month) before any promotion.
- [ ] **Claude:** link previews for WhatsApp and social: title, description and a preview image (GTM-01).
- [ ] **Claude:** "Send feedback" in Setup, opening an email to support (GTM-02).
- [ ] **Claude:** first-run choice of practices, with an "Exam prep" preset (GTM-03).

**Phase 1: Website**

- [ ] **Claude:** website at `tiktym.com` in `site/`: Home, How it works, Features, Install, For exam students, Privacy promise, FAQ, What's new (GTM-04).
- [ ] **Claude:** feature clips recorded automatically from the app with one command (GTM-05).
- [ ] **Claude:** move the app to `app.tiktym.com`, with `tiktym.web.app` redirecting so installed apps keep working (GTM-06).
- [ ] **You:** add a cookie-free website counter (for example Cloudflare Web Analytics) and send Claude its snippet.

**Phase 2: App stores**

- [ ] **You:** open a Google Play developer account (US$25).
- [ ] **Claude:** package the PWA for Google Play (Trusted Web Activity) and write the store listing (GTM-07).

**Phase 3: Launch**

- [ ] **You:** start Instagram and YouTube accounts for TikTym; 3 short videos a week (study-with-me, backlog streaks, 30-day challenge).
- [ ] **You:** list 20 small study creators and reach out.
- [ ] **You:** join and take part in exam-prep communities (Reddit, Telegram, Discord) before sharing TikTym.
- [ ] **Claude:** shareable streak card for Instagram stories (GTM-08).

## 5. Remaining test gaps

From FEATURES.md › "What's left to test".

- [ ] **Claude:** a failed Firebase save shows "Could not save. Check your connection." (SET-18, SYNC-13)
- [ ] **Claude:** the service worker never caches Firestore or Auth requests (APP-08)
- [ ] **Claude:** days follow the phone's time zone (APP-11)
- [ ] **Claude:** dark mode colours on every screen, as screenshot comparisons (APP-14)

## 6. Features not built yet

- [ ] Reorder practices. `order` exists in the data, but there's no way to change it.
- [ ] Edit a logged entry. Today you delete it and log again.
- [ ] Phase 2, needs Blaze: push reminders, streak-at-risk alerts, a weekly recap, and a timer alert while the app is closed (Cloud Functions + FCM).

## 7. Housekeeping

- [ ] **You (optional):** rename the GitHub repo from `karma-pwa` to `tiktym` (Settings › Repository name), then run `git remote set-url origin https://github.com/urpraveench/tiktym.git`.
- [ ] **Claude:** watch for a Firebase release that drops the flagged `@grpc/grpc-js` version from `npm audit`. It only affects Firebase's Node build, never the app in the browser. Don't run `npm audit fix --force`; it downgrades Firebase.

## Done

Move items here when they're finished, newest first, so there's a record.

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
