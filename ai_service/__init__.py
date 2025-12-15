"""
Reminisce AI Service Package

The AI "Brain" for Reminisce - a memory aid application for seniors.

This package provides:
- ReminisceBrain: Main class for generating AI responses with RAG
- Memory management: Pinecone-based long-term memory storage and retrieval
- Fact extraction: Automatic extraction of personal facts from conversations

Usage:
    from ai_service import ReminisceBrain
    
    # Initialize the brain (do this once at app startup)
    brain = ReminisceBrain()
    
    # Generate a response
    response = brain.generate_response(
        user_id="firebase_user_123",
        message="Who is coming to visit today?",
        history=["user: Hello", "assistant: Hi! How are you?"]
    )

Environment Variables Required:
    - PINECONE_API_KEY: Your Pinecone API key
    - PINECONE_INDEX_NAME: Pinecone index name (default: "reminisce-memories")
    - GCP_PROJECT_ID: Google Cloud project ID
    - GCP_LOCATION: Google Cloud region (default: "us-central1")

For detailed setup instructions, see the project README.
"""

# Main class export
from .brain import ReminisceBrain

# Memory utilities (for advanced usage)
from .memory import (
    search_memories,
    save_memory,
    save_memories_batch,
    extract_and_save_facts,
    delete_user_memories,
    get_memory_stats,
)

# Configuration (for inspection/debugging)
from .config import (
    PINECONE_INDEX_NAME,
    GCP_PROJECT_ID,
    GCP_LOCATION,
    LLM_MODEL,
    EMBEDDING_MODEL,
)

__version__ = "1.0.0"
__author__ = "Reminisce Team"

__all__ = [
    # Main class
    "ReminisceBrain",
    
    # Memory functions
    "search_memories",
    "save_memory",
    "save_memories_batch",
    "extract_and_save_facts",
    "delete_user_memories",
    "get_memory_stats",
    
    # Config
    "PINECONE_INDEX_NAME",
    "GCP_PROJECT_ID",
    "GCP_LOCATION",
    "LLM_MODEL",
    "EMBEDDING_MODEL",
]

