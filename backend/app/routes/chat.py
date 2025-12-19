"""Chat endpoint for Gemini AI responses."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import sys
import os
import logging
import re
import threading

# Add ai_service to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../.."))

from ai_service import ReminisceBrain
from .reminders import _reminders_store

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["chat"])

# Initialize brain once at startup
brain = ReminisceBrain()


def extract_reminder_from_conversation(message: str, response: str, history: List[str]) -> Optional[dict]:
    """
    Extract reminder details from conversation using pattern matching.
    Returns dict with 'task' and 'time' if found, None otherwise.
    """
    # Combine recent context
    full_context = " ".join(history[-4:]) + " " + message + " " + response
    full_context_lower = full_context.lower()
    
    # Check if this is a reminder-related conversation
    reminder_keywords = ["remind", "reminder", "don't forget", "remember to", "set a reminder", "at"]
    if not any(kw in full_context_lower for kw in reminder_keywords):
        return None
    
    # Extract time patterns
    time_patterns = [
        r'(\d{1,2})\s*(?::|\.)\s*(\d{2})\s*(am|pm|a\.m\.|p\.m\.)',  # 2:00 PM
        r'(\d{1,2})\s*(am|pm|a\.m\.|p\.m\.)',  # 2 PM
        r'(\d{1,2})\s*(?:o\'?clock)',  # 2 o'clock
    ]
    
    time_found = None
    for pattern in time_patterns:
        match = re.search(pattern, full_context_lower)
        if match:
            groups = match.groups()
            if len(groups) == 3:  # Hour:Min AM/PM
                hour, minute, period = groups
                time_found = f"{hour}:{minute} {period.upper().replace('.', '')}"
            elif len(groups) == 2:  # Hour AM/PM
                hour, period = groups
                time_found = f"{hour}:00 {period.upper().replace('.', '')}"
            else:
                hour = groups[0]
                time_found = f"{hour}:00"
            break
    
    if not time_found:
        return None
    
    # Extract task - look for common patterns
    task_patterns = [
        r'(?:remind(?:er)?.*?to\s+)?call\s+(?:my\s+)?(\w+)',  # call mentor/grandson
        r'(?:remind(?:er)?.*?to\s+)?take\s+(?:my\s+)?(\w+)',  # take medication
        r'remind(?:er)?.*?(?:to|about)\s+(.+?)(?:\s+at|\s+tomorrow|$)',  # general reminder
    ]
    
    task_found = None
    for pattern in task_patterns:
        match = re.search(pattern, full_context_lower)
        if match:
            task_found = match.group(1).strip() if match.group(1) else match.group(0).strip()
            break
    
    # If we found "call" in context, build the task
    if "call" in full_context_lower:
        # Find what to call
        call_match = re.search(r'call\s+(?:my\s+)?(\w+)', full_context_lower)
        if call_match:
            who = call_match.group(1).capitalize()
            task_found = f"Call {who}"
    
    if not task_found:
        task_found = "Reminder"
    else:
        # Capitalize nicely
        task_found = task_found.title()
    
    return {"task": task_found, "time": time_found}


def create_reminder_async(user_id: str, task: str, time: str):
    """Create a reminder in the background."""
    from datetime import datetime
    
    if user_id not in _reminders_store:
        _reminders_store[user_id] = []
    
    # Check if this reminder already exists
    existing = [r for r in _reminders_store[user_id] if r["task"].lower() == task.lower()]
    if existing:
        logger.info(f"Reminder already exists: {task}")
        return
    
    new_reminder = {
        "task": task,
        "time": time,
        "status": "new",
        "created_at": datetime.utcnow().isoformat()
    }
    
    _reminders_store[user_id].append(new_reminder)
    logger.info(f"✅ Auto-created reminder for {user_id}: {task} at {time}")


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
        
        # Auto-extract reminders from conversation (in background)
        try:
            reminder = extract_reminder_from_conversation(
                message=request.message,
                response=response_text,
                history=history
            )
            if reminder:
                thread = threading.Thread(
                    target=create_reminder_async,
                    args=(request.user_id, reminder["task"], reminder["time"]),
                    daemon=True
                )
                thread.start()
                logger.info(f"Detected reminder: {reminder}")
        except Exception as e:
            logger.warning(f"Reminder extraction failed: {e}")
        
        return ChatResponse(response=response_text)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate response: {str(e)}")


@router.get("/health")
async def health_check():
    """Quick health check endpoint."""
    # Fast check - don't make API calls
    return {
        "status": "ok",
        "brain": "initialized",
        "version": "1.0.0"
    }


@router.get("/health/full")
async def full_health_check():
    """Full health check - tests all services (slow)."""
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

