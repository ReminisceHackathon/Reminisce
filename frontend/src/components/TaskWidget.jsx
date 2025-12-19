import React, { useState, useEffect } from 'react';
import './TaskWidget.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000/api';

const TaskWidget = () => {
  const [reminders, setReminders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [seenIds, setSeenIds] = useState(new Set());

  useEffect(() => {
    const fetchReminders = async () => {
      try {
        const response = await fetch(`${API_URL}/reminders`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch reminders');
        }
        
        const data = await response.json();
        
        // Mark which reminders are truly "new" (not seen before)
        const updatedReminders = data.map((reminder, index) => {
          const reminderId = `${reminder.task}-${reminder.time}`;
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

    // Poll every 2 seconds
    const intervalId = setInterval(fetchReminders, 2000);

    return () => clearInterval(intervalId);
  }, []);

  // Clear "new" animation after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setReminders(prev => prev.map(r => ({ ...r, isNew: false })));
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [reminders.length]);

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

  return (
    <div className="task-widget">
      <div className="task-widget-header">
        <span className="task-widget-icon">🔔</span>
        <h3>Reminders</h3>
        {reminders.length > 0 && (
          <span className="task-count">{reminders.length}</span>
        )}
      </div>

      <div className="task-widget-content">
        {error ? (
          <div className="task-widget-error">
            <span>⚠️</span>
            <p>{error}</p>
          </div>
        ) : reminders.length === 0 ? (
          <div className="task-widget-empty">
            <span className="empty-icon">✨</span>
            <p>No reminders set</p>
            <span className="empty-hint">Your reminders will appear here</span>
          </div>
        ) : (
          <ul className="task-list">
            {reminders.map((reminder) => (
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
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default TaskWidget;

