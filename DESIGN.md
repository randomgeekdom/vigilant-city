# VIGILANT CITY — Design Document (v0.2)

Superhero management in a reactive city. You do not run an agency. **You are a hero**, and so is everyone
who answers when something goes wrong.

> **Provenance.** v0.1 of this doc was written before I found the original Blazor prototype
> ([randomgeekdom/VigilantCity](https://github.com/randomgeekdom/VigilantCity)) and assumed a
> director-behind-a-desk design. That was wrong. v0.2 is a faithful port of the prototype's design, plus
> two new pillars we agreed on: **metapolitics** (internal *and* external) and **properly modelled secret
> identity**. Anything marked **[NEW]** is not in the prototype and needs sign-off.

## 1. Premise

When **Athena** fell — felled by a devastating foe, the heavens crying as she tumbled — the city of
Vigilant was given no time to mourn. Criminals who once feared the goddess ran rampant. The city needed
a new guardian, and it needed one fast.

**The city chose you.**

## 2. The loop — the single most important thing in this design

This is not a monthly management sim. It is a **pacing puzzle**.

```
  ┌──────────────────────────────────────────────────────┐
  │  The city holds N open incidents, each with a timer   │
  └───────┬──────────────────────────────────┬───────────┘
          │                                  │
          ▼                                  │
  ┌───────────────┐                          │
  │ Choose ONE    │                          │
  │ incident      │                          │
  │ + TWO of five │                          │
  │ approaches    │                          │
  └───────┬───────┘                          │
          │                                  │
          ▼                                  │
  ┌───────────────┐   your hero rolls.       │
  │ Resolve it    │──► win: gain a Manifestation, reputation up
  └───────┬───────┘──► lose: shed a Manifestation → a Power → you
          │
          │  ***every other incident's timer ticks down by 1***
          ▼
  ┌──────────────────────────────────────────────────────┐
  │  Any timer reaching 0 auto-resolves: another hero     │
  │  is assigned. If none is free, reputation falls.      │
  └──────────────────────────────────────────────────────┘
```

**Why this is good:** you never get to "do everything." Every incident you personally attend is a month
you spend not attending something else. The question is never "what is the optimal action" but "what am
I willing to let rot." The clock moves *only when you act*, so tension scales with engagement.

**Patrol** is a legal turn that does not attend anything: it ages every open incident, grows every
villain, and brings in fresh work. It is not a safe default and it is not gated to an empty board — it is
what you do when you have decided that nothing currently on the board is worth your night.

## 3. You are a hero (and so is everyone else)

- `playerHero` — your character. You resolve incidents personally.
- `heroes[]` — everyone else. They **auto-resolve** incidents whose timer expires. You do not command
  them individually; management of them is *indirect* (see §7).
- **When your hero dies you inherit another.** The city still needs a guardian. The prototype does this
  automatically; it is a great beat and must be preserved.

## 4. Powers — the system that makes resolution emergent **[ported]**

### 4.1 PowerSet (16)

Flight · SuperStrength · SuperSpeed · Telekinesis · Telepathy · Invisibility · Shapeshifting ·
TimeManipulation · EnergyManipulation · SizeManipulation · Technopathy · Teleportation ·
Precognition · SuperSenses · CombatMaster · ArmoredBody

Each carries a list of name prefixes, and aliases generate as *prefix + suffix*
(`Iron Man`, `Speed Girl`, `Mind Knight`, `Armored Woman`, `Big Beast`). Suffixes can be seeded from a
word in the hero's real name, so aliases occasionally feel earned.

### 4.2 PowerOrigin (4)

| Origin | Flavour |
|---|---|
| **Alien** | Granted by an alien from another world, universe or dimension. Or, perhaps, you *are* that alien. |
| **Genetic** | Born this way. Something unknown in your DNA. |
| **Supernatural** | Granted by sorcery, myth, or the divine/demonic. |
| **Technological** | Science has granted abilities beyond normal. You wear it, or you made it part of you. |

**Origin is the metapolitical fault line.** See §8.

### 4.3 PowerManifestation — powers are *earned*, and failure costs capability

A hero starts with powers (PowerSet + Origin) and **no manifestations**. A manifestation is a permanent
record that this hero can do *this specific thing*:

```
(Approach, PowerOrigin, PowerSet, DifficultyLevel)
```

When a hero attempts an incident:
- If they already have a matching manifestation → **+DifficultyLevel.roll** to their roll. Reliable.
- If not → roll against difficulty. **Succeed → gain the manifestation permanently** (they levelled).
  **Fail → take the penalty**, and carry the scars.

This is the best idea in the prototype and it is preserved exactly. A hero's sheet is a record of what
they have actually proven, not what they could theoretically do.

### 4.4 Cascading failure

Failure does not cost health. It costs **capability**, in order:

1. Lose a PowerManifestation (random one).
2. Then lose a Power outright.
3. Then die.

The prototype's `GetHeroSevereConsequence` implements exactly this ladder. A veteran hero who starts
failing begins to *unlearn* themselves.

## 5. Resolution **[ported]**

```
modifier  = approachModifiers[chosen1] + approachModifiers[chosen2]
if hero has matching manifestation:  modifier += difficulty.roll
else if d20 >= difficulty.roll:      modifier += difficulty.roll / 5
                                      AND grant the manifestation
else:                                modifier -= difficulty.roll / 5

heroRoll = d20 + modifier
resolved = heroRoll >= difficulty.roll
```

`d20` is 1–20. Difficulty targets: **Easy 5 · Average 10 · Difficult 15 · Backbreaking 20**, with
`modifier = roll/5`.

**Villains.** On success a mastermind surfaces: Active → Imprisoned, or **Dead if you chose Lethal**.
This is a real moral axis and it is the only place the game asks you what you are.

**Reputation.** `±(difficulty.roll % 5 + 1)` for the hero who acted. Unresolved incidents cost *every*
hero reputation.

## 6. Approaches (5) — pick exactly two **[ported]**

Diplomatic ("Talk it out") · Lethal ("When in doubt, kill them") · Stealthy ("Try not to be seen") ·
Swift ("Be quick") · Tactical ("Use your wits")

Each incident rolls **random modifiers for all five**, so there is always a good answer and always a
morally expensive one. A hostage situation likes Stealthy and Tactical and hates Swift. A murder
investigation punishes Lethal. Kidnapping punishes Swift hard.

**Why exactly two:** it is a real choice with real cost. One approach is a no-brainer; five is
paralysis.

## 7. The city **[ported]**

**9 fixed districts** (not generated — they are the city's actual geography):
Arts District · Blue Coast · College Park · Downtown · Green Hills · Medical District · Midtown ·
Old Town · Riverside

**5 incident types**, each with written flavour and its own approach-modifier shape:
Kidnapping · Murder · Rampage · Robbery · Hostage Situation

Incidents spawn across districts and keep ticking until resolved. Alerts and a History log narrate
everything that happened, in prose.

## 8. Metapolitics — both layers **[implemented]**

This is the game's deepest well and it did not exist in the prototype. It builds directly on
`PowerOrigin`, which is already the fault line.

### 8.1 Internal: ideological fault lines within your roster

Origin determines a hero's **leaning**, and therefore which **cell** they are sympathetic to:

| Origin | Cell | Sees | Creed |
|---|---|---|---|
| Alien | **The Exiles** | outsiders, and the danger of being one | Nobody from here belongs. Protect the stranger, even when it costs you. |
| Genetic | **The Ascendants** | the next generation, inheritance | The next generation is owed the city. We are that generation. |
| Supernatural | **The Choir** | the sacred, the old bargains | The old bargains still hold. The divine does not renegotiate. |
| Technological | **The Registry** | the rational, the accountable | Powers must be accounted for. The public deserves a list. |

A hero cannot choose their politics — it is derived from their power. What they *do* about it is
the player's problem. Sympathy (−100…+100) drifts with conduct:

- Being used on jobs your cell approves of pulls them toward it.
- Being used as a blunt instrument pushes them away. The Choir and the Registry both disapprove of
  lethal work; the Exiles and the Ascendants are more comfortable with it.
- At −50 and below a hero stops speaking for their cell (a **fracture**), and morale suffers.

So origin diversity in the roster is a *political* stat, not just a tactical one, and the way you
spend people is a political act whether you meant it or not.

### 8.2 External: rival organisations

Named organisations, each with an ideology, an agenda, a power rating and a standing with you. They
compete for the same incidents, and their presence **warps the approach modifiers on open incidents**:

- An organisation sharing your hero's politics helps on Diplomatic and Tactical work.
- An opposed one obstructs Diplomacy but is easier to simply hit.

Player verbs: **court** (send a sympathetic hero to hear them out, moving sympathy and their
standing) and **suppress** (knock their power down, at the cost of standing). Suppression can finish
an organisation outright.

> Your original `TODO.txt` already said *"Add Organizations"*. This is that item.

## 9. Secret identity — modelled properly **[implemented]**

The Clark Kent problem as mechanics. Every hero has a civilian life that resolution puts at risk:
a job, and specific people who were relying on that hero being someone else.

**Exposure pressure** — how much attention a night attracted:
- Lethal approach: 45. Violent work is witnessed.
- Failure: 30. Nobody is holding the pose together.
- Difficulty Easy→Backbreaking: 8 / 15 / 25 / 35.

That pressure is scaled by how thin the mask already was (`(100 − secrecy) / 100`), so a hero who has
been lucky repeatedly is one bad night from being caught. On a miss, secrecy erodes. On a hit, the
hero is **exposed**: the job is gone, reputation drops, morale collapses.

**Civilian ties** take damage independently of the cover, and at 100 the civilian life is destroyed.

**Some heroes quit.** An exposed hero (or one at morale ≤ −30) may stand down permanently, and the
roster loses them. That is a real cost the player weighs when choosing how much to lean on anyone.

**Disclosure** — going public deliberately — is a legitimate counter-strategy: a large one-off
reputation hit and a civilian reset, then **permanent legitimacy**. A disclosed hero can never be
blown. Take the mask off on purpose and you are safe, and somewhat distrusted, forever.

## 10. Villains and the focus economy **[implemented]**

Every incident has a **culprit**. Villains are not flavour attached to a district; they are the reason
the city is losing, and they are the second board.

Each villain carries **influence** (0–100) and, sometimes, an external **backer**. Influence is tiered:

| Tier | Influence | Meaning |
| --- | --- | --- |
| Nuisance | 0 | Street-level, not yet worth a name |
| Notable | 40 | They have a reputation and a plan |
| Severe | 70 | They are running something large |
| Imminent | 100 | **They have won. The run ends.** |

### 10.1 Attention is the only resource

There is no passive growth and no rising tide. The city is not decaying. The pressure is purely that
**your attention is finite and every act spends it on exactly one person:**

- Attend a villain → they lose **35** influence (25 if backed).
- Fail against them → they gain **10**. Failure is publicity.
- **Every *other* active villain gains 6.** This is not a difficulty slider; it is the whole game.

So the board's equilibrium is arithmetic, not authored:

```
net per turn = -35 + 6 x (N - 1)
N = 3  ->  -23     comfortable
N = 5  ->  -11
N = 6  ->   -5     still holding
N = 7  ->   +1     the cliff
```

New villains arrive on 18% of turns, so the board grows on its own. **Holding the line means
periodically choosing somebody to finish off** — and that is itself an act of neglect, because everyone
you are not attacking grows while you do it. The interesting decision is never "which incident is worth
more" but "who am I willing to let walk, and for how long."

### 10.2 Hunting

A villain with no open incident would otherwise be **completely unreachable** — you would watch their
influence climb with no legal response, which is both bad design and, in the playtest, the single thing
that made focused play indistinguishable from aimless play. So the player can **hunt**: go after a
named villain directly, any time, regardless of whether they are currently committing a crime.

A hunt costs a full turn like anything else (so every other incident still ages), rolls against a
difficulty that scales with the target's tier, and applies a **1.4× knockback** — it took the whole
night, not one incident. It is emphatically not a free action; it is a bet that finishing someone off is
worth what it costs you elsewhere.

**Stopping someone takes their outstanding work with them.** When a villain is killed or imprisoned their
open incidents come off the board. Otherwise the roster burns turns on crimes whose culprit no longer
exists, and resolving one applies pressure to nobody. This was a real bug found by the playtest.

### 10.3 What the playtest actually says

Three strategies, 200 seeds each, 600-turn cap:

| Strategy | Mean run | Survived |
| --- | --- | --- |
| Never intervene, just patrol | 104 turns | 0/200 |
| Attend a random incident | 84 turns | 0/200 |
| **Focus on whoever is closest to winning** | **225 turns** | **16/200** |

Two results worth keeping:

1. **Focusing is the only route to survival, and it is not close.** 225 vs 84 is the whole design
   functioning as intended.
2. **Aimless intervention is clearly worse than doing nothing** (84 vs 104). Turning up and reacting is
   not a strategy here: you feed every villain you were not aiming at and you take the cascading
   damage on your own hero. The game punishes heroics that are not directed.

Focused play still loses 184/200, so the run is not a formality — but it is winnable by playing well,
which is the correct shape.

## 11. Win / loss

- A villain reaching Imminent ends the run: the city answers to them.
- Your hero dying hands the city to whoever is left; dying with nobody left ends it too.
- Not yet modelled: a reputation floor across the roster, and specific villains with named ends.


## 12. Tech

Electron 33 + Vite 6 + React 18 + TypeScript 5.7 (`strict`, `noUncheckedIndexedAccess`,
`noImplicitReturns`), `@randomgeekdom/rollbard` for name generation, `tsx` headless harness.

The engine under `src/engine/` is pure TypeScript with **no DOM imports** — it ports the Blazor
`VigilantCity.Core` structure, so the two are directly comparable line for line. Seeded RNG state
serialises into the save, so a restored run continues a byte-identical stream.

Save data: Electron `userData/saves/autosave.json`.

**Bundle note:** Rollbard's name corpora dominate the JS bundle (~570 kB raw / ~208 kB gzipped). This
is a local Electron app loaded from disk, so there is no network round-trip to amortise and code
splitting would only add chunk-loading complexity for no benefit. The warning limit is raised rather
than the problem papered over.

> **Note on the v0.1 port:** the director/agency/team-deployment design and its 18 events have been
> **deleted**. They were written against a design that does not exist. The infrastructure (RNG, snapshot
> save, playtest harness, UI shell) carried over and stayed.
