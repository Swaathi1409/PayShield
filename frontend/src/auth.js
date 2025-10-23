// Replace your entire src/auth.js file with this code

import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  setPersistence,
  browserSessionPersistence // ← KEY CHANGE: Session persistence instead of local
} from 'firebase/auth';
import { auth } from './firebase';

const API_URL = import.meta.env.VITE_API_URL || "https://payshield-fraud-detection-app.onrender.com";

// Store user in sessionStorage instead of relying on Firebase's global state
const USER_KEY = 'payshield_user';

// Helper to get user from session storage
const getUserFromSession = () => {
  try {
    const userData = sessionStorage.getItem(USER_KEY);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Error reading user from session:', error);
    return null;
  }
};

// Helper to save user to session storage
const saveUserToSession = (user) => {
  try {
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Error saving user to session:', error);
  }
};

// Helper to clear user from session storage
const clearUserFromSession = () => {
  try {
    sessionStorage.removeItem(USER_KEY);
  } catch (error) {
    console.error('Error clearing user from session:', error);
  }
};

// Set Firebase to use session persistence (tab-specific)
setPersistence(auth, browserSessionPersistence).catch((error) => {
  console.error('Error setting persistence:', error);
});

export const login = async (email, password) => {
  try {
    // Sign in with Firebase
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Fetch user details from backend
    const response = await fetch(`${API_URL}/api/user/by-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: userCredential.user.email,
        firebase_uid: userCredential.user.uid 
      })
    });

    if (!response.ok) {
      throw new Error('User not found in database');
    }

    const userData = await response.json();
    
    // Save to session storage (tab-specific)
    saveUserToSession(userData);
    
    return { 
      success: true, 
      user: userData 
    };
  } catch (error) {
    console.error('Login error:', error);
    return { 
      success: false, 
      error: error.message || 'Invalid email or password' 
    };
  }
};

export const signup = async (email, password, role, additionalData = {}) => {
  try {
    // Create Firebase user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Create user in backend
    const response = await fetch(`${API_URL}/api/user/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firebase_uid: userCredential.user.uid,
        email: email,
        role: role,
        name: additionalData.name || 'User',
        balance: role === 'customer' ? 300000.0 : 0.0,
        business_name: additionalData.business_name || null
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create user in database');
    }

    const result = await response.json();
    const userData = result.user;
    
    // Save to session storage
    saveUserToSession(userData);
    
    return { 
      success: true, 
      user: userData 
    };
  } catch (error) {
    console.error('Signup error:', error);
    return { 
      success: false, 
      error: error.code === 'auth/email-already-in-use' 
        ? 'Email already in use' 
        : error.message || 'Signup failed'
    };
  }
};

export const logout = async () => {
  try {
    // Clear session storage first
    clearUserFromSession();
    
    // Sign out from Firebase
    await firebaseSignOut(auth);
    
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

export const getCurrentUser = () => {
  // Get user from session storage instead of Firebase auth state
  return getUserFromSession();
};

export const isAuthenticated = () => {
  return getCurrentUser() !== null;
};

export const hasRole = (requiredRole) => {
  const user = getCurrentUser();
  return user && user.role === requiredRole;
};

// Modified: Check session storage instead of Firebase auth state
export const onAuthChange = (callback) => {
  // Initial check
  const user = getUserFromSession();
  callback(user);
  
  // Listen for storage events (when user logs in/out in another tab)
  const handleStorageChange = (e) => {
    if (e.key === USER_KEY) {
      const newUser = e.newValue ? JSON.parse(e.newValue) : null;
      callback(newUser);
    }
  };
  
  window.addEventListener('storage', handleStorageChange);
  
  // Also listen to Firebase auth state changes (for same tab)
  const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
    if (firebaseUser) {
      // User logged in - fetch from backend if not in session
      const sessionUser = getUserFromSession();
      if (!sessionUser) {
        try {
          const response = await fetch(`${API_URL}/api/user/by-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              email: firebaseUser.email,
              firebase_uid: firebaseUser.uid 
            })
          });
          
          if (response.ok) {
            const userData = await response.json();
            saveUserToSession(userData);
            callback(userData);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
    } else {
      // User logged out
      clearUserFromSession();
      callback(null);
    }
  });
  
  // Return cleanup function
  return () => {
    window.removeEventListener('storage', handleStorageChange);
    unsubscribe();
  };
};