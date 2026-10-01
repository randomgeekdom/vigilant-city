# TODO

Backlog for Vigilant City. `/next` reads this file, suggests the top items, and takes the one you pick.
Remove an item when it is done. If the work uncovers something new, add it here.

Ordered roughly by value per unit of effort. Each item says where it comes from, so nobody has to
re-derive it.

## The trust floor and the difficulty ladder have never met a human

Uncovered by the run-difficulty work, and the same species of problem one notch apart. The Average city's
`THREAT_DEFS.average.trustFloorPerHero = -3` was tuned against three crude scripted strategies, and the
harness says so (see DESIGN.md §11.1). The other three cities (4/5/6/8 growth, -6/-2/-1 floor) are newer
and were fitted to exactly two things: a monotone ordering of run length, and the existing strategy claims
staying true. That is not the same as being right. "Easy runs 220 turns" means "the bot survives Easy more
often", not "Easy is fun" or "Easy lasts long enough to be a run" — and Easy is the number most likely to
be wrong, because at growth 4 the board holds eight villains before the cliff, and the design argues
elsewhere that a crowded board is no more readable than a board of numbers.

Worse, the whole growth column was re-derived when the knockback sign was fixed (see the note at the end
of this file), so none of these numbers have been looked at since. They were re-derived proportionally
rather than chosen, which keeps the four cities in order and nothing more — it says nothing about whether
they are four good shapes.

Play an Easy and a Backbreaking run start to finish with the meter in front of them, and report where
each one actually feels like it pulls — too early, too late, or not at all — before the next balance pass
trusts these numbers again.

## Bosses narrowed the strategy gap instead of widening it

Uncovered by the boss work. DESIGN.md §10.4 records the before/after: before bosses the sweep read
54 / 59 / 142 with 6 survivors, after them 33 / 42 / 110 with 2. Every strategy got shorter, which is
intended — neglect produces bosses and aimless play feeds them — but the gap between focused play and
aimless play narrowed from 83 turns to 68 when the intent was to widen it, because a boss is supposed to
punish the player who ignores people *more* than the player who goes and gets them. As it stands the
mechanic is roughly neutral on that gap. Something that hits only the inattentive, or a cheaper hunt
against bosses, would restore the ordering. `BOSS_POWERS` in `data/bosses.ts` is the place to look.

Giving the escalation teeth moved this the *wrong* way and the reason is worth keeping, because it
rules out the obvious fix. Pricing containment deliberately (40 -> 45 return, and a step out of both
resistance multipliers per escape) took the spread from 68 to 60, but the two halves came apart cleanly:
with the escalation in place and the return figure left at 40, the Average city still reads 32 / 42 / 110
and survival *rises* from 2/200 to 6/200. Escalation lands on whoever engages, because mopping up is
already a dead end and the hunt is the only route left — a boss who escaped six times is six more nights
for the attentive player. So "make bosses escalate harder" cannot widen this gap; it is a cost charged
for the fight rather than for the neglect. What is needed is a cost charged for the neglect itself —
something that gets worse the longer a boss sits unattended and unattended — which is a different
mechanic from anything in `BOSS_POWERS`.

## The disclosure path never fires

The playtest reports `runs with a disclosed hero: 0/200` across 200 seeds. Disclosure is a real
counter-strategy (`identity.disclose`: −15 reputation, permanent legitimacy, can never be blown again)
and it is on a button in `RosterView`, but the trigger conditions for it are never met in actual play, so
it is a mechanic with no playtest coverage. Work out whether it is unreachable, unreachable-but-fine
(an intentional panic button), or reachable only in situations the strategies never produce — then
either fix it or assert the intent.

## Every villain in a run is backed, so backing is a flat tax and not a distinction

Uncovered by fixing the `knockback` sign, and the reason that fix cost what it did. `introduceVillain` in
`core/GameSession.ts` picks an organisation and passes `org?.ideology ?? null` as the backer, `ideology` is
a non-nullable `CellId`, and organisations are never removed — a run starts with two or three. So
`backedBy` is **never null in play**: `knockback(null)` is a branch no run reaches, and
`BACKED_PENALTY` is a flat 5 off every villain rather than a thing that makes some of them harder. It is
also why the sign bug survived so long, since the "unbacked" figure the design documents is a number the
player never meets.

