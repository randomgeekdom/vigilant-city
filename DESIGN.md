# VIGILANT CITY — Design Document (v0.1, DRAFT — not yet agreed)

A superhero **management** game. You do not fight. You decide who goes, what they cost, and who the
city believes afterwards.

> **Status:** the tech skeleton is built and verified. Everything below the "Provisional" markers is a
> *proposal to be argued with*, not a decision. The questions in §8 are the ones I want to resolve first.

## 1. The thesis

The pitch in one line: **Realms was a court; Vigilant City is a roster.** The transposition is the whole
design, and it is why this game exists.

| Realms                        | Vigilant City                    |
|-------------------------------|----------------------------------|
| Sovereign                     | Agency Director                  |
| Courtiers (loyalty-driven)    | Heroes (morale-driven)           |
| Council of five skill seats   | Team structure / power taxonomy   |
| Taint                        | Erosion of public trust          |
| Schemes                      | Crisis & PR management           |
| Secrets (cultist, spy)        | Hero secrets (payroll, informant)|
| Dynastic succession           | Generation change / who inherits |
| Seasons                       | Months                           |
| Realm graph via portals       | City districts                   |

The bet: the thing that made Realms interesting was *people with their own agendas and a public whose
opinion was a resource*. Replace crowns with masks and the machine still turns.

## 2. Non-goals

- **No player-avatar combat.** You are behind a desk. Ever.
- **No reactive real-time play.** This is a turn-based management game, not a city sim.
- **No chosen-one.** No single superpowered protagonist. The roster is the protagonist.

## 3. Core loop (current)

```
   ┌────────────┐   deploy heroes   ┌────────────┐
   │  Dispatch  │◄─────────────────►│   Roster   │  condition / morale / fame
   └─────┬──────┘                   └─────┬──────┘  secrets
         │ incidents appear                │
         ▼                                 │
   ┌────────────┐   narrative choice   ┌────┴───────┐
   │  Advance   │─────────────────────►│  Chronicle │
   │  1 month   │                      └────────────┘
   └────────────┘
```

1. Incidents appear in districts, on a timer.
2. You assign one or more heroes to each.
3. `Advance one month` resolves everything: deployments tick, outcomes roll, trust drifts, secrets
   build, then one narrative event fires.
4. Repeat until trust hits zero or nobody is left who can answer a call.

## 4. Resources (provisional)

| Resource | Source                              | Pressure                                   |
|----------|-------------------------------------|--------------------------------------------|
| Funding  | base + district security − payroll | rest, recruiting, incident response costs  |
| Trust    | drift toward a target + event swings| missed calls, scandals, hero loss            |
| Intel    | steady trickle + incidents resolved | unlocks investigation events                |

Trust is the spine. It is the only resource that can end a run on its own.

## 5. Heroes

Each hero has: identity (name + callsign), **archetype** (brute / speedster / mystic / tech / psy /
blade), age, quirks, and three tracked stats — **condition** (can they work), **morale** (will they),
**fame** (does the city care). Archetype grants a +0.12 resolution bonus against matching incident
kinds, so composition matters.

Every hero can acquire a **secret** (double paycheque, informant history, unverified powers, cell
membership, substance). Secrets accrue *pressure*; left alone they surface as scandals that cost trust.
You can pre-empt them, buy them off, or let them break.

## 6. Incidents

Incidents have a **kind** (crime / disaster / public / supervillain / mundane), a **district**, a
**severity** 1–10, and a **timer**. Send a team and it resolves when the timer runs out, with odds based
on the lead hero's condition and morale, archetype match, and team size. Send nobody and the district's
unrest climbs and trust falls.

Multiple heroes per incident is allowed and rewarded (+0.07 each, capped +0.18) while wear is shared.
This is a deliberate design choice: big calls should be team calls.

## 7. What is built and verified

`npm run typecheck && npm run playtest && npm run build` all pass.

- Seeded RNG whose state serialises, so a restored save continues a byte-identical stream (asserted).
- `GameSnapshot` DTOs; `Save()`/`Load()` with a version guard.
- Event system: `EventSpec` / `ChoiceSpec` / `SessionApi`, weighted roll, `when()` gating re-checked at
  resolution so cost gating is honest. 18 events across 3 packs (roster / city / press).
- Headless playtest with a greedy director, a 12-seed sweep, and save round-trip assertions.

Two real bugs were caught by the playtest during the build and are fixed: unattended incidents never
expired (the timer only ticked when a hero was present), and two heroes could be assigned to the same
call with only one of them ever released.

## 8. Open questions — the ones I want your call on

1. **Is the transposition right?** Is this "Realms with masks" the game you want, or did you have
   something else in mind? Everything below is downstream of this.
2. **Who is the adversary?** Realms had rival realms and a dark-between-realms. Options: (a) an
   escalating supervillain with its own agenda, (b) a rival agency, (c) the city itself — budget,
   council, and public opinion as the antagonist, (d) none — pure institutional management.
3. **Is there a metapolitical layer?** Heroes with ideology, cells, and movement politics (the
   `faction` secret is a placeholder for this). This could be the deepest well in the game, or noise.
4. **How dark on identity?** Does the game model secret identities, the risk of exposure, and the
   cost of a hero losing their civilian life? Or is the mask just a costume and we skip the
   Clark-Kent-problem entirely?
5. **Generational depth?** Heroes age out. Does a second generation succeed the first — inheriting
   rivals, mentors' secrets, and unfinished business? (Realms' successor loop was never finished.)
6. **Win condition.** Survive N months? Reach a trust threshold? Push a specific villain to a specific
   end? Or an endless campaign with a score?
7. **What is a month worth?** Current pacing is roughly 4–5 years per run. Shorter runs would be
   tighter; longer ones would let the roster and its relationships develop.

## 9. Deliberately unfinished

- Balance is calibrated by eye, not designed. The playtest's greedy director currently wins comfortably
  (52 handled / 2 missed over 60 months) — the game is too easy for someone playing well.
- `funding` is nearly a dead resource in the automated sim; it needs sinks that matter.
- No legislation/decree system (Realms' most-requested missing feature — the same pattern may apply here).
- No hero-to-hero relationship graph. Realms' best material was interpersonal, and none of it has been
  built yet.

## 10. Tech

Electron 33 + Vite 6 + React 18 + TypeScript 5.7 (`strict`, `noUncheckedIndexedAccess`, `noImplicitReturns`),
`@randomgeekdom/rollbard` for names, `tsx` for the headless harness. The engine under
`src/engine/` is pure TypeScript with no DOM imports, so it can be moved to a test runner, a service
worker, or a Tauri shell later. Save data lives in Electron's `userData/saves/autosave.json`.
