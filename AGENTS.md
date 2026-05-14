# Letterfest Hackathon Template — agent guide

Local-first Vite + React template. Fork this repo as the foundation for your hackathon app. Brief, examples, and prompts: `README.md`.

Each team is expected to extend pages, data model, and UI from here rather than starting from scratch. Prefer shipping working behaviour over perfection during the hackathon, without violating the non-negotiables below.

## Non-negotiables

- Never interact with a real Supabase project (no `supabase link`, no remote DB push, no hosted Supabase URLs/keys). CLI is local-only. Schema, migrations, RLS, service-role rules, and type regeneration: see `supabase` skill.
- Stop and report on failures you cannot auto-resolve with confidence; do not paper over errors.
- No secrets in git. `.env` must not be committed. Forked teams edit `.env` only; `.env.example` is template-maintainer-owned.
- Authoritative logic lives in Postgres (RLS, RPCs) or Edge Functions, never the browser. Secret keys (service-role, third-party APIs) only in Edge Functions or DB-level functions where appropriate — never `VITE_*` or client code (see `supabase` skill).
- Do not add npm dependencies that have been untouched for a year or more (effectively abandoned).
- Do not bolt on extra cloud platforms for things Postgres/Supabase can cover (e.g. no AWS SQS for messaging when Supabase-native or Postgres-backed options suffice).

## Project shape

- Package manager: **pnpm** only (`package.json` `packageManager`).
- Stack: Vite + React SPA, React Router v7 in library mode with `BrowserRouter`, TanStack Query for data. Alias `@/` → `src/` (see `vite.config.ts`, `tsconfig.app.json`). Routes in `src/App.tsx`; pages in `src/pages/`.
- TypeScript: split project references (`tsconfig.json` → `tsconfig.app.json` + `tsconfig.node.json`). Scripts live in `package.json`.
- Quality gate: keep `pnpm run check`, `pnpm run test`, and `pnpm run build` green.

## What to use when (skills)

Read the skill body when the task matches the skill description (YAML `description` drives discovery).

| Intent                                                                    | Skill                      |
| ------------------------------------------------------------------------- | -------------------------- |
| Setup / bootstrap / fresh clone / local Supabase + deps                   | `setup`                    |
| Start or stop dev server / open localhost                                 | `manage-app`               |
| Create/move/rename files; where things live; env vars; ADR folder meaning | `repo-layout`              |
| UI, components, Tailwind, theme, icons, forms, design system              | `letterfest-design-system` |
| Login, SSO, Keycloak, OAuth, sessions, auth routes                        | `letterfest-auth`          |
| Supabase DB, migrations, RLS, Edge Functions, `supabase:gen-types`        | `supabase`                 |
| Conventional commits                                                      | `git-commit`               |

Before UI work: detect installed `@letterfestcode/storefront-ui-react` vs `@letterfestcode/backoffice-ui-react`:

```sh
jq -r '.dependencies | keys[] | select(startswith("@letterfestcode/"))' package.json
```

Use design-system primitives; do not add `lucide-react`, `react-icons`, or `heroicons`.

Auth uses Letterfest Keycloak via Supabase external provider only — no email/password or magic-link forms. Details: `letterfest-auth` skill.

After each logical change, commit using the `git-commit` skill unless the user asks to defer commits.
