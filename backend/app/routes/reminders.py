"""Reminders endpoint with Firebase Firestore backend."""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging

from app.services.firebase_service import FirebaseService
from app.config import FIREBASE_CREDENTIALS_PATH

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["reminders"])
security = HTTPBearer(auto_error=False)

# Initialize Firebase service
firebase_service = FirebaseService(
    credentials_path=FIREBASE_CREDENTIALS_PATH if FIREBASE_CREDENTIALS_PATH else None
)

# Fallback in-memory store for unauthenticated users (demo mode)
_demo_reminders: List[Dict] = []


# =============================================================================
# Authentication Helper
# =============================================================================

async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[Dict[str, Any]]:
    """Optionally verify Firebase ID token."""
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
# Request/Response Models
# =============================================================================

class Reminder(BaseModel):
    task: str
    time: str
    status: str = "pending"


class ReminderCreate(BaseModel):
    task: str
    time: str
    date: Optional[str] = None  # ISO format date string (YYYY-MM-DD) or None for today


class ReminderResponse(BaseModel):
    id: Optional[str] = None
    task: str
    time: str
    status: str


# =============================================================================
# Endpoints
# =============================================================================

@router.get("/reminders", response_model=List[ReminderResponse])
async def get_reminders(
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
    user_id: str = "demo_user"
):
    """
    Get all reminders for a user.
    
    If authenticated, returns reminders from Firestore.
    Otherwise, returns demo reminders from in-memory store.
    """
    if current_user:
        # Authenticated user - use Firestore
        uid = current_user.get("uid")
        
        # Process daily memory-based reminders
        try:
            firebase_service.process_daily_reminders(uid)
        except Exception as e:
            logger.warning(f"Error processing daily reminders: {e}")
        
        reminders = firebase_service.get_user_reminders(uid)
        
        result = []
        for r in reminders:
            result.append(ReminderResponse(
                id=r.get("id"),
                task=r.get("task", ""),
                time=r.get("time", ""),
                status=r.get("status", "pending")
            ))
            
            # Mark "new" as "pending" after first fetch
            if r.get("status") == "new":
                firebase_service.update_reminder_status(uid, r["id"], "pending")
        
        return result
    else:
        # Demo mode - use in-memory store
        result = []
        for r in _demo_reminders:
            result.append(ReminderResponse(
                task=r["task"],
                time=r["time"],
                status=r["status"]
            ))
            if r["status"] == "new":
                r["status"] = "pending"
        
        return result


@router.post("/reminders", response_model=ReminderResponse)
async def create_reminder(
    reminder: ReminderCreate,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """
    Create a new reminder.
    
    If authenticated, stores in Firestore.
    Otherwise, stores in demo memory.
    """
    if current_user:
        uid = current_user.get("uid")
        
        # Parse date if provided (format: YYYY-MM-DD)
        event_date = None
        if reminder.date:
            try:
                # Parse YYYY-MM-DD format and set to start of day
                event_date = datetime.strptime(reminder.date, '%Y-%m-%d')
            except (ValueError, AttributeError):
                # If date parsing fails, use today
                event_date = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        
        reminder_id = firebase_service.create_reminder(
            user_id=uid,
            task=reminder.task,
            time=reminder.time,
            event_date=event_date
        )
        
        logger.info(f"Created reminder for user {uid}: {reminder.task}")
        
        return ReminderResponse(
            id=reminder_id,
            task=reminder.task,
            time=reminder.time,
            status="new"
        )
    else:
        # Demo mode
        new_reminder = {
            "task": reminder.task,
            "time": reminder.time,
            "status": "new",
            "created_at": datetime.utcnow().isoformat()
        }
        _demo_reminders.append(new_reminder)
        
        return ReminderResponse(
            task=reminder.task,
            time=reminder.time,
            status="new"
        )


@router.delete("/reminders/{reminder_id}")
async def delete_reminder(
    reminder_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """Delete a reminder by ID or task name."""
    if current_user:
        uid = current_user.get("uid")
        success = firebase_service.delete_reminder(uid, reminder_id)
        
        if success:
            return {"message": "Reminder deleted"}
        else:
            raise HTTPException(status_code=404, detail="Reminder not found")
    else:
        # Demo mode - delete by task name
        global _demo_reminders
        _demo_reminders = [r for r in _demo_reminders if r["task"] != reminder_id]
        return {"message": "Reminder deleted"}


@router.put("/reminders/{reminder_id}/status")
async def update_reminder_status(
    reminder_id: str,
    status: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """Update the status of a reminder."""
    valid_statuses = ["pending", "completed", "dismissed"]
    if status not in valid_statuses:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid status. Must be one of: {valid_statuses}"
        )
    
    if current_user:
        uid = current_user.get("uid")
        success = firebase_service.update_reminder_status(uid, reminder_id, status)
        
        if success:
            return {"message": "Status updated", "status": status}
        else:
            raise HTTPException(status_code=404, detail="Reminder not found")
    else:
        # Demo mode
        for r in _demo_reminders:
            if r["task"] == reminder_id:
                r["status"] = status
                return {"message": "Status updated", "status": status}
        
        raise HTTPException(status_code=404, detail="Reminder not found")


@router.post("/reminders/demo")
async def create_demo_reminder():
    """
    Create a demo reminder for testing.
    Useful for testing the widget polling.
    """
    demo_reminder = {
        "task": "Call your grandson",
        "time": "2:00 PM",
        "status": "new",
        "created_at": datetime.utcnow().isoformat()
    }
    
    _demo_reminders.append(demo_reminder)
    logger.info("Created demo reminder")
    
    return {"message": "Demo reminder created", "reminder": demo_reminder}


@router.get("/reminders/check-memories")
async def check_memory_reminders(
    current_user: Dict[str, Any] = Depends(get_current_user_optional)
):
    """
    Manually trigger checking for memory-based reminders.
    Called to process any memories that should trigger reminders today.
    """
    if not current_user:
        return {"message": "Authentication required for memory-based reminders"}
    
    uid = current_user.get("uid")
    created_reminders = firebase_service.process_daily_reminders(uid)
    
    return {
        "message": f"Processed memory reminders",
        "reminders_created": len(created_reminders),
        "reminders": created_reminders
    }
