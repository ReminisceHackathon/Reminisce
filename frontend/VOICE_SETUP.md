# Voice Selection Setup Guide

## Overview

Reminisce now supports **multiple voice selection**, allowing users to choose from different ElevenLabs voices. This is especially useful for seniors who may prefer different voice characteristics.

## Features

✅ **Voice Selection UI** - Easy-to-use settings panel  
✅ **Voice Preview** - Test voices before selecting  
✅ **Persistent Storage** - Selected voice saved in localStorage  
✅ **Accessible Design** - Large buttons, clear labels for seniors  
✅ **Default Voices** - Pre-configured popular voices  
✅ **Custom Voices** - Add your own custom voices  

## How It Works

1. **User clicks "Voice Settings"** button in sidebar
2. **Modal opens** showing available voices
3. **User selects a voice** - large, accessible buttons
4. **User can preview** - test the voice with custom text
5. **Selection is saved** - persists across sessions
6. **All AI responses** use the selected voice

## Adding Custom Voices

### Option 1: Via Environment Variable (Default Voice)

Add to `.env`:
```env
VITE_ELEVENLABS_VOICE_ID=your_custom_voice_id
```

This voice will appear first in the list.

### Option 2: Via Code (Multiple Custom Voices)

Edit `src/services/elevenLabsService.js`:

```javascript
export const getDefaultVoices = () => {
  return [
    // Your custom voices
    { 
      voice_id: 'your_voice_id_1', 
      name: 'Grandma Voice', 
      description: 'Warm, slow-paced voice for seniors' 
    },
    { 
      voice_id: 'your_voice_id_2', 
      name: 'Calm Companion', 
      description: 'Soothing, reassuring voice' 
    },
    // Default ElevenLabs voices
    { voice_id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', ... },
    // ... more voices
  ];
};
```

### Option 3: Via ElevenLabs API (Automatic)

The app automatically fetches voices from your ElevenLabs account. If the API call fails, it falls back to default voices.

## Creating Custom Voices for Seniors

When creating voices in ElevenLabs, consider:

1. **Slow Pace**: 0.7-0.8 speed (slower than default)
2. **Clear Pronunciation**: High clarity settings
3. **Warm Tone**: Friendly, non-intimidating
4. **Stability**: 0.5-0.6 for consistency
5. **Volume**: Slightly louder for hearing difficulties

### Steps to Create Custom Voice:

1. Go to ElevenLabs → Voice Library
2. Click "Add Voice" → "Create Voice"
3. Use Voice Design or Voice Cloning
4. Adjust settings for seniors:
   - **Stability**: 0.5-0.6
   - **Similarity Boost**: 0.75
   - **Style**: 0.0 (neutral)
   - **Speaker Boost**: Enabled
5. Test with sample text
6. Copy the Voice ID
7. Add to your code or `.env`

## Voice Selection UI

The voice settings modal includes:

- **Large buttons** (accessible for seniors)
- **Voice descriptions** (help users choose)
- **Selected indicator** (shows current choice)
- **Preview functionality** (test before selecting)
- **Persistent storage** (remembers selection)

## Technical Details

### Storage
- Voice selection stored in `localStorage` as `reminisce_voice_id`
- Persists across browser sessions
- Falls back to `.env` variable if no selection

### API Integration
- Fetches voices from ElevenLabs API on modal open
- Falls back to default voices if API fails
- Uses selected voice ID in all TTS requests

### Accessibility
- Minimum 48px touch targets
- High contrast (white background, dark text)
- Large fonts (18-20px)
- Clear labels and descriptions
- Keyboard navigation support

## Example Usage

```javascript
// In Dashboard.jsx
const handleVoiceChange = (voiceId, previewText) => {
  setSelectedVoiceId(voiceId);
  if (previewText) {
    playBotResponse(previewText, voiceId);
  }
};
```

## Troubleshooting

### Voices not loading?
- Check ElevenLabs API key in `.env`
- Check browser console for errors
- App will fall back to default voices

### Voice not working?
- Verify voice ID is correct
- Check ElevenLabs API quota
- Ensure voice is accessible with your API key

### Preview not playing?
- Check browser audio permissions
- Verify ElevenLabs API is working
- Check console for errors

## Best Practices

1. **Create 3-5 voices** for variety
2. **Test each voice** with sample text
3. **Use descriptive names** (e.g., "Calm Female", "Warm Male")
4. **Optimize for seniors** (slow, clear, warm)
5. **Save voice IDs** in a safe place

