"""Google Cloud Speech-to-Text service."""
import logging
import asyncio
import os
from concurrent.futures import ThreadPoolExecutor
from google.cloud import speech

logger = logging.getLogger(__name__)

# Thread pool for running synchronous Google Cloud calls
_executor = ThreadPoolExecutor(max_workers=4)


class SpeechToTextService:
    """Handles audio transcription using Google Cloud Speech-to-Text."""
    
    def __init__(self, project_id: str):
        # Google Cloud client will automatically use GOOGLE_APPLICATION_CREDENTIALS
        # from environment variable if set
        self.client = speech.SpeechClient()
        self.project_id = project_id
        
        # Log which credentials are being used
        creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if creds_path:
            logger.info(f"Using service account credentials from: {creds_path}")
        else:
            logger.warning("GOOGLE_APPLICATION_CREDENTIALS not set, using default credentials")
    
    def _sync_transcribe(self, audio_content: bytes, language_code: str) -> str:
        """Synchronous transcription (runs in thread pool)."""
        # Try multiple encoding formats - browsers can send different formats
        encoding_options = [
            (speech.RecognitionConfig.AudioEncoding.WEBM_OPUS, 48000),
            (speech.RecognitionConfig.AudioEncoding.OGG_OPUS, 48000),
            (speech.RecognitionConfig.AudioEncoding.LINEAR16, 16000),
        ]
        
        last_error = None
        
        for encoding, sample_rate in encoding_options:
            try:
                config = speech.RecognitionConfig(
                    encoding=encoding,
                    sample_rate_hertz=sample_rate,
                    language_code=language_code,
                    enable_automatic_punctuation=True,
                    model="latest_long",
                    use_enhanced=True,
                )
                
                audio = speech.RecognitionAudio(content=audio_content)
                response = self.client.recognize(config=config, audio=audio)
                
                if response.results:
                    logger.info(f"Successfully transcribed using encoding: {encoding.name}")
                    return response
                else:
                    logger.debug(f"No results with encoding {encoding.name}, trying next...")
                    
            except Exception as e:
                last_error = e
                logger.debug(f"Encoding {encoding.name} failed: {e}, trying next...")
                continue
        
        # If all encodings failed, log the last error
        if last_error:
            logger.error(f"All encoding attempts failed. Last error: {last_error}")
            raise last_error
        
        # If we got here, no encoding worked but no exception was raised
        logger.warning("No transcription results with any encoding format")
        return type('Response', (), {'results': []})()  # Return empty response object
    
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
            error_msg = str(e)
            logger.error(f"Speech-to-text error: {error_msg}")
            logger.error(f"Error type: {type(e).__name__}")
            # Include more details in the error
            raise Exception(f"Transcription failed: {error_msg}")

