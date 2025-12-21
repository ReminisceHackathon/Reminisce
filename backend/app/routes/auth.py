"""Authentication routes using Firebase Auth."""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any
import logging

from app.services.firebase_service import FirebaseService
from app.config import FIREBASE_CREDENTIALS_PATH

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["authentication"])
security = HTTPBearer()

# Initialize Firebase service
firebase_service = FirebaseService(
    credentials_path=FIREBASE_CREDENTIALS_PATH if FIREBASE_CREDENTIALS_PATH else None
)


# =============================================================================
# Request/Response Models
# =============================================================================

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    display_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserProfile(BaseModel):
    user_id: str
    email: str
    display_name: str
    created_at: Optional[str] = None
    biometric_enabled: bool = False
    preferences: Dict[str, Any] = {}


class ProfileUpdateRequest(BaseModel):
    display_name: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None


# =============================================================================
# Authentication Helpers
# =============================================================================

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict[str, Any]:
    """Verify Firebase ID token and return user info."""
    try:
        id_token = credentials.credentials
        decoded_token = firebase_service.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authentication token"
        )


# =============================================================================
# Auth Endpoints
# =============================================================================

@router.post("/register")
async def register(request: RegisterRequest):
    """
    Register a new user.
    
    Note: This endpoint provides instructions. Actual user creation
    should be done on the frontend using Firebase SDK, then the ID token
    should be sent to /verify-token to create the profile.
    """
    return {
        "message": "User registration should be done via Firebase Auth SDK on frontend",
        "instructions": "Use Firebase Auth SDK to create user, then call /api/auth/verify-token to create profile",
        "steps": [
            "1. Use createUserWithEmailAndPassword() in frontend",
            "2. Get the ID token from the created user",
            "3. POST to /api/auth/verify-token with Bearer token",
            "4. Profile will be created automatically"
        ]
    }


@router.post("/verify-token")
async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Verify Firebase ID token and return/create user profile.
    
    This endpoint:
    1. Verifies the Firebase ID token
    2. Creates a user profile in Firestore if it doesn't exist
    3. Returns the user profile
    
    Called after login/register on the frontend.
    """
    try:
        id_token = credentials.credentials
        decoded_token = firebase_service.verify_id_token(id_token)
        user_id = decoded_token.get("uid")
        
        # Get or create user profile
        profile = firebase_service.get_user_profile(user_id)
        
        if not profile:
            email = decoded_token.get("email", "")
            display_name = decoded_token.get("name") or (email.split("@")[0] if email else "User")
            profile = firebase_service.create_user_profile(
                user_id=user_id,
                email=email,
                display_name=display_name
            )
            logger.info(f"Created new profile for user {user_id}")
        
        # Process any pending memory-based reminders
        try:
            created_reminders = firebase_service.process_daily_reminders(user_id)
            if created_reminders:
                logger.info(f"Triggered {len(created_reminders)} reminders on login")
        except Exception as e:
            logger.warning(f"Error processing reminders on login: {e}")
        
        return {
            "valid": True,
            "user": {
                "user_id": user_id,
                "email": decoded_token.get("email"),
                "profile": profile
            }
        }
    except Exception as e:
        logger.error(f"Token verification error: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")


@router.get("/profile", response_model=UserProfile)
async def get_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get current user's profile."""
    try:
        user_id = current_user.get("uid")
        profile = firebase_service.get_user_profile(user_id)
        
        if not profile:
            # Create profile if it doesn't exist
            email = current_user.get("email", "")
            display_name = current_user.get("name") or (email.split("@")[0] if email else "User")
            profile = firebase_service.create_user_profile(
                user_id=user_id,
                email=email,
                display_name=display_name
            )
        
        return UserProfile(
            user_id=user_id,
            email=profile.get("email", ""),
            display_name=profile.get("display_name", ""),
            created_at=profile.get("created_at"),
            biometric_enabled=profile.get("biometric_enabled", False),
            preferences=profile.get("preferences", {})
        )
    except Exception as e:
        logger.error(f"Error fetching profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/profile")
async def update_profile(
    request: ProfileUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Update current user's profile."""
    try:
        user_id = current_user.get("uid")
        updates = {}
        
        if request.display_name is not None:
            updates["display_name"] = request.display_name
        if request.preferences is not None:
            updates["preferences"] = request.preferences
        
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        updated_profile = firebase_service.update_user_profile(user_id, updates)
        return {
            "message": "Profile updated successfully",
            "profile": updated_profile
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/biometric/enable")
async def enable_biometric(
    credential_id: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Enable biometric authentication for the current user."""
    try:
        user_id = current_user.get("uid")
        success = firebase_service.enable_biometric(user_id, credential_id)
        
        if success:
            return {"message": "Biometric authentication enabled", "enabled": True}
        else:
            raise HTTPException(status_code=500, detail="Failed to enable biometric")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error enabling biometric: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/memories")
async def get_user_memories(
    current_user: Dict[str, Any] = Depends(get_current_user),
    category: Optional[str] = None,
    limit: int = 50
):
    """Get stored memories for the authenticated user."""
    user_id = current_user.get("uid")
    memories = firebase_service.get_user_memories(user_id, category=category, limit=limit)
    
    return {
        "user_id": user_id,
        "count": len(memories),
        "memories": memories
    }


@router.get("/conversation-history")
async def get_conversation_history(
    current_user: Dict[str, Any] = Depends(get_current_user),
    limit: int = 20
):
    """Get recent conversation history for the authenticated user."""
    user_id = current_user.get("uid")
    history = firebase_service.get_conversation_history(user_id, limit=limit)
    
    return {
        "user_id": user_id,
        "count": len(history),
        "history": history
    }
