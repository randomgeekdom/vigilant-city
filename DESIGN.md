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
- **Every *other* active villain gains 6.** This is not a background decay; it is the whole game. The
  6 is the price of inattention, and it is the one number on this list the player gets to choose
  (§10.5) — but its *cause* is not negotiable, because it is always your turn spent elsewhere.

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

The cliff is a function of that 6, so it moves with the difficulty setting rather than being a fixed
number in the design: on the Average city the board holds six and the cliff is seven, and on a
Backbreaking one it holds four and the cliff is five.

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

### 10.3 Bosses - the ones you let go

Villains are procedurally named and procedurally weak, and a name becomes worth remembering the only way
anything in this game does: **by being left alone.** Nobody spawns as a boss and no boss is authored. At
**55 influence** — between Notable and Severe, so it is always a tier you can see coming — a villain
grows into one. The name is the one the name generator gave them on their first night, and the player
remembers it because they watched that number climb for forty turns while they were busy elsewhere.

This is the point of putting the gate on influence and nowhere else. Influence only ever rises through
diverted attention, so **a boss is a bill for attention you did not spend.** There is still no tide and
nothing in the background gets worse on its own. If you never let anybody slide, you will never meet one.

A boss takes on a second power from a curated set, and that power is not flavour — it is the *reason*
for their two numbers, and it is what the player is reading when they work out who to leave alone:

| | Ordinary villain | Boss |
| --- | --- | --- |
| Second power | none | one, which sets both numbers below |
| Unattended growth | +6 | +7, and +1 more for every failed containment |
| Knockback, work mopped up at the scene | −35 (−40 backed) | **×0.5 to ×0.65** |
| Knockback, hunted directly | −35 × 1.4 | **×0.8 to ×0.95 of that** |
| Seeds their own work | 30%/turn | 40%/turn |

Growth in that table is the Average city's price of inattention (§10.5) plus the boss's own; a harder
city raises the first term and leaves the second alone.

The split in that table is the whole mechanic. Cleaning up after a boss barely touches them, so **going
and getting them is the only answer** rather than an optional extra — and the playtest asserts exactly
that, as expected progress per attempt, because a miss hands influence straight back:

```
mopping up:   0.5 x -17.5  + 0.5 x +10   =  -3.8 per night
hunting:      0.5 x -32.6  + 0.5 x +10   = -11.3 per night
```

Hunting still lands hard on a boss, because it has to. A resistance that applied at full strength to
hunts as well would make a boss a wall rather than a threat, and the sweep showed exactly that: focused
play collapsed from 142 turns to 76 and stopped being survivable at all.

**At most two at once.** A run should have faces in it, not a bestiary.

#### The end is a fork

Nobody with this much influence is stopped by doing the job properly, so when a boss's influence reaches
zero the player is choosing between the two available answers, and both of them cost something.

**Kill them.** Permanent. The city knew that name, and it watched the roster execute somebody it
recognised, so **every hero on the roster takes one point of standing.** It is the same weight as one
night of crime nobody showed up for, and it is deliberately nothing like a second floor — three points of
debt per hero is the entire budget a run has, and pricing lethal force at two of them made the fork a lie,
because the playtest then took the cheap branch 183 times to 140 and the kills were what ended runs.

**Contain them.** Free, and it buys nothing. They are back before the night is out at **40** — below the
threshold, so the promotion does not re-trigger — with another power on them and one more point of
unattended growth for every time you do it, bounded at two so the escalation cannot run away. **Their
open incidents stay on the board**, which is what stops the non-lethal branch being a reward: a boss who
is back within the hour has not had their crimes dealt with, and clearing them would hand the player both
a tidy board and the same villain.

The honest summary of the fork: **permanent and expensive, or free and repeating.** Its one real worth is
that it is the branch which does not cost the city's standing, which is a genuine reason to take it when
the roster cannot afford the other one. It is not a way to win the same fight twice.

**This branch is weaker than it looks, and the playtest says so.** The harness can contain the same boss
six times in thirty-five turns, and every time they come back heavier. The reason is arithmetic:
`BOSS_RETURN_INFLUENCE` is 40 and a hunt deals `1.4 × 35 × 0.8–0.95` = 39.2–46.6, so **a returned boss
is one hunt from zero again for every power in the set.** Containment is a treadmill, not a setback. It
also means the escalation has no teeth past its cap — powers three through eight do not change resistance
at all, because that reads only the first power. TODO covers both.

