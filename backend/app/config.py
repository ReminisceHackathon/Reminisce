"""Backend configuration and environment variables."""
import os
from dotenv import load_dotenv

load_dotenv()

# Google Cloud
GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID", "reminisce-hackathon")
GCP_LOCATION = os.getenv("GCP_LOCATION", "us-central1")

# Pinecone (for AI service) - with default for development
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY", "pcsk_3jmj3o_JB9HKQRAqt1nBmXQHS8opFqacv8gGyHUhErmcgKsM3rntofKKZUk8M9VEEUDY22")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "reminisce-memories")

# Firebase (optional)
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", GCP_PROJECT_ID)
FIREBASE_CREDENTIALS_PATH = os.getenv("FIREBASE_CREDENTIALS_PATH")  # Path to service account JSON

# CORS
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS", 
    "http://localhost:5173,http://localhost:5174,http://localhost:3000"  # Vite ports
).split(",")

# Server
PORT = int(os.getenv("PORT", 3000))
HOST = os.getenv("HOST", "0.0.0.0")

# Validation (only warn in development)
if not PINECONE_API_KEY:
    import warnings
    warnings.warn("PINECONE_API_KEY not set - using default for development")

