# Resonance — Progress & Roadmap

Last updated: 2026-09-22. This file is the source of truth for "what's done and what's next" — update it as things change instead of relying on memory.

## Architecture at a glance

| Service | Tech | Host port | Purpose |
|---|---|---|---|
| `places-service` | ASP.NET Core, PostGIS | 5112 | Place data (imported from OSM), bbox queries for the map |
| `identity-service` | ASP.NET Core | 5076 | Register/login, issues JWTs |
| `feedback-service` | ASP.NET Core | 5066 | Free-text comments per place, JWT-protected submit, public read, admin hide/restore |
| `connections-service` | ASP.NET Core | 5122 | Visit intents, chat (conversations/messages), blocks, and friend requests/friends |
| `topics-service` | Python, FastAPI | 8010 (container listens on 8001 internally — host port moved off 8001 due to a persistent, unexplained conflict with Docker Desktop's own backend process on this machine) | AI topic discovery from comments, sentiment/dimension scoring, LLM route planning, place summaries, and the admin API. Runs on CPU by default; GPU is opt-in — see below. |
| `frontend` | React, Vite, Leaflet | 5173 | The app. Lives at `frontend/` directly (moved out of `frontend/resonance-web/`). Has a `Dockerfile` and a `docker-compose.yml` entry; still fine to run locally via `npm run dev` too. |

No API gateway yet (deliberate — see "Deferred, on purpose"). The frontend calls each service directly.

**All backend services + Postgres are now containerized** (`infra/docker-compose.yml`). One command brings up the whole backend:
```powershell
docker compose -f infra/docker-compose.yml up -d --build                                   # any machine (CPU)
docker compose -f infra/docker-compose.yml -f infra/docker-compose.gpu.yml up -d --build   # this machine (GPU)
```
The base file is **portable and GPU-free**; GPU is opt-in through the override. See "GPU is opt-in" below.
`--build` only actually rebuilds what changed (Docker layer caching) — the Topics image is slow the *first* time (PyTorch + pre-downloading the embedding model at build time so the container needs zero network access to Hugging Face at runtime), fast after. Migrations are **not** run automatically — still a manual one-time step per service (`dotnet ef database update ...`), same as before; the Postgres named volume (`resonance_postgres_data`) persists across container recreation so this is genuinely one-time, not per-restart. Topics' own SQLite data (clusters, cursor) persists via its own named volume (`resonance_topics_data`) too.

**Known Docker Desktop/WSL2 flakiness on this machine** (not specific to this project, but has repeatedly disrupted dev sessions): Docker Desktop can leave zombie processes across restarts, WSL2 itself can get fully wedged (fixed only by a full Windows restart, not just relaunching Docker Desktop — `wsl --status` hanging is the tell), and `com.docker.backend.exe` has repeatedly shown up bound to arbitrary host ports (e.g. 8001) as part of its own port-proxy machinery — killing it takes down Docker's whole engine, so always identify a PID via `Get-CimInstance Win32_Process -Filter "ProcessId = X"` before killing anything found via `netstat`.

## What's done

**Places**
- [x] OSM import for Baku/Torgovy (391 real places)
- [x] Bbox-queryable API, PostGIS `geometry(Point,4326)`
- [x] Map with clustering, clean CARTO basemap, category-colored pins

**Identity — v2 overhaul complete (2026-09-17)**, full design/reasoning in `docs/identity-v2-design.md`:
- [x] Register/login, versioned password hashing (BCrypt kept for existing users, Argon2id for new — an algorithm migration, not a breaking rehash)
- [x] Refresh tokens: rotation on every use, reuse-detection (a revoked token being reused nukes every session for that user, not just the one), access tokens dropped from 1440min to 15min since revocation is meaningless otherwise. Multi-device session list + revoke-one/revoke-others.
- [x] Profile fields (`DisplayName`, JSON-blob `Preferences`) — `GET/PATCH /api/identity/me`
- [x] Avatars: upload/resize (`SixLabors.ImageSharp`, 256px+64px `.webp` variants)/S3 storage/delete — `PUT/DELETE /api/identity/me/avatar`
- [x] Email change with double opt-in (confirmation links to *both* old and new address before it applies) via Resend, plus a `ConsoleEmailSender` dev-mode fallback (Resend sandbox can't deliver to two different addresses at once, which this feature always needs)
- [x] Google OAuth sign-in — auto-provisions a new account or links to an existing one by email (trusts Google's own email verification, no extra confirmation step), CSRF-protected via a signed `state` param (`IDataProtector`, no DB row needed)
- [ ] MFA (TOTP + email OTP) — **deliberately dropped**, not built. Email change's double opt-in already provides equivalent protection for the one place OTP would've mattered; the app's threat model (place reviews, no money/health data) doesn't call for the added complexity. See `identity-v2-design.md` §8 if this ever needs revisiting.

**Feedback**
- [x] Free-text comments only — **no fixed noise/wifi/crowded checkboxes** (deliberate, see decisions below)
- [x] JWT-protected submit, public read (comments are intentionally public; admins can hide one, but there is no reporting/queue workflow by design)
- [x] Seeded with ~2,200 realistic comments across all 391 places (mixed casual/formal tone, "safety" theme weighted ~19% on purpose — see Topics service below)

**Frontend**
- [x] Map page: clustering, collapsible sidebar (reopens automatically when you select a place while collapsed)
- [x] Dedicated `/login` page (two-panel layout), account dropdown menu
- [x] Comment list + submission form on place detail
- [x] Discovered topics shown as badges on place detail (via Topics' `GET /api/topics/places/{id}`) — the first place Topics' output is actually visible to a user, not just curl
- [x] **Identity v2 frontend (2026-09-17)** — full UI for the backend overhaul below: `/settings` page (profile display-name edit, avatar upload/remove, email-change request, session list with per-session/other-sessions revoke), "Continue with Google" on `/login` + `/auth/callback` handoff-code exchange, header avatar synced from `useProfile()`. Built per `docs/frontend-identity-v2-plan.md` and verified end to end against the live identity-service + S3 (avatar upload actually round-trips to a real bucket object, not mocked).
- [x] Unified brand color token (`brand-500` etc. in `index.css`), consistent across markers and UI chrome
- [x] Sentiment/dimension heatmap on the map (2026-08-02) — a picker (top-right) toggles "Off," "Overall sentiment," or a specific dimension (`Noise`, `Wifi`, `Safety`...). Built with `leaflet.heat`, two overlaid single-color layers (red/green) rather than one shared gradient, because a shared density gradient makes bad areas fade to nothing instead of glowing red. Weights are normalized to 0..1 per layer and `maxZoom` is pinned to the map's default zoom — `leaflet.heat` clips accumulated weight against a fixed `max` (1.0) scaled by a zoom-distance falloff, so raw comment counts without normalization rendered as a near-invisible gray smudge instead of graduated color. See `frontend/src/components/map/heatmapPoints.ts`.
- [x] Full visual redesign (`29bd760`, committed) — dark ground, glow/glassmorphism, monospace uppercase micro-labels, a "signal" metaphor replacing generic "comment" language, new category color palette. Two earlier redesign attempts were explicitly rejected by product feedback (too much glow/decoration) before this one landed — don't re-introduce heavy shadow/gradient effects without checking first.
- [x] **Route planning** — a user types a free-text wish into a search bar in the header (`RouteSearchBar` → global `RouteProvider`/`RouteContext`), Topics' LLM matches it against every place in the district (not just what's on screen) and returns an ordered subset, the frontend runs a small fixed-start TSP over that subset (`lib/routeOrdering.ts`, exact for ≤8 stops, nearest-neighbor above that), and the result renders as numbered pins plus a glowing polyline that draws itself onto the map leg-by-leg (`RoutePolyline.tsx`, CSS `stroke-dashoffset`, respects `prefers-reduced-motion`). The map now loads the **whole district** at once (`lib/mapConstants.ts`'s `DISTRICT_BOUNDS`, ~340 places) rather than only the visible bbox, specifically so route planning always has the full place set to search — see "Key decisions" for the tradeoffs this caused and fixed.

## Topics service — built and verified (2026-07-22)

Feedback data now has real structured signal. Verified end to end against ~3,000 seeded comments: **89 topics discovered**, including a genuine safety-related cluster nobody hand-coded (`"unsafe, poorly, lit"`, 28 comments) plus clean clusters for wifi, noise, crowding, price, cleanliness, and service.

Shape, as built:
1. `services/topics-service/`, Python + FastAPI, its own `venv`.
2. Pulls comments from Feedback via `GET /api/feedback/comments?after=&limit=` (`GetCommentsAfterQuery`/`Handler` in Feedback). No shared DB — Topics keeps its own local SQLite (`topics.db`, gitignored): raw comments pulled so far, a cursor, computed topics.
3. Embeddings: `sentence-transformers` (`all-MiniLM-L6-v2`), local, no external API.
4. Clustering: real `hdbscan` (`min_cluster_size=5`).
5. Keyword extraction: hand-rolled c-TF-IDF in `clustering.py` — stopwords via sklearn's `ENGLISH_STOP_WORDS`, plus a minimum within-cluster document-frequency filter so incidental words from one or two comments can't dominate a cluster's keyword list.
6. Label refinement (`labeling.py` + `prompts/refine_label.md`): raw keywords alone produced awkward/nonsensical labels, and a tiny model (`flan-t5-small`/`base`) couldn't reliably fix that — see decisions below. Settled on `Qwen2.5-3B-Instruct` (GGUF, Q4_K_M) via `llama-cpp-python`, prompted with each cluster's top keywords **and** its 4 comments closest to the cluster centroid (`sample_comments()` in `clustering.py`), asked to return JSON `{"labels": [...]}`. The prompt explicitly requires preserving complaint/warning polarity (a cluster about comments warning "gets loud after 7pm, come earlier for quiet" must not get labeled something positive-sounding like "Quiet Hours") — the model would otherwise flip negative comments into upbeat-sounding labels. Falls back to the raw top keyword, capitalized, if the model's output is unusable.
7. Retrain trigger: recompute from scratch over the whole accumulated corpus every time total comment count grows by 100 since the last run (`pipeline.py`, `RETRAIN_THRESHOLD`, configurable via `.env`).
8. Endpoints: `GET /api/topics`, `GET /api/topics/places/{placeId}`, `POST /api/topics/poll-now` (manual trigger, don't wait on the 5-minute schedule while testing).

**Label refinement is CPU-only and takes a few minutes per full recluster** (~90 clusters × ~2-3s LLM inference each). Fine since retraining is infrequent, not per-request. Both `torch` and `llama-cpp-python` are installed from CPU-only wheel indexes in the Dockerfile (`--index-url https://download.pytorch.org/whl/cpu` and `--extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cpu`) — installing them the default way pulls CUDA wheels (hundreds of MB of unneeded GPU libraries) even on a CPU-only machine.

**Dimension promotion & sentiment scoring (2026-08-02)**, feeding the heatmap above:
- `dimensions` table: clusters get matched across retrains to a previously-promoted dimension via centroid cosine similarity (`DIMENSION_SIMILARITY_THRESHOLD`, default 0.85); a cluster with no match and `comment_count >= DIMENSION_PROMOTION_MIN_COUNT` (default 20) gets promoted as a new one. Matching is greedy per-cluster, not a true optimal assignment — acceptable since HDBSCAN clusters are usually well-separated. A dimension with no match in a given run is left untouched (not deleted), so the heatmap picker doesn't flicker between retrains.
- Per-comment sentiment: `sentiment.py`, `distilbert-base-uncased-finetuned-sst-2-english` (binary positive/negative), stored on `comments.sentiment`, classified incrementally every poll (`classify_pending_sentiment()`) independent of the retrain threshold. Dimension-level sentiment is aggregated from real member-comment sentiment (65% threshold for positive/negative, else "mixed") — **not** self-reported by the labeling LLM. That was the original design (folded into the same JSON call as the label) but got dropped: the LLM only saw 4 sample comments, not the whole cluster, and self-reporting sentiment inside the same generation that's also asked to "generalize concepts" reintroduced the exact polarity-flip risk the labeling prompt already had to guard against.
- `GET /api/dimensions`, `GET /api/sentiment/places` — the two heatmap data sources.

**Known-fragile area**: this service has choked on stray/leftover `uvicorn` processes on port 8001 multiple times during dev (Windows doesn't always release the port cleanly between restarts). Before assuming a bug, check `netstat -ano | grep ":8001"` for more than one LISTENING PID, and identify what a PID actually is (`Get-CimInstance Win32_Process -Filter "ProcessId = X"`) before killing it — `com.docker.backend.exe` has shown up bound to that port too (harmless Docker/WSL port-proxy behavior, do NOT kill it, it takes Docker's engine down).

**AI paragraph summaries per place** remains a natural follow-up, not yet started — a *different* feature than topic discovery. Topics finds categories across all comments; a paragraph summary (e.g. "Visitors appreciate the peaceful atmosphere...") reads one place's comments and asks an LLM to summarize them in prose. Qwen2.5-3B is already loaded in the container, so this needs no new dependency — just a new prompt + function. Not designed in detail yet.

### Route planning (2026-08/09)

Reuses the same `llm.py` singleton as label refinement/sentiment rather than loading a second model copy. Shape:
1. `POST /api/itinerary/plan` (`main.py`, `itinerary.py`, `models.py`, `prompts/plan_itinerary.md`) takes `{wish, candidatePlaces}` and returns `{placeIds}`.
2. Candidates are numbered `1..N` in the prompt and the model returns **indices**, not raw place IDs — a small local model echoing UUIDs back verbatim was unreliable; indices get mapped back to real IDs server-side, and any index outside `1..N` is dropped rather than trusted. This is the anti-hallucination guard — the model's raw output is never passed through unchecked.
3. Client-side TSP ordering (`frontend/src/lib/routeOrdering.ts`) — deliberately **not** done via a routing engine (OSRM etc.) — Torgovy is small and walkable, so haversine straight-line distance is treated as a good-enough approximation. Flagged as a known simplification, not re-litigated.

**GPU acceleration (machine-specific)**: `topics-service`'s `Dockerfile` was switched from a CPU-only prebuilt `llama-cpp-python` wheel to building it from source (`CMAKE_ARGS="-DGGML_CUDA=on"`) against an `nvidia/cuda:12.4.1-devel-ubuntu22.04` base image, with `n_gpu_layers=-1` in `llm.py` to offload every layer. `infra/docker-compose.yml`'s `topics-api` service requests a GPU via `deploy.resources.reservations.devices` (nvidia driver). This cut a full-district route-planning request (candidates = ~340 places, ~4.3k prompt tokens) from ~35s on CPU to ~0.2-0.4s on this machine's RTX 5070, after a one-time ~8s CUDA kernel JIT-compile that happens automatically at container startup (`llm.py` runs a couple of throwaway warm-up completions at import time specifically so no real user request pays that cost).

**GPU is opt-in, not required (fixed 2026-09-22).** The Dockerfile takes `BASE_IMAGE` and `LLAMA_CMAKE_ARGS`
build args, and `llm.py` reads `LLM_GPU_LAYERS`. The base compose file builds a CPU image
(`ubuntu:22.04`, `-DGGML_CUDA=off`, 0 GPU layers) and declares no GPU reservation, so it runs anywhere;
`infra/docker-compose.gpu.yml` overrides all three for CUDA. **Verified by actually running the CPU image
with no GPU passed**: starts in ~15s on a fresh database and answers a route-planning request correctly in
~15s (versus ~0.3s on the RTX 5070). The CPU image is 7.65GB against 23.2GB for CUDA.

That test also caught a real bug: a fresh `topics.db` crashed on startup (`no such table: dimensions`)
because a column migration ran before its `CREATE TABLE`. It would have broken any clean clone, GPU or not.

## Review scraper — real reviewer identity + photos (2026-09-18)

`tools/review-scraper/` (personal-use, not published — see its `package.json`) already pulled real review text from Google Maps; extended to also capture and re-host reviewer identity and attached photos, plus a standard fallback avatar for everyone else:

- **Reviewer name + avatar**: a review card's own `aria-label` attribute is just the reviewer's display name (e.g. `aria-label="Nadiya"`) — simpler than reading the equivalent `.d4r55` text node. Avatar comes from `img.NBa7we`'s `src`.
- **Attached photos render as CSS `background-image`** on `<button class="Tya61d">` elements inside `.KtCyie`, not a plain `<img src>` — needs a regex pull from the `style` attribute (`scrape.js`).
- **Google's own image URLs accept an arbitrary resize suffix** (e.g. `...=w36-h36-p-rp-mo-br100`) — `import-reviews.js` bumps this before downloading (`=w256-h256` for avatars, `=w800-h600` for review photos) to re-host a decent resolution instead of the tiny thumbnail actually rendered on the card.
- Name + avatar are downloaded and re-hosted on the app's own S3 bucket (same bucket/key convention as identity-service's own avatar uploads, `avatars/{userId}/...`), never hotlinked to Google's CDN. A brand-new `Users` row is created per scraped review — no cross-review reviewer-identity matching, a known simplification not worth solving at this project's scale.
- Review photos land in a new `QuickFeedbackPhotos` table, re-hosted the same way under `review-photos/{placeId}/{feedbackId}/{n}.webp`.
- **Standard placeholder avatar** (`tools/synthetic-avatars/`): one static generic-person SVG (brand-500 background, matching the app's existing initial-letter fallback color) uploaded once to `avatars/default/*.webp` and assigned to any user without a real photo — covers both the original synthetic/seeded comment pool and any real signed-up user who hasn't uploaded their own avatar.

## Public profiles — built (2026-09-18)

Full design in `docs/public-profiles-design.md` (implemented the day after it was written, with a few deviations noted there — freeform interest tags instead of a fixed preset list, stats derived client-side instead of a dedicated endpoint). Shape:
- `User` gains `Bio`, `Interests` (`text[]`), `PreferredLanguage`; editable via the existing `PATCH /api/identity/me` (extended, not a new endpoint), alongside a new anonymous `GET /api/identity/users/{id}/public-profile`.
- New anonymous `GET /api/feedback/users/{userId}/comments` (feedback-service) for a user's comment history, same `CommentDto` shape the place-scoped endpoint already returns.
- Frontend: `/users/:id` (`UserProfilePage.tsx`) — avatar, bio, interest chips, language, a derived stats row (comments/places/photos, computed client-side from the comments response), comment history with place names resolved from the same district-wide places cache the map already populates (no new places-service endpoint needed). Comment author name/avatar in `CommentList.tsx` now links there.
- Verified end to end against the real backend, including a click-through from a real scraped Google reviewer's comment on the map to their profile page.

## AI quality pass — built and measured (2026-09-21)

Two features were diagnosed against live data, redesigned, implemented and re-measured with the same
harness. Full write-ups with the numbers and the wrong turns are in `docs/place-tags-design.md` and
`docs/route-planning-v2-design.md`.

**Place tags** (`eval_tags.py`):

| | Before | After |
|---|---|---|
| Clusters | 122 | 66 |
| Duplicate labels | 13 | 0 |
| Clusters ≤5 comments | 82 (67%) | 0 |
| Badges backed by ≥2 of the place's own comments | ~0 | 100% |

`Voltage Chiller` and contradictory badges are gone. Shipped config: `leaf`, `min_cluster_size=5`,
`min_samples=2`, merge at 0.82, badge needs ≥2 local comments and ≥15% of the place's *clustered* ones.
Two recommendations in the design doc turned out to be wrong and are recorded as such: the selection
method was not the lever (`min_cluster_size` was), and the badge ratio's original denominator counted
comments HDBSCAN never clustered, which hid badges on the most-reviewed places entirely.

**Route planning** (`eval_itinerary.py`): **3/9 → 9/9 correct**, 4 abstentions → 0, ~480ms median.
Architecture is decompose → embedding retrieval → rank → conditionally verify. "a cafe" used to return
nothing while 77 cafés sat in the list; "coffee" matched the place literally named "Coffee Moffie".
The retrieval floor (0.45) was calibrated from measured scores, not guessed — real queries score
0.56-0.93, impossible ones 0.20-0.36 — so "buy a submarine" now returns nothing in ~200ms without
calling the LLM at all.

**AI paragraph summaries per place** — `GET /api/places/{id}/summary`, shown as "What people say" on the
place panel. Cached per place keyed on comment count, so a place only costs another LLM call once new
comments arrive. The prompt forbids flattering the place; summaries keep the complaints.

## Admin panel — built (2026-09-21)

`docs/admin-panel-design.md`, phases 0-5. Lives at `/admin`, gated by an `ADMIN_USER_IDS` allowlist
checked server-side on every route (the hidden nav icon is presentation only). Every mutation writes to
an `admin_actions` audit table with before/after values.

- **Stable topic identity** was phase 0 and a hard prerequisite: clusters now match across retrains by
  centroid cosine, so approvals survive. Verified 66/66 ids carried through a retrain. This matters
  because 21 of 66 auto-labels changed wording between two runs on identical data — approvals live in a
  separate `approved_label` column for exactly that reason.
- **Review queue** — keyboard-driven (`1`/`2`/`3`, `S`, Enter), shows the four centroid-closest comments
  as evidence, free-text override, reject. Badges show only approved labels.
- **Curation** — merge topics (a reversible pointer, not a row deletion), rename/hide dimensions.
- **Moderation** — hide/restore comments; hidden ones also disappear from the feed topics-service
  clusters on, so hidden content cannot come back as a tag.
- **Pipeline + dashboard + audit log.**

Every destructive action is reversible and arms before firing. The JWT gate was tested for rejection,
not just acceptance — including a forged `alg: none` token carrying a valid admin subject (401).

## Connections, polish and fixes (2026-09-21/22)

- **Visit intents take a real date** instead of Today/Tomorrow/ThisWeekend, and the plan is free text with
  no preset chips. A **My plans** page (`/plans`) lists every upcoming visit; the place panel prefills and
  says "Update my plan" instead of showing your own plan inline.
- **Unread message badges** — `Conversation` tracks per-participant last-read; the inbox icon carries a
  count, unread rows stand out, opening a conversation marks it read. Polling only, no push.
- **Blocking reworked to Instagram's model** — the composer is replaced up front rather than failing after
  you type. If you blocked them you see it and can unblock; if they blocked you the wording is neutral and
  the API never reveals it. Unblock previously had no UI at all despite the endpoint existing.
- **Friends** — `/friends` shows your friends and sent requests, incoming requests show the real person
  instead of "Someone", and friends can be removed (two icon buttons: message, remove).
- **Sessions are per device, not per sign-in** — signing in again from the same device revokes that
  device's previous refresh token instead of stacking another live credential. Labels read
  "Chrome on Windows" rather than a raw user-agent dump.
- **OSM enrichment** — the importer now also reads `wheelchair` and updates existing rows instead of
  skipping them (126 places have opening hours, 12 have accessibility). Both feed route planning silently;
  neither is surfaced in the UI, because OSM coverage is too thin to present as a feature.

## Shared-intention connections — built (2026-09-19)

"Feature 2" from the approved UX proposal (place page → "Want to go?" → pick a rough time window → see others who share that intent → message them directly → chat, Block as the safety mechanism), plus a second, separate opt-in friend-request layer added mid-build at the user's request. New `connections-service` (mirrors the existing ASP.NET Clean Architecture + MediatR pattern, own Postgres DB, port 5122):

- `VisitIntent` (user + place + coarse time bucket `Today`/`Tomorrow`/`ThisWeekend` + optional `IntentTag` note, ~60 char cap) — one per user per place, upserted. `POST/GET/DELETE /api/connections/intents`.
- `Conversation`/`Message` — direct chat, no request gate: clicking "Message" on someone sharing your place/time intent creates the conversation (or first message) immediately. Chat via polling (React Query `refetchInterval`, 4-5s), not SignalR/WebSockets — consistent with the rest of this stack having no real-time infra. `POST/GET /api/connections/conversations`, `GET/POST /api/connections/conversations/{id}/messages`.
- `Block` — one-directional; blocking either way hides messaging and disables the input box in that conversation. `POST /api/connections/blocks`, `DELETE /api/connections/blocks/{userId}`.
- **Friend requests, layered on top, genuinely separate from visit intents**: the user explicitly asked to unify "no-gate visit-intent chat" with a "search someone → request → accept/decline → friends" system. `FriendRequest` (`Requester`/`Recipient`/`Status: Pending|Accepted|Declined`) — no separate `Friendship` table, "friends" is just accepted requests queried directly. `POST /api/connections/friend-requests`, `GET /api/connections/friend-requests` (caller's incoming+outgoing pending), `POST .../{id}/accept`, `POST .../{id}/decline`, `GET /api/connections/friends`. A declined request can be re-sent (old row replaced, not left dangling).
- New anonymous `GET /api/identity/users/search?q=` (identity-service) — case-insensitive substring match on `DisplayName`, capped at 20 — needed so there's a way to find someone to friend-request at all, beyond stumbling onto their profile via a comment link.
- Frontend: `VisitIntentSection` on the place-detail panel ("Want to go?", time-bucket + quick-tag chips, "N people going" list); `InboxPage`/`ConversationPage` (full pages, not modals, per this app's convention) with a header inbox icon; `FindFriendsPage` (`/friends`, search + incoming-requests list) with a header icon showing a dot badge when a request is pending; a relationship-aware `FriendButton` (Add friend / Request sent / Accept+Decline / Friends) reused on both `FindFriendsPage` and `UserProfilePage`; a "Friends" list in Settings. Friends can message directly from their profile page with no shared visit intent — the same conversation-creation endpoint already treated `visitIntentId` as optional.
- Connections-service never touches identity data itself (same pattern as feedback-service) — display names/avatars for intents/conversations/friends are resolved client-side via identity-service's existing public-profile batch endpoint.

Verified live end-to-end (real registered accounts, real browser sessions, not mocked): matching visit intents surfacing each other, chat + polling delivery, Block disabling further messaging on both sides, friend search → request → accept, and friend-to-friend direct messaging with no shared intent involved.

## Next step

No committed next step. The one gap worth naming: **there are no automated tests anywhere.** Everything
above was verified with throwaway Playwright scripts plus the two eval harnesses
(`eval_tags.py`, `eval_itinerary.py`), which are the natural skeleton to build on.

Other ideas, unstarted: a global "trending themes" view (needs the now-stable topic ids), recency
filtering on the heatmap, favourites/collections.

## Deferred, on purpose (don't re-suggest without new information)

| Item | Why deferred |
|---|---|
| API Gateway | All services duplicate Identity's JWT config independently, and `ADMIN_USER_IDS` is now duplicated across topics and feedback too. Worth a conscious look, not necessarily action. |
| Trending / Favorites / Collections | Not started, no blocker — just not prioritized yet |
| Comment moderation *workflow* | Admins can now hide/restore a comment (`docs/admin-panel-design.md` §4), which is the minimum needed before a public demo. Still deliberately absent: user reporting, moderation queues, automated filtering, appeals. |
| MediatR licensing | MediatR 13+ requires a paid license for production use; still on the free dev/test tier. Options: accept the license, pin to MediatR 12.x (MIT), or drop MediatR for direct DI. Not decided. Applies to `connections-service` too, built the same way. |
| Road-network-aware route distances | Route planning uses straight-line (haversine) distance, not real walking paths (OSRM etc.) — accepted as good-enough for Torgovy's small, walkable footprint; revisit if that stops being true |
| ngrok deployment (this laptop as workstation) | Frontend calls 4 separate backend origins directly (baked into `.env`), so tunneling just the frontend port doesn't work — needs either a reverse proxy in front of everything (one tunnel, same-origin, doubles as the API Gateway item above) or 5 separate tunnels + CORS allow-list updates in 3 `.cs` files + topics-service's `FRONTEND_CORS_ORIGINS` every time a free-tier ngrok URL changes. Also: free-tier ngrok's browser-warning interstitial intercepts `fetch`/XHR calls too, not just page loads — needs `ngrok-skip-browser-warning: true` on requests regardless of which approach is used. Revisit when there's an actual audience to demo to. |

## Key decisions worth remembering

- **Feedback has no fixed categories.** Originally planned with noise/wifi/crowded checkboxes; deliberately dropped in favor of free text + AI-driven discovery (Topics service). Structured signal now comes from Topics' discovered clusters instead of hardcoded fields — genuinely working as of 2026-07-22.
- **Python for Topics, not Ollama/.NET.** Real `hdbscan` + `sentence-transformers` beat a hand-rolled K-Means approximation; Python is accepted as a second language for this one workload.
- **Label refinement model: `Qwen2.5-3B-Instruct` via `llama-cpp-python`, not Ollama, not `flan-t5`.** Ollama was ruled out as a separate runtime earlier (see above). `flan-t5-small`/`base` (via plain `transformers`) were tried first since they needed no new runtime — both produced garbage labels (generic filler words, sentiment-flipped labels) on a meaningful fraction of clusters; the model just wasn't a strong enough instruction-follower. Qwen2.5-3B (GGUF, CPU, ~3-4GB RAM) fixed this. Stays in the "free, fully local" lane the project has kept throughout.
- **Comments are public, unmoderated.** Deliberate choice, revisit before a real demo or public launch.
- **Brand color** is `#E1552E` (defined as `--color-brand-*` in `index.css`), used consistently for both map markers and UI chrome — don't reintroduce Tailwind's default `rose-*` colors.
- **The map loads the whole district, not just the visible viewport.** Changed specifically so route planning always has every place to search against, not only whatever's currently panned into view. `usePlacesInBoundingBox` is now called with a fixed `DISTRICT_BOUNDS` envelope everywhere (map + route planning share the one query/cache entry) instead of a live-updating bbox. Fine at ~340 places; would need revisiting (pagination, or reintroducing viewport scoping for the map while keeping route planning district-wide) if the dataset grows much larger.
- **LLM candidate-matching uses numbered indices, not raw IDs, in the prompt+response.** A small local model (Qwen2.5-3B, Q4 quant) reliably drops or garbles literal UUIDs when asked to echo them back; asking for a plain integer index and mapping it back to a real ID server-side removed that failure mode entirely, at zero cost.
- **GPU is now effectively required to run `topics-service` at a usable speed.** CPU inference for a full-district route-planning prompt (~4.3k tokens) took ~35s; the same request is ~0.2-0.4s on GPU. The Dockerfile was changed in place (CUDA build replacing the CPU build), not offered as an option — see the GPU acceleration warning under Topics service above for the portability implication.
- **`position: fixed` overlays must portal past any `backdrop-filter` ancestor.** A `backdrop-filter` (Tailwind's `backdrop-blur-*`, used on the map sidebar and header dropdowns) creates a new CSS containing block for `position: fixed` descendants — a fixed-position overlay rendered inline inside one gets clipped to that ancestor's bounds instead of the viewport, not the whole screen. Fix is a React portal straight to `document.body` (see `PhotoLightbox.tsx`). Applies to any future fixed-position overlay nested under a blurred container, not just this one — worth checking first rather than re-discovering.
- **Object URLs + React StrictMode.** Creating a `URL.createObjectURL` in a lazy `useState` initializer and revoking it in a separate cleanup-only `useEffect` breaks under StrictMode's dev-mode double-invoke (mount → cleanup → mount): the URL gets revoked on the synthetic first pass and never recreated, so the image never loads. Fix: create *and* revoke inside the same effect, symmetrically, so the follow-up mount gets a fresh URL (see `AvatarCropper.tsx`).
