# Resonance — Progress & Roadmap

Last updated: 2026-09-17. This file is the source of truth for "what's done and what's next" — update it as things change instead of relying on memory.

## Architecture at a glance

| Service | Tech | Host port | Purpose |
|---|---|---|---|
| `places-service` | ASP.NET Core, PostGIS | 5112 | Place data (imported from OSM), bbox queries for the map |
| `identity-service` | ASP.NET Core | 5076 | Register/login, issues JWTs |
| `feedback-service` | ASP.NET Core | 5066 | Free-text comments per place, JWT-protected submit, public read |
| `topics-service` | Python, FastAPI | 8010 (container listens on 8001 internally — host port moved off 8001 due to a persistent, unexplained conflict with Docker Desktop's own backend process on this machine) | AI topic discovery from comments, sentiment/dimension scoring, and (new) LLM-driven route planning. GPU-accelerated (CUDA) on this dev machine — see below. |
| `frontend` | React, Vite, Leaflet | 5173 | The app. Lives at `frontend/` directly (moved out of `frontend/resonance-web/`). Has a `Dockerfile` and a `docker-compose.yml` entry; still fine to run locally via `npm run dev` too. |

No API gateway yet (deliberate — see "Deferred, on purpose"). The frontend calls each service directly.

**All four backend services + Postgres are now containerized** (`infra/docker-compose.yml`). One command brings up the whole backend:
```powershell
docker compose -f infra/docker-compose.yml up -d --build
```
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
- [x] JWT-protected submit, public read (comments are intentionally public, no moderation yet)
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

⚠️ **This makes `topics-service` require an NVIDIA GPU + `nvidia-container-toolkit` to build/run at all right now** — there is no CPU-only fallback path left in the Dockerfile (the old one was replaced, not kept as an alternative). If this needs to run on a machine without a compatible GPU (a different dev machine, a grading/demo machine, CI), either restore a CPU-only build path (conditional Dockerfile / build arg) or accept GPU as a hard requirement going forward. Worth deciding deliberately rather than discovering it at the worst time.

## Review scraper — real reviewer identity + photos (2026-09-18)

`tools/review-scraper/` (personal-use, not published — see its `package.json`) already pulled real review text from Google Maps; extended to also capture and re-host reviewer identity and attached photos, plus a standard fallback avatar for everyone else:

- **Reviewer name + avatar**: a review card's own `aria-label` attribute is just the reviewer's display name (e.g. `aria-label="Nadiya"`) — simpler than reading the equivalent `.d4r55` text node. Avatar comes from `img.NBa7we`'s `src`.
- **Attached photos render as CSS `background-image`** on `<button class="Tya61d">` elements inside `.KtCyie`, not a plain `<img src>` — needs a regex pull from the `style` attribute (`scrape.js`).
- **Google's own image URLs accept an arbitrary resize suffix** (e.g. `...=w36-h36-p-rp-mo-br100`) — `import-reviews.js` bumps this before downloading (`=w256-h256` for avatars, `=w800-h600` for review photos) to re-host a decent resolution instead of the tiny thumbnail actually rendered on the card.
- Name + avatar are downloaded and re-hosted on the app's own S3 bucket (same bucket/key convention as identity-service's own avatar uploads, `avatars/{userId}/...`), never hotlinked to Google's CDN. A brand-new `Users` row is created per scraped review — no cross-review reviewer-identity matching, a known simplification not worth solving at this project's scale.
- Review photos land in a new `QuickFeedbackPhotos` table, re-hosted the same way under `review-photos/{placeId}/{feedbackId}/{n}.webp`.
- **Standard placeholder avatar** (`tools/synthetic-avatars/`): one static generic-person SVG (brand-500 background, matching the app's existing initial-letter fallback color) uploaded once to `avatars/default/*.webp` and assigned to any user without a real photo — covers both the original synthetic/seeded comment pool and any real signed-up user who hasn't uploaded their own avatar.

## Next step

**The shared-intention connections feature** ("Feature 2" from an approved-but-unimplemented UX proposal — see below) — the originally-requested companion to route planning, not started at all yet.

Older ideas still on the table, lower priority: a global "trending themes" view, AI paragraph summaries per place, recency filtering on the heatmap. Ask before assuming which one matters most.

### Feature 2: shared-intention connections — designed, not started

A full UX/IA proposal was written and approved (place page → "Want to go?" → pick a rough time window → see others who share that intent → connect → chat), explicitly **not** a dating/friend-matching feature — the place and shared intent are the point, not profiles. The original proposal was delivered as a standalone document in an earlier chat session, not saved into this repo; the detail below is what's been preserved/refined since. Shape it called for, if picked back up:
- New `connections-service` (mirrors the existing ASP.NET Clean Architecture + MediatR pattern, own Postgres DB) — entities roughly `VisitIntent` (user + place + coarse time bucket + optional `IntentTag`/note), `Conversation`/`Message`, plus a `Block`/mute record per user pair.
- Chat via polling (React Query `refetchInterval`), not a new SignalR/WebSocket dependency — nothing in this stack does real-time today, and the user explicitly chose polling over adding that infra.
- UI: one more section in the existing place-detail panel (not a separate "social" surface), a lightweight inbox off the header's account menu, reusing existing visual tokens rather than generic social-app patterns (no avatar grids, no card walls).

**Revised (2026-09-12): connection flow simplified from mutual opt-in to direct chat.** The original two-step gate (send a connection request → wait for the other person to accept → only then chat) added too much friction for a geo/utility app rather than a dating app. Replaced with:
- **Passive intent visibility**: setting a `VisitIntent` implicitly makes a user visible to others sharing the same coarse time bucket + place — no separate opt-in step. The place-detail panel shows a lightweight list/count of matching intents (display name/avatar if available, plus their intent tag) instead of a request/response wall.
- **Direct chat initiation, no pending-request gate**: clicking "Message" on a peer's intent creates the conversation (or sends the first message) immediately — there's no `ConnectionRequest` blocking messaging until mutual acceptance. `ConnectionRequest` as an entity is dropped from the shape above; a `Block`/mute record replaces it as the safety mechanism.
- **Safety moves into the chat itself**: Block / Decline / Mute live as an action inside the chat view for the recipient, rather than as an upfront handshake. This is the trade made instead of the mutual-accept gate — worth remembering if abuse/spam becomes a real problem later, since the original design's friction was also an implicit spam brake.

**Intent context/tags**, so two matched people aren't messaging with zero context on why the other is going:
- `VisitIntent` gets an optional `IntentTag`/note field (string, ~50-60 char cap).
- When picking the time window on the place page, offer quick-select preset chips (e.g. coffee, remote work, sightseeing, drinks) plus free text.
- The tag shows next to the name in the "who's going" list, and again at the top of the chat panel once a conversation starts, so both sides see the shared context immediately.

### Feature 3: public user profiles — designed, not started

Full design in `docs/public-profiles-design.md` (2026-09-17) — the prerequisite Feature 2 needs, since chatting with someone about visiting a place together first requires somewhere to see who they are. Adds `Bio`, `Interests` (fixed preset list), `PreferredLanguage` to `User`; a public `/users/:id` profile page with derived stats (comment count, distinct places visited, photos shared — all computed from existing data, nothing new stored) and comment history; new anonymous endpoints on identity-service and feedback-service. Flags one thing worth a conscious look before building: some comment authors today are real Google reviewers (scraped name + avatar, see Topics/review-scraper below) — a full profile page is a deeper presentation of their data than a name next to a review, worth deciding deliberately rather than inheriting by default.

## Deferred, on purpose (don't re-suggest without new information)

| Item | Why deferred |
|---|---|
| API Gateway | Places/Identity/Feedback duplicate Identity's JWT config; a `connections-service` (see Feature 2 above) would be the 3rd-ish service to hit this — worth a conscious look when/if that gets built, not necessarily action |
| Trending / Favorites / Collections | Not started, no blocker — just not prioritized yet |
| Comment moderation | Comments are deliberately public with no moderation — revisit at real volume or before a public demo |
| MediatR licensing | MediatR 13+ requires a paid license for production use; still on the free dev/test tier. Options: accept the license, pin to MediatR 12.x (MIT), or drop MediatR for direct DI. Not decided. Would apply equally to a new `connections-service` built the same way. |
| Shared-intention connections (Feature 2) | Fully designed/approved, not started — see "Next step" above |
| Public user profiles (Feature 3) | Designed, not started — prerequisite for Feature 2's chat; see `docs/public-profiles-design.md` |
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
