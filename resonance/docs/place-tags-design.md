# Place Tags (Topic Badges) — Diagnosis & Redesign

Status: **§2 A-F implemented 2026-09-21.** Written 2026-09-19 after the observation that place tags "feel a bit awkward." They do, and this doc is the evidence for *why*, plus a change list ordered by impact-per-effort.

Everything in §1 is measured against the live `topics.db` in `resonance-topics-api` as of 2026-09-19 (2,859 comments, 122 clusters), not estimated. Results and corrections from the build are in §6.

## 0. TL;DR

The tag pipeline is doing three separate jobs badly at once:

1. **Clustering is over-fragmented** — 122 clusters for ~2,859 comments, median cluster size 5.
2. **Badge selection uses membership, not relevance** — *one* comment from a place puts a full badge on that place, so places show up to 10 badges built on 14 comments.
3. **Labels are generated once, unvalidated, and mostly thrown away** — the LLM is asked for 5-10 labels per cluster and exactly one is kept, with no dedupe, no polarity check, no quality gate.

None of these need a bigger model or new infrastructure. The single highest-value change (§2A, a relevance threshold) is roughly ten lines and removes most of the visible weirdness.

## 1. Measured failure modes

### 1.1 Over-fragmentation

`clustering.py:41` runs HDBSCAN with `min_cluster_size=3, cluster_selection_method="leaf"`. Leaf selection deliberately picks the *finest* clusters in the condensed tree; combined with a floor of 3, it maximizes fragmentation.

| Metric | Value |
|---|---|
| Total clusters | 122 |
| Distinct labels | 109 |
| Clusters with ≤5 comments | **82 of 122 (67%)** |
| Median cluster size | 5 |
| Max cluster size | 37 |

A 3-comment cluster is not a topic. It is three people who happened to phrase something similarly, and it produces a badge with exactly as much visual weight as a genuine 37-comment theme.

### 1.2 Badges are a membership test, not a relevance test

`main.py:58-72` (`topics_for_place`) returns every topic whose `place_ids` array contains the place. `place_ids` is built in `pipeline.py:120` as the set of *any* place with *at least one* comment in that cluster. There is no threshold, no weighting, no cap.

Measured consequence:

| Place | Badges shown | Comments that place actually has |
|---|---|---|
| `09cc8ecd…` | 10 | 14 |
| `615dc7b6…` | 10 | 15 |
| `ce84c02f…` | 10 | 12 |
| `d1d3f9a2…` | 9 | 11 |

Roughly one badge per 1.3 comments. The badges stop being a summary and become a restatement of the comment list.

### 1.3 The number on the badge is the wrong number

`TopicBadges.tsx:53` renders `topic.commentCount`, which `main.py:66` populates with the **global** cluster size — not how many of *this place's* comments are in it. So a place where one person mentioned milk shows `Lactose Confusion · 4`, implying four local comments about lactose. There are not four.

This is the most directly misleading element on the panel, and it is a two-line fix (§2B).

### 1.4 Real badge set from one real place

Place `09cc8ecd…`, all ten badges, verbatim:

> Lactose Confusion · 4 · Rude Service · 8 · Chai Heaven · 5 · Voltage Chiller · 5 · Coffee Quality · 5 · Noisy Seating · 4 · Relaxed Ambiance · 6 · Peaceful Study · 6 · Tasty Desserts · 4 · Well-Mannered Staff · 7

Three distinct problems visible in one screenshot's worth of UI:

- **Nonsense labels**: `Voltage Chiller`, `Lactose Confusion`, `Chai Heaven`. The 3B model is writing copy, not categorizing.
- **Direct contradictions displayed side by side**: `Rude Service` next to `Well-Mannered Staff`; `Noisy Seating` next to `Peaceful Study` and `Relaxed Ambiance`.
- **Redundancy**: `Relaxed Ambiance` and `Peaceful Study` are the same claim.

The contradictions aren't necessarily *wrong* (service quality genuinely varies), but presented as flat equal-weight chips with no polarity or volume encoding, they read as the system being confused rather than as the place being inconsistent.

