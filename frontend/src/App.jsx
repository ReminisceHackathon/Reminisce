import React from 'react';
import Dashboard from './components/Dashboard';
import ErrorBoundary from './components/ErrorBoundary';
import './components/Dashboard.css';

function App() {
  return (
    <ErrorBoundary>
      <Dashboard />
    </ErrorBoundary>
  );
}

export default App;

