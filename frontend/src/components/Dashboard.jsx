import React, { useState, useEffect, useRef } from 'react';
import './Dashboard.css';
import { useMicrophone } from '../hooks/useMicrophone';
import AudioVisualizer from './AudioVisualizer';
import { textToSpeechStream } from '../services/elevenLabsService';
import { speechToText } from '../services/speechToTextService';
import VoiceSettings from './VoiceSettings';

const Dashboard = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [selectedVoiceId, setSelectedVoiceId] = useState(
    localStorage.getItem('reminisce_voice_id') || ''
  );
  const [chatHistory, setChatHistory] = useState([
    { id: 1, title: 'New Chat', preview: 'Hello! How can I help...' },
  ]);

  const {
    isRecording,
    audioLevel,
    permissionGranted,
    permissionError,
    requestPermission,
    startRecording,
    stopRecording,
  } = useMicrophone();

  const messagesEndRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    requestPermission();
  }, []);

  const handleVoiceRecord = async () => {
    if (isRecording) {
      const audioBlob = await stopRecording();
      
      if (audioBlob) {
        setIsProcessing(true);
        try {
          const transcribedText = await speechToText(audioBlob);
          
          if (transcribedText && transcribedText.trim()) {
            handleSendMessage(transcribedText, true);
          } else {
            setIsProcessing(false);
            alert('Could not transcribe audio. Please try again.');
          }
        } catch (error) {
          console.error('Transcription error:', error);
          setIsProcessing(false);
          alert('Error transcribing audio. Please try again.');
        }
      }
    } else {
      await startRecording();
    }
  };

  const handleSendMessage = async (text = null, isVoice = false) => {
    const messageText = text || inputValue.trim();
    
    if (!messageText) return;

    const newMessage = {
      id: Date.now(),
      text: messageText,
      sender: 'user',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    if (!isVoice) {
      setInputValue('');
    }
    
    setIsProcessing(true);

    try {
      const response = await simulateGeminiResponse(messageText);
      
      const botMessage = {
        id: Date.now() + 1,
        text: response.text,
        sender: 'bot',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, botMessage]);
      if (response.text) {
        await playBotResponse(response.text);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: 'Sorry, I encountered an error. Please try again.',
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const simulateGeminiResponse = async (userMessage) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const responses = {
      'who is coming to visit today': 'Based on your calendar, your daughter Sarah is coming to visit today at 3 PM.',
      'tell me about the time i lived in ohio': 'You lived in Ohio from 1985 to 1992. You worked as a teacher and have fond memories of the community there.',
      default: 'I understand. Let me help you with that. Can you tell me more?', //this is a default response, replace with actual API call (Epaphras)
    };
    
    const lowerMessage = userMessage.toLowerCase();
    const response = Object.keys(responses).find(key => lowerMessage.includes(key));
    
    return {
      text: responses[response] || responses.default,
    };
  };
  const playBotResponse = async (text, voiceId = null) => {
    try {
      setIsPlayingAudio(true);
      
      const audioChunks = [];
      await textToSpeechStream(
        text,
        (chunk) => {
          audioChunks.push(chunk);
        },
        (audioUrl) => {
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = '';
          }
          
          const audio = new Audio(audioUrl);
          audioRef.current = audio;
          
          audio.onended = () => {
            setIsPlayingAudio(false);
            URL.revokeObjectURL(audioUrl);
          };
          
          audio.onerror = () => {
            setIsPlayingAudio(false);
            console.error('Audio playback error');
          };
          
          audio.play();
        },
        (error) => {
          console.error('TTS error:', error);
          setIsPlayingAudio(false);
        },
        voiceId || selectedVoiceId
      );
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlayingAudio(false);
    }
  };

  const handleVoiceChange = (voiceId, previewText = null) => {
    setSelectedVoiceId(voiceId);
    if (previewText) {
      playBotResponse(previewText, voiceId);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleSendMessage();
  };

  const handleNewChat = () => {
    setMessages([]);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlayingAudio(false);
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <button className="new-chat-btn" onClick={handleNewChat}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 4V20M4 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            New chat
          </button>
        </div>
        
        <div className="chat-history">
          <div className="history-header">Recent</div>
          {chatHistory.map((chat) => (
            <div key={chat.id} className="chat-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="chat-icon">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <div className="chat-item-content">
                <div className="chat-title">{chat.title}</div>
                <div className="chat-preview">{chat.preview}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <button 
            className="voice-settings-btn"
            onClick={() => setShowVoiceSettings(true)}
            aria-label="Voice settings"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" fill="currentColor"/>
            </svg>
            <span>Voice Settings</span>
          </button>
          <div className="user-profile">
            <div className="avatar">U</div>
            <span className="username">User</span>
          </div>
        </div>
      </aside>
      <VoiceSettings
        isOpen={showVoiceSettings}
        onClose={() => setShowVoiceSettings(false)}
        onVoiceChange={handleVoiceChange}
      />


      <main className="chat-container">
        {hasMessages && (
          <div className="chat-header">
            <h1>Gemini</h1>
          </div>
        )}

        <div className={`messages-container ${!hasMessages ? 'welcome-screen' : ''}`}>
          {!hasMessages ? (
            <div className="welcome-content">
              <div className="gemini-icon">
                <div className="diamond diamond-blue"></div>
                <div className="diamond diamond-yellow"></div>
                <div className="diamond diamond-green"></div>
                <div className="diamond diamond-orange"></div>
              </div>
              <h2 className="welcome-greeting">Hi</h2>
              <h3 className="welcome-question">How are you today?</h3>
              
              {permissionError && (
                <div className="permission-error">
                  <p>Microphone access is required. Please allow microphone permissions.</p>
                  <button className="permission-retry-btn" onClick={requestPermission}>
                    Grant Permission
                  </button>
                </div>
              )}
              
              {isRecording && (
                <AudioVisualizer 
                  audioLevel={audioLevel} 
                  isRecording={isRecording} 
                  size="large"
                />
              )}
              
              <button 
                className={`microphone-button ${isRecording ? 'recording' : ''}`}
                onClick={handleVoiceRecord}
                disabled={!permissionGranted && !permissionError}
                aria-label={isRecording ? 'Stop recording' : 'Start recording'}
              >
                {isRecording ? (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>
                  </svg>
                ) : (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <path d="M12 1C10.34 1 9 2.34 9 4V12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12V4C15 2.34 13.66 1 12 1Z" fill="currentColor"/>
                    <path d="M19 10V12C19 15.87 15.87 19 12 19C8.13 19 5 15.87 5 12V10H7V12C7 14.76 9.24 17 12 17C14.76 17 17 14.76 17 12V10H19Z" fill="currentColor"/>
                    <path d="M11 22H13V19H11V22Z" fill="currentColor"/>
                  </svg>
                )}
              </button>
              
              {isProcessing && (
                <div className="processing-indicator">
                  <div className="spinner"></div>
                  <span>Processing...</span>
                </div>
              )}
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div key={message.id} className={`message ${message.sender}`}>
                  <div className="message-avatar">
                    {message.sender === 'user' ? 'U' : 'G'}
                  </div>
                  <div className="message-content">
                    <div className="message-text">{message.text}</div>
                    {message.sender === 'bot' && isPlayingAudio && message.id === messages[messages.length - 1]?.id && (
                      <div className="audio-playing-indicator">
                        <div className="audio-wave"></div>
                        <span>Speaking...</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isProcessing && (
                <div className="message bot">
                  <div className="message-avatar">G</div>
                  <div className="message-content">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <form className="input-container" onSubmit={handleFormSubmit}>
          {isRecording && (
            <AudioVisualizer 
              audioLevel={audioLevel} 
              isRecording={isRecording} 
              size="small"
            />
          )}
          
          <div className="input-wrapper">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Tell Reminisce..."
              className="chat-input"
              aria-label="Message input"
            />
            <button 
              type="button" 
              className={`microphone-input-button ${isRecording ? 'recording' : ''}`}
              onClick={handleVoiceRecord}
              disabled={!permissionGranted && !permissionError}
              aria-label={isRecording ? 'Stop recording' : 'Start voice recording'}
            >
              {isRecording ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 1C10.34 1 9 2.34 9 4V12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12V4C15 2.34 13.66 1 12 1Z" fill="currentColor"/>
                  <path d="M19 10V12C19 15.87 15.87 19 12 19C8.13 19 5 15.87 5 12V10H7V12C7 14.76 9.24 17 12 17C14.76 17 17 14.76 17 12V10H19Z" fill="currentColor"/>
                  <path d="M11 22H13V19H11V22Z" fill="currentColor"/>
                </svg>
              )}
            </button>
            <button 
              type="submit" 
              className="send-button" 
              disabled={!inputValue.trim() || isProcessing}
              aria-label="Send message"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default Dashboard;

