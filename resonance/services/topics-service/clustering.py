import math
import re
from collections import Counter, defaultdict

import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS
import hdbscan

model = SentenceTransformer("all-MiniLM-L6-v2")

STOPWORDS = set(ENGLISH_STOP_WORDS)

MIN_DOC_FREQUENCY_RATIO = 0.15

def tokenize(text: str) -> list[str]:
    words = re.findall(r"[a-zA-Z]+", text.lower())
    return [w for w in words if w not in STOPWORDS and len(w) > 2]

def embed_comments(comments: list[str]) -> np.ndarray:
    return model.encode(comments, normalize_embeddings=True)

def cluster_embeddings(embeddings: np.ndarray) -> np.ndarray:
    clusterer = hdbscan.HDBSCAN(min_cluster_size=5, metric="euclidean")
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
        member_idx = [i for i, lbl in enumerate(labels) if lbl == cluster_id]
        member_embeddings = embeddings[member_idx]
        centroid = member_embeddings.mean(axis=0)
        centroid = centroid / np.linalg.norm(centroid)
        similarities = member_embeddings @ centroid
        order = np.argsort(-similarities)[:top_n]
        result[cluster_id] = [comments[member_idx[i]] for i in order]

    return result

