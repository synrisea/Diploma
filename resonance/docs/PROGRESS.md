# Resonance — Progress & Roadmap

Last updated: 2026-09-10. This file is the source of truth for "what's done and what's next" — update it as things change instead of relying on memory.

## ⚠️ Read this first: uncommitted work in the working tree

The working tree currently has substantial **uncommitted** changes on top of the last commit (`29bd760 Redesign`, 2026-08-18). None of this is lost — it's just sitting unstaged/untracked in the checkout. Do **not** run `git checkout .`, `git reset --hard`, or `git clean` without stashing/committing first, or all of the below is gone.

What's uncommitted right now:
- **The entire frontend moved**: `resonance/frontend/resonance-web/` → `resonance/frontend/` (the `resonance-web` subfolder was dropped). Git sees this as the old path fully deleted + the new path fully untracked, since it was never staged as a rename. Everything below assumes the **new** path (`resonance/frontend/`).
- **The whole route-planning feature** (frontend + backend) — see below, entirely new and untested against a committed baseline.
- **GPU acceleration for `topics-service`'s LLM** — `Dockerfile`, `llm.py`, `main.py`, `requirements.txt`, `infra/docker-compose.yml` all modified.
- A `frontend` service was added to `infra/docker-compose.yml` (frontend containerization, started but not finished — see "Known rough edges").
- Untracked `.impeccable/` directories at repo root and under `resonance/frontend/` — leftover tool state from design-skill runs, not project files, safe to ignore/delete, don't commit them.

Recommendation for whoever picks this up: review `git status` / `git diff` and commit this in a few logical chunks (frontend move, route-planning feature, GPU work) before starting new work, so there's a real baseline to diff against again.

## Architecture at a glance

