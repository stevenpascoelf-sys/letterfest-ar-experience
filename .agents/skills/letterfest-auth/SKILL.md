---
name: letterfest-auth
description: >-
  Letterfest hackathon Keycloak SSO via Supabase (staff-nonprod realm). Use when
  adding auth, login, sign-in, SSO, OAuth, OIDC, Keycloak, sessions, logout,
  protected routes, useAuth, Auth.tsx, AuthCallback, exchangeCodeForSession, or
  when the user asks for a profiles table mirroring IdP identity.
---

# Letterfest authentication (Keycloak + Supabase)

**Only if the app actually needs sign-in.** Many hackathon apps will be **fully public** (no accounts)—in that case **do not** add auth complexity; skip the rest of this document.

When the app **does** use authentication, follow these rules.

## Provider: Letterfest Keycloak (`staff-nonprod` realm) — no username/password forms

- Sign-in goes through **Keycloak OIDC** via Supabase's external provider. **Do not** build an email/password form, magic-link form, or any other Supabase-native sign-in UI.
- The provider is **pre-wired** in `supabase/config.toml` (realm `staff-nonprod`, client id `hackathon`, secret committed) and shared across all hackathon repos. Teams do **not** need to configure anything to use it.
- **Hackathon-only exception:** the Keycloak client secret is committed in `supabase/config.toml` for this hackathon because the `hackathon` client is short-lived and will be removed after the event. **Do not** copy this pattern into anything longer-lived—use `secret = "env(SUPABASE_AUTH_EXTERNAL_KEYCLOAK_SECRET)"` substitution and keep the value out of git for any production integration.

## Required route shape when auth is added

- `src/pages/Auth.tsx` (route `/auth`) — a single page with one **"Sign in with Letterfest SSO"** button. Clicking it kicks off the OIDC flow. The `openid profile email` scopes **must** be requested explicitly so Keycloak returns the ID token claims this template relies on for profile data (see "Profile data comes from Keycloak" below):

```ts
import { supabase } from '@/integrations/supabase/client';

await supabase.auth.signInWithOAuth({
  provider: 'keycloak',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
    scopes: 'openid profile email',
  },
});
```

- `src/pages/AuthCallback.tsx` (route `/auth/callback`) — exchanges the `?code=…` for a session **on the client** with `supabase.auth.exchangeCodeForSession(window.location.href)`, then navigates to the post-login destination (e.g. `/`). The Supabase client in this template uses `flowType: 'pkce'` with `detectSessionInUrl: false`, so the manual exchange call is required (and not double-fired). Follow the [Supabase OAuth flow docs](https://supabase.com/docs/guides/auth/social-login/auth-keycloak) and [`exchangeCodeForSession`](https://supabase.com/docs/reference/javascript/auth-exchangecodeforsession) reference.
- Use the **client session** via `supabase.auth.getSession()` / `supabase.auth.onAuthStateChange(...)` from `src/integrations/supabase/client.ts`. A typical pattern is a small `useAuth()` hook plus a `<ProtectedRoute>` wrapper around routes that require sign-in. There is **no** server-side session check in this SPA — auth is enforced by **RLS** on the database, not by route guards on the client (which a tampered client could bypass).

## Logout (optional, but if implemented)

- Call `supabase.auth.signOut()` only — this clears the **local app session**.
- **Do not** also redirect users to Keycloak's `end-session` / `logout` endpoint. Staff stay signed into the wider Letterfest SSO session across other apps; only the local app session is cleared. Supabase's `signOut()` already behaves this way by default—the rule is "don't add extra IdP-logout code on top".

## Profile data comes from Keycloak, not from your own table

- Read identity fields (name, email, avatar, etc.) from the Keycloak claims that Supabase surfaces on the user object—e.g. `user.user_metadata`, `user.identities[0].identity_data`, or the raw ID token—**not** from a `profiles` table you maintain.
- App-specific data (per-app preferences, ownership of records, roles that only mean something inside this app, etc.) is still fine in Postgres. The rule is specifically about **identity/profile** fields that already live in the IdP.
- **Agent rule (MUST):** If a user asks to build a `profiles` table (or otherwise duplicate Keycloak-owned identity fields into the app database), you **must** prominently warn that **this is not recommended by the Letterfest Engineering department** before doing it. Only proceed if the user explicitly insists after seeing the warning.

**Productionisation note:** the IdP boundary stays clean—keep "who is signed in" (Keycloak) separate from app-specific authorization data (Postgres), so the system survives swapping the IdP without rewriting the data model.
