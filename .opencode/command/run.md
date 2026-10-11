---
description: Launch the Vigilant City Electron app in dev mode.
---

Run the Vigilant City app so the user can play it. The user invoked this with: $ARGUMENTS

## 1. Preflight

`node_modules` must exist at the repo root. If it does not, run `npm install` first. If a Vite dev
server is already listening on port 5173, do not start a second one — report that the app is already
running and stop.

## 2. Launch

Start the dev app in the background so this command does not block on the long-running dev server:

```powershell
Start-Process npm.cmd -ArgumentList 'run','dev'
```

The `dev` script runs Vite on port 5173 and opens Electron once the port is up. Pass through any flags
the user supplied in `$ARGUMENTS` as extra arguments.

## 3. Confirm

Wait a few seconds, then check that the Vite server is listening on 5173
(`Test-NetConnection -ComputerName localhost -Port 5173`). If it is not up yet, wait and check again.

## 4. What to look at while playing

Opening the window is the point of this command — it reaches the part the headless harness cannot
measure — so hand the player the readings the playtest is blind to:

- **Choose a city first.** Easy and Backbreaking are the two ends of the ladder. Easy runs are almost
  never lost on trust (2/200) and Backbreaking runs almost always are (187/200) — DESIGN.md §10.5 — and
  those are the two runs the backlog wants a human to compare.
- **Heroes tab, for the whole run.** The panel leads with the distance to the floor in points and in
  nights of nobody answering, draws the run's margin against the floor line, and turns from *held* to
  *slipping* at two nights. The harness measures the floor arriving as a cliff with nought to four turns
  of warning on every city; whether that reads as a run that ended or a run that ended *unfairly* is the
  judgement the numbers cannot make (DESIGN.md §11.1).
- **City tab, for the one rule.** You answer exactly one incident and pick two of five approaches, and
  every other open incident ticks down by one — so watch what you let rot, not the optimal move.
- **The two boards.** The incident never names its culprit, so match the work to the name you are
  neglecting — and watch someone at 55 influence stop being a problem and start being a boss, with the
  kill-or-contain fork when they reach zero (DESIGN.md §10.3).

## 5. Report

Say that the app is running, and how to stop it (close the Electron window; kill the `concurrently`
process if Vite is still holding port 5173).
