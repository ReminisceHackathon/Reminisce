"""Chat endpoint for Gemini AI responses."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import sys
import os
import logging

# Add ai_service to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../.."))

from ai_service import ReminisceBrain

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["chat"])

# Initialize brain once at startup
brain = ReminisceBrain()


class ChatRequest(BaseModel):
    user_id: str
    message: str
    history: Optional[List[str]] = None


class ChatResponse(BaseModel):
    response: str


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Generate AI response using ReminisceBrain.
    
    Request format:
    {
        "user_id": "firebase_user_123",
        "message": "Who is coming to visit today?",
        "history": ["user: Hello", "assistant: Hi! How can I help?"]
    }
    """
    try:
        # Validate input
        if not request.message or not request.message.strip():
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        
        if not request.user_id:
            raise HTTPException(status_code=400, detail="user_id is required")
        
        # Use empty history if not provided
        history = request.history or []
        
        logger.info(f"Generating response for user {request.user_id}: {request.message[:50]}...")
        
        # Generate response using ReminisceBrain
        response_text = brain.generate_response(
            user_id=request.user_id,
            message=request.message,
            history=history,
            include_memories=True,
            extract_facts=True
        )
        
        return ChatResponse(response=response_text)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate response: {str(e)}")


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    try:
        status = brain.health_check()
        return {
            "status": "ok",
            "services": status
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }

