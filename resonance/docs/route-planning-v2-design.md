# Route Planning v2 — Diagnosis & Redesign

Status: **research + design, not implemented.** Written 2026-09-19. Goal set by the ask: make "Plan a route…" *flexible*, make it *adapt to the actual places*, and add *a second LLM verification call when warranted*.

All failures in §1 are reproduced against the live `topics-api` on 2026-09-19 (276 candidate places in the district bbox), not hypothesized.

## 0. TL;DR

The planner is a single LLM call that sees **only place names and categories** for **276 places at once**, and it degenerates into fuzzy string-matching on names. Measured: 4 of 4 realistic wishes returned substantially wrong results, and two trivially-answerable wishes ("a cafe", "somewhere for coffee please") returned **nothing at all** while 77 cafés sat in the candidate list.

The cause is not the model. Handed a 24-item shortlist instead of 276, the *same model with the same prompt on the same wish* went from returning a wedding dress shop to returning four real cafés.

The fix is a standard retrieve → rank → verify pipeline, and the retrieval stage needs no LLM at all — the embedding model needed for it is **already loaded in the same process**.

## 1. Measured failure modes

### 1.1 The headline results

| Wish | Returned | Verdict |
|---|---|---|
| "quiet cafe with good wifi where I can work for a few hours" | Promessa Wedding `[Clothing Shop]`, Dolma Restaurant `[Restaurant]` | **Zero cafés.** 77 were available |
| "coffee, then a bookshop, then dinner" | Promessa Wedding `[Clothing Shop]`, Mado `[Restaurant]`, Rast `[Restaurant]` | Wedding shop as the coffee stop; no bookshop |
| "somewhere to take my mum who uses a wheelchair" | 2 parks, Costa `[Café]`, Tortuga `[Pub]` | No accessibility reasoning possible — no such data in the prompt. A pub is a questionable read of "my mum" |
| "i want to buy socks" | Sevas Baku `[Jewelry Shop]` | Wrong category |
| **"a cafe"** | **(nothing)** | 77 cafés in the list |
| **"somewhere for coffee please"** | **(nothing)** | same |
| "coffee" | Coffee **Moffie** `[Café]`, Niyal `[Café]` | Matched the literal substring "Coffee" in a *name* |

### 1.2 Diagnosis: it is lexical matching, not semantic matching

The "coffee" row is the smoking gun. Of 276 candidates, 77 are `categoryName == "Café"` — sitting at indices 1, 2, 9, 10, 12, 13, 14… The model returned index 83 (`Coffee Moffie`) and index 260 (`Niyal`), skipping all 77.

`Coffee Moffie` contains the string "Coffee". That is what was matched.

I also checked and **ruled out positional bias** — the wrong answers aren't clustered at low indices (it returned #84 and #133 while cafés were at #1, #2, #9…). The model isn't anchoring on the start of the list; it genuinely isn't reasoning about the list at all.

### 1.3 Cause: candidate-set overload

Controlled test — identical model, prompt, and wish ("quiet cafe with good wifi where I can work for a few hours"), varying only candidate count:

| Candidate set | Result |
|---|---|
| 276 places (current production behavior) | Promessa Wedding `[Clothing Shop]`, Ormado Kaffeehaus `[Café]` |
| 24 places (cafés only) | Second Cup, Gazelli Cafe, Baristica, Tatell Baku — **all `[Café]`** |

~4,300 prompt tokens of undifferentiated list is past the point where a 3B Q4-quantized model can hold a selection task together, which matches the documented behavior of small quantized models on long-context selection. It is a *context* failure, not a capability failure.

### 1.4 Cause: semantic starvation

`itinerary.py:19-21` builds each candidate line as:

```python
f'{i + 1}. {c["name"]} ({c["categoryName"] or "place"})'
```

That is everything the model gets. It cannot know a café is quiet, has wifi, is good for working, is wheelchair-accessible, or is well-liked — because none of that is in the prompt.

The sharp irony: **topics-service itself computed exactly this data.** It has per-place topic clusters (`Peaceful Study`, `Coffee Quality`, `Noisy Seating`) and per-comment sentiment aggregated per place, sitting in the same SQLite file, in the same process, and the planner reads none of it. The wish "quiet cafe with good wifi" is nearly a keyword match against topic labels the service already generated.

### 1.5 Cause: abstention is the cheapest path

`prompts/plan_itinerary.md` instructs: *"If nothing in the list matches, return an empty array."* Combined with an overloaded context, returning `{"indices": []}` is the shortest, lowest-perplexity valid completion available. Hence "a cafe" → nothing.

There is no retry, no fallback, and no distinction between *"genuinely nothing matches"* (a valid answer for "i want to buy a submarine") and *"the model gave up"*. Both surface identically as `hasEmptyResult` in `RouteContext.tsx:56`.

### 1.6 Cause: no decomposition of multi-leg wishes

