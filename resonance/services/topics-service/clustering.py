import math
import re
from collections import Counter, defaultdict

import numpy as np
from sentence_transformers import SentenceTransformer
import hdbscan

model = SentenceTransformer("all-MiniLM-L6-v2")

STOPWORDS = set("""a an the and or but if then else for to of in on at by with is are was were be been being
this that these those it its i you he she they we my your his her their our not no yes""".split())

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

    for comment, label in zip(comments,labels):
        if label == -1:
            continue
        words = tokenize(comment)
        cluster_word_counts[label].update(words)
        cluster_word_totals[label] += len(words)
    
    term_totals_across_classes: Counter = Counter()
    for counts in cluster_word_counts.values():
        term_totals_across_classes.update(counts)
    
    avg_words_per_class = sum(cluster_word_totals.values()) / max(len(cluster_word_totals), 1)

    result: dict[int, list[str]] = {}
    for label, counts in cluster_word_counts.items():
        scores = {}
        for term, tf in counts.items():
            weighted_tf = tf / max(cluster_word_totals[label], 1)
            idf = math.log(1 + avg_words_per_class / term_totals_across_classes[term])
            scores[term] = weighted_tf * idf
        result[label] = sorted(scores, key=scores.get, reverse=True)[:top_n]

    return result

