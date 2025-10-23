// auth.js - Production Ready
import { 
  signInWithEmailAndPassword, 
  signOut, 
  createUserWithEmailAndPassword,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from './firebase';

const API_URL ='https://payshield-fraud-detection-app.onrender.com';

// Fetch user from backend MongoDB
const fetchUserFromBackend = async (email, firebaseUid) => {
  try {
    const response = await fetch(`${API_URL}/api/user/by-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, firebase_uid: firebaseUid })
    });
    
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error('Error fetching user from backend:', error);
    return null;
  }
};

// Create user in backend MongoDB
const createUserInBackend = async (userData) => {
  try {
    console.log('Creating user in backend:', userData);
    
    const response = await fetch(`${API_URL}/api/user/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData)
    });
    
    console.log('Backend response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('User created successfully:', data);
      return data.user; // Return the user object
    } else {
      const errorData = await response.json();
      console.error('Backend error:', errorData);
      throw new Error(errorData.detail || 'Failed to create user in database');
    }
  } catch (error) {
    console.error('Error creating user in backend:', error);
    throw error;
  }
};

export const login = async (email, password) => {
  try {
    // Step 1: Authenticate with Firebase
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Step 2: Fetch user data from MongoDB
    let backendUser = await fetchUserFromBackend(email, user.uid);
    
    // If user doesn't exist in MongoDB, create them with default customer role
    if (!backendUser) {
      const newUser = {
        firebase_uid: user.uid,
        email: user.email,
        role: 'customer',
        name: user.displayName || email.split('@')[0],
        balance: 100000.00
      };
      
      backendUser = await createUserInBackend(newUser);
      
      if (!backendUser) {
        throw new Error('Failed to create user profile');
      }
    }
    
    const userData = {
      uid: user.uid,
      email: user.email,
      role: backendUser.role,
      name: backendUser.name,
      balance: backendUser.balance || 0
    };
    
    sessionStorage.setItem('user', JSON.stringify(userData));
    return { success: true, user: userData };
  } catch (error) {
    console.error('Login error:', error);
    let errorMessage = 'Invalid credentials';
    
    if (error.code === 'auth/invalid-credential') {
      errorMessage = 'Invalid email or password';
    } else if (error.code === 'auth/user-not-found') {
      errorMessage = 'No account found with this email';
    } else if (error.code === 'auth/wrong-password') {
      errorMessage = 'Incorrect password';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Too many failed attempts. Try again later';
    } else if (error.code === 'auth/network-request-failed') {
      errorMessage = 'Network error. Check your connection';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return { 
      success: false, 
      error: errorMessage
    };
  }
};

export const signup = async (email, password, role = 'customer', additionalData = {}) => {
  try {
    // Step 1: Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Step 2: Create user profile in MongoDB
    const userData = {
      firebase_uid: user.uid,
      email: user.email,
      role: role,
      name: additionalData.name || email.split('@')[0],
      balance: role === 'customer' ? 100000.00 : 0,
      business_name: role === 'admin' ? additionalData.businessName : null
    };
    
    const backendUser = await createUserInBackend(userData);
    
    if (!backendUser) {
      // Rollback Firebase user if backend creation fails
      await user.delete();
      throw new Error('Failed to create user profile');
    }
    
    const completeUserData = {
      uid: user.uid,
      email: user.email,
      role: backendUser.role,
      name: backendUser.name,
      balance: backendUser.balance
    };
    
    sessionStorage.setItem('user', JSON.stringify(completeUserData));
    return { success: true, user: completeUserData };
  } catch (error) {
    console.error('Signup error:', error);
    let errorMessage = 'Signup failed';
    
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'Email already registered';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Password should be at least 6 characters';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return { 
      success: false, 
      error: errorMessage
    };
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
    sessionStorage.removeItem('user');
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, error: error.message };
  }
};

export const getCurrentUser = () => {
  const user = sessionStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const isAuthenticated = () => {
  return getCurrentUser() !== null;
};

export const hasRole = (role) => {
  const user = getCurrentUser();
  return user && user.role === role;
};

export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      const backendUser = await fetchUserFromBackend(firebaseUser.email, firebaseUser.uid);
      if (backendUser) {
        const userData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          role: backendUser.role,
          name: backendUser.name,
          balance: backendUser.balance
        };
        sessionStorage.setItem('user', JSON.stringify(userData));
        callback(userData);
      } else {
        callback(null);
      }
    } else {
      sessionStorage.removeItem('user');
      callback(null);
    }
  });
};