import React from 'react';
import './AudioVisualizer.css';

const AudioVisualizer = ({ audioLevel, isRecording, size = 'large' }) => {
  const bars = 20;
  const barHeights = React.useMemo(() => {
    if (!isRecording || audioLevel === 0) {
      return Array(bars).fill(0.1);
    }
    
    return Array(bars).fill(0).map((_, i) => {
      const baseHeight = audioLevel;
      const wave = Math.sin((i / bars) * Math.PI * 2 + Date.now() / 100) * 0.3;
      return Math.max(0.1, Math.min(1, baseHeight + wave));
    });
  }, [audioLevel, isRecording, bars]);

  if (!isRecording && audioLevel === 0) {
    return null;
  }

  return (
    <div className={`audio-visualizer audio-visualizer-${size}`}>
      <div className="visualizer-bars">
        {barHeights.map((height, index) => (
          <div
            key={index}
            className="visualizer-bar"
            style={{
              height: `${height * 100}%`,
              animationDelay: `${index * 0.05}s`,
            }}
          />
        ))}
      </div>
      {isRecording && (
        <div className="recording-indicator">
          <span className="recording-dot"></span>
          <span className="recording-text">Listening...</span>
        </div>
      )}
    </div>
  );
};

export default AudioVisualizer;

