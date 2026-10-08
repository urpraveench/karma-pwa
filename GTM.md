# TikTym go-to-market plan

How TikTym gets its first users in India, and what has to be true before it does. Pending steps are tracked in [to-do.md](to-do.md) under "Go-to-market"; this file is the why.

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

The website lives at `tiktym.com`; the app moves to `app.tiktym.com` (`tiktym.web.app` keeps working and redirects, so installed apps don't break). Both are Firebase Hosting sites in the same project. The website sits in this repo (`site/`) and ships with the same release process.

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

- **Google Play:** publish the PWA as a Trusted Web Activity (Google's own wrapper). US$25 one-time developer fee. Makes TikTym searchable where Android users look.
- **Apple App Store:** later, only with traction. It needs a native wrapper and risks rejection as "just a website".

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
