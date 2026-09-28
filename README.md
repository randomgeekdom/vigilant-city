# Vigilant City

A superhero game. **You are a hero, not a manager.** You answer calls yourself, and everyone else who
answers when the city calls is a person you can lean on — or burn out.

Built on the same stack as [Realms](../realms): Electron 33 + Vite 6 + React 18 + TypeScript 5.7
(strict, `noUncheckedIndexedAccess`) with `@randomgeekdom/rollbard` for name generation.

## Status

Playable. Core loop, the villain focus economy, the city trust floor, metapolitics and secret identity
are built and covered by the headless playtest. See [DESIGN.md](./DESIGN.md) for the full spec; §10 has the
villain economy and the balance data behind it, §11.1 the reputation floor.

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

## The other rule: attention is the only resource

The city is not decaying and there is no rising tide. Every incident has a **culprit**, and each villain
carries **influence** from 0 to 100. Every turn your attention lands on exactly one of them:

- The villain you attend loses **35** influence.
- **Every other active villain gains 6.** Failure gains them 10 instead.

That arithmetic sets the board's equilibrium at about six simultaneous villains; seven is the cliff. New
ones keep arriving, so holding the line means periodically deciding who to finish off — which is itself
an act of neglect. **At 100 influence a villain has won and the run ends.**

There is a second way to lose, and it is not a person. The city's trust is every hero's reputation added
up, and under **−3 per guardian on the roster** the city stops believing in its guardians and the run
ends. Nothing new feeds it — it moves on work answered, covers blown, and crimes nobody showed up for —
so it is a clock you keep honest by answering calls, not a second resource to manage.

You can also **hunt** someone directly, any time, even when they are not committing a crime. It costs a
full turn and knocks back 1.4× — it took the whole night. Without it, a villain closest to winning would
be completely unreachable.

## Bosses: the ones you let go

At **55 influence** a villain stops being a problem and starts being something you have to go and get.
Nobody is written by hand and nobody spawns as one — a villain earns a name worth remembering by being
neglected into having one, and the name is the one the generator gave them on their first night.

A boss takes a second power, and that power is the *reason* for their numbers rather than flavour. Work
you mop up at the scene barely comes off them (×0.5–0.65); hunting them still lands hard (×0.8–0.95).
That split is the mechanic: **cleaning up after a boss is a dead end and going and getting them is the
answer.** They grow faster, seed more of their own work, and there are at most two at once.

When one reaches zero you are choosing between the two available answers, and both cost something:

- **Kill them.** Permanent, and the city knew that name — every hero on the roster takes a point of
  standing for an execution it watched.
- **Contain them.** Free, and it buys nothing. They are back before the night is out with another power
  and one more point of growth, and their open incidents never left the board.

Permanent and expensive, or free and repeating.

The playtest measures three strategies over 200 seeds: never intervening averages 37 turns, attending
random incidents averages 44, and **focusing on whoever is closest to winning averages 100 with 2
survivors**. Aimless heroics is barely better than doing nothing.

## Systems

| System | What it does |
|---|---|
| **Powers** | 16 PowerSets × 4 Origins. Aliases generate as *prefix + suffix*. |
| **Manifestations** | Capabilities are *earned*. Roll well and a capability becomes permanent. |
| **Cascading failure** | A failing hero sheds a manifestation, then a power, then dies. Failure costs capability, not health. |
| **Approaches** | Diplomatic / Lethal / Stealthy / Swift / Tactical. Pick exactly two. Lethal kills; everything else imprisons. |
| **Villains** | The second board. Influence, external backers, and a hunt action. |
| **Bosses** | Neglected villains earn a second power at 55 influence, resist mopping-up, and end in a fork: kill them and pay standing, or contain them and get the same fight again. |
| **City trust** | The roster's reputations, summed, against a floor. The other way to lose: the city stops believing in its guardians. |
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
      villains.ts             influence tiers, knockback, hunting multiplier
      bosses.ts               boss powers, growth, and the kill/contain fork
      reputation.ts           city trust: the roster sum, its floor, its verdict
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
