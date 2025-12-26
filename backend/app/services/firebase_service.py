"""Firebase service for user management, conversation history, and memories."""
import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any

import firebase_admin
from firebase_admin import credentials, firestore, auth

logger = logging.getLogger(__name__)


class FirebaseService:
    """Handles Firebase operations for users, conversations, and memories."""
    
    def __init__(self, credentials_path: Optional[str] = None, project_id: Optional[str] = None):
        if not firebase_admin._apps:
            # Get project ID from environment if not provided (with fallback default)
            import os
            if project_id is None:
                project_id = os.getenv("FIREBASE_PROJECT_ID") or os.getenv("GCP_PROJECT_ID") or "reminisce-hackathon-b44cb"
            
            # Also set the env var for other Google Cloud services
            os.environ.setdefault("GOOGLE_CLOUD_PROJECT", project_id)
            
            options = {"projectId": project_id}
            
            if credentials_path:
                cred = credentials.Certificate(credentials_path)
                firebase_admin.initialize_app(cred, options=options)
            else:
                # Use default credentials (gcloud auth) with explicit project ID
                firebase_admin.initialize_app(options=options)
            
            logger.info(f"Firebase Admin SDK initialized with project: {project_id}")
        
        self.db = firestore.client()
    
    # =========================================================================
    # Authentication / Token Verification
    # =========================================================================
    
    def verify_id_token(self, id_token: str) -> Dict[str, Any]:
        """
        Verify a Firebase ID token and return the decoded claims.
        
        Args:
            id_token: The Firebase ID token from the frontend
            
        Returns:
            Decoded token claims (contains uid, email, etc.)
        """
        try:
            decoded_token = auth.verify_id_token(id_token)
            return decoded_token
        except Exception as e:
            logger.error(f"Token verification failed: {e}")
            raise
    
    # =========================================================================
    # User Profile Management
    # =========================================================================
    
    def create_user_profile(
        self, 
        user_id: str, 
        email: str, 
        display_name: str
    ) -> Dict[str, Any]:
        """
        Create a new user profile in Firestore.
        
        Args:
            user_id: Firebase Auth UID
            email: User's email
            display_name: User's display name
            
        Returns:
            The created profile data
        """
        profile = {
            "email": email,
            "display_name": display_name,
            "created_at": datetime.utcnow().isoformat(),
            "biometric_enabled": False,
            "preferences": {
                "voice_enabled": True,
                "reminder_time": "09:00",
                "timezone": "America/Los_Angeles"
            }
        }
        
        self.db.collection("users").document(user_id).set(profile)
        logger.info(f"Created profile for user {user_id}")
        return profile
    
    def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get a user's profile from Firestore."""
        doc = self.db.collection("users").document(user_id).get()
        if doc.exists:
            return doc.to_dict()
        return None
    
    def update_user_profile(
        self, 
        user_id: str, 
        updates: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update a user's profile."""
        updates["updated_at"] = datetime.utcnow().isoformat()
        self.db.collection("users").document(user_id).update(updates)
        return self.get_user_profile(user_id)
    
    def enable_biometric(
        self, 
        user_id: str, 
        credential_id: Optional[str] = None
    ) -> bool:
        """Enable biometric authentication for a user."""
        try:
            self.db.collection("users").document(user_id).update({
                "biometric_enabled": True,
                "biometric_credential_id": credential_id,
                "biometric_enabled_at": datetime.utcnow().isoformat()
            })
            return True
        except Exception as e:
            logger.error(f"Error enabling biometric: {e}")
            return False
    
    # =========================================================================
    # Conversation History
    # =========================================================================
    
    def get_conversation_history(self, user_id: str, limit: int = 10) -> List[str]:
        """
        Get recent conversation history for a user.
        
        Returns format: ["user: message", "assistant: response", ...]
        """
        try:
            messages_ref = self.db.collection("users").document(user_id).collection("messages")
            messages = messages_ref.order_by(
                "timestamp", 
                direction=firestore.Query.DESCENDING
            ).limit(limit).stream()
            
            history = []
            for msg in messages:
                data = msg.to_dict()
                role = data.get("role", "user")
                text = data.get("text", "")
                history.insert(0, f"{role}: {text}")
            
            return history
        except Exception as e:
            logger.error(f"Error fetching conversation history: {e}")
            return []
    
    def save_message(self, user_id: str, role: str, text: str) -> str:
        """
        Save a message to Firebase.
        
        Args:
            user_id: The user's Firebase UID
            role: Either "user" or "assistant"
            text: The message content
            
        Returns:
            The document ID of the saved message
        """
        try:
            messages_ref = self.db.collection("users").document(user_id).collection("messages")
            doc_ref = messages_ref.add({
                "role": role,
                "text": text,
                "timestamp": firestore.SERVER_TIMESTAMP
            })
            return doc_ref[1].id
        except Exception as e:
            logger.error(f"Error saving message: {e}")
            return ""
    
    # =========================================================================
    # User Memories (Events with Dates)
    # =========================================================================
    
    def save_user_memory(
        self,
        user_id: str,
        memory_text: str,
        category: str = "general",
        event_date: Optional[datetime] = None,
        reminder_date: Optional[datetime] = None,
        source_message: Optional[str] = None
    ) -> str:
        """
        Save a memory/event for a user in Firestore.
        
        This is used for dated events that need reminders, like:
        "My daughter is visiting next week" -> stores with event_date
        
        Args:
            user_id: The user's Firebase UID
            memory_text: The memory/fact to store
            category: Category like "family", "event", "health", etc.
            event_date: When the event occurs (if applicable)
            reminder_date: When to remind the user (typically same day as event)
            source_message: The original user message that triggered this memory
            
        Returns:
            The document ID of the saved memory
        """
        try:
            memory_data = {
                "text": memory_text,
                "category": category,
                "created_at": firestore.SERVER_TIMESTAMP,
                "source_message": source_message,
                "reminded": False
            }
            
            if event_date:
                memory_data["event_date"] = event_date
            if reminder_date:
                memory_data["reminder_date"] = reminder_date
            
            memories_ref = self.db.collection("users").document(user_id).collection("memories")
            doc_ref = memories_ref.add(memory_data)
            
            logger.info(f"Saved memory for user {user_id}: {memory_text[:50]}...")
            return doc_ref[1].id
            
        except Exception as e:
            logger.error(f"Error saving memory: {e}")
            return ""
    
    def get_user_memories(
        self, 
        user_id: str, 
        category: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get all memories for a user, optionally filtered by category.
        """
        try:
            memories_ref = self.db.collection("users").document(user_id).collection("memories")
            
            if category:
                query = memories_ref.where("category", "==", category)
            else:
                query = memories_ref
            
            memories = query.order_by(
                "created_at", 
                direction=firestore.Query.DESCENDING
            ).limit(limit).stream()
            
            return [{"id": m.id, **m.to_dict()} for m in memories]
            
        except Exception as e:
            logger.error(f"Error getting memories: {e}")
            return []
    
    def get_memories_for_date(
        self, 
        user_id: str, 
        target_date: datetime
    ) -> List[Dict[str, Any]]:
        """
        Get memories that have an event_date matching the target date.
        Used for triggering reminders.
        
        Args:
            user_id: The user's Firebase UID
            target_date: The date to check (usually today)
            
        Returns:
            List of memories with events on that date
        """
        try:
            # Create date range for the target day
            start_of_day = datetime(target_date.year, target_date.month, target_date.day)
            end_of_day = start_of_day + timedelta(days=1)
            
            memories_ref = self.db.collection("users").document(user_id).collection("memories")
            
            memories = memories_ref.where(
                "reminder_date", ">=", start_of_day
            ).where(
                "reminder_date", "<", end_of_day
            ).where(
                "reminded", "==", False
            ).stream()
            
            return [{"id": m.id, **m.to_dict()} for m in memories]
            
        except Exception as e:
            logger.error(f"Error getting memories for date: {e}")
            return []
    
    def mark_memory_reminded(self, user_id: str, memory_id: str) -> bool:
        """Mark a memory as having triggered its reminder."""
        try:
            self.db.collection("users").document(user_id).collection("memories").document(memory_id).update({
                "reminded": True,
                "reminded_at": firestore.SERVER_TIMESTAMP
            })
            return True
        except Exception as e:
            logger.error(f"Error marking memory as reminded: {e}")
            return False
    
    # =========================================================================
    # Reminders (Firestore-backed)
    # =========================================================================
    
    def create_reminder(
        self,
        user_id: str,
        task: str,
        time: str,
        source_memory_id: Optional[str] = None
    ) -> str:
        """
        Create a reminder for a user in Firestore.
        
        Args:
            user_id: The user's Firebase UID
            task: What to remind the user about
            time: Time string like "2:00 PM"
            source_memory_id: Optional reference to the memory that created this
            
        Returns:
            The document ID of the created reminder
        """
        try:
            reminder_data = {
                "task": task,
                "time": time,
                "status": "new",
                "created_at": firestore.SERVER_TIMESTAMP,
                "source_memory_id": source_memory_id
            }
            
            reminders_ref = self.db.collection("users").document(user_id).collection("reminders")
            doc_ref = reminders_ref.add(reminder_data)
            
            logger.info(f"Created reminder for user {user_id}: {task}")
            return doc_ref[1].id
            
        except Exception as e:
            logger.error(f"Error creating reminder: {e}")
            return ""
    
    def get_user_reminders(
        self, 
        user_id: str, 
        status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get reminders for a user.
        
        Args:
            user_id: The user's Firebase UID
            status: Optional filter by status ("new", "pending", "completed")
            
        Returns:
            List of reminders
        """
        try:
            reminders_ref = self.db.collection("users").document(user_id).collection("reminders")
            
            if status:
                query = reminders_ref.where("status", "==", status)
            else:
                query = reminders_ref
            
            reminders = query.order_by("created_at", direction=firestore.Query.DESCENDING).stream()
            
            result = []
            for r in reminders:
                reminder = {"id": r.id, **r.to_dict()}
                result.append(reminder)
            
            return result
            
        except Exception as e:
            logger.error(f"Error getting reminders: {e}")
            return []
    
    def update_reminder_status(
        self, 
        user_id: str, 
        reminder_id: str, 
        status: str
    ) -> bool:
        """Update the status of a reminder."""
        try:
            self.db.collection("users").document(user_id).collection("reminders").document(reminder_id).update({
                "status": status,
                "updated_at": firestore.SERVER_TIMESTAMP
            })
            return True
        except Exception as e:
            logger.error(f"Error updating reminder status: {e}")
            return False
    
    def delete_reminder(self, user_id: str, reminder_id: str) -> bool:
        """Delete a reminder."""
        try:
            self.db.collection("users").document(user_id).collection("reminders").document(reminder_id).delete()
            return True
        except Exception as e:
            logger.error(f"Error deleting reminder: {e}")
            return False
    
    # =========================================================================
    # Memory-to-Reminder Processing
    # =========================================================================
    
    def process_daily_reminders(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Check for memories that should trigger reminders today.
        
        This should be called periodically (e.g., on user login or via cron).
        
        Returns:
            List of reminders that were created
        """
        today = datetime.utcnow()
        memories = self.get_memories_for_date(user_id, today)
        
        created_reminders = []
        
        for memory in memories:
            # Create a reminder from this memory
            task = memory.get("text", "Reminder")
            time = "9:00 AM"  # Default time, could be configured
            
            reminder_id = self.create_reminder(
                user_id=user_id,
                task=task,
                time=time,
                source_memory_id=memory.get("id")
            )
            
            if reminder_id:
                # Mark the memory as reminded so we don't create duplicates
                self.mark_memory_reminded(user_id, memory["id"])
                created_reminders.append({
                    "reminder_id": reminder_id,
                    "task": task,
                    "from_memory": memory.get("text")
                })
        
        if created_reminders:
            logger.info(f"Created {len(created_reminders)} reminders for user {user_id}")
        
        return created_reminders
