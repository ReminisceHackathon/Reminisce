# 🧠 Reminisce

**A voice-first AI memory companion for seniors.**

Reminisce helps elderly users remember important life details, upcoming events, and daily tasks through natural conversation. Using advanced AI and voice technology, it provides a warm, patient companion that never forgets.

![Reminisce Demo](demo-screenshot.png)

---

## 🎯 Problem

Seniors often struggle with:
- Remembering appointments, medications, and family events
- Feeling isolated and lonely
- Using complex technology interfaces

## 💡 Solution

Reminisce is a **voice-first** memory assistant that:
- **Remembers everything** - Family details, appointments, preferences
- **Speaks naturally** - No typing required, just talk
- **Reminds proactively** - Never miss an important event
- **Feels like a friend** - Warm, patient, never rushes

---

## ✨ Features

### 🎤 Voice Conversation
Talk naturally with Reminisce. It listens, understands, and responds with a soothing voice.

### 🧠 Long-Term Memory (RAG)
Reminisce remembers details from past conversations using vector search, providing contextual responses.

### 📅 Smart Reminders
Automatically detects and creates reminders from conversation:
> "My grandson is visiting next Tuesday at 2pm"  
> → Reminder created automatically

### 🔐 Personal & Secure
Each user has their own memory space. Your memories stay private.

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **AI/LLM** | Google Gemini 2.0 Flash |
| **Memory (RAG)** | Pinecone Vector Database |
| **Voice Output** | ElevenLabs Text-to-Speech |
| **Voice Input** | Google Cloud Speech-to-Text |
| **Auth & Database** | Firebase (Auth + Firestore) |
| **AI Framework** | LangChain + Vertex AI |
| **Frontend** | React + Vite |
| **Backend** | Python + FastAPI |
| **Cloud** | Google Cloud Platform |

---

## 🏗️ Architecture
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Frontend │────▶│ Backend │────▶│ AI Service │
│ React + Vite │ │ FastAPI │ │ Gemini + RAG │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
│ │ │
▼ ▼ ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ ElevenLabs │ │ Firebase │ │ Pinecone │
│ TTS │ │ Auth + Store │ │ Vector Memory │
└─────────────────┘ └─────────────────┘ └─────────────────┘

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+
- Google Cloud account
- Firebase project
- Pinecone account
- ElevenLabs API key

### Frontend Setup
cd frontend
npm install
cp .env.example .env  # Add your API keys
npm run dev### Backend Setup
cd backend
pip install -r requirements.txt
cp .env.example .env  # Add your API keys
python -m uvicorn app.main:app --reload --port 3000---

## 👥 Team

Built with ❤️ for the hackathon.

---

## 📄 License

MIT License - feel free to use and adapt for your own projects.

