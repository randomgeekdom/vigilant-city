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

- Attend a villain → they lose **30** influence. That is `INFLUENCE_ON_SUCCESS` (35) less 5 for the
  organisation behind them, and **every villain in a run arrives with one**, so 30 is the number in play
  and 35 is the base the rule is written against. Backing is a deduction, not a bonus: they are worth
  more, so the same attention buys less of them.
- Fail against them → they gain **10**. Failure is publicity.
- **Every *other* active villain gains 5.** This is not a background decay; it is the whole game. The
  5 is the price of inattention, and it is the one number on this list the player gets to choose
  (§10.5) — but its *cause* is not negotiable, because it is always your turn spent elsewhere.

So the board's equilibrium is arithmetic, not authored:

```
net per turn = -30 + 5 x (N - 1)
N = 3  ->  -20     comfortable
N = 5  ->  -10
N = 7  ->    0     exactly break-even
N = 8  ->   +5     the cliff
```

New villains arrive on 18% of turns, so the board grows on its own. **Holding the line means
periodically choosing somebody to finish off** — and that is itself an act of neglect, because everyone
you are not attacking grows while you do it. The interesting decision is never "which incident is worth
more" but "who am I willing to let walk, and for how long."

The cliff is a function of that 5, so it moves with the difficulty setting rather than being a fixed
number in the design: on the Average city the board holds seven and the cliff is eight, and on a
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
| Knockback, work mopped up at the scene | −30 | **×0.5 to ×0.65** |
| Knockback, hunted directly | −30 × 1.4 | **×0.8 to ×0.95 of that** |
| Seeds their own work | 30%/turn | 40%/turn, **rising to 80% the longer they are left** |

Growth in that table is the Average city's price of inattention (§10.5) plus the boss's own; a harder
city raises the first term and leaves the second alone.

The split in that table is the whole mechanic. Cleaning up after a boss barely touches them, so **going
and getting them is the only answer** rather than an optional extra — and the playtest asserts exactly
that, as expected progress per attempt, because a miss hands influence straight back:

```
mopping up:   0.5 x -16.5  + 0.5 x +10   =  -3.3 per night
hunting:      0.5 x -37.8  + 0.5 x +10   = -13.9 per night
```

Those are the harness's own numbers for the boss it finds first — Invisibility, at ×0.55 and ×0.9 — and
the playtest prints them on every run precisely so this example cannot quietly go stale.

Hunting still lands hard on a boss, because it has to. A resistance that applied at full strength to
hunts as well would make a boss a wall rather than a threat, and the sweep showed exactly that: focused
play collapsed from 142 turns to 76 and stopped being survivable at all.

**At most two at once.** A run should have faces in it, not a bestiary.

#### A boss left alone is a bill for the attention you did not spend

Every other number in that table is charged to the player who *turns up*. Mopping up after a boss barely
moves them, hunting them costs nights, killing them costs the whole roster standing and containing them
makes them worse — all of it lands on whoever engages, because that is the only thing the attentive player
ever does with a boss. Which means the mechanic could not punish neglect at all: an aimless player pays
nothing for a boss, because they never touch one.

`bossBill` is the other axis. A boss who is never attended stops being a police problem and becomes a
**workload**, and every fifteen points of influence past the threshold they were given adds a unit of bill
to a ceiling of two. Each unit adds 20 points to how often they seed work of their own, so a boss at the
ceiling spreads it at 80% a turn against an ordinary notable's 30%.

```
influence     55      70      85     100
bill units     0       1       2       2
seeding      40%     60%     80%    80%
```

**It is a derivation, not a counter.** Nothing is stored, no turn is counted, and no state is threaded
through the turn: the bill is read off influence past the threshold, influence only ever rises through
diversion, and a knockback is applied *before* the board is ticked — so attention is what lowers it, and
hunting a boss once takes their bill back to whatever it was. A run that never goes and gets one sees it
climb; a run that hunts one never lets it leave zero. The playtest asserts both halves, because "it grows
with neglect" on its own would also be true of a mechanic that punished whoever happened to be fighting.

