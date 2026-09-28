# TODO

Backlog for Vigilant City. `/next` reads this file, suggests the top items, and takes the one you pick.
Remove an item when it is done. If the work uncovers something new, add it here.

Ordered roughly by value per unit of effort. Each item says where it comes from, so nobody has to
re-derive it.

## No run-level difficulty

The four tiers in `data/difficulty.ts` are per-incident rolls that `IncidentFactory` picks at random;
nothing ever sets one for a whole run. `NewGameOptions` has no difficulty field and `NewGame.tsx` has no
selector, so every run is the same run. Worse, the new city trust floor is a single global constant, so
it cannot be tuned per tier either. Decide what a difficulty setting changes — the floor, the villain
economy in `data/villains.ts`, or both — and thread it through `NewGameOptions`, the snapshot, and the
playtest sweeps.

## The containment branch is a treadmill, and later powers are flavour

Uncovered by the boss work, and the more honest of the two findings. Two related problems in
`data/bosses.ts`:

- `BOSS_RETURN_INFLUENCE` is 40, but a hunt deals `1.4 × 35 × 0.8–0.95` = 39.2–46.6, so a boss that has
  just been contained is **one hunt from zero again** for every power in the set. The playtest can
  contain the same boss six times in thirty-five turns. An earlier code comment claimed "the dent you put
  in survives" and it does not. Raising the return influence, or making a returned boss resist the first
  hunt, would make the non-lethal branch cost something the way the lethal branch does.
- Escalation stops mattering at two containments. `bossGrowth` caps the growth bonus, and
  `bossResistance` reads only `villain.boss` — the *first* power. So a boss at six powers takes exactly
  the same effort to move as one at two, and the list the player is shown as their escalation record is
  mostly decoration.

Decide whether a boss should get measurably harder each time it gets away. If yes, resistance has to
start reading the whole list. If no, stop showing the player a growing power count as though it meant
something.

## Bosses narrowed the strategy gap instead of widening it

Uncovered by the boss work. DESIGN.md §10.4 records the before/after: before bosses the sweep read
54 / 59 / 142 with 6 survivors, after them 37 / 44 / 100 with 2. Every strategy got shorter, which is
intended — neglect produces bosses and aimless play feeds them — but the gap between focused play and
aimless play narrowed from 83 turns to 56 when the intent was to widen it, because a boss is supposed to
punish the player who ignores people *more* than the player who goes and gets them. As it stands the
mechanic is roughly neutral on that gap. Something that hits only the inattentive, or a cheaper hunt
against bosses, would restore the ordering. `BOSS_POWERS` in `data/bosses.ts` is the place to look.

## The disclosure path never fires

The playtest reports `runs with a disclosed hero: 0/200` across 200 seeds. Disclosure is a real
counter-strategy (`identity.disclose`: −15 reputation, permanent legitimacy, can never be blown again)
and it is on a button in `RosterView`, but the trigger conditions for it are never met in actual play, so
it is a mechanic with no playtest coverage. Work out whether it is unreachable, unreachable-but-fine
(an intentional panic button), or reachable only in situations the strategies never produce — then
either fix it or assert the intent.

## `state.alerts` is dead

The engine maintains `state.alerts`, rebuilds it every turn in `buildAlerts`, and serialises it into the
save. No UI component reads it — `grep` for `alerts` only hits the engine. Either surface it somewhere
useful (the Chronicle is the obvious candidate) or delete it and its save field. Do not leave a
per-turn array maintained for nobody.

## No migration path across snapshot versions

`GameSession.fromSnapshot` throws when `snap.version !== SNAPSHOT_VERSION`, and `App.tsx` swallows that
in a bare `catch` and treats the run as "no save". `SNAPSHOT_VERSION` is 4 — it went to 4 when bosses
added `VillainData.boss` and the `escaped` status, so every v3 save is already silently a lost run with no
message. Bump the version whenever the shape changes and make the failure visible — distinguish "corrupt"
from "too old" in the UI at least.

## The trust floor has never met a human

`TRUST_FLOOR_PER_HERO = -3` was tuned against three crude scripted strategies, and the harness says so
(see DESIGN.md §11.1). Nobody has played a run start to finish with the meter in front of them. Play a
few and report where it actually feels like it pulls — too early, too late, or not at all — before the
next balance pass trusts the numbers again.