| Service | Tech | Host port | Purpose |
|---|---|---|---|
| `places-service` | ASP.NET Core, PostGIS | 5112 | Place data (imported from OSM), bbox queries for the map |
| `identity-service` | ASP.NET Core | 5076 | Register/login, issues JWTs |
| `feedback-service` | ASP.NET Core | 5066 | Free-text comments per place, JWT-protected submit, public read |
| `topics-service` | Python, FastAPI | 8010 (container listens on 8001 internally — host port moved off 8001 due to a persistent, unexplained conflict with Docker Desktop's own backend process on this machine) | AI topic discovery from comments, sentiment/dimension scoring, and (new) LLM-driven route planning. GPU-accelerated (CUDA) on this dev machine — see below. |
| `frontend` | React, Vite, Leaflet | 5173 | The app. **Path changed** (was `frontend/resonance-web`, now `frontend/` directly, uncommitted — see above). Has a `Dockerfile` and a `docker-compose.yml` entry now (experimental, not yet fixed up — see "Known rough edges"); still fine to run locally via `npm run dev` too. |

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

**Identity**
- [x] Register/login, BCrypt password hashing, JWT issuance

**Feedback**
- [x] Free-text comments only — **no fixed noise/wifi/crowded checkboxes** (deliberate, see decisions below)
- [x] JWT-protected submit, public read (comments are intentionally public, no moderation yet)
- [x] Seeded with ~2,200 realistic comments across all 391 places (mixed casual/formal tone, "safety" theme weighted ~19% on purpose — see Topics service below)

**Frontend**
- [x] Map page: clustering, collapsible sidebar (reopens automatically when you select a place while collapsed)
- [x] Dedicated `/login` page (two-panel layout), account dropdown menu
- [x] Comment list + submission form on place detail
- [x] Discovered topics shown as badges on place detail (via Topics' `GET /api/topics/places/{id}`) — the first place Topics' output is actually visible to a user, not just curl
- [x] Unified brand color token (`brand-500` etc. in `index.css`), consistent across markers and UI chrome
- [x] Sentiment/dimension heatmap on the map (2026-08-02) — a picker (top-right) toggles "Off," "Overall sentiment," or a specific dimension (`Noise`, `Wifi`, `Safety`...). Built with `leaflet.heat`, two overlaid single-color layers (red/green) rather than one shared gradient, because a shared density gradient makes bad areas fade to nothing instead of glowing red. Weights are normalized to 0..1 per layer and `maxZoom` is pinned to the map's default zoom — `leaflet.heat` clips accumulated weight against a fixed `max` (1.0) scaled by a zoom-distance falloff, so raw comment counts without normalization rendered as a near-invisible gray smudge instead of graduated color. See `frontend/src/components/map/heatmapPoints.ts`.
- [x] Full visual redesign (`29bd760`, committed) — dark ground, glow/glassmorphism, monospace uppercase micro-labels, a "signal" metaphor replacing generic "comment" language, new category color palette. Two earlier redesign attempts were explicitly rejected by product feedback (too much glow/decoration) before this one landed — don't re-introduce heavy shadow/gradient effects without checking first.
- [x] **Route planning** (uncommitted, new) — a user types a free-text wish into a search bar in the header (`RouteSearchBar` → global `RouteProvider`/`RouteContext`), Topics' LLM matches it against every place in the district (not just what's on screen) and returns an ordered subset, the frontend runs a small fixed-start TSP over that subset (`lib/routeOrdering.ts`, exact for ≤8 stops, nearest-neighbor above that), and the result renders as numbered pins plus a glowing polyline that draws itself onto the map leg-by-leg (`RoutePolyline.tsx`, CSS `stroke-dashoffset`, respects `prefers-reduced-motion`). The map now loads the **whole district** at once (`lib/mapConstants.ts`'s `DISTRICT_BOUNDS`, ~340 places) rather than only the visible bbox, specifically so route planning always has the full place set to search — see "Key decisions" for the tradeoffs this caused and fixed.

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

### Route planning (uncommitted, new — 2026-08/09)

Reuses the same `llm.py` singleton as label refinement/sentiment rather than loading a second model copy. Shape:
1. `POST /api/itinerary/plan` (`main.py`, `itinerary.py`, `models.py`, `prompts/plan_itinerary.md`) takes `{wish, candidatePlaces}` and returns `{placeIds}`.
2. Candidates are numbered `1..N` in the prompt and the model returns **indices**, not raw place IDs — a small local model echoing UUIDs back verbatim was unreliable; indices get mapped back to real IDs server-side, and any index outside `1..N` is dropped rather than trusted. This is the anti-hallucination guard — the model's raw output is never passed through unchecked.
3. Client-side TSP ordering (`frontend/src/lib/routeOrdering.ts`) — deliberately **not** done via a routing engine (OSRM etc.) — Torgovy is small and walkable, so haversine straight-line distance is treated as a good-enough approximation. Flagged as a known simplification, not re-litigated.

**GPU acceleration (uncommitted, new, machine-specific)**: `topics-service`'s `Dockerfile` was switched from a CPU-only prebuilt `llama-cpp-python` wheel to building it from source (`CMAKE_ARGS="-DGGML_CUDA=on"`) against an `nvidia/cuda:12.4.1-devel-ubuntu22.04` base image, with `n_gpu_layers=-1` in `llm.py` to offload every layer. `infra/docker-compose.yml`'s `topics-api` service requests a GPU via `deploy.resources.reservations.devices` (nvidia driver). This cut a full-district route-planning request (candidates = ~340 places, ~4.3k prompt tokens) from ~35s on CPU to ~0.2-0.4s on this machine's RTX 5070, after a one-time ~8s CUDA kernel JIT-compile that happens automatically at container startup (`llm.py` runs a couple of throwaway warm-up completions at import time specifically so no real user request pays that cost).

⚠️ **This makes `topics-service` require an NVIDIA GPU + `nvidia-container-toolkit` to build/run at all right now** — there is no CPU-only fallback path left in the Dockerfile (the old one was replaced, not kept as an alternative). If this needs to run on a machine without a compatible GPU (a different dev machine, a grading/demo machine, CI), either restore a CPU-only build path (conditional Dockerfile / build arg) or accept GPU as a hard requirement going forward. Worth deciding deliberately rather than discovering it at the worst time.

## Next step

Not yet decided. Two candidates, roughly in order of what was actually asked for:
1. **The shared-intention connections feature** ("Feature 2" from an approved-but-unimplemented UX proposal — see below) — the originally-requested companion to route planning, not started at all yet.
2. Finish the frontend containerization that was started but left half-done (see "Known rough edges"), and get the uncommitted work above into real commits.

Older ideas still on the table, lower priority: a global "trending themes" view, AI paragraph summaries per place, recency filtering on the heatmap. Ask before assuming which one matters most.

### Feature 2: shared-intention connections — designed, not started

A full UX/IA proposal was written and approved (place page → "Want to go?" → pick a rough time window → see others who share that intent → optionally connect → mutual acceptance → chat), explicitly **not** a dating/friend-matching feature — the place and shared intent are the point, not profiles. It was delivered as a standalone document in that chat session, not saved into this repo, so the detail isn't preserved here beyond this summary. Shape it called for, if picked back up:
- New `connections-service` (mirrors the existing ASP.NET Clean Architecture + MediatR pattern, own Postgres DB) — entities roughly `VisitIntent` (user + place + coarse time bucket), `ConnectionRequest` (mutual accept/decline), `Conversation`/`Message`.
- Chat via polling (React Query `refetchInterval`), not a new SignalR/WebSocket dependency — nothing in this stack does real-time today, and the user explicitly chose polling over adding that infra.
- UI: one more section in the existing place-detail panel (not a separate "social" surface), a lightweight inbox off the header's account menu, reusing existing visual tokens rather than generic social-app patterns (no avatar grids, no card walls).

## Known rough edges

- **Frontend containerization is half-done.** `infra/docker-compose.yml`'s new `frontend` service sets `VITE_PLACES_API_URL`/`VITE_IDENTITY_API_URL`, but the actual frontend code reads `VITE_API_BASE_URL`/`VITE_IDENTITY_API_BASE_URL`/`VITE_FEEDBACK_API_BASE_URL`/`VITE_TOPICS_API_BASE_URL` (see `frontend/.env`) — the compose env vars don't match anything the app reads. It happens to still work today only because Vite inlines these for the *browser*, and the browser falls back to each api file's hardcoded `localhost:<port>` default, which is reachable since those ports are published to the host anyway — but that's incidental, not intentional. Fix the var names (or drop the compose service and keep running the frontend locally via `npm run dev`, which still works fine) before relying on it.
- **`docs/PROGRESS.md` (this file) was stale for ~7 weeks** before this update — it didn't mention the visual redesign, the frontend move, or route planning until now. Keep updating it as things change; it's the one doc other sessions/agents are told to check first.

## Deferred, on purpose (don't re-suggest without new information)

| Item | Why deferred |
|---|---|
| API Gateway | Places/Identity/Feedback duplicate Identity's JWT config; a `connections-service` (see Feature 2 above) would be the 3rd-ish service to hit this — worth a conscious look when/if that gets built, not necessarily action |
| Trending / Favorites / Collections | Not started, no blocker — just not prioritized yet |
| Comment moderation | Comments are deliberately public with no moderation — revisit at real volume or before a public demo |
| MediatR licensing | MediatR 13+ requires a paid license for production use; still on the free dev/test tier. Options: accept the license, pin to MediatR 12.x (MIT), or drop MediatR for direct DI. Not decided. Would apply equally to a new `connections-service` built the same way. |
| Shared-intention connections (Feature 2) | Fully designed/approved, not started — see "Next step" above |
| Road-network-aware route distances | Route planning uses straight-line (haversine) distance, not real walking paths (OSRM etc.) — accepted as good-enough for Torgovy's small, walkable footprint; revisit if that stops being true |
| Frontend Docker env vars | See "Known rough edges" — compose service sets the wrong var names, currently harmless by accident |

## Key decisions worth remembering

- **Feedback has no fixed categories.** Originally planned with noise/wifi/crowded checkboxes; deliberately dropped in favor of free text + AI-driven discovery (Topics service). Structured signal now comes from Topics' discovered clusters instead of hardcoded fields — genuinely working as of 2026-07-22.
- **Python for Topics, not Ollama/.NET.** Real `hdbscan` + `sentence-transformers` beat a hand-rolled K-Means approximation; Python is accepted as a second language for this one workload.
- **Label refinement model: `Qwen2.5-3B-Instruct` via `llama-cpp-python`, not Ollama, not `flan-t5`.** Ollama was ruled out as a separate runtime earlier (see above). `flan-t5-small`/`base` (via plain `transformers`) were tried first since they needed no new runtime — both produced garbage labels (generic filler words, sentiment-flipped labels) on a meaningful fraction of clusters; the model just wasn't a strong enough instruction-follower. Qwen2.5-3B (GGUF, CPU, ~3-4GB RAM) fixed this. Stays in the "free, fully local" lane the project has kept throughout.
- **Comments are public, unmoderated.** Deliberate choice, revisit before a real demo or public launch.
- **Brand color** is `#E1552E` (defined as `--color-brand-*` in `index.css`), used consistently for both map markers and UI chrome — don't reintroduce Tailwind's default `rose-*` colors.
- **The map loads the whole district, not just the visible viewport.** Changed specifically so route planning always has every place to search against, not only whatever's currently panned into view. `usePlacesInBoundingBox` is now called with a fixed `DISTRICT_BOUNDS` envelope everywhere (map + route planning share the one query/cache entry) instead of a live-updating bbox. Fine at ~340 places; would need revisiting (pagination, or reintroducing viewport scoping for the map while keeping route planning district-wide) if the dataset grows much larger.
- **LLM candidate-matching uses numbered indices, not raw IDs, in the prompt+response.** A small local model (Qwen2.5-3B, Q4 quant) reliably drops or garbles literal UUIDs when asked to echo them back; asking for a plain integer index and mapping it back to a real ID server-side removed that failure mode entirely, at zero cost.
- **GPU is now effectively required to run `topics-service` at a usable speed.** CPU inference for a full-district route-planning prompt (~4.3k tokens) took ~35s; the same request is ~0.2-0.4s on GPU. The Dockerfile was changed in place (CUDA build replacing the CPU build), not offered as an option — see "Known rough edges" for the portability implication.
