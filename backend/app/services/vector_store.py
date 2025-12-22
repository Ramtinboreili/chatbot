from dataclasses import dataclass, field
from typing import List

import numpy as np


@dataclass
class VectorStore:
    embeddings: List[np.ndarray] = field(default_factory=list)
    texts: List[str] = field(default_factory=list)
    sources: List[str] = field(default_factory=list)

    def add_documents(self, embeddings: list[list[float]], texts: list[str], source: str) -> None:
        for embedding, text in zip(embeddings, texts):
            vector = np.array(embedding, dtype=np.float32)
            self.embeddings.append(vector)
            self.texts.append(text)
            self.sources.append(source)

    def search(self, query_embedding: list[float], top_k: int = 4) -> list[dict]:
        if not self.embeddings:
            return []

        query = np.array(query_embedding, dtype=np.float32)
        matrix = np.vstack(self.embeddings)
        scores = self._cosine_similarity(matrix, query)
        top_indices = np.argsort(scores)[::-1][:top_k]

        results = []
        for idx in top_indices:
            results.append({
                "text": self.texts[idx],
                "source": self.sources[idx],
                "score": float(scores[idx]),
            })
        return results

    @staticmethod
    def _cosine_similarity(matrix: np.ndarray, vector: np.ndarray) -> np.ndarray:
        matrix_norm = np.linalg.norm(matrix, axis=1)
        vector_norm = np.linalg.norm(vector)
        denominator = matrix_norm * vector_norm + 1e-8
        return (matrix @ vector) / denominator


vector_store = VectorStore()
