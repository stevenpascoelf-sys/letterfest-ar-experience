---
name: letterfest-design-system
description: >-
  Letterfest design system for this template: Tailwind v4, storefront-ui-react or
  backoffice-ui-react, Phosphor icons. Use for UI, components, styling, Tailwind,
  forms, screens, theme, icons, Card, Button, Badge, shadcn (prefer DS primitives),
  or before adding UI libraries.
---

# Letterfest design system (hackathon template)

This template ships **Tailwind v4** wired via [`@tailwindcss/vite`](https://tailwindcss.com/docs/installation/using-vite) in `vite.config.ts` — there is **no** PostCSS pipeline and **no** `tailwind.config.ts` (Tailwind v4 doesn't require one). The Tailwind entry is `src/index.css`. Forks set up via the **`setup`** skill also have **exactly one** Letterfest design-system package installed; everything below assumes that.

**Do not** run Prettier or ESLint "fix" passes over copied **agent skills** under `.agents/skills/` / `.claude/skills/` — they are ignored for formatting/lint by design (see `.prettierignore` / `eslint.config.mjs`).

## Which design-system package is installed?

The **§1 customer-facing-vs-internal answer** in the `setup` skill picks one of two React libraries from the [`letterfestcode/design-system`](https://github.com/letterfestcode/design-system) repo (both consume the same `@letterfestcode/tokens` foundation):

| `package.json` dep                    | Audience                                          | Per-package agent doc (upstream)                                                                                                             |
| ------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `@letterfestcode/storefront-ui-react` | **Customer-facing** (buyers, gifters, partners)   | [`packages/storefront-ui-react/CLAUDE.md`](https://github.com/letterfestcode/design-system/blob/main/packages/storefront-ui-react/CLAUDE.md) |
| `@letterfestcode/backoffice-ui-react` | **Internal** (Letterfest staff, back-office, ops) | [`packages/backoffice-ui-react/CLAUDE.md`](https://github.com/letterfestcode/design-system/blob/main/packages/backoffice-ui-react/CLAUDE.md) |

**Detect which one** before you reach for any UI primitive:

```sh
jq -r '.dependencies | keys[] | select(startswith("@letterfestcode/"))' package.json
```

If neither is installed, the user has not run the `setup` skill yet — say so and stop, do not invent a different UI stack.

## Read the canonical rulebook before doing UI work

The Letterfest design system has its own **canonical agent rulebook** that lives upstream and is updated separately from this template. **Read it the first time you do any UI work in a session, and re-read it if the user describes a substantially new screen / surface.** Do not paraphrase from memory — the rules and component matrix evolve.

- **Cross-framework rulebook (always relevant):** [`docs/for-agents.md`](https://github.com/letterfestcode/design-system/blob/main/docs/for-agents.md) — the Five Rules, the component selection matrix ("I need X, reach for Y"), cross-cutting conventions, escalation criteria, and the deferred / not-in-system list.
- **Per-package guide (relevant to the one installed):** the `CLAUDE.md` from the table above — install snippets, `theme.css` import, font loading, usage examples, and the full primitive inventory.

If the agent has the upstream repo cloned, read those files directly. Otherwise fetch via `gh` (the design-system repo is private to the Letterfest org and the GitHub Packages PAT from `setup` §7 already has access):

```sh
gh api repos/letterfestcode/design-system/contents/docs/for-agents.md --jq .content | base64 -d
gh api repos/letterfestcode/design-system/contents/packages/storefront-ui-react/CLAUDE.md --jq .content | base64 -d   # or backoffice-ui-react
```

## Non-negotiables (summary — full rules upstream)

These are the rules that **must** hold even if you skip the upstream read for a tiny tweak. Anything beyond a tiny tweak: read the upstream rulebook.

1. **Use the primitive — don't hand-roll it.** If `Button`, `Card`, `Badge`, `Input`, etc. exists in the installed package, import it. No bespoke wrappers with "my own padding" / "my own colour". The libraries have been tuned against Figma node-by-node — hand-rolls drift fast.
2. **Semantic tokens, not raw scales.** In component code use `bg-background`, `bg-surface`, `bg-surface-raised`, `text-foreground`, `text-foreground-muted`, `border-border` (backoffice) or `bg-brand`, `bg-pink-500`, `text-grey-800`, `border-grey-150` (storefront). Raw scales (`gray-850`, `indigo-600`) are for brand/accent recipes only — not day-to-day surfaces. Test: swapping `.dark` ↔ `.light` on `<html>` should still look right.
3. **Variants describe appearance, not meaning.** `<Badge variant="red">Overdue</Badge>`, **never** `<Badge variant="overdue">`. Components never bake domain strings, enums, or labels — the caller supplies them.
4. **Accessibility floor.** Every interactive element keyboard-navigable. WCAG AA contrast (4.5:1 body, 3:1 UI / large text). Icon-only buttons need `aria-label` (or use `IconButton` which enforces it). Visible focus states.
5. **Don't bolt new colours / sizes / variants onto a primitive to capture a domain concept.** That's an upstream change — escalate to the human; do not silently fork a component into the consumer app.

## Tailwind v4 wiring (after `setup` installed the package)

Tailwind v4 is CSS-first — no JS config. The package's `theme.css` brings in `@letterfestcode/tokens` (colours, spacing, shadows, radius, z-index, animations, breakpoints) plus the package-specific colour + typography variables and the `@custom-variant dark` binding. **Do not** edit `theme.css`; just import it once at the top of `src/index.css`:

```css
/* src/index.css */
@import 'tailwindcss';
@import '@letterfestcode/storefront-ui-react/theme.css'; /* OR @letterfestcode/backoffice-ui-react/theme.css */
@source "./src/**/*.{ts,tsx}";
```

The package's `theme.css` already declares its own `@source` so Tailwind scans the design-system component sources inside `node_modules`. **Do not** `@source` the design-system package yourself; the single `@source` line above is for **your app's** files only. (Tailwind v4 excludes `node_modules` from content scanning by default — without the package's internal `@source` directive, DS classes like `bg-indigo-600` would silently get stripped from the compiled CSS.)

**Storefront only:** `@letterfestcode/storefront-ui-react` declares `font-heading` (Fraunces) and `font-body` (Messina Sans) but does **not** load the font files. Add the Google Fonts `<link>` tags for **Fraunces** in `index.html`. **Messina Sans** is commercial — fall back to the system sans stack for the hackathon unless the user has the licensed font files; flag the gap.

**Theme toggle (backoffice):** swap `dark` / `light` on `<html>` — remove both first so they don't co-exist:

```ts
const root = document.documentElement;
root.classList.remove('dark', 'light');
root.classList.add(theme); // 'dark' | 'light'
```

## Phosphor icons

Both libraries use **[`@phosphor-icons/react`](https://phosphoricons.com)** (regular weight, 16–20 px) — the `setup` skill installs it in §9 alongside the design-system package. **Do not** add a different icon library (`lucide-react`, `react-icons`, `heroicons`) — it will look off-brand against the rest of the system. If `@phosphor-icons/react` is somehow missing from `package.json` (older fork, pre-update setup run), run `pnpm add @phosphor-icons/react`.

## When no primitive fits

The reference implementations cover most of the spec set, but a hackathon idea may call for something genuinely new. If that happens:

1. **Check the per-package `CLAUDE.md` barrel export** (linked above) — the component may have shipped recently.
2. If the upstream **spec exists** (`docs/components/{atoms,molecules,organisms}/<name>.md` in the design-system repo) but the React package hasn't implemented it yet: build it **locally** in the consumer (e.g. `src/components/ui/<Name>.tsx`), **following the spec exactly** (variants, states, a11y, Tailwind classes). Tell the user it's a local stand-in and should be promoted upstream.
3. If **no spec exists** for the primitive: stop and ask the user. Do not invent a new primitive that contradicts the design system's conventions, and do not add new colours / variants to existing primitives to fake it.

Hackathon-specific: if escalation would block the demo and the user explicitly accepts the deviation, prefer composing existing primitives (e.g. `Card` + `Badge` + `Button`) over inventing a new one.