"coffee, then a bookshop, then dinner" is three retrieval problems with an ordering constraint. It's handed over as one undifferentiated string and the prompt asks the model to handle selection *and* sequencing *and* implicit-order detection simultaneously, in one pass, over 276 items.

### 1.7 No verification anywhere

`plan_itinerary` validates only that returned indices are integers in `1..N` and deduplicates them (`itinerary.py:41-47`). That's a solid anti-hallucination guard — it's genuinely doing its job, and the wedding-dress-shop result was a *legal* index. Structural validity was never the problem. Nothing checks whether the selection is any good.

## 2. Proposed architecture: retrieve → rank → verify

Four stages, of which only two and a half involve the LLM.

```
wish
 └─ Stage 0  decompose into legs            LLM call #1 (small in, small out)
 └─ Stage 1  embedding retrieval per leg    NO LLM — SentenceTransformer, already loaded
 └─ Stage 2  rank shortlist w/ rich cards   LLM call #2 (the real work, ~25 candidates)
 └─ Stage 3  verify + repair, conditional   LLM call #3 — only when §3's triggers fire
```

### Stage 0 — Decompose the wish

One cheap call converting free text into structured legs:

```json
{"legs": [
  {"intent": "coffee", "constraints": ["quiet", "wifi", "good for working"]},
  {"intent": "bookshop", "constraints": []}
]}
```

Handles §1.6 directly, and the constraints become the filter criteria in Stage 2. Single-leg wishes produce a one-element array and skip nothing.

Guard the output with a **GBNF grammar** (`llama-cpp-python` accepts `grammar=LlamaGrammar.from_string(...)`), which makes malformed JSON structurally impossible rather than caught-by-except as in `itinerary.py:35`. Worth applying to every LLM call in the service.

### Stage 1 — Embedding retrieval (no LLM)

For each leg, embed `intent + constraints` and cosine-rank all 276 places against a precomputed **place profile embedding**, built per place from:

- name + category
- its topic labels (weighted by local comment count — see `place-tags-design.md` §2B)
- a few representative comments

Take the top ~20-25 per leg. Profile embeddings recompute only on recluster, so the per-request cost is one query embedding and a dot product against a small matrix — sub-millisecond, no GPU contention with the LLM.

This is the stage that actually fixes §1.2 and §1.3: it is semantic by construction, it cannot miss 77 cafés, and it bounds what the LLM ever has to look at. `sentence_transformers` and the model are already imported in `clustering.py:11` — no new dependency.

### Stage 2 — Rank the shortlist with informative place cards

Replace the bare `name (category)` line with a card carrying the signals the model needs:

```
12. Baristica (Café)
    themes: Coffee Quality (+), Peaceful Study (+), Slow Service (−)
    sentiment: 0.72 positive across 31 comments
```

Same numbered-index contract and the same never-trust-raw-output validation as today (`itinerary.py:41-47` stays exactly as it is). ~25 candidates × ~30 tokens ≈ 750 tokens instead of 4,300 — well inside what the model handles reliably, as §1.3 demonstrates.

Fixes §1.4. Also makes "quiet", "good for working", and "wheelchair" answerable *if* the underlying data exists, which for accessibility it currently doesn't (see §5).

### Stage 3 — Conditional verification

Covered in §3 — this is the "second LLM call if necessary" part of the ask.

## 3. The verification pass, and when to trigger it

An unconditional second call doubles latency on every request, including the ones that were already fine. So: compute cheap signals first, and spend the second call only when they look bad. This is chain-of-verification, gated.

### Trigger conditions

Fire Stage 3 when **any** of these hold:

| Trigger | Rationale |
|---|---|
| Result is **empty** while Stage 1 found candidates above a similarity floor | Exactly the "a cafe" → nothing failure (§1.5). Retrieval knows 77 cafés matched; an empty answer is the model giving up, not a real negative |
| **Leg coverage incomplete** — a decomposed leg got no stop | "coffee, then a bookshop, then dinner" returning no bookshop (§1.6) |
| **Weak semantic agreement** — mean cosine between the wish embedding and the selected places' profile embeddings falls below a threshold | Catches the wedding-dress-shop class of error *without* an LLM. This is the key one: the same embeddings from Stage 1 score the answer for free |
| **Category contradiction** — a selected place's category is disjoint from every leg's retrieved category distribution | Cheap sanity check; catches "socks" → jewelry shop |
| Result is **suspiciously large** (say >8 stops) | Usually indicates the model listed indices rather than choosing |

The third trigger is doing the most work and costs one dot product. Most well-formed requests will skip Stage 3 entirely.

### What the verification call does

Give the model its own selection, the original wish, and the shortlist it chose from, and ask it to **critique and repair** rather than redo:

> For each selected place, state whether it satisfies the wish. Drop the ones that don't. If a leg has no stop, pick the best remaining candidate for it. Return the corrected index list.

Critique-and-repair is materially easier than generate-from-scratch and gives the model an explicit license to *remove* — which the current single-pass prompt never does, since its only failure mode is abstaining entirely.

