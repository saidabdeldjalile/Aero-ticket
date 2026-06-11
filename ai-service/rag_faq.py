"""
RAG Module for FAQ Retrieval
Uses sentence-transformers (multilingual) for embeddings + FAISS for similarity search.
Flows:
  1. Keyword matching (existing) – instant, for exact/simple matches
  2. Semantic search with embeddings – for fuzzy/contextual matches
  3. RAG with Ollama – passes matched FAQ context to LLM for enriched answers
"""

import logging
import os
import re
from typing import Dict, List, Tuple, Optional, Any
import numpy as np

logger = logging.getLogger(__name__)

# ==================== CONFIG ====================

# Embedding model: multilingual for French support
EMBEDDING_MODEL_NAME = os.environ.get(
    "EMBEDDING_MODEL", "paraphrase-multilingual-MiniLM-L12-v2"
)
# Alternative (heavier but better): "intfloat/multilingual-e5-small" (also multilingual)

EMBEDDING_DIM = int(os.environ.get("EMBEDDING_DIM", "384"))  # 384 for MiniLM, 512 for e5-small
FAISS_INDEX_PATH = os.environ.get("FAISS_INDEX_PATH", "data/faq_index.faiss")
EMBEDDINGS_CACHE_PATH = os.environ.get("EMBEDDINGS_CACHE_PATH", "data/faq_embeddings.npy")
FAQ_METADATA_PATH = os.environ.get("FAQ_METADATA_PATH", "data/faq_metadata.json")
RAG_TOP_K = int(os.environ.get("RAG_TOP_K", "3"))
RAG_SIMILARITY_THRESHOLD = float(os.environ.get("RAG_SIMILARITY_THRESHOLD", "0.30"))
RAG_USE_RERANKER = os.environ.get("RAG_USE_RERANKER", "true").lower() == "true"

# ==================== EMBEDDING MODEL ====================

_embedding_model = None  # Lazy-loaded singleton


def get_embedding_model():
    """Lazy-load the sentence-transformer embedding model (singleton)."""
    global _embedding_model
    if _embedding_model is None:
        try:
            from sentence_transformers import SentenceTransformer
            logger.info(f"🧠 Loading embedding model: {EMBEDDING_MODEL_NAME}")
            _embedding_model = SentenceTransformer(EMBEDDING_MODEL_NAME)
            logger.info(f"✅ Embedding model loaded (dim={_embedding_model.get_sentence_embedding_dimension()})")
        except Exception as e:
            logger.error(f"❌ Failed to load embedding model: {e}")
            raise
    return _embedding_model


def compute_embeddings(texts: List[str]) -> np.ndarray:
    """
    Compute embeddings for a list of texts.
    Returns a numpy array of shape (len(texts), embedding_dim).
    """
    model = get_embedding_model()
    embeddings = model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
    return embeddings


def compute_query_embedding(query: str) -> np.ndarray:
    """Compute embedding for a single query string."""
    return compute_embeddings([query])[0]


# ==================== FAISS INDEX ====================

_faiss_index = None
_faq_metadata_list: List[Dict] = []


def build_faiss_index(faqs: List[Dict]) -> bool:
    """
    Build a FAISS index from FAQ data.
    Each FAQ entry should have: id, question, answer, category, keywords.
    Returns True if index was built successfully.
    """
    global _faiss_index, _faq_metadata_list

    if not faqs:
        logger.warning("⚠️ No FAQ data to build index")
        return False

    # Prepare texts for embedding: combine question + keywords for better semantic matching
    texts_to_embed = []
    metadata_list = []

    for faq in faqs:
        faq_id = faq.get("id", 0)
        question = faq.get("question", "")
        answer = faq.get("answer", "")
        category = faq.get("category", "Autres")
        keywords = faq.get("keywords") or []

        # Create a rich text representation for embedding
        # We embed: "question: [question]. keywords: [keyword1, keyword2, ...]"
        # This helps the embedding model understand the semantic context
        keyword_str = ", ".join(keywords) if keywords else ""
        if keyword_str:
            embed_text = f"Question: {question}. Mots-clés: {keyword_str}"
        else:
            embed_text = f"Question: {question}"

        texts_to_embed.append(embed_text)

        metadata_list.append({
            "id": faq_id,
            "question": question,
            "answer": answer,
            "category": category,
            "keywords": keywords,
        })

    try:
        logger.info(f"🔨 Computing embeddings for {len(texts_to_embed)} FAQ entries...")
        embeddings = compute_embeddings(texts_to_embed)
        logger.info(f"✅ Embeddings computed: shape {embeddings.shape}")

        dim = embeddings.shape[1]
        index = faiss.IndexFlatIP(dim)  # Inner product = cosine similarity for normalized vectors

        # Normalize embeddings for cosine similarity
        faiss.normalize_L2(embeddings)
        index.add(embeddings)

        _faiss_index = index
        _faq_metadata_list = metadata_list

        # Save to disk for persistence
        os.makedirs(os.path.dirname(FAISS_INDEX_PATH) or ".", exist_ok=True)
        faiss.write_index(index, FAISS_INDEX_PATH)
        np.save(EMBEDDINGS_CACHE_PATH, embeddings)
        import json
        with open(FAQ_METADATA_PATH, "w", encoding="utf-8") as f:
            json.dump(metadata_list, f, ensure_ascii=False, indent=2)

        logger.info(f"💾 FAISS index saved to {FAISS_INDEX_PATH} ({index.ntotal} vectors)")
        return True

    except Exception as e:
        logger.error(f"❌ Failed to build FAISS index: {e}")
        _faiss_index = None
        _faq_metadata_list = []
        return False


