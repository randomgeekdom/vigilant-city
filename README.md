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

- The villain you attend loses **30** influence — 35, less 5 for the organisation standing behind them.
- **Every other active villain gains 5.** Failure gains them 10 instead.

That arithmetic sets the board's equilibrium at about seven simultaneous villains; eight is the cliff. New
ones keep arriving, so holding the line means periodically deciding who to finish off — which is itself
an act of neglect. **At 100 influence a villain has won and the run ends.**

There is a second way to lose, and it is not a person. The city's trust is every hero's reputation added
up, and under **−3 per guardian on the roster** the city stops believing in its guardians and the run
ends. Nothing new feeds it — it moves on work answered, covers blown, and crimes nobody showed up for —
so it is a clock you keep honest by answering calls, not a second resource to manage.

You can also **hunt** someone directly, any time, even when they are not committing a crime. It costs a
full turn and knocks back 1.4× — it took the whole night. Without it, a villain closest to winning would
be completely unreachable.

## How hard is the city

A new run picks one of four cities, and that choice moves the two numbers above — the price of
inattention and how much debt the city will carry — and nothing else:

| | Unattended growth | Trust floor per guardian | Focus strategy, mean run |
| --- | --- | --- | --- |
| Easy | +4 | −6 | 215 turns, 13/200 survived |
| Average | +5 | −3 | 105 turns, 1/200 survived |
| Difficult | +6 | −2 | 44 turns, 0/200 survived |
| Backbreaking | +8 | −1 | 10 turns, 0/200 survived |

A harder city is **not** a city that decays — there is still no tide, and every point a villain gains is
a point they gained because you were somewhere else. It also does not make the individual incidents
harder. It only changes what your attention buys you and how long the city will put up with you.

It changes how a run fails as much as how long it lasts: an Easy run is lost to conquest, a Backbreaking
one to the city's patience. See [DESIGN.md](./DESIGN.md) §10.5.

## Bosses: the ones you let go

At **55 influence** a villain stops being a problem and starts being something you have to go and get.
Nobody is written by hand and nobody spawns as one — a villain earns a name worth remembering by being
neglected into having one, and the name is the one the generator gave them on their first night.

A boss takes a second power, and that power is the *reason* for their numbers rather than flavour. Work
you mop up at the scene barely comes off them (×0.5–0.65); hunting them still lands hard (×0.8–0.95).
That split is the mechanic: **cleaning up after a boss is a dead end and going and getting them is the
answer.** They grow faster, seed more of their own work, and there are at most two at once.

Every power they pick up by getting away takes another bite out of both multipliers — steeply at the
scene (×0.9 per escape), gently in a hunt (×0.97) — so the power list the player is shown as their
escalation record is a real number. By the sixth escape, cleaning up after them is not a slower route to
the same place, it is no route at all, and hunting is what is left.

And all of that is charged to whoever goes and gets them, which is the only thing the attentive player
ever does with a boss — so a boss left alone has to cost you something on its own account. Every 15
influence past the 55 they were given adds a unit of bill, up to two, and each unit is 20 points on how
often they seed work of their own: **40% a turn at the threshold, 80% at the ceiling.** Nothing counts
that. It is read off their influence, and a hunt takes it back down, so the bill is the bill for having
left them, not a fee for fighting them.

When one reaches zero you are choosing between the two available answers, and both cost something:

- **Kill them.** Permanent, and the city knew that name — every hero on the roster takes a point of
  standing for an execution it watched.
- **Contain them.** Free of the city's standing, and it costs nights rather than standing. They are back
  within the hour at **45** — above anything a single hunt can take off them, so it always takes two —
  with another power on them, one more point of growth, and measurably more resistance on both routes.
  Their open incidents never left the board.

Permanent and expensive, or cheaper and repeating.

The playtest measures three strategies over 200 seeds on the Average city: never intervening averages
31 turns, attending random incidents averages 43, and **focusing on whoever is closest to winning
averages 105 with 1 survivor**. Aimless heroics is barely better than doing nothing.

## Systems

| System | What it does |
|---|---|
| **Powers** | 16 PowerSets × 4 Origins. Aliases generate as *prefix + suffix*. |
| **Manifestations** | Capabilities are *earned*. Roll well and a capability becomes permanent. |
| **Cascading failure** | A failing hero sheds a manifestation, then a power, then dies. Failure costs capability, not health. |
| **Approaches** | Diplomatic / Lethal / Stealthy / Swift / Tactical. Pick exactly two. Lethal kills; everything else imprisons. |
| **Villains** | The second board. Influence, external backers, and a hunt action. |
| **Bosses** | Neglected villains earn a second power at 55 influence, resist mopping-up, escalate every time they get away, and end in a fork: kill them and pay standing, or contain them and fight the same fight again for two more nights. |
| **City trust** | The roster's reputations, summed, against a floor. The other way to lose: the city stops believing in its guardians. |
| **Difficulty** | Four cities. Each moves the price of inattention and the trust floor; none of them adds a decay. |
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
      difficulty.ts           4 incident difficulty tiers (d20 targets 5/10/15/20) + the 4 run threat tiers
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
