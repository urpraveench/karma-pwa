# Google Play developer account: step by step

A one-off guide for opening TikTym's Google Play developer account and creating the app. When you've finished, delete this file and tell Claude; the Android work starts from there (to-do.md › Phase 2: App stores).

Set aside about an hour for the steps you do, plus Google's own verification time (a few days for a personal account, up to about 30 days for an organisation's D-U-N-S number).

## 1. Decide the account type (today, 5 minutes)

| | Personal | Organisation (Pramal IT Services Private Limited) |
|---|---|---|
| What Google checks | Your government photo ID | The company's **D-U-N-S number** (a free company ID from Dun & Bradstreet), plus the company's details |
| How long | Usually days | Up to about 30 days if the company has no D-U-N-S number yet |
| Testing rule | **12 or more testers in a closed test for 14 days** before you can release to everyone (applies to personal accounts created after 13 November 2023) | That rule is not applied to organisation accounts |
| Fits the Terms | The Terms name the company as the operator, so the store and the Terms would name different parties | Matches the Terms |

**What to do:**

1. Look up whether the company already has a D-U-N-S number: search "D-U-N-S lookup" and use Dun & Bradstreet's free lookup (or D&B India), searching for "Pramal IT Services Private Limited".
2. **If it has one:** open an **Organisation** account.
3. **If it doesn't:** request one for free from Dun & Bradstreet today. If it hasn't arrived by **Friday 23 October**, open a **Personal** account instead, so the closed test can still start on 2 November. The 12-tester rule costs nothing extra, because the ledger test needs a closed test with testers anyway.

Google's help pages disagree on whether a personal account can later become an organisation account, so treat the choice as permanent.

## 2. Have these ready

- [ ] **A Google account you'll keep for good.** It owns the developer account. You can add other people later (Play Console › Users and permissions), but this account stays the owner.
- [ ] **A card for US$25** (one-time, not yearly). Indian cards often block international payments by default: switch on international online transactions in your bank's app first.
- [ ] **Your government photo ID** (passport, driving licence or another ID Google accepts on the screen).
- [ ] **An Android phone** to sign in to the Play Console app; Google asks you to verify access to a real Android device.
- [ ] **A phone number and email** for Google to verify, plus a **public contact email** for the store listing (hello@tiktym.com).
- [ ] **Organisation only:** the D-U-N-S number, the company's registered address, its phone number and the website (https://tiktym.com).

## 3. Create the account

1. Open https://play.google.com/console/signup, signed in with the Google account from step 2.
2. Choose **Personal** or **Organisation** (from step 1).
3. **Developer name:** `TikTym`. It shows under the app's name in the store.
4. Fill in the contact details and accept the Developer Distribution Agreement.
5. Pay the US$25.
6. Complete identity verification (ID upload, or the D-U-N-S check for an organisation).
7. Verify your phone number, your email, and access to an Android phone (install the Play Console app on the phone and sign in, when asked).
8. Wait for Google's confirmation email. Until then, some Play Console pages stay locked.

## 4. Create the app (after the account is verified)

1. Play Console › **Create app**.
2. **App name:** `TikTym`
3. **Default language:** English (India), en-IN
4. **App or game:** App
5. **Free or paid:** **Free.** A free app can still offer subscriptions or in-app purchases later. A paid app can't be changed back to free, and a free one can't be changed to paid.
6. Tick the declarations (Developer Program Policies, US export laws) and create it.
7. Leave **Play App Signing** on (the default). Google keeps the key that signs the app for users; Claude makes a separate upload key that stays outside the repo.

Don't fill in the store listing or the policy forms yet; Claude drafts those (to-do.md).

## 5. Tell Claude, then delete this file

Send Claude:

- [ ] Which account type you opened, and the date Google verified it
- [ ] That the app "TikTym" is created (Free, English (India))

Then delete `PLAY-ACCOUNT.md`. Claude takes it from there: the Android shell, then the first upload. After that first upload, Claude will ask for one more thing: the **app signing key's SHA-256 fingerprint** (Play Console › Test and release › App integrity › App signing), which Google sign-in in the Android app needs.

**Not needed now:** Google's new Android developer verification (from September 2026) starts in Brazil, Indonesia, Singapore and Thailand and is handled through the Play account you're creating; there's nothing extra to do for India yet.
