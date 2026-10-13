# TikTym go-to-market plan

Day-to-day outreach (tasks, messages, tracking links, logs) is in [OUTREACH.md](OUTREACH.md).

How TikTym gets its first users in India, and what has to be true before it does. Pending steps are tracked in [to-do.md](to-do.md) under "Go-to-market"; this file is the why.

## Strategy (decided 13 October 2026)

**The thesis.** A working professional who wants to grow needs a daily ritual: 100 minutes for body, mind, career and reading (700 a week, about 3,000 a month; a bad day is made up at the weekend). People don't grow because nobody measures the positive side of their day. The phone measures every minute scrolled (Indians average about 5 hours of phone time a day, about 2.5 hours of it on social media), buries that number in Settings, and measures nothing they invest in themselves.

**The gap TikTym fills: the ledger.** Minutes invested against minutes scrolled, in one unit, always in view on the home screen. Blocking apps (Opal, one sec) take time away but leave it empty; single-purpose apps measure one side of life; Digital Wellbeing measures only consumption. Nobody shows both sides together, and nobody turns freed minutes into a planned 100.

**Why Android first.** Measuring scrolled minutes automatically needs a native app (a web app can't read usage; people won't send screenshots). Android gives exact per-app minutes through Usage access and runs on most phones in India. iPhone gives only approximate minutes (15-minute thresholds) and needs Apple's Family Controls approval; it follows if the Android test passes. Current users who allowed notifications lean iPhone (4 of 6 devices, 13 October), so Android testers must be recruited deliberately.

**How it's built.** Capacitor: the existing React app, tested by 339 scenarios, runs inside a native shell; only the widget, the usage reader, native Google sign-in and push (FCM) are native code, kept small and isolated. The web app stays for iPhone and computers. Revisit only if the app is clearly slow on a low-end Android phone (more than about 2 seconds to open) or the ledger test points to a native-first product.

**The test that decides what's next (Mon 30 November 2026).** Testers join with the 100 Days, 100 Minutes challenge on 2 November. Pass: at least half of the Android testers scroll 15% or more less and invest more in week 4 than in week 1. Pass → public Play release, then the iPhone app. Fail → interview the testers, try the "swap" prompt, and keep what was built (the Play app, the testers, the data).

**Parked until then:** pivots to courses, coaching institutes or a company version; AI coach features other than the ledger; monthly progress and first-week emails; the iPhone native app.

**Decided, 8 October 2026:** the name stays **TikTym** (no IP India results for "TikTym", nor for "TikTim" in phonetic search), the domain is **tiktym.com** (owned), and the first audience is **working professionals**.

## Who it's for

**First: working professionals in India** who want to keep learning and stay well alongside a full-time job: upskilling (courses, certifications such as cloud, data or AI), reading, a side project, exercise, meditation.

- Their problem isn't motivation, it's busy weeks: a sprint, a release, travel, and the 30 minutes a day quietly disappear. Most habit apps answer that with a broken streak and guilt.
- TikTym answers it with a **backlog that has a limit**: missed minutes carry forward, but never more than a couple of days' worth, so one heavy week never buries you.
- They're reachable in a few places: LinkedIn above all, X/Twitter, Reddit (r/developersIndia, r/IndianWorkplace, r/productivity, r/getdisciplined), Slack and Discord tech and product communities, and productivity newsletters and YouTube.

**Pitch:** *Make time for what you're learning. One minute, one point. Busy weeks carry forward, never pile up.*

**Why TikTym, in their terms:**

- Every minute spent on a goal is a point; the day is a mala of 108 beads to fill.
- A busy day carries forward, up to a limit you choose, so it's never a hole you can't climb out of.
- A focus timer for a focused block, with the screen kept on and the minutes logged for you.
- A weekly comparison with last week, and coaching on what's slipping and what's improving.
- Works offline (the commute), free, no ads, data stored in India.
- The default practices (Exercise, Reading, Course study, Meditation) already fit this audience.

