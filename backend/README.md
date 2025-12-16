# Reminisce Backend API

FastAPI backend for the Reminisce voice-first memory aid application.

## Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app entry point
│   ├── config.py            # Environment configuration
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── chat.py          # /api/chat endpoint
│   │   └── transcribe.py    # /api/transcribe endpoint
│   └── services/
│       ├── __init__.py
│       ├── speech_service.py    # Google Cloud STT
│       └── firebase_service.py  # Firebase integration
├── requirements.txt
├── .env.example
├── .env                     # Your actual env vars (gitignored)
└── README.md
```

## Setup

### 1. Create virtual environment (optional but recommended)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

### 2. Install AI service as editable package

```bash
cd /path/to/Reminisce
pip install -e ./ai_service
```

### 3. Install backend dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 4. Configure environment variables

```bash
cp .env.example .env
# Edit .env with your actual values
```

Required variables:
- `PINECONE_API_KEY`: Your Pinecone API key
- `GCP_PROJECT_ID`: Google Cloud project ID

### 5. Authenticate with Google Cloud

```bash
gcloud auth application-default login
```

## Running the Server

### Development mode (with auto-reload)

```bash
uvicorn app.main:app --reload --port 3000
```

### Production mode

```bash
uvicorn app.main:app --host 0.0.0.0 --port 3000
```

## API Endpoints

### Health Check

```bash
GET /api/health
```

Returns service status.

### Chat

```bash
POST /api/chat
Content-Type: application/json

{
    "user_id": "firebase_user_123",
    "message": "Who is coming to visit today?",
    "history": ["user: Hello", "assistant: Hi! How can I help?"]
}
```

Returns AI response using ReminisceBrain with RAG.

### Transcribe

```bash
POST /api/transcribe
Content-Type: multipart/form-data

audio: <audio file in WebM/Opus format>
```

Returns transcribed text from audio.

## Testing

### Test health endpoint

```bash
curl http://localhost:3000/api/health
```

### Test chat endpoint

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user",
    "message": "Hello, my name is John",
    "history": []
  }'
```

### Test transcription endpoint

```bash
curl -X POST http://localhost:3000/api/transcribe \
  -F "audio=@test_audio.webm"
```

## Frontend Integration

The frontend should set the `VITE_API_URL` environment variable:

```env
VITE_API_URL=http://localhost:3000/api
```

## Dependencies

- **FastAPI**: Web framework
- **Uvicorn**: ASGI server
- **google-cloud-speech**: Speech-to-text transcription
- **ai_service**: Local package for ReminisceBrain (Gemini + Pinecone)

