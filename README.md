# ▮▮ HABITERM — Habit Intelligence Terminal

A Bloomberg-terminal-style habit tracker. Every habit trades like a security: it has a
ticker, a momentum price, a streak, a letter grade — and its own live research desk
pulling the latest studies and products from the real world.

**Zero dependencies. No build step. No account. Your data never leaves your machine**
(except the research queries themselves).

## Run it

- Double-click `index.html`, **or**
- serve the folder: `python -m http.server 8123` → http://localhost:8123

First launch offers a **demo portfolio** (6 habits, 120 days of generated history) so
every panel lights up immediately. `WIPE` it when you're ready to trade for real.

## The terminal

| Panel | Command | What it does |
|---|---|---|
| Dashboard | `DASH` (F1) | HABIX composite index, alerts, today's book, top movers, 35-day heat, latest intel |
| Today | `TODAY` (F2) | Fill today's orders — checkboxes, quantity steppers, streak board, session stats |
| Calendar | `CAL` (F3) | Month grid with fill heat + per-habit dots; click any past day to inspect & backfill |
| Report | `RPT` (F4) | 7/30/90-day fill rates with deltas, weekday analysis, habit-pair correlation matrix |
| Grader | `GRADE` (F6) | Letter grade per habit (A+…F), portfolio GPA, outlook, advisory notes |
| Research | `RES [TICKER]` (F7) | **Live feeds per habit**: latest PubMed studies, Hacker News products/discussion, Wikipedia primer |
| Securities | `HAB [TICKER]` (F8) | Listings table, or a full tear sheet: price chart, vitals, activity strip, recent tape |

### Command line (the fun part)

Click the `>` bar or press `/` (or `Ctrl+K`), type, hit Enter:

```
DONE MEDT          fill an order from the keyboard
DONE H2O 3         log 3 units toward a quantity habit
UNDO MEDT          cancel today's fill
MEDT               a bare ticker jumps straight to its tear sheet
ADD · EDIT MEDT    list / amend a habit
EXPORT · IMPORT    JSON backup / restore
DEMO · WIPE        load demo portfolio / erase everything
HELP               everything else
```

Autocomplete palette with Tab/↑/↓, command history, F-key panel hopping.

## How the numbers work

- **Price** — every habit starts at 100. A filled session compounds **+1.8%**, a miss
  **−2.2%**, partial fills scale in between. Unscheduled days carry forward. HABIX is
  the average across listings. An unfilled "today" never moves the price (or breaks a
  streak) until the session closes.
- **Grade** — 45% 30-day fill rate (√-curved: 85% fill is genuinely excellent), 20%
  momentum (7d vs 30d), 15% streak power (14 straight = full marks), 10% week-to-week
  consistency, 10% lifetime record. New listings are `NR` until 5 scheduled sessions.
- **Correlation** — phi coefficient over shared scheduled sessions in the last 60 days.
  Build routines around positive pairs.
- **Alerts** — streaks at risk, streaks snapped, downgrade watches, record highs,
  flawless sessions.

## Habits can be

- **Check** (did it / didn't) or **Quantity** (e.g. 8 glasses, 20 pages — partial credit counts)
- **Daily** or specific weekdays (streaks and rates respect the schedule; off-days never count against you)
- Tagged with **research keywords** that drive the RES terminal feeds

## Settings (`SET`)

Accent phosphor (amber/green/cyan/magenta) · session rollover hour (night owls: set
03:00 and 1 a.m. still counts as "today") · week start · CRT scanlines · data desk
(export/import/demo/wipe).

## Data & APIs

- State lives in `localStorage` (`habiterm_v1`), export/import as JSON.
- Research desks (all key-free, CORS-enabled, cached 6h, throttled politely):
  - NCBI PubMed E-utilities — latest studies
  - Hacker News via Algolia — products & discussion
  - Wikipedia REST — topic primers
- Fully offline-capable; feeds degrade to cache or a polite error. The tracker itself
  never needs the network.

## Files

```
index.html            shell
css/terminal.css      CRT styling, layout, components
js/util.js            dates (local, DST-safe keys), formatting
js/store.js           state, persistence, demo portfolio
js/metrics.js         streaks, rates, prices, grades, correlations, alerts
js/charts.js          hand-rolled canvas line/spark charts
js/feed.js            PubMed / HN / Wikipedia clients + cache + throttle
js/command.js         command parser, palette, keyboard
js/panels/*.js        dashboard, today, calendar, report, grade, research, habit, manage
js/app.js             boot, routing, ticker tape, status bar
```
