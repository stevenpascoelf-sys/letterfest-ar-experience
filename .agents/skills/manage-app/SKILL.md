---
name: manage-app
description: >-
  Start or stop the Letterfest hackathon Vite app locally. Use when the user asks
  to start the app, run the dev server, open localhost, preview the UI, stop the
  server, kill the dev server, or free port 3000.
---

# Manage local dev server (Vite + Supabase)

## Start the app

When the user asks to **start the app**, **run the dev server**, **open the UI**, etc.:

1. **Supabase (local):** Ensure the local stack is running. From the repo root, run `pnpm exec supabase status`. If the stack is not up or the command shows it is stopped, run `pnpm exec supabase start` and wait until it is ready. If this fails and you cannot fix it automatically, stop and report—see non-negotiables in `AGENTS.md`.
2. **Vite:** Run `pnpm run start:dev` as a **background** / non-blocking task (long-running dev server).
3. **Process ID:** **Record and surface the PID** you need to stop later—e.g. the PID of the background shell job from your environment's terminal metadata, or the `vite`/`node` process listening on the dev port (`lsof -ti :3000` on macOS after startup). **Tell the user the PID** (and which one it is) so a later "stop the app" request can target the right process.
4. **Preview:** If a **preview / Simple Browser / browser MCP** is available, open the app at **`http://localhost:3000`** (or the URL Vite prints if it differs).

## Stop the app

When the user asks to **stop the app**, **stop the dev server**, **kill the server**, etc.:

- Stop the running dev server using the **PID you recorded** (e.g. `kill <pid>`), or the platform's equivalent for stopping the background job. Verify the process is gone (or the port is free) before confirming.
