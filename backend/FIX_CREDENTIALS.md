# Fix: Google Cloud Credentials Error

## The Problem

The backend is failing with:
```
google.auth.exceptions.DefaultCredentialsError: Your default credentials were not found.
```

This happens because Firebase/Firestore needs Google Cloud credentials to connect.

## Solution: Authenticate with Google Cloud

Run this command:

```bash
gcloud auth application-default login
```

This will:
1. Open a browser window
2. Ask you to sign in with your Google account
3. Grant permissions for Application Default Credentials
4. Save credentials locally

## After Authentication

Once you've authenticated, try starting the backend again:

```bash
cd backend
python3 -m uvicorn app.main:app --reload --port 3000
```

## Verify It Worked

After running `gcloud auth application-default login`, you should see:
```
Credentials saved to file: [path to credentials file]
```

Then the backend should start without the credentials error.

## If You Don't Have gcloud Installed

If the `gcloud` command is not found, you need to install the Google Cloud SDK:

1. **Install gcloud CLI:**
   - macOS: `brew install google-cloud-sdk`
   - Or download from: https://cloud.google.com/sdk/docs/install

2. **Then authenticate:**
   ```bash
   gcloud auth application-default login
   ```

## Using Firebase Service Account Key (Alternative)

If you have a Firebase service account JSON key file, you can use that instead:

1. Download the service account key from Firebase Console
2. Save it somewhere secure (e.g., `backend/firebase-key.json`)
3. Set the environment variable:
   ```bash
   export FIREBASE_CREDENTIALS_PATH=/path/to/firebase-key.json
   ```
4. Or update `backend/app/config.py` to point to the key file

But for development, `gcloud auth application-default login` is usually easier.