### 1.5 No semantic dedupe; the frontend is papering over it

Eight labels are used by more than one cluster:

```
4x  Friendly Staff      3x  Slow Service      3x  Poor Service
3x  Rude Staff          2x  Excellent Experience
2x  Cozy Coffee         2x  Quick Service     2x  Delicious Food
```

`TopicBadges.tsx:17-34` (`dedupeTopics`) merges these client-side by lowercased exact string match. That is a band-aid on a backend problem, and it only catches *identical strings* — `Poor Service` / `Slow Service` / `Rude Staff` are three separate near-synonymous clusters that survive it and can all land on the same place.

Note the backend already has the machinery to fix this properly: `cluster_centroids()` exists and dimension promotion already does cosine matching at `DIMENSION_SIMILARITY_THRESHOLD = 0.85` (`pipeline.py:140-146`). Topics just never got the same treatment.

### 1.6 Most of the generated label signal is discarded

`prompts/refine_label.md` ends with "Generate 5-10 high-level labels." `labeling.py:38-42` then returns **the first label that is ≤4 words** and drops the rest.

So per cluster we pay a full LLM inference for 5-10 candidates and keep one, chosen by word count rather than quality — not by fit to the sample comments, not by distinctness from other clusters' labels, not by polarity agreement. `Voltage Chiller` is almost certainly the first ≤4-word item in a list that also contained something sane.

### 1.7 Topic identity is unstable across retrains

`pipeline.py:118` does `DELETE FROM topics` then re-inserts on every recluster. Topic rows get fresh autoincrement ids and no cross-run matching, so a place's badge set can change wholesale every time the corpus grows by 100 comments. Dimensions are protected from this (centroid matching, `times_matched`), topics are not.

Consequence: badges can't be linked to, cached, filtered on, or referenced from anywhere else in the app, because nothing about a topic is durable.

## 2. Proposed changes

Ordered by visible-improvement-per-hour. A and B alone address most of §1's symptoms.

### A. Relevance threshold + rank + cap on badge selection — *highest value, lowest effort*

Replace the membership test in `topics_for_place` with a relevance rule. Store per-place counts (see B), then a topic is shown for a place only if it clears **both**:

- `local_count >= 2` (a theme is not a theme on one mention), **and**
- `local_count / place_total_comments >= 0.15` (it is a meaningful share of what people said about *this* place)

then rank by `local_count` and cap at **5 badges**. Cap and thresholds belong in env vars (`BADGE_MIN_LOCAL_COUNT`, `BADGE_MIN_LOCAL_RATIO`, `BADGE_MAX_PER_PLACE`) so they're tunable without a redeploy, matching how the pipeline already handles its other thresholds.

Projected effect on the §1.4 example: 10 badges → 2-4, all backed by at least two local comments.

### B. Store and return per-place counts

`pipeline.py:122` already computes `place_counts = Counter(...)` — it is used for dimensions and thrown away for topics. Persist it on the `topics` row too, return `localCommentCount` alongside the global one, and have `TopicBadges.tsx` render the local number.

This is the fix for §1.3 and it is the prerequisite for A.

### C. Coarsen the clustering

Two changes to `cluster_embeddings` (`clustering.py:41`):

- `cluster_selection_method="leaf"` → `"eom"` (excess of mass). EOM selects the most *persistent* clusters rather than the finest ones, which is the standard choice when you want topics rather than micro-variants.
- `min_cluster_size=3` → `8-10`, scaled to corpus size rather than fixed. At ~2,900 comments a floor of 3 means 0.1% of the corpus is a "topic."

Expect the cluster count to drop from 122 to roughly 30-50, with the long tail of 3-5 comment clusters absorbed into the parent themes or into noise (`-1`), which the pipeline already discards correctly.

This should be tuned empirically against a held-out sample (§4), not set once by guess — but almost any value in that range is better than the current one.

### D. Server-side semantic dedupe at write time

