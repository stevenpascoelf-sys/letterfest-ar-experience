---
name: setup
description: >-
  End-to-end macOS bootstrap for this repo after a fresh clone: Homebrew,
  Brewfile (asdf + Rancher cask, or asdf-only if Docker Desktop is already present),
  Rancher Desktop / rdctl (Kubernetes off) or Docker Desktop, asdf plugins and install,
  GitHub Packages auth in ~/.npmrc, pnpm deps, Letterfest design system package
  (storefront-ui-react for customer-facing tools, backoffice-ui-react for internal tools)
  + @phosphor-icons/react peer, Supabase local stack and .env, team name on the home
  page, dev server, and browser
  verification. Use when the user asks to set up this repo, bootstrap the project,
  get started locally, or phrases like "set up this repo" after cloning.
---

# Set up repository

**Target OS:** macOS (this template prefers Homebrew + **Rancher Desktop** per `Brewfile`; **Docker Desktop** is only accepted when it is already installed—see below).

## When to use

Apply this skill when the user wants to **set up / bootstrap / run locally** this repository (including phrases like *"set up this repo"*, *fresh clone*, *install dependencies*, *start Supabase locally*).

## Failure handling (mandatory)

- **Stop and report:** If any setup step **fails** and the failure **cannot be resolved automatically** (clear fix without guesswork), you **must** **terminate** the setup workflow immediately, **report the error** to the user (what failed, relevant command output / stderr), and **must not** continue to later steps. Do not skip the failure, paper over it, or proceed “best effort.”
- **Single exception — Rancher vs Docker Desktop:** The **only** cases where you may continue without a full Rancher Desktop install from `Brewfile` are:
  1. **Docker Desktop already present before `brew bundle`:** You detected **Docker Desktop** (see **§3**) and **skipped** the Rancher **cask** on purpose while still installing **every `brew` line** from `Brewfile`, **or**
  2. **Rancher install failed due to Docker:** **Rancher** failed to install or enable because **Docker Desktop is already installed** (installer/Homebrew conflict, explicit message that Docker Desktop is present, etc.).

  In **either** case you **may** continue with the remaining steps **only after** emitting the **same highly visible warning** (e.g. prominent heading + blockquote so it cannot be missed) that:
  - The user is relying on **Docker Desktop** instead of Rancher Desktop.
  - **Using Docker Desktop may be against their terms of service** (e.g. licensing/subscription rules for their organization)—they must verify their own obligations.
  - This template expects **Rancher Desktop** per `Brewfile`; continuing with Docker Desktop is a deviation they accept knowingly.

There are **no** other exceptions: **do not** continue after other failures you cannot auto-fix.

## 1. Team setup questions

Ask the user **both** of the following up front (so the rest of the workflow can be unattended):

1. **What is your team’s name?** (short string, e.g. `Acme` or `Team Rocket`).
2. **Is the tool you’re building customer-facing or internal?** Exactly two valid answers:
   - **Customer facing** — anything end-buyers / gifters / partners use.
   - **Internal** — anything Letterfest staff use (back-office, admin, ops tools).

   This drives which **Letterfest design system** package gets installed in **§9**:

   | Answer            | npm package                            |
   | ----------------- | -------------------------------------- |
   | Customer facing   | `@letterfestcode/storefront-ui-react`  |
   | Internal          | `@letterfestcode/backoffice-ui-react`  |

   **Remember the answer**—you will need it again in §9. If the user is unsure, ask them to pick the one closest to their hackathon idea; they can swap later, it just means re-running `pnpm add` for the other package.

Once you have the team name:

- In `src/pages/Index.tsx`, replace the placeholder **`[team name]`** with the name they gave (keep the `Team:` prefix).

## 2. Homebrew

