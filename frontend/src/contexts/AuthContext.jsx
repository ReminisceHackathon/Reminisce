import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChange,
  getCurrentUser,
  getIdToken,
  signInUser,
  registerUser,
  signOutUser,
} from '../services/authService';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [idToken, setIdToken] = useState(null);

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // Get ID token
        const token = await getIdToken();
        setIdToken(token);

        // Fetch user profile
        try {
          const response = await fetch(
            `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/auth/profile`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            }
          );

          if (response.ok) {
            const profileData = await response.json();
            setProfile(profileData);
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
        }
      } else {
        setUser(null);
        setProfile(null);
        setIdToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email, password) => {
    try {
      const result = await signInUser(email, password);
      setProfile(result.profile);
      return result;
    } catch (error) {
      throw error;
    }
  };

  const signUp = async (email, password, displayName) => {
    try {
      const result = await registerUser(email, password, displayName);
      setProfile(result.profile);
      return result;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOutUser();
      setUser(null);
      setProfile(null);
      setIdToken(null);
    } catch (error) {
      throw error;
    }
  };

  const refreshToken = async () => {
    if (user) {
      const token = await getIdToken();
      setIdToken(token);
      return token;
    }
    return null;
  };

  const value = {
    user,
    profile,
    idToken,
    loading,
    signIn,
    signUp,
    logout,
    refreshToken,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};


