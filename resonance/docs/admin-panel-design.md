# Admin Panel — Research & Design

Status: **phases 0-4 implemented 2026-09-21** (§10's build order; phase 5's moderation and user
admin not started). Written 2026-09-21. Results and deviations in §12.

Triggered by a specific need — topic labels need a human in the loop, because automated label
selection plateaued (see `place-tags-design.md` §6) — but scoped deliberately wider, because
several other operational gaps in this project have no UI at all and are currently worked
around with `docker exec` and hand-written scripts.

Three decisions were made up front and are treated as settled throughout:

| Decision | Choice |
|---|---|
| Admin access | Env-var allowlist of user ids (`ADMIN_USER_IDS`), no role column |
| Unreviewed topic labels | Show **nothing** until approved |
| Declining all candidates | Admin can type their own label |

## 0. What already exists to administer

Inventoried from the live services, not assumed:

| Service | Entities | Admin-capable endpoints today |
|---|---|---|
| `identity` | `User`, `RefreshToken`, `ExternalLogin`, `EmailChangeRequest` | none (search/profile reads only) |
| `feedback` | `QuickFeedback`, `QuickFeedbackPhoto` | none — **no delete/hide of any kind** |
| `connections` | `VisitIntent`, `Conversation`, `Message`, `Block`, `FriendRequest` | none |
| `places` | `Place`, `Category` | none (one bbox read) |
| `topics` | `topics`, `dimensions`, `comments` (mirror), `cursor` | `POST /api/topics/poll-now` |

**The entire administrative surface of this application is currently one endpoint.** Everything
else — deleting a bad comment, inspecting why a place has no badges, forcing a retrain, checking
how stale the cluster set is — is done by `docker exec` into a container and typing SQL or Python.
That is the real gap; the label queue is just the part that became unavoidable.

Relevant scale (2026-09-21): 3,825 comments, 362 places, ~2,900 users of which ~2,617 are scraped
Google reviewers, 26 topic clusters, 0 moderation records because the concept does not exist.

## 1. Research: what admin panels contain, and which parts apply here

Surveying what the category conventionally includes, then judging each against this project rather
than importing it wholesale. Marked **build**, **later**, or **no**.

| Area | What it conventionally means | Verdict here |
|---|---|---|
| **Review / approval queue** | Human adjudicates machine output one item at a time | **build** — the driver (§2) |
| **Content moderation** | Hide/remove user content, handle reports | **build, minimal** (§4) — nothing exists, and "delete a bad comment" has no path today |
| **User administration** | Search, inspect, suspend, delete | **build, read-mostly** (§5) |
| **Data curation** | Merge/split/rename derived entities | **build** (§3) — topic merging is currently a cosine threshold with no override |
| **Background job control** | Trigger, monitor, inspect scheduled work | **build** (§6) — the retrain pipeline is invisible and manually poked |
| **Dashboard / metrics** | Health and volume at a glance | **build, small** (§7) |
| **Audit log** | Who did what, when, and what changed | **build** (§8) — non-negotiable once destructive actions exist |
| **Config / feature flags** | Change behaviour without redeploy | **later** — thresholds are env vars today; a UI for them is a nice-to-have, not a gap |
| **Impersonation** ("log in as user") | Reproduce a user's exact view for support | **no** — high blast radius, and with one operator and full DB access it solves nothing that a read-only user inspector doesn't |
| **Direct-message browsing** | Read user conversations | **no** — see §5.3; this is a privacy decision, not a scoping one |
| **Bulk import / export** | CSV in/out | **no** — the scraper already owns import; nothing needs export |
| **Localization management** | Translate UI strings | **no** — app is English-only in-product |

Design principles carried through the whole panel, drawn from what makes review tooling actually
usable rather than merely complete:

1. **Evidence sits next to the decision.** A reviewer should never navigate away to find out what
   they are approving. In §2 that means the sample comments render in the same view as the buttons.
2. **Queues are keyboard-first.** A 26-item queue is clicked through once; a 200-item queue after a
   corpus doubles is not, unless `1`/`2`/`3`/`S` work.
3. **Read-only by default; mutation is explicit.** Every destructive control gets a confirm step,
   and the confirm names the specific object.
4. **Everything that mutates is audited**, including approvals — otherwise "why does this place say
   that" becomes unanswerable in a month.
5. **Idempotency.** Acting on an item someone else (or a retrain) already changed must fail loudly,
   not silently overwrite.
6. **The panel reuses the app's design system.** No second visual language, no component library
   dependency — same tokens, same `BackLink`/section patterns as Settings.

