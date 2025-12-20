"""Reminders endpoint for visual reminder widget."""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["reminders"])

# In-memory storage for demo (replace with database in production)
# Format: { user_id: [{ task, time, status, created_at }] }
_reminders_store: dict = {
    "demo_user": []
}


class Reminder(BaseModel):
    task: str
    time: str
    status: str = "pending"  # pending, new, completed, dismissed


class ReminderCreate(BaseModel):
    user_id: str
    task: str
    time: str


class ReminderResponse(BaseModel):
    task: str
    time: str
    status: str


@router.get("/reminders", response_model=List[ReminderResponse])
async def get_reminders(user_id: str = "demo_user"):
    """
    Get all reminders for a user.
    
    Query params:
        user_id: User identifier (default: demo_user)
    
    Returns:
        List of reminders with task, time, and status
    """
    user_reminders = _reminders_store.get(user_id, [])
    
    # Mark any "new" reminders as "pending" after first fetch
    result = []
    for reminder in user_reminders:
        result.append({
            "task": reminder["task"],
            "time": reminder["time"],
            "status": reminder["status"]
        })
        # After sending as "new", mark as "pending" for next fetch
        if reminder["status"] == "new":
            reminder["status"] = "pending"
    
    return result


@router.post("/reminders")
async def create_reminder(reminder: ReminderCreate):
    """
    Create a new reminder.
    
    Request body:
        user_id: User identifier
        task: Task description
        time: Time string (e.g., "2:00 PM")
    """
    user_id = reminder.user_id
    
    if user_id not in _reminders_store:
        _reminders_store[user_id] = []
    
    new_reminder = {
        "task": reminder.task,
        "time": reminder.time,
        "status": "new",
        "created_at": datetime.utcnow().isoformat()
    }
    
    _reminders_store[user_id].append(new_reminder)
    logger.info(f"Created reminder for {user_id}: {reminder.task} at {reminder.time}")
    
    return {"message": "Reminder created", "reminder": new_reminder}


@router.delete("/reminders/{task}")
async def delete_reminder(task: str, user_id: str = "demo_user"):
    """Delete a reminder by task name."""
    if user_id in _reminders_store:
        _reminders_store[user_id] = [
            r for r in _reminders_store[user_id] 
            if r["task"] != task
        ]
    return {"message": "Reminder deleted"}


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
    
    if "demo_user" not in _reminders_store:
        _reminders_store["demo_user"] = []
    
    _reminders_store["demo_user"].append(demo_reminder)
    logger.info("Created demo reminder")
    
    return {"message": "Demo reminder created", "reminder": demo_reminder}

