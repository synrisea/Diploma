import json
from pathlib import Path

from llama_cpp import Llama

MODEL_PATH = Path(__file__).parent / "models" / "qwen2.5-3b-instruct-q4_k_m.gguf"
llm = Llama(model_path=str(MODEL_PATH), n_ctx=1024, verbose=False)

PROMPT_TEMPLATE = (Path(__file__).parent / "prompts" / "refine_label.md").read_text()

MAX_LABEL_WORDS = 4


def refine_label(keywords: list[str], sample_comments: list[str] | None = None) -> str | None:
    """Ask a small local LLM to turn a cluster's top keywords (plus a few real
    comments from the cluster, for context keywords alone lose) into a short,
    human-readable category label. Returns None if the model can't produce
    something usable, so the caller can fall back to a raw keyword."""
    if not keywords:
        return None

    comments_block = "\n".join(f'- "{c}"' for c in (sample_comments or [])) or "(none)"
    prompt = (
        PROMPT_TEMPLATE
        .replace("{keywords}", ", ".join(keywords))
        .replace("{comments}", comments_block)
    )

    try:
        result = llm.create_chat_completion(
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200,
            temperature=0.2,
        )
        raw = result["choices"][0]["message"]["content"]
        parsed = json.loads(raw[raw.index("{"): raw.rindex("}") + 1])
        labels = [l.strip() for l in parsed.get("labels", []) if isinstance(l, str) and l.strip()]
    except Exception:
        return None

    for label in labels:
        if len(label.split()) <= MAX_LABEL_WORDS:
            return label

    return None
