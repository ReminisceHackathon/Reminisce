# 🧠 Reminisce: The AI Memory Companion

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tech Stack](https://img.shields.io/badge/Stack-FastAPI%20%7C%20React%20%7C%20Gemini%202.0-blue)](https://google.com)
[![Powered By](https://img.shields.io/badge/Audio-ElevenLabs-orange)](https://elevenlabs.io)

**Reminisce** is a voice-first companion designed to restore independence for seniors with early-stage memory loss. It uses **Google Gemini 2.0 Flash** for reasoning and **ElevenLabs** for an empathetic, human-like voice interface.

## 🎥 Demo Video
[![Watch the Demo](https://img.youtube.com/vi/la-CrAMkCAg/0.jpg)](https://www.youtube.com/watch?v=la-CrAMkCAg)

## Tech Stack

- **Backend:** FastAPI (Python)
- **AI/LLM:** Gemini 2.0 Flash
- **Vector DB:** Pinecone (for RAG memory storage)
- **Voice:** ElevenLabs (custom voice synthesis)
- **Frontend:** React

## Architecture

User speaks → ElevenLabs transcription → FastAPI receives request → Pinecone retrieves relevant memory context → Gemini generates response with full context → ElevenLabs synthesizes voice reply → Streamed back to user.

## Why This Matters

Traditional memory aids (notes, apps, calendars) require fine motor control and consistent typing — exactly what early-stage memory loss makes difficult. Reminisce prioritizes natural voice interaction so users can stay independent longer.

## Local Development


### Backend
``` 
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend
```
cd frontend
npm install
npm run dev
```

Required environment variables:
- `GEMINI_API_KEY`
- `PINECONE_API_KEY`
- `ELEVENLABS_API_KEY`
  
*Made with ❤️ by Epaphras, Eniola, and Jason.*
