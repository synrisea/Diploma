from transformers import pipeline

_classifier = pipeline("sentiment-analysis", model="distilbert-base-uncased-finetuned-sst-2-english")


def classify_sentiments(texts: list[str]) -> list[str]:
    """Classify each text as 'positive' or 'negative' (binary SST-2 model)."""
    if not texts:
        return []
    results = _classifier(texts, truncation=True, batch_size=32)
    return [r["label"].lower() for r in results]
