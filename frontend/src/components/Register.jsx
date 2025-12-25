import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AuthLayout from './AuthLayout';

const Register = ({ onSwitchToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await signUp(email, password, displayName || null);
    } catch (err) {
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={
        <>
          Create
          <br />
          your space.
        </>
      }
      subtitle="Set up Reminisce in under a minute."
      footer={
        <p className="auth-inline">
          Already have an account?
          <button type="button" onClick={onSwitchToLogin} className="auth-link-btn">
            Sign in
          </button>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="auth-form-claude">
        {error && <div className="auth-error">{error}</div>}

        <div className="auth-field">
          <label htmlFor="displayName">Display name (optional)</label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="How should we call you?"
            disabled={loading}
            autoComplete="nickname"
          />
        </div>

        <div className="auth-field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Enter your email"
            disabled={loading}
            autoComplete="email"
          />
        </div>

        <div className="auth-field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="At least 6 characters"
            disabled={loading}
            autoComplete="new-password"
          />
        </div>

        <div className="auth-field">
          <label htmlFor="confirmPassword">Confirm password</label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            placeholder="Re-enter your password"
            disabled={loading}
            autoComplete="new-password"
          />
        </div>

        <button type="submit" className="auth-submit" disabled={loading}>
          {loading ? 'Creating…' : 'Continue'}
        </button>

        <p className="auth-helper">
          By continuing, you agree to our terms and acknowledge our privacy policy.
        </p>
      </form>
    </AuthLayout>
  );
};

export default Register;


