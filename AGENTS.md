# Working in this repo

## Always finish by committing and pushing

When a task is done, commit it and push it. No waiting to be asked.

- `npm run typecheck` and `npm run playtest` must both pass first.
- Read `git status` and the diff before staging, and stage only what the task touched.
- Commit style: short imperative subject, sentence case, one line. No `feat:`/`fix:` prefixes, no
  generated-by trailers. Match the existing log.
- `git push origin <current branch>`. Never force-push, never amend a pushed commit.
- Rollback is `git revert`, so a new commit is almost always the right move over rewriting history.
- Say what was pushed. Leaving work uncommitted "for review" is not the convention here.

## Layout

```
src/engine/     pure TypeScript, no DOM imports, framework-agnostic
  core/         types, RNG, the session loop, per-system rules
  data/         tables and pure derivations
  playtest.ts   headless harness — this is the test suite
src/ui/         React views
electron/       window + save IPC
```

## Invariants that are easy to break

- **The engine has no DOM imports.** It runs headless in the playtest; that is the only reason balance
  can be measured at all.
- **Seeded RNG state serialises into the save**, so a restored run continues a byte-identical stream.
  Every roll goes through the session RNG. A factory that takes its own `Random` breaks replay.
- **Derived state is a getter, not a field.** Trust is the roster sum, not a counter.
- **`npm run playtest` is the test suite** and it asserts design claims, not just "it did not throw". A
  failing assertion means the design changed: change the assertion deliberately and say so.
