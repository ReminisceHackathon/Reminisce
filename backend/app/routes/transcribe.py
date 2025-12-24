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
        
        if len(audio_content) < 100:
            raise HTTPException(
                status_code=400, 
                detail=f"Audio file too small ({len(audio_content)} bytes). Please record longer audio."
            )
        
        logger.info(f"Received audio file: {audio.filename}, size: {len(audio_content)} bytes, content-type: {audio.content_type}")
        
        # Transcribe
        try:
            transcript = await speech_service.transcribe_audio(audio_content)
        except Exception as transcribe_error:
            logger.error(f"Speech service error details: {transcribe_error}")
            logger.error(f"Error type: {type(transcribe_error).__name__}")
            # Re-raise with more context
            raise HTTPException(
                status_code=400, 
                detail=f"Transcription failed: {str(transcribe_error)}"
            )
        
        if not transcript or not transcript.strip():
            raise HTTPException(
                status_code=400, 
                detail="Could not transcribe audio. The audio might be too short, silent, or in an unsupported format."
            )
        
        logger.info(f"Successfully transcribed: {transcript[:50]}...")
        return {"text": transcript, "transcription": transcript}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Transcription error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