**Paid in work rather than in standing, and that routing is the point.** The obvious channel for a bill is
the trust floor, and it was measured: a direct per-hero trust charge produces about six times the raw units
between the strategies and moves the strategy gap by *nothing*, while flipping most aimless runs from being
conquered to being stood down by the city. It collapses the two clocks §11.1 rests on for no balance gain.
Seeding more work is the one thing a neglected boss can do an ordinary villain cannot, it costs the player
nothing directly, and it lands on the existing trust clock through work nobody got to — an extra crime
expires into the same bleed as any other, so it cannot become a second floor.

It also cuts both ways honestly, which is why it widens the gap instead of ending runs everywhere: **more
work on the board is more work a focused player can get to.** Aiming at the worst villain now finds their
crime on the board more often, which is exactly the advantage the design is about.

**The effect is real and small.** The Average city reads 31 / 43 / **105** against 32 / 42 / **102** before,
so the focused-to-aimless gap goes 60 turns to 62 — about a tenth of the 21 turns it would take to restore
the pre-boss figure, and every other candidate measured moved it less. What the number does *not* do is
change the story, and the next section is why that story was misread in the first place.

#### The end is a fork

Nobody with this much influence is stopped by doing the job properly, so when a boss's influence reaches
zero the player is choosing between the two available answers, and both of them cost something.

**Kill them.** Permanent. The city knew that name, and it watched the roster execute somebody it
recognised, so **every hero on the roster takes one point of standing.** It is the same weight as one
night of crime nobody showed up for, and it is deliberately nothing like a second floor — three points of
debt per hero is the entire budget a run has, and pricing lethal force at two of them made the fork a lie,
because the playtest then took the cheap branch 183 times to 140 and the kills were what ended runs.

**Contain them.** Free, and it buys nothing. They are back before the night is out at **45** — below the
threshold that made them a boss, so the promotion does not re-trigger — with another power on them, one more
point of unattended growth for every time you do it (bounded at two for growth, though resistance keeps
worsening past that cap), and measurably harder to shift for having been let go. **Their open incidents stay
on the board**, which is what stops the non-lethal branch being a reward: a boss who is back within the hour
has not had their crimes dealt with, and clearing them would hand the player both a tidy board and the same
villain.

The honest summary of the fork: **permanent and expensive, or cheaper and repeating.** Its one real worth is
that it is the branch which does not cost the city's standing, which is a genuine reason to take it when
the roster cannot afford the other one. It is not a way to win the same fight twice.

**A containment costs a second night, and that number was chosen rather than inherited.** The arithmetic is
`BOSS_RETURN_INFLUENCE` at 45 against a hunt at `1.4 × 30 × 0.8–0.95` = 33.6–39.9. It used to sit at 40 —
not because anybody picked it, but because correcting the knockback sign (see the note at the end of
`TODO.md`) quietly moved the hunt down underneath it, leaving 40 exactly one night clear of zero at the top
of the range. 45 is the smallest round figure that survives the worst case, so no single night can finish a
returned boss whatever they are carrying, and it is still ten under the threshold. The playtest contains 122
bosses across 96 seeds, every one of them back at 45, and asserts the ceiling directly.

**The escalation has teeth now, and the teeth are in both multipliers.** `bossResistance` used to read only
`villain.boss` — the *first* power — so a boss holding six took exactly the same effort to move as one
holding two, and the list the player is shown as their escalation record was decoration. Each power after
the first now takes a step out of both: **×0.9** on work mopped up at the scene, **×0.97** on a hunt. The
asymmetry is the point, and it is not leniency. Tidying up after a boss was already nearly pointless, so a
steep step there costs nothing real; by the end of the list it is not a slower route to the same place but no
route at all, because the expected progress per night goes *positive* — every attempt at the scene hands back
more influence than it takes off. The hunt step is gentle because hunting is the player's one tool against
escalation and a boss has to stay a threat rather than become a wall. Walked across a real boss's whole list:

