# Notifications plan

How TikTym reaches people about their own practice: onboarding, reminders, recaps and milestones. Emails, push reminders and the app badge are built; the rest is planned (10 October 2026). Pending work is tracked in [to-do.md](to-do.md) under "Notifications".

## The deciding constraint

| Channel | When it reaches people | Needs | Cost |
|---|---|---|---|
| **In-app** (Today cards, celebrations, a What's new dot) | Only while TikTym is open | Nothing new | Free, works on the current Spark plan |
| **Founder emails, by hand** | Any time | Your Gmail and the sign-up list from Firebase › Authentication | Free; fine for the first 50 or so users |
| **Email from TikTym** (noreply@tiktym.com) | Any time | A scheduled job (Cloud Functions, **Blaze**) and an email provider (Resend or Brevo; free tiers cover thousands a month) with SPF and DKIM on tiktym.com | Low: Blaze usage at this scale is near zero; set a budget alert first |
| **Push notifications** | Any time, on the phone's lock screen | A scheduled job (**Blaze**) and Firebase Cloud Messaging (free). Android: Chrome, installed or not. iPhone: only when TikTym is added to the home screen (iOS 16.4+) | Free beyond Blaze |
| **WhatsApp** | Any time; India's favourite channel | WhatsApp Business API through a provider, pre-approved message templates, explicit opt-in | Paid per conversation; later |

Anything sent while the app is closed needs Blaze. Everything else can start now.

## What to send

| # | Notification | Trigger | Best channel | Phase |
|---|---|---|---|---|
| 1 | **Welcome** | Right after sign-up | Founder email by hand now; automatic email later | 1, then 2 |
| 2 | **Install tip**: add TikTym to the home screen | First open in a browser tab, not installed | In-app card | 1 |
| 3 | **First minute nudge** | Signed up, nothing logged after 24 hours | Email | 2 |
| 4 | **First-week tips** (timer, carry-forward, Insights) | Days 2, 4, 6, one each, only while active | In-app card; email if absent | 1, then 2 |
| 5 | **Daily reminder** at a time you choose | Your chosen time, if today isn't cleared | Push | 2 |
| 6 | **Streak at risk** | Evening, a streak of 3+ days, nothing logged today | Push | 2 |
| 7 | **Comeback** | 3 days with no entries | Email (push is easy to ignore after a gap); the in-app "Welcome back" card already exists | 2 |
| 8 | **Weekly recap**: last week's points, best day, streak, one suggestion | Monday morning | Email, plus the in-app Monday card that already exists | 2 |
| 9 | **Milestones**: first 10 hours, 7- and 30-day streaks, a practice's 100th hour | When reached | In-app celebration (exists for clearing a day); push for big ones | 1, then 2 |
| 10 | **Monthly progress card ready** | 1st of the month | In-app card (the share card exists); email | 1, then 2 |
| 11 | **What's new** after an update | First open after a new version | In-app dot on Setup › About › What's new | 1 |
| 12 | **Feedback ask** | After 7 active days | In-app card linking Send feedback | 1 |
| 13 | **Challenge reminders** (100 Days, 100 Minutes) | Daily during the challenge, for those who joined | Push; weekly email check-in | 2 |
| 14 | **Product news** (big features, challenges) | Occasionally, at most monthly | Email, opt-in only | 2 |
| 15 | **App badge**: practices still due today, as a number on the home-screen icon | Set while the app is open; refreshed by each reminder | Badge (see "App badge" below) | 2, with push |

## Decision (10 October 2026): on by default, easy to switch off

To let an early-stage product reach people, every notification and the usage statistics are **on by default**, and each can be switched off at any time, in the app (Setup › Notifications and privacy) or from a one-tap link in any email. Legally this rests on clear notice at sign-up: the Create account screen says what comes with an account, and the Terms and Privacy Policy describe each item, what it's for, who processes it (Resend for email, Google for Analytics) and how to stop it. Existing accounts (Praveen's friends at the time) are on straight away too; Praveen tells them personally instead of an in-app notice (his decision, 10 October 2026), and the Privacy Policy now says changes are announced "in the app or by email or message". Statistics choices stored before 1.8.0 (mostly the old unticked sign-up box) no longer count; turning statistics or an email off from 1.8.0 on is respected. The website shows a notice with an opt-out rather than asking first; that's the part to check with a lawyer.

## Email schedule (agreed 10 October 2026)

Three switches in Setup › Notifications and privacy control them: **Tips and reminders**, **Weekly recap** and **News about TikTym**.