### 10.4 What the playtest actually says

Three strategies, 200 seeds each, 600-turn cap, on the **Average** city (§10.5 — that is the default, and
it is the run the rest of this document describes). The last column is how many of those runs ended on
the city losing faith rather than on a villain taking it (§11.1):

| Strategy | Mean run | Survived | Ended on trust |
| --- | --- | --- | --- |
| Never intervene, just patrol | 37 turns | 0/200 | 104 |
| Attend a random incident | 44 turns | 0/200 | 71 |
| **Focus on whoever is closest to winning** | **100 turns** | **2/200** | 120 |

Two results worth keeping:

1. **Focusing is the only route to survival, and it is not close.** 100 vs 44 is the whole design
   functioning as intended.
2. **Aimless intervention is barely better than doing nothing** (44 vs 37). Turning up and reacting is
   not a strategy here: you feed every villain you were not aiming at and you take the cascading
   damage on your own hero. The game punishes heroics that are not directed.

Focused play still loses 198/200, so the run is not a formality — but it is winnable by playing well,
which is the correct shape. Note that focusing buys *time*, not safety: it is the only strategy that
survives long enough to run into the trust floor, and 120 of its 198 losses are there rather than in a
fight with a villain.

**Bosses made the whole city harder, and closed the gap between the strategies.** Before them the same
sweep read 54 / 59 / 142 with 6 survivors; now it reads 37 / 44 / 100 with 2. Every strategy got
shorter, which is the point — neglect produces bosses and aimless play feeds them. But the spread
between focused and aimless play narrowed from 83 turns to 56, when the intent was for it to widen: a
boss is supposed to punish the player who ignores people *more* than the player who goes and gets them.
As it stands the mechanic is roughly neutral on that gap. See the TODO.

The harness's focused strategy hunts a boss rather than mopping up after it, because mopping up is
precisely what the resistance numbers make pointless. That is the script correcting itself to model a
player who has read the tile, not a constant tuned to flatter the result — and the mechanic is separately
asserted, so a regression in it fails the playtest rather than showing up as a nicer number.

### 10.5 How hard is the city

A run picks its city before the first night, in `data/difficulty.ts`, and the choice is part of the save
(snapshot v5) rather than a UI preference — a run that came back on a different city would be a run the
player did not agree to finish. It moves exactly two numbers, and they are the two clocks the game ends on:

| | Unattended growth | Trust floor per guardian | Villains the city can hold | The cliff is one above |
| --- | --- | --- | --- | --- |
| Easy | +5 | −6 | 8 | 9 |
| Average | +6 | −3 | 6 | 7 |
| Difficult | +8 | −2 | 5 | 6 |
| Backbreaking | +10 | −1 | 4 | 5 |

**A harder city is not a city that decays.** There is still no tide and nothing in the background gets
worse on its own. Every point a villain gains is a point they gained because the player was busy
somewhere else; the setting changes the *magnitude* of inattention, never its cause. Villain arrival
rate is deliberately left alone — who moves into the city is the city's business, not the setting's.

**It does not touch the per-incident difficulty** in §5 either. That would be a hit-point slider wearing
a costume: it changes how often the dice agree, not what the game asks the player to do. Nobody reaches
a better decision because their target number went from 10 to 15.

**The trust floor runs the counterintuitive way round.** The floor is negative, so a hard city has a
*shallower* allowance, not a deeper one — `trustFloorPerHero` climbs towards zero as the city gets
harder. A run ends when trust goes *under* the floor, so more room below zero is more run, not less.
The first pass at this table ran the floor the intuitive way and the playtest caught it in one run:
Easy lost the city in twelve turns while Average ran a hundred, so the knob was making the game easier
the harder it got. The table above is the corrected one.

#### What the sweep says

The same three strategies, 200 seeds each, on each city:

| City | Never intervene | Attend randomly | Focus | Focus survived | Focus ended on trust |
| --- | --- | --- | --- | --- | --- |
| Easy | 63 | 62 | **244** | 24/200 | 2 |
| Average | 37 | 44 | **100** | 2/200 | 120 |
| Difficult | 20 | 29 | **44** | 0/200 | 169 |
| Backbreaking | 9 | 8 | **12** | 0/200 | 188 |

