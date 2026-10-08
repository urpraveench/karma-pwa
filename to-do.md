# TikTym to-do

Everything still pending, in the order it should happen. Tick items off as they're done, and add new ones here rather than anywhere else.

**Owner:** **You** means it needs your accounts, devices or a decision. **Claude** means it can be done in a coding session once anything it depends on is in place.

**Last updated:** 8 October 2026

## 1. Go live on Firebase

The app is live at https://tiktym.web.app (project `tiktym`, Firestore in `asia-south1`) and installed on a phone. Nothing left here.


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

No separate API key is needed; Firebase handles OAuth for web apps. Until this is done, the Google button shows a "not set up yet" message.

- [ ] **You:** under Authentication › Settings › Authorized domains, confirm `tiktym.web.app` and `tiktym.firebaseapp.com` are listed.
- [ ] **Claude:** set `VITE_ENABLE_GOOGLE=true` in `.env.local` (keeping `VITE_FIREBASE_AUTH_DOMAIN=tiktym.web.app`, which avoids sign-in failures in iOS Safari and installed apps) and redeploy.
- [ ] **You:** test Google sign-in on your iPhone, in Safari and in the installed app (AUTH-19).
- [ ] **You:** if your TikTym account uses the same email as your Google account, check whether password sign-in still works afterwards (AUTH-26). Firebase removes the password from accounts whose email was never verified; your data stays. Use Forgot password to set a new one if you want both.

## 4. Public launch

- [ ] **You:** write Terms and Privacy pages. **Claude:** set `VITE_TERMS_URL` and `VITE_PRIVACY_URL`, then check the links on the sign-up screen (AUTH-21).
- [ ] **You:** customise the password-reset email template in Authentication › Templates.
- [ ] **You + Claude:** turn on **App Check** (reCAPTCHA Enterprise) so only your app can call Firestore.
- [ ] **You:** check "TikTym" for trademark conflicts before publishing, since it sounds close to "TikTok".
- [ ] **You:** before moving to the paid Blaze plan, set budget alerts on the billing account. Alerts notify you; they don't cap spend.

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
