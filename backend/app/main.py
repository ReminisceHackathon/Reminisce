"""FastAPI application entry point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import chat, transcribe
from app.config import ALLOWED_ORIGINS
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Reminisce Backend API",
    description="Backend API for Reminisce - Voice-first memory aid for seniors",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(chat.router)
app.include_router(transcribe.router)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Reminisce Backend API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/api/health",
            "chat": "/api/chat",
            "transcribe": "/api/transcribe"
        }
    }


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    logger.info("🚀 Reminisce Backend starting up...")
    logger.info(f"Allowed origins: {ALLOWED_ORIGINS}")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    logger.info("👋 Reminisce Backend shutting down...")

