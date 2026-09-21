import json
import os
from pathlib import Path

import numpy as np

from db import get_connection
from llm import llm
from place_profiles import profile_matrix, retrieve

PROMPTS = Path(__file__).parent / "prompts"
DECOMPOSE_PROMPT = (PROMPTS / "decompose_wish.md").read_text()
RANK_PROMPT = (PROMPTS / "rank_places.md").read_text()
VERIFY_PROMPT = (PROMPTS / "verify_plan.md").read_text()

SHORTLIST_SIZE = int(os.environ.get("ITINERARY_SHORTLIST_SIZE", "25"))
MAX_PER_LEG = int(os.environ.get("ITINERARY_MAX_PER_LEG", "4"))
MAX_LEGS = int(os.environ.get("ITINERARY_MAX_LEGS", "5"))
RETRIEVAL_FLOOR = float(os.environ.get("ITINERARY_RETRIEVAL_FLOOR", "0.45"))
AGREEMENT_FLOOR = float(os.environ.get("ITINERARY_AGREEMENT_FLOOR", "0.3"))


def _complete(prompt: str, max_tokens: int) -> str | None:
    try:
        result = llm.create_chat_completion(
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens,
            temperature=0.1,
        )
        return result["choices"][0]["message"]["content"]
    except Exception as exc:
        print(f"itinerary: LLM call failed: {exc!r}")
        return None


def _parse_json(raw: str | None) -> dict:
    if not raw:
        return {}
    try:
        return json.loads(raw[raw.index("{"): raw.rindex("}") + 1])
    except Exception:
        return {}


def decompose(wish: str) -> list[dict]:
    """Split a wish into ordered legs. Falls back to treating the whole wish as one
    leg, which is what the previous single-call design always did."""
    parsed = _parse_json(_complete(DECOMPOSE_PROMPT.replace("{wish}", wish.strip()), 200))
    legs = []

    for leg in parsed.get("legs", [])[:MAX_LEGS]:
        if not isinstance(leg, dict):
            continue
        intent = str(leg.get("intent", "")).strip()
        if not intent:
            continue
        constraints = [str(c).strip() for c in leg.get("constraints", []) if str(c).strip()]
        legs.append({"intent": intent, "constraints": constraints})

    return legs or [{"intent": wish.strip(), "constraints": []}]


def _place_cards(place_ids: list[str], catalog: dict[str, dict], topics: dict[str, list[tuple[str, str]]]) -> str:
    lines = []
    for index, place_id in enumerate(place_ids, 1):
        place = catalog[place_id]
        line = f'{index}. {place["name"]} ({place.get("categoryName") or "place"})'
        access = place.get("wheelchair")
        if access:
            line += f"
   wheelchair: {access}"
        hours = place.get("openingHours")
        if hours:
            line += f"
   hours: {hours[:60]}"
        themes = topics.get(place_id, [])
        if themes:
            rendered = ", ".join(
                f"{label} ({'-' if sentiment == 'negative' else '+'})" for label, sentiment in themes[:4]
            )
            line += f"\n   themes: {rendered}"
        lines.append(line)
    return "\n".join(lines)


def _topics_by_place() -> dict[str, list[tuple[str, str]]]:
    by_place: dict[str, list[tuple[str, str, int]]] = {}
    with get_connection() as conn:
        rows = conn.execute("SELECT label, sentiment, place_counts FROM topics").fetchall()

    for row in rows:
        for place_id, count in json.loads(row["place_counts"]).items():
            by_place.setdefault(place_id, []).append((row["label"], row["sentiment"], count))

    return {
        place_id: [(label, sentiment) for label, sentiment, _ in sorted(entries, key=lambda x: -x[2])]
        for place_id, entries in by_place.items()
    }


def _per_leg_cap(leg_count: int) -> int:
    """A single-stop wish can show a few options; a multi-stop one is an itinerary,
    where four suggestions per leg reads as "visit all twelve"."""
    return MAX_PER_LEG if leg_count == 1 else 2


def _indices_to_ids(raw: dict, shortlist: list[str], cap: int) -> list[str]:
    seen = set()
    chosen = []
    for index in raw.get("indices", []):
        if isinstance(index, int) and 1 <= index <= len(shortlist) and index not in seen:
            seen.add(index)
            chosen.append(shortlist[index - 1])
    return chosen[:cap]


def _rank(leg: dict, shortlist: list[str], cards: str, cap: int) -> list[str]:
    prompt = (
        RANK_PROMPT
        .replace("{intent}", leg["intent"])
        .replace("{constraints}", ", ".join(leg["constraints"]) or "none")
        .replace("{candidates}", cards)
        .replace("{max_results}", str(cap))
    )
    return _indices_to_ids(_parse_json(_complete(prompt, 200)), shortlist, cap)


def _verify(leg: dict, selected: list[str], shortlist: list[str], cards: str, catalog: dict, cap: int) -> list[str]:
    rendered = "\n".join(f'- {catalog[pid]["name"]}' for pid in selected) or "(nothing selected)"
    prompt = (
        VERIFY_PROMPT
        .replace("{intent}", leg["intent"])
        .replace("{constraints}", ", ".join(leg["constraints"]) or "none")
        .replace("{selected}", rendered)
        .replace("{candidates}", cards)
        .replace("{max_results}", str(cap))
    )
    return _indices_to_ids(_parse_json(_complete(prompt, 200)), shortlist, cap)


def _needs_verification(selected: list[str], retrieved: list[tuple[str, float]], scores: dict[str, float]) -> bool:
    """Cheap signals that the ranking call went wrong, computed from embeddings that
    were needed for retrieval anyway. Verification is skipped when these look fine."""
    if not retrieved:
        return False
    if not selected:
        return True
    agreement = float(np.mean([scores.get(pid, 0.0) for pid in selected]))
    return agreement < AGREEMENT_FLOOR


def plan_itinerary(wish: str, candidates: list[dict]) -> list[str]:
    """Retrieve a shortlist per leg by embedding similarity, rank it with the LLM,
    and re-check only when cheap signals suggest the ranking is wrong. Always returns
    a subset of the candidate ids, in leg order, deduplicated."""
    if not wish.strip() or not candidates:
        return []

    catalog = {c["id"]: c for c in candidates}
    place_ids, matrix = profile_matrix(candidates)
    topics = _topics_by_place()

    legs = decompose(wish)
    cap = _per_leg_cap(len(legs))

    ordered: list[str] = []
    for leg in legs:
        query = ", ".join([leg["intent"], *leg["constraints"]])
        retrieved = retrieve(query, place_ids, matrix, SHORTLIST_SIZE)
        if not retrieved or retrieved[0][1] < RETRIEVAL_FLOOR:
            continue

        shortlist = [pid for pid, _ in retrieved]
        scores = dict(retrieved)
        cards = _place_cards(shortlist, catalog, topics)

        selected = _rank(leg, shortlist, cards, cap)
        if _needs_verification(selected, retrieved, scores):
            repaired = _verify(leg, selected, shortlist, cards, catalog, cap)
            selected = repaired or selected or [shortlist[0]]

        for place_id in selected:
            if place_id not in ordered:
                ordered.append(place_id)

    return ordered