Decide what backing is for. Either some villains arrive with nobody behind them, so an org is a reason to
pick one target over another (the Prison view already prints it, so the player can act on it), or the
mechanic is renamed and re-aimed at what it actually does — a flat tax that funds the villain economy.
Whichever it is, the equilibrium in DESIGN.md §10.1 should be written in the number the game actually
uses, not the base it subtracts from.

## `state.alerts` is dead

The engine maintains `state.alerts`, rebuilds it every turn in `buildAlerts`, and serialises it into the
save. No UI component reads it — `grep` for `alerts` only hits the engine. Either surface it somewhere
useful (the Chronicle is the obvious candidate) or delete it and its save field. Do not leave a
per-turn array maintained for nobody.

## No migration path across snapshot versions

`GameSession.fromSnapshot` throws when `snap.version !== SNAPSHOT_VERSION`, and `App.tsx` swallows that
in a bare `catch` and treats the run as "no save". `SNAPSHOT_VERSION` is 5 — it went to 4 when bosses
added `VillainData.boss` and the `escaped` status, and to 5 when the run's threat level joined the save,
so every v4 save is now a silently lost run with no message. Bump the version whenever the shape changes
and make the failure visible — distinguish "corrupt" from "too old" in the UI at least. There is no
migration to write here, only the distinction to make: a save the game cannot read is a fact the player
is entitled to.

## Note: where the 30 came from, for whoever tunes this next
`knockback()` used to return `INFLUENCE_ON_SUCCESS - BACKED_PENALTY`, so a backed villain lost 40
influence instead of 35 — more pushback, against the comment, the constant's name, and the author's own
commit message. It is now `INFLUENCE_ON_SUCCESS + BACKED_PENALTY`, which is 30 for every villain in a
run (see the backing item above for why that is all of them). The playtest had been re-deriving the same
expression by hand with the opposite sign in two places, so it agreed with itself and disagreed with
the game; it now calls `knockback` and asserts the direction.

That took a quarter off the player's only lever, so the difficulty ladder was re-derived with it rather
than left to be discovered: `divertedGrowth` went 5/6/8/10 → 4/5/6/8, the same quarter off the price of
inattention that came off the price of attention. 4/6/7/10 was tried first, because it keeps the old
"villains the city can hold" column (8/6/5/4) exactly, and it was rejected: the Average city had no
winnable run at all and aimless play beat doing nothing there by 12 turns. The equilibrium argument is
indifferent to the growth number — a board that fills and a cliff that bites is a board at any growth —
so the claims in DESIGN.md §10.4 won. The trust floors were not re-fitted; they did not need it, and they
are the subject of the first item on this list.

## Note: where 45 and the resistance steps came from
`BOSS_RETURN_INFLUENCE` was 40 and `bossResistance` read only `villain.boss`, the first power. Both are
now deliberate. 40 was never chosen: it was a number the knockback sign fix above left stranded, one
night clear of the strongest hunt in the game (`1.4 × 30 × 0.95` = 39.9) by a tenth of a point, so a
returned boss was one hunt from zero and the non-lethal branch was free. 45 is the smallest round figure
that survives the worst case, and it is still ten under `BOSS_THRESHOLD`.

The resistance steps are `BOSS_RESISTANCE_STEP` 0.9 and `BOSS_HUNT_RESISTANCE_STEP` 0.97, applied per
escape and shared with `bossGrowth` through `bossEscapes` so the two cannot drift apart. The asymmetry is
not leniency: mopping up was already nearly pointless, so a steep step there costs nothing real and by the
sixth escape the expected progress per night goes positive — tidying up after a fully-escalated boss is
not a slower route to the same place, it is no route at all. The hunt step is gentle because hunting is
the player's only tool against escalation and a boss has to stay a threat rather than a wall. Both
columns are printed and asserted in the playtest, so the next person to move a number sees the shape
before they see the result.

