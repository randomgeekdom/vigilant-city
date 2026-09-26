# Vigilant City

A superhero management game. You do not fight — you decide who goes, what it costs, and who the city
believes afterwards.

Built on the same stack as [Realms](../realms): Electron 33 + Vite 6 + React 18 + TypeScript 5.7
(strict, `noUncheckedIndexedAccess`) with `@randomgeekdom/rollbard` for name generation.

## Status

The tech skeleton is built and verified. The **game design is a draft and up for discussion** — see
[DESIGN.md](./DESIGN.md), especially §8 "Open questions".

## Run it

```bash
npm install
npm run dev          # dev mode with hot reload (Electron + Vite)
npm run build        # typecheck + production bundle -> dist/
npm start            # run Electron against dist/ (after build)
npm run playtest     # headless 60-month sim with a greedy director + assertions
npm run typecheck    # tsc --noEmit
```

Playtest env vars: `VIGILANT_SEED`, `VIGILANT_TURNS`.

Saves live in Electron's `userData` dir (`%APPDATA%/<app-name>/saves/autosave.json`), not in the repo.

## Layout

```
src/
  engine/                 pure TS, no DOM imports, framework-agnostic
    core/
      types.ts            DTOs + GameSnapshot (the single serializable state)
      Random.ts           seeded RNG; its state serialises into the save
      GameSession.ts      orchestrator: NewGame, Advance, Choose, deploy, Save/Load
      EventSystem.ts      EventSpec / ChoiceSpec / SessionApi
      HeroFactory.ts      roster generation, archetypes, quirks, Chronicle
    data/
      rng-bridge.ts       Math.random shim so rollbard honours our seed
      rollbard.ts         name generation (heroes, city, agency)
    events/
      index.ts            pack registry
      packRoster.ts       burnout, secrets, rivalries, recruitment
      packCity.ts         budget, districts, council, triage
      packPress.ts        features, polls, leaks, ceremonies
    playtest.ts           headless harness
  ui/components/          React views (Roster / Dispatch / City + Chronicle)
electron/
  main.js                 window framing + save:read/write IPC
  preload.cjs             contextBridge -> window.gameAPI
```

## Design in one line

Realms was a court; Vigilant City is a roster. Sovereign → Director, courtiers → heroes, loyalty →
morale, taint → erosion of public trust. The transposition is the point.
