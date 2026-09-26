# Vigilant City

A superhero game. **You are a hero, not a manager.** You answer calls yourself, and everyone else who
answers when the city calls is a person you can lean on — or burn out.

Built on the same stack as [Realms](../realms): Electron 33 + Vite 6 + React 18 + TypeScript 5.7
(strict, `noUncheckedIndexedAccess`) with `@randomgeekdom/rollbard` for name generation.

## Status

Playable. Core loop, metapolitics and secret identity are built and covered by the headless
playtest. See [DESIGN.md](./DESIGN.md) for the full spec — and §10, which records the one known
balance problem (the city gets *quieter* over time rather than worse).

## Run it

```bash
npm install
npm run dev          # dev mode with hot reload (Electron + Vite)
npm run build        # production bundle -> dist/
npm start            # run Electron against dist/ (after build)
npm run playtest     # headless engine harness with assertions
npm run typecheck    # tsc --noEmit
```

Saves live in Electron's `userData` dir (`%APPDATA%/<app-name>/saves/autosave.json`), not in the repo.

## The one rule

You resolve **exactly one** incident per turn — pick one incident and **two of five approaches** —
and resolving it ticks **every other open incident down by one**. Anything that hits zero is resolved
by whoever is left standing, without you.

So every personal action is also a step of the clock for everything you did not choose. The question
is never "what is the optimal action" but "what am I willing to let rot."

## Systems

| System | What it does |
|---|---|
| **Powers** | 16 PowerSets × 4 Origins. Aliases generate as *prefix + suffix*. |
| **Manifestations** | Capabilities are *earned*. Roll well and a capability becomes permanent. |
| **Cascading failure** | A failing hero sheds a manifestation, then a power, then dies. Failure costs capability, not health. |
| **Approaches** | Diplomatic / Lethal / Stealthy / Swift / Tactical. Pick exactly two. Lethal kills; everything else imprisons. |
| **Inheritance** | When your hero dies, you become another. The city still needs a guardian. |
| **Secret identity** | A job and specific people are at stake. Exposure is rolled, not narrated. Disclosure is a real counter-strategy. |
| **Metapolitics** | Origin decides a hero's politics. Cells recruit by conduct; external organisations warp incident modifiers. |

## Layout

```
src/
  engine/                     pure TS, no DOM imports, framework-agnostic
    core/
      types.ts                DTOs + CitySnapshot (the single serializable state)
      Random.ts               seeded RNG; its state serialises into the save
      GameSession.ts          the resolution loop, the pacing rule, persistence
      CharacterFactory.ts     hero/villain generation, alias generator, IncidentFactory
      identity.ts             secret identity: exposure, tie damage, disclosure
      politics.ts             cells, sympathy drift, organisations, ideology modifiers
      saveIO.ts               corrupt-save tolerance
    data/
      powersets.ts            16 PowerSets + alias generation
      origins.ts              4 Origins
      approaches.ts           5 Approaches
      difficulty.ts           4 difficulty tiers (d20 targets 5/10/15/20)
      districts.ts            9 fixed districts
      incidentTypes.ts        5 incident types + per-approach modifier shapes
      cells.ts                4 metapolitical cells, origin -> cell
      organizations.ts        external organisation templates
      civilian.ts             civilian jobs and ties
      rng-bridge.ts           Math.random shim so rollbard honours our seed
      rollbard.ts             name generation
    playtest.ts               headless harness
  ui/components/              React views (City / Heroes / Politics / Prison + Chronicle)
electron/
  main.js                     window framing + save:read/write IPC
  preload.cjs                 contextBridge -> window.gameAPI
```

## Provenance

The game design originates in the original Blazor prototype,
[randomgeekdom/VigilantCity](https://github.com/randomgeekdom/VigilantCity). The engine under
`src/engine/` is a port of that prototype's `VigilantCity.Core`, so the two are comparable line for
line. Metapolitics and secret identity are new and not present in the prototype.
