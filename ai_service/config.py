"""
Configuration module for Reminisce AI Brain.

All environment variables and constants are centralized here.
Uses Application Default Credentials for Google Cloud authentication.
"""

import os

# --- Pinecone Configuration ---
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY", "pcsk_3jmj3o_JB9HKQRAqt1nBmXQHS8opFqacv8gGyHUhErmcgKsM3rntofKKZUk8M9VEEUDY22")
# PINECONE_API_KEY = os.getenv("PINECONE_API_KEY", "pcsk_4gYLNW_9fJwMXp6se1z43W6WKGrs9zhBZArYvA2FWC6VbToyoU9SyPNW24QUvxXS8fo7Go")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "reminisce-memories")

# --- Google Cloud Configuration ---
GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID", "reminisce-hackathon")
GCP_LOCATION = os.getenv("GCP_LOCATION", "us-central1")

# =============================================================================
# Model Settings
# =============================================================================
# Vertex AI Embedding Model
EMBEDDING_MODEL = "text-embedding-004"
EMBEDDING_DIMENSION = 768  # text-embedding-004 output dimension

# Gemini LLM Model (use specific version for Vertex AI)
LLM_MODEL = "gemini-2.0-flash-001"

# =============================================================================
# Memory Settings
# =============================================================================
# Minimum similarity score for memory retrieval (0.0 - 1.0)
MEMORY_RELEVANCE_THRESHOLD = 0.7

# Maximum number of memories to retrieve per query
MEMORY_TOP_K = 5

# Maximum conversation history messages to include in prompt
MAX_HISTORY_MESSAGES = 10

