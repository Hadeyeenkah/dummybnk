import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useBankContext } from '../context/BankContext';
import AuroraBankLogo from '../components/AuroraBankLogo';
import { API_BASE, getAuthHeaders } from '../config';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Download,
  Home,
  Lock,
  MoreHorizontal,
  PiggyBank,
  Printer,
  ShieldCheck,
  Smartphone,
  Wallet,
  Wifi,
  Zap,
} from 'lucide-react';
import '../App.css';

// Minimum time the "processing" screen stays up before the receipt opens.
const PROCESSING_MS = 2500;

const CATEGORY_ICONS = {
  Utilities: Zap,
  Internet: Wifi,
  Phone: Smartphone,
  Rent: Home,
  Insurance: ShieldCheck,
  'Credit Card': CreditCard,
  Other: MoreHorizontal,
};

// Text that shrinks to fit its box so amounts never clip or wrap (styles live in App.css).
function Fit({ text, min = 12, max = 24, className = '' }) {
  const value = String(text);
  return (
    <div className="fit-box">
      <p
        className={`fit-text ${className}`}
        style={{ '--len': Math.max(value.length, 4), '--min': `${min}px`, '--max': `${max}px` }}
      >
        {value}
      </p>
    </div>
  );
}

const cardCls = 'rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(10,37,64,0.05)]';
const sectionTitleCls = 'text-base font-bold text-[#0a2540] sm:text-lg';
const labelCls = 'mb-1.5 block text-sm font-semibold text-slate-700';
const inputCls =
  'w-full min-w-0 rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#0b5cab] focus:ring-2 focus:ring-[#0b5cab]/20 disabled:bg-slate-50 disabled:opacity-60 sm:text-sm';

