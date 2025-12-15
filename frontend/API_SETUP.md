# API Setup Guide for Reminisce

## Overview

Reminisce uses **two different APIs** for voice interaction:

1. **ElevenLabs** - Text-to-Speech (TTS) for AI responses
2. **Google Cloud Speech-to-Text** - Speech-to-Text (STT) for user input (via backend)

## Architecture

```
User speaks → Frontend records audio → Backend transcribes (Google Cloud STT)
                                                              ↓
User sees text ← Frontend displays ← Backend processes (Gemini API)
                                                              ↓
User hears audio ← Frontend plays ← ElevenLabs TTS ← Backend response text
```

## 1. ElevenLabs Setup (Text-to-Speech)

### What you need:
- **Text-to-Speech API** from ElevenLabs

### Steps:
1. Go to https://elevenlabs.io/
2. Sign up/login
3. Go to your profile → API Keys
4. Create a new API key
5. Go to Voice Library → Create a custom voice for seniors:
   - Slow pace (0.7-0.8 speed)
   - Clear pronunciation
   - Soothing, warm tone
6. Copy the Voice ID

### Add to `.env`:
```env
VITE_ELEVENLABS_API_KEY=your_api_key_here
VITE_ELEVENLABS_VOICE_ID=your_voice_id_here
```

### What it does:
- Converts Reminisce's text responses into natural-sounding speech
- Uses streaming for minimal lag
- Plays automatically after AI responds

## 2. Google Cloud Speech-to-Text Setup (Backend)

### What you need:
- **Google Cloud Speech-to-Text API** (via your backend)

### Why backend?
- More accurate than browser Web Speech API
- Better for seniors (handles accents, slower speech)
- Integrates with your Gemini/Vertex AI setup
- Can use same Google Cloud project

### Backend Implementation:
Your backend should have an endpoint like:

```javascript
// POST /api/transcribe
app.post('/api/transcribe', async (req, res) => {
  const audioBlob = req.files.audio;
  
  // Use Google Cloud Speech-to-Text
  const speech = require('@google-cloud/speech');
  const client = new speech.SpeechClient();
  
  const audioBytes = audioBlob.buffer.toString('base64');
  
  const request = {
    audio: { content: audioBytes },
    config: {
      encoding: 'WEBM_OPUS',
      sampleRateHertz: 48000,
      languageCode: 'en-US',
      enableAutomaticPunctuation: true,
      model: 'latest_long', // Better for longer conversations
    },
  };
  
  const [response] = await client.recognize(request);
  const transcription = response.results[0].alternatives[0].transcript;
  
  res.json({ text: transcription });
});
```

### Alternative: Web Speech API (Fallback)
If backend isn't ready, the frontend will fall back to browser's Web Speech API (less accurate).

## Summary

| Service | Purpose | Location | API Type |
|---------|---------|----------|----------|
| **ElevenLabs** | Convert AI text → Speech | Frontend | Text-to-Speech |
| **Google Cloud STT** | Convert user audio → Text | Backend | Speech-to-Text |
| **Gemini/Vertex AI** | Process conversation | Backend | LLM |

## Quick Answer

**For ElevenLabs signup, select: "Text-to-Speech" API**

You do NOT need ElevenLabs for Speech-to-Text. That's handled by your backend using Google Cloud Speech-to-Text (which you're already using with Gemini/Vertex AI).

## Environment Variables

```env
# ElevenLabs (TTS - Frontend)
VITE_ELEVENLABS_API_KEY=your_key
VITE_ELEVENLABS_VOICE_ID=your_voice_id

# Backend API (STT + Gemini)
VITE_API_URL=http://localhost:3000/api
```

