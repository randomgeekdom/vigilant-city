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

## 4. Report

Say that the app is running, and how to stop it (close the Electron window; kill the `concurrently`
process if Vite is still holding port 5173).
