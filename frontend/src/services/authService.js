// Authentication service using Firebase Auth
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { auth } from './firebaseConfig';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Register a new user
 */
export const registerUser = async (email, password, displayName = null) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update display name if provided
    if (displayName) {
      await updateProfile(user, { displayName });
    }

    // Get ID token and create profile in backend
    const idToken = await user.getIdToken();
    const response = await fetch(`${API_URL}/auth/verify-token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to create user profile');
    }

    const data = await response.json();
    return { user, profile: data.user.profile };
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

/**
 * Sign in with email and password
 */
export const signInUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Get ID token and verify/create profile
    const idToken = await user.getIdToken();
    const response = await fetch(`${API_URL}/auth/verify-token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to verify token');
    }

    const data = await response.json();
    return { user, profile: data.user.profile };
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
};

/**
 * Sign out current user
 */
export const signOutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
};

/**
 * Get current user's ID token
 */
export const getIdToken = async () => {
  const user = auth.currentUser;
  if (!user) {
    return null;
  }
  return await user.getIdToken();
};

/**
 * Subscribe to auth state changes
 */
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

/**
 * Get current user
 */
export const getCurrentUser = () => {
  return auth.currentUser;
};

/**
 * Enable biometric authentication using WebAuthn API
 */
export const enableBiometric = async () => {
  try {
    // Check if WebAuthn is supported
    if (!window.PublicKeyCredential) {
      throw new Error('Biometric authentication is not supported in this browser');
    }

    // Create credential
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: new Uint8Array(32), // In production, get this from server
        rp: {
          name: 'Reminisce',
          id: window.location.hostname,
        },
        user: {
          id: new Uint8Array(16),
          name: auth.currentUser?.email || 'user',
          displayName: auth.currentUser?.displayName || 'User',
        },
        pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
        },
        timeout: 60000,
        attestation: 'direct',
      },
    });

    // Send credential to backend
    const idToken = await getIdToken();
    if (!idToken) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${API_URL}/auth/biometric/enable`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        credential_id: credential.id,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to enable biometric');
    }

    return { success: true, credentialId: credential.id };
  } catch (error) {
    console.error('Biometric enable error:', error);
    throw error;
  }
};

/**
 * Sign in using biometric authentication
 */
export const signInWithBiometric = async () => {
  try {
    if (!window.PublicKeyCredential) {
      throw new Error('Biometric authentication is not supported');
    }

    // Get credential from user
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: new Uint8Array(32), // In production, get this from server
        timeout: 60000,
        userVerification: 'required',
      },
    });

    // In a real implementation, you would verify this with your backend
    // For now, we'll just return success
    return { success: true };
  } catch (error) {
    console.error('Biometric sign in error:', error);
    throw error;
  }
};