**Later audiences:** students preparing for competitive exams ("backlog" is their own word for the syllabus they're behind on); yoga, meditation and japa practitioners; fitness routines. Teams are a later B2B angle: a company "30-day learning challenge" for L&D.

## Phase 0: Foundations (before any promotion)

| Step | Why |
|---|---|
| Point `tiktym.com` and `app.tiktym.com` at Firebase Hosting | A real address for the website and the app |
| Send account emails from `tiktym.com` (SPF/DKIM) with a TikTym template | Reset emails currently land in spam |
| Move to the Blaze plan with budget alerts | The free plan stops the app for the day after roughly 3,000 opens (50,000 reads at about 17 per open) |
| App Check Enforce | Protect the database before strangers arrive |
| Link previews (title, image, description) | WhatsApp is where sharing happens in India; today a link shows as a bare URL |
| "Send feedback" in the app | Early users are the product team |
| First-run choice of practices (optional) | Today's defaults already suit professionals; let people adjust them before day one |

## Phase 1: Website (tiktym.com)

The website lives at `tiktym.com`; the app lives at `app.tiktym.com` (`tiktym.web.app` sends browser tabs there, and apps installed from it keep working with a "TikTym has moved" bar). Both are Firebase Hosting sites in the same project. The website sits in this repo (`site/`) and ships with the same release process.

**Pages**

- **Home:** the pitch, an "Open TikTym" button, a looping preview of the mala filling.
- **How it works:** set practices, log minutes or run the timer, clear your backlog.
- **Features**, each with a short looping clip: Today and the mala, the focus timer, backlog carry-forward and the limit, moments, Insights, offline, export and privacy. FEATURES.md is the source of truth for this page.
- **Install:** step-by-step for iPhone (Share › Add to Home Screen) and Android.
- **For working professionals:** the pitch in their words, a sample setup (Course study, Reading, Exercise, Meditation), a 30-day learning challenge.
- **Privacy promise, FAQ, What's new** (from the releases in to-do.md), Terms and Privacy.

**Clips:** short looping videos (autoplay, silent, looping) rather than GIFs: the same look at about a tenth of the size. They're recorded automatically from the real app with the browser-test setup (sample data, fixed date), so one command refreshes every clip after a release.

**Measurement:** a cookie-free, privacy-friendly counter on the website only (for example Cloudflare Web Analytics). The app stays analytics-free, as the Privacy Policy promises.

## Phase 2: App stores

- **Google Play (first, from October 2026):** a Capacitor Android app with the ledger and the home-screen widget (see Strategy). US$25 one-time developer fee; a personal account needs 12 or more testers in a closed test for 14 days before release to everyone.
- **Apple App Store:** after the ledger test passes: Capacitor plus Swift extensions for Screen Time thresholds, the widget and an intercept screen. US$99 a year, and Apple must approve the Family Controls entitlement first.

## Phase 3: Launch and growth (weeks 4–12)

| Channel | Plan |
|---|---|
| LinkedIn (primary) | Founder and company posts 3 times a week: building TikTym in public, the "busy weeks carry forward" idea, monthly "what I learned" posts with real TikTym insights screenshots, carousels on making time to learn |
| A 30-day learning challenge | Invite your network to log 30 minutes of learning a day for 30 days in TikTym; share progress weekly. Gives people a reason to start together |
| X/Twitter and Reddit | Take part genuinely in r/developersIndia, r/IndianWorkplace, r/productivity and r/getdisciplined; share TikTym when it answers a real question |
| Communities | Slack and Discord tech and product communities, alumni groups, your company's network |
| Newsletters and YouTube | Pitch productivity and career newsletters and creators for a mention or review |
| Search | A weekly article ("How to make time to learn with a full-time job", "Habit tracker for busy weeks", honest comparisons with Habitica, Forest and Streaks) |
| Product Hunt and Show HN | One launch each, for credibility with a tech-savvy audience |

**Growth built into the app (later):** a one-tap progress card sized for LinkedIn and Instagram ("12-day streak · 47 hours of learning this month"), then accountability partners who can see each other's streaks.

## Measuring success

Starting targets, to revise with real data:

| Metric | Target |
|---|---|
| Visits → sign-ups | Track from day one |
| Activation: logs something on day 1 | 60% or more |
| 7-day retention: still logging after a week | 25% or more |
| Weekly active loggers | The main health number |

Firebase already shows sign-ups. Any in-app counting (anonymous daily totals only) needs a Privacy Policy update first.

## Capacity on the free plan

Worked out on 8 October 2026 (emails added 10 October) from Firebase's published Spark limits and TikTym's measured behaviour. Assumes an active user opens the app 3 times a day and logs 4 entries.

| Limit (Spark plan) | What uses it | Roughly how many users |
|---|---|---|
| reCAPTCHA (App Check): 10,000 checks a month | one check whenever a device needs a new App Check token | **about 100 daily users** with the default 1-hour tokens; **about 2,000** with 7-day tokens |
| Firestore reads: 50,000 a day | each open reads every practice, every month of history, and settings: about 6 reads for a new user, 17 after a year | about 2,700 daily users (new) down to about 1,000 (a year of history) |
| Firestore writes: 20,000 a day | one per log, edit or undo; 6 at sign-up | about 5,000 daily users |
| Firestore egress: 10 GiB a month | each open downloads the full history: about 20 KB for a new user, about 230 KB after a year | about 5,000 users in their first month; about 500 daily users with a year of history |
| Firestore storage: 1 GiB | about 19 KB per user per month | about 4,500 user-years |
| Hosting transfer: 360 MB a day, shared by app and website | a new device's first app load: 360 KB; a returning open: a few KB; a website visit: 113 KB (bounce) to 712 KB (every clip) | about 1,000 new installs or website visits a day |
| Authentication: 50,000 monthly active users | sign-ins | not a limit at this stage |
| Resend (emails), free plan: 100 a day, 3,000 a month | welcome, first-minute nudge, weekly recap (Mondays), later monthly progress, comeback and news | **about 80 active users** (Monday's recaps pass 100 a day); upgrade before then |
| Scheduled function: 9 minutes a run | the scheduled jobs only list who's due; the weekly recap and comeback are sent from a queue, 2 a second (since 10 October 2026) | not a limit; 10,000 recaps take about 85 minutes |

**What this means**

- Today, the first limit is App Check's 10,000 reCAPTCHA checks. Setting App Check's token time to live to 7 days moves it to about 2,000 daily users.
- After that, Firestore reads (about 1,000–2,700 daily users) and Hosting transfer (about 1,000 new installs or website visits a day) come next. One good LinkedIn post can reach the Hosting limit.
- When a free limit runs out, that service stops until it resets: daily limits at midnight Pacific time (about 12:30–1:30 pm in India), monthly ones at the start of the month. Data isn't lost, but the app or site stops working until then.
- Move to Blaze, with a budget alert, before any real promotion. At these volumes it costs little.
- Before growing past about 1,000 long-term users, change the app to load only recent months on each open (in to-do.md).
- Emails run out first among the paid-plan services: upgrade Resend at about 50 active users, and the scheduled emails are on a queue (done 10 October). Details: NOTIFICATIONS.md › Scaling the emails.
- **Whenever we plan for growth** (a promotion, a challenge, a big post), go through this table and NOTIFICATIONS.md › Scaling the emails first.

## Running costs

| Item | Cost |
|---|---|
| Domain (tiktym.com) | about ₹1,000 a year (owned) |
| Google Play developer account | US$25 once |
| Trademark (optional, recommended) | about ₹4,500 per class, classes 9 and 42 |
| Firebase Blaze | pay-as-you-go; small at early scale, capped in practice by budget alerts |
| Newsletters and creators | free mentions and reviews to start |

## Keeping it running

- One release process for the app and the website: version bump, "What's new", clips re-recorded.
- One support email, replies within 48 hours.
- Review this plan monthly against the metrics above.
