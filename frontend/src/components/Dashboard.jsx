import React, { useState, useEffect, useRef } from 'react';
import './Dashboard.css';
import { useMicrophone } from '../hooks/useMicrophone';
import AudioVisualizer from './AudioVisualizer';
import { textToSpeechStream, getAvailableVoices, getDefaultVoices } from '../services/elevenLabsService';
import { speechToText } from '../services/speechToTextService';
import VoiceSettings from './VoiceSettings';
import VoiceChat from './VoiceChat';
import Calendar from './Calendar';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

// Add Reminder Button Component
const AddReminderButton = ({ onReminderAdded, user, idToken, getAuthHeaders }) => {
  const [showForm, setShowForm] = useState(false);
  const [task, setTask] = useState('');
  const [time, setTime] = useState('');
  const [date, setDate] = useState(() => {
    // Default to today's date in YYYY-MM-DD format
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  // Generate time options for dropdown
  const generateTimeOptions = () => {
    const options = [];
    
    // Add common quick options
    options.push({ value: '', label: 'Select a time' });
    options.push({ value: 'Today', label: 'Today' });
    options.push({ value: 'Tomorrow', label: 'Tomorrow' });
    
    // Add morning times (6 AM - 12 PM)
    for (let hour = 6; hour < 12; hour++) {
      options.push({ value: `${hour}:00 AM`, label: `${hour}:00 AM` });
      options.push({ value: `${hour}:30 AM`, label: `${hour}:30 AM` });
    }
    
    // Add noon
    options.push({ value: '12:00 PM', label: '12:00 PM' });
    options.push({ value: '12:30 PM', label: '12:30 PM' });
    
    // Add afternoon times (1 PM - 5:30 PM)
    for (let hour = 1; hour < 6; hour++) {
      options.push({ value: `${hour}:00 PM`, label: `${hour}:00 PM` });
      options.push({ value: `${hour}:30 PM`, label: `${hour}:30 PM` });
    }
    
    // Add evening times (6 PM - 11:30 PM)
    for (let hour = 6; hour < 12; hour++) {
      options.push({ value: `${hour}:00 PM`, label: `${hour}:00 PM` });
      options.push({ value: `${hour}:30 PM`, label: `${hour}:30 PM` });
    }
    
    return options;
  };

  const timeOptions = generateTimeOptions();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!task.trim() || !time.trim()) {
      alert('Please fill in both task and time');
      return;
    }

    setIsSubmitting(true);
    try {
      const authHeaders = await getAuthHeaders();
      
      const response = await fetch(`${API_URL}/reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          task: task.trim(),
          time: time.trim(),
          date: date || undefined,
        }),
      });

      if (response.ok) {
        setTask('');
        setTime('');
        // Reset date to today
        const today = new Date();
        setDate(today.toISOString().split('T')[0]);
        setShowForm(false);
        onReminderAdded();
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.detail || 'Failed to create reminder. Please try again.');
      }
    } catch (error) {
      console.error('Error creating reminder:', error);
      alert('Error creating reminder. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showForm) {
    return (
      <>
        {/* Backdrop */}
        <div 
          className="add-reminder-backdrop"
          onClick={() => {
            setShowForm(false);
            setTask('');
            setTime('');
            const today = new Date();
            setDate(today.toISOString().split('T')[0]);
          }}
        />
        <div className="add-reminder-form">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="reminder-task">Task</label>
              <input
                id="reminder-task"
                type="text"
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder="e.g., Call doctor"
                required
                disabled={isSubmitting}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label htmlFor="reminder-date">Date</label>
              <input
                id="reminder-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                disabled={isSubmitting}
                min={new Date().toISOString().split('T')[0]}
                className="reminder-date-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="reminder-time">Time</label>
              <select
                id="reminder-time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                disabled={isSubmitting}
                className="reminder-time-select"
              >
                {timeOptions.map((option, index) => (
                  <option key={index} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-actions">
              <button type="submit" className="submit-reminder-btn" disabled={isSubmitting}>
                {isSubmitting ? 'Adding...' : 'Add Reminder'}
              </button>
              <button 
                type="button" 
                className="cancel-reminder-btn" 
                onClick={() => {
                  setShowForm(false);
                  setTask('');
                  setTime('');
                  const today = new Date();
                  setDate(today.toISOString().split('T')[0]);
                }}
                disabled={isSubmitting}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </>
    );
  }

  return (
    <button 
      className="add-reminder-btn"
      onClick={() => setShowForm(true)}
      aria-label="Add new reminder"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M12 4V20M4 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      Add Reminder
    </button>
  );
};

const Dashboard = () => {
  const { user, profile, idToken, logout, refreshToken } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [showVoiceChat, setShowVoiceChat] = useState(false);
  const [activeView, setActiveView] = useState('home'); // 'home', 'chats', 'reminders'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVoiceId, setSelectedVoiceId] = useState(
    localStorage.getItem('reminisce_voice_id') || ''
  );
  // Load chat history from localStorage on mount (includes messages per chat)
  const [chatHistory, setChatHistory] = useState(() => {
    const saved = localStorage.getItem('reminisce_chat_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentChatId, setCurrentChatId] = useState(null);

  // Persist chat history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('reminisce_chat_history', JSON.stringify(chatHistory));
  }, [chatHistory]);

  // Save current chat messages when they change
  useEffect(() => {
    if (currentChatId && messages.length > 0) {
      setChatHistory(prev => prev.map(chat => 
        chat.id === currentChatId 
          ? { ...chat, messages: messages, lastMessage: 'Just now' }
          : chat
      ));
    }
  }, [messages, currentChatId]);

  // Function to load a specific chat
  const loadChat = (chatId) => {
    const chat = chatHistory.find(c => c.id === chatId);
    if (chat) {
      // If this chat has stored messages, load them
      // If not, show a placeholder message indicating this was a previous chat
      const chatMessages = chat.messages && chat.messages.length > 0 
        ? chat.messages 
        : [{ id: 1, text: chat.title, sender: 'user', timestamp: chat.createdAt || new Date() }];
      setMessages(chatMessages);
      setCurrentChatId(chatId);
      setActiveView('home');
    }
  };
  // Reminders - fetched from API
  const [reminders, setReminders] = useState([]);
  const [isLoadingReminders, setIsLoadingReminders] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Computed: filter reminders by selected date
  const filteredReminders = reminders.filter(reminder => {
    if (!reminder.event_date) return false;
    // Parse date string without timezone conversion (YYYY-MM-DD format)
    const [year, month, day] = reminder.event_date.split('-').map(Number);
    const reminderDate = new Date(year, month - 1, day); // month is 0-indexed
    return reminderDate.toDateString() === selectedDate.toDateString();
  });
  
  // Voice settings state
  const [voices, setVoices] = useState([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [previewingVoiceId, setPreviewingVoiceId] = useState(null);
  const voicePreviewRef = useRef(null);

  // Fetch reminders from API
  const fetchReminders = async () => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    
    try {
      setIsLoadingReminders(true);
      
      // Get auth headers with timeout
      const authHeaders = await Promise.race([
        getAuthHeaders(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth headers timeout')), 3000)
        )
      ]);
      
      // Fetch with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      try {
        const response = await fetch(`${API_URL}/reminders`, {
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          setReminders(data || []);
        } else {
          console.warn('Failed to fetch reminders:', response.status, response.statusText);
          setReminders([]);
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.warn('Reminders fetch timeout - backend may not be running');
        } else {
          console.error('Error fetching reminders:', fetchError);
        }
        setReminders([]);
      }
    } catch (error) {
      console.error('Error in fetchReminders:', error);
      setReminders([]);
    } finally {
      setIsLoadingReminders(false);
    }
  };

  // Toggle reminder status (completed/pending)
  const toggleReminderStatus = async (reminderId, currentStatus) => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    
    try {
      const authHeaders = await getAuthHeaders();
      
      const response = await fetch(`${API_URL}/reminders/${reminderId}/status?status=${newStatus}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
      });

      if (response.ok) {
        // Update local state immediately for better UX
        setReminders(prevReminders => 
          prevReminders.map(r => 
            (r.id === reminderId || (r.id === undefined && reminderId === `${r.task}-${r.time}`))
              ? { ...r, status: newStatus }
              : r
          )
        );
        // Also refresh from server to ensure consistency
        setTimeout(() => fetchReminders(), 500);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to update reminder status:', errorData.detail || 'Unknown error');
        alert(errorData.detail || 'Failed to update reminder. Please try again.');
      }
    } catch (error) {
      console.error('Error updating reminder status:', error);
      alert('Error updating reminder. Please try again.');
    }
  };

  // Fetch reminders on mount and when auth changes
  useEffect(() => {
    fetchReminders();
  }, [idToken]);

  // Refresh reminders periodically (every 30 seconds)
  useEffect(() => {
    // Don't start periodic refresh if we don't have an idToken (not authenticated)
    if (!idToken) {
      return;
    }
    
    const interval = setInterval(fetchReminders, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idToken]);

  // Load voices when voice view is active
  const loadVoices = async () => {
    setIsLoadingVoices(true);
    try {
      const availableVoices = await getAvailableVoices();
      setVoices(availableVoices.length > 0 ? availableVoices : getDefaultVoices());
    } catch (error) {
      console.error('Error loading voices:', error);
      setVoices(getDefaultVoices());
    } finally {
      setIsLoadingVoices(false);
    }
  };

  useEffect(() => {
    if (activeView === 'voice' && voices.length === 0) {
      loadVoices();
    }
  }, [activeView]);

  // Voice preview function
  const handleVoicePreview = async (voiceId) => {
    // Stop any current preview
    if (voicePreviewRef.current) {
      voicePreviewRef.current.pause();
      voicePreviewRef.current = null;
    }
    
    // If clicking the same voice, just stop
    if (previewingVoiceId === voiceId) {
      setPreviewingVoiceId(null);
      return;
    }
    
    setPreviewingVoiceId(voiceId);
    
    try {
      await textToSpeechStream(
        'Hello! This is how I sound. I hope you find my voice pleasant and easy to listen to.',
        () => {}, // onChunk
        (audioUrl) => {
          const audio = new Audio(audioUrl);
          voicePreviewRef.current = audio;
          audio.onended = () => {
            setPreviewingVoiceId(null);
            URL.revokeObjectURL(audioUrl);
            voicePreviewRef.current = null;
          };
          audio.onerror = () => {
            setPreviewingVoiceId(null);
            voicePreviewRef.current = null;
          };
          audio.play();
        },
        (error) => {
          console.error('Preview error:', error);
          setPreviewingVoiceId(null);
        },
        voiceId
      );
    } catch (error) {
      console.error('Error previewing voice:', error);
      setPreviewingVoiceId(null);
    }
  };

  // Select voice function
  const handleVoiceSelect = (voiceId) => {
    setSelectedVoiceId(voiceId);
    localStorage.setItem('reminisce_voice_id', voiceId);
  };

  // Cleanup voice preview on unmount
  useEffect(() => {
    return () => {
      if (voicePreviewRef.current) {
        voicePreviewRef.current.pause();
        voicePreviewRef.current = null;
      }
    };
  }, []);

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

  // Get the current auth token (refresh if needed)
  const getAuthHeaders = async () => {
    let token = idToken;
    
    // Refresh token if it might be expired
    if (!token && user) {
      token = await refreshToken();
    }
    
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

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

    // If this is the first message, create a new chat in history
    if (messages.length === 0 && !currentChatId) {
      const newChatId = Date.now();
      const chatTitle = messageText.length > 30 
        ? messageText.substring(0, 30) + '...' 
        : messageText;
      
      const newChat = {
        id: newChatId,
        title: chatTitle,
        lastMessage: 'Just now',
        createdAt: new Date(),
        messages: [], // Will be updated by useEffect
      };
      
      setChatHistory(prev => [newChat, ...prev]);
      setCurrentChatId(newChatId);
    }

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
      const response = await sendMessageToAPI(messageText);
      
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
      // Refresh reminders after sending a message (AI might have created one)
      setTimeout(fetchReminders, 2000);
    }
  };

  const sendMessageToAPI = async (userMessage) => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    
    try {
      // Get auth headers
      const authHeaders = await getAuthHeaders();
      
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          // Only send user_id if not authenticated (fallback for demo)
          ...(user ? {} : { user_id: 'demo_user' }),
          message: userMessage,
          history: messages.slice(-10).map(msg => 
            `${msg.sender}: ${msg.text}`
          ),
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      return { text: data.response };
    } catch (error) {
      console.error('Chat API error:', error);
      throw error;
    }
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
    setCurrentChatId(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlayingAudio(false);
  };

  // Handle messages from VoiceChat
  const handleVoiceChatMessage = ({ user: userText, assistant }) => {
    const userMsg = {
      id: Date.now(),
      text: userText,
      sender: 'user',
      timestamp: new Date(),
    };
    const botMsg = {
      id: Date.now() + 1,
      text: assistant,
      sender: 'bot',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg, botMsg]);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const hasMessages = messages.length > 0;
  
  // Get display name - prioritize profile display_name from backend, then Firebase user displayName, then email username, then default
  // The profile comes from /auth/profile endpoint which returns UserProfile with display_name field
  const displayName = (profile?.display_name && profile.display_name.trim()) || 
                      (user?.displayName && user.displayName.trim()) || 
                      (user?.email ? user.email.split('@')[0] : null) || 
                      'User';
  const userInitial = displayName.charAt(0).toUpperCase();

  // Get time-based greeting like Claude
  const getGreeting = () => {
    const hour = new Date().getHours();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[new Date().getDay()];
    
    if (hour < 12) return `Good morning, ${displayName}`;
    if (hour < 17) return `Good afternoon, ${displayName}`;
    return `Good evening, ${displayName}`;
  };

  return (
    <div className="dashboard-container">
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {/* Logo and Collapse Button */}
        <div className="sidebar-logo">
          {!sidebarCollapsed && <span className="logo-text">Reminisce</span>}
          <button 
            className="collapse-btn" 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              {sidebarCollapsed ? (
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              )}
            </svg>
          </button>
        </div>

        {/* Navigation Menu - Claude Style */}
        <nav className="sidebar-nav">
          {/* New Chat */}
          <button className="nav-item new-chat" onClick={() => { handleNewChat(); setActiveView('home'); }} title="New chat">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 4V20M4 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            {!sidebarCollapsed && <span>New chat</span>}
          </button>

          {/* Chats */}
          <button className={`nav-item ${activeView === 'chats' ? 'active' : ''}`} onClick={() => setActiveView('chats')} title="Chats">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {!sidebarCollapsed && <span>Chats</span>}
          </button>

          {/* Reminders */}
          <button className={`nav-item ${activeView === 'reminders' ? 'active' : ''}`} onClick={() => setActiveView('reminders')} title="Reminders">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {!sidebarCollapsed && <span>Reminders</span>}
          </button>

          {/* Voice Settings */}
          <button className={`nav-item ${activeView === 'voice' ? 'active' : ''}`} onClick={() => setActiveView('voice')} title="Voice">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" fill="currentColor"/>
            </svg>
            {!sidebarCollapsed && <span>Voice</span>}
          </button>

          {/* Theme Toggle */}
          <button 
            className="nav-item theme-toggle" 
            onClick={toggleTheme} 
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
            {!sidebarCollapsed && <span>{isDark ? 'Light mode' : 'Dark mode'}</span>}
          </button>
        </nav>

        {/* Recents Section - Only show when there are actual chats */}
        {!sidebarCollapsed && chatHistory.length > 0 && (
          <>
            <div className="nav-divider"></div>
            <div className="chat-history">
              <div className="history-header">Recents</div>
              {chatHistory.slice(0, 5).map((chat) => (
                <div key={chat.id} className="chat-item" onClick={() => loadChat(chat.id)} title={chat.title}>
                  <span className="chat-title">{chat.title}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* User Profile at Bottom */}
        <div className="sidebar-footer">
          <div className="user-profile" onClick={handleLogout} title="Click to logout">
            <div className="avatar">{userInitial}</div>
            {!sidebarCollapsed && (
              <>
                <span className="username">{displayName}</span>
                {user && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="logout-icon">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </>
            )}
          </div>
        </div>
      </aside>
      <VoiceSettings
        isOpen={showVoiceSettings}
        onClose={() => setShowVoiceSettings(false)}
        onVoiceChange={handleVoiceChange}
      />


      <main className="chat-container">
        {/* Chats View */}
        {activeView === 'chats' && (
          <div className="view-container chats-view">
            <div className="view-header">
              <h1>Chats</h1>
              <button className="header-action-btn" onClick={() => { handleNewChat(); setActiveView('home'); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 4V20M4 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                New chat
              </button>
            </div>
            
            {chatHistory.length > 0 ? (
              <>
                <div className="search-container">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="search-icon">
                    <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                    <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <input 
                    type="text" 
                    className="search-input" 
                    placeholder="Search your chats..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <div className="chats-info">
                  <span>{chatHistory.filter(c => 
                    c.title.toLowerCase().includes(searchQuery.toLowerCase())
                  ).length} chats with Reminisce</span>
                </div>
                
                <div className="chats-list">
                  {chatHistory
                    .filter(chat => 
                      chat.title.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((chat) => (
                      <div 
                        key={chat.id} 
                        className="chat-list-item"
                        onClick={() => loadChat(chat.id)}
                      >
                        <div className="chat-list-title">{chat.title}</div>
                        <div className="chat-list-meta">Last message {chat.lastMessage}</div>
                      </div>
                    ))
                  }
                  {searchQuery && chatHistory.filter(c => 
                    c.title.toLowerCase().includes(searchQuery.toLowerCase())
                  ).length === 0 && (
                    <div className="empty-search">
                      <p>No chats found matching "{searchQuery}"</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="empty-chats">
                <div className="empty-chats-icon">💬</div>
                <h3>No conversations yet</h3>
                <p>Start a new chat with Reminisce to see your conversations here.</p>
                <button className="start-chat-btn" onClick={() => { handleNewChat(); setActiveView('home'); }}>
                  Start chatting
                </button>
              </div>
            )}
          </div>
        )}

        {/* Reminders View - Apple Style */}
        {activeView === 'reminders' && (
          <div className="view-container reminders-view-apple">
            {/* Two-Column Layout */}
            <div className="reminders-layout">
              {/* Left Column - Calendar & Quick Stats */}
              <div className="reminders-sidebar">
                <Calendar 
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  reminders={reminders}
                />
                
                {/* Quick Stats */}
                <div className="reminders-stats">
                  <div className="stat-card today-stat">
                    <div className="stat-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                        <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div className="stat-content">
                      <span className="stat-number">{filteredReminders.filter(r => r.status !== 'completed').length}</span>
                      <span className="stat-label">Active</span>
                    </div>
                  </div>
                  <div className="stat-card scheduled-stat">
                    <div className="stat-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                        <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div className="stat-content">
                      <span className="stat-number">{filteredReminders.filter(r => r.status === 'completed').length}</span>
                      <span className="stat-label">Completed</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Right Column - Reminders List */}
              <div className="reminders-main">
                {/* Date Header */}
                <div className="reminders-header-apple">
                  <div className="header-date-section">
                    <span className="header-weekday">
                      {selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}
                    </span>
                    <h1 className="header-date">
                      {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                    </h1>
                  </div>
                  {selectedDate.toDateString() === new Date().toDateString() && (
                    <span className="today-pill">Today</span>
                  )}
                </div>
                
                {/* Reminders List */}
                <div className="reminders-list-apple">
                  {/* Add Reminder Button - Always visible */}
                  <div className="reminders-add-button-container">
                    <AddReminderButton onReminderAdded={fetchReminders} user={user} idToken={idToken} getAuthHeaders={getAuthHeaders} />
                  </div>
                  {isLoadingReminders ? (
                    <div className="loading-reminders">
                      <div className="spinner"></div>
                      <p>Loading reminders...</p>
                    </div>
                  ) : filteredReminders.length > 0 ? (
                    <div className="reminder-items">
                      {filteredReminders.map((reminder, index) => {
                        const isCompleted = reminder.status === 'completed';
                        return (
                          <div 
                            key={reminder.id || index} 
                            className={`reminder-item-apple ${isCompleted ? 'completed' : ''}`}
                          >
                            <button 
                              className={`reminder-checkbox ${isCompleted ? 'checked' : ''}`}
                              aria-label={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
                            >
                              {isCompleted && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                                  <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </button>
                            <div className="reminder-details">
                              <span className={`reminder-title ${isCompleted ? 'completed' : ''}`}>
                                {reminder.task || reminder.text}
                              </span>
                              {(reminder.time || reminder.event_date) && (
                                <span className="reminder-time">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                                    <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                  </svg>
                                  {reminder.time || new Date(reminder.event_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                </span>
                              )}
                              {reminder.category && (
                                <span className={`reminder-category ${reminder.category}`}>
                                  {reminder.category}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="empty-reminders-apple">
                      <div className="empty-icon-container">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          <rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                          <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <h3>No reminders for this day</h3>
                      <p>Tell Reminisce about upcoming events and it will remind you!</p>
                      <div className="empty-reminders-actions">
                        <AddReminderButton onReminderAdded={fetchReminders} user={user} idToken={idToken} getAuthHeaders={getAuthHeaders} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Voice View */}
        {activeView === 'voice' && (
          <div className="view-container voice-view-claude">
            {/* Header */}
            <div className="voice-page-header">
              <h1>Voices</h1>
            </div>
            
            {/* Search Bar */}
            <div className="voice-search-container">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="search-icon">
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <input 
                type="text" 
                className="voice-search-input" 
                placeholder="Search voices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            
            {/* Voice Cards Grid */}
            {isLoadingVoices ? (
              <div className="loading-voices">
                <div className="spinner"></div>
                <p>Loading voices...</p>
              </div>
            ) : (
              <div className="voice-cards-grid">
                {voices
                  .filter(voice => 
                    voice.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (voice.description && voice.description.toLowerCase().includes(searchQuery.toLowerCase()))
                  )
                  .map((voice) => {
                    const isSelected = selectedVoiceId === voice.voice_id;
                    const isPreviewing = previewingVoiceId === voice.voice_id;
                    
                    return (
                      <div 
                        key={voice.voice_id} 
                        className={`voice-project-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleVoiceSelect(voice.voice_id)}
                      >
                        <div className="voice-card-top">
                          <h3 className="voice-card-title">{voice.name}</h3>
                          {isSelected && (
                            <span className="voice-selected-tag">Selected</span>
                          )}
                        </div>
                        
                        <p className="voice-card-description">
                          {voice.description || 'A natural-sounding voice perfect for conversations.'}
                        </p>
                        
                        <div className="voice-card-footer">
                          <button 
                            className={`voice-preview-btn ${isPreviewing ? 'playing' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVoicePreview(voice.voice_id);
                            }}
                          >
                            {isPreviewing ? (
                              <>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                  <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/>
                                  <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/>
                                </svg>
                                Playing...
                              </>
                            ) : (
                              <>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                  <path d="M8 5v14l11-7z" fill="currentColor"/>
                                </svg>
                                Preview
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* Home/Chat View */}
        {activeView === 'home' && hasMessages && (
          <div className="chat-header">
            <h1>Reminisce</h1>
            {user && (
              <div className="auth-indicator">
                <span className="auth-dot"></span>
                <span>Memories synced</span>
              </div>
            )}
          </div>
        )}

        {activeView === 'home' && (
          <div className={`messages-container ${!hasMessages ? 'welcome-screen' : ''}`}>
            {!hasMessages ? (
              <div className="welcome-content">
                <h2 className="welcome-greeting">{getGreeting()}</h2>
                <h3 className="welcome-question">How can I help you today?</h3>
                
                {permissionError && (
                  <div className="permission-error">
                    <p>Microphone access is required. Please allow microphone permissions.</p>
                    <button className="permission-retry-btn" onClick={requestPermission}>
                      Grant Permission
                    </button>
                  </div>
                )}
                
                {/* Reminders Widget or Empty State - Only show TODAY's reminders */}
                {(() => {
                  const today = new Date();
                  const todaysReminders = reminders.filter(r => {
                    if (r.status === 'completed') return false;
                    if (!r.event_date) return false;
                    const [year, month, day] = r.event_date.split('-').map(Number);
                    const reminderDate = new Date(year, month - 1, day);
                    return reminderDate.toDateString() === today.toDateString();
                  });
                  
                  if (!isLoadingReminders && todaysReminders.length > 0) {
                    return (
                      <div className="dashboard-reminders-widget-inline">
                        <div className="reminders-widget-header">
                          <h3>Today's Reminders</h3>
                          <button 
                            className="view-all-reminders-btn"
                            onClick={() => setActiveView('reminders')}
                            aria-label="View all reminders"
                          >
                            View all
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </div>
                        <div 
                          className="reminders-widget-list"
                          onClick={() => setActiveView('reminders')}
                          role="button"
                          tabIndex={0}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setActiveView('reminders');
                            }
                          }}
                        >
                          {todaysReminders
                            .slice(0, 3) // Show max 3 reminders
                            .map((reminder) => {
                              const reminderId = reminder.id || `${reminder.task}-${reminder.time}`;
                              // Format date for display
                              const dateStr = reminder.event_date 
                                ? (() => {
                                    const [y, m, d] = reminder.event_date.split('-').map(Number);
                                    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                  })()
                                : '';
                              return (
                                <div key={reminderId} className="reminder-widget-item">
                                  <button
                                    className="reminder-widget-checkbox"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleReminderStatus(reminderId, reminder.status || 'pending');
                                    }}
                                    aria-label="Mark as completed"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                                    </svg>
                                  </button>
                                  <div className="reminder-widget-content">
                                    <span className="reminder-widget-task">{reminder.task || reminder.text}</span>
                                    <span className="reminder-widget-time">
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                                        <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                      </svg>
                                      {dateStr && `${dateStr} · `}{reminder.time || ''}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          {todaysReminders.length > 3 && (
                            <div className="reminder-widget-more">
                              +{todaysReminders.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
                {!isLoadingReminders && (() => {
                  const today = new Date();
                  const todaysReminders = reminders.filter(r => {
                    if (r.status === 'completed') return false;
                    if (!r.event_date) return false;
                    const [year, month, day] = r.event_date.split('-').map(Number);
                    const reminderDate = new Date(year, month - 1, day);
                    return reminderDate.toDateString() === today.toDateString();
                  });
                  return todaysReminders.length === 0;
                })() ? (
                  <div className="no-reminders-message">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="4" width="18" height="18" rx="2"/>
                      <path d="M16 2v4M8 2v4M3 10h18"/>
                    </svg>
                    <p>No reminders today</p>
                  </div>
                ) : null}
                
                {isRecording && (
                  <AudioVisualizer 
                    audioLevel={audioLevel} 
                    isRecording={isRecording} 
                    size="large"
                  />
                )}
                
                <button 
                  className="voice-chat-button"
                  onClick={() => setShowVoiceChat(true)}
                  aria-label="Start voice conversation"
                >
                  <div className="voice-chat-icon">
                    <div className="wave-bar"></div>
                    <div className="wave-bar"></div>
                    <div className="wave-bar"></div>
                    <div className="wave-bar"></div>
                    <div className="wave-bar"></div>
                  </div>
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
                  <div className="message-bubble">
                    <span className="message-text">{message.text}</span>
                  </div>
                  {message.sender === 'bot' && isPlayingAudio && message.id === messages[messages.length - 1]?.id && (
                    <div className="audio-playing-indicator">
                      <div className="audio-wave"></div>
                      <span>Speaking...</span>
                    </div>
                  )}
                </div>
              ))}
              {isProcessing && (
                <div className="message bot">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
          </div>
        )}

        {/* Input Container - Only show on home view */}
        {activeView === 'home' && (
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
                className="microphone-input-button"
                onClick={() => setShowVoiceChat(true)}
                aria-label="Start voice conversation"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 1C10.34 1 9 2.34 9 4V12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12V4C15 2.34 13.66 1 12 1Z" fill="currentColor"/>
                  <path d="M19 10V12C19 15.87 15.87 19 12 19C8.13 19 5 15.87 5 12V10H7V12C7 14.76 9.24 17 12 17C14.76 17 17 14.76 17 12V10H19Z" fill="currentColor"/>
                  <path d="M11 22H13V19H11V22Z" fill="currentColor"/>
                </svg>
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
        )}
      </main>

      {/* ChatGPT-style Voice Chat Overlay */}
      {showVoiceChat && (
        <VoiceChat
          onClose={() => setShowVoiceChat(false)}
          onMessage={handleVoiceChatMessage}
        />
      )}
    </div>
  );
};

export default Dashboard;