```
escapes        0      1      2      3      4      5      6
mopping up  -4.0   -3.1   -2.3   -1.6   -0.9   -0.3   +0.2
hunting     -12.8  -12.3  -11.8  -11.3  -10.8  -10.3   -9.9
growth       +1     +2     +3     +3     +3     +3     +3
```

Both columns climb towards zero and only one of them crosses it, which is the mechanic restated as
arithmetic. Growth is a rate and stays capped at +3; resistance is a multiplier, so the escalation does not
stop at two containments.

### 10.4 What the playtest actually says

Three strategies, 200 seeds each, 600-turn cap, on the **Average** city (§10.5 — that is the default, and
it is the run the rest of this document describes). The last column is how many of those runs ended on
the city losing faith rather than on a villain taking it (§11.1):

| Strategy | Mean run | Survived | Ended on trust |
| --- | --- | --- | --- |
| Never intervene, just patrol | 31 turns | 0/200 | 80 |
| Attend a random incident | 43 turns | 0/200 | 59 |
| **Focus on whoever is closest to winning** | **105 turns** | **1/200** | 101 |

Two results worth keeping:

1. **Focusing is the only route to survival, and it is not close.** 105 vs 43 is the whole design
   functioning as intended.
2. **Aimless intervention is barely better than doing nothing** (43 vs 31). Turning up and reacting is
   not a strategy here: you feed every villain you were not aiming at and you take the cascading
   damage on your own hero. The game punishes heroics that are not directed.

   There is a condition on that, and the sweep found it. The claim is about the **conquest** clock, and
   it is measured as a turn count, so it holds wherever conquest is what ends the run. Where the trust
   clock is what ends it, merely turning up does buy time, because attending any incident at all stops
   it expiring and an expiring crime is what spends the city's patience: on a Difficult city, where
   163/200 focused runs die on trust, aimless play runs 30 turns against 20 for doing nothing. What it
   never buys anywhere is a run it survives — 0/200 on all four cities, which is what the harness now
   asserts instead of a turn band, since ten turns means something very different on a run of 20 than on
   a run of 220.

   The band that used to stand in for this was a fixed +10 turns, and it is gone. It sat *exactly* on its
   own boundary (42 against 32) and it was never a claim about anything: the harness's own note on it
   said ten turns means one thing on a run of 220 and another on a run of 19. What replaces it is the
   claim in its own units — focusing buys `focus − neglect` turns over inaction, and turning up without
   a target may capture at most a third of that difference.

Focused play still loses 199/200, so the run is not a formality — but it is winnable by playing well,
which is the correct shape. Note that focusing buys *time*, not safety: it is the only strategy that
survives long enough to run into the trust floor, and 101 of its 199 losses are there rather than in a
fight with a villain.

**Bosses made the whole city harder. They did not close the gap between the strategies, and the spread in
turns is what made it look like they did.** Before bosses the same sweep read 54 / 59 / 142; after them,
32 / 42 / 102. Every strategy got about 28% shorter, which is the point — neglect produces bosses and
aimless play feeds them. What the gap does *not* do is move, and the way to see that is to stop counting
turns:

| | Never intervene | Attend randomly | Focus | Focus ÷ aimless | Focus ÷ never |
| --- | --- | --- | --- | --- | --- |
| Before bosses | 54 | 59 | 142 | **2.41×** | 2.63× |
| After bosses | 32 | 42 | 102 | **2.43×** | 3.19× |
| After the bill (§10.3) | 31 | 43 | 105 | **2.44×** | 3.39× |

The turn-denominated spread fell from 83 to 60 to 62, and the ratio moved from 2.41× to 2.43× to 2.44×.
A run that is a third shorter has a third narrower spread, so "the spread narrowed" was arithmetic about
run length rather than evidence about the mechanic — and focus's advantage over doing *nothing* actually
widened throughout, from 2.63× to 3.39×. Read that way the mechanic did what it was built to do: punish
the player who ignores people more than the player who goes and gets them. The bill in §10.3 pushes the
same way for a tenth of a turn; the honest conclusion is that this gap is dominated by whether villains
leave the board at all, and the strategies differ there by 187 boss kills to 4.

