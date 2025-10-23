import React, { useState, useEffect } from 'react';
import { Shield, Activity, AlertCircle, DollarSign, TrendingUp, Users, CreditCard, LogOut, Clock, CheckCircle, XCircle, RefreshCw, Check, X } from 'lucide-react';

const API_URL = 'http://localhost:8000';

function AdminDashboard({ onLogout, userEmail }) {
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [processingTxn, setProcessingTxn] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      
      setError(null);

      const [statsRes, txnRes, alertsRes] = await Promise.all([
        fetch(`${API_URL}/api/v2/analytics/dashboard`),
        fetch(`${API_URL}/api/v1/transactions/history?limit=20`),
        fetch(`${API_URL}/api/v1/alerts?limit=10`)
      ]);

      if (!statsRes.ok || !txnRes.ok || !alertsRes.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const statsData = await statsRes.json();
      const txnData = await txnRes.json();
      const alertsData = await alertsRes.json();

      setStats(statsData);
      setTransactions(txnData.transactions || []);
      setAlerts(alertsData.alerts || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please check backend connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleApproveTransaction = async (transactionId) => {
    if (!confirm('Are you sure you want to APPROVE this transaction? This will transfer funds immediately.')) {
      return;
    }

    try {
      setProcessingTxn(transactionId);
      
      const response = await fetch(`${API_URL}/api/v2/transactions/${transactionId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': userEmail || 'admin@test.com',
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to approve transaction');
      }

      alert(`✅ Transaction approved!\nAmount: $${data.amount.toLocaleString()}\nNew Balance: $${data.new_sender_balance.toLocaleString()}`);
      
      // Refresh dashboard
      await fetchDashboardData(true);
      
    } catch (error) {
      console.error('Error approving transaction:', error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setProcessingTxn(null);
    }
  };

  const handleRejectTransaction = async (transactionId) => {
    if (!confirm('Are you sure you want to REJECT this transaction? This action cannot be undone.')) {
      return;
    }

    try {
      setProcessingTxn(transactionId);
      
      const response = await fetch(`${API_URL}/api/v2/transactions/${transactionId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': userEmail || 'admin@test.com',
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to reject transaction');
      }

      alert('✅ Transaction rejected successfully');
      
      // Refresh dashboard
      await fetchDashboardData(true);
      
    } catch (error) {
      console.error('Error rejecting transaction:', error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setProcessingTxn(null);
    }
  };

  const handleLogout = () => {
    if (onLogout) onLogout();
  };

  const handleManualRefresh = () => {
    fetchDashboardData(true);
  };

  const getRiskBadge = (level) => {
    const styles = {
      CRITICAL: 'bg-red-100 text-red-800 border-red-300',
      HIGH: 'bg-orange-100 text-orange-800 border-orange-300',
      MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      LOW: 'bg-green-100 text-green-800 border-green-300',
      VERY_LOW: 'bg-green-50 text-green-700 border-green-200',
      ADMIN_APPROVED: 'bg-blue-100 text-blue-800 border-blue-300',
      ADMIN_REJECTED: 'bg-gray-100 text-gray-800 border-gray-300'
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
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  const overview = stats?.overview || {};
  const decisions = stats?.decisions || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">PayShield Admin</h1>
              <p className="text-sm text-gray-600">AI Fraud Detection Control Center</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {error && (
              <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}
            
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>

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

      {/* Key Metrics */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-indigo-600" />
            </div>
            <span className="text-xs text-gray-500 font-medium">ALL TIME</span>
          </div>
          <p className="text-sm text-gray-600 mb-1">Total Transactions</p>
          <p className="text-3xl font-bold text-gray-900">{overview.total_transactions?.toLocaleString() || 0}</p>
          <p className="text-xs text-green-600 mt-2">↑ Active monitoring</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-xs text-gray-500 font-medium">APPROVED ONLY</span>
          </div>
          <p className="text-sm text-gray-600 mb-1">Total Transaction Value</p>
          <p className="text-3xl font-bold text-purple-600">${(overview.total_volume || 0).toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-2">Avg: ${(overview.average_transaction || 0).toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <span className="text-xs text-gray-500 font-medium">BLOCKED</span>
          </div>
          <p className="text-sm text-gray-600 mb-1">Fraud Prevented</p>
          <p className="text-3xl font-bold text-red-600">{decisions.blocked || 0}</p>
          <p className="text-xs text-red-600 mt-2">{(overview.fraud_detection_rate || 0).toFixed(1)}% detection rate</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-xs text-gray-500 font-medium">APPROVED</span>
          </div>
          <p className="text-sm text-gray-600 mb-1">Legitimate Transactions</p>
          <p className="text-3xl font-bold text-green-600">{decisions.approved || 0}</p>
          <p className="text-xs text-gray-500 mt-2">{decisions.under_review || 0} under review</p>
        </div>
      </div>

      {/* Additional Stats Row */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">{overview.active_users || 0}</p>
            </div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: '75%' }}></div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Linked Accounts</p>
              <p className="text-2xl font-bold text-gray-900">{overview.total_accounts || 0}</p>
            </div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full" style={{ width: '60%' }}></div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending Review</p>
              <p className="text-2xl font-bold text-gray-900">{decisions.under_review || 0}</p>
            </div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-yellow-500 rounded-full" style={{ width: '30%' }}></div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Alerts */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Critical Alerts
            </h2>
            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded">
              {alerts.length}
            </span>
          </div>
          
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Shield className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No critical alerts</p>
              <p className="text-xs text-gray-400 mt-1">System is running smoothly</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-red-300 scrollbar-track-red-50 hover:scrollbar-thumb-red-400 pr-2">
              {alerts.map((alert, idx) => (
                <div key={alert._id || idx} className="p-4 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition">
                  <div className="flex items-start justify-between mb-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${getDecisionBadge(alert.decision)}`}>
                      {alert.decision}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm font-mono font-medium text-gray-900 mb-1">{alert.transaction_id}</p>
                  <p className="text-xs text-red-700 font-semibold mb-2">{alert.risk_level} Risk</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-900">
                      ${alert.amount?.toLocaleString() || '0'}
                    </span>
                    <span className="text-xs text-gray-600">
                      Score: {((alert.risk_score || 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                  {alert.risk_factors && alert.risk_factors.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-red-200">
                      <p className="text-xs text-red-800 line-clamp-1">{alert.risk_factors[0]}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Transaction Feed */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              Live Transaction Feed
            </h2>
          </div>
          
          {transactions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No transactions yet</p>
              <p className="text-xs text-gray-400 mt-1">Transactions will appear here</p>
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-indigo-300 scrollbar-track-indigo-50 hover:scrollbar-thumb-indigo-400">
              <table className="w-full min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Transaction</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Type</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Amount</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Risk</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((txn, idx) => (
                    <tr key={txn.transaction_id || idx} className="border-b border-gray-100 hover:bg-gray-50 transition">
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 font-mono">{txn.transaction_id}</p>
                          <p className="text-xs text-gray-500">{txn.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-700">{txn.type || txn.payment_type}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-sm font-semibold text-gray-900">${txn.amount?.toLocaleString() || '0'}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`px-2 py-1 text-xs font-semibold rounded border ${getRiskBadge(txn.risk_level)}`}>
                            {txn.risk_level}
                          </span>
                          <span className="text-xs text-gray-500">{((txn.risk_score || 0) * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-3 py-1 text-xs font-semibold rounded ${getDecisionBadge(txn.decision)}`}>
                          {txn.decision}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {txn.decision === 'REVIEW' ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleApproveTransaction(txn.transaction_id)}
                              disabled={processingTxn === txn.transaction_id}
                              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Approve and transfer funds"
                            >
                              <Check className="w-3 h-3" />
                              {processingTxn === txn.transaction_id ? '...' : 'Approve'}
                            </button>
                            <button
                              onClick={() => handleRejectTransaction(txn.transaction_id)}
                              disabled={processingTxn === txn.transaction_id}
                              className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Reject transaction"
                            >
                              <X className="w-3 h-3" />
                              {processingTxn === txn.transaction_id ? '...' : 'Reject'}
                            </button>
                          </div>
                        ) : txn.decision === 'APPROVE' ? (
                          <div className="text-center">
                            <span className="text-xs text-green-600 font-medium">✓ Completed</span>
                          </div>
                        ) : (
                          <div className="text-center">
                            <span className="text-xs text-red-600 font-medium">✗ Blocked</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Decision Distribution Chart */}
      <div className="max-w-7xl mx-auto mt-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Decision Distribution</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600 mb-1">{decisions.approved || 0}</div>
              <div className="text-sm text-gray-600">Approved</div>
              <div className="mt-2 h-2 bg-green-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-600 rounded-full transition-all"
                  style={{ width: `${overview.total_transactions > 0 ? (decisions.approved / overview.total_transactions * 100) : 0}%` }}
                ></div>
              </div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-3xl font-bold text-red-600 mb-1">{decisions.blocked || 0}</div>
              <div className="text-sm text-gray-600">Blocked</div>
              <div className="mt-2 h-2 bg-red-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-600 rounded-full transition-all"
                  style={{ width: `${overview.total_transactions > 0 ? (decisions.blocked / overview.total_transactions * 100) : 0}%` }}
                ></div>
              </div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-3xl font-bold text-yellow-600 mb-1">{decisions.under_review || 0}</div>
              <div className="text-sm text-gray-600">Under Review</div>
              <div className="mt-2 h-2 bg-yellow-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-yellow-600 rounded-full transition-all"
                  style={{ width: `${overview.total_transactions > 0 ? (decisions.under_review / overview.total_transactions * 100) : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;