def load_faiss_index() -> bool:
    """
    Load FAISS index from disk if it exists.
    Returns True if loaded successfully.
    """
    global _faiss_index, _faq_metadata_list

    try:
        if os.path.exists(FAISS_INDEX_PATH) and os.path.exists(FAQ_METADATA_PATH):
            import json

            _faiss_index = faiss.read_index(FAISS_INDEX_PATH)
            with open(FAQ_METADATA_PATH, "r", encoding="utf-8") as f:
                _faq_metadata_list = json.load(f)

            logger.info(f"📂 FAISS index loaded: {_faiss_index.ntotal} vectors")
            return True
    except Exception as e:
        logger.warning(f"⚠️ Could not load FAISS index from disk: {e}")

    _faiss_index = None
    _faq_metadata_list = []
    return False


def semantic_search(query: str, top_k: int = None) -> List[Dict]:
    """
    Search FAQ using semantic (embedding) similarity.
    Returns top-k FAQ matches with scores.

    Args:
        query: User's question
        top_k: Number of results to return (default: RAG_TOP_K)

    Returns:
        List of dicts: {id, question, answer, category, score}
    """
    if _faiss_index is None or not _faq_metadata_list:
        logger.warning("⚠️ FAISS index not initialized")
        return []

    if top_k is None:
        top_k = RAG_TOP_K

    try:
        # Compute query embedding
        query_emb = compute_query_embedding(query)
        query_emb = query_emb.reshape(1, -1).astype(np.float32)

        # Normalize for cosine similarity
        faiss.normalize_L2(query_emb)

        # Search
        k = min(top_k, _faiss_index.ntotal)
        distances, indices = _faiss_index.search(query_emb, k)

        results = []
        for i, idx in enumerate(indices[0]):
            if idx < 0 or idx >= len(_faq_metadata_list):
                continue
            score = float(distances[0][i])
            meta = _faq_metadata_list[idx]
            results.append({
                "id": meta["id"],
                "question": meta["question"],
                "answer": meta["answer"],
                "category": meta["category"],
                "keywords": meta.get("keywords", []),
                "score": score,
            })

        return results

    except Exception as e:
        logger.error(f"❌ Semantic search error: {e}")
        return []


# ==================== RERANKER ====================

_reranker_model = None


def get_reranker():
    """Lazy-load cross-encoder reranker model (small & fast)."""
    global _reranker_model
    if _reranker_model is None and RAG_USE_RERANKER:
        try:
            from sentence_transformers import CrossEncoder
            # Small multilingual reranker
            reranker_name = "cross-encoder/ms-marco-MiniLM-L-4-v2"
            logger.info(f"🔁 Loading reranker: {reranker_name}")
            _reranker_model = CrossEncoder(reranker_name)
            logger.info("✅ Reranker loaded")
        except Exception as e:
            logger.warning(f"⚠️ Could not load reranker (continuing without): {e}")
            _reranker_model = None
    return _reranker_model


def rerank_results(query: str, results: List[Dict], top_k: int = 3) -> List[Dict]:
    """
    Rerank semantic search results using a cross-encoder for better precision.
    """
    if not results:
        return results

    reranker = get_reranker()
    if reranker is None:
        return results

    try:
        pairs = [[query, r["answer"]] for r in results]
        scores = reranker.predict(pairs)

        for i, r in enumerate(results):
            r["rerank_score"] = float(scores[i])

        # Sort by rerank score
        results.sort(key=lambda x: x.get("rerank_score", 0), reverse=True)
        return results[:top_k]

    except Exception as e:
        logger.warning(f"⚠️ Reranking failed: {e}")
        return results


# ==================== RAG PROMPT ====================

