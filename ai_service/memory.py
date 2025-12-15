"""
Memory Manager for Reminisce AI Brain.

Handles all Pinecone vector database operations:
- Embedding generation using Vertex AI text-embedding-004
- Memory search (RAG retrieval)
- Memory storage
- Async fact extraction from conversations
"""

import json
import uuid
import logging
from datetime import datetime
from typing import Optional

from pinecone import Pinecone
import vertexai
from vertexai.language_models import TextEmbeddingModel
from langchain_google_vertexai import ChatVertexAI

from .config import (
    PINECONE_API_KEY,
    PINECONE_INDEX_NAME,
    GCP_PROJECT_ID,
    GCP_LOCATION,
    EMBEDDING_MODEL,
    EMBEDDING_DIMENSION,
    LLM_MODEL,
    MEMORY_RELEVANCE_THRESHOLD,
    MEMORY_TOP_K,
)

# Configure logging
logger = logging.getLogger(__name__)

# =============================================================================
# Initialize Clients
# =============================================================================

# Initialize Vertex AI
vertexai.init(project=GCP_PROJECT_ID, location=GCP_LOCATION)

# Initialize Pinecone
_pinecone_client: Optional[Pinecone] = None
_pinecone_index = None


def _get_pinecone_index():
    """Lazy initialization of Pinecone client and index."""
    global _pinecone_client, _pinecone_index
    
    if _pinecone_index is None:
        if not PINECONE_API_KEY:
            raise ValueError("PINECONE_API_KEY environment variable is not set")
        
        _pinecone_client = Pinecone(api_key=PINECONE_API_KEY)
        _pinecone_index = _pinecone_client.Index(PINECONE_INDEX_NAME)
        logger.info(f"Connected to Pinecone index: {PINECONE_INDEX_NAME}")
    
    return _pinecone_index


# =============================================================================
# Embedding Functions
# =============================================================================

def get_embedding(text: str) -> list[float]:
    """
    Generate embedding using Vertex AI text-embedding-004.
    
    Args:
        text: The text to embed
        
    Returns:
        List of floats representing the embedding vector (768 dimensions)
    """
    model = TextEmbeddingModel.from_pretrained(EMBEDDING_MODEL)
    embeddings = model.get_embeddings([text])
    return embeddings[0].values


def get_embeddings_batch(texts: list[str]) -> list[list[float]]:
    """
    Generate embeddings for multiple texts in a single API call.
    
    Args:
        texts: List of texts to embed
        
    Returns:
        List of embedding vectors
    """
    model = TextEmbeddingModel.from_pretrained(EMBEDDING_MODEL)
    embeddings = model.get_embeddings(texts)
    return [emb.values for emb in embeddings]


# =============================================================================
# Memory Search
# =============================================================================

def search_memories(
    query: str,
    user_id: str,
    top_k: int = MEMORY_TOP_K,
    threshold: float = MEMORY_RELEVANCE_THRESHOLD
) -> list[dict]:
    """
    Search Pinecone for relevant memories for a specific user.
    
    Uses the user_id as the Pinecone namespace to ensure complete
    isolation between users' memories.
    
    Args:
        query: The search query (user's message)
        user_id: Firebase user ID (used as Pinecone namespace)
        top_k: Maximum number of results to return
        threshold: Minimum similarity score (0.0 - 1.0)
        
    Returns:
        List of dictionaries with 'text', 'score', and 'category' keys
    """
    try:
        index = _get_pinecone_index()
        query_embedding = get_embedding(query)
        
        results = index.query(
            vector=query_embedding,
            top_k=top_k,
            namespace=user_id,
            include_metadata=True
        )
        
        memories = []
        for match in results.matches:
            if match.score >= threshold:
                memories.append({
                    "text": match.metadata.get("text", ""),
                    "score": match.score,
                    "category": match.metadata.get("category", "general"),
                    "timestamp": match.metadata.get("timestamp", "")
                })
        
        logger.debug(f"Found {len(memories)} relevant memories for user {user_id}")
        return memories
        
    except Exception as e:
        logger.error(f"Error searching memories: {e}")
        return []


# =============================================================================
# Memory Storage
# =============================================================================

def save_memory(
    text: str,
    user_id: str,
    metadata: Optional[dict] = None
) -> str:
    """
    Save a memory to Pinecone under the user's namespace.
    
    Args:
        text: The fact/memory text to store
        user_id: Firebase user ID (used as Pinecone namespace)
        metadata: Optional additional metadata (e.g., category)
        
    Returns:
        The generated vector ID
    """
    try:
        index = _get_pinecone_index()
        vector_id = str(uuid.uuid4())
        embedding = get_embedding(text)
        
        # Build metadata
        meta = {
            "text": text,
            "timestamp": datetime.utcnow().isoformat(),
        }
        if metadata:
            meta.update(metadata)
        
        # Upsert to Pinecone with user namespace
        index.upsert(
            vectors=[{
                "id": vector_id,
                "values": embedding,
                "metadata": meta
            }],
            namespace=user_id
        )
        
        logger.info(f"Saved memory for user {user_id}: {text[:50]}...")
        return vector_id
        
    except Exception as e:
        logger.error(f"Error saving memory: {e}")
        raise