- If `brew` is not available, install Homebrew using the current official one-liner from [https://brew.sh](https://brew.sh) (non-interactive flags if the installer supports them; otherwise guide the user through any password prompt).
- After install on Apple Silicon, remind the user that the installer may print **Next steps** to add `brew` to `PATH`; ensure `brew` works in the shell before continuing.

## 3. Brewfile

Work from the **repository root** and read [`Brewfile`](../../../Brewfile).

### 3a. Detect Docker Desktop before Rancher

**Check whether Docker Desktop is already installed** (e.g. manual install from docker.com, not necessarily via Homebrew). Primary check:

```sh
test -d "/Applications/Docker.app" && echo "Docker Desktop app present"
```

Treat Docker Desktop as **present** if `/Applications/Docker.app` exists. (If that path is missing but the user clearly has Docker Desktop elsewhere, treat that equivalently—rare.)

### 3b. Install Brewfile entries

- **If Docker Desktop is present:**
  1. Emit the **Docker Desktop warning** described in **Failure handling (mandatory)** (same text as the Rancher-conflict path)—**before** continuing.
  2. **Do not** run a plain `brew bundle` if it would install the **Rancher** cask alongside an existing Docker Desktop (conflict / unwanted). Instead, install **every `brew "…"` formula** from `Brewfile` explicitly—today that is `brew install asdf`. If `Brewfile` later lists additional `brew` lines, install **each** of them. **Skip** `cask "rancher"` (and any other cask that conflicts with Docker when applicable).
  3. **Do not** recommend installing Docker Desktop in this branch—the user already has it.

- **If Docker Desktop is not present:**
  1. Run:

     ```sh
     brew bundle
     ```

     This installs **asdf** and the **Rancher** cask per `Brewfile`. Do not recommend Docker Desktop.

  2. If `brew bundle` **fails** for a reason other than **Docker Desktop already installed / Rancher conflict**, stop and report—do not continue. If it fails **only** because Docker Desktop is already installed and Rancher cannot be installed, apply the **same exception** (emit the **Docker Desktop warning**, then continue; you may need to complete any missing `brew` installs from `Brewfile` as in the bullet above).

## 4. Container runtime (Rancher Desktop or Docker Desktop)

Local Supabase only needs a **container engine**, not a full Kubernetes cluster.

### If Rancher Desktop was installed (normal `brew bundle` path)

Keep Kubernetes off so Rancher stays lightweight.

1. Prefer starting Rancher Desktop with Kubernetes disabled (verify flags against current docs or `rdctl start --help`):

   ```sh
   rdctl start --kubernetes.enabled=false
   ```

2. If `rdctl` is not on `PATH`, use the bundled binary path (common on first install, before the GUI writes `~/.rd/bin`):

   ```sh
   "/Applications/Rancher Desktop.app/Contents/Resources/resources/darwin/bin/rdctl" start --kubernetes.enabled=false
   ```

   If that path does not exist, open Rancher Desktop from Applications once, then retry `rdctl`.

### If you are using Docker Desktop (skipped Rancher or install failed due to Docker)

`rdctl` may be unavailable—**that is expected**.

1. Ensure the Docker daemon is running, e.g. `docker info` succeeds. If not, `open -a Docker` and wait until the engine is ready (first launch may require the user to complete GUI steps).
2. You do not need to mirror Rancher’s Kubernetes-off flags on Docker Desktop for Supabase; the default engine is enough.

## 5. asdf

1. Ensure the asdf shims are on `PATH` (asdf 0.16+ uses shims; `asdf.sh` is no longer the expected setup).
2. If missing, add plugins (use current upstream plugin URLs from asdf docs):

   - `nodejs`
   - `pnpm`

3. From the **repo root**:

   ```sh
   asdf install
   ```

   This must match `.tool-versions` (Node + pnpm pins).

4. Verify the shims are actually being used (this catches silent fallbacks to a different Node on `PATH`, e.g. Homebrew):

   ```sh
   command -v node
   command -v pnpm
   ```

   Both should point to `~/.asdf/shims/...`.

5. If they do not, fix the shell setup (zsh):

   ```sh
   grep -q 'export PATH="$HOME/.asdf/shims:$PATH"' ~/.zshrc || \
     printf '\nexport PATH="$HOME/.asdf/shims:$PATH"\n' >> ~/.zshrc
   source ~/.zshrc
   ```

   Then re-run the `command -v ...` checks.

6. Confirm versions match `.tool-versions`:

   ```sh
   node -v
   pnpm -v
   ```

## 6. Environment file

From the repo root:

```sh
cp .env.example .env
```

Leave `VITE_SUPABASE_*` empty until Supabase is running (next section).

## 7. GitHub Packages auth (`~/.npmrc`)

Letterfest publishes its design system to **GitHub Packages** (`https://npm.pkg.github.com`) under the `@letterfestcode` scope. To `pnpm install` (or `pnpm add`) anything from that scope, the user’s machine must be authenticated via `~/.npmrc`. **This setup is per-user, not per-repo**—do not write the token into anything inside this repository.

### 7a. Skip if already configured

Inspect the user’s home `~/.npmrc` (it may not exist):

```sh
test -f ~/.npmrc && grep -E '^(//npm\.pkg\.github\.com/:_authToken=.+|@letterfestcode:registry=https://npm\.pkg\.github\.com)' ~/.npmrc
```

If **both** lines come back (a non-empty `_authToken=...` line for `npm.pkg.github.com` **and** the `@letterfestcode:registry=...` line), GitHub Packages auth is already wired up. **Skip §7b and §7c** and go straight to **§8**.

### 7b. Create a GitHub Personal Access Token

If §7a came back empty, walk the user through generating a PAT:

1. Open <https://github.com/settings/tokens/new> in their browser. (This is the **classic** PAT page; a fine-grained token with the equivalent **Packages: Read** permission also works—either is fine.)
2. **Note:** something like `letterfest hackathon - npm pkg`.
3. **Expiration:** the hackathon is a **single day**, so a short expiry is plenty—**7 days** is a sensible default. **Never** pick **No expiration**; if the user tries to, push back and have them choose a real expiry date instead.
4. **Scopes:** tick **`read:packages`** only. Do **not** add `repo`, `write:packages`, or any other scope—the token only needs to read public/private packages from the `@letterfestcode` scope.
5. Click **Generate token** and copy the value (`ghp_...`)—GitHub only shows it once.

> **Security:** the PAT is a credential. It must never be committed, written into `.env`, pasted into the project, or shared in chat beyond what is strictly needed to wire it into `~/.npmrc`.

### 7c. Append the auth lines to `~/.npmrc`

Ask the user for the PAT they just generated, then **append** these two lines to `~/.npmrc` (creating the file if it does not exist), substituting the real token value:

```
//npm.pkg.github.com/:_authToken=<pat value here>
@letterfestcode:registry=https://npm.pkg.github.com
```

A safe shell snippet (token is read interactively so it does not land in shell history):

```sh
read -rs PAT && printf '\n//npm.pkg.github.com/:_authToken=%s\n@letterfestcode:registry=https://npm.pkg.github.com\n' "$PAT" >> ~/.npmrc && unset PAT
```

If the user prefers to edit the file themselves, that is also fine—just confirm both lines are present afterwards by re-running the §7a `grep`.

If `~/.npmrc` already had **one** of the two lines (e.g. an existing `@letterfestcode:registry=...` entry but no token, or vice versa), append only the missing line; do not duplicate.

## 8. JavaScript dependencies

From the repo root:

```sh
pnpm install
```

Use **pnpm** only (see `package.json` `packageManager`).

If `pnpm install` prints something like `Ignored build scripts: supabase`, the Supabase CLI binary may not be created and
`pnpm exec supabase ...` will fail later. This template includes an allowlist entry in `.npmrc` for `supabase`, but if the
allowlist was added after you already installed, rerun `pnpm install`.

After install, sanity check the CLI is present:

```sh
pnpm exec supabase --version
```

## 9. Letterfest design system package

Use the **customer-facing vs internal** answer from **§1** to install **exactly one** of the Letterfest design system packages, **alongside `@phosphor-icons/react`**.

Both `@letterfestcode/storefront-ui-react` and `@letterfestcode/backoffice-ui-react` declare **[`@phosphor-icons/react`](https://phosphoricons.com)** as a **peer dependency** — pnpm does **not** install peer deps automatically, so it has to be added explicitly here. Adding it now means the agent can drop in icons immediately on first UI work, without a second install round-trip.

| Answer to §1    | Command                                                                |
| --------------- | ---------------------------------------------------------------------- |
| Customer facing | `pnpm add @letterfestcode/storefront-ui-react @phosphor-icons/react`   |
| Internal        | `pnpm add @letterfestcode/backoffice-ui-react @phosphor-icons/react`   |

From the repo root, run **the one that matches** (do not install both design-system packages):

```sh
# Customer facing
pnpm add @letterfestcode/storefront-ui-react @phosphor-icons/react

# OR Internal
pnpm add @letterfestcode/backoffice-ui-react @phosphor-icons/react
```

Troubleshooting:

- **`401 Unauthorized`** or **`E401`**: the PAT in `~/.npmrc` is missing, expired, or lacks `read:packages`. Revisit **§7**.
- **`404 Not Found`** for `@letterfestcode/...`: the `@letterfestcode:registry=https://npm.pkg.github.com` line is missing from `~/.npmrc` (pnpm fell back to the public npm registry, which does not host these packages). Revisit **§7c**. (`@phosphor-icons/react` is on the public npm registry and is unaffected by the scoped registry config.)

This will modify `package.json` and `pnpm-lock.yaml`—commit those alongside any subsequent code changes that start using the design system. **Do not** commit `~/.npmrc` (it lives in the user’s home directory, not the repo).

## 10. Local Supabase and `.env`

1. Ensure the container runtime is running and reachable (**Rancher Desktop** or **Docker Desktop**—whichever path §4 used).
2. From the repo root:

   ```sh
   pnpm exec supabase start
   ```

   Wait until it reports ready (first run can take several minutes).

   Note: this template disables Supabase local **analytics** by default in `supabase/config.toml` to avoid known Rancher Desktop
   docker socket mount issues.

3. Fetch connection details:

   ```sh
   pnpm exec supabase status
   ```

4. Set in **`.env`** (same variable names as `.env.example`):

   - `VITE_SUPABASE_URL` — API URL for local stack (often `http://127.0.0.1:54321`).
   - `VITE_SUPABASE_PUBLISHABLE_KEY` — **anon** / **publishable** key from status output (local dev uses the anon key).

5. If `supabase start` fails and you cannot fix it automatically, **stop and report** per **Failure handling (mandatory)**—do not continue.

## 11. Final checks

- Re-check the toolchain before starting the dev server (this catches silent drift back to a different Node on `PATH`):

  ```sh
  command -v node
  command -v pnpm
  node -v
  pnpm -v
  ```

  `node` / `pnpm` should still resolve to `~/.asdf/shims/...` and match `.tool-versions`.

- Optional sanity: `pnpm run check` (may take a minute).
- **Run the app:**

  ```sh
  pnpm run start:dev
  ```

- Note the **local URL** from the Vite log (default is `http://localhost:3000` per `vite.config.ts`).
- **Agents:** run `pnpm run start:dev` as a **background** / long-running job so the session stays free to open the browser and verify; do not block forever on the dev process unless the user asks.

## 12. Open in the agent browser (Cursor) / Claude Preview

This repo includes [`.claude/launch.json`](../../../.claude/launch.json) with a `vite-dev` entry (`http://localhost:3000`, `pnpm run start:dev`).

### Cursor (`cursor-ide-browser`)

If **Cursor’s browser MCP** (`cursor-ide-browser`) is available:

1. `browser_navigate` to the dev server URL from the previous step.
2. Confirm the page shows **Letterfest Hackathon 2026**, the **team line** you set, and no obvious error overlay.

### Claude Code (Preview MCP)

If **Claude Code** exposes **`mcp__Claude_Preview__preview_start`** (or equivalent Preview MCP), prefer **`preview_start`** using the `vite-dev` app defined in `.claude/launch.json` instead of manually opening a URL.

If preview automation is **not** available, tell the user to open `http://localhost:3000` manually.

## 13. Claude Code vs Cursor

- **Same steps** for both: shell commands and editing `src/pages/Index.tsx` / `.env` are identical.
- **Preview / browser:** prefer **Claude Preview** (`preview_start` + `.claude/launch.json`) when available; otherwise use **Cursor browser MCP**; otherwise instruct the user to open the printed URL.

## Checklist (copy for the user)

- [ ] Team name asked and written into `src/pages/Index.tsx`
- [ ] **Customer-facing vs internal** decided (drives which `@letterfestcode/*` package is installed in §9)
- [ ] Homebrew available
- [ ] `Brewfile` satisfied: either `brew bundle` completed **or** Docker Desktop was detected and every **`brew`** line from `Brewfile` was installed while skipping the Rancher **cask**, with the Docker warning shown
- [ ] Container runtime: **Rancher** — `rdctl` / Kubernetes disabled (`rdctl start --kubernetes.enabled=false` or equivalent) **or** **Docker Desktop** — `docker info` works
- [ ] asdf plugins + `asdf install`
- [ ] asdf shims on `PATH` (`command -v node` / `pnpm` → `~/.asdf/shims/...`) + versions match `.tool-versions`
- [ ] `.env` copied from `.env.example`
- [ ] `~/.npmrc` has `//npm.pkg.github.com/:_authToken=...` **and** `@letterfestcode:registry=https://npm.pkg.github.com` (either pre-existing or added in §7c with a fresh PAT scoped to `read:packages`)
- [ ] `pnpm install` (no `Ignored build scripts: supabase`; `pnpm exec supabase --version` works)
- [ ] Exactly **one** of `@letterfestcode/storefront-ui-react` (customer facing) or `@letterfestcode/backoffice-ui-react` (internal) installed via `pnpm add`, matching the §1 answer, **with `@phosphor-icons/react` installed alongside it** (the design-system package's peer dep)
- [ ] `pnpm exec supabase start` + `.env` filled from `supabase status`
- [ ] `pnpm run start:dev` + Preview / browser / manual verification
