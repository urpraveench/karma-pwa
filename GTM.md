# TikTym go-to-market plan

How TikTym gets its first users in India, and what has to be true before it does. Pending steps are tracked in [to-do.md](to-do.md) under "Go-to-market"; this file is the why.

**Decided, 8 October 2026:** the name stays **TikTym** (no IP India results for "TikTym"), the domain is **tiktym.com** (owned), and the first audience is **students preparing for competitive exams**.

## Who it's for

**First: exam aspirants** (JEE, NEET, UPSC, CAT, GATE and state exams).

- They already track study hours, and "study with me" timers are a daily habit.
- "Backlog" is their own word for the syllabus they're behind on. TikTym is literally a backlog tracker.
- They gather in a few reachable places: Telegram groups, Reddit (r/JEENEETards, r/UPSC, r/CATpreparation), Instagram and YouTube study creators.

**Pitch:** *Clear your backlog, one minute at a time.*

**Why TikTym, in their terms:**

- Every minute of study is a point, and the day's target is a mala of 108 beads to fill.
- Missed hours carry forward as backlog, but only up to a limit, so one bad week never buries you.
- A focus timer that keeps the screen on and logs the minutes for you.
- Streaks, a weekly comparison, and coaching on what's slipping.
- Free, no ads, works offline, data stored in India.

**Later audiences:** working professionals learning new skills; yoga, meditation and japa practitioners; fitness routines.

## Phase 0: Foundations (before any promotion)

| Step | Why |
|---|---|
| Point `tiktym.com` and `app.tiktym.com` at Firebase Hosting | A real address for the website and the app |
| Send account emails from `tiktym.com` (SPF/DKIM) with a TikTym template | Reset emails currently land in spam |
| Move to the Blaze plan with budget alerts | The free plan stops the app for the day after roughly 3,000 opens (50,000 reads at about 17 per open) |
| App Check Enforce | Protect the database before strangers arrive |
| Link previews (title, image, description) | WhatsApp is where sharing happens in India; today a link shows as a bare URL |
| "Send feedback" in the app | Early users are the product team |
| First-run choice of practices, with an "exam prep" preset | New students shouldn't start with Exercise, Reading, Course study and Meditation |

## Phase 1: Website (tiktym.com)

The website lives at `tiktym.com`; the app moves to `app.tiktym.com` (`tiktym.web.app` keeps working and redirects, so installed apps don't break). Both are Firebase Hosting sites in the same project. The website sits in this repo (`site/`) and ships with the same release process.

**Pages**

- **Home:** the pitch, an "Open TikTym" button, a looping preview of the mala filling.
- **How it works:** set practices, log minutes or run the timer, clear your backlog.
- **Features**, each with a short looping clip: Today and the mala, the focus timer, backlog carry-forward and the limit, moments, Insights, offline, export and privacy. FEATURES.md is the source of truth for this page.
- **Install:** step-by-step for iPhone (Share › Add to Home Screen) and Android.
- **For exam students:** the pitch in their words, a sample "exam prep" setup, a 30-day challenge.
- **Privacy promise, FAQ, What's new** (from the releases in to-do.md), Terms and Privacy.

**Clips:** short looping videos (autoplay, silent, looping) rather than GIFs: the same look at about a tenth of the size. They're recorded automatically from the real app with the browser-test setup (sample data, fixed date), so one command refreshes every clip after a release.

**Measurement:** a cookie-free, privacy-friendly counter on the website only (for example Cloudflare Web Analytics). The app stays analytics-free, as the Privacy Policy promises.

## Phase 2: App stores

- **Google Play:** publish the PWA as a Trusted Web Activity (Google's own wrapper). US$25 one-time developer fee. Makes TikTym searchable where Android users look.
- **Apple App Store:** later, only with traction. It needs a native wrapper and risks rejection as "just a website".

## Phase 3: Launch and growth (weeks 4–12)

| Channel | Plan |
|---|---|
| Instagram Reels and YouTube Shorts | 3 posts a week: study-with-me sessions on the TikTym timer, "clearing my backlog" streaks, a 30-day challenge |
| Study creators | 10–20 small creators (10k–100k followers): a free mention or a study-with-me session using TikTym |
| Communities | Reddit, Telegram and Discord study groups: take part genuinely, share when relevant, never spam |
| Building in public | LinkedIn and X posts from the company and founder: how it was built, what users asked for |
| Search | A weekly article ("How to clear your JEE backlog", "Study hours tracker", honest comparisons with Forest and others) |
| Product Hunt | One launch, for credibility |

**Growth built into the app (later):** a one-tap streak card sized for Instagram stories ("12-day streak · 47 hours this month"), then study buddies who can see each other's streaks.

## Measuring success

Starting targets, to revise with real data:

| Metric | Target |
|---|---|
| Visits → sign-ups | Track from day one |
| Activation: logs something on day 1 | 60% or more |
| 7-day retention: still logging after a week | 25% or more |
| Weekly active loggers | The main health number |

Firebase already shows sign-ups. Any in-app counting (anonymous daily totals only) needs a Privacy Policy update first.

## Running costs

| Item | Cost |
|---|---|
| Domain (tiktym.com) | about ₹1,000 a year (owned) |
| Google Play developer account | US$25 once |
| Trademark (optional, recommended) | about ₹4,500 per class, classes 9 and 42 |
| Firebase Blaze | pay-as-you-go; small at early scale, capped in practice by budget alerts |
| Creators | free product mentions to start |

## Keeping it running

- One release process for the app and the website: version bump, "What's new", clips re-recorded.
- One support email, replies within 48 hours.
- Review this plan monthly against the metrics above.