Three things worth keeping:

1. **The setting is genuinely a setting, and it does not break the game.** Focused play is 244 / 100 /
   44 / 12 down the ladder, and focusing still beats both aimless play and doing nothing on *every*
   city. A knob that left the strategy ordering intact while moving run length by a factor of twenty is
   a difficulty setting; one that only reordered the strategies would have been a different game.
2. **The two clocks swap ends.** An Easy run is almost never lost to lost confidence — only 2/200 end on
   trust, so the floor barely fires. A Backbreaking run almost always is: 188/200, because a floor of
   −1 per guardian is three bad nights from the end. Difficulty does not just shorten runs, it changes
   *how they fail*, which is the more interesting thing for the player to be choosing between.
3. **Easy is winnable and still not a formality.** 24/200 focused runs survive the 600-turn cap, against
   2/200 on Average, and the harness is three lines of scripted heuristics rather than a player.

Average is the identity: it is the run the rest of this document was measured against, so its row is
unchanged from before the setting existed, and it is what a run gets if the caller does not name a city.

## 11. Win / loss

- A villain reaching Imminent ends the run: the city answers to them.
- The city losing faith in the roster ends the run: nobody is left who answers.
- Your hero dying hands the city to whoever is left; dying with nobody left ends it too.
- Specific villains with named ends: modelled as **bosses** (§10.3) rather than as authored characters.
  Nobody is written by hand; a villain earns a name worth remembering by being neglected into one, and
  gets a fork for an end instead of a scripted one.

### 11.1 The reputation floor

The other way to lose is not a person taking the city. It is the city deciding it never wanted a
guardian. Every hero's reputation is the city's opinion of that hero and the roster's **trust** is the
sum of them, so a roster can bleed out while every individual hero still looks acceptable — and one
spectacular hero cannot carry a city that has stopped believing in the rest of them.

**Trust is not a second resource.** Nothing new feeds it. It moves for the three reasons it has always
moved for — work answered (up or down), a cover blown (−5), and crimes nobody showed up for (−1 to
*every* hero on the roster). The floor is what makes those consequences cost something at the end, and
it is the piece that was missing.

```
floor = trust per guardian x heroes on the roster
      = -3 x roster size        on the Average city (§10.5)
```

Three points of debt **per guardian**, so a bigger roster is a bigger promise rather than four people
inheriting the credit for one. It is negative because goodwill is a debt: the city starts willing to
give you the benefit of the doubt and only asks for it back after you fail. A new run starts at 0 with a
floor of −9, so there are nine points of slack to spend. The per-guardian number is chosen by the run's
difficulty setting rather than being global — see §10.5 for the table, including why a harder city has a
*shallower* allowance and not a deeper one.

What the playtest found is that this is a **patience clock, not a skill clock**, and that is the more
interesting result. Trust at the end of a run sits in a narrow band (median ≈ −10) whether you focused,
spread your attention, or never intervened at all — the bleed is driven by how much damage the city has
taken, not by how cleverly you took it. What skill buys is *time*: focused play meets the floor at turn
~102, aimless play at ~42. So the floor does not add a skill test, it adds the sentence the whole design
has been circling: **you can survive any single crisis, but you cannot keep doing this for two hundred
nights.** Long runs now die of exhaustion rather than conquest, and 108/200 focused runs end that way.

Two consequences worth keeping:

1. **The two clocks are independent, and a run can end on either.** The playtest asserts a run that
   ended on trust with its worst active villain nowhere near 100. Losing the city is a different failure
   from handing it to someone, and a design that only had the first would have a single failure mode.
2. **Going public is now a gamble against the floor.** Disclosure costs 15 reputation, which is most of
   what the city is holding in trust. It is still the right play for a hero whose cover is already gone,
   and it can be the thing that ends the run for a hero whose cover is not. The meter says so out loud.

Attrition cuts both ways: a hero who quits or dies takes their standing out of the sum with them, so
losing people at a deficit can *raise* trust while making the villain board far more dangerous. That is
not a special case in the code, it just falls out of a sum, and it is the sort of thing a player should
be allowed to discover.


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