**Giving escalation teeth moved that gap the wrong way, and it is worth being precise about why.**
The two halves of the boss fork are priced separately and they came apart cleanly. Making a returned boss
escalate (40 → 45 return, and a step out of both resistance multipliers per escape) is worth about
**nothing** to the sweep: with the escalation in place and the return figure left at 40, the Average city
still reads 32 / 42 / **110**, and survival actually *rises* from 2/200 to 6/200, because a boss that gets
harder to contain is a boss the harness ends up killing instead, and a kill is permanent. The eight-turn
drop is the deliberate price of the containment branch, not a side effect of the escalation.

The reason that widens nothing is structural: escalation lands on the player who *engages*, because the
mop-up route is already a dead end and the hunt is the only one left. A boss who escapes six times is a
boss the focused player has to spend six more nights on, so the mechanic punishes the attentive. That is
what the bill in §10.3 exists to answer, and it is deliberately the opposite construction: influence past
the threshold, which attention is what lowers.

Two other routes to the same gap were measured and are ruled out, so that nobody re-derives them:

- **A cheaper hunt against bosses** cannot be chosen, only stumbled on. Because mopping up is already at
  zero progress by full escalation, a cheaper hunt pushes bosses into the *containment* branch rather than
  past it — and containment is a stall. Focus reads 106 / 93 / 95 / 99 turns at 90% / 80% / 70% / 60% of
  today's hunt resistance: not a gradient, a spike.
- **Making the execution itself cheap** is the one number that materially moves focused play, and it moves
  the wrong way. `BOSS_DEATH_TRUST_COST` of 0 buys focused play ten turns (112) and one extra survivor;
  3 costs it twenty-eight (74). That is the fork's price doing its job, and it is charged to the player
  who wins, so it is not the lever this was looking for either.

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
| Easy | +4 | −6 | 8 | 9 |
| Average | +5 | −3 | 7 | 8 |
| Difficult | +6 | −2 | 6 | 7 |
| Backbreaking | +8 | −1 | 4 | 5 |

**The growth numbers are the free variable and the capacity column is derived from them** — the city
holds `30 / growth + 1` villains and the cliff is the next one up — so the growth column was re-derived
when the live knockback turned out to be 30 and not the 40 the engine had been running (see the
deduction in §10.1). It moved 5/6/8/10 → 4/5/6/8, the same quarter off what inattention costs that came
off what attention buys, and the capacity column followed it down from 8/6/5/4 to 8/7/6/4.

The alternative was tried and rejected: 4/6/7/10 keeps the old capacity column exactly, and leaves the
Average city with no winnable run at all (0/200 focused runs survive) and aimless play beating inaction
there by 12 turns. Keeping a derived column is not worth losing the two claims in §10.4, and the
equilibrium argument itself is indifferent — a board that fills and a cliff that bites is a board at any
growth.

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
| Easy | 50 | 59 | **215** | 13/200 | 3 |
| Average | 31 | 43 | **105** | 1/200 | 101 |
| Difficult | 20 | 30 | **44** | 0/200 | 163 |
| Backbreaking | 8 | 8 | **10** | 0/200 | 194 |

Three things worth keeping:

1. **The setting is genuinely a setting, and it does not break the game.** Focused play is 215 / 105 /
   44 / 10 down the ladder, and focusing still beats both aimless play and doing nothing on *every*
   city. A knob that left the strategy ordering intact while moving run length by a factor of twenty is
   a difficulty setting; one that only reordered the strategies would have been a different game.
2. **The two clocks swap ends.** An Easy run is almost never lost to lost confidence — only 3/200 end on
   trust, so the floor barely fires. A Backbreaking run almost always is: 194/200, because a floor of
   −1 per guardian is three bad nights from the end. Difficulty does not just shorten runs, it changes
   *how they fail*, which is the more interesting thing for the player to be choosing between.
3. **Easy is winnable and still not a formality.** 13/200 focused runs survive the 600-turn cap, against
   1/200 on Average, and the harness is three lines of scripted heuristics rather than a player.

