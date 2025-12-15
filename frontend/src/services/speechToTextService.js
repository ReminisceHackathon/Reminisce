const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const speechToText = async (audioBlob) => {
  try {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    const response = await fetch(`${API_URL}/transcribe`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Transcription error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.text || data.transcription;
  } catch (error) {
    console.error('Speech-to-text error:', error);
    return await speechToTextWebAPI(audioBlob);
  }
};

const speechToTextWebAPI = async (audioBlob) => {
  console.warn('Web Speech API fallback: Backend transcription is recommended for audio blobs');
  
  return new Promise((resolve, reject) => {
    reject(new Error('Backend transcription required. Web Speech API cannot process audio blobs.'));
  });
};

