"""Firebase service for user management and conversation history."""
import logging
from typing import List, Optional

import firebase_admin
from firebase_admin import credentials, firestore

logger = logging.getLogger(__name__)


class FirebaseService:
    """Handles Firebase operations for users and conversations."""
    
    def __init__(self, credentials_path: Optional[str] = None):
        if not firebase_admin._apps:
            if credentials_path:
                cred = credentials.Certificate(credentials_path)
                firebase_admin.initialize_app(cred)
            else:
                # Use default credentials (gcloud auth)
                firebase_admin.initialize_app()
        
        self.db = firestore.client()
    
    def get_conversation_history(self, user_id: str, limit: int = 10) -> List[str]:
        """
        Get recent conversation history for a user.
        
        Returns format: ["user: message", "assistant: response", ...]
        """
        try:
            messages_ref = self.db.collection("users").document(user_id).collection("messages")
            messages = messages_ref.order_by("timestamp", direction=firestore.Query.DESCENDING).limit(limit).stream()
            
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
    
    def save_message(self, user_id: str, role: str, text: str):
        """Save a message to Firebase."""
        try:
            messages_ref = self.db.collection("users").document(user_id).collection("messages")
            messages_ref.add({
                "role": role,
                "text": text,
                "timestamp": firestore.SERVER_TIMESTAMP
            })
        except Exception as e:
            logger.error(f"Error saving message: {e}")

