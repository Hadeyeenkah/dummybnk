
import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useBankContext } from '../context/BankContext';
import AuroraBankLogo from '../components/AuroraBankLogo';
import '../App.css';

function BillsPage() {
  const { currentUser, payBill, isAuthenticated } = useBankContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    payee: '',
    amount: '',
    fromAccount: 'checking',
    category: 'Utilities',
    accountNumber: '',
    note: '',
  });
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [loading, setLoading] = useState(false);
  const [recentPayees, setRecentPayees] = useState([]);
  const [billHistory, setBillHistory] = useState([]);
  const [receipt, setReceipt] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const billCategories = ['Utilities', 'Internet', 'Phone', 'Rent', 'Insurance', 'Credit Card', 'Other'];
  const apiBase = process.env.REACT_APP_API_BASE || '/api';

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated && currentUser === null) {
      navigate('/login', { state: { from: '/bills', message: 'Please log in to access bill payments' } });
    }
  }, [isAuthenticated, currentUser, navigate]);

  // Fetch bill payment history
  useEffect(() => {
    const fetchBillHistory = async () => {
      // Only fetch if user is authenticated
      if (!currentUser) {
        return;
      }
      
      try {
        const res = await fetch(`${apiBase}/bills?limit=10`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        // Handle all response types gracefully
        if (res.ok) {
          const data = await res.json();
          const bills = data.bills || [];
          setBillHistory(bills);
          
          // Extract unique payees for recent payees list
          if (bills.length > 0) {
            const uniquePayees = [];
            const payeeNames = new Set();
            
            for (const bill of bills) {
              if (!payeeNames.has(bill.payee) && uniquePayees.length < 5) {
                payeeNames.add(bill.payee);
                uniquePayees.push({
                  id: bill._id,
                  name: bill.payee,
                  category: bill.category || 'Other',
                });
              }
            }
            
            if (uniquePayees.length > 0) {
              setRecentPayees(uniquePayees);
            }
          }
        } else if (res.status === 401 || res.status === 403) {
          console.log('Not authenticated - redirecting to login');
          navigate('/login', { state: { from: '/bills', message: 'Please log in to continue' } });
        } else {
          // For any other error (including 500), just log and continue with empty data
          console.log('Could not fetch bill history, status:', res.status);
          setBillHistory([]);
        }
      } catch (err) {
        // Network error or other issues - fail silently
        console.log('Failed to fetch bill history:', err.message);
        setBillHistory([]);
      }
    };
    
    // Add a small delay to ensure auth is ready
    const timer = setTimeout(fetchBillHistory, 300);
    return () => clearTimeout(timer);
  }, [apiBase, currentUser, navigate]);

  // Handle flash message from successful transfer
  useEffect(() => {
    if (location.state?.message) {
      setMessageType(location.state.type || 'success');
      setMessage(location.state.message);
      setTimeout(() => {
        setMessage('');
        navigate(location.pathname, { replace: true, state: {} });
      }, 4000);
    }
  }, [location.state, navigate, location.pathname]);

  const validateForm = () => {
    // Clear any existing messages
    setMessage('');
    setMessageType('');
    
    if (!formData.payee.trim()) {
      setMessageType('error');
      setMessage('Payee name is required');
      return false;
    }
    
    const amount = parseFloat(formData.amount);
    if (!formData.amount || isNaN(amount) || amount <= 0) {
      setMessageType('error');
      setMessage('Enter a valid amount greater than $0.00');
      return false;
    }
    
    if (amount > 100000) {
      setMessageType('error');
      setMessage('Amount exceeds maximum limit of $100,000.00');
      return false;
    }
    
    if (!formData.accountNumber.trim()) {
      setMessageType('error');
      setMessage('Account number is required');
      return false;
    }

    if (!currentUser) {
      setMessageType('error');
      setMessage('User session expired. Please log in again.');
      return false;
    }

    const balance = formData.fromAccount === 'checking' 
      ? (currentUser.checking || 0) 
      : (currentUser.savings || 0);
    
    if (balance < amount) {
      setMessageType('error');
      setMessage(`Insufficient funds. Available in ${formData.fromAccount}: $${balance.toFixed(2)}`);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      // Scroll to top to show error message
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setLoading(true);
    setMessage('Processing your payment...');
    setMessageType('info');

    try {
      const result = await payBill(currentUser.id, {
        payee: formData.payee.trim(),
        amount: parseFloat(formData.amount),
        category: formData.category,
        accountNumber: formData.accountNumber.trim(),
        fromAccount: formData.fromAccount,
        note: formData.note.trim(),
      });

      setLoading(false);

      if (result.success) {
        setMessageType('success');
        setMessage('✓ Bill payment completed successfully!');
        
        // Create receipt with proper data
        const billData = result.bill || {};
        const receiptData = {
          id: billData.id || billData._id || Date.now(),
          payee: billData.payee || formData.payee,
          amount: parseFloat(billData.amount || formData.amount),
          category: billData.category || formData.category,
          account: formData.fromAccount,
          reference: billData.reference || `BILL-${Date.now()}`,
          date: new Date(billData.paymentDate || Date.now()),
          status: billData.status || 'completed',
          accountNumber: formData.accountNumber,
        };
        
        setReceipt(receiptData);
        setShowReceiptModal(true);

        // Add to recent payees if not already there
        const payeeExists = recentPayees.some(p => p.name === formData.payee);
        if (!payeeExists) {
          const newPayee = { 
            id: Date.now(), 
            name: formData.payee, 
            category: formData.category 
          };
          setRecentPayees([newPayee, ...recentPayees.slice(0, 4)]);
        }

        // Update bill history locally
        const newBill = {
          _id: billData.id || billData._id || Date.now(),
          payee: formData.payee,
          amount: parseFloat(formData.amount),
          category: formData.category,
          paymentDate: new Date().toISOString(),
          reference: billData.reference || `BILL-${Date.now()}`,
          status: 'completed',
        };
        setBillHistory([newBill, ...billHistory]);

        // Reset form after short delay
        setTimeout(() => {
          setFormData({
            payee: '',
            amount: '',
            fromAccount: 'checking',
            category: 'Utilities',
            accountNumber: '',
            note: '',
          });
        }, 1500);
      } else {
        setMessageType('error');
        setMessage(result.message || 'Failed to process bill payment. Please try again.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (error) {
      setLoading(false);
      setMessageType('error');
      setMessage('Network error. Please check your connection and try again.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      console.error('Bill payment error:', error);
    }
  };

  const handleQuickPayee = (payee) => {
    setFormData({ 
      ...formData, 
      payee: payee.name, 
      category: payee.category 
    });
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReceiptClose = () => {
    setShowReceiptModal(false);
    setTimeout(() => {
      setReceipt(null);
      setMessage('');
      setMessageType('');
    }, 300);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadReceipt = () => {
    if (!receipt) return;
    
    const receiptText = `
AURORA BANK, FSB
Bill Payment Receipt
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Payment Details:
Payee: ${receipt.payee}
Amount: $${receipt.amount.toFixed(2)}
Category: ${receipt.category}
Account Number: ${receipt.accountNumber || 'N/A'}

Transaction Information:
From Account: ${receipt.account.charAt(0).toUpperCase() + receipt.account.slice(1)}
Reference: ${receipt.reference}
Date: ${receipt.date.toLocaleString()}
Status: ${receipt.status.toUpperCase()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Thank you for banking with Aurora Bank!
    `.trim();
    
    const blob = new Blob([receiptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bill-payment-receipt-${receipt.reference}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Don't render if not authenticated
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <p className="text-xl text-slate-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="absolute inset-0 -z-10 gradient-veil" />
      
      <header className="border-b border-white/5 bg-slate-900/50 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3 text-cyan-400">
            <AuroraBankLogo />
            <span className="text-lg font-semibold tracking-tight text-slate-50">Aurora Bank, FSB</span>
          </div>
          <Link to="/dashboard" className="text-sm text-cyan-200 hover:text-white transition">
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-200">Bill Payments</p>
          <h1 className="text-3xl font-semibold text-white mt-2">Pay Bills</h1>
          <p className="text-slate-300 mt-2">Manage your bill payments safely and securely</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 md:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-200">Payee Name</label>
                <input
                  type="text"
                  value={formData.payee}
                  onChange={(e) => setFormData({ ...formData, payee: e.target.value })}
                  placeholder="Electric Company, Rent Landlord, etc."
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-400 outline-none focus:border-cyan-300/50 transition"
                  maxLength="100"
                  disabled={loading}
                  required
                />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-200">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-300/50 transition"
                    disabled={loading}
                  >
                    {billCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-200">Account to Pay From</label>
                  <select
                    value={formData.fromAccount}
                    onChange={(e) => setFormData({ ...formData, fromAccount: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-300/50 transition"
                    disabled={loading}
                  >
                    <option value="checking">
                      Checking - ${((currentUser?.checking || 0).toFixed(2))}
                    </option>
                    <option value="savings">
                      Savings - ${((currentUser?.savings || 0).toFixed(2))}
                    </option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-200">Account/Reference Number</label>
                <input
                  type="text"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  placeholder="Customer/Account number at payee"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-400 outline-none focus:border-cyan-300/50 transition"
                  maxLength="50"
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-200">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="100000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pl-8 text-white placeholder-slate-400 outline-none focus:border-cyan-300/50 transition"
                    disabled={loading}
                    required
                  />
                </div>
                {formData.amount && parseFloat(formData.amount) > 0 && (
                  <p className="text-xs text-slate-400">
                    You are paying ${parseFloat(formData.amount).toFixed(2)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-200">Note (Optional)</label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Add a note for your records..."
                  rows="2"
                  maxLength="200"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-400 outline-none focus:border-cyan-300/50 transition resize-none"
                  disabled={loading}
                />
                {formData.note && (
                  <p className="text-xs text-slate-400">
                    {formData.note.length}/200 characters
                  </p>
                )}
              </div>

              {message && (
                <div className={`rounded-xl border p-4 ${
                  messageType === 'success'
                    ? 'border-green-500/20 bg-green-500/10 text-green-400'
                    : messageType === 'info'
                    ? 'border-blue-500/20 bg-blue-500/10 text-blue-400'
                    : 'border-red-500/20 bg-red-500/10 text-red-400'
                }`}>
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-cyan-400 py-3 text-sm font-semibold text-slate-900 transition hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Pay Bill'}
              </button>
            </form>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="mb-4 text-sm font-semibold text-white">Account Balance</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Checking</p>
                  <p className="text-2xl font-semibold text-cyan-400">
                    ${((currentUser?.checking || 0).toFixed(2))}
                  </p>
                </div>
                <div className="border-t border-white/10 pt-3">
                  <p className="text-xs text-slate-400 mb-1">Savings</p>
                  <p className="text-2xl font-semibold text-cyan-400">
                    ${((currentUser?.savings || 0).toFixed(2))}
                  </p>
                </div>
                <div className="border-t border-white/10 pt-3">
                  <p className="text-xs text-slate-400 mb-1">Total Balance</p>
                  <p className="text-2xl font-semibold text-white">
                    ${((currentUser?.balance || 0).toFixed(2))}
                  </p>
                </div>
              </div>
            </div>

            {recentPayees.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h3 className="mb-4 text-sm font-semibold text-white">Recent Payees</h3>
                <div className="space-y-2">
                  {recentPayees.map((payee) => (
                    <button
                      key={payee.id}
                      onClick={() => handleQuickPayee(payee)}
                      disabled={loading}
                      className="block w-full text-left rounded-lg p-3 hover:bg-white/10 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="font-medium text-white">{payee.name}</div>
                      <div className="text-xs text-slate-400">{payee.category}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bill Payment History */}
        <div className="mt-12">
          <div className="mb-6 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-white">Recent Payments</h2>
            <Link
              to="/transactions"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-white/10"
            >
              View transaction history
              <span aria-hidden>→</span>
            </Link>
          </div>
          {billHistory.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
              <p className="text-slate-400">No bill payments yet</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 divide-y divide-white/5">
              {billHistory.map((bill) => (
                <div key={bill._id} className="p-4 hover:bg-white/5 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-white">{bill.payee}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        {bill.category} • {new Date(bill.paymentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">{bill.reference}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-red-400">-${bill.amount.toFixed(2)}</div>
                      <div className={`text-xs mt-1 ${bill.status === 'completed' ? 'text-green-400' : 'text-yellow-400'}`}>
                        {bill.status === 'completed' ? '✓ Completed' : 'Pending'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Receipt Modal */}
      {showReceiptModal && receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-8">
            <div className="mb-6 text-center">
              <div className="text-5xl mb-3">✓</div>
              <h2 className="text-2xl font-semibold text-green-400">Payment Confirmed</h2>
              <p className="text-slate-300 mt-2">Your bill payment has been processed successfully</p>
            </div>

            <div className="space-y-4 border-y border-white/10 py-6">
              <div className="flex justify-between">
                <span className="text-slate-400">Payee:</span>
                <span className="font-semibold text-white">{receipt.payee}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount:</span>
                <span className="font-semibold text-white">${receipt.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Category:</span>
                <span className="text-white">{receipt.category}</span>
              </div>
              {receipt.accountNumber && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Account #:</span>
                  <span className="font-mono text-white">{receipt.accountNumber}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">From:</span>
                <span className="capitalize text-white">{receipt.account}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date:</span>
                <span className="text-white">
                  {receipt.date.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Reference:</span>
                <span className="font-mono text-xs text-cyan-400">{receipt.reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className="text-green-400 font-semibold uppercase">{receipt.status}</span>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleDownloadReceipt}
                className="flex-1 rounded-lg border border-cyan-400/50 px-4 py-3 text-sm font-semibold text-cyan-400 hover:bg-cyan-400/10 transition"
              >
                💾 Download
              </button>
              <button
                onClick={handlePrint}
                className="flex-1 rounded-lg border border-cyan-400/50 px-4 py-3 text-sm font-semibold text-cyan-400 hover:bg-cyan-400/10 transition"
              >
                🖨️ Print
              </button>
              <button
                onClick={handleReceiptClose}
                className="flex-1 rounded-lg bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-cyan-300 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BillsPage;
