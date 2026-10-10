# Notifications plan

How TikTym reaches people about their own practice: onboarding, reminders, recaps and milestones. A plan, not built yet (10 October 2026). Pending work is tracked in [to-do.md](to-do.md) under "Notifications".

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

## Decision (10 October 2026): on by default, easy to switch off

To let an early-stage product reach people, every notification and the usage statistics are **on by default**, and each can be switched off at any time, in the app (Setup › Notifications and privacy) or from a one-tap link in any email. Legally this rests on clear notice at sign-up: the Create account screen says what comes with an account, and the Terms and Privacy Policy describe each item, what it's for, who processes it (Resend for email, Google for Analytics) and how to stop it. Anyone who has already switched something off keeps it off. The website shows a notice with an opt-out rather than asking first; that's the part to check with a lawyer.

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
3. Push: daily reminder (5) and streak at risk (6), then milestones and challenge reminders.

**Phase 3: later**

WhatsApp reminders (opt-in), and native notifications through the Google Play app.

## Open questions for you

1. ~~Phase 2 needs Blaze.~~ Decided 10 October: moving to Blaze now. Aim to have welcome and first-minute emails running before the 100 Days challenge starts on 2 November.
2. ~~Email provider.~~ Decided 10 October: Resend; tiktym.com verified.
3. Which phase 1 in-app items first? Claude's pick: install tip and first-week tips, since they help new users stay past day 3.
