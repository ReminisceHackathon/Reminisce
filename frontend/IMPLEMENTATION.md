# Frontend Implementation Guide

## ✅ Completed Features

### 1. ChatGPT-style UI (Chat Interface + Sidebar)
- ✅ Sidebar with chat history
- ✅ Main chat area with message bubbles
- ✅ Welcome screen with greeting
- ✅ Responsive layout

### 2. ElevenLabs API Integration
- ✅ Streaming text-to-speech service (`elevenLabsService.js`)
- ✅ Audio playback for AI responses
- ✅ Error handling and fallbacks
- ✅ Streaming support for minimal lag

**Location**: `src/services/elevenLabsService.js`

**Usage**:
```javascript
import { textToSpeechStream, playAudio } from '../services/elevenLabsService';

// Convert text to speech
await textToSpeechStream(
  text,
  (chunk) => { /* handle chunk */ },
  (audioUrl) => { /* handle completion */ },
  (error) => { /* handle error */ }
);
```

### 3. Microphone Permissions & Audio Visualization
- ✅ Microphone permission handling
- ✅ Audio recording with MediaRecorder API
- ✅ Real-time audio level visualization
- ✅ Visual feedback when listening
- ✅ Recording state management

**Location**: `src/hooks/useMicrophone.js`

**Features**:
- Automatic permission request
- Audio level monitoring
- Recording start/stop
- Cleanup on unmount

**Usage**:
```javascript
const {
  isRecording,
  audioLevel,
  permissionGranted,
  requestPermission,
  startRecording,
  stopRecording,
} = useMicrophone();
```

### 4. Audio Visualization Component
- ✅ Waveform visualization
- ✅ Recording indicator
- ✅ Real-time audio level display
- ✅ Responsive sizing

**Location**: `src/components/AudioVisualizer.jsx`

**Props**:
- `audioLevel`: Number (0-1) - Current audio level
- `isRecording`: Boolean - Recording state
- `size`: 'large' | 'small' - Component size

### 5. Accessibility Features
- ✅ Large buttons (minimum 48px touch targets)
- ✅ High contrast (white background, dark text)
- ✅ Large fonts (18px base size)
- ✅ Clear visual feedback
- ✅ ARIA labels for screen readers
- ✅ Keyboard navigation support

**Accessibility Improvements**:
- Microphone button: 100px (welcome) / 48px (input)
- Send button: 48px
- Input text: 18px
- Message text: 18px
- Line height: 1.6 for better readability
- High contrast mode support

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the frontend root:

```env
VITE_ELEVENLABS_API_KEY=your_api_key_here
VITE_ELEVENLABS_VOICE_ID=your_voice_id_here
VITE_API_URL=http://localhost:3000/api
```

### ElevenLabs Voice Setup

For seniors, create a custom voice in ElevenLabs with:
- **Slow pace**: 0.7-0.8 speed
- **Clear pronunciation**: High clarity settings
- **Soothing tone**: Warm, friendly voice
- **Stability**: 0.5-0.6 for consistency

## 🔌 Backend Integration Points

### 1. Audio Transcription
Currently simulated in `Dashboard.jsx`:
```javascript
// Replace this with actual API call
const response = await fetch(`${API_URL}/transcribe`, {
  method: 'POST',
  body: audioBlob,
});
```

### 2. Gemini API Integration
Currently simulated in `simulateGeminiResponse`:
```javascript
// Replace with actual Gemini API call
const response = await fetch(`${API_URL}/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: userMessage }),
});
```

## 📱 User Flow

1. **Welcome Screen**:
   - User sees greeting and large microphone button
   - Clicks microphone → requests permission (if needed)
   - Starts recording → shows audio visualization

2. **Recording**:
   - Audio visualization shows listening state
   - User speaks
   - Clicks stop → processes audio

3. **Processing**:
   - Shows "Processing..." indicator
   - Sends audio to backend for transcription
   - Gets response from Gemini

4. **Response**:
   - Displays text response
   - Converts to speech using ElevenLabs
   - Plays audio automatically

## 🎨 UI States

- **Idle**: Welcome screen with microphone button
- **Recording**: Red microphone button + audio visualization
- **Processing**: Spinner + "Processing..." text
- **Playing Audio**: Wave animation on bot message
- **Error**: Permission error message with retry button

## 🚀 Next Steps

1. **Connect to Backend**:
   - Replace `simulateGeminiResponse` with actual API call
   - Implement audio transcription endpoint
   - Add photo upload for "Who is this?" feature

2. **Enhancements**:
   - Add conversation history persistence
   - Implement photo analysis UI
   - Add settings for voice speed/volume
   - Add offline mode support

3. **Testing**:
   - Test with actual ElevenLabs voice
   - Test microphone on different devices
   - Test with seniors for usability
   - Test accessibility with screen readers

## 📝 Notes

- All audio is streamed to minimize lag
- Microphone automatically requests permission on mount
- Audio visualization provides clear feedback
- Large touch targets ensure easy interaction for seniors
- High contrast design improves readability

