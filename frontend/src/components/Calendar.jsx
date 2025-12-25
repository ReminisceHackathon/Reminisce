import React, { useState, useMemo } from 'react';
import './Calendar.css';

/**
 * Calendar Component
 * 
 * A full month calendar view with:
 * - Month/year header with navigation arrows
 * - 7-column day grid (Sun-Sat)
 * - Today highlight
 * - Selected date highlight
 * - Dots for dates with reminders
 */
const Calendar = ({ 
  selectedDate, 
  onDateSelect, 
  reminders = [],
  className = '' 
}) => {
  const [viewDate, setViewDate] = useState(selectedDate || new Date());
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Get the days to display in the calendar grid
  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    
    // Days from previous month to show
    const startPadding = firstDay.getDay(); // 0 = Sunday
    
    // Total days in current month
    const daysInMonth = lastDay.getDate();
    
    // Calculate total cells needed (always 6 rows for consistency)
    const totalCells = 42; // 6 rows × 7 days
    
    const days = [];
    
    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startPadding - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
      });
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }
    
    // Next month days
    const remaining = totalCells - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }
    
    return days;
  }, [viewDate]);
  
  // Check if a date has reminders
  const hasRemindersOnDate = (date) => {
    const dateStr = date.toDateString();
    return reminders.some(reminder => {
      // If reminder has a parsed date, compare it
      if (reminder.date) {
        return new Date(reminder.date).toDateString() === dateStr;
      }
      return false;
    });
  };
  
  // Check if two dates are the same day
  const isSameDay = (date1, date2) => {
    if (!date1 || !date2) return false;
    return date1.toDateString() === date2.toDateString();
  };
  
  // Navigate to previous month
  const goToPrevMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  
  // Navigate to next month
  const goToNextMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };
  
  // Go to today
  const goToToday = () => {
    const todayDate = new Date();
    setViewDate(todayDate);
    onDateSelect?.(todayDate);
  };
  
  // Handle date click
  const handleDateClick = (day) => {
    onDateSelect?.(day.date);
  };
  
  // Format month and year for header
  const monthYear = viewDate.toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });
  
  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  
  return (
    <div className={`calendar ${className}`}>
      {/* Calendar Header */}
      <div className="calendar-header">
        <button 
          className="calendar-nav-btn" 
          onClick={goToPrevMonth}
          aria-label="Previous month"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        
        <div className="calendar-title">
          <span className="month-year">{monthYear}</span>
          <button className="today-btn" onClick={goToToday}>Today</button>
        </div>
        
        <button 
          className="calendar-nav-btn" 
          onClick={goToNextMonth}
          aria-label="Next month"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
      
      {/* Weekday Headers */}
      <div className="calendar-weekdays">
        {weekDays.map(day => (
          <div key={day} className="weekday">{day}</div>
        ))}
      </div>
      
      {/* Calendar Grid */}
      <div className="calendar-grid">
        {calendarDays.map((day, index) => {
          const isToday = isSameDay(day.date, today);
          const isSelected = isSameDay(day.date, selectedDate);
          const hasReminders = hasRemindersOnDate(day.date);
          
          return (
            <button
              key={index}
              className={`calendar-day ${!day.isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
              onClick={() => handleDateClick(day)}
              aria-label={day.date.toDateString()}
            >
              <span className="day-number">{day.date.getDate()}</span>
              {hasReminders && <span className="reminder-dot" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Calendar;

