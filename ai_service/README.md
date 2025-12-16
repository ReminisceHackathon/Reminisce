# Reminisce AI Service

The AI "Brain" for Reminisce - a stateless Python package that provides intelligent responses with long-term memory for seniors.

## Status

| Component | Status |
|-----------|--------|
| Dependencies | Installed |
| Pinecone API Key | Configured |
| GCP Project | `reminisce-hackathon` |
| Google Auth | Authenticated |
| Pinecone Index | **Create in Pinecone Console** |

## Architecture

```
FastAPI Backend                    AI Service (this package)
      │                                    │
      │  generate_response()               │
      ├───────────────────────────────────►│
      │                                    │
      │                            ┌───────┴───────┐
      │                            │  Pinecone     │
      │                            │  (memories)   │
      │                            └───────┬───────┘
      │                                    │
      │                            ┌───────┴───────┐
      │                            │  Gemini 1.5   │
      │                            │  Pro          │
      │                            └───────┬───────┘
      │                                    │
      │◄───────────────────────────────────┤
      │  response string                   │
      │                                    │
      │            (background thread)     │
      │                            ┌───────┴───────┐
      │                            │  Extract &    │
      │                            │  Save Facts   │
      │                            └───────────────┘
```

## Quick Start

### 1. Install Dependencies

```bash
cd ai_service
pip install -r requirements.txt
```

### 2. Configuration (Already Set Up)

The following are pre-configured in `config.py`:

| Setting | Value |
|---------|-------|
| Pinecone Index | `reminisce-memories` |
| GCP Project | `reminisce-hackathon` |
| GCP Location | `us-central1` |
| Embedding Model | `text-embedding-004` |
| LLM Model | `gemini-1.5-pro` |

To override defaults, set environment variables:
```bash
export PINECONE_API_KEY="your-key"
export GCP_PROJECT_ID="your-project"
```

### 3. Google Cloud Authentication (Required)

```bash
gcloud auth application-default login
```

### 4. Create Pinecone Index

Create an index in [Pinecone Console](https://app.pinecone.io/):
- **Name**: `reminisce-memories`
- **Dimensions**: `768`
- **Metric**: `cosine`

### 5. Use in FastAPI

```python
from ai_service import ReminisceBrain

# Initialize once at startup
brain = ReminisceBrain()

@app.post("/chat")
async def chat(user_id: str, message: str, history: list[str]):
    response = brain.generate_response(
        user_id=user_id,
        message=message,
        history=history
    )
    return {"response": response}
```

## API Reference

### ReminisceBrain

The main class for generating responses.

#### `__init__(temperature=0.7, max_output_tokens=1024, custom_system_prompt=None)`

Initialize the brain.

- `temperature`: LLM creativity (0.0-1.0). Default 0.7.
- `max_output_tokens`: Maximum response length.
- `custom_system_prompt`: Override the default personality prompt.

#### `generate_response(user_id, message, history, include_memories=True, extract_facts=True)`

Generate a response with RAG.

**Parameters:**
- `user_id` (str): Firebase user ID. Used as Pinecone namespace.
- `message` (str): Current user message.
- `history` (list[str]): Recent messages like `["user: Hello", "assistant: Hi!"]`
- `include_memories` (bool): Search Pinecone for context. Default True.
- `extract_facts` (bool): Extract facts in background. Default True.

**Returns:** Response string.

#### `generate_response_sync(user_id, message, history, include_memories=True)`

Synchronous version that returns facts immediately.

**Returns:** `{"response": "...", "extracted_facts": ["fact1", "fact2"]}`

#### `health_check()`

Test connectivity to Gemini and Pinecone.

**Returns:** `{"brain": "ok", "llm": "ok", "pinecone": "ok (vectors: 123)"}`

### Memory Functions

For advanced usage, you can directly use memory functions:

```python
from ai_service import (
    search_memories,
    save_memory,
    delete_user_memories,
    get_memory_stats,
)

# Search for relevant memories
memories = search_memories("daughter visiting", user_id="user123")

# Manually save a memory
save_memory("User's daughter Sarah lives in Ohio", user_id="user123", 
            metadata={"category": "family"})

# Get user's memory stats
stats = get_memory_stats(user_id="user123")

# Delete all user memories (for GDPR, etc.)
delete_user_memories(user_id="user123")
```

## How It Works

### 1. Memory Retrieval (RAG)
When a user sends a message, we:
1. Embed the message using Vertex AI `text-embedding-004`
2. Query Pinecone using the `user_id` as namespace
3. Return memories with similarity score > 0.7

### 2. Response Generation
The prompt combines:
1. **System Prompt**: Personality for interacting with seniors
2. **Long-Term Memory**: Relevant facts from Pinecone
3. **Recent History**: Last 10 messages from Firebase
4. **Current Message**: What the user just said

### 3. Fact Extraction (Background)
After responding, we spawn a background thread that:
1. Sends the conversation to Gemini
2. Extracts personal facts (family, places, preferences, etc.)
3. Saves them to Pinecone for future retrieval

## Memory Categories

Facts are categorized for better organization:
- `family`: Family members, relationships
- `place`: Locations, residences
- `preference`: Likes, dislikes, routines
- `event`: Appointments, anniversaries, dates
- `health`: Medical information (handled carefully)
- `history`: Life history, career, education

## Configuration

All settings are in `config.py`:

| Variable | Value | Description |
|----------|-------|-------------|
| `PINECONE_INDEX_NAME` | `reminisce-memories` | Pinecone index name |
| `GCP_PROJECT_ID` | `reminisce-hackathon` | Google Cloud project |
| `GCP_LOCATION` | `us-central1` | Google Cloud region |
| `EMBEDDING_MODEL` | `text-embedding-004` | Vertex AI embedding model |
| `LLM_MODEL` | `gemini-1.5-pro` | Gemini model for responses |
| `MEMORY_RELEVANCE_THRESHOLD` | `0.7` | Min similarity for retrieval |
| `MEMORY_TOP_K` | `5` | Max memories to retrieve |
| `MAX_HISTORY_MESSAGES` | `10` | History messages in prompt |

## Testing

```python
from ai_service import ReminisceBrain

brain = ReminisceBrain()

# Health check
print(brain.health_check())

# Test response
response = brain.generate_response(
    user_id="test_user",
    message="Hello, my name is John and my daughter Sarah is visiting tomorrow.",
    history=[]
)
print(response)

# Check if facts were saved (sync version)
result = brain.generate_response_sync(
    user_id="test_user",
    message="I love gardening and jazz music.",
    history=[]
)
print(f"Response: {result['response']}")
print(f"Extracted facts: {result['extracted_facts']}")
```

## Error Handling

The service is designed to be resilient:
- If Pinecone fails, responses are generated without memory context
- If fact extraction fails, the response is still returned
- All errors are logged for debugging

## Notes for Backend Integration

1. **Stateless Design**: This package doesn't manage conversation state. Pass the history from Firebase each time.

2. **User Isolation**: All Pinecone data is namespaced by `user_id`. Never mix user data.

3. **Background Threads**: Fact extraction runs in daemon threads. In production, consider using a task queue (Celery, Cloud Tasks) for reliability.

4. **Rate Limiting**: The Gemini and Pinecone APIs have rate limits. Add retry logic in production.