| Email | When | Who gets it | Switch | Status |
|---|---|---|---|---|
| Welcome | Right after first-run Start | Every new account | Tips and reminders | Built |
| One tap away | About 24 hours after signing in | Only if first-run Start never happened (signed in, stopped at the practice picker): picking takes under a minute, 100 minutes is only the suggested start. Added 10 October 2026, after an account signed in with Google and got no email at all | Tips and reminders | Built |
| First-minute nudge | About 24 hours after Start | Only if nothing has been logged | Tips and reminders | Built |
| First-week tips | Day 3 and day 6 after Start | Only while still using TikTym; one tip each (day 3: the focus timer; day 6: Insights and your best time of day) | Tips and reminders | Planned |
| Comeback | 9 am IST, after 3 full days with nothing logged | Once per absence, for absences that began in the last 2 weeks: "you don't need to make up for the missed days", 5 minutes of the shortest practice | Tips and reminders | Built (on the queue) |
| Weekly recap | Monday, 8 am IST | Anyone who logged something in the last 2 weeks: last week's minutes against the targets, days shown up, best day, each practice with a bar, the show-up streak, one gentle suggestion; after a quiet week, a short "5 minutes today" note instead | Weekly recap | Built |
| Monthly progress | 1st of the month, 8 am IST | Active users: the month's progress card is ready to share | Weekly recap | Planned |
| News | When there's something to announce, at most monthly | Everyone with News on (e.g. the 100 Days, 100 Minutes launch), text approved by Praveen | News about TikTym | Planned |

**Email rules:**

- At most one email a day per person; if two are due, the more useful one goes and the other waits. Built for the comeback: `mail/{uid}.lastEmailDay` records the India date of the last email, and the comeback waits a day if it's today.
- Sent in the morning, India time (around 8 am), never at night. (The welcome goes straight away, since the person just started.)
- One comeback per absence. Someone who doesn't come back after it hears nothing more about it; the weekly recap stops too once they've been away two weeks; only occasional news continues.
- Each email respects its switch and carries its own unsubscribe link.
- Signed by Praveen, "Helping busy people like you make time for what matters."; no company name or title.

**Build order** (after the 1.8.0 release): weekly recap → comeback → news broadcast (in time to announce the 100 Days challenge in late October) → first-week tips → monthly progress (before 1 November).

## App badge (agreed 10 October 2026)

The number on TikTym's home-screen icon shows **practices still due today**: 4 practices means 4, and the badge clears once the day is cleared. A practice logged only partly (15 of 30) still counts. It never counts minutes: a badge reading 40 or 100 feels like a debt, and 100 minutes is a starting point, never a requirement.

- **Where it works:** iPhone and iPad with TikTym on the home screen (iOS 16.4+), only once notifications are allowed for TikTym; installed on a computer from Chrome or Edge. **Not on Android**: Android has no number badges for web apps, nor for the Google Play version, which wraps the same web app. On Android, push reminders do this job.
- **Why it waits for push:** a web app can change its badge only while it runs. Set only while the app is open, the badge goes stale overnight (yesterday's "1" still shows in the morning, and a new day's "4" never appears). So it ships with push: the app sets it while open and clears it when the day is cleared; each daily reminder sets the new day's count. (A silent refresh isn't possible: iPhone requires every push to show a notification.)
- **Setting:** "Show count on app icon" in Setup › Notifications and privacy, on by default like the others.

## Push reminders (built 10 October 2026)

- **Delivery:** standard web push with TikTym's own key pair (VAPID): the public half is in `src/lib/reminders.ts`, the private half is the `VAPID_PRIVATE_KEY` secret. No Firebase Cloud Messaging. Works in Chrome, Edge, Firefox and Samsung Internet on Android and computers, and on iPhone only from the home screen (iOS 16.4+).
- **Asking:** never on first open. Once something is logged today, Today offers "Remind me at <this time>" (rounded to the quarter hour, 7 am to 9:45 pm). Also Setup › Daily reminder, with the time. "Not now" ends the offer for good.
- **Data:** each device that allowed notifications is `users/{uid}/devices/{hash of endpoint}`; the reminder time and time zone are in the settings. A trigger keeps the server-only `reminders/{uid}` (UTC slot, device count, lastSent).
- **Sending (the queue design):** `remindersDue` runs every 15 minutes, queries `reminders` for the current UTC slot, and queues one task each; `reminderSend` (20 a second, retried) works out what's left today with the app's own backlog code (`functions/src/shared/`, generated by `npm run functions:shared`), skips a clear day, sends to every device, and removes devices the push service says are gone. Once a day, never after 10 pm local time; daylight saving is corrected on the day.
- **Badge:** the app sets it while open (practices left today, cleared when clear); each reminder carries the count and the service worker (`public/push-sw.js`) sets it. Not on Android. iPhone requires notifications to be allowed.
- **Evening log check (agreed 12 October 2026, NOTIF-18):** at 8 pm local, "Did you log what you did today? Tap the mic and just say it." for every account with notifications allowed, on by default (Setup › Evening log check), independent of the daily reminder. Sent only if nothing is logged that day and something was due, once a day, never within an hour after the daily reminder, never after 10 pm. Same 15-minute job and queue: `reminders/{uid}.nudgeSlot` (8 pm as a UTC slot), `nudgeSent`, and `lastSentAt` from the daily reminder for the one-hour gap. Records from before it get `nudgeSlot` the next time their daily reminder runs; an account with the daily reminder off gets it when its settings or devices next change.
- **Not yet:** streak-at-risk (evening), which must fit around the daily reminder and the evening log check.

