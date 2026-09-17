# Frontend Plan: Identity v2 Features

Status: **implemented, 2026-09-17** (§1–§7 all built and verified against the real backend, including a live avatar upload round-trip to S3). This was a self-contained implementation spec for the frontend half of the identity overhaul documented in `identity-v2-design.md` (backend, fully shipped) — written so it could be handed to a different agent/session without needing this repo's chat history. Left in place as a record of the design/build order, not as pending work. One deliberate deviation from §3: rather than adding a separate "Settings" item only inside `UserMenu.tsx`'s dropdown, the header's pre-existing gear-icon dropdown (previously a "Coming soon" placeholder) was wired to link straight to `/settings` too — both entry points now work, rather than leaving the existing placeholder stale.

## 0. What already exists — read this first

The frontend already has a working, tested auth foundation. Don't rebuild any of this, extend it:

- **`resonance/frontend/src/auth/AuthContext.tsx`** — holds `accessToken`, `refreshToken`, `userId`, `email`, `displayName` (note: **not** `avatarUrl` or `preferences` yet — see §2). Exposes `isAuthenticated`, `setAuth(response)`, `logout()`, and `getValidAccessToken(): Promise<string>` — the last one is the important one: it returns a still-valid access token, transparently refreshing via `POST /api/auth/refresh` first if the current one is within 30s of expiring (access tokens live 15 minutes). **Every authenticated call in this plan must go through `getValidAccessToken()`**, not read `accessToken` directly off context — reading it directly risks using an expired token.
- **`resonance/frontend/src/api/auth.ts`** — `login`, `register`, `refreshAuth`. Pattern: plain `fetch`, throws a plain `Error` with a user-facing message on non-2xx.
- **`resonance/frontend/src/types/auth.ts`** — `AuthResponse` interface matching the backend's `AuthResponseDto` (`userId, email, displayName, accessToken, accessTokenExpiresAtUtc, refreshToken, refreshTokenExpiresAtUtc`).
- **`resonance/frontend/src/hooks/useSubmitComment.ts`** — the one existing example of an authenticated mutation: `const token = await getValidAccessToken(); return someApiCall(token, ...)`. Copy this shape for every new authenticated hook below.
- **`resonance/frontend/src/components/layout/UserMenu.tsx`** — current account dropdown: shows a colored circle with the user's first initial, display name, email, and a logout button. This is where avatar display and a link to the new settings page both belong.
- **`resonance/frontend/src/components/layout/HeaderDropdown.tsx`** — generic dropdown-panel component (trigger + panel, closes on outside-click/Escape). Reuse this rather than building a new dropdown primitive.
- **`resonance/frontend/src/pages/LoginPage.tsx`** — two-panel login/register page. This is where the "Sign in with Google" button goes.
- Routing: `resonance/frontend/src/App.tsx`, plain `react-router-dom` `<Routes>`/`<Route>`, currently only `/` and `/login`. New routes get added here.
- Comments carry **zero author identity** (`PlaceComment` type has no `userId`/name/avatar, and feedback-service's API doesn't expose one either) — avatars from this plan will be visible in account UI only, not next to comments. Not in scope to change that here.

## 1. Visual conventions to match (don't introduce new patterns)

