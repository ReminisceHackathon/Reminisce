const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY || '';
const DEFAULT_VOICE_ID = import.meta.env.VITE_ELEVENLABS_VOICE_ID || '';
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

export const getAvailableVoices = async () => {
  try {
    const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch voices: ${response.statusText}`);
    }

    const data = await response.json();
    return data.voices || [];
  } catch (error) {
    console.error('Error fetching voices:', error);
    return getDefaultVoices();
  }
};

export const getDefaultVoices = () => {
  const customVoiceId = import.meta.env.VITE_ELEVENLABS_VOICE_ID || '';
  
  const defaultVoices = [
    { voice_id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', description: 'Warm, friendly female voice' },
    { voice_id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', description: 'Clear, professional female voice' },
    { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', description: 'Soothing, calm female voice' },
    { voice_id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', description: 'Warm, friendly male voice' },
    { voice_id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', description: 'Clear, gentle female voice' },
    { voice_id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', description: 'Calm, reassuring male voice' },
  ];


  if (customVoiceId && !defaultVoices.find(v => v.voice_id === customVoiceId)) {
    defaultVoices.unshift({
      voice_id: customVoiceId,
      name: 'Brad',
      description: 'Wise, male voice'
    });
  }

  return defaultVoices;
};


export const textToSpeechStream = async (text, onChunk, onComplete, onError, voiceId = null) => {
  try {
    const selectedVoiceId = voiceId || 
                            localStorage.getItem('reminisce_voice_id') || 
                            DEFAULT_VOICE_ID;

    if (!selectedVoiceId) {
      throw new Error('No voice ID available. Please select a voice in settings.');
    }

    const response = await fetch(
      `${ELEVENLABS_API_URL}/text-to-speech/${selectedVoiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const chunks = [];

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }

      chunks.push(value);
      if (onChunk) {
        onChunk(value);
      }
    }

    const audioBlob = new Blob(chunks, { type: 'audio/mpeg' });
    const audioUrl = URL.createObjectURL(audioBlob);
    
    if (onComplete) {
      onComplete(audioUrl, audioBlob);
    }

    return audioUrl;
  } catch (error) {
    console.error('ElevenLabs TTS error:', error);
    if (onError) {
      onError(error);
    }
    throw error;
  }
};

export const playAudio = (audioUrl) => {
  return new Promise((resolve, reject) => {
    const audio = new Audio(audioUrl);
    audio.onended = () => resolve();
    audio.onerror = (error) => reject(error);
    audio.play();
  });
};

