# ✓ Habiterm — a friendly habit tracker

A clean, modern habit tracker that runs entirely in your browser. Every habit gets a
momentum score, a streak, a letter grade — and its own Discover feed pulling the latest
studies and products from the real world.

**Zero dependencies. No build step. No account. Your data never leaves your machine**
(except the Discover queries themselves).

## Run it

- Double-click `index.html`, **or**
- serve the folder: `python -m http.server 8123` → http://localhost:8123

First launch offers **demo data** (6 habits, 120 days of generated history) so
every page lights up immediately. Erase it from Settings when you're ready to track for real.

## The pages

| Page | Command | What it does |
|---|---|---|
| Home | `DASH` (F1) | Momentum overview, heads-up alerts, today's list, trends, 35-day activity, articles |
| Today | `TODAY` (F2) | Check off today's habits — circles, amount steppers, streaks, daily stats |
| Calendar | `CAL` (F3) | Month grid with completion heat + per-habit dots; click any past day to view & edit |
| Stats | `RPT` (F4) | 7/30/90-day completion with deltas, weekday analysis, habit-pair matrix |
| Grades | `GRADE` (F6) | Letter grade per habit (A+…F), overall GPA, outlook, friendly advice |
| Discover | `RES [code]` (F7) | **Per habit**: latest apps & tools (App Store), gear links, **research grouped by the skills the habit trains**, Hacker News launches/discussion, Wikipedia primer |
| Habits | `HAB [code]` (F8) | All habits, or one habit's full detail: score chart, stats, history |
| Premium | `PREMIUM` | Plans, license activation, free-vs-premium comparison |

### The search bar (power-user shortcut)

Click the search bar or press `/` (or `Ctrl+K`), type, hit Enter:

```
DONE MEDT          check off a habit from the keyboard
DONE H2O 3         log 3 units toward an amount habit
UNDO MEDT          un-check today
MEDT               a bare habit code jumps straight to its details
ADD · EDIT MEDT    add / edit a habit
EXPORT · IMPORT    JSON backup / restore
DEMO · WIPE        load demo data / erase everything
HELP               everything else
```

Autocomplete with Tab/↑/↓, command history, F-key page hopping.

## How the numbers work

- **Momentum** — every habit starts at 100. Doing it compounds **+1.8%**, a miss
  **−2.2%**, partial progress scales in between. Unscheduled days carry forward. The
  home-screen score is the average across habits. An unfinished "today" never moves
  the score (or breaks a streak) until the day ends.
- **Grade** — 45% 30-day completion (√-curved: 85% is genuinely excellent), 20%
  momentum (7d vs 30d), 15% streak power (14 straight = full marks), 10% week-to-week
  consistency, 10% all-time record. New habits are ungraded until 5 scheduled days.
- **Habit pairs** — phi coefficient over shared scheduled days in the last 60 days.
  Build routines around positive pairs.
- **Heads up** — streaks at risk, streaks broken, slipping habits, record highs,
  perfect days.

## Habits can be

- **Check off** (did it / didn't) or **Count an amount** (e.g. 8 glasses, 20 pages — partial credit counts)
- **Daily** or specific weekdays (streaks and rates respect the schedule; off-days never count against you)
- Tagged with **topic keywords** that drive the Discover feeds

## Settings

Light/dark theme · accent color (violet/orange/green/blue/pink) · day rollover hour
(night owls: set 3:00 and 1 a.m. still counts as "today") · week start · data
(export/import/demo/erase).

## Research by skill 🧠

PubMed is a biomedical database, so searching it for a hobby ("solve a Rubik's cube")
returns noise. Discover instead searches for the **skills the habit trains**: a Rubik's
cube maps to *spatial reasoning* (`"mental rotation"[tiab]…`), *pattern recognition*
(`"sequence learning"[tiab]…`) and *working memory*, each shown as its own group of
relevance-ranked studies.

The mapping lives in `js/topics.js` — a concept dictionary of signal words → skill
facets, each with a tight Title/Abstract PubMed query. It's a best-effort starting
point, so every habit's skills are **editable** in the add/edit form ("Skills this
builds" — auto-suggested, add/remove your own). Saved habits keep the skills you chose;
unedited ones always reflect the latest map. Unmapped habits fall back to one honest
scoped search.

## Premium & making money 💸

Habiterm ships with two revenue streams, both wired and ready:

1. **Premium** — free plan is 3 habits + core tracking; Premium ($19 lifetime by default)
   unlocks unlimited habits, Stats, the report card, and dark mode + accent colors.
   New users get a 14-day full trial. Buyers activate with a license key
   (`HT-XXXX-XXXX-XXXX`) — works offline.
2. **Affiliate gear links** — every habit's Discover page links to Amazon/Etsy/eBay
   searches for related gear; add your Amazon Associates tag and free users earn you
   commission too.

**To start selling**, open `js/premium.js` and fill in `CONFIG`:

- `checkoutUrl` — your Gumroad / Lemon Squeezy / Stripe Payment Link checkout page
  (set it to auto-issue license keys in the `HT-XXXX-XXXX-XXXX` format, or email them yourself).
- `amazonTag` — your Amazon Associates tag (e.g. `habiterm-20`).
- `priceLabel` / `periodLabel` — whatever you charge.

Note: key validation is client-side (honor system), which is normal for indie
local-first apps. For hard verification, call your payment provider's license API
inside `activate()` in `js/premium.js`.

## Data & APIs

- State lives in `localStorage` (`habiterm_v1`), export/import as JSON.
- Discover feeds (all key-free, cached 6h, throttled politely):
  - iTunes Search API — latest apps & tools per habit (JSONP, no key)
  - NCBI PubMed E-utilities — latest studies
  - Hacker News via Algolia — launches & discussion
  - Wikipedia REST — topic primers
- Fully offline-capable; feeds degrade to cache or a polite error. The tracker itself
  never needs the network.

## Files

```
index.html            shell
css/terminal.css      design system: themes, layout, components
js/util.js            dates (local, DST-safe keys), formatting
js/store.js           state, persistence, demo data
js/premium.js         plans, trial, license keys, upgrade page  ← seller config lives here
js/topics.js          habit → skill/topic map that drives "Research by skill"
js/metrics.js         streaks, rates, momentum scores, grades, pairs, alerts
js/charts.js          hand-rolled canvas line/spark charts
js/feed.js            PubMed / HN / Wikipedia clients + cache + throttle
js/command.js         command parser, palette, keyboard
js/panels/*.js        dashboard, today, calendar, report, grade, research, habit, manage
js/app.js             boot, routing, toasts
```
