import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from './auth';
import { Shield, Lock, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const result = await login(email, password);
    
    setLoading(false);
    
    if (result.success) {
      // Role-based redirection
      const roleRoutes = {
        'developer': '/testing',
        'customer': '/checkout',
        'admin': '/admin'
      };
      
      const route = roleRoutes[result.user.role] || '/login';
      navigate(route, { replace: true });
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* Video Background */}
      <video 
        autoPlay 
        loop 
        muted 
        playsInline 
        className="absolute top-0 left-0 w-full h-full object-cover"
        style={{ 
          zIndex: -2,
          position: 'fixed',
          minWidth: '100%',
          minHeight: '100%'
        }}
      >
        <source src="/videos/background.mp4" type="video/mp4" />
      </video>
      
      {/* Dark overlay for better readability */}
      <div 
        className="absolute top-0 left-0 w-full h-full bg-black"
        style={{ zIndex: -1, opacity: 0.1 }}
      ></div>
      
      
    

      <div 
        className="bg-white bg-opacity-95 rounded-2xl shadow-2xl p-8 w-full max-w-md"
        style={{
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)'
        }}
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">PayShield</h1>
          <p className="text-gray-600">AI-Powered Fraud Detection</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="w-4 h-4 inline mr-2" />
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              placeholder="your@email.com"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Lock className="w-4 h-4 inline mr-2" />
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center mb-4">
            Don't have an account?{' '}
            <Link to="/signup" className="text-indigo-600 hover:text-indigo-700 font-semibold">
              Sign Up
            </Link>
          </p>
          
          <p className="text-sm text-gray-600 mb-3">Demo Accounts:</p>
          <div className="space-y-2 text-xs text-gray-500">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-2 rounded border border-blue-100">
              👨‍💻 Developer: developer@test.com
            </div>
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-2 rounded border border-purple-100">
              👤 Customer: customer@test.com
            </div>
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-2 rounded border border-green-100">
              👑 Admin: admin@test.com
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;