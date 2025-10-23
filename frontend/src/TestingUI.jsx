import React, { useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, TrendingUp, DollarSign, Activity, LogOut } from 'lucide-react';

const API_URL = 'http://localhost:8000';

function TestingUI({onLogout}) {
  const [formData, setFormData] = useState({
    amount: '',
    sender_balance: '',
    receiver_balance: '',
    payment_type: 'TRANSFER',
    transactions_24h: 0,
    transactions_1h: 0
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/api/v1/transactions/score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: parseFloat(formData.amount),
          sender_balance: parseFloat(formData.sender_balance),
          receiver_balance: parseFloat(formData.receiver_balance || 0),
          payment_type: formData.payment_type,
          transactions_24h: parseInt(formData.transactions_24h || 0),
          transactions_1h: parseInt(formData.transactions_1h || 0)
        })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'Failed to calculate risk score');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level) => {
    const colors = {
      CRITICAL: 'text-red-600 bg-red-50 border-red-200',
      HIGH: 'text-orange-600 bg-orange-50 border-orange-200',
      MEDIUM: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      LOW: 'text-green-600 bg-green-50 border-green-200'
    };
    return colors[level] || colors.MEDIUM;
  };

  const getDecisionIcon = (decision) => {
    switch (decision) {
      case 'APPROVE':
        return <CheckCircle className="w-16 h-16 text-green-600" />;
      case 'BLOCK':
        return <XCircle className="w-16 h-16 text-red-600" />;
      case 'REVIEW':
        return <AlertTriangle className="w-16 h-16 text-yellow-600" />;
      default:
        return <Activity className="w-16 h-16 text-gray-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-3">
      <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
        <Shield className="w-8 h-8 text-white" />
      </div>
      <div>
        <h1 className="text-4xl font-bold text-gray-900">Fraud Detection Testing</h1>
        <p className="text-sm text-gray-600">AI-powered fraud detection system</p>
      </div>
    </div>
            
    {/* Logout Button */}
    <button
      onClick={onLogout}
      className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm font-semibold text-red-700 hover:bg-red-100 transition"
    >
      <LogOut className="w-4 h-4" />
      Logout
    </button>
  </div>
          
          <p className="text-gray-600 max-w-2xl">
            Test the AI-powered fraud detection system by inputting transaction parameters. 
            See how the ML model and business rules evaluate risk in real-time.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Form */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-indigo-600" />
              Transaction Parameters
            </h2>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Transaction Amount
                </label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  placeholder="10000.00"
                  step="0.01"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Sender Balance
                  </label>
                  <input
                    type="number"
                    name="sender_balance"
                    value={formData.sender_balance}
                    onChange={handleInputChange}
                    placeholder="50000.00"
                    step="0.01"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Receiver Balance
                  </label>
                  <input
                    type="number"
                    name="receiver_balance"
                    value={formData.receiver_balance}
                    onChange={handleInputChange}
                    placeholder="25000.00"
                    step="0.01"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Payment Type
                </label>
                <select
                  name="payment_type"
                  value={formData.payment_type}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="TRANSFER">Transfer</option>
                  <option value="PAYMENT">Payment</option>
                  <option value="CASH_OUT">Cash Out</option>
                  <option value="DEBIT">Debit</option>
                  <option value="CASH_IN">Cash In</option>
                </select>
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-indigo-900 mb-3">Velocity Features (Optional)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-indigo-700 mb-1">
                      Transactions (24h)
                    </label>
                    <input
                      type="number"
                      name="transactions_24h"
                      value={formData.transactions_24h}
                      onChange={handleInputChange}
                      placeholder="0"
                      min="0"
                      className="w-full px-3 py-2 border border-indigo-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-indigo-700 mb-1">
                      Transactions (1h)
                    </label>
                    <input
                      type="number"
                      name="transactions_1h"
                      value={formData.transactions_1h}
                      onChange={handleInputChange}
                      placeholder="0"
                      min="0"
                      className="w-full px-3 py-2 border border-indigo-200 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800 font-medium">{error}</p>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading || !formData.amount || !formData.sender_balance}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-lg font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    Calculating...
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    Calculate Risk Score
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Panel */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Activity className="w-6 h-6 text-indigo-600" />
              Risk Analysis Results
            </h2>

            {!result ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Shield className="w-20 h-20 text-gray-300 mb-4" />
                <p className="text-gray-600 font-medium mb-2">No analysis yet</p>
                <p className="text-sm text-gray-500">Fill in the form and click Calculate to see results</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Decision */}
                <div className="text-center">
                  {getDecisionIcon(result.decision)}
                  <h3 className="text-3xl font-bold text-gray-900 mt-4 mb-2">
                    {result.decision}
                  </h3>
                  <p className={`inline-flex items-center px-4 py-2 rounded-full font-semibold border-2 ${getRiskColor(result.risk_level)}`}>
                    {result.risk_level} RISK
                  </p>
                </div>

                {/* Risk Scores */}
                <div className="bg-gray-50 rounded-lg p-5 space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">Overall Risk Score</span>
                      <span className="text-2xl font-bold text-gray-900">
                        {(result.risk_score * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          result.risk_score > 0.7 ? 'bg-red-600' :
                          result.risk_score > 0.5 ? 'bg-orange-500' :
                          result.risk_score > 0.3 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${result.risk_score * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">ML Score</p>
                      <p className="text-lg font-bold text-indigo-600">
                        {(result.ml_score * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Rule Score</p>
                      <p className="text-lg font-bold text-purple-600">
                        {(result.rule_score * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Risk Factors */}
                {result.risk_factors && result.risk_factors.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      Risk Factors Detected
                    </h4>
                    <div className="space-y-2">
                      {result.risk_factors.map((factor, idx) => (
                        <div key={idx} className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <p className="text-sm text-red-800 font-medium">{factor}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Feature Analysis */}
                {result.features && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-bold text-blue-900 mb-3">Transaction Analysis</h4>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-blue-700">Amount to Balance</p>
                        <p className="font-bold text-blue-900">
                          {(result.features.amount_to_balance_ratio * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-blue-700">Account Drain</p>
                        <p className="font-bold text-blue-900">
                          {result.features.drain_percentage.toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-blue-700">Velocity (24h)</p>
                        <p className="font-bold text-blue-900">
                          {result.features.transactions_24h} txns
                        </p>
                      </div>
                      <div>
                        <p className="text-blue-700">Velocity (1h)</p>
                        <p className="font-bold text-blue-900">
                          {result.features.transactions_1h} txns
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Message */}
                <div className="text-center pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">{result.message}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4">How It Works</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <span className="text-indigo-600 font-bold">1</span>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Business Rules</h4>
                <p className="text-sm text-gray-600">
                  Checks for insufficient funds, high velocity, and suspicious patterns
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 font-bold">2</span>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">ML Model</h4>
                <p className="text-sm text-gray-600">
                  XGBoost classifier trained on 22+ engineered features
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 font-bold">3</span>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Final Decision</h4>
                <p className="text-sm text-gray-600">
                  Combines both scores to approve, review, or block the transaction
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TestingUI;