#### When the floor actually pulls

The column above counts *outcomes* — how many runs ended on the floor — and an outcome says nothing about
whether the floor was a clock you played against or a condition that arrived at the end. So the harness
reads the trust margin every turn and, for each city, records the turn from which a focused run never
leaves the margin again, how many turns of warning it gets before that, and how many runs never commit to
the floor at all. Median over the same 200 seeds:

| City | The floor becomes the run's clock at | Warning | Of the run | Never came near it | Never committed |
| --- | --- | --- | --- | --- | --- |
| Easy | turn 223 (n=9) | 1 turn | 1% | 151/200 | 191/200 |
| Average | turn 44 (n=137) | 2 turns | 4% | 1/200 | 63/200 |
| Difficult | turn 8 (n=181) | 4 turns | 29% | 1/200 | 19/200 |
| Backbreaking | turn 0 (n=200) | 5 turns | 100% | 0/200 | 0/200 |

Every column is a median over the 200 seeds of that city, and the medians are taken over the runs that
commit at all — which is why Easy's `n=9` is printed. A run that never enters the margin has no
committed turn, and Easy is mostly those.

This is a real result and it is not flattering. **The warning is one to five turns on every city**, and it
was measured against a band of six points. A band in points is not a band in anything the player counts:
one unattended crime costs every hero on the roster a point, so six points is a night and a half on a roster
of four, and a single blown cover is five of them. On most runs the band was jumped rather than travelled
through, so the floor read as a cliff with a countdown attached rather than as a clock closing over a run,
and on Easy it is not a mechanic at all for 191 runs out of 200: those runs are not nearly lost on
confidence, they are never asked the question.

#### The band is two nights, and the other widths are priced

`TRUST_MARGIN` was a constant; the band is now `WARNING_NIGHTS` nights of movement — a roster rather than a
number, for the same reason the floor is, because what the band is measured against is one night and one
night costs the whole roster. In those units the meter and the countdown beside it say the same thing: the
city starts asking when two nights of nobody answering are left. Two nights is what ships, and it was
chosen by re-reading the same 200 focused runs per city at every candidate width rather than by feel. Each
cell is median warning turns, median share of the run, and runs that never committed — the three readings
the table above prints, and the harness prints them on every run so the width cannot move without its price
showing up beside it:

| Band | Easy | Average | Difficult | Backbreaking |
| --- | --- | --- | --- | --- |
| 1 night | 0 turns, 0%, 196 never | 0 turns, 0%, 74 | 1 turn, 4%, 25 | 0 turns, 0%, 1 |
| **2 nights (shipped)** | 1 turn, 1%, 191 | 2 turns, 4%, 63 | 4 turns, 29%, 19 | 5 turns, 100%, 0 |
| 3 nights | 1 turn, 0%, 184 | 6 turns, 14%, 37 | 12 turns, 100%, 15 | 5 turns, 100%, 0 |
| 4 nights | 1 turn, 0%, 144 | 18 turns, 100%, 19 | 14 turns, 100%, 10 | 5 turns, 100%, 0 |

Both ends of the trade are asserted in those units, so the next person to move the width sees the shape
before they see the result. **One night does not warn**: the median warning is zero turns on three of the
four cities, because the band opens and the run ends in the same turn — that is the original complaint
about the six-point band, arriving on schedule whatever the roster. **Four nights stops being a warning**:
the median Average run is committed to the band from turn 0 and spends the whole run inside it, so `held`
is a state that city never shows, and three does the same to Difficult while still buying Average a clock
you can see (6 turns, 14% of the run). Two nights is the widest band on which no city but Backbreaking has
a median run committed from turn 0. Backbreaking is the exception that reads right rather than a leak: it
forgives one point per guardian, so the band is wider than its entire allowance, and on the one city where
194 runs in 200 end on the floor an amber meter from the first night is the honest reading.