Hard cap at one repair round. If the repaired answer still fails the checks, fall back to **Stage 1's top-ranked places per leg** — pure embedding retrieval, no LLM. That fallback is deterministic, always semantically on-topic, and strictly better than today's empty result.

### Honest answer distinguishing

After this, an empty result means retrieval found nothing above the similarity floor — a real "nothing here matches." That's a genuinely different message for the UI than today's ambiguous blank, and `RouteContext.tsx`'s `hasEmptyResult` can finally say something true ("nothing in this district matches that" vs. today's silence).

## 4. Latency budget

Measured on the current RTX 5070 setup: 142-452ms per warm planning call, ~3.6s cold (first call after container start — `llm.py:9-10` already warms up two throwaway completions to absorb this).

| Stage | Cost |
|---|---|
| 0 — decompose | ~150ms (short in, short out) |
| 1 — retrieval | <10ms (no LLM) |
| 2 — rank | ~200-300ms (smaller prompt than today's 4.3k) |
| 3 — verify | ~200ms, **only when triggered** |
| **Typical total** | **~400-500ms** |
| **Worst case (verify fires)** | **~700ms** |

Comparable to or better than today's single 452ms call, because Stage 2's prompt is ~5× smaller than the current one. The GPU work traded away on prompt length pays for the extra calls.

## 5. Data gaps this exposes

Stage 2 can only reason about what exists. Two wishes in §1.1 are unanswerable regardless of architecture:

- **Accessibility** ("wheelchair") — not in OSM import, not in comments, not derivable. Either import OSM's `wheelchair=*` tag (it exists for some POIs and the import pipeline already reads OSM) or accept that these wishes can't be served and say so rather than guessing.
- **Opening hours / "open now"** — not imported. "Dinner" implies evening availability and nothing can check it. OSM `opening_hours` is available and would make time-aware routing possible.

Both are places-service import work, independent of anything in this doc, and worth noting because no amount of LLM pipeline fixes them.

## 6. Evaluation

The planner currently has no test of any kind, which is why four-out-of-four failures went unnoticed. Minimum:

1. **A fixed wish set** — the seven in §1.1 plus a few more (multi-leg, impossible-request, single-word, non-English given the AZ/RU user base), with hand-labeled acceptable answers.
2. **Metrics per wish**: category correctness (did "cafe" return cafés), leg coverage (did every leg get a stop), non-abstention rate on answerable wishes, latency.
3. **Run it as a script** against the live service, same as the Playwright verification pattern used elsewhere in this project — not a unit test with a mocked model, since every failure in §1 is a real-model behavior that a mock would hide.

Record the current numbers first. §1.1 *is* the baseline: 0/4 correct on realistic wishes, 2 abstentions on trivial ones.

## 7. Deliberately not proposing

| Option | Why not |
|---|---|
| A bigger model (7B/14B) | §1.3 proves the 3B handles this fine on 24 candidates. Fix the context first; a bigger model over 276 undifferentiated names would still be doing the wrong task, just more expensively — and it costs VRAM on a machine already pinned to one GPU |
| A hosted API model (Claude/GPT) | Would work, but the whole service is deliberately local/offline (`PROGRESS.md`), and adds a per-request cost and a network dependency to a feature that currently runs in 450ms on-device. Revisit only if local quality plateaus below acceptable |
| Self-consistency (sample k times, vote) | 3-5× the calls for a modest gain, and it mitigates *variance* — the failures here are systematic, not noisy. Retrieval fixes more for less |
| Fine-tuning on wish→place pairs | No training data exists, and generating it synthetically would bake in the current model's mistakes. Reconsider only after §6 produces real labeled examples |
| Replacing the TSP ordering with LLM ordering | `routeOrdering.ts` is exact for ≤8 stops and deterministic. An LLM is strictly worse at geometry. Stage 0's leg order should constrain the sequence, then TSP orders within that — keep the split |

## 8. Open questions

- **Should leg order override geographic order?** "coffee, then a bookshop, then dinner" is an explicit sequence; `orderStopsFixedStart` currently re-sorts purely by distance and would happily put dinner first. Probably: legs constrain relative order, TSP optimizes within each leg. Needs deciding before Stage 0 ships or the decomposition is wasted.
- **What similarity floor counts as "nothing matches"?** Too low and every wish gets forced answers; too high and reasonable ones get dropped. Wants calibrating against §6's wish set.
- **How many stops should an unspecified wish return?** "somewhere for coffee" currently could return 1 or 77. A default cap (3-5) with the model allowed to return fewer is probably right, but it's a product decision, not a technical one.
- **Multilingual wishes** — the embedding model is multilingual (`paraphrase-multilingual-MiniLM-L12-v2`), but Qwen2.5-3B's Azerbaijani is weak and both prompts are English-only. Stage 1 would work in AZ/RU; Stages 0/2/3 likely degrade. Untested, and worth testing given the city.
