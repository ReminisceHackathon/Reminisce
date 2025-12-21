import { AuthProvider, useAuth } from './contexts/AuthContext';
import Dashboard from './components/Dashboard';
import AuthWrapper from './components/AuthWrapper';
import ErrorBoundary from './components/ErrorBoundary';
import './components/Dashboard.css';

function AppContent() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        Loading...
      </div>
    );
  }

  return isAuthenticated ? <Dashboard /> : <AuthWrapper />;
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;

