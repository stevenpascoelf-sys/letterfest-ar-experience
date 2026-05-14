---
name: repo-layout
description: >-
  Where files live in this hackathon template. Use when creating, moving, or
  renaming files or directories; adding pages, components, hooks, migrations,
  edge functions; or when the user asks where something should go or for project
  structure.
---

# Repository layout (Letterfest Hackathon Template)

## Required paths

| Area                         | Purpose                                                            |
| ---------------------------- | ------------------------------------------------------------------ |
| `index.html`                 | Vite entry HTML (mounts `<div id="root">`)                         |
| `src/main.tsx`               | App entry (mounts React, imports global CSS)                       |
| `src/App.tsx`                | Router + global providers (`QueryClientProvider`, `BrowserRouter`) |
| `src/pages/`                 | Page components (one component per route)                          |
| `src/integrations/supabase/` | Browser Supabase client + generated DB types                       |
| `src/index.css`              | Global CSS (Tailwind v4 entry: `@import "tailwindcss";`)           |
| `public/`                    | Static assets served from the site root (`/favicon.svg`, etc.)     |
| `supabase/migrations/`       | SQL migrations (local-only workflow)                               |
| `supabase/config.toml`       | Local Supabase stack config                                        |

## Optional directories (add when useful—none are required)

| Path                   | Typical use                                                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `src/components/`      | Reusable React UI pieces                                                                                               |
| `src/hooks/`           | Reusable React hooks (e.g. `useAuth`)                                                                                  |
| `src/lib/`             | Shared utilities and pure-TS helpers (no React)                                                                        |
| `src/lib/types/`       | Shared TypeScript types                                                                                                |
| `src/lib/constants/`   | Shared constants                                                                                                       |
| `supabase/functions/`  | [Supabase Edge Functions](https://supabase.com/docs/guides/functions) — server-side logic that does not fit in SQL/RLS |
| `docs/`                | Team docs and runbooks                                                                                                 |
| `docs/adrs/`           | [Architecture Decision Records](https://adr.github.io/) — for **hackathon team** major decisions                       |
| `scripts/`             | One-off maintenance scripts (Node, shell)                                                                              |

## Architecture Decision Records (ADRs)

When the **hackathon team** makes a **major** decision (architecture, security-sensitive flows, data model shape, integration choices, or anything that would confuse a future reader), capture it in an ADR under `docs/adrs/`—e.g. `0001-short-title.md`. Prefer a short standard structure (context, decision, consequences). Add or update an ADR when such decisions are made or agreed during implementation, then commit with the related change when practical.

## React + Vite conventions

- **`@/`**: alias for `src/` (see `resolve.alias` in `vite.config.ts` and `paths` in `tsconfig.app.json`). Use it for everything internal — e.g. `import { supabase } from '@/integrations/supabase/client'`. Avoid long `../../..` relative imports.
- **Routing**: `react-router-dom` v7, **library mode** with `BrowserRouter` (not RR framework mode). Routes live in `src/App.tsx`; page components live in `src/pages/`.
- **Data fetching**: prefer `@tanstack/react-query` (`useQuery` / `useMutation`) over hand-rolled `useEffect` + `useState`. The single `QueryClient` is wired in `src/App.tsx`.
- **No SSR / no server routes.** This is a **single-page app**. Anything that must not be tampered with by the browser belongs in Postgres (via RLS / RPCs / views) or in a Supabase Edge Function under `supabase/functions/` — see the `supabase` skill for server vs client responsibilities.

## Environment variables (Vite)

Public env vars (via `import.meta.env`; only `VITE_*` is exposed to client code):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` (anon/publishable key)

These live in **`.env`** for local dev (not committed). For hosted builds (e.g. GitHub Actions → Vercel), the same **public** keys may live in **`.env.prod`**, which teams **may commit**. **`pnpm run build`** runs **`vite build --mode prod`**, so Vite loads **`.env.prod`**. Do **not** commit **`.env`**, service-role keys, or anything private. Anything in a `VITE_*` variable is **public** (it ends up in the JS bundle).

## Set up this repo

Use the project **`setup`** skill: `.agents/skills/setup/SKILL.md` (Claude: `.claude/skills/setup`).