## Scaling the emails (worked out 10 October 2026)

Check this whenever we plan for growth. **The comeback email and the weekly recap are both on the scalable design** (a trigger keeps `mail/{uid}.lastLogged`; the comeback's 9 am job queries only people away 4 to 14 days, and the recap's Monday 8 am job only people with an entry in the last two weeks; each queues one task per person, sent 2 a second with retries). The recap moved to the queue on 10 October 2026 (NOTIF-16); the loop it replaced is described below for the record.

**How the weekly recap worked until 10 October 2026:** one scheduled function goes through every account, one at a time: read the account (~0.2 s), send through Resend (~0.3 s), then wait 0.6 s to stay under Resend's free-plan rate (2 emails a second). About **1 second per person**. Working out the week itself takes under a millisecond per person; it's never the bottleneck.

**Limits, in the order we'll hit them:**

| Active users | What breaks | Fix |
|---|---|---|
| ~80 | **Resend's free plan: 100 emails a day, 3,000 a month.** Monday's recaps plus that day's welcomes pass 100; the rest fail (logged, not retried that week) | Upgrade Resend (about $20 a month for 50,000 emails; covers 10,000 weekly users) |
| ~400 to 500 | ~~**A scheduled function stops after 9 minutes**, so only the first ~500 people get a recap~~ | Done: the queue design below (10 October 2026) |
| 10,000 | Resend's plan (about 70,000 emails a month with the planned monthly and news emails: the $90 Scale plan). At 2 a second, 10,000 recaps take about 85 minutes, from 8 to about 9:25 am | Raise the queue's rate if Resend's plan allows more than 2 a second; or batch sending (below) |

Firestore cost isn't a concern: about 8 reads per person, so 80,000 reads a week at 10,000 users, a few rupees.

**The scalable design (about half a day of work):**

1. **Queue, not a loop.** (Built for the recap and the comeback.) At 8 am a small job lists who should get a recap and adds one task per person to a Cloud Tasks queue (Firebase task-queue functions). The queue runs them in parallel at a set rate and retries failures, so nothing hits the 9-minute limit and a failed send isn't lost. Keep `mail/{uid}.recapWeek` so a retry never sends twice.
2. **Batch sending.** Resend's batch API takes up to 100 emails a request.
3. **Only active people.** (Built.) A trigger keeps `mail/{uid}.lastLogged` as entries are saved; the jobs query it instead of listing every sign-up.
4. **Spread the send** across 8 to 9 am, so a big send doesn't look like spam to Gmail.

The same design carries the monthly progress, comeback and news emails, so build it once and use it for all of them.

**When:** keep today's version while users are few. Upgrade Resend at about 50 active users. Build the queue design **before the 100 Days, 100 Minutes challenge on 2 November**, when sign-ups could jump.

## Rules for all of them

- **On by default, off with one tap, per type** (see the decision above). A Notifications and privacy section in Setup with a switch for each: welcome and first-week tips, weekly recap, product news, reminders (once push exists), and usage statistics. Account emails such as password reset can't be switched off.
- **Ask for push permission at the right moment**: after someone logs their first minutes and taps "Remind me tomorrow", never on first open. A browser blocks a site for good once the prompt is refused.
- **Quiet and few.** At most one push a day, nothing between 10 pm and 7 am in the person's time zone, and no reminder once today is cleared.
- **Every email has a one-tap unsubscribe** that works without signing in, switches that email type off in the account, and says why it was sent.
- **Privacy:** update the Privacy Policy before phase 2 (what is sent, why, the email provider as a processor, how to stop), in line with India's DPDP Act. Reminder times and preferences are stored in the person's own account data.
- **Measure:** count sends, opens and the logs that follow in the anonymous daily totals, so we can tell which ones help and drop the ones that don't.

## Phases

**Phase 1: now, free, no Blaze**

1. Founder welcome emails by hand to every new sign-up (template in OUTREACH.md). Personal emails from the founder work better than automated ones for the first users.
2. In-app: install tip (2), first-week tips (4), milestone celebrations (9), progress-card reminder (10), What's new dot (11), feedback ask (12). They build on the Today cards that already exist.

**Phase 2: with Blaze (before real promotion)**

1. Notification settings in Setup and the updated Privacy Policy.
2. Email from noreply@tiktym.com: welcome (1), first-minute nudge (3), comeback (7), weekly recap (8).
3. Push: daily reminder (5) and streak at risk (6), with the app badge (15), then milestones and challenge reminders.

**Phase 3: later**

WhatsApp reminders (opt-in), and native notifications through the Google Play app.

## Open questions for you

1. ~~Phase 2 needs Blaze.~~ Decided 10 October: moving to Blaze now. Aim to have welcome and first-minute emails running before the 100 Days challenge starts on 2 November.
2. ~~Email provider.~~ Decided 10 October: Resend; tiktym.com verified.
3. Which phase 1 in-app items first? Claude's pick: install tip and first-week tips, since they help new users stay past day 3.