- Brand color is `--color-brand-*` (`#E1552E`), Tailwind's default `rose-*` must never be used instead.
- Section micro-labels: `font-mono text-[10-11px] uppercase tracking-[0.1em]` (sometimes `tracking-[0.2em]`), usually `text-stone-500`.
- Dividers between sections: `border-t border-stone-900/10 pt-4` (or `mt-N` to match).
- Cards/panels: `rounded-xl` or `rounded-2xl`, `border border-stone-900/10`, background around `bg-stone-900/[0.025]` to `bg-panel/95` depending on context (`bg-panel` for floating/dropdown surfaces, the lighter tint for inline cards).
- Buttons: primary actions use `bg-brand-500 text-brand-ink hover:bg-brand-600`, full pill shape (`rounded-full`) for calls to action, `rounded-xl` for form inputs.
- Errors render as `rounded-xl border border-sentiment-negative/25 bg-sentiment-negative/10 px-3 py-2 text-sm text-sentiment-negative` (see `CommentForm.tsx`, `LoginPage.tsx` for exact usage).
- Focus states: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500` on every interactive element — this project is deliberate about accessibility, don't skip it.
- **Don't add heavy glow/shadow/gradient decoration.** Two earlier redesigns were explicitly rejected by product feedback for exactly this (see `PROGRESS.md`'s "Key decisions"). The current look is clean and restrained — match it, don't embellish.

## 2. Shared infrastructure to build first

Every feature below needs an authenticated JSON request. Right now that pattern (`getValidAccessToken()` + manual `fetch` + `Authorization: Bearer`) is inlined once, in `api/feedback.ts`. With 8+ new authenticated calls arriving, inlining it 8 more times is real duplication — worth a small shared helper before writing the first feature.

**New file: `resonance/frontend/src/api/identity.ts`** (all identity-service calls live here, mirroring how `api/feedback.ts` is feedback-service-only)

```ts
const IDENTITY_API_BASE_URL = import.meta.env.VITE_IDENTITY_API_BASE_URL ?? 'http://localhost:5076';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function authedFetch(path: string, accessToken: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(`${IDENTITY_API_BASE_URL}${path}`, {
    ...init,
    headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    let message = 'Something went wrong. Please try again.';
    try {
      const body = await response.json();
      if (typeof body?.error === 'string') message = body.error;
    } catch {
      // response wasn't JSON - keep the generic message
    }
    throw new ApiError(response.status, message);
  }

  return response;
}
```

All the functions in §3–§6 below build on `authedFetch`. Each API function still takes an explicit `accessToken: string` parameter (not a hook) — this keeps `api/identity.ts` a plain module with no React dependency, matching every other file in `api/`. Hooks are where `getValidAccessToken()` gets called (see `useSubmitComment.ts` for the pattern).

## 3. Profile (view + edit)

**Backend**: `GET /api/identity/me` → `{ id, email, displayName, avatarUrl, preferencesJson, createdAt }`. `PATCH /api/identity/me` body `{ displayName?, preferencesJson? }` → `204`.

**`types/identity.ts`** (new)
```ts
export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  preferencesJson: string | null;
  createdAt: string;
}
```

**`api/identity.ts`** additions
```ts
export async function getMe(accessToken: string): Promise<UserProfile> {
  const response = await authedFetch('/api/identity/me', accessToken);
  return (await response.json()) as UserProfile;
}

