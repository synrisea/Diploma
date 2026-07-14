# Resonance — Progress & Roadmap

Last updated: 2026-07-15. This file is the source of truth for "what's done and what's next" — update it as things change instead of relying on memory.

## Architecture at a glance

| Service | Tech | Dev port | Purpose |
|---|---|---|---|
| `places-service` | ASP.NET Core, PostGIS | 5112 | Place data (imported from OSM), bbox queries for the map |
| `identity-service` | ASP.NET Core | 5076 | Register/login, issues JWTs |
| `feedback-service` | ASP.NET Core | 5066 | Free-text comments per place, JWT-protected submit, public read |
| `topics-service` | Python, FastAPI | — | **Not built yet** — see "Next step" below |
| `frontend/resonance-web` | React, Vite, Leaflet | 5173 | The actual app |

No API gateway yet (deliberate — see "Deferred, on purpose"). The frontend calls each service directly.

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
- [x] Unified brand color token (`brand-500` etc. in `index.css`), consistent across markers and UI chrome

## Next step: Topics service (Python)

This is the highest-value next piece — right now Feedback data has **zero structured signal**. There are no noise/wifi/crowded fields anymore, so a place page can only show a raw list of comments. The Topics service is what turns that into something a heatmap or a "62% mention X" stat could eventually use.

Design (already worked out, ask Claude to generate the code when ready — same "from zero" treatment as the other services):

1. **Scaffold**: `services/topics-service/`, Python + FastAPI, its own `venv`.
2. **Data access**: pull comments from Feedback via `GET /api/feedback/comments?after=&limit=` (needs adding to Feedback — doesn't exist yet). No shared DB — Topics keeps its own local SQLite store (raw comments pulled so far, a cursor, computed topics).
3. **Embeddings**: `sentence-transformers` (`all-MiniLM-L6-v2`), local, no external API.
4. **Clustering**: real `hdbscan` (not a K-Means approximation).
5. **Labeling**: hand-rolled c-TF-IDF (term frequency within a cluster, weighted by rarity across other clusters) — this is what turns a cluster of comments into a readable label like "safety" or "price".
6. **Retrain trigger**: recompute from scratch over the whole accumulated corpus every time total comment count grows by 100 since the last run. With ~2,200 comments already seeded, this should fire almost immediately once built — a good opportunity to actually see a "safety" cluster emerge from real (seeded) data.
7. **Endpoints**: `GET /api/topics` (list discovered topics + keywords + size), `GET /api/topics/places/{placeId}` (topics touching one place), `POST /api/topics/poll-now` (manual trigger for testing, don't wait on the schedule).

After Topics works, two natural follow-ups (don't start these before Topics is verified running):
- **Dynamic dimension promotion** — clusters that cross a threshold (e.g. 20 comments) become persistent, named "dimensions" that could power heatmap layers. Needs cross-run cluster identity matching via centroid cosine similarity (already designed).
- **AI paragraph summaries per place** — this is a *different* feature than topic discovery. Topics finds categories across all comments; a paragraph summary (e.g. "Visitors appreciate the peaceful atmosphere...") reads one place's comments and asks an LLM to summarize them in prose. Not designed in detail yet.

## Deferred, on purpose (don't re-suggest without new information)

| Item | Why deferred |
|---|---|
| API Gateway | Only Feedback currently duplicates Identity's JWT config — revisit once a 3rd service needs it |
| Heatmaps | Needs structured data from Topics/dimension promotion, which doesn't exist yet |
| Trending / Favorites / Collections | Not started, no blocker — just not prioritized yet |
| Comment moderation | Comments are deliberately public with no moderation — revisit at real volume or before a public demo |
| MediatR licensing | MediatR 13+ requires a paid license for production use; still on the free dev/test tier. Options: accept the license, pin to MediatR 12.x (MIT), or drop MediatR for direct DI. Not decided. |

## Key decisions worth remembering

- **Feedback has no fixed categories.** Originally planned with noise/wifi/crowded checkboxes; deliberately dropped in favor of free text + AI-driven discovery (Topics service). This was a conscious tradeoff, not an oversight — it means no structured signal exists until Topics is built.
- **Python for Topics, not Ollama/.NET.** Real `hdbscan` + `sentence-transformers` beat a hand-rolled K-Means approximation; Python is accepted as a second language for this one workload.
- **Comments are public, unmoderated.** Deliberate choice, revisit before a real demo or public launch.
- **Brand color** is `#E1552E` (defined as `--color-brand-*` in `index.css`), used consistently for both map markers and UI chrome — don't reintroduce Tailwind's default `rose-*` colors.