## 2. Topic label review (the driver)

### 2.1 Why it's needed

`place-tags-design.md` §6 documents the plateau: automated selection fixed the gross failures
(`Voltage Chiller`, contradictory badges, duplicate labels) but the residue is judgment —
`Baku Gem` is vague, `Mall Beauty` is arguably wrong, and whether `Plants & Music` should read as
positive is a call embeddings cannot make. Three rounds of threshold tuning bought diminishing
returns. A human spends ~5 seconds per cluster and is definitively correct.

### 2.2 Hard prerequisite: stable topic identity

**This cannot be built before `place-tags-design.md` §2G.** `recluster()` currently runs
`DELETE FROM topics` and reinserts with fresh autoincrement ids on every retrain (~every 100 new
comments). An approval keyed to `topics.id` would be destroyed within days.

Required change: match each new run's clusters to the previous run's by centroid cosine — exactly
what `dimensions` already does at `DIMENSION_SIMILARITY_THRESHOLD` — and carry the id, the approved
label, and the review status forward. Only genuinely new clusters enter the queue.

Two edge cases the matching must handle:

- **Drift.** A cluster can keep its id while its meaning moves. If the matched centroid similarity
  is merely above the match floor but below a higher "unchanged" bar, or if the top keywords changed
  substantially, the topic returns to `pending` with its old label retained as a fourth candidate.
- **Merges.** If two previously-approved topics now match one cluster, keep the approved label of the
  larger and record the other id as merged-into (so an audit trail exists).

### 2.3 Data model

Added to `topics`:

| Column | Type | Meaning |
|---|---|---|
| `status` | `pending` / `approved` / `rejected` | Drives both the queue and badge visibility |
| `approved_label` | TEXT, nullable | What users see. Never overwritten by a retrain |
| `candidates` | TEXT (JSON array) | The three generated options, retained for audit |
| `reviewed_at` | TEXT, nullable | |
| `reviewed_by` | TEXT, nullable | Admin user id |
| `centroid` | TEXT (JSON) | Already needed for §2G matching |

`generate_label_candidates()` already returns a ranked list; store the **top three** by the existing
`pick_label` ordering. No change to the LLM prompt is required — it is already asked for 5-10.

### 2.4 The review screen

One cluster at a time, everything needed to decide on screen:

```
Topic 4 of 26                                        [skip]  [s]

  n=71 comments · 43 places · sentiment: positive
  keywords: coffee, cafe, friendly, shop, great

  Representative comments
    "Great specialty coffee and the staff are lovely…"
    "Best flat white in Baku, cosy little shop…"
    "Friendly baristas, good beans, quick service…"
    "Lovely spot for coffee, very welcoming…"

  Choose a label
    [1] Great Coffee          [2] Specialty Coffee     [3] Coffee Shop
    [ type your own…                                              ]

  [approve]              [reject topic — never show it]
```

- **The four sample comments already exist** — `sample_comments()` computes the centroid-closest
  four per cluster for the labelling prompt, and they are currently thrown away after the LLM call.
  Persisting them costs nothing and is exactly the evidence a reviewer needs.
- **Free-text override** (the chosen decision) sits alongside, not behind, the three candidates.
- **Reject** means "this is not a real theme" — the cluster stops producing badges everywhere and
  stays rejected across retrains. This is the manual escape hatch for junk the automated
  contentless filter misses (`Improvement Needed`, keyworded `believe, improvement, attention`).
- **Skip** leaves it pending and moves on; nothing is written.

### 2.5 Consequence of "nothing until approved" that must be planned for

With this rule, `topics_for_place` filters to `status = 'approved'`. On the first deploy **every
badge in the application disappears** until the queue is worked, and after each retrain any newly
split cluster is invisible until reviewed.

At the current 26 clusters this is a ten-minute one-off. It is called out because it is a visible
regression if it happens unannounced, and because it makes §2.2's carry-forward matching the
difference between "review 3 new clusters" and "review all 26 again" every retrain.

Mitigation if the queue is ever neglected: the dashboard (§7) shows pending count and how many
places currently render zero badges as a result.

### 2.6 Endpoints

