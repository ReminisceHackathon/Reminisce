# Fix: Speech API 403 Error - Quota Project Required

## The Problem

You're getting a 403 error because:
1. **Speech-to-Text API requires a quota project** for Application Default Credentials
2. The quota project is not set

## Solution

You need to set the quota project. Run this command in your terminal:

```bash
gcloud auth application-default set-quota-project reminisce-hackathon-b44cb
```

This tells Google Cloud which project to use for quota/billing when using Application Default Credentials.

## Enable Speech-to-Text API (if not already enabled)

You also need to make sure the Speech-to-Text API is enabled:

```bash
gcloud services enable speech.googleapis.com --project=reminisce-hackathon-b44cb
```

Or enable it via the console:
- Go to: https://console.cloud.google.com/apis/library/speech.googleapis.com?project=reminisce-hackathon-b44cb
- Click "Enable"

## Alternative: Use Environment Variable

If the `gcloud` command doesn't work, you can set the quota project via environment variable. However, this is less ideal:

```bash
export GOOGLE_CLOUD_PROJECT=reminisce-hackathon-b44cb
export GCP_PROJECT_ID=reminisce-hackathon-b44cb
```

But the `gcloud auth application-default set-quota-project` command is the recommended approach.

## After Setting Quota Project

1. **Restart your backend server:**
   ```bash
   # Stop the server (Ctrl+C)
   # Then restart:
   cd backend
   python3 -m uvicorn app.main:app --reload --port 3000
   ```

2. **Test transcription again** - it should work now!

## If gcloud Command Fails

If you get permission errors with gcloud, you might need to:
1. Reinstall gcloud CLI
2. Or ask your teammate to set up the quota project for you
3. Or use a service account key file instead of Application Default Credentials

