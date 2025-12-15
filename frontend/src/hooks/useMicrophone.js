import { useState, useRef, useEffect, useCallback } from 'react';

export const useMicrophone = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionError, setPermissionError] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);

  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const chunksRef = useRef([]);

  const stopVisualization = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  const startVisualization = useCallback(() => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateLevel = () => {
      if (!isRecording && !mediaStreamRef.current) {
        setAudioLevel(0);
        return;
      }

      analyser.getByteFrequencyData(dataArray);
      
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      const normalizedLevel = Math.min(average / 128, 1); // Normalize to 0-1
      
      setAudioLevel(normalizedLevel);

      if (isRecording || mediaStreamRef.current) {
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      }
    };

    updateLevel();
  }, [isRecording]);

  const requestPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      setPermissionGranted(true);
      setPermissionError(null);
      mediaStreamRef.current = stream;
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      return true;
    } catch (error) {
      console.error('Microphone permission error:', error);
      setPermissionError(error.message);
      setPermissionGranted(false);
      return false;
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (!mediaStreamRef.current) {
      const granted = await requestPermission();
      if (!granted) return false;
    }

    try {
      chunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(mediaStreamRef.current, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      setIsRecording(true);
      startVisualization();
      
      return true;
    } catch (error) {
      console.error('Recording start error:', error);
      return false;
    }
  }, [requestPermission, startVisualization]);

  const stopRecording = useCallback(() => {
    return new Promise((resolve) => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          setAudioBlob(blob);
          setIsRecording(false);
          stopVisualization();
          resolve(blob);
        };
        
        mediaRecorderRef.current.stop();
      } else {
        resolve(null);
      }
    });
  }, [isRecording, stopVisualization]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopVisualization();
      
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stopVisualization]);

  return {
    isRecording,
    audioLevel,
    permissionGranted,
    permissionError,
    audioBlob,
    requestPermission,
    startRecording,
    stopRecording,
  };
};

