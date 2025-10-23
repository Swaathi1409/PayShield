import React, { useState, useEffect } from 'react';
import { AlertCircle, Shield, TrendingUp, DollarSign, Activity, LogOut } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { logout, getCurrentUser } from './auth'; // Import getCurrentUser
import { auth } from './firebase'; // make sure you import auth
import { onAuthStateChanged } from 'firebase/auth';


function MerchantDashboard() {
  const [stats, setStats] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const currentUser = getCurrentUser(); // Get current user

  useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) {
      fetchDashboardData(); // fetch dashboard only if user exists
    } else {
      navigate('/login');   // redirect if logged out
    }
  });

  return () => unsubscribe(); // clean up listener on unmount
}, []);


  const fetchDashboardData = async () => {
    const apiUrl= import.meta.env.VITE_API_URL || "https://payshield-fraud-detection-app.onrender.com";
    
    try {
      // Fetch stats (no auth required)
      const statsRes = await fetch(`${apiUrl}/api/v2/analytics/dashboard`);
      const statsData = await statsRes.json();
      setStats(statsData.overview);

      // Fetch transactions with auth header
      const txnRes = await fetch(`${apiUrl}/api/v2/transactions/history?limit=10`, {
        headers: {
          'Authorization': currentUser.email
        }
      });
      
      if (txnRes.ok) {
        const txnData = await txnRes.json();
        setRecentTransactions(txnData.transactions || []);

        // Filter for alerts
        const alertTransactions = (txnData.transactions || []).filter(
          t => t.decision === 'BLOCK' || t.decision === 'REVIEW'
        ).slice(0, 5);
        setAlerts(alertTransactions);
      } else {
        console.error('Failed to fetch transactions:', txnRes.status);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getRiskBadge = (level) => {
    const styles = {
      CRITICAL: 'bg-red-100 text-red-800 border-red-300',
      HIGH: 'bg-orange-100 text-orange-800 border-orange-300',
      MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      LOW: 'bg-green-100 text-green-800 border-green-300',
      VERY_LOW: 'bg-green-50 text-green-700 border-green-200'
    };
    return styles[level] || styles.MEDIUM;
  };

  const getDecisionBadge = (decision) => {
    const styles = {
      BLOCK: 'bg-red-600 text-white',
      REVIEW: 'bg-yellow-600 text-white',
      APPROVE: 'bg-green-600 text-white'
    };
    return styles[decision] || styles.REVIEW;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">PayShield</h1>
              <p className="text-sm text-gray-600">Merchant Fraud Protection Dashboard</p>
              {currentUser && (
                <p className="text-xs text-gray-500 mt-1">
                  Logged in as: {currentUser.email} ({currentUser.role})
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-green-700">System Active</span>
            </div>
            
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm font-semibold text-red-700 hover:bg-red-100 transition"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Total Transactions</p>
          <p className="text-3xl font-bold text-gray-900">{stats?.total_transactions || 0}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Fraud Detection Rate</p>
          <p className="text-3xl font-bold text-red-600">{stats?.fraud_detection_rate?.toFixed(1) || 0}%</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Active Users</p>
          <p className="text-3xl font-bold text-green-600">{stats?.active_users || 0}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Total Volume</p>
          <p className="text-3xl font-bold text-purple-600">${(stats?.total_volume || 0).toLocaleString()}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Alerts */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            Recent Alerts
          </h2>
          
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Shield className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No alerts</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.transaction_id} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${getDecisionBadge(alert.decision)}`}>
                      {alert.decision}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{alert.transaction_id}</p>
                  <p className="text-xs text-red-700 mt-1">{alert.risk_level} Risk</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            Recent Transactions
          </h2>
          
          {recentTransactions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No transactions yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Transaction</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Type</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Amount</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Risk</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map((txn) => (
                    <tr key={txn.transaction_id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{txn.transaction_id}</p>
                          <p className="text-xs text-gray-500">{new Date(txn.timestamp).toLocaleString()}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-700">{txn.payment_type || txn.type}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-sm font-semibold text-gray-900">${txn.amount?.toLocaleString() || '0'}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`px-2 py-1 text-xs font-semibold rounded border ${getRiskBadge(txn.risk_level)}`}>
                            {txn.risk_level}
                          </span>
                          <span className="text-xs text-gray-500">{((txn.risk_score || 0) * 100).toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-3 py-1 text-xs font-semibold rounded ${getDecisionBadge(txn.decision)}`}>
                          {txn.decision}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MerchantDashboard;