Before inserting a topic, compare its centroid against already-inserted topics from the same run. On cosine ≥ ~0.82, merge instead of inserting: union the keywords, sum the counts, union the `place_ids`/`place_counts`, keep the label from whichever had more comments.

This is the same operation `pipeline.py:140-146` already performs for dimensions, applied one level earlier, and it deletes the need for `dedupeTopics` in the frontend entirely — including the near-synonym cases exact-string matching can never catch.

### E. Treat label generation as selection, not first-hit

Keep asking for 5-10 candidates, then actually use them:

1. Embed all candidate labels with the SentenceTransformer that's already loaded.
2. Drop any candidate whose cosine to an *already-assigned* label is ≥0.9 (prevents the `Friendly Staff` ×4 case at the source).
3. Among the survivors, pick the one with the **highest cosine to the cluster centroid** — i.e. the label that best describes the comments it's labeling, rather than the first one under a word limit.
4. Keep the existing raw-keyword fallback.

This reuses infrastructure already in the process and costs no extra LLM inference. It directly targets §1.6 and, indirectly, the `Voltage Chiller` class of nonsense — a meaningless label embeds far from its own cluster centroid.

**Optionally** add a cheap validation pass: constrain generation with a **GBNF grammar** (llama.cpp supports this natively via `llama-cpp-python`'s `grammar=` parameter) so the model cannot emit malformed JSON at all. `labeling.py:31-36` and `itinerary.py:35` both currently do substring-hunting for `{`…`}` inside a try/except — a grammar makes that class of failure structurally impossible rather than caught-and-swallowed.

### F. Show polarity, since we already compute it

Per-comment sentiment already exists (`comments.sentiment`, classified in `pipeline.py:60-76`) and `aggregate_sentiment()` already knows how to roll it up with the negative-weighting rule. Topics don't expose it; dimensions do.

Add `sentiment` to the topics table and the place-topics response, then render it: negative themes in the existing `sentiment-negative` token, positive in the positive token, mixed in neutral stone. `Rude Service` and `Well-Mannered Staff` sitting next to each other stops looking like a bug the moment one is visibly a complaint and the other visibly praise.

Zero new computation — purely plumbing data that already exists to a place it isn't.

### G. Stable topic identity across retrains

Give topics the treatment dimensions already get: match this run's clusters to the previous run's by centroid cosine, carry the id forward on a match, and only insert genuinely new ones. Replaces the `DELETE FROM topics` wholesale rebuild.

Lower urgency than A-F (it fixes nothing currently visible), but it's the prerequisite for anything that wants to *reference* a topic — clickable badges that filter the map, "trending themes" (already on the roadmap in `PROGRESS.md`), or per-topic pages.

### H. Optional: fixed taxonomy overlay

Longer-term, if freeform labels stay noisy: keep the discovered clusters as the substrate, but map each one (by centroid cosine against a handful of anchor phrases) onto a small fixed taxonomy — *Atmosphere, Service, Food & Drink, Price, Noise, Wifi, Safety, Accessibility*. Show the taxonomy term as the badge, the discovered label as the tooltip.

Tradeoff, stated plainly: this reintroduces a fixed vocabulary, which is exactly what the project deliberately rejected for feedback categories (see `PROGRESS.md`, "Feedback has no fixed categories"). The distinction is that discovery still drives what *exists* — the taxonomy only governs *display*. Worth doing only if A-F prove insufficient; listed here so the option is on record, not as a recommendation.

## 3. Evaluation — how to know any of this worked

The current pipeline has no measurable notion of quality, which is why it drifted here. Minimum viable evaluation:

1. **Fixed sample**: pick 20 places spanning the comment-count range. Snapshot their badge sets before and after.
2. **Headline metric**: median badges per place, and share of badges backed by ≥2 local comments (currently: unmeasured, and near-zero respectively).
3. **Label sanity**: hand-rate the 30-50 post-change cluster labels on a 3-point scale (sensible / vague / nonsense). A one-off 20-minute pass, but it turns `Voltage Chiller` from an anecdote into a tracked number.
4. **Contradiction check**: count places showing both a positive and negative badge about the same aspect. Should approach zero once §2F makes polarity explicit and §2D merges near-synonyms.

Worth recording the before-numbers *now*, since the current state is the baseline and it stops being observable the moment the pipeline changes.

## 4. Deliberately not proposing

| Option | Why not |
|---|---|
| A bigger labeling model (7B+) | The labels aren't bad because 3B is too small — they're bad because 5-10 candidates get filtered by word count (§1.6) and clusters are too small to have a coherent theme (§1.1). Fix the selection and the granularity first; re-evaluate model size only if labels are still poor. |
| Per-place clustering instead of global | Most places have 5-20 comments — far too few to cluster meaningfully on their own. Global clustering with local relevance filtering (§2A) gets the benefit without the sparsity problem. |
| A user-facing tag curation UI (merge/hide/rename) | Real fix for a real problem, but it's a moderation surface, and this project has deliberately stayed off moderation (`PROGRESS.md`). Also premature: automated dedupe (§2D) should be tried before hand-curation. |
| Re-embedding with a larger sentence-transformer | `paraphrase-multilingual-MiniLM-L12-v2` is a reasonable multilingual choice for a bilingual (AZ/RU/EN) corpus and isn't the bottleneck. Revisit after clustering granularity is fixed. |

## 5. Open questions

- **What's the right `min_cluster_size` as the corpus grows?** A fixed value will drift. Scaling it (e.g. `max(8, round(0.004 × n_comments))`) keeps behavior stable as comments accumulate, but wants validating against the §3 sample at two or three corpus sizes.
- **Should a place with very few comments show badges at all?** A 4-comment place can satisfy §2A's ratio rule trivially (1 comment = 25%). An absolute floor (`local_count >= 2`) covers it, but a "too early to summarize" empty state may be more honest than two thin badges.
- **Do badges need to be clickable?** They read as interactive (pill-shaped, colored) and aren't. Either make them filter the map (needs §2G's stable ids) or visually de-emphasize them toward plain labels. Current middle ground is the worst of both.

