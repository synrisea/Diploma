import math
import os
import re
from collections import Counter, defaultdict

import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS
import hdbscan


model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")

RUSSIAN_STOP_WORDS = {
    "и", "в", "во", "не", "что", "он", "на", "я", "с", "со", "как", "а", "то", "все", "она",
    "так", "его", "но", "да", "ты", "к", "у", "же", "вы", "за", "бы", "по", "только", "ее",
    "мне", "было", "вот", "от", "меня", "еще", "нет", "о", "из", "ему", "теперь", "когда",
    "даже", "ну", "вдруг", "ли", "если", "уже", "или", "ни", "быть", "был", "него", "до",
    "вас", "нибудь", "опять", "уж", "вам", "ведь", "там", "потом", "себя", "ничего", "ей",
    "может", "они", "тут", "где", "есть", "надо", "ней", "для", "мы", "тебя", "их", "чем",
    "была", "сам", "чтоб", "без", "будто", "чего", "раз", "тоже", "себе", "под", "будет",
    "ж", "тогда", "кто", "этот", "того", "потому", "этого", "какой", "совсем", "ним",
    "здесь", "этом", "один", "почти", "мой", "тем", "чтобы", "нее", "были", "куда", "зачем",
    "всех", "никогда", "можно", "при", "наконец", "два", "об", "другой", "хоть", "после",
    "над", "больше", "тот", "через", "эти", "нас", "про", "всего", "них", "какая", "много",
    "разве", "три", "эту", "моя", "впрочем", "хорошо", "свою", "этой", "перед", "иногда",
    "лучше", "чуть", "том", "нельзя", "такой", "им", "более", "всегда", "конечно", "всю",
    "между", "это", "очень",
}
STOPWORDS = set(ENGLISH_STOP_WORDS) | RUSSIAN_STOP_WORDS

MIN_DOC_FREQUENCY_RATIO = 0.15

CONTENTLESS_WORDS = {
    "good", "nice", "great", "super", "awesome", "amazing", "excellent", "perfect",
    "wonderful", "fantastic", "lovely", "beautiful", "gorgeous", "cool", "fine",
    "okay", "alright", "best", "better", "love", "loved", "like", "liked", "enjoy",
    "enjoyed", "recommend", "recommended", "just", "really", "very", "quite",
    "pretty", "bad", "worst", "terrible", "awful", "poor", "disappointing",
    "place", "places", "spot", "venue", "thing", "things", "time", "way", "bit", "lot",
}


def first_meaningful_keyword(keywords: list[str]) -> str | None:
    """Fallback label source when every generated candidate is rejected. Skips pure
    sentiment words so the fallback can't reintroduce a label like "Terrible"."""
    return next((word for word in keywords if word not in CONTENTLESS_WORDS), None)


def is_contentless(keywords: list[str]) -> bool:
    """True when a cluster's keywords are pure sentiment with no subject - the LLM
    will happily invent a specific-sounding label ("Remarkable Service" for a cluster
    keyworded 'super, great, awesome'), which reads as a finding the data doesn't support."""
    return not keywords or all(word in CONTENTLESS_WORDS for word in keywords)

def tokenize(text: str) -> list[str]:
    words = re.findall(r"[^\W\d_]+", text.lower())
    return [w for w in words if w not in STOPWORDS and len(w) > 2]

def embed_comments(comments: list[str]) -> np.ndarray:
    return model.encode(comments, normalize_embeddings=True)

MIN_CLUSTER_SIZE = int(os.environ.get("MIN_CLUSTER_SIZE", "5"))
MIN_SAMPLES = int(os.environ.get("MIN_SAMPLES", "2"))

def cluster_embeddings(embeddings: np.ndarray) -> np.ndarray:
    clusterer = hdbscan.HDBSCAN(
        min_cluster_size=MIN_CLUSTER_SIZE,
        min_samples=MIN_SAMPLES,
        metric="euclidean",
        cluster_selection_method="leaf",
    )
    return clusterer.fit_predict(embeddings)

def label_clusters(comments: list[str], labels: np.ndarray, top_n : int = 5) -> dict[int, list[str]]:
    cluster_word_counts: dict[int, Counter] = defaultdict(Counter)
    cluster_word_totals: dict[int,int] = defaultdict(int)
    cluster_doc_counts: dict[int, int] = defaultdict(int)
    cluster_word_doc_freq: dict[int, Counter] = defaultdict(Counter)

    for comment, label in zip(comments,labels):
        if label == -1:
            continue
        words = tokenize(comment)
        cluster_word_counts[label].update(words)
        cluster_word_totals[label] += len(words)
        cluster_doc_counts[label] += 1
        cluster_word_doc_freq[label].update(set(words))

    term_totals_across_classes: Counter = Counter()
    for counts in cluster_word_counts.values():
        term_totals_across_classes.update(counts)

    avg_words_per_class = sum(cluster_word_totals.values()) / max(len(cluster_word_totals), 1)

    result: dict[int, list[str]] = {}
    for label, counts in cluster_word_counts.items():
        doc_count = cluster_doc_counts[label]

        def score_terms(candidates):
            scores = {}
            for term in candidates:
                tf = counts[term]
                weighted_tf = tf / max(cluster_word_totals[label], 1)
                idf = math.log(1 + avg_words_per_class / term_totals_across_classes[term])
                scores[term] = weighted_tf * idf
            return scores

        frequent_terms = [
            term for term in counts
            if cluster_word_doc_freq[label][term] / doc_count >= MIN_DOC_FREQUENCY_RATIO
        ]
        
        candidates = frequent_terms if frequent_terms else list(counts)

        scores = score_terms(candidates)
        result[label] = sorted(scores, key=scores.get, reverse=True)[:top_n]

    return result

def sample_comments(comments: list[str], embeddings: np.ndarray, labels: np.ndarray, top_n: int = 4) -> dict[int, list[str]]:
    """For each cluster, return the comments closest to the cluster's centroid
    (embeddings are normalize_embeddings=True, so cosine similarity = dot product)."""
    result: dict[int, list[str]] = {}
    for cluster_id in set(labels):
        if cluster_id == -1:
            continue
        member_idx = np.where(labels == cluster_id)[0]
        member_embeddings = embeddings[member_idx]
        centroid = member_embeddings.mean(axis=0)
        centroid = centroid / np.linalg.norm(centroid)
        similarities = member_embeddings @ centroid
        order = np.argsort(-similarities)[:top_n]
        result[cluster_id] = [comments[member_idx[i]] for i in order]

    return result

def cluster_centroids(embeddings: np.ndarray, labels: np.ndarray) -> dict[int, np.ndarray]:
    """Normalized centroid (mean embedding) per cluster, used to match a cluster
    against previously-promoted dimensions across retrains."""

    result: dict[int, np.ndarray] = {}

    for cluster_id in set(labels):
        if cluster_id == -1:
            continue
        member_embeddings = embeddings[labels == cluster_id]
        centroid = member_embeddings.mean(axis=0)
        result[cluster_id] = centroid / np.linalg.norm(centroid)
    return result