export async function updateProfile(accessToken: string, updates: { displayName?: string; preferencesJson?: string }): Promise<void> {
  await authedFetch('/api/identity/me', accessToken, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
}
```

**`hooks/useProfile.ts`** (new) — `useQuery` wrapping `getMe`, same shape as `usePlaceComments.ts`, but needs `getValidAccessToken()` from `useAuth()` first (query only enabled when `isAuthenticated`).

**`hooks/useUpdateProfile.ts`** (new) — `useMutation`, invalidates the profile query key on success, same shape as `useSubmitComment.ts`.

**UI**: a new **Settings page** (not a modal — this project doesn't use modals anywhere, don't introduce the pattern). Route `/settings`, guarded (redirect to `/login` if `!isAuthenticated` — check how `CommentForm.tsx` gates on `isAuthenticated` for the pattern, though that's inline-conditional rather than route-level; for a route-level guard look at how `react-router-dom`'s `<Navigate>` is used elsewhere in the ecosystem, there's no existing example in this codebase since every current route is public).

New file **`pages/SettingsPage.tsx`**: a form with a `DisplayName` text input (pre-filled from `useProfile()`), a save button wired to `useUpdateProfile()`. This page also hosts the Avatar (§4), Email change (§5), and Sessions (§6) sections — one page, several sections separated by the `border-t border-stone-900/10 pt-4` divider convention, not separate routes, to avoid fragmenting account management across many pages for what's currently a small feature set.

**Header/UserMenu change**: add a "Settings" item to `UserMenu.tsx`'s dropdown (currently just shows info + logout) linking to `/settings`.

## 4. Avatars

**Backend**: `PUT /api/identity/me/avatar` — `multipart/form-data`, field name `file`, image/jpeg/png/webp, max 5MB → `{ avatarUrl }` (the 256px variant's URL). `DELETE /api/identity/me/avatar` → `204`. Note: the 64px variant exists at the same URL with `256.webp` swapped for `64.webp` — no separate URL is returned for it (see `identity-v2-design.md` §"Avatar upload" for why); use the 64px one for small UI spots like the header circle if you want a sharper render there, by string-replacing in the URL, not by another request.

**`api/identity.ts`** additions
```ts
export async function uploadAvatar(accessToken: string, file: File): Promise<{ avatarUrl: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await authedFetch('/api/identity/me/avatar', accessToken, { method: 'PUT', body: formData });
  return (await response.json()) as { avatarUrl: string };
}

export async function deleteAvatar(accessToken: string): Promise<void> {
  await authedFetch('/api/identity/me/avatar', accessToken, { method: 'DELETE' });
}
```
(Don't set `Content-Type` manually for the upload — the browser sets the correct `multipart/form-data` boundary itself when `body` is a `FormData`; setting it explicitly breaks the boundary.)

**`hooks/useUploadAvatar.ts` / `useDeleteAvatar.ts`** (new) — mutations, invalidate the profile query on success (avatar URL lives on `UserProfile`), and **also** call `setAuth` — no, actually: `AuthContext`'s state doesn't carry `avatarUrl` at all right now (see §0). Two options, pick one and note the choice in the PR:
- (a) Add `avatarUrl` to `AuthContext`'s state too (requires `AuthResponse`/`AuthContext` changes, keeps header avatar in sync without an extra fetch), or
- (b) Leave `AuthContext` as pure-auth-only and have `UserMenu` read avatar from `useProfile()` (an extra query, but keeps `AuthContext` scoped to tokens/identity claims, not profile data).
Recommend **(b)** — `AuthContext` already has a clear, narrow job (token lifecycle), and profile data changing shape shouldn't ripple into every place that reads auth state.

**UI**: in `SettingsPage.tsx`'s avatar section — an `<img>` (or the initial-letter circle as a fallback when `avatarUrl` is null, reusing `UserMenu.tsx`'s existing circle styling), a hidden `<input type="file" accept="image/jpeg,image/png,image/webp">` triggered by a styled button, and a "Remove" button shown only when an avatar exists. Show upload progress/disabled state via the mutation's `isPending`.

**`UserMenu.tsx` change**: swap the initial-letter circle for an `<img>` when `useProfile()` has an `avatarUrl`, keep the letter as fallback.

## 5. Email change

**Backend**: `POST /api/identity/me/email` body `{ newEmail }` → `204` (fires two emails — nothing else comes back synchronously; the actual change only lands once both links are clicked, which happens server-side via a link a user clicks in their inbox, not through this frontend at all). `GET /api/identity/email-change/confirm?token=` is hit directly by the email links and returns a plain HTML page from the backend itself — **no frontend route needed for confirmation**, that's already fully handled server-side.

**`api/identity.ts`** addition
```ts
export async function startEmailChange(accessToken: string, newEmail: string): Promise<void> {
  await authedFetch('/api/identity/me/email', accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newEmail }),
  });
}
```

**`hooks/useStartEmailChange.ts`** (new) — mutation, no query to invalidate (nothing changes yet on this side).

**UI**: in `SettingsPage.tsx`'s email section — current email shown read-only, a "Change email" control that reveals a text input + submit. On success, replace the form with a message: *"Check both **{current email}** and **{new email}** — the change applies once you click the link in each."* Don't show a fake "pending change" state that polls or anything clever — there's no endpoint to query pending-request status, and one isn't planned. If the user navigates away and back, the form just resets to editable (there's genuinely no way to know a request is in flight without a new backend endpoint, which is out of scope here).

## 6. Sessions

**Backend**: `GET /api/identity/sessions` → `[{ id, deviceLabel, ipAddress, createdAt, expiresAt, isCurrent }]`. `DELETE /api/identity/sessions/{id}` → `204`. `DELETE /api/identity/sessions` → `204` (revokes every session **except** the current one).

**`types/identity.ts`** addition
```ts
export interface Session {
  id: string;
  deviceLabel: string | null;
  ipAddress: string | null;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}
```

**`api/identity.ts`** additions
```ts
export async function getSessions(accessToken: string): Promise<Session[]> {
  const response = await authedFetch('/api/identity/sessions', accessToken);
  return (await response.json()) as Session[];
}

export async function revokeSession(accessToken: string, sessionId: string): Promise<void> {
  await authedFetch(`/api/identity/sessions/${sessionId}`, accessToken, { method: 'DELETE' });
}