RAG_PROMPT_TEMPLATE = """Tu es l'assistant virtuel interne de l'application IssueTracker d'Air Algérie.

Voici des informations de la base de connaissances (FAQ) qui peuvent t'aider à répondre:

{faq_context}

INSTRUCTIONS:
1. Réponds à l'utilisateur en te basant **uniquement** sur les informations de la FAQ ci-dessus.
2. Si l'information est dans la FAQ, reformule-la de façon naturelle et concise (2-4 phrases max).
3. Si la question de l'utilisateur ne correspond à **aucune** entrée de la FAQ, dis clairement:
   "Je n'ai pas trouvé de réponse spécifique dans notre base de connaissances pour votre question."
   et propose de créer un ticket si nécessaire.
4. Ne pose JAMAIS de questions à l'utilisateur. Donne la réponse complète immédiatement.
5. Réponds uniquement en français.

Utilisateur: {user_query}

Assistant:"""


def build_rag_context(results: List[Dict]) -> str:
    """Build a formatted FAQ context string from search results."""
    if not results:
        return "Aucune entrée pertinente trouvée dans la FAQ."

    context_parts = []
    for i, r in enumerate(results, 1):
        context_parts.append(
            f"[FAQ #{i}] Question: {r['question']}\n"
            f"  Catégorie: {r['category']}\n"
            f"  Réponse: {r['answer']}\n"
            f"  Pertinence: {r.get('score', 0):.2f}"
        )

    return "\n\n".join(context_parts)


# ==================== HYBRID FAQ SEARCH ====================

# Keep reference to the original keyword search function
_original_keyword_search = None


def set_original_keyword_search(func):
    """Set the original keyword search function for fallback."""
    global _original_keyword_search
    _original_keyword_search = func


def hybrid_faq_search(query: str) -> Tuple[Optional[str], float, Optional[str], str, List[Dict]]:
    """
    Hybrid FAQ search: keyword first (fast), then semantic if needed.

    Returns:
        Tuple of (answer, score, category, source, rag_results)
        - source: "keyword" | "semantic" | "none"
        - rag_results: list of matched FAQ entries for context
    """
    global _original_keyword_search

    # ── Step 1: Keyword matching (instant) ──
    keyword_threshold = float(os.environ.get("FAQ_SIMILARITY_THRESHOLD", "0.75"))

    if _original_keyword_search:
        answer, score, category = _original_keyword_search(query)
        if answer and score >= keyword_threshold:
            logger.info(f"🔍 Keyword match: score={score:.2f}, category={category}")
            return answer, score, category, "keyword", []

    # ── Step 2: Semantic search (embedding) ──
    logger.info(f"🔎 No strong keyword match → trying semantic search")
    rag_results = semantic_search(query, top_k=RAG_TOP_K)

    if rag_results:
        best = rag_results[0]
        score = best["score"]

        # Rerank if enabled
        if RAG_USE_RERANKER:
            rag_results = rerank_results(query, rag_results, top_k=RAG_TOP_K)
            best = rag_results[0] if rag_results else best

        logger.info(f"🔎 Semantic match: score={best.get('score', 0):.2f}, category={best.get('category', '?')}")

        if score >= RAG_SIMILARITY_THRESHOLD:
            # Use the best match answer directly for high confidence
            if score >= 0.75:
                return best["answer"], score, best["category"], "semantic_direct", rag_results

            # For medium confidence, pass as RAG context to Ollama
            return None, score, best["category"], "semantic_rag", rag_results

    return None, 0.0, None, "none", []


# ==================== INITIALIZATION ====================

def initialize_rag(faqs: List[Dict]) -> bool:
    """
    Initialize the RAG system: try to load from disk, or build from FAQ data.
    Returns True if RAG is ready.
    """
    global _faiss_index

    # Try to load existing index first
    if load_faiss_index():
        logger.info(f"✅ RAG system loaded from disk ({_faiss_index.ntotal} vectors)")
        return True

    # Build from FAQ data
    if faqs:
        logger.info(f"🔨 Building RAG index from {len(faqs)} FAQ entries...")
        if build_faiss_index(faqs):
            logger.info("✅ RAG system initialized with new index")
            return True

    logger.warning("⚠️ RAG system not available (no FAQ data)")
    return False


def rebuild_rag_index(faqs: List[Dict]) -> bool:
    """
    Force rebuild the RAG index from FAQ data.
    Called when FAQ data changes (e.g., admin adds new entries).
    """
    global _faiss_index
    _faiss_index = None
    _faq_metadata_list.clear()
    return build_faiss_index(faqs)


# Import faiss only when needed (heavy dependency)
import faiss