## 6. Implementation notes (2026-09-21)

§2 A-F shipped. G (stable ids) and H (taxonomy overlay) deliberately left undone.

### Results

Measured with `eval_tags.py`, which hits the real HTTP endpoint so before/after stay comparable. Corpus had grown to 3,825 comments / 362 places by build time.

| Metric | Before | After |
|---|---|---|
| Clusters | 122 | **66** |
| Duplicate labels | 13 | **0** |
| Clusters ≤5 comments | 82 (67%) | **0** |
| Badges backed by ≥2 of the place's own comments | ~0 by construction | **100%** |
| Places with ≥1 badge | 229/362 (63%) | 128/362 (35%) |

Shipped config: `leaf`, `min_cluster_size=5`, `min_samples=2`, merge at 0.82, badge threshold ≥2 local
comments and ≥15% of the place's clustered comments, capped at 5 per place.

The coverage drop from 63% → 35% of places is the intended trade, not a regression: a badge now means
"≥2 of this place's comments, ≥15% of its categorizable ones," and thin places genuinely don't clear
that. §5's open question ("should a thin place show badges at all?") is answered **no**.

Label quality improved in two steps beyond the original plan, both added after reviewing the full
cluster list by hand:

- **Contentless-cluster filtering.** Clusters whose keywords are entirely sentiment words (`super,
  great, awesome` → "Remarkable Service"; `good` → "Good Service") were being given specific-sounding
  labels describing findings the data didn't support. These are now dropped before labelling. Killed
  six junk clusters, including two that were the same theme under different names.
