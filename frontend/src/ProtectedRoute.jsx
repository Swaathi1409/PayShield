import { Navigate } from 'react-router-dom';
import { isAuthenticated, hasRole } from './auth';

function ProtectedRoute({ children, requiredRole }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;