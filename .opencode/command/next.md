---
description: Pick the next piece of work from TODO.md, do it, then commit and push.
---

Pick the next piece of work and see it through. The user invoked this with: $ARGUMENTS

## 1. Pick

Read `TODO.md` at the repo root. If it does not exist, say so and stop.

Offer the **top three** items with the `question` tool, in the order they appear in the file, one line
each: what the item is, and why it is worth doing now — cite the DESIGN.md section, the playtest line,
or the file it came from so the reason is checkable rather than asserted.

Then stop and wait. Do not start implementing anything before the user has chosen. If they pick
something that is not on the list, or type their own thing, use that instead; it does not have to come
from `TODO.md`.

## 2. Do

Implement the chosen item properly, the way the surrounding code is written:

- The engine under `src/engine/` is pure TypeScript with no DOM imports and must stay that way. Data
  tables and pure derivations go in `src/engine/data/`, mutation and orchestration in
  `src/engine/core/`.
- Anything derived from state is a getter, not a stored field. A counter that can drift from the thing
  it counts is a bug waiting to happen.
- Every factory wraps the session RNG, never a local one, or determinism breaks.
- Balance changes are made against the playtest, not by feel. `npm run playtest` is the instrument.
- No comments unless asked. Prose that explains *why* a rule exists is welcome in the module header,
  the way `data/villains.ts` and `data/reputation.ts` do it.
- Update DESIGN.md and the README when behaviour or balance numbers change. The balance tables in
  DESIGN.md §10.3 are measured output, not estimates, and they go stale silently.

## 3. Verify

`npm run typecheck` and `npm run playtest` must both pass. `PLAYTEST FAIL` is not a "known failure" to
work around — if an assertion now contradicts the design, the design changed, so change the assertion
and say so.

If the work touched balance, report the before/after strategy numbers from the sweep (mean run,
survivors, terminal causes) and whether the existing assertions still hold. Do not quietly re-tune a
constant to make a number look better.

## 4. Finish

- Take the item out of `TODO.md`. Add anything the work uncovered as a new item.
- `git status` and read the diff before staging. Stage only what this task touched.
- Commit in the repo's style: short imperative subject, sentence case, one line, no conventional-commit
  prefixes and no generated-by trailers.
- `git push origin <current branch>`. Never force-push and never amend something already pushed.
- Report what was committed and pushed, and anything you deliberately left out.
