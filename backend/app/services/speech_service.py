"""Google Cloud Speech-to-Text service."""
import logging
from google.cloud import speech

logger = logging.getLogger(__name__)


class SpeechToTextService:
    """Handles audio transcription using Google Cloud Speech-to-Text."""
    
    def __init__(self, project_id: str):
        self.client = speech.SpeechClient()
        self.project_id = project_id
    
    async def transcribe_audio(self, audio_content: bytes, language_code: str = "en-US") -> str:
        """
        Transcribe audio bytes to text.
        
        Args:
            audio_content: Raw audio bytes (WebM/Opus format)
            language_code: Language code (default: en-US)
            
        Returns:
            Transcribed text string
        """
        try:
            # Configure recognition
            config = speech.RecognitionConfig(
                encoding=speech.RecognitionConfig.AudioEncoding.WEBM_OPUS,
                sample_rate_hertz=48000,  # WebM Opus default
                language_code=language_code,
                enable_automatic_punctuation=True,
                model="latest_long",  # Better for longer conversations
                use_enhanced=True,  # Enhanced model for better accuracy
            )
            
            audio = speech.RecognitionAudio(content=audio_content)
            
            # Perform transcription
            response = self.client.recognize(config=config, audio=audio)
            
            # Extract transcript
            if not response.results:
                logger.warning("No transcription results returned")
                return ""
            
            # Combine all alternatives
            transcript_parts = []
            for result in response.results:
                if result.alternatives:
                    transcript_parts.append(result.alternatives[0].transcript)
            
            full_transcript = " ".join(transcript_parts)
            logger.info(f"Transcribed {len(audio_content)} bytes to {len(full_transcript)} chars")
            
            return full_transcript.strip()
            
        except Exception as e:
            logger.error(f"Speech-to-text error: {e}")
            raise Exception(f"Transcription failed: {str(e)}")

