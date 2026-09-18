# Public User Profiles — Design Doc

Status: **implemented, 2026-09-18.** Written 2026-09-17, built the next day. This is the foundation Feature 2 (shared-intention connections, see `PROGRESS.md`) needs before it can exist — before two people chat about visiting a place together, each one needs somewhere to see who the other actually is. Three deviations from the original design, made during implementation:
- **Interests are freeform tags, not a fixed preset list** — dropped the fixed 8-item vocabulary from §1 below after explicit pushback ("I don't like that interests have an allowed option list"). Server-side sanitization only (trim, dedupe, 30-char cap per tag, 10-tag cap), no allow-list. §6's open question about the interest list is resolved this way.
- **No dedicated `/stats` endpoint** — §4's `GET /api/feedback/users/{userId}/stats` was never built. All three stats are derived client-side from the same `GET .../comments` response the page already fetches (`commentCount`, `distinctPlacesCount`, `photosSharedCount` via `.length`/`Set`/`.reduce`) — one fetch instead of two. Caveat: reflects whatever's inside the comments fetch limit (200), not a true unbounded count.
- **§5's privacy question is resolved as "same page for everyone."** An empty bio/interests section for a scraped Google reviewer is the same empty state any unfilled-in real user gets, not new information about them — not worth a separate reduced view.

## 0. Why now

Two things converged:
1. Comments now show real authorship (avatar + display name) as of the review-photos/avatars work — people are visible entities in the app for the first time, not anonymous text.
2. Feature 2 (chat between people sharing a visit intent) is designed but not built, and explicitly needs "how's the person I'm about to visit a place with" context per that design.

This doc is the missing middle layer: a public profile page, richer profile fields, and the stats/comment-history views that make "who is this person" answerable before Feature 2 needs it.

## 1. New profile fields

Beyond the existing `DisplayName`/`AvatarUrl`:

| Field | Type | Notes |
|---|---|---|
| `Bio` | `string?`, ~500 char cap | Freeform, user-edited. The "how's the person" description explicitly asked for. |
| `Interests` | `text[]` (Postgres array), **freeform tags** | As built: no fixed vocabulary (see status note above) — trimmed, deduped, capped at 10 tags / 30 chars each server-side. |
| `PreferredLanguage` | `string?` enum: `az` / `ru` / `en` | Specifically useful once chat exists, in a genuinely multilingual city. Cheap to add now. |

All three are self-edited via the existing Settings page pattern (`PATCH /api/identity/me` already exists and already handles `DisplayName`/`PreferencesJson` — extend it, don't build a second update path).

**Deliberately not adding**: social media links, precise home location, real-world identity verification. This profile exists so a stranger feels informed enough to meet up safely, not so they can be tracked down — extra identity surface here is a safety cost with no corresponding benefit for this app's purpose.

## 2. Derived stats (not stored — computed on read)

Shown on the profile, sourced from data that already exists:

- **Comments posted** — `COUNT(*)` from `QuickFeedbacks` where `UserId = :id`.
- **Places visited** — `COUNT(DISTINCT PlaceId)` from the same.
- **Photos shared** — `COUNT(*)` from `QuickFeedbackPhotos` joined through their comments.
- **Member since** — `Users.CreatedAt`.

No new writable state, no privacy cost beyond what already exists — purely a friendlier read of existing rows. A lightweight "Explorer" badge tier (e.g. Newcomer / Regular / Local — thresholds on places-visited count) is a nice free addition on top of these same numbers, worth doing when this gets built since it's zero extra data.

## 3. Comment history on the profile

Needs a **new** feedback-service endpoint — today's endpoints are scoped by place (`GET /api/feedback/places/{id}/comments`) or by global cursor (`GET /api/feedback/comments?after=`), neither filters by author:

- `GET /api/feedback/users/{userId}/comments?limit=` (anonymous) → same `CommentDto` shape already in place (id, placeId, comment, createdAt, photoUrls), just filtered by `UserId` instead of `PlaceId`.
- Frontend enriches with place names via a batch places lookup (mirrors the existing pattern in `useCommentAuthors.ts` for profiles — same shape, different service).

## 4. API surface (as built)

**identity-service**
| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/api/identity/users/{id:guid}/public-profile` | none | `{id, displayName, avatarUrl, bio, interests, preferredLanguage, memberSince}`, 404 if the user doesn't exist |
| PATCH | `/api/identity/me` | required | extended existing handler to also accept `bio`, `interests`, `preferredLanguage` |

**feedback-service**
| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/api/feedback/users/{userId:guid}/comments?limit=` | none | this user's comment history, same `CommentDto` shape as the place-scoped endpoint |

**frontend**
- Route `/users/:id` → `UserProfilePage.tsx`: avatar, display name, bio (or "No bio yet."), interest chips, language, a derived stats row, comment history (place name resolved client-side from the same `usePlacesInBoundingBox(DISTRICT_BOUNDS)` cache the map already populates — no new places-service endpoint needed), photo thumbnails reusing `PhotoLightbox.tsx`.
- Author name/avatar in `CommentList.tsx` is now a `<Link to={/users/${userId}}>` (was static text).
- `SettingsPage.tsx`'s Profile section grew a bio textarea (500-char cap + counter), a type-and-press-Enter interest tag input (with a remove-chip `×`), and a language `<select>` — one shared Save button with display name, not a separate form.
- New shared `components/layout/BackLink.tsx`, extracted since both `SettingsPage` and `UserProfilePage` needed the identical fixed-position back-link pattern.

## 5. Privacy note — resolved

Some comment authors are the real Google reviewers scraped by `tools/review-scraper` (real name, real re-hosted avatar). Resolved as: same profile page renders for everyone, no reduced view for scraped reviewers — an empty bio/interests section is just the natural empty state, not new information about them beyond what already existed (name, avatar, their own comment text).

## 6. Open questions — resolved

1. Interest list: dropped the fixed set, freeform tags instead (see status note at top).
2. Anonymous visibility: yes — the public-profile and comments-by-user endpoints are both unauthenticated, consistent with comments already being public.
3. Bio/interests moderation: none, same as comments — not revisited separately, tracked together in `PROGRESS.md`'s "Deferred, on purpose" table.
