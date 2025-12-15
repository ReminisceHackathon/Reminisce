# Reminisce Frontend

Voice-first memory aid application frontend built with React.

## Features

- ✅ ChatGPT-style UI (Chat interface + Sidebar)
- ✅ ElevenLabs API integration for streaming audio
- ✅ Microphone permissions and audio visualization
- ✅ Accessibility features (large buttons, high contrast for seniors)
- ✅ Voice recording and playback
- ✅ Real-time audio visualization

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

3. Add your ElevenLabs API credentials to `.env`:
```
VITE_ELEVENLABS_API_KEY=your_api_key
VITE_ELEVENLABS_VOICE_ID=your_voice_id
```

4. Start the development server:
```bash
npm run dev
```

## Environment Variables

- `VITE_ELEVENLABS_API_KEY`: Your ElevenLabs API key
- `VITE_ELEVENLABS_VOICE_ID`: Your custom voice ID (designed for seniors)
- `VITE_API_URL`: Backend API URL (for Gemini/Vertex AI integration)

## Project Structure

```
src/
├── components/
│   ├── Dashboard.jsx          # Main dashboard component
│   ├── Dashboard.css          # Dashboard styles
│   ├── AudioVisualizer.jsx    # Audio visualization component
│   └── AudioVisualizer.css    # Visualizer styles
├── hooks/
│   └── useMicrophone.js       # Microphone recording hook
├── services/
│   └── elevenLabsService.js   # ElevenLabs API service
└── App.jsx                     # Root component
```

## Key Features for Seniors

- **Large buttons**: Minimum 48px touch targets
- **High contrast**: White background with dark text
- **Large fonts**: 18px base font size
- **Clear visual feedback**: Audio visualization when listening
- **Voice-first**: Large microphone button for easy access

## Integration with Backend

The frontend is designed to work with a backend that:
1. Receives audio blobs for transcription
2. Processes requests with Gemini 1.5 Pro
3. Returns text responses
4. The frontend then converts responses to speech using ElevenLabs

## Next Steps

1. Connect to your backend API for Gemini integration
2. Implement actual audio transcription (currently simulated)
3. Add photo upload functionality for "Who is this?" feature
4. Test with actual ElevenLabs voice designed for seniors
