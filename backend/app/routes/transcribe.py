"""Speech-to-text transcription endpoint."""
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.speech_service import SpeechToTextService
from app.config import GCP_PROJECT_ID
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["transcribe"])

# Initialize service
speech_service = SpeechToTextService(project_id=GCP_PROJECT_ID)


@router.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    """
    Transcribe audio file to text.
    
    Expected format: WebM/Opus (from browser MediaRecorder)
    """
    try:
        # Read audio content
        audio_content = await audio.read()
        
        if not audio_content:
            raise HTTPException(status_code=400, detail="No audio content provided")
        
        logger.info(f"Received audio file: {audio.filename}, size: {len(audio_content)} bytes")
        
        # Transcribe
        transcript = await speech_service.transcribe_audio(audio_content)
        
        if not transcript:
            raise HTTPException(status_code=400, detail="Could not transcribe audio. Please try again.")
        
        return {"text": transcript, "transcription": transcript}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

