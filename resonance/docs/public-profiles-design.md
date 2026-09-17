# Public User Profiles — Design Doc

Status: **design only, nothing built yet.** Written 2026-09-17. This is the foundation Feature 2 (shared-intention connections, see `PROGRESS.md`) needs before it can exist — before two people chat about visiting a place together, each one needs somewhere to see who the other actually is.

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
| `Interests` | `text[]` (Postgres array), from a **fixed** preset list (not freeform) | e.g. coffee, hiking, photography, nightlife, art, food, sports, live music. Fixed list avoids moderation problems and gives Feature 2 something structured to match on later (shared interest + shared time slot > shared time slot alone). |
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

## 4. API surface (future)

**identity-service**
| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/api/identity/users/{id}/public-profile` | none | `{id, displayName, avatarUrl, bio, interests, preferredLanguage, memberSince}` |
| PATCH | `/api/identity/me` | required | extend existing handler to also accept `bio`, `interests`, `preferredLanguage` |

**feedback-service**
| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/api/feedback/users/{userId}/comments?limit=` | none | this user's comment history |
| GET | `/api/feedback/users/{userId}/stats` | none | `{commentCount, distinctPlacesCount, photosSharedCount}` |

**frontend**
- New route `/users/:id` → `UserProfilePage.tsx`: avatar, display name, bio, interest chips, language, stats row, comment history list (reusing `CommentList.tsx`'s card styling).
- Author name/avatar in `CommentList.tsx` becomes a link to `/users/{userId}` (currently just static text).
- `SettingsPage.tsx`'s Profile section grows a bio textarea + interest-chip picker + language select, alongside the existing display-name field.

## 5. Privacy note worth revisiting, not just inheriting

Some comment authors today are the real Google reviewers scraped by `tools/review-scraper` (real name, real re-hosted avatar) — a deliberate, already-made call, but that was scoped to "a name and a small photo next to their review text." A full browsable profile page (bio-shaped UI even if empty, stats, comment history all in one place) is a meaningfully deeper presentation of a real stranger's data than what exists today, even though no new data is collected about them specifically. Worth a conscious decision when this gets built — e.g. whether scraped-reviewer profiles get the same public-profile treatment as real registered users, or a reduced view (name/avatar/comments only, no bio/interests section since those were never something they provided) — rather than the fuller UI simply applying to everyone by default because the code doesn't distinguish them.

## 6. Open questions for whoever picks this up

1. Interest list: fixed set proposed above is a starting guess, not final — revisit against what Feature 2's matching actually wants to key on.
2. Should a profile be visible to anonymous (logged-out) visitors, same as comments are today? Leaning yes for consistency with the rest of the app's "public, no moderation" stance, but worth confirming.
3. Bio/interests moderation: comments already have none by design (see `PROGRESS.md`); same question applies here and should get the same answer for consistency, revisited together if either changes.
