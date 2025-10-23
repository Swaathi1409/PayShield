import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './Login';
import ProtectedRoute from './ProtectedRoute';
import TestingUI from './TestingUI';
import EnhancedPaymentWidget from './EnhancedPaymentWidget';
import { logout, onAuthChange } from './auth';
import Signup from './Signup';
import AccountManagement from './AccountManagement';
import AdminDashboard from './AdminDashboard';

// Wrapper component to handle admin logout
function AdminDashboardWrapper() {
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };
  
  return <AdminDashboard onLogout={handleLogout} />;
}

// Wrapper for TestingUI
function TestingUIWrapper() {
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };
  
  return <TestingUI onLogout={handleLogout} />;
}

// Wrapper for EnhancedPaymentWidget
function CheckoutWrapper() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthChange((userData) => {
      setUser(userData);
    });
    return () => unsubscribe();
  }, []);
  
  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };
  
  return <EnhancedPaymentWidget currentUser={user} onLogout={handleLogout} />;
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to auth state changes - this handles both login AND logout
    const unsubscribe = onAuthChange((userData) => {
      console.log('App: Auth state changed', userData);
      setUser(userData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []); // ← Empty dependency array - only run once on mount
  
  // Show loading screen while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading PayShield...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Root redirect */}
        <Route 
          path="/" 
          element={
            user ? (
              user.role === 'developer' ? <Navigate to="/testing" replace /> :
              user.role === 'customer' ? <Navigate to="/checkout" replace /> :
              user.role === 'admin' ? <Navigate to="/admin" replace /> :
              <Navigate to="/login" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        
        {/* Public routes */}
        <Route 
          path="/login" 
          element={user ? <Navigate to="/" replace /> : <Login />} 
        />
        <Route 
          path="/signup" 
          element={user ? <Navigate to="/" replace /> : <Signup />} 
        />

        {/* Developer routes */}
        <Route 
          path="/testing" 
          element={
            <ProtectedRoute requiredRole="developer">
              <TestingUIWrapper />
            </ProtectedRoute>
          } 
        />

        {/* Customer routes */}
        <Route 
          path="/checkout" 
          element={
            <ProtectedRoute requiredRole="customer">
              <CheckoutWrapper />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/checkout-v2" 
          element={
            <ProtectedRoute requiredRole="customer">
              <CheckoutWrapper />
            </ProtectedRoute>
          }
        />

        <Route 
          path="/accounts" 
          element={
            <ProtectedRoute requiredRole="customer">
              <AccountManagement userEmail={user?.email} />
            </ProtectedRoute>
          } 
        />

        {/* Admin routes */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboardWrapper />
            </ProtectedRoute>
          } 
        />

        {/* Catch all - redirect to root (which handles role-based routing) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;