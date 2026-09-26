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
I willing to let rot." And the clock moves *only when you act*, so tension scales with engagement —
a player who stops resolving things doesn't get a free month, they get a collapse.

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

## 10. Win / loss — **partially unmodelled**

Implemented: the run ends when no hero remains at all (your hero died with no one left to inherit).

Still unmodelled and worth a decision:
- Reputation floor across the roster — the city stops fielding you.
- A pressure clock. **The playtest found a real problem:** across 200 seeds, 0 runs ever ended, and
  the board drained to empty (mean open incidents at the turn cap: 0.00). Incidents expire faster
  than the city produces them, so there is no escalating difficulty and no reason to feel behind.
  Right now "Patrol" is a manual button, which makes the game a placid sequence of clean-ups.
  Something needs to make the city worse over time. Not designed yet.
- A specific villain to a specific end.

## 11. Tech

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
