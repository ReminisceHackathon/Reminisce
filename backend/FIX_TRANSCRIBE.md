# Fix: Transcription 400 Bad Request Error

## The Problem

The `/api/transcribe` endpoint is returning a 400 Bad Request error. This could be due to:

1. **Google Cloud Speech-to-Text API not enabled**
2. **Missing credentials or insufficient permissions**
3. **Audio format issues**

## Check Backend Logs

First, check the backend terminal logs. The error message should tell you what's wrong. Look for lines like:
```
ERROR: Speech service error details: ...
```

## Common Fixes

### 1. Enable Google Cloud Speech-to-Text API

The Speech-to-Text API needs to be enabled in your Google Cloud project:

```bash
# Enable the API
gcloud services enable speech.googleapis.com --project=reminisce-hackathon
```

Or via the console:
- Go to: https://console.cloud.google.com/apis/library/speech.googleapis.com
- Select your project: `reminisce-hackathon`
- Click "Enable"

### 2. Verify Credentials

Make sure you've authenticated:
```bash
gcloud auth application-default login
```

### 3. Check Project ID

Make sure the project ID is correct. Check `backend/app/config.py`:
```python
GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID", "reminisce-hackathon")
```

You can override it with an environment variable:
```bash
export GCP_PROJECT_ID=reminisce-hackathon
```

### 4. Test with a Simple Audio File

Try testing the endpoint directly:
```bash
# Create a test audio file (you'll need one)
curl -X POST http://localhost:3000/api/transcribe \
  -F "audio=@test-audio.webm"
```

## Debugging

Check the backend terminal output when you try to transcribe. The logs should show:
- Audio file size
- Content type
- Detailed error messages from the Speech service

## If Still Not Working

1. **Check backend logs** - they'll show the exact error
2. **Verify API is enabled** - Make sure Speech-to-Text API is enabled in Google Cloud Console
3. **Check billing** - Some Google Cloud APIs require billing to be enabled (even for free tier)
4. **Ask your teammate** - They might have additional setup steps or different project settings

