# 🧠 Reminisce: The AI Memory Companion
> **Winner of the AI Partner Catalyst Hackathon! (Hopefully!)** | *Built for the AI Partner Catalyst Hackathon*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tech Stack](https://img.shields.io/badge/Stack-FastAPI%20%7C%20React%20%7C%20Gemini%202.0-blue)](https://google.com)
[![Powered By](https://img.shields.io/badge/Audio-ElevenLabs-orange)](https://elevenlabs.io)

**Reminisce** is a voice-first companion designed to restore independence for seniors with early-stage memory loss. It uses **Google Gemini 2.0 Flash** for reasoning and **ElevenLabs** for an empathetic, human-like voice interface.

## 🎥 Demo Video
[![Watch the Demo](https://img.youtube.com/vi/[YOUR_VIDEO_ID_HERE](https://youtu.be/la-CrAMkCAg)/0.jpg)](https://www.youtube.com/watch?v=la-CrAMkCAg)

## ✨ Key Features
- **🗣️ Zero-UI Voice Interface:** Completely hands-free interaction using Google STT and ElevenLabs.
- **🧠 Long-Term Memory (RAG):** Uses **Vertex AI** and **Pinecone** to remember family details (e.g., "Grandson Tommy likes apple pie").
- **⏰ Proactive Reminders:** "Cheat" Widget instantly visualizes tasks as they are spoken.
- **👴 Accessibility First:** Custom high-contrast UI and engineered audio profiles for elderly hearing.

## 🏗️ Architecture
**FastAPI (Backend)** receives voice input → Transcribes via **Google Cloud** → Reasons via **Gemini 2.0 Flash** → Retrieves Context from **Pinecone** → Speaks via **ElevenLabs**.

## 🚀 How to Run
1. Clone the repo
2. `pip install -r requirements.txt`
3. Add your `.env` keys (Google Cloud, ElevenLabs, Pinecone)
4. `uvicorn main:app --reload`

## 🏆 Hackathon Tracks
- **Google Cloud:** Utilized Gemini 2.0 Flash & Vertex AI embeddings.
- **ElevenLabs:** Implemented "Voice Design" for a custom elderly persona.
- **Social Good:** Addressing the loneliness epidemic in senior care.

---
*Made with ❤️ by Epaphras, Eniola, and Jason.*
