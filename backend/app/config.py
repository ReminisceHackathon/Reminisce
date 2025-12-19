"""Backend configuration and environment variables."""
import os
from dotenv import load_dotenv

load_dotenv()

# Google Cloud
GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID", "reminisce-hackathon")
GCP_LOCATION = os.getenv("GCP_LOCATION", "us-central1")

# Pinecone (for AI service)
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
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

# Validation
if not PINECONE_API_KEY:
    raise ValueError("PINECONE_API_KEY environment variable is required")

