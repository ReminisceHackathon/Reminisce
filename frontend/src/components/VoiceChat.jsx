import React, { useState, useEffect, useRef } from 'react';
import './VoiceChat.css';
import { useMicrophone } from '../hooks/useMicrophone';
import { textToSpeechStream } from '../services/elevenLabsService';
import { speechToText } from '../services/speechToTextService';

const VoiceChat = ({ onClose, onMessage }) => {
  const [status, setStatus] = useState('idle'); // idle, listening, processing, speaking
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [error, setError] = useState(null);
  
  const audioRef = useRef(null);
  const silenceTimeoutRef = useRef(null);

  const {
    isRecording,
    audioLevel,
    permissionGranted,
    permissionError,
    requestPermission,
    startRecording,
    stopRecording,
  } = useMicrophone();

  useEffect(() => {
    // Request mic permission on mount
    if (!permissionGranted && !permissionError) {
      requestPermission();
    }
  }, []);

  // Auto-start listening when permission is granted
  useEffect(() => {
    if (permissionGranted && status === 'idle') {
      handleStartListening();
    }
  }, [permissionGranted]);

  const handleStartListening = async () => {
    setStatus('listening');
    setTranscript('');
    setResponse('');
    setError(null);
    await startRecording();
  };

  const handleStopListening = async () => {
    const audioBlob = await stopRecording();
    
    if (audioBlob) {
      setStatus('processing');
      
      try {
        // Transcribe audio
        const transcribedText = await speechToText(audioBlob);
        
        if (transcribedText && transcribedText.trim()) {
          setTranscript(transcribedText);
          
          // Send to API
          const apiResponse = await sendMessageToAPI(transcribedText);
          setResponse(apiResponse);
          
          // Notify parent
          if (onMessage) {
            onMessage({
              user: transcribedText,
              assistant: apiResponse
            });
          }
          
          // Play response
          await playResponse(apiResponse);
        } else {
          setError("Couldn't hear that. Tap to try again.");
          setStatus('idle');
        }
      } catch (err) {
        console.error('Voice chat error:', err);
        setError('Something went wrong. Tap to try again.');
        setStatus('idle');
      }
    }
  };

  const sendMessageToAPI = async (message) => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    
    const response = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: 'demo_user',
        message: message,
        history: []
      }),
    });

    if (!response.ok) throw new Error('API error');
    
    const data = await response.json();
    return data.response;
  };

  const playResponse = async (text) => {
    setStatus('speaking');
    
    try {
      await textToSpeechStream(
        text,
        () => {}, // chunk callback
        (audioUrl) => {
          const audio = new Audio(audioUrl);
          audioRef.current = audio;
          
          audio.onended = () => {
            setStatus('idle');
            URL.revokeObjectURL(audioUrl);
            // Auto-restart listening after response
            setTimeout(() => {
              if (status !== 'listening') {
                handleStartListening();
              }
            }, 500);
          };
          
          audio.onerror = () => {
            setStatus('idle');
          };
          
          audio.play();
        },
        (error) => {
          console.error('TTS error:', error);
          setStatus('idle');
        }
      );
    } catch (err) {
      console.error('Playback error:', err);
      setStatus('idle');
    }
  };

  const handleOrbClick = () => {
    if (status === 'listening') {
      handleStopListening();
    } else if (status === 'idle') {
      handleStartListening();
    } else if (status === 'speaking' && audioRef.current) {
      audioRef.current.pause();
      setStatus('idle');
    }
  };

  const handleClose = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (isRecording) {
      stopRecording();
    }
    onClose();
  };

  // Calculate orb scale based on audio level
  const orbScale = status === 'listening' 
    ? 1 + (audioLevel * 0.3) 
    : status === 'speaking' 
      ? 1.1 + Math.sin(Date.now() / 200) * 0.1
      : 1;

  const getStatusText = () => {
    switch (status) {
      case 'listening': return 'Listening...';
      case 'processing': return 'Thinking...';
      case 'speaking': return 'Speaking...';
      default: return 'Tap to speak';
    }
  };

  return (
    <div className="voice-chat-overlay">
      {/* Background gradient animation */}
      <div className={`voice-chat-bg ${status}`}>
        <div className="gradient-orb gradient-1"></div>
        <div className="gradient-orb gradient-2"></div>
        <div className="gradient-orb gradient-3"></div>
      </div>

      {/* Close button */}
      <button className="voice-close-btn" onClick={handleClose}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Main content */}
      <div className="voice-chat-content">
        {/* The Orb */}
        <div 
          className={`voice-orb ${status}`}
          onClick={handleOrbClick}
          style={{ transform: `scale(${orbScale})` }}
        >
          <div className="orb-inner">
            <div className="orb-glow"></div>
            <div className="orb-ring ring-1"></div>
            <div className="orb-ring ring-2"></div>
            <div className="orb-ring ring-3"></div>
            <div className="orb-core"></div>
          </div>
          
          {/* Audio visualization bars */}
          {status === 'listening' && (
            <div className="audio-bars">
              {[...Array(5)].map((_, i) => (
                <div 
                  key={i} 
                  className="audio-bar"
                  style={{ 
                    height: `${20 + audioLevel * 60 * Math.random()}px`,
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Status text */}
        <div className="voice-status">
          <span className={`status-text ${status}`}>{getStatusText()}</span>
        </div>

        {/* Transcript/Response display */}
        <div className="voice-transcript">
          {transcript && (
            <p className="user-text">"{transcript}"</p>
          )}
          {response && status === 'speaking' && (
            <p className="assistant-text">{response}</p>
          )}
          {error && (
            <p className="error-text">{error}</p>
          )}
        </div>

        {/* Permission error */}
        {permissionError && (
          <div className="permission-prompt">
            <p>Microphone access is required</p>
            <button onClick={requestPermission}>Allow Microphone</button>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="voice-controls">
        <button 
          className={`control-btn ${status === 'listening' ? 'active' : ''}`}
          onClick={handleOrbClick}
          disabled={status === 'processing'}
        >
          {status === 'listening' ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>
            </svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 1C10.34 1 9 2.34 9 4V12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12V4C15 2.34 13.66 1 12 1Z" fill="currentColor"/>
              <path d="M19 10V12C19 15.87 15.87 19 12 19C8.13 19 5 15.87 5 12V10H7V12C7 14.76 9.24 17 12 17C14.76 17 17 14.76 17 12V10H19Z" fill="currentColor"/>
              <path d="M11 22H13V19H11V22Z" fill="currentColor"/>
            </svg>
          )}
        </button>
        
        <button className="end-call-btn" onClick={handleClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 9C10.4 9 8.85 9.25 7.4 9.72V12.82C7.4 13.22 7.17 13.56 6.84 13.72C5.86 14.21 4.97 14.84 4.18 15.57C3.95 15.8 3.59 15.8 3.36 15.57L1.29 13.5C1.06 13.26 1.06 12.9 1.29 12.67C4.45 9.5 8.35 7.5 12 7.5C15.65 7.5 19.55 9.5 22.71 12.67C22.94 12.9 22.94 13.26 22.71 13.5L20.64 15.57C20.41 15.8 20.05 15.8 19.82 15.57C19.03 14.84 18.14 14.21 17.16 13.72C16.83 13.56 16.6 13.21 16.6 12.82V9.72C15.15 9.25 13.6 9 12 9Z" fill="currentColor"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default VoiceChat;

