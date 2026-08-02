# Resonance — Progress & Roadmap

Last updated: 2026-07-23. This file is the source of truth for "what's done and what's next" — update it as things change instead of relying on memory.

## Architecture at a glance

| Service | Tech | Host port | Purpose |
|---|---|---|---|
| `places-service` | ASP.NET Core, PostGIS | 5112 | Place data (imported from OSM), bbox queries for the map |
| `identity-service` | ASP.NET Core | 5076 | Register/login, issues JWTs |
| `feedback-service` | ASP.NET Core | 5066 | Free-text comments per place, JWT-protected submit, public read |
| `topics-service` | Python, FastAPI | 8010 (container listens on 8001 internally — host port moved off 8001 due to a persistent, unexplained conflict with Docker Desktop's own backend process on this machine) | AI topic discovery from comments (embeddings + HDBSCAN clustering, c-TF-IDF keywords, labels refined by a local LLM) |
| `frontend/resonance-web` | React, Vite, Leaflet | 5173 | The actual app — still run locally via `npm run dev`, not containerized (keeps HMR) |

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
- [x] Sentiment/dimension heatmap on the map (2026-08-02) — a picker (top-right) toggles "Off," "Overall sentiment," or a specific dimension (`Noise`, `Wifi`, `Safety`...). Built with `leaflet.heat`, two overlaid single-color layers (red/green) rather than one shared gradient, because a shared density gradient makes bad areas fade to nothing instead of glowing red. Weights are normalized to 0..1 per layer and `maxZoom` is pinned to the map's default zoom — `leaflet.heat` clips accumulated weight against a fixed `max` (1.0) scaled by a zoom-distance falloff, so raw comment counts without normalization rendered as a near-invisible gray smudge instead of graduated color. See `frontend/resonance-web/src/components/map/heatmapPoints.ts`.

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

## Next step

Heatmap (overall + per-dimension sentiment) shipped 2026-08-02. Not yet decided what's next — remaining options are a global "trending themes" view (aggregate across all places, not just one), AI paragraph summaries per place, recency filtering on the heatmap (`comments.created_at` already exists, just needs a WHERE clause), or picking up one of the deferred items below. Ask before assuming.

## Deferred, on purpose (don't re-suggest without new information)

| Item | Why deferred |
|---|---|
| API Gateway | Only Feedback currently duplicates Identity's JWT config — revisit once a 3rd service needs it |
| Trending / Favorites / Collections | Not started, no blocker — just not prioritized yet |
| Comment moderation | Comments are deliberately public with no moderation — revisit at real volume or before a public demo |
| MediatR licensing | MediatR 13+ requires a paid license for production use; still on the free dev/test tier. Options: accept the license, pin to MediatR 12.x (MIT), or drop MediatR for direct DI. Not decided. |

## Key decisions worth remembering

- **Feedback has no fixed categories.** Originally planned with noise/wifi/crowded checkboxes; deliberately dropped in favor of free text + AI-driven discovery (Topics service). Structured signal now comes from Topics' discovered clusters instead of hardcoded fields — genuinely working as of 2026-07-22.
- **Python for Topics, not Ollama/.NET.** Real `hdbscan` + `sentence-transformers` beat a hand-rolled K-Means approximation; Python is accepted as a second language for this one workload.
- **Label refinement model: `Qwen2.5-3B-Instruct` via `llama-cpp-python`, not Ollama, not `flan-t5`.** Ollama was ruled out as a separate runtime earlier (see above). `flan-t5-small`/`base` (via plain `transformers`) were tried first since they needed no new runtime — both produced garbage labels (generic filler words, sentiment-flipped labels) on a meaningful fraction of clusters; the model just wasn't a strong enough instruction-follower. Qwen2.5-3B (GGUF, CPU, ~3-4GB RAM) fixed this. Stays in the "free, fully local" lane the project has kept throughout.
- **Comments are public, unmoderated.** Deliberate choice, revisit before a real demo or public launch.
- **Brand color** is `#E1552E` (defined as `--color-brand-*` in `index.css`), used consistently for both map markers and UI chrome — don't reintroduce Tailwind's default `rose-*` colors.