def save_memories_batch(
    texts: list[str],
    user_id: str,
    categories: Optional[list[str]] = None
) -> list[str]:
    """
    Save multiple memories in a batch operation.
    
    Args:
        texts: List of facts/memories to store
        user_id: Firebase user ID
        categories: Optional list of categories (must match length of texts)
        
    Returns:
        List of generated vector IDs
    """
    if not texts:
        return []
    
    try:
        index = _get_pinecone_index()
        embeddings = get_embeddings_batch(texts)
        timestamp = datetime.utcnow().isoformat()
        
        vectors = []
        vector_ids = []
        
        for i, (text, embedding) in enumerate(zip(texts, embeddings)):
            vector_id = str(uuid.uuid4())
            vector_ids.append(vector_id)
            
            meta = {
                "text": text,
                "timestamp": timestamp,
                "category": categories[i] if categories and i < len(categories) else "general"
            }
            
            vectors.append({
                "id": vector_id,
                "values": embedding,
                "metadata": meta
            })
        
        # Batch upsert
        index.upsert(vectors=vectors, namespace=user_id)
        logger.info(f"Batch saved {len(texts)} memories for user {user_id}")
        
        return vector_ids
        
    except Exception as e:
        logger.error(f"Error batch saving memories: {e}")
        raise


# =============================================================================
# Fact Extraction (Background Task)
# =============================================================================

# Prompt for extracting personal facts from conversations
FACT_EXTRACTION_PROMPT = """Analyze this conversation and extract ONLY new permanent facts about the user's life.

Focus on:
- Family members (names, relationships, where they live)
- Important places (home, previous residences, favorite locations)
- Personal preferences (food, activities, routines)
- Important dates (birthdays, anniversaries, appointments)
- Health information (if mentioned)
- Life history (career, education, significant events)

Rules:
1. Only extract FACTS, not opinions or temporary states
2. Be specific - include names, dates, and details when mentioned
3. Do NOT extract greetings, pleasantries, or weather talk
4. If no extractable facts exist, return an empty array

Return as JSON array ONLY (no markdown, no explanation):
[{{"fact": "...", "category": "family|place|preference|event|health|history"}}]

Return [] if no extractable facts.

Conversation:
{conversation}"""


def extract_and_save_facts(conversation: str, user_id: str) -> list[str]:
    """
    Extract personal facts from a conversation and save to Pinecone.
    
    This function is designed to be called in a background thread
    to avoid blocking the main response.
    
    Args:
        conversation: The full conversation transcript
        user_id: Firebase user ID
        
    Returns:
        List of extracted facts that were saved
    """
    try:
        # Initialize LLM for fact extraction
        llm = ChatVertexAI(
            model=LLM_MODEL,
            project=GCP_PROJECT_ID,
            location=GCP_LOCATION,
            temperature=0.1,  # Low temperature for consistent extraction
            max_output_tokens=1024
        )
        
        # Call Gemini for extraction
        prompt = FACT_EXTRACTION_PROMPT.format(conversation=conversation)
        response = llm.invoke(prompt)
        
        # Parse JSON response
        response_text = response.content.strip()
        
        # Handle potential markdown code blocks
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:-1])
        
        facts_data = json.loads(response_text)
        
        if not facts_data:
            logger.debug(f"No facts extracted for user {user_id}")
            return []
        
        # Extract texts and categories
        facts = [f["fact"] for f in facts_data]
        categories = [f.get("category", "general") for f in facts_data]
        
        # Save to Pinecone
        save_memories_batch(facts, user_id, categories)
        
        logger.info(f"Extracted and saved {len(facts)} facts for user {user_id}")
        return facts
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse fact extraction response: {e}")
        return []
    except Exception as e:
        logger.error(f"Error in fact extraction: {e}")
        return []


# =============================================================================
# Memory Management Utilities
# =============================================================================

def delete_user_memories(user_id: str) -> bool:
    """
    Delete all memories for a specific user.
    
    Args:
        user_id: Firebase user ID
        
    Returns:
        True if successful, False otherwise
    """
    try:
        index = _get_pinecone_index()
        index.delete(delete_all=True, namespace=user_id)
        logger.info(f"Deleted all memories for user {user_id}")
        return True
    except Exception as e:
        logger.error(f"Error deleting user memories: {e}")
        return False


def get_memory_stats(user_id: str) -> dict:
    """
    Get statistics about a user's stored memories.
    
    Args:
        user_id: Firebase user ID
        
    Returns:
        Dictionary with memory statistics
    """
    try:
        index = _get_pinecone_index()
        stats = index.describe_index_stats()
        
        namespace_stats = stats.namespaces.get(user_id, {})
        
        return {
            "user_id": user_id,
            "vector_count": namespace_stats.get("vector_count", 0),
            "total_vectors": stats.total_vector_count
        }
    except Exception as e:
        logger.error(f"Error getting memory stats: {e}")
        return {"user_id": user_id, "vector_count": 0, "error": str(e)}