export async function revokeOtherSessions(accessToken: string): Promise<void> {
  await authedFetch('/api/identity/sessions', accessToken, { method: 'DELETE' });
}
```

**`hooks/useSessions.ts`, `useRevokeSession.ts`, `useRevokeOtherSessions.ts`** (new) — query + two mutations, both invalidate the sessions query on success. **Important**: if the user revokes their *own current* session (possible via the individual-revoke path, not the "others" one — nothing stops them targeting their own `id`), the next authenticated request will 401; `getValidAccessToken()`'s existing refresh-failure path already calls `logout()` on a failed refresh, so this self-destructs cleanly without new code — just don't special-case it.

**UI**: in `SettingsPage.tsx`'s sessions section — a list of cards (`deviceLabel` as the title, falling back to "Unknown device" if null, `ipAddress` + relative "signed in {createdAt}" as secondary text), the current session visually marked (e.g. a small "This device" tag using the same pill style as category badges in `PlaceDetailPanel.tsx`), a revoke button per non-current row, and one "Log out other devices" button above the list wired to `useRevokeOtherSessions()`.

## 7. Google Sign-In

**Backend** (already live, verified working end to end): `GET /api/auth/google/start` — plain link/redirect, not a `fetch` call, since it needs a full-page navigation to reach Google's consent screen. `GET /api/auth/google/callback` — Google redirects here directly, never touched by frontend code; it now redirects to `{FrontendBaseUrl}/auth/callback?code=<handoff-code>` on success or `...?error=<message>` on failure. `POST /api/auth/google/exchange` body `{ code }` → `AuthResponse` (same shape as login/register) on success, `400` if the code is invalid/expired/already used (60-second, single-use).

**Why the handoff code, not just returning tokens in the redirect URL**: real access/refresh tokens never belong in a URL — they'd sit in browser history, get logged server-side, and leak via `Referer` headers if any external resource loads on the landing page. The code is a random, single-use, 60-second-lived opaque value; the actual tokens only ever travel over the `POST /exchange` request body.

**`api/auth.ts`** addition
```ts
export function googleSignInUrl(): string {
  const IDENTITY_API_BASE_URL = import.meta.env.VITE_IDENTITY_API_BASE_URL ?? 'http://localhost:5076';
  return `${IDENTITY_API_BASE_URL}/api/auth/google/start`;
}

export async function exchangeGoogleCode(code: string): Promise<AuthResponse> {
  const IDENTITY_API_BASE_URL = import.meta.env.VITE_IDENTITY_API_BASE_URL ?? 'http://localhost:5076';
  const response = await fetch(`${IDENTITY_API_BASE_URL}/api/auth/google/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!response.ok) throw new Error('Google sign-in failed. Please try again.');
  return (await response.json()) as AuthResponse;
}
```

**`LoginPage.tsx` change**: add a "Continue with Google" button below the existing form (visually secondary to the email/password form — an outlined or lower-emphasis button, not competing with the primary brand-colored submit button). It's a plain `<a href={googleSignInUrl()}>`, **not** a click handler that does a `fetch` — this has to be a real full-page navigation since Google's consent screen can't be reached via XHR/fetch (cross-origin navigation, not an API call).

**New page: `pages/GoogleCallbackPage.tsx`**, new route `/auth/callback` in `App.tsx`. On mount: read `code` or `error` from the URL query string (`useSearchParams` from `react-router-dom`). If `error`, show it with the standard error-message styling and a link back to `/login`. If `code`, call `exchangeGoogleCode(code)`, then `setAuth(response)` from `useAuth()`, then `navigate('/')`. Show a brief loading state in between (this round-trip is fast, but not instant) — a simple centered spinner/message is enough, this page is on-screen for well under a second in the normal case.

## 8. Suggested build order

1. §2 (`api/identity.ts` shared helper) — nothing else compiles usefully without it.
2. §3 (Profile) + the `SettingsPage.tsx` shell — establishes the page every other section plugs into.
3. §6 (Sessions) — simplest remaining section (no file upload, no multi-step flow), good to validate the page shell works before the trickier ones.
4. §4 (Avatars) — needs the file-input UI pattern, decide (a) vs (b) from §4 before starting.
5. §5 (Email change) — simplest of the remaining, no new route.
6. §7 (Google Sign-In) — needs its own new route (`/auth/callback`) and touches `LoginPage.tsx`, separate enough from the settings-page work to do last/independently.

## 9. Explicitly out of scope for this pass

- Any UI for MFA — dropped entirely, see `identity-v2-design.md` §8.
- A nicer frontend-rendered email-change confirmation page — the backend's plain HTML response (§5) is what exists today; upgrading that to a branded frontend page is a separate, later task if wanted.
- Showing avatars anywhere other than account UI (e.g. next to comments) — blocked on feedback-service not exposing comment authorship at all, unrelated to this plan.
- A "pending email change" status indicator — no backend endpoint for it exists or is planned here.
