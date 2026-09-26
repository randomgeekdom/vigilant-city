# TODO

Backlog for Vigilant City. `/next` reads this file, suggests the top items, and takes the one you pick.
Remove an item when it is done. If the work uncovers something new, add it here.

Ordered roughly by value per unit of effort. Each item says where it comes from, so nobody has to
re-derive it.

## Named villains with named ends

The last thing DESIGN.md §11 lists as unmodelled. Villains are procedurally generated influence blobs
with no arc: you finish them off or you don't, and nothing about them is memorable. Give a handful of
recurring antagonists authored names, a grievance, and a named end — so that a run has faces in it
rather than a board of numbers. Needs new data under `src/engine/data/`, spawn weighting in
`CharacterFactory.createVillain`, and a decision about what happens to a named villain's incidents and
backers when they get their end.

## No run-level difficulty

The four tiers in `data/difficulty.ts` are per-incident rolls that `IncidentFactory` picks at random;
nothing ever sets one for a whole run. `NewGameOptions` has no difficulty field and `NewGame.tsx` has no
selector, so every run is the same run. Worse, the new city trust floor is a single global constant, so
it cannot be tuned per tier either. Decide what a difficulty setting changes — the floor, the villain
economy in `data/villains.ts`, or both — and thread it through `NewGameOptions`, the snapshot, and the
playtest sweeps.

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
in a bare `catch` and treats the run as "no save". `SNAPSHOT_VERSION` is 3, so any real save from an
earlier build is silently a lost run with no message. Bump the version whenever the shape changes and
make the failure visible — distinguish "corrupt" from "too old" in the UI at least.

## The trust floor has never met a human

`TRUST_FLOOR_PER_HERO = -3` was tuned against three crude scripted strategies, and the harness says so
(see DESIGN.md §11.1). Nobody has played a run start to finish with the meter in front of them. Play a
few and report where it actually feels like it pulls — too early, too late, or not at all — before the
next balance pass trusts the numbers again.
