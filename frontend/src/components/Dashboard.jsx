import React, { useState } from 'react';
import './Dashboard.css';

const Dashboard = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { id: 1, title: 'New Chat', preview: 'Hello! How can I help...' },
  ]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      const newMessage = {
        id: messages.length + 1,
        text: inputValue,
        sender: 'user'
      };
      setMessages([...messages, newMessage]);
      setInputValue('');
      
      setTimeout(() => {
        const botResponse = {
          id: messages.length + 2,
          text: 'I understand. Let me help you with that.',
          sender: 'bot'
        };
        setMessages(prev => [...prev, botResponse]);
      }, 1000);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
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
          <div className="user-profile">
            <div className="avatar">U</div>
            <span className="username">User</span>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
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
              <button className="microphone-button">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M12 1C10.34 1 9 2.34 9 4V12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12V4C15 2.34 13.66 1 12 1Z" fill="currentColor"/>
                  <path d="M19 10V12C19 15.87 15.87 19 12 19C8.13 19 5 15.87 5 12V10H7V12C7 14.76 9.24 17 12 17C14.76 17 17 14.76 17 12V10H19Z" fill="currentColor"/>
                  <path d="M11 22H13V19H11V22Z" fill="currentColor"/>
                </svg>
              </button>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={`message ${message.sender}`}>
                <div className="message-avatar">
                  {message.sender === 'user' ? 'U' : 'G'}
                </div>
                <div className="message-content">
                  <div className="message-text">{message.text}</div>
                </div>
              </div>
            ))
          )}
        </div>

        <form className="input-container" onSubmit={handleSendMessage}>
          <div className="input-wrapper">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder=" Tell Reminisce"
              className="chat-input"
            />
            <button type="button" className="microphone-input-button">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 1C10.34 1 9 2.34 9 4V12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12V4C15 2.34 13.66 1 12 1Z" fill="currentColor"/>
                <path d="M19 10V12C19 15.87 15.87 19 12 19C8.13 19 5 15.87 5 12V10H7V12C7 14.76 9.24 17 12 17C14.76 17 17 14.76 17 12V10H19Z" fill="currentColor"/>
                <path d="M11 22H13V19H11V22Z" fill="currentColor"/>
              </svg>
            </button>
            <button type="submit" className="send-button" disabled={!inputValue.trim()}>
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