All in `topics-service`, all admin-gated:

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/admin/topics?status=pending` | Queue, with candidates + samples + keywords |
| POST | `/api/admin/topics/{id}/approve` | `{label}` — one of the candidates or free text |
| POST | `/api/admin/topics/{id}/reject` | Hide permanently |
| POST | `/api/admin/topics/{id}/reopen` | Undo — returns to pending |

Approve/reject take an `expectedRevision` (or `computed_at`) so an approval racing a retrain fails
loudly rather than writing a label onto a cluster that has since changed (principle 5).

## 3. Topic and dimension curation

Beyond the queue, the derived-data layer has knobs that are currently cosine thresholds with no
human override:

- **Merge two topics.** `TOPIC_MERGE_THRESHOLD` is 0.82 and imperfect — `Remarkable Service` and
  `Good Service` coexisted until a different fix removed both. A manual merge (pick two, keep one
  label, union the place counts) is the obvious complement.
- **Split is out of scope.** Splitting a cluster means re-running HDBSCAN on a subset; no UI can do
  this meaningfully. Reject-and-retrain instead.
- **Dimension management.** `dimensions` drive the heatmap picker and are promoted automatically at
  `DIMENSION_PROMOTION_MIN_COUNT`. Admin should be able to rename one (it is user-visible in the
  heatmap dropdown) and demote a bad one. Currently impossible without SQL.
- **Per-topic place list.** Read-only view of which places a topic badges and with what local counts
  — the thing I repeatedly wrote throwaway Python for during the tags work.

## 4. Content moderation (minimal, and in tension with a prior decision)

`PROGRESS.md` states comments are deliberately public with no moderation, revisited "at real volume
or before a public demo." That decision is about **not building a moderation workflow** — queues,
reports, automated filtering. It is not a decision to have no ability to remove anything, which is
the current state and is a liability the moment this is demoed with real user input.

Minimum viable, and deliberately not more:

- **Hide a comment.** Soft delete — `IsHidden` on `QuickFeedbacks`, excluded from all reads
  including the topics-service pull. Not a hard delete: reversible, and preserves the row for audit.
- **Hide a photo.** Same, on `QuickFeedbackPhotos`. Separate because a fine comment can carry a bad
  photo — and every photo here was scraped from Google, which makes an unvetted-image path a real
  risk for a public demo.
- **Search comments** by text, place, or author, so a reported item can actually be found.

Explicitly **not** building: report/flag submission by users, moderation queues, automated toxicity
classification, appeals, or strikes. Those are the workflow the project already declined, and
nothing in the data suggests they are needed at 3,825 seeded comments.

An important interaction: hiding a comment should not silently corrupt topic data. Hidden comments
stay in the topics mirror until the next retrain, so either the retrain must skip hidden ones (a
filter in `fetch_comments_after`) or the hide action must not be assumed to take effect immediately.
The first is correct; it is a one-line change made at the same time.

## 5. User administration

### 5.1 What's needed

- **Find a user** by display name, email, or id. `GET /api/identity/users/search` exists but matches
  display name only and is capped at 20 — admin search needs email and id.
- **Inspect a user**: profile fields, created date, login provider, session count, comment count,
  friend/block counts. Read-only, assembled from the owning services.
- **Suspend** (block login and hide their content) and **delete** (GDPR-shaped hard delete).
  Neither exists in any form.

### 5.2 The scraped-account problem this exposes

~2,617 of ~2,900 users are scraped Google reviewers with `scraped+{uuid}@resonance.local` emails and
randomly generated unknowable passwords. They are indistinguishable from real users in every admin
view unless deliberately marked.

Admin user search must filter by account origin, and a dedicated **scraped accounts** view is worth
having — it is where "why does this person have a weird avatar" and "why can't this friend request
ever be accepted" both get answered. Marking them properly (an `Origin` column beating an email
`LIKE` pattern) is a small change with outsized clarity payoff.

### 5.3 Deliberately excluded: conversation access

Admin **cannot read direct messages**, even though `connections-service` stores them in plain text
and an admin with DB access can trivially read them anyway.

The distinction matters: building a UI for it makes casual browsing the path of least resistance and
implies to users that DMs are staff-readable. The safety mechanism for chat is the block/report
design already chosen in `PROGRESS.md`. If a concrete abuse case ever needs message evidence, that
is a deliberate one-off DB query with an audit trail, not a browsable screen.

What admin *can* see: that a conversation exists, its participants, message counts, timestamps.
Enough to investigate spam patterns without reading content.

## 6. Pipeline operations

This is where the day-to-day pain actually is. Every one of these was done by hand during the tags
work, via `docker exec` and ad-hoc scripts:

| Control | Replaces |
|---|---|
| **Pipeline status** — last retrain time, comments since, threshold, clusters produced, corpus size | `sqlite3` query against `cursor` |
| **Force retrain** | Resetting `comments_at_last_run = 0` by hand, then `POST /poll-now` |
| **Poll feedback now** | `POST /api/topics/poll-now` (the one endpoint that exists) |
| **Sentiment backfill status** — how many comments are unclassified | `SELECT COUNT(*) … WHERE sentiment IS NULL` |
| **Cluster quality snapshot** — cluster count, median size, % corpus clustered, % places badged | `eval_tags.py`, written during the tags work |

Force-retrain is expensive (full re-embed, re-cluster, one LLM call per cluster) and must show
progress and refuse to run concurrently — `pipeline.py` already holds an asyncio lock, so the UI
needs to surface that state rather than invent it.

**Not included**: migration running, container restarts, or anything that touches Docker. Those are
deploy concerns; putting them behind a web button in an app that runs locally adds risk and saves
nothing.

## 7. Dashboard

One screen, answering "is anything wrong" without clicking:

- **Corpus**: places, comments (and new in last 7 days), users split real vs scraped.
- **Tags**: clusters, pending review, places with ≥1 badge (currently 20% — the number that matters
  most after the "nothing until approved" rule lands), last retrain age.
- **Connections**: active visit intents, conversations, messages in last 7 days, blocks, pending
  friend requests. Volume only, no content.
- **Anything stale or stuck**: unclassified sentiment backlog, retrain overdue, pending queue older
  than N days.

Deliberately not: charts of engagement over time, funnels, retention. There are no real users to
analyse and it would be decorative.

## 8. Access control and audit

**Gate**: `ADMIN_USER_IDS` — comma-separated user ids, read per service that exposes admin routes.
Checked against the `sub` claim of the existing JWT. No new auth path, no migration, no role claim.

Honest limitations, recorded so they are chosen rather than discovered:

- Granting or revoking admin requires an env change and a service restart.
- No granularity — an admin can do everything.
- Every service exposing admin routes needs the same env var, duplicating config exactly the way
  JWT settings already are (see `PROGRESS.md`, "API Gateway" deferred). The gateway, if ever built,
  is the natural place to centralize this.

These are acceptable for a single-operator project and would not be for a real deployment. The
replacement path is the `IsAdmin` column considered and set aside in the opening decision.

**Frontend gating is cosmetic.** Hiding `/admin` from the nav is UX, not security — every admin
endpoint must check server-side independently. Worth stating because the temptation with a
single-operator tool is to gate only the route.

**Audit log**: an `admin_actions` table in each service exposing mutations — `actor_user_id`,
`action`, `target_type`, `target_id`, `before`, `after`, `created_at`. Written for approvals,
rejections, merges, hides, suspensions, deletions, and forced retrains. Viewable in the panel,
newest first, filterable by actor and target.

The `before`/`after` pair is what makes "why does this place say that" answerable later — a bare
action log without values answers "someone approved something" and nothing more.

## 9. Information architecture

Lives at `/admin` inside the existing React app — same auth context, same design tokens, same
`BackLink` and section conventions as `SettingsPage`. A separate application would duplicate all
of that for isolation this project does not need.

```
/admin
  ├── overview          dashboard (§7)
  ├── topics
  │     ├── review      the queue (§2) — the default landing tab
  │     ├── all         list, merge, reject, per-topic place lists (§3)
  │     └── dimensions  rename, demote (§3)
  ├── content           comment/photo search, hide (§4)
  ├── users             search, inspect, suspend, scraped-account view (§5)
  ├── pipeline          status, force retrain, quality snapshot (§6)
  └── audit             action log (§8)