The choice changes no run. Every mean run length, survivor count and terminal cause in §10.4 and in the
sweep above is identical before and after, because the band reaches `trustVerdict` and the harness's
reading of the meter and nothing else. The readings that moved are the ones taken against the band —
whether a run ever came near it, how often it committed for good, and when — and only on Average: never
committed went 65 → 63 for focused play, 76 → 67 for neglect and 94 → 92 for turning up without a target,
and the other three cities did not move at all.

What the ladder *does* do, and the playtest asserts in the two units that survive the runs getting
shorter, is make the floor bite earlier and more often: `warningShare` rises 1% → 4% → 29% → 100% and
`neverCommitted` falls 191 → 63 → 19 → 0. The floor column in the table above is real. It is simply a
sharper knife rather than a longer clock, and whether a sharper knife is the right way to scale the second
half of a difficulty setting is the open question §11.1 ends on.

None of these numbers have been re-fitted against them. The floors were last fitted to run lengths, and a
run length cannot tell you this — so re-fitting them to *these* numbers would be the same mistake wearing a
different hat. A human has still not played an Easy and a Backbreaking run with the meter in front of
them; that is what the TODO carries.

Easy has been winnable at a price twice now. Pricing the containment branch deliberately (§10.3) took it
from 19 survivors to 9, and the bill for leaving a boss alone (§10.3) has put four of them back — which
is the shape you want from a mechanic that punishes neglect, since the attentive player is the one who
pays it. The ordering has not moved and the ladder still spans a factor of twenty from end to end.

Average is the identity: it is the run the rest of this document was measured against, it is what a run
gets if the caller does not name a city, and it is the row the difficulty knob was fitted around.

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
interesting result. Trust at the end of a run sits in a narrow band (median −10 focused, −4 aimless, −8
never intervening) however you played — the bleed is driven by how much damage the city has taken, not by
how cleverly you took it. What skill buys is *time*: focused play does not commit to the floor until turn 44
against 25 for doing nothing and 24 for turning up without a target, and no strategy avoids it — 137 of 200
focused runs commit to the floor, against 133 for doing nothing and 108 for turning up without a target.
Skill moves the deadline; it does not buy immunity. So the floor does not add a skill test, it
adds the sentence the whole design has been circling: **you can survive any single crisis, but you cannot
keep doing this for two hundred nights.** Long runs now die of exhaustion rather than conquest, and 101/200
focused runs end that way.

What skill does *not* buy is notice. The median focused run gets the same two turns of warning as an
aimless one, and so does every other city — what attention buys is how many nights pass before the floor is
the run's clock at all, not how long you get to watch it coming. Read as a share of the run the median
focused run spends 4% of itself inside the margin, and on Average that is the entire difference between
winning and being stood down. Both numbers are in the harness because neither one is a balance knob: they
are what the floor *is*, and §10.5 shows what it does across the ladder.

**The floor arrives as a cliff, not a clock, and that is now measured rather than suspected.** On all four
cities a focused run gets between one and five turns of warning before the floor becomes its clock
(§10.5). The band was widened for exactly this and the warning did not get longer, which is the finding:
the shortness was never the band. It is two nights of movement now rather than six points — the same
sentence as the countdown beside it, chosen from the widths priced in §10.5 — and on Easy 191/200 focused
runs still never commit to the floor at all, because the floor ends 3 of that city's 200 runs and the ones
that do commit are usually ending to conquest in the same turn. No display-only number can make that a
clock. The floor as fitted is a terminal condition with a knife in it, not something a player watches
closing over a run, and that is the honest summary of `trustFloorPerHero`: it is fitted to run lengths and
to the strategy ordering, and neither of those can see this. Nothing here has been re-fitted to make the
warning look longer — the floors still reach only the floor and the band still reaches only
`trustVerdict` — because a longer warning measured by the same three scripted strategies would be exactly
the fit that produced the number in the first place.

The meter is built so that a human can answer that question rather than guess at it. The roster panel leads
with the **distance to the floor** in points and in nights of nobody answering, and draws the run's margin
against the floor line so it is visible whether the floor has been closing all along or only just started
to.

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
