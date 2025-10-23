import React, { useState, useEffect } from 'react';
import { CreditCard, Lock, Shield, AlertTriangle, CheckCircle, LogOut, Users, Plus, DollarSign, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || "https://payshield-fraud-detection-app.onrender.com";

function EnhancedPaymentWidget({ currentUser, onLogout }) {
  const [accounts, setAccounts] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [transactionHistory, setTransactionHistory] = useState([]);
  
  const [formData, setFormData] = useState({
    receiver_account: '',
    receiver_bank: '',
    amount: '',
    payment_type: 'TRANSFER',
    cvv: '',
    purpose: 'General',
    save_contact: false,
    contact_nickname: ''
  });
  
  const [processing, setProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [fraudDetails, setFraudDetails] = useState(null);

  useEffect(() => {
    if (currentUser && currentUser.email) {
      fetchAccounts();
      fetchContacts();
      fetchTransactionHistory();
    }
  }, [currentUser]);

  const fetchAccounts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/accounts/list`, {
        headers: { 'Authorization': currentUser.email }
      });
      const data = await response.json();
      setAccounts(data.accounts || []);
      const primary = data.accounts?.find(acc => acc.is_primary);
      if (primary) setSelectedAccount(primary);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchContacts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/contacts/list`, {
        headers: { 'Authorization': currentUser.email }
      });
      const data = await response.json();
      setContacts(data.contacts || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const fetchTransactionHistory = async () => {
    try {
      const response = await fetch(`${API_URL}/api/v2/transactions/history?limit=5`, {
        headers: { 'Authorization': currentUser.email }
      });
      const data = await response.json();
      setTransactionHistory(data.transactions || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const handleLogout = () => {
    if (onLogout) onLogout();
  };

  const selectContact = (contact) => {
    setFormData({
      ...formData,
      receiver_account: contact.account_number,
      receiver_bank: contact.bank_name
    });
    setShowContactPicker(false);
  };

  const handlePayment = async () => {
    if (!formData.amount || !formData.receiver_account || !formData.cvv) {
      alert('Please fill all required fields');
      return;
    }

    if (!selectedAccount) {
      alert('Please select a payment account');
      return;
    }

    setProcessing(true);
    setPaymentStatus(null);

    try {
      // ✅ FIX: Include sender_account_id in the request
      const response = await fetch(`${API_URL}/api/v2/transactions/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': currentUser.email,
          'User-Agent': navigator.userAgent
        },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          sender_account_id: selectedAccount._id  // ← ADD THIS LINE
        })
      });

      const result = await response.json();

      console.log('Transaction Result:', result);

      if (result.decision === 'BLOCK') {
        setProcessing(false);
        setFraudDetails(result);
        setShowBlockedModal(true);
        return;
      }

      if (result.decision === 'REVIEW') {
        setProcessing(false);
        setPaymentStatus({
          type: 'review',
          message: 'Your payment is under security review. We will notify you within 15 minutes.',
          transactionId: result.transaction_id,
          details: result
        });
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setProcessing(false);
      setPaymentStatus({
        type: 'success',
        message: 'Payment successful!',
        transactionId: result.transaction_id,
        newBalance: result.new_balance
      });

      fetchAccounts();
      fetchTransactionHistory();

    } catch (error) {
      console.error('Payment error:', error);
      setProcessing(false);
      setPaymentStatus({
        type: 'error',
        message: 'Payment failed. Please try again.'
      });
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Please log in to continue</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">PayShield Checkout</h1>
              <p className="text-sm text-gray-600">Secure Payment Portal</p>
              {currentUser?.role === 'customer' && (
              <p className="text-sm text-gray-600 mt-2">
                <Link to="/accounts" className="text-indigo-600 hover:text-indigo-700 font-medium">
                  Manage Accounts
                </Link>
              </p>
            )}
            </div>
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

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            {!paymentStatus ? (
              <>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Pay From
                  </label>
                  {accounts.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed">
                      <CreditCard className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">No accounts added</p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {accounts.map((account) => (
                        <div
                          key={account._id}
                          onClick={() => setSelectedAccount(account)}
                          className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                            selectedAccount?._id === account._id
                              ? 'border-indigo-600 bg-indigo-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <CreditCard className="w-8 h-8 text-indigo-600" />
                              <div>
                                <p className="font-semibold text-gray-900">{account.bank_name}</p>
                                <p className="text-sm text-gray-600 font-mono">{account.account_number}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-gray-900">
                                ${account.balance?.toLocaleString() || '0.00'}
                              </p>
                              {account.is_primary && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                  Primary
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mb-5">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Pay To
                    </label>
                    <button
                      onClick={() => setShowContactPicker(true)}
                      className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
                    >
                      <Users className="w-4 h-4" />
                      Select Contact
                    </button>
                  </div>
                  <div className="grid gap-3">
                    <input
                      type="text"
                      value={formData.receiver_account}
                      onChange={(e) => setFormData({...formData, receiver_account: e.target.value})}
                      placeholder="Receiver Account Number"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <input
                      type="text"
                      value={formData.receiver_bank}
                      onChange={(e) => setFormData({...formData, receiver_bank: e.target.value})}
                      placeholder="Receiver Bank Name (Optional)"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <DollarSign className="w-4 h-4 inline mr-1" />
                      Amount
                    </label>
                    <input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      placeholder="0.00"
                      step="0.01"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Type
                    </label>
                    <select
                      value={formData.payment_type}
                      onChange={(e) => setFormData({...formData, payment_type: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="TRANSFER">Transfer</option>
                      <option value="PAYMENT">Payment</option>
                      <option value="CASH_OUT">Cash Out</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Purpose
                    </label>
                    <input
                      type="text"
                      value={formData.purpose}
                      onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                      placeholder="e.g., Shopping, Bill Payment"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CVV
                    </label>
                    <input
                      type="password"
                      value={formData.cvv}
                      onChange={(e) => setFormData({...formData, cvv: e.target.value})}
                      placeholder="123"
                      maxLength={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      id="save_contact"
                      checked={formData.save_contact}
                      onChange={(e) => setFormData({...formData, save_contact: e.target.checked})}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <label htmlFor="save_contact" className="text-sm text-gray-700 font-medium">
                      Save as contact for future payments
                    </label>
                  </div>
                  {formData.save_contact && (
                    <input
                      type="text"
                      value={formData.contact_nickname}
                      onChange={(e) => setFormData({...formData, contact_nickname: e.target.value})}
                      placeholder="Contact nickname (e.g., Mom, John)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  )}
                </div>

                <button
                  onClick={handlePayment}
                  disabled={processing || !selectedAccount}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      Pay ${formData.amount || '0.00'}
                    </>
                  )}
                </button>

                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
                  <Shield className="w-4 h-4" />
                  <span>Protected by PayShield AI Fraud Detection</span>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                {paymentStatus.type === 'success' && (
                  <>
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Payment Successful!</h3>
                    <p className="text-gray-600 mb-2">{paymentStatus.message}</p>
                    <p className="text-sm text-gray-500 mb-4">
                      New Balance: <span className="font-bold">${paymentStatus.newBalance?.toLocaleString()}</span>
                    </p>
                    <p className="text-xs text-gray-500 font-mono bg-gray-50 px-4 py-2 rounded inline-block">
                      {paymentStatus.transactionId}
                    </p>
                    <button
                      onClick={() => {
                        setPaymentStatus(null);
                        setFormData({
                          ...formData,
                          receiver_account: '',
                          receiver_bank: '',
                          amount: '',
                          cvv: '',
                          purpose: 'General',
                          save_contact: false,
                          contact_nickname: ''
                        });
                      }}
                      className="mt-6 text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      Make Another Payment
                    </button>
                  </>
                )}

                {paymentStatus.type === 'review' && (
                  <>
                    <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Clock className="w-10 h-10 text-yellow-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Under Review</h3>
                    <p className="text-gray-600 mb-4">{paymentStatus.message}</p>
                    <p className="text-xs text-gray-500 font-mono bg-gray-50 px-4 py-2 rounded inline-block">
                      {paymentStatus.transactionId}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
            {transactionHistory.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No transactions yet</p>
            ) : (
              <div className="space-y-3">
                {transactionHistory.map((txn) => (
                  <div key={txn.transaction_id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        ${txn.amount?.toLocaleString()}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        txn.decision === 'APPROVE' 
                          ? 'bg-green-100 text-green-700'
                          : txn.decision === 'BLOCK'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {txn.decision}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">{txn.payment_type}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(txn.timestamp).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Balance</span>
                <span className="text-sm font-bold text-gray-900">
                  ${accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Linked Accounts</span>
                <span className="text-sm font-bold text-gray-900">{accounts.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Saved Contacts</span>
                <span className="text-sm font-bold text-gray-900">{contacts.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showContactPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Select Contact</h3>
              <button onClick={() => setShowContactPicker(false)} className="text-gray-400 hover:text-gray-600">
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            {contacts.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No saved contacts</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {contacts.map((contact) => (
                  <div
                    key={contact._id}
                    onClick={() => selectContact(contact)}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 cursor-pointer transition"
                  >
                    <p className="font-semibold text-gray-900">{contact.nickname}</p>
                    <p className="text-sm text-gray-600 font-mono">{contact.account_number}</p>
                    <p className="text-xs text-gray-500">{contact.bank_name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showBlockedModal && fraudDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-10 h-10 text-red-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 text-center mb-3">
              Transaction Blocked
            </h3>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm font-semibold text-red-900 mb-2">
                This transaction has been blocked for your protection.
              </p>
              <p className="text-xs text-red-700">
                Our AI-powered fraud detection system identified suspicious patterns that match known fraud indicators.
              </p>
            </div>

            <div className="mb-6">
              <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Risk Factors Detected
              </h4>
              <div className="space-y-2">
                {fraudDetails.risk_factors?.map((factor, idx) => (
                  <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-sm text-gray-800">{factor}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <h4 className="text-sm font-bold text-yellow-900 mb-2">Risk Score</h4>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-red-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${fraudDetails.risk_score * 100}%` }}
                  ></div>
                </div>
                <span className="text-lg font-bold text-red-600">
                  {(fraudDetails.risk_score * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowBlockedModal(false);
                  window.open('o:support@payshield.com', '_blank');
                }}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
              >
                Contact Support
              </button>
              <button
                onClick={() => {
                  setShowBlockedModal(false);
                  setProcessing(false);
                }}
                className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                Cancel Transaction
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EnhancedPaymentWidget;