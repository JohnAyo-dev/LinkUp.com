# LinkUp — Smart Event Scheduling

**Less back-and-forth. More time together.**

LinkUp is a self-contained frontend prototype for scheduling events with multiple people. It collects participants' availability, calculates overlapping time slots, applies a participation policy (everyone, minimum count, or percentage threshold), and recommends the best times — ranked by availability, preferred windows, required participants, and earliest date.

## Run locally

LinkUp is a zero-dependency static web app. Open `index.html` directly in a browser, or serve the folder from any static server:

```sh
python -m http.server 8000
# then open http://localhost:8000
```

No build step, no install required.

## What's inside

```
index.html         Application shell and script wiring
css/styles.css     Full design system (light + dark, responsive, reduced-motion aware)
js/engine.js       Time model, validation, and the scheduling candidate engine
js/store.js        State management, localStorage persistence, event/participant ops
js/tests.js        Automated test suite (run via Settings → Diagnostics)
js/ui.js           Rendering and event handlers
favicon.svg        Brand mark
```

## Features

- **Dashboard** — greeting, summary stats, recent/upcoming events, next actions, availability progress, activity timeline; all recalculated live.
- **Event creation & management** — title, description, type, location/link, duration, date range, allowed weekdays, daily window, preferred and excluded windows, time zone, participation policy, and participants. Full editing, recalculation, confirmation, cancellation, and reopening.
- **Participation policies** — *Everyone*, *Minimum participants*, or *Percentage threshold*. Required participants must always be available for a suggestion to qualify.
- **Availability** — 15-minute selection grid, date paging, interval input, clear-all, and merged interval summaries per event.
- **Scheduling engine** — 15-minute candidate generation within date/daily/excluded windows; policies enforced; runs of identical availability collapsed into suggestion ranges; rank by availability → preferred window → required availability → earliest date. Suggestions are version-tracked and marked **outdated** after any change.
- **Confirmation safety** — selecting a suggestion re-evaluates it against current availability; if it no longer satisfies the policy, the organizer must explicitly override instead of silently confirming.
- **Time zones** — fixed-offset zones (UTC, WAT UTC+1, EST UTC−5, IST UTC+5:30); event time plus the viewer's converted time are shown when they differ.
- **Invitations & profiles** — simulated, local-only invitation flow with tokens and copyable links; multiple demo profiles to test collaboration by switching.
- **Persistence** — everything is saved to browser `localStorage`; stored data is validated on load and can be reset from Settings.
- **Diagnostics** — run the 19 automated scheduling/store tests from Settings and see per-test pass/fail results.

## Testing

Open **Settings → Diagnostics → Run scheduling tests** in the app, or run the suite in Node:

```sh
node -e "
const fs=require('fs'),vm=require('vm');
const src=['js/engine.js','js/store.js','js/tests.js'].map(f=>fs.readFileSync(f,'utf8')).join('\n');
const c=vm.createContext({});vm.runInContext(src,c);
const out=vm.runInContext('runTests()',c);
out.forEach(([n,ok])=>console.log(ok?'PASS':'FAIL',n));
"

```

## Honest limitations (local demo)

- **No real accounts or auth.** Profiles are local demo identities stored in this browser only. The profile switcher is not a login system.
- **No real invitations.** Invite codes and links are copyable, but nothing is emailed or synced. Events live on this device; opening a link on another device will not load the event.
- **No calendar integration.** Confirming an event is a local simulation only.
- **No daylight saving.** Zones are fixed UTC offsets. The architecture keeps "wall-clock minutes in the event zone" as its invariant so proper IANA time-zone support can be added later.
- **Events cannot span midnight** — validated and communicated in the UI.
- **localStorage is not a database.** Do not put private data in demo events or invitations.

## Path to production

1. Split the current modules behind a real frontend framework (the engine/store/test modules are framework-free by design).
2. Add a hosted backend with authentication/authorization, a Postgres database, and real email delivery for invitations.
3. Serve a constructed invite link that resolves through the backend (not a local `#join/` hash).
4. Replace fixed-offset time zones with IANA zone data (e.g., `Intl` / `luxon`).
5. Add real-time sync (WebSockets or Supabase Realtime) so availability and confirmations propagate to all participants.