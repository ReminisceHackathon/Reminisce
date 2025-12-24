import React, { useState, useEffect } from 'react';
import './TaskWidget.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000/api';

const TaskWidget = ({ idToken }) => {
  const [reminders, setReminders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [seenIds, setSeenIds] = useState(new Set());

  useEffect(() => {
    const fetchReminders = async () => {
      try {
        const headers = {};
        
        // Add auth header if token is available
        if (idToken) {
          headers['Authorization'] = `Bearer ${idToken}`;
        }
        
        const response = await fetch(`${API_URL}/reminders`, { headers });
        
        if (!response.ok) {
          throw new Error('Failed to fetch reminders');
        }
        
        const data = await response.json();
        
        // Mark which reminders are truly "new" (not seen before)
        const updatedReminders = data.map((reminder) => {
          const reminderId = reminder.id || `${reminder.task}-${reminder.time}`;
          const isNew = reminder.status === 'new' && !seenIds.has(reminderId);
          return { ...reminder, id: reminderId, isNew };
        });
        
        // Update seen IDs
        const newSeenIds = new Set(seenIds);
        updatedReminders.forEach(r => newSeenIds.add(r.id));
        setSeenIds(newSeenIds);
        
        setReminders(updatedReminders);
        setError(null);
      } catch (err) {
        console.error('Error fetching reminders:', err);
        setError('Could not load reminders');
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchReminders();

    // Poll every 5 seconds (reduced from 2 to be less aggressive)
    const intervalId = setInterval(fetchReminders, 5000);

    return () => clearInterval(intervalId);
  }, [idToken]); // Re-fetch when token changes

  // Clear "new" animation after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setReminders(prev => prev.map(r => ({ ...r, isNew: false })));
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [reminders.length]);

  const handleDismiss = async (reminderId) => {
    try {
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }
      
      await fetch(`${API_URL}/reminders/${reminderId}/status?status=dismissed`, {
        method: 'PUT',
        headers,
      });
      
      // Remove from local state
      setReminders(prev => prev.filter(r => r.id !== reminderId));
    } catch (err) {
      console.error('Error dismissing reminder:', err);
    }
  };

  const handleComplete = async (reminderId) => {
    try {
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }
      
      await fetch(`${API_URL}/reminders/${reminderId}/status?status=completed`, {
        method: 'PUT',
        headers,
      });
      
      // Update local state
      setReminders(prev => prev.map(r => 
        r.id === reminderId ? { ...r, status: 'completed' } : r
      ));
    } catch (err) {
      console.error('Error completing reminder:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="task-widget">
        <div className="task-widget-header">
          <span className="task-widget-icon">🔔</span>
          <h3>Reminders</h3>
        </div>
        <div className="task-widget-loading">
          <div className="task-spinner"></div>
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  // Filter out completed reminders for display
  const activeReminders = reminders.filter(r => r.status !== 'completed' && r.status !== 'dismissed');

  return (
    <div className="task-widget">
      <div className="task-widget-header">
        <span className="task-widget-icon">🔔</span>
        <h3>Reminders</h3>
        {activeReminders.length > 0 && (
          <span className="task-count">{activeReminders.length}</span>
        )}
        {idToken && (
          <span className="sync-indicator" title="Synced with your account">✓</span>
        )}
      </div>

      <div className="task-widget-content">
        {error ? (
          <div className="task-widget-error">
            <span>⚠️</span>
            <p>{error}</p>
          </div>
        ) : activeReminders.length === 0 ? (
          <div className="task-widget-empty">
            <span className="empty-icon">✨</span>
            <p>No reminders set</p>
            <span className="empty-hint">
              {idToken 
                ? "Tell me about upcoming events and I'll remind you!" 
                : "Your reminders will appear here"
              }
            </span>
          </div>
        ) : (
          <ul className="task-list">
            {activeReminders.map((reminder) => (
              <li 
                key={reminder.id} 
                className={`task-item ${reminder.isNew ? 'task-new' : ''} ${reminder.status}`}
              >
                <div className="task-time-badge">
                  <span className="task-time">{reminder.time}</span>
                </div>
                <div className="task-details">
                  <span className="task-name">{reminder.task}</span>
                  {reminder.status === 'new' && (
                    <span className="task-new-badge">New</span>
                  )}
                </div>
                <div className="task-actions">
                  <button 
                    className="task-action-btn complete"
                    onClick={() => handleComplete(reminder.id)}
                    title="Mark as complete"
                  >
                    ✓
                  </button>
                  <button 
                    className="task-action-btn dismiss"
                    onClick={() => handleDismiss(reminder.id)}
                    title="Dismiss"
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default TaskWidget;
