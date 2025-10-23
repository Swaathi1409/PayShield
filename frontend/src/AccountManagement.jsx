import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Trash2, Check, X, Shield } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || "https://payshield-fraud-detection-app.onrender.com";

function AccountManagement({ userEmail }) {
  const [accounts, setAccounts] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    account_number: '',
    bank_name: '',
    account_type: 'savings',
    expiry_date: '',
    cardholder_name: '',
    is_primary: false
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/accounts/list`, {
        headers: { 'Authorization': userEmail }
      });
      const data = await response.json();
      setAccounts(data.accounts || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      setLoading(false);
    }
  };

  const handleAddAccount = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`${API_URL}/api/accounts/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': userEmail
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await fetchAccounts();
        setShowAddForm(false);
        setFormData({
          account_number: '',
          bank_name: '',
          account_type: 'savings',
          expiry_date: '',
          cardholder_name: '',
          is_primary: false
        });
      }
    } catch (error) {
      console.error('Error adding account:', error);
    }
  };

  const formatExpiryDate = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payment Accounts</h2>
          <p className="text-sm text-gray-600 mt-1">Manage your linked bank accounts and cards</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          <Plus className="w-5 h-5" />
          Add Account
        </button>
      </div>

      <div className="grid gap-4 mb-6">
        {accounts.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-4">No accounts added yet</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Add your first account
            </button>
          </div>
        ) : (
          accounts.map((account) => (
            <div
              key={account._id}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {account.bank_name}
                      </h3>
                      {account.is_primary && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded">
                          Primary
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 font-mono text-sm">{account.account_number}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {account.cardholder_name} • {account.account_type}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-gray-500">Expires: {account.expiry_date}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        account.status === 'active' 
                          ? 'bg-green-50 text-green-700' 
                          : 'bg-red-50 text-red-700'
                      }`}>
                        {account.status}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">
                    ${account.balance?.toLocaleString() || '0.00'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Available Balance</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Add Payment Account</h3>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddAccount} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Number
                </label>
                <input
                  type="text"
                  value={formData.account_number}
                  onChange={(e) => setFormData({...formData, account_number: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="1234567890123456"
                  maxLength={16}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={formData.bank_name}
                  onChange={(e) => setFormData({...formData, bank_name: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="HDFC Bank"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Type
                </label>
                <select
                  value={formData.account_type}
                  onChange={(e) => setFormData({...formData, account_type: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                >
                  <option value="savings">Savings</option>
                  <option value="current">Current/Checking</option>
                  <option value="credit_card">Credit Card</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cardholder Name
                </label>
                <input
                  type="text"
                  value={formData.cardholder_name}
                  onChange={(e) => setFormData({...formData, cardholder_name: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expiry Date
                </label>
                <input
                  type="text"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({
                    ...formData, 
                    expiry_date: formatExpiryDate(e.target.value)
                  })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="MM/YY"
                  maxLength={5}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Card expiry date (Month/Year)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_primary"
                  checked={formData.is_primary}
                  onChange={(e) => setFormData({...formData, is_primary: e.target.checked})}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="is_primary" className="text-sm text-gray-700">
                  Set as primary account
                </label>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex gap-2">
                  <Shield className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-blue-800 font-medium mb-1">
                      Security Notice
                    </p>
                    <p className="text-xs text-blue-700">
                      CVV is only required during payment and never stored. Your account information is encrypted with bank-level security.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
                >
                  Add Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AccountManagement;