import json
from pathlib import Path

from llm import llm

PROMPT_TEMPLATE = (Path(__file__).parent / "prompts" / "plan_itinerary.md").read_text()


def plan_itinerary(wish: str, candidates: list[dict]) -> list[str]:
    """Ask the LLM to pick, from `candidates` (each {'id', 'name', 'categoryName'}),
    the ones that satisfy `wish`, in a sensible order. Candidates are numbered 1..N
    in the prompt and the model returns indices rather than ids, since asking a small
    local model to echo a UUID back verbatim invites transcription errors. Returns a
    list of place ids that is ALWAYS a subset of the input candidate ids, in order,
    deduplicated - the model's raw output is never trusted or passed through unchecked."""
    if not wish.strip() or not candidates:
        return []

    candidates_block = "\n".join(
        f'{i + 1}. {c["name"]} ({c["categoryName"] or "place"})' for i, c in enumerate(candidates)
    )
    prompt = (
        PROMPT_TEMPLATE
        .replace("{candidates}", candidates_block)
        .replace("{wish}", wish.strip())
    )

    try:
        result = llm.create_chat_completion(
            messages=[{"role": "user", "content": prompt}],
            max_tokens=300,
            temperature=0.1,
        )
        raw = result["choices"][0]["message"]["content"]
        parsed = json.loads(raw[raw.index("{"): raw.rindex("}") + 1])
        raw_indices = [i for i in parsed.get("indices", []) if isinstance(i, int)]
    except Exception as exc:
        print(f"plan_itinerary: LLM call/parse failed ({len(candidates)} candidates): {exc!r}")
        return []

    seen = set()
    matched = []
    for index in raw_indices:
        if 1 <= index <= len(candidates) and index not in seen:
            matched.append(candidates[index - 1]["id"])
            seen.add(index)
    return matched
