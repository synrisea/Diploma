import json
from pathlib import Path

from llm import llm

PROMPT_TEMPLATE = (Path(__file__).parent / "prompts" / "classify_sentiment.md").read_text()

BATCH_SIZE = 4
VALID_LABELS = {"positive", "negative", "mixed"}


def classify_sentiments(texts: list[str]) -> list[str]:
    """Classify each text as 'positive', 'negative', or 'mixed' using the
    local LLM, batched to keep call count manageable. distilbert-sst2 was
    tried first (fast, batched forward pass) but reliably misclassified
    negated praise like "quiet enough to hold a conversation without raising
    your voice" as negative - a known weak point for small classifiers.
    The LLM handles negation correctly; batching keeps a full backfill to a
    few minutes instead of the ~1hr+ it'd take one comment per call."""
    if not texts:
        return []

    results: list[str] = []
    for start in range(0, len(texts), BATCH_SIZE):
        results.extend(_classify_batch(texts[start:start + BATCH_SIZE]))
    return results


def _classify_batch(batch: list[str]) -> list[str]:
    numbered = "\n".join(f"{i + 1}. {text}" for i, text in enumerate(batch))
    prompt = PROMPT_TEMPLATE.replace("{comments}", numbered)

    try:
        result = llm.create_chat_completion(
            messages=[{"role": "user", "content": prompt}],
            max_tokens=20 * len(batch),
            temperature=0.0,
        )
        raw = result["choices"][0]["message"]["content"]
        parsed = json.loads(raw[raw.index("["): raw.rindex("]") + 1])
        labels = [str(label).strip().lower() for label in parsed]
    except Exception:
        labels = []

    # Pad/validate to exactly match input length so one bad response can't
    # desync sentiment values from comment ids in the caller's zip().
    return [labels[i] if i < len(labels) and labels[i] in VALID_LABELS else "mixed" for i in range(len(batch))]