- **Label-must-match-keywords.** A candidate is rejected unless it has ≥0.4 cosine to at least one of
  the cluster's own keywords. This caught the worst mislabel — a cluster keyworded `rude, waiter,
  speaking` had been labelled `Noisy Restaurant`, and became `Rude Service`. It also fixed a polarity
  inversion: `plant, playlist, loud, tiring` was labelled `Quiet Playlists` (positive), and became
  `Plants & Music`. A cosine floor against the *centroid* would not have caught either, since
  embeddings place antonyms close together; matching against keywords is what made it work.
  Fallback labels also skip sentiment words now, so a rejection can't reintroduce `Terrible`.

### Granularity is a coverage/specificity trade, not a quality one

`min_samples` was swept separately after the above. HDBSCAN leaves most of this corpus unclustered
regardless of settings (~13-22%), which turned out to be the real cap on badge coverage — not the
badge thresholds.

| `min_samples` | Clusters | Places badged | Character of the labels |
|---|---|---|---|
| 5 (default) | 26 | 20% | Generic — `Great Coffee` spanning 43 places |
| **2 (shipped)** | **66** | **35%** | Specific — `Live Music`, `Board Games`, `Second-Hand Books`, `Kebab Specialties`, `Rushed Orders`, `No Card Acceptance` |

Finer granularity is better here because a badge's value is in distinguishing one place from another,
and it separates negative themes that otherwise collapse together. The cost is a junk tail —
`Voltage Chiller` returns at n=5, along with `Thank You` and `Quality Items` — plus surviving
near-duplicates like `Rude Service` / `Rude Staff` that the 0.82 merge doesn't catch.

That cost is accepted **because label review is being built** (`admin-panel-design.md`): 66 clusters
is a one-off ~15 minute queue, and rejecting `Voltage Chiller` and merging `Rude Service`/`Rude Staff`
is precisely what a human reviewer is for. Without that queue, 26 blander clusters would be the safer
default — `MIN_SAMPLES` is an env var, so this is one line in `docker-compose.yml` to reverse.

### Two recommendations in this doc were wrong

Recorded because the reasoning, not just the outcome, was off:

1. **§2C blamed `cluster_selection_method="leaf"` and recommended `eom`. Wrong.** Swept both across `min_cluster_size` 3-15 (`tune_clustering.py`, kept for re-tuning). `min_cluster_size` is the real lever — at 3 it gave 130 clusters, at 5 it gave 44, and the method barely mattered. `eom` was actively worse at larger floors: it produced catch-all blobs (one cluster of 332 comments keyworded "coffee, baku, food, great, service"). Shipped config is **`leaf` with `min_cluster_size=5`** — the method change was reverted, only the floor moved. First attempt deployed `eom` + a corpus-scaled floor of 15 and collapsed the whole corpus into **4** clusters.

2. **§2A's ratio used the wrong denominator.** "`local_count / place_total_comments >= 0.15`" looks right but HDBSCAN leaves ~85% of comments as noise, so dividing by *all* of a place's comments meant even the most-reviewed place in the dataset (27 comments) cleared no threshold and showed **zero** badges. Corrected to divide by the place's **clustered** comments. Same thresholds, and the top-commented places went from nothing to sensible single badges.

Also worth noting: the corpus-scaled `min_cluster_size` from §5's open question was tried and removed. A fixed value with an env override plus `tune_clustering.py` for re-tuning is more honest than a scaling ratio calibrated at one corpus size.

### Not done, and still worth doing

- **The merge threshold (0.82) is loose.** `Rude Service` and `Rude Staff` survive as separate clusters. Tightening it risks over-merging genuinely distinct themes; manual merge in the admin panel is the cheaper answer than another threshold guess.
- **A junk tail persists** at n=5 (`Voltage Chiller`, `Thank You`, `Quality Items`). The contentless filter catches pure-sentiment clusters but not ones with real-but-meaningless keywords. Human rejection is the intended remedy rather than a longer word list.
- **GBNF-constrained JSON** (mentioned in §2E) was skipped. Both LLM call sites still substring-hunt for `{`…`}` inside a try/except. Low risk to add, just not done here.
- **§2G (stable topic ids)** — unchanged, still a `DELETE FROM topics` rebuild per run. Now a hard blocker rather than a nice-to-have: it is phase 0 of `admin-panel-design.md`, because approvals keyed to autoincrement ids would not survive a retrain.