```

Nav entry appears in the header only for allowlisted users, next to Settings. Per §8 this is
presentation only.

## 10. Build order

Sequenced so each phase is independently useful and nothing is half-wired:

| Phase | Contents | Why this order |
|---|---|---|
| **0** | Stable topic identity (`place-tags-design.md` §2G) | Hard prerequisite for §2; approvals are meaningless without it |
| **1** | Admin gate, `/admin` shell, audit table + writer | Everything else depends on the gate and the log existing |
| **2** | Topic review queue (§2) | The driver. Ends with badges visible again, all human-approved |
| **3** | Pipeline status + force retrain (§6) | Highest ratio of pain removed to code written |
| **4** | Dashboard (§7) | Cheap once 2 and 3 expose their numbers |
| **5** | Topic/dimension curation (§3), content hiding (§4), user admin (§5) | Genuinely useful, none of it blocking |

Phases 0-2 are the ones that pay for themselves immediately; 3 onward can stop at any point without
leaving something broken.

## 11. Open questions

- **What happens to an approved label when its cluster drifts?** §2.2 proposes re-queueing on
  substantial keyword change, but "substantial" needs a definition, and re-queueing too eagerly
  turns approval into a treadmill. Wants measuring across two or three real retrains.
- **Should rejection be per-cluster or per-theme?** Rejecting a cluster hides that cluster; if the
  same junk theme re-forms under a new centroid after a retrain, it returns to the queue. Storing
  rejected centroids and auto-rejecting close matches would fix it, at the risk of suppressing a
  legitimately different theme.
- **Does the queue need a bulk mode?** At 26 clusters, no. If a corpus 10× larger produces 200+,
  one-at-a-time review stops scaling and the interesting question becomes which clusters are worth
  human attention at all (largest? most places affected? lowest label confidence?).
- **Should hiding a comment trigger an immediate retrain?** Topic data references it until the next
  one. Immediate is correct-but-expensive; deferred is cheap and briefly inconsistent. Probably
  deferred with the staleness surfaced on the dashboard, but it is a real tradeoff.

## 12. Implementation notes (2026-09-21)

Phases 0-4 shipped. Phase 5 (content hiding, user admin) not started.

### What was built

| Phase | Delivered |
|---|---|
| 0 | Centroid matching across retrains: ids, status and approved labels carry forward |
| 1 | `ADMIN_USER_IDS` gate on verified JWTs, `admin_actions` audit table with before/after |
| 2 | Review queue with keyboard shortcuts, free-text override, reject; badges filtered to approved |
| 3 | Pipeline status and force retrain |
| 4 | Overview stats, topic list with reopen, dimension rename/demote, audit view |

### Phase 0 verified against the failure it exists to prevent

The point of the phase was that approvals must survive a retrain. Measured directly: **66/66 topic
ids carried across a retrain**, none dropped or duplicated. Then, end to end — approved topic 1327
with the human label "Great Food", forced a retrain through the admin API, and afterwards it was
still `approved`, still id 1327, still displaying "Great Food" while its *auto-generated* label had
independently drifted to "Delicious Cuisine".

That drift is the argument for the separate `approved_label` column rather than overwriting `label`:
21 of 66 auto-labels changed wording between two consecutive runs on identical data, purely from LLM
nondeterminism. A design that stored the approved text in `label` would have it silently overwritten.

### Security checks that were actually run

The gate was tested for rejection, not just acceptance:

| Request | Result |
|---|---|
| No token | 401 |
| Malformed token | 401 |
| **Forged `alg: none` token with a valid admin `sub`** | **401** |
| Valid signed token, non-allowlisted `sub` | 403 |
| Valid signed token, allowlisted `sub` | 200 |

The `alg: none` case is the one worth calling out — it is the classic JWT algorithm-confusion attack,
and it is rejected because `jwt.decode` is pinned to `algorithms=["HS256"]`. Optimistic concurrency
was also verified: approving with a stale `expectedComputedAt` returns 409 rather than writing a
label onto a cluster that changed underneath.

### Two bugs found by looking at the running UI

Neither would have surfaced from reading the code:

1. **Representative comments were duplicated** — the four centroid-closest comments were often the
   same sentence repeated. Cause: 22% of this corpus is duplicate text (35 separate reviews reading
   just "Super"), which is legitimate data, not a scraper fault. `sample_comments()` now returns
   distinct texts, so a reviewer sees four different examples.
2. **The dashboard over-reported badge coverage** — "places badged" counted every place appearing in
   an approved topic (37) rather than those clearing the badge thresholds (13). Fixed by extracting
   `badge_rules.qualifies_as_badge()` and having both the read path and the dashboard call it, so the
   rule has one definition rather than two that can drift.

### Deviations from the design

- **Tabs, not nested routes.** §9's IA proposed `/admin/topics/review` style paths. Implemented as a
  single `/admin` route with client-side tabs — same information architecture, less routing code, and
  no deep-link requirement exists yet.
- **Merge is API-only.** `POST /api/admin/topics/merge` works and is audited, but has no UI control
  yet; merging is currently a curl away rather than a click.
- **Dimension rename is API-only** for the same reason. Demote has a button.
- **No `expectedRevision` on reject/reopen**, only on approve. Rejection is not label-specific, so a
  concurrent retrain cannot make it wrong in the way it can for an approval.

### Operational note

`ADMIN_USER_IDS` is read at process start, so granting admin needs a container recreate, not just a
restart — §8 predicted this, and it is genuinely mildly annoying in practice. It also means the env
var must be present at container *creation*; a `docker restart` after editing compose silently keeps
the old value, which cost some confusion during the build.
