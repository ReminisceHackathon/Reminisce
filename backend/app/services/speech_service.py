"""Google Cloud Speech-to-Text service."""
import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor
from google.cloud import speech

logger = logging.getLogger(__name__)

# Thread pool for running synchronous Google Cloud calls
_executor = ThreadPoolExecutor(max_workers=4)


class SpeechToTextService:
    """Handles audio transcription using Google Cloud Speech-to-Text."""
    
    def __init__(self, project_id: str):
        self.client = speech.SpeechClient()
        self.project_id = project_id
    
    def _sync_transcribe(self, audio_content: bytes, language_code: str) -> str:
        """Synchronous transcription (runs in thread pool)."""
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.WEBM_OPUS,
            sample_rate_hertz=48000,  # WebM Opus default
            language_code=language_code,
            enable_automatic_punctuation=True,
            model="latest_long",  # Better for longer conversations
            use_enhanced=True,  # Enhanced model for better accuracy
        )
        
        audio = speech.RecognitionAudio(content=audio_content)
        response = self.client.recognize(config=config, audio=audio)
        return response
    
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
            # Run synchronous Google API call in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                _executor,
                self._sync_transcribe,
                audio_content,
                language_code
            )
            
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

