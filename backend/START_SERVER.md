# Starting the Backend Server

## Quick Start

The `ERR_CONNECTION_REFUSED` error means the backend server isn't running. Start it with:

```bash
cd backend
uvicorn app.main:app --reload --port 3000
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:3000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
🚀 Reminisce Backend starting up...
```

## Before Starting

Make sure you have:

1. **Installed dependencies**:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Installed ai_service package** (from project root):
   ```bash
   pip install -e ./ai_service
   ```

3. **Set up environment variables** (if needed):
   - Create `.env` file in `backend/` directory
   - Add any required API keys

4. **Authenticated with Google Cloud** (if using Vertex AI):
   ```bash
   gcloud auth application-default login
   ```

## Running the Server

### Development Mode (Recommended)
```bash
cd backend
uvicorn app.main:app --reload --port 3000
```

The `--reload` flag auto-reloads when you make code changes.

### Production Mode
```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 3000
```

## Verify It's Running

Open your browser and go to: http://localhost:3000/api/health

You should see a JSON response with the server status.

## Stopping the Server

Press `Ctrl+C` in the terminal where the server is running.

## Troubleshooting

### Port Already in Use
If port 3000 is already in use:
```bash
# Use a different port
uvicorn app.main:app --reload --port 3001
```

Then update your frontend `.env`:
```
VITE_API_URL=http://localhost:3001/api
```

### Module Not Found Errors
Make sure you've installed all dependencies and the ai_service package:
```bash
cd backend
pip install -r requirements.txt
cd ..
pip install -e ./ai_service
```

### Import Errors
Make sure you're running from the `backend/` directory or have the correct Python path set.

