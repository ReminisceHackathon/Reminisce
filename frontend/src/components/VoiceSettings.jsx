import React, { useState, useEffect, useRef } from 'react';
import { getAvailableVoices, getDefaultVoices, textToSpeechStream } from '../services/elevenLabsService';
import './VoiceSettings.css';

const VoiceSettings = ({ isOpen, onClose, onVoiceChange }) => {
  const [voices, setVoices] = useState([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState(
    localStorage.getItem('reminisce_voice_id') || ''
  );
  const [isLoading, setIsLoading] = useState(true);
  const [previewText, setPreviewText] = useState('Hello');
  const [previewingVoiceId, setPreviewingVoiceId] = useState(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const previewAudioRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      loadVoices();
    }
  }, [isOpen]);

  const loadVoices = async () => {
    setIsLoading(true);
    try {
      const availableVoices = await getAvailableVoices();
      setVoices(availableVoices.length > 0 ? availableVoices : getDefaultVoices());
    } catch (error) {
      console.error('Error loading voices:', error);
      setVoices(getDefaultVoices());
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceSelect = (voiceId) => {
    setSelectedVoiceId(voiceId);
    localStorage.setItem('reminisce_voice_id', voiceId);
    if (onVoiceChange) {
      onVoiceChange(voiceId);
    }
  };

  const handlePreviewVoice = async (voiceId, e) => {
    e.stopPropagation();
    
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }

    if (previewingVoiceId === voiceId && isPreviewing) {
      setPreviewingVoiceId(null);
      setIsPreviewing(false);
      return;
    }

    setPreviewingVoiceId(voiceId);
    setIsPreviewing(true);

    try {
      const audioChunks = [];
      await textToSpeechStream(
        previewText,
        (chunk) => {
          audioChunks.push(chunk);
        },
        (audioUrl) => {
          // Stop any previous audio
          if (previewAudioRef.current) {
            previewAudioRef.current.pause();
            previewAudioRef.current.src = '';
          }

          const audio = new Audio(audioUrl);
          previewAudioRef.current = audio;

          audio.onended = () => {
            setIsPreviewing(false);
            setPreviewingVoiceId(null);
            URL.revokeObjectURL(audioUrl);
            previewAudioRef.current = null;
          };

          audio.onerror = () => {
            setIsPreviewing(false);
            setPreviewingVoiceId(null);
            console.error('Preview audio error');
            previewAudioRef.current = null;
          };

          audio.play();
        },
        (error) => {
          console.error('Preview TTS error:', error);
          setIsPreviewing(false);
          setPreviewingVoiceId(null);
        },
        voiceId
      );
    } catch (error) {
      console.error('Error previewing voice:', error);
      setIsPreviewing(false);
      setPreviewingVoiceId(null);
    }
  };

  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      setIsPreviewing(false);
      setPreviewingVoiceId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="voice-settings-overlay" onClick={onClose}>
      <div className="voice-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="voice-settings-header">
          <h2>Choose a Voice</h2>
          <button className="close-button" onClick={onClose} aria-label="Close settings">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="voice-settings-content">
          {isLoading ? (
            <div className="loading-voices">
              <div className="spinner"></div>
              <p>Loading voices...</p>
            </div>
          ) : (
            <>
              <div className="voice-list">
                {voices.map((voice) => {
                  const isSelected = selectedVoiceId === voice.voice_id;
                  const isPreviewing = previewingVoiceId === voice.voice_id;
                  
                  return (
                    <div
                      key={voice.voice_id}
                      className={`voice-option-wrapper ${isSelected ? 'selected' : ''}`}
                    >
                      <button
                        className={`voice-option ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleVoiceSelect(voice.voice_id)}
                      >
                        <div className="voice-option-content">
                          <div className="voice-name">{voice.name || 'Unnamed Voice'}</div>
                          {voice.description && (
                            <div className="voice-description">{voice.description}</div>
                          )}
                          {isSelected && (
                            <div className="selected-indicator">✓ Selected</div>
                          )}
                        </div>
                      </button>
                      <button
                        className={`preview-voice-btn ${isPreviewing ? 'playing' : ''}`}
                        onClick={(e) => handlePreviewVoice(voice.voice_id, e)}
                        aria-label={`Preview ${voice.name} voice`}
                        title="Preview this voice"
                      >
                        {isPreviewing ? (
                          <>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                              <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>
                            </svg>
                            <span>Stop</span>
                          </>
                        ) : (
                          <>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                              <path d="M8 5v14l11-7z" fill="currentColor"/>
                            </svg>
                            <span>Preview</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="preview-section">
                <label htmlFor="preview-text" className="preview-label">
                  Preview Text (used for all voice previews):
                </label>
                <textarea
                  id="preview-text"
                  className="preview-textarea"
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                  placeholder="Enter text to preview voices..."
                  rows="3"
                />
                <p className="preview-hint">
                  Click the "Preview" button next to any voice to hear how it sounds with this text.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="voice-settings-footer">
          <button className="save-button" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceSettings;

