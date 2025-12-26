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
        
        if (idToken) {
          headers['Authorization'] = `Bearer ${idToken}`;
        }
        
        const response = await fetch(`${API_URL}/reminders`, { headers });
        
        if (!response.ok) {
          throw new Error('Failed to fetch reminders');
        }
        
        const data = await response.json();
        
        const updatedReminders = data.map((reminder) => {
          const reminderId = reminder.id || `${reminder.task}-${reminder.time}`;
          const isNew = reminder.status === 'new' && !seenIds.has(reminderId);
          return { ...reminder, id: reminderId, isNew };
        });
        
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

    fetchReminders();
    const intervalId = setInterval(fetchReminders, 5000);
    return () => clearInterval(intervalId);
  }, [idToken]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setReminders(prev => prev.map(r => ({ ...r, isNew: false })));
    }, 3000);
    return () => clearTimeout(timer);
  }, [reminders.length]);

  if (isLoading) {
    return (
      <div className="task-widget loading">
        <div className="widget-header">
          <span role="img" aria-label="bell">🔔</span>
          <h3>Reminders</h3>
        </div>
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  const activeReminders = reminders.filter(r => r.status !== 'completed' && r.status !== 'dismissed');

  return (
    <div className="task-widget">
      <div className="widget-header">
        <span role="img" aria-label="bell">🔔</span>
        <h3>Reminders</h3>
        {activeReminders.length > 0 && (
          <span className="reminder-count">{activeReminders.length}</span>
        )}
        {idToken && (
          <span className="sync-indicator" title="Synced with your account">✓</span>
        )}
      </div>

      {error ? (
        <div className="empty-state">
          <span className="empty-icon">⚠️</span>
          <p className="empty-title" style={{ color: '#ef4444' }}>{error}</p>
        </div>
      ) : activeReminders.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">✨</span>
          <p className="empty-title">No reminders set</p>
          <p className="empty-subtitle">
            Tell me about upcoming events and I'll remind you!
          </p>
        </div>
      ) : (
        <ul className="reminder-list">
          {activeReminders.map((reminder) => (
            <li 
              key={reminder.id} 
              className={`reminder-item ${reminder.isNew ? 'new-reminder' : ''}`}
            >
              <span className="reminder-time">{reminder.time}</span>
              <span className="reminder-task">{reminder.task}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TaskWidget;