const money = (value) =>
  `$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function CategoryBadge({ category, size = 'h-10 w-10' }) {
  const Icon = CATEGORY_ICONS[category] || MoreHorizontal;
  return (
    <span className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-[#e8f0fa] text-[#0b5cab]`} aria-hidden="true">
      <Icon size={18} />
    </span>
  );
}

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
  const apiBase = API_BASE;

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
          headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
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

    const startedAt = Date.now();
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

      // On success, keep the processing screen up for a minimum time before the receipt appears.
      if (result.success) {
        const remaining = PROCESSING_MS - (Date.now() - startedAt);
        if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
      }

      setLoading(false);

      if (result.success) {
        setMessageType('success');
        setMessage('Bill payment submitted and is awaiting admin approval.');

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
      <div className="bank-dashboard flex min-h-screen items-center justify-center p-4 text-slate-900">
        <div className="text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#e8f0fa] text-[#0b5cab]">
            <Lock size={26} aria-hidden="true" />
          </span>
          <p className="text-lg text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  const checkingBalance = currentUser?.checking || 0;
  const savingsBalance = currentUser?.savings || 0;
  const amountNumber = parseFloat(formData.amount);

  const AccountPick = ({ id, balance }) => {
    const selected = formData.fromAccount === id;
    const Icon = id === 'savings' ? PiggyBank : Wallet;
    return (
      <button
        type="button"
        disabled={loading}
        aria-pressed={selected}
        onClick={() => setFormData({ ...formData, fromAccount: id })}
        className={`flex min-w-0 items-center gap-3 rounded-2xl border p-3 text-left transition disabled:opacity-60 ${
          selected ? 'border-[#0b5cab] bg-[#eef5fc] ring-2 ring-[#0b5cab]/20' : 'border-slate-200 bg-white hover:bg-slate-50'
        }`}
      >
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${selected ? 'bg-[#0b5cab] text-white' : 'bg-slate-100 text-slate-600'}`}>
          <Icon size={18} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold capitalize text-[#0a2540]">{id}</span>
          <Fit text={money(balance)} min={11} max={15} className="font-semibold text-slate-600" />
        </span>
      </button>
    );
  };

  const messageCls =
    messageType === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : messageType === 'info'
        ? 'border-blue-200 bg-blue-50 text-blue-800'
        : 'border-rose-200 bg-rose-50 text-rose-700';

  const receiptRows = receipt
    ? [
        ['Payee', receipt.payee],
        ['Amount', money(receipt.amount)],
        ['Category', receipt.category],
        receipt.accountNumber ? ['Account #', receipt.accountNumber, 'font-mono'] : null,
        ['From', receipt.account, 'capitalize'],
        [
          'Date',
          receipt.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        ],
        ['Reference', receipt.reference, 'font-mono text-xs'],
      ].filter(Boolean)
    : [];

  return (
    <div className="bank-dashboard text-slate-900">
      <header className="dashboard-header sticky top-0 z-30 border-b border-slate-200 no-print">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-2.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <AuroraBankLogo />
            <span className="truncate text-lg font-extrabold tracking-tight text-[#0a2540]">Aurora Bank, FSB</span>
          </div>
          <Link to="/dashboard" className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-[#0b5cab] hover:bg-slate-100">
            <ArrowLeft size={16} aria-hidden="true" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-6 sm:py-8 no-print">
        <h1 className="text-xl font-extrabold tracking-tight text-[#0a2540] sm:text-2xl lg:text-3xl">Pay bills</h1>
        <p className="mb-5 mt-0.5 text-sm text-slate-600">Manage your bill payments safely and securely.</p>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-6">
          {/* ------------------------------ Form ------------------------------ */}
          <form onSubmit={handleSubmit} className="min-w-0 space-y-4">
            {/* Payee + category */}
            <section className={`${cardCls} space-y-4 p-4 sm:p-5`}>
              <div>
                <label htmlFor="payee" className={labelCls}>Payee name</label>
                <input
                  id="payee"
                  type="text"
                  value={formData.payee}
                  onChange={(e) => setFormData({ ...formData, payee: e.target.value })}
                  placeholder="Electric Company, Rent Landlord, etc."
                  className={inputCls}
                  maxLength="100"
                  disabled={loading}
                  required
                />
              </div>

              <div>
                <span className={labelCls}>Category</span>
                <div className="grid grid-cols-2 gap-2 min-[480px]:grid-cols-3 sm:grid-cols-4" role="group" aria-label="Category">
                  {billCategories.map((cat) => {
                    const Icon = CATEGORY_ICONS[cat] || MoreHorizontal;
                    const selected = formData.category === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        disabled={loading}
                        aria-pressed={selected}
                        onClick={() => setFormData({ ...formData, category: cat })}
                        className={`flex min-w-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition disabled:opacity-60 ${
                          selected ? 'border-[#0b5cab] bg-[#eef5fc] text-[#0a4a8f]' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Icon size={16} className="shrink-0" aria-hidden="true" />
                        <span className="truncate">{cat}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label htmlFor="accountNumber" className={labelCls}>Account / reference number</label>
                <input
                  id="accountNumber"
                  type="text"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  placeholder="Customer/Account number at payee"
                  className={inputCls}
                  maxLength="50"
                  disabled={loading}
                  required
                />
              </div>
            </section>

            {/* Pay from */}
            <section className={`${cardCls} p-4 sm:p-5`}>
              <h2 className="mb-3 text-base font-bold text-[#0a2540]">Pay from</h2>
              <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2">
                <AccountPick id="checking" balance={checkingBalance} />
                <AccountPick id="savings" balance={savingsBalance} />
              </div>
            </section>

            {/* Amount */}
            <section className={`${cardCls} p-4 sm:p-5`}>
              <label htmlFor="amount" className="mb-2 block text-base font-bold text-[#0a2540]">Amount</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">$</span>
                <input
                  id="amount"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  max="100000"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full min-w-0 rounded-xl border border-slate-300 bg-white py-3.5 pl-10 pr-4 text-2xl font-extrabold tabular-nums text-[#0a2540] placeholder-slate-300 outline-none transition focus:border-[#0b5cab] focus:ring-2 focus:ring-[#0b5cab]/20 disabled:opacity-60"
                  disabled={loading}
                  required
                />
              </div>
              {formData.amount && amountNumber > 0 && (
                <p className="mt-2 text-sm text-slate-600">You are paying {money(amountNumber)}</p>
              )}
            </section>

            {/* Note */}
            <section className={`${cardCls} p-4 sm:p-5`}>
              <label htmlFor="note" className="mb-2 block text-base font-bold text-[#0a2540]">
                Note <span className="text-sm font-medium text-slate-400">(optional)</span>
              </label>
              <textarea
                id="note"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="Add a note for your records..."
                rows="2"
                maxLength="200"
                className={`${inputCls} resize-none`}
                disabled={loading}
              />
              {formData.note && (
                <p className="mt-1.5 text-right text-xs text-slate-500">{formData.note.length}/200 characters</p>
              )}
            </section>

            {message && (
              <div role="alert" className={`rounded-xl border p-4 text-sm font-medium ${messageCls}`}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#c8102e] py-3.5 text-base font-bold text-white transition hover:bg-[#a90d26] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Pay bill'}
            </button>
          </form>

          {/* ----------------------------- Sidebar ----------------------------- */}
          <aside className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
            <section className="hero-card rounded-3xl p-4 text-white sm:p-5">
              <p className="text-sm font-medium text-blue-100">Total balance</p>
              <div className="mt-1">
                <Fit text={money(currentUser?.balance)} min={20} max={36} className="font-extrabold tracking-tight" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <div className="min-w-0 rounded-2xl bg-white/10 p-3">
                  <p className="text-xs font-medium text-blue-100">Checking</p>
                  <div className="mt-1"><Fit text={money(checkingBalance)} min={12} max={20} className="font-bold" /></div>
                </div>
                <div className="min-w-0 rounded-2xl bg-white/10 p-3">
                  <p className="text-xs font-medium text-blue-100">Savings</p>
                  <div className="mt-1"><Fit text={money(savingsBalance)} min={12} max={20} className="font-bold" /></div>
                </div>
              </div>
            </section>

            {recentPayees.length > 0 && (
              <section className={`${cardCls} p-2 sm:p-3`}>
                <h2 className={`${sectionTitleCls} px-2 pb-1 pt-2`}>Recent payees</h2>
                <div className="divide-y divide-slate-100">
                  {recentPayees.map((payee) => (
                    <button
                      key={payee.id}
                      type="button"
                      onClick={() => handleQuickPayee(payee)}
                      disabled={loading}
                      className="flex w-full min-w-0 items-center gap-3 rounded-xl px-2 py-3 text-left transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <CategoryBadge category={payee.category} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-[#0a2540]">{payee.name}</span>
                        <span className="block truncate text-xs text-slate-500">{payee.category}</span>
                      </span>
                      <ChevronRight size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </section>
            )}
          </aside>
        </div>

        {/* Bill Payment History */}
        <section className="mt-6 sm:mt-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold text-[#0a2540] sm:text-xl">Recent payments</h2>
            <Link
              to="/transactions"
              className="flex shrink-0 items-center gap-0.5 rounded-full px-3 py-2 text-sm font-semibold text-[#0b5cab] hover:bg-white"
            >
              <span className="hidden min-[420px]:inline">View transaction history</span>
              <span className="min-[420px]:hidden">View all</span>
              <ChevronRight size={16} aria-hidden="true" />
            </Link>
          </div>
          {billHistory.length === 0 ? (
            <div className={`${cardCls} px-6 py-12 text-center`}>
              <p className="font-semibold text-[#0a2540]">No bill payments yet</p>
              <p className="mt-1 text-sm text-slate-500">Payments you make will appear here.</p>
            </div>
          ) : (
            <ul className={`${cardCls} divide-y divide-slate-100 overflow-hidden`}>
              {billHistory.map((bill) => {
                const completed = bill.status === 'completed';
                return (
                  <li key={bill._id} className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-slate-50 sm:px-5">
                    <CategoryBadge category={bill.category} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#0a2540]">{bill.payee}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {bill.category} · {new Date(bill.paymentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-[11px] text-slate-400">{bill.reference}</p>
                    </div>
                    <div className="w-[6.5rem] shrink-0 text-right sm:w-36">
                      <Fit text={`−${money(bill.amount)}`} min={11} max={16} className="text-right font-bold text-red-600" />
                      <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${completed ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                        {completed ? 'Completed' : 'Pending'}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

      {/* Processing screen (shown while the payment is submitted, before the receipt) */}
      {loading && !showReceiptModal && (
        <div className="no-print fixed inset-0 z-[70] flex items-center justify-center bg-[#0a2540]/70 p-4 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-live="assertive" aria-labelledby="bill-processing-title">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl sm:p-8">
            <div className="mx-auto mb-5 h-14 w-14 animate-spin rounded-full border-4 border-[#e8f0fa] border-t-[#0b5cab]" aria-hidden="true" />
            <h2 id="bill-processing-title" className="text-lg font-extrabold text-[#0a2540]">Processing your payment</h2>
            <p className="mt-1.5 text-sm text-slate-600">Securely submitting your details. Please don't close or refresh this page.</p>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
              <div className="bill-progress h-full rounded-full bg-[#0b5cab]" />
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes bill-progress { from { width: 8%; } to { width: 96%; } }
        .bill-progress { width: 8%; animation: bill-progress ${PROCESSING_MS}ms ease-out forwards; }
      `}</style>

      {/* Print styles: only the receipt is printed */}
      <style>{`
        @media print {
          @page { size: A4; margin: 0.5in; }
          body * { visibility: hidden; }
          .bill-receipt, .bill-receipt * { visibility: visible; }
          .receipt-overlay { position: static !important; display: block !important; overflow: visible !important; padding: 0 !important; background: white !important; }
          .bill-receipt { position: absolute; top: 0; left: 0; width: 100%; max-width: none !important; max-height: none !important; overflow: visible !important; box-shadow: none !important; border: none !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Receipt Modal */}
      {showReceiptModal && receipt && (
        <div className="receipt-overlay fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="receipt-title">
          <div className="bill-receipt w-full max-w-lg max-h-[92dvh] overflow-y-auto rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:rounded-3xl">
            <div className="px-5 pb-2 pt-6 text-center sm:px-8">
              <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={30} aria-hidden="true" />
              </span>
              <h2 id="receipt-title" className="text-xl font-extrabold text-[#0a2540] sm:text-2xl">Payment confirmed</h2>
              <p className="mt-1 text-sm text-slate-600">Your bill payment has been processed successfully</p>
              <div className="mt-4 rounded-2xl bg-[#eef5fc] px-4 py-4">
                <Fit text={money(receipt.amount)} min={22} max={36} className="text-center font-extrabold text-[#0a2540]" />
                <p className="mt-1 truncate text-sm text-slate-600">to {receipt.payee}</p>
              </div>
            </div>

            <div className="divide-y divide-slate-100 px-5 py-2 sm:px-8">
              {receiptRows.map(([label, value, extra]) => (
                <div key={label} className="flex items-start justify-between gap-4 py-2.5 text-sm">
                  <span className="shrink-0 text-slate-500">{label}</span>
                  <span className={`min-w-0 break-all text-right font-semibold text-slate-900 ${extra || ''}`}>{value}</span>
                </div>
              ))}
              <div className="flex items-start justify-between gap-4 py-2.5 text-sm">
                <span className="shrink-0 text-slate-500">Status</span>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold uppercase text-emerald-800">{receipt.status}</span>
              </div>
            </div>

            <div className="no-print sticky bottom-0 grid grid-cols-3 gap-2 border-t border-slate-200 bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 sm:gap-3 sm:px-8">
              <button
                type="button"
                onClick={handleDownloadReceipt}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-[#0b5cab] px-2 py-3 text-sm font-bold text-[#0b5cab] transition hover:bg-[#eef5fc]"
              >
                <Download size={16} aria-hidden="true" /> Download
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-[#0b5cab] px-2 py-3 text-sm font-bold text-[#0b5cab] transition hover:bg-[#eef5fc]"
              >
                <Printer size={16} aria-hidden="true" /> Print
              </button>
              <button
                type="button"
                onClick={handleReceiptClose}
                className="rounded-xl bg-[#0b5cab] px-2 py-3 text-sm font-bold text-white transition hover:bg-[#0a4a8f]"
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