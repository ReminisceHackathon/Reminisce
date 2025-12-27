const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const speechToText = async (audioBlob) => {
  try {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    const response = await fetch(`${API_URL}/transcribe`, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - let browser set it with boundary for FormData
    });

    if (!response.ok) {
      // Try to get error message from response
      let errorMessage = `Transcription error: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errorMessage = errorData.detail;
        }
      } catch (e) {
        // Couldn't parse error response, use status text
      }
      console.error('Transcription failed:', errorMessage);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.text || data.transcription;
  } catch (error) {
    console.error('Speech-to-text error:', error);
    // Don't fall back to Web Speech API - it can't handle blobs
    throw error;
  }
};

const speechToTextWebAPI = async (audioBlob) => {
  console.warn('Web Speech API fallback: Backend transcription is recommended for audio blobs');
  
  return new Promise((resolve, reject) => {
    reject(new Error('Backend transcription required. Web Speech API cannot process audio blobs.'));
  });
};

