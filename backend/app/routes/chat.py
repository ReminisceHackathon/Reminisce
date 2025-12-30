"""Chat endpoint for Gemini AI responses with memory extraction."""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import sys
import os
import logging
import threading

# Add ai_service to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../.."))

from ai_service import ReminisceBrain, save_memory
from app.services.firebase_service import FirebaseService
from app.services.memory_extraction_service import extract_memories_from_conversation
from app.config import FIREBASE_CREDENTIALS_PATH

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["chat"])
security = HTTPBearer(auto_error=False)

# Initialize services
brain = ReminisceBrain()
firebase_service = FirebaseService(
    credentials_path=FIREBASE_CREDENTIALS_PATH if FIREBASE_CREDENTIALS_PATH else None
)


# =============================================================================
# Authentication Helper
# =============================================================================

async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[Dict[str, Any]]:
    """
    Optionally verify Firebase ID token.
    Returns user info if authenticated, None otherwise.
    """
    if not credentials:
        return None
    
    try:
        id_token = credentials.credentials
        decoded_token = firebase_service.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        logger.warning(f"Token verification failed: {e}")
        return None


# =============================================================================
# Background Tasks
# =============================================================================

def save_memories_async(
    user_id: str,
    message: str,
    response: str,
    history: List[str]
):
    """
    Background task to extract and save memories from conversation.
    """
    try:
        # Extract memories with dates
        memories = extract_memories_from_conversation(
            message=message,
            response=response,
            history=history,
            user_id=user_id
        )
        
        for memory in memories:
            firebase_service.save_user_memory(
                user_id=user_id,
                memory_text=memory["text"],
                category=memory.get("category", "general"),
                event_date=memory.get("event_date"),
                reminder_date=memory.get("reminder_date"),
                source_message=memory.get("source_message")
            )
            
            # If there's a reminder date, create a reminder for that date
            if memory.get("reminder_date"):
                from datetime import datetime
                reminder_datetime = memory["reminder_date"]
                
                # Log what we're extracting
                logger.info(f"Creating reminder - raw reminder_date: {reminder_datetime}, type: {type(reminder_datetime)}")
                
                # Format time from the reminder_date or use default
                if isinstance(reminder_datetime, datetime):
                    time_str = reminder_datetime.strftime("%I:%M %p")
                    event_date = reminder_datetime
                    logger.info(f"Parsed as datetime - date: {event_date.date()}, time: {time_str}")
                else:
                    time_str = "9:00 AM"
                    event_date = reminder_datetime
                    logger.info(f"Not a datetime, using default time")
                
                # Create reminder for any future date (not just today)
                firebase_service.create_reminder(
                    user_id=user_id,
                    task=memory["text"],
                    time=time_str,
                    event_date=event_date
                )
                
                # IMPORTANT: Also save to Pinecone so AI can recall this reminder
                # Format: "User has a reminder to [task] on [date] at [time]"
                if isinstance(event_date, datetime):
                    date_str = event_date.strftime("%B %d, %Y")
                else:
                    date_str = str(event_date)
                
                reminder_memory = f"User has a reminder to {memory['text']} on {date_str} at {time_str}"
                try:
                    save_memory(
                        text=reminder_memory,
                        user_id=user_id,
                        metadata={
                            "category": "reminder",
                            "task": memory["text"],
                            "date": date_str,
                            "time": time_str
                        }
                    )
                    logger.info(f"Saved reminder to Pinecone: {reminder_memory[:50]}...")
                except Exception as e:
                    logger.error(f"Failed to save reminder to Pinecone: {e}")
        
        if memories:
            logger.info(f"Saved {len(memories)} memories for user {user_id}")
            
    except Exception as e:
        logger.error(f"Error saving memories: {e}")


def save_conversation_async(user_id: str, message: str, response: str):
    """
    Background task to save conversation to Firebase.
    """
    try:
        firebase_service.save_message(user_id, "user", message)
        firebase_service.save_message(user_id, "assistant", response)
    except Exception as e:
        logger.error(f"Error saving conversation: {e}")


# =============================================================================
# Request/Response Models
# =============================================================================

class ChatRequest(BaseModel):
    user_id: Optional[str] = None  # Optional if using auth token
    message: str
    history: Optional[List[str]] = None


class ChatResponse(BaseModel):
    response: str
    user_id: str
    memories_extracted: bool = False


# =============================================================================
# Endpoints
# =============================================================================

@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """
    Generate AI response using ReminisceBrain.
    
    If authenticated, uses the Firebase UID from the token.
    Otherwise, uses the provided user_id (for backward compatibility).
    
    The conversation is saved to Firestore and memories are extracted
    for future reminders.
    """
    try:
        # Determine user ID (prefer authenticated user)
        if current_user:
            user_id = current_user.get("uid")
        elif request.user_id:
            user_id = request.user_id
        else:
            raise HTTPException(
                status_code=400, 
                detail="user_id required (or authenticate with Bearer token)"
            )
        
        # Validate message
        if not request.message or not request.message.strip():
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        
        # Get conversation history from Firebase if not provided
        history = request.history or []
        if not history and current_user:
            history = firebase_service.get_conversation_history(user_id, limit=10)
        
        logger.info(f"Generating response for user {user_id}: {request.message[:50]}...")
        
        # Check for daily reminders on first message of the day
        if current_user:
            try:
                created_reminders = firebase_service.process_daily_reminders(user_id)
                if created_reminders:
                    logger.info(f"Triggered {len(created_reminders)} daily reminders")
            except Exception as e:
                logger.warning(f"Error processing daily reminders: {e}")
        
        # Generate response using ReminisceBrain
        response_text = brain.generate_response(
            user_id=user_id,
            message=request.message,
            history=history,
            include_memories=True,
            extract_facts=True
        )
        
        # Save conversation and extract memories in background
        if current_user:
            # Save conversation
            thread1 = threading.Thread(
                target=save_conversation_async,
                args=(user_id, request.message, response_text),
                daemon=True
            )
            thread1.start()
            
            # Extract and save memories with dates
            thread2 = threading.Thread(
                target=save_memories_async,
                args=(user_id, request.message, response_text, history),
                daemon=True
            )
            thread2.start()
        
        return ChatResponse(
            response=response_text,
            user_id=user_id,
            memories_extracted=current_user is not None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate response: {str(e)}")


@router.get("/memories")
async def get_memories(
    current_user: Dict[str, Any] = Depends(get_current_user_optional),
    category: Optional[str] = None,
    limit: int = 50
):
    """
    Get stored memories for the authenticated user.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    user_id = current_user.get("uid")
    memories = firebase_service.get_user_memories(user_id, category=category, limit=limit)
    
    return {
        "user_id": user_id,
        "count": len(memories),
        "memories": memories
    }


@router.get("/health")
async def health_check():
    """Quick health check endpoint."""
    return {
        "status": "ok",
        "brain": "initialized",
        "firebase": "initialized",
        "version": "2.0.0"
    }


@router.get("/health/full")
async def full_health_check():
    """Full health check - tests all services."""
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
