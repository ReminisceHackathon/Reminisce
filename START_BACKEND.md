# How to Start the Backend Server

## Quick Start

The backend is **NOT running**. Here's how to start it:

### Step 1: Navigate to backend directory
```bash
cd backend
```

### Step 2: Start the server
```bash
python3 -m uvicorn app.main:app --reload --port 3000
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:3000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
🚀 Reminisce Backend starting up...
```

### Step 3: Verify it's running
Open in browser: http://localhost:3000/api/health

Or in terminal:
```bash
curl http://localhost:3000/api/health
```

## First Time Setup (if you haven't done this)

If you get errors about missing packages, run these first:

1. **Install backend dependencies:**
   ```bash
   cd backend
   pip3 install -r requirements.txt
   ```

2. **Install ai_service package:**
   ```bash
   # From the Reminisce root directory
   pip3 install -e ./ai_service
   ```

3. **Then start the server:**
   ```bash
   cd backend
   python3 -m uvicorn app.main:app --reload --port 3000
   ```

## Using the Startup Script

Alternatively, you can use the startup script:

```bash
cd backend
./start.sh
```

This will automatically check for dependencies and start the server.

## Keeping It Running

- The server will keep running until you press `Ctrl+C`
- Use `--reload` flag for auto-reload when you make code changes
- Keep this terminal window open while developing

## Running Both Frontend and Backend

You need **TWO terminal windows**:

**Terminal 1 - Backend:**
```bash
cd backend
python3 -m uvicorn app.main:app --reload --port 3000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Both need to be running for the app to work!

