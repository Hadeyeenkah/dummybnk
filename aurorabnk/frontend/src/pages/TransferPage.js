import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useBankContext } from '../context/BankContext';
import AuroraBankLogo from '../components/AuroraBankLogo';
import { API_BASE } from '../config';
import '../App.css';

function TransferPage() {
  const { currentUser, refreshProfile } = useBankContext();
  const navigate = useNavigate();
  const apiBase = API_BASE;
  const recipientLookupVersion = useRef(0);
  const submission = useRef({ fingerprint: '', idempotencyKey: '' });
  const [formData, setFormData] = useState({
    transferType: 'external',
    recipientName: '',
    recipientEmail: '',
    recipientAccountNumber: '',
    recipientRoutingNumber: '',
    lookupMethod: 'email', // 'email' or 'account'
    bankName: '',
    routingNumber: '',
    accountNumber: '',
    amount: '',
    fromAccount: 'checking',
    toAccount: 'savings',
    note: '',
  });
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recipientFound, setRecipientFound] = useState(null);

  const formatCurrency = (value) => `$${Number(value || 0).toFixed(2)}`;

  const handlePrint = () => {
    window.print();
  };

  const getAuthHeaders = (additionalHeaders = {}) => {
    const headers = { ...additionalHeaders };
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    return headers;
  };

  const refreshAccessToken = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    const response = await fetch(`${apiBase}/auth/refresh-token`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      // Cookie-based sessions ignore this field. It is only used by the
      // existing Safari fallback when third-party cookies are unavailable.
      body: JSON.stringify(refreshToken ? { refreshToken } : {}),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return false;

    if (data.tokens?.accessToken) localStorage.setItem('accessToken', data.tokens.accessToken);
    if (data.tokens?.refreshToken) localStorage.setItem('refreshToken', data.tokens.refreshToken);
    return true;
  };

  // The transfer endpoints accept cookie sessions and Authorization headers.
  // Retry exactly once after a refresh so an expired Safari/local-storage
  // access token does not turn a valid transfer into a misleading failure.
  const fetchWithAuth = async (url, options = {}) => {
    const request = () => fetch(url, {
      ...options,
      credentials: 'include',
      headers: getAuthHeaders(options.headers),
    });

    const response = await request();
    if (response.status !== 401) return response;

    try {
      return (await refreshAccessToken()) ? request() : response;
    } catch (_) {
      return response;
    }
  };

  const createIdempotencyKey = () => {
    if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }
    return `transfer-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  };

  // Lookup an Aurora recipient by email or account/routing number. A request
  // version prevents a slower earlier lookup from overwriting newer input.
  const handleRecipientLookup = async (email, accountNumber, routingNumber) => {
    const lookupVersion = ++recipientLookupVersion.current;
    const normalizedEmail = String(email || '').trim();
    const normalizedAccount = String(accountNumber || '').trim();
    const normalizedRouting = String(routingNumber || '').trim();

    if (!normalizedEmail && !normalizedAccount) {
      setRecipientFound(null);
      return;
    }

    if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setRecipientFound(null);
      return;
    }

    if (!normalizedEmail && (normalizedAccount.length !== 12 || normalizedRouting.length !== 9)) {
      setRecipientFound(null);
      return;
    }

    try {
      let url = `${apiBase}/auth/lookup?`;
      if (normalizedEmail) {
        url += `email=${encodeURIComponent(normalizedEmail)}`;
      } else {
        url += `accountNumber=${encodeURIComponent(normalizedAccount)}&routingNumber=${encodeURIComponent(normalizedRouting)}`;
      }

      const res = await fetchWithAuth(url);
      if (lookupVersion !== recipientLookupVersion.current) return;
      
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.user) {
          const found = {
            name: `${data.user.firstName} ${data.user.lastName}`,
            email: data.user.email,
            accountNumber: data.user.accountNumber,
            routingNumber: data.user.routingNumber,
          };
          const isSameBank = String(found.routingNumber) === '026009593';

          setRecipientFound({ ...found, isSameBank });

          // Only auto-fill name/account details when recipient is in the same bank
          if (isSameBank) {
            setFormData(prev => ({ 
              ...prev, 
              recipientName: found.name,
              recipientEmail: found.email,
              recipientAccountNumber: found.accountNumber,
              recipientRoutingNumber: found.routingNumber,
              bankName: 'Aurora Bank',
            }));
          } else {
            // if not same bank, set only email so user can still see it but allow typing name
            setFormData(prev => ({
              ...prev,
              recipientEmail: found.email,
            }));
          }
        } else {
          setRecipientFound(null);
        }
      } else {
        setRecipientFound(null);
      }
    } catch (err) {
      if (lookupVersion === recipientLookupVersion.current) setRecipientFound(null);
    }
  };

  const buildReceipt = (data, transferType, form) => ({
    reference: data.transfer?.reference || `REF-${Date.now()}`,
    date: new Date(data.transfer?.date || Date.now()).toLocaleString(),
    amount: data.transfer?.amount ?? parseFloat(form.amount),
    status: data.transfer?.status || (transferType === 'external' ? 'pending' : 'completed'),
    fromAccount: form.fromAccount,
    toAccount: transferType === 'internal' ? form.toAccount : undefined,
    recipient: transferType === 'external'
      ? {
          name: data.transfer?.recipientName || form.recipientName,
          email: data.transfer?.recipientEmail || form.recipientEmail,
          accountNumber: data.transfer?.recipientAccountNumber || form.recipientAccountNumber,
          routingNumber: data.transfer?.recipientRoutingNumber || form.recipientRoutingNumber,
          bankName: data.transfer?.recipientBankName || form.bankName,
        }
      : undefined,
    note: form.note,
    transferType,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setMessageType('');

    // Validation
    if (!formData.amount || Number(formData.amount) <= 0) {
      setMessageType('error');
      setMessage('Enter a valid amount greater than $0.00');
      setLoading(false);
      return;
    }

    if (formData.transferType === 'external') {
      if (formData.lookupMethod === 'email' && !formData.recipientEmail) {
        setMessageType('error');
        setMessage('Recipient email is required.');
        setLoading(false);
        return;
      }
      if (formData.lookupMethod === 'account' && (!formData.recipientAccountNumber || !formData.recipientRoutingNumber)) {
        setMessageType('error');
        setMessage('Recipient account and routing numbers are required.');
        setLoading(false);
        return;
      }
      if (formData.lookupMethod === 'account' && (!formData.bankName.trim() || !formData.recipientName.trim())) {
        setMessageType('error');
        setMessage('Recipient name and bank name are required.');
        setLoading(false);
        return;
      }
    }

    try {
      let endpoint = '';
      let payload = {};

      if (formData.transferType === 'internal') {
        // Internal transfer between own accounts
        endpoint = `${apiBase}/transfers/internal`;
        payload = {
          amount: parseFloat(formData.amount),
          fromAccount: formData.fromAccount,
          toAccount: formData.toAccount,
          note: formData.note,
        };
      } else {
        // External transfer to another bank account or Aurora customer
        endpoint = `${apiBase}/transfers/external`;
        payload = {
          amount: parseFloat(formData.amount),
          fromAccount: formData.fromAccount,
          recipientEmail: formData.lookupMethod === 'email' ? formData.recipientEmail : undefined,
          recipientAccountNumber: formData.lookupMethod === 'account' ? formData.recipientAccountNumber : undefined,
          recipientRoutingNumber: formData.lookupMethod === 'account' ? formData.recipientRoutingNumber : undefined,
          recipientName: formData.recipientName,
          bankName: formData.lookupMethod === 'account' ? formData.bankName : undefined,
          note: formData.note,
        };
      }

      const fingerprint = JSON.stringify({ transferType: formData.transferType, payload });
      if (submission.current.fingerprint !== fingerprint) {
        submission.current = { fingerprint, idempotencyKey: createIdempotencyKey() };
      }

      const res = await fetchWithAuth(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': submission.current.idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      let data = {};
      try {
        data = await res.json();
      } catch (err) {
        data = {};
      }

      // Never show a receipt or mutate local state for a failed server
      // response. The server is the source of truth for transfer creation.
      if (!res.ok || data.status === 'error' || !data.transfer) {
        if (res.status < 500) submission.current = { fingerprint: '', idempotencyKey: '' };
        setMessageType('error');
        setMessage(
          data.message
            || (res.status === 401 ? 'Your session expired. Please sign in again.' : 'We could not submit this transfer.')
        );
        return;
      }

      setMessageType('success');
      setMessage(data.message || 'Transfer submitted successfully.');

      const receiptData = buildReceipt(data, formData.transferType, formData);
      setReceipt(receiptData);
      setShowReceiptModal(true);

      // The server has already accepted the transfer. A failed profile refresh
      // must not turn that successful submission into a client-side error.
      try {
        await refreshProfile?.();
      } catch (refreshError) {
        console.warn('Transfer was submitted, but the profile refresh failed:', refreshError);
      }
      submission.current = { fingerprint: '', idempotencyKey: '' };

      // Reset form
      setFormData({
        transferType: 'external',
        recipientName: '',
        recipientEmail: '',
        recipientAccountNumber: '',
        recipientRoutingNumber: '',
        lookupMethod: 'email',
        bankName: '',
        routingNumber: '',
        accountNumber: '',
        amount: '',
        fromAccount: 'checking',
        toAccount: 'savings',
        note: '',
      });
      setRecipientFound(null);
    } catch (error) {
      console.error('Transfer error:', error);
      setMessageType('error');
      setMessage('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReceiptClose = () => {
    setShowReceiptModal(false);
    if (receipt) {
      navigate('/dashboard', {
        state: {
          notification: {
            title: 'Transfer submitted',
            detail: `Reference ${receipt.reference || ''}`.trim(),
            time: 'just now',
          },
        },
        replace: true,
      });
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-xl shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3">
            <AuroraBankLogo />
            <span className="text-lg font-semibold tracking-tight bg-gradient-to-r from-indigo-900 to-slate-950 bg-clip-text text-transparent">Aurora Bank</span>
          </div>
          <Link to="/dashboard" className="text-sm text-indigo-800 hover:text-indigo-950">
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <h1 className="mb-2 text-2xl font-semibold text-slate-900 sm:text-3xl">Transfer Money</h1>
        <p className="mb-6 text-sm text-slate-600 sm:mb-8 sm:text-base">Send to another bank or move money between your accounts</p>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-lg sm:rounded-2xl sm:p-6 md:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="transferType"
                    value="external"
                    checked={formData.transferType === 'external'}
                    onChange={() => setFormData({ ...formData, transferType: 'external' })}
                    className="accent-indigo-900"
                  />
                  Send to a bank account
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="transferType"
                    value="internal"
                    checked={formData.transferType === 'internal'}
                    onChange={() => setFormData({ ...formData, transferType: 'internal' })}
                    className="accent-indigo-900"
                  />
                  Between my accounts
                </label>
              </div>

              {formData.transferType === 'external' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-900 sm:p-4">
                    Enter an email address or any bank account details. Mock transfers remain pending until admin approval.
                  </div>

                  {/* Lookup method toggle */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, lookupMethod: 'email' });
                        setRecipientFound(null);
                      }}
                      className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                        formData.lookupMethod === 'email'
                          ? 'bg-indigo-900 text-white'
                          : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      📧 By Email
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, lookupMethod: 'account' });
                        setRecipientFound(null);
                      }}
                      className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                        formData.lookupMethod === 'account'
                          ? 'bg-indigo-900 text-white'
                          : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      🏦 By Bank Account
                    </button>
                  </div>
                  
                  {formData.lookupMethod === 'email' ? (
                    <div className="space-y-2">
                      <label className="text-sm text-slate-700">Recipient Email *</label>
                      <input
                        type="email"
                        value={formData.recipientEmail}
                        onChange={(e) => {
                          setFormData({ ...formData, recipientEmail: e.target.value });
                          handleRecipientLookup(e.target.value, null, null);
                        }}
                        onBlur={(e) => handleRecipientLookup(e.target.value, null, null)}
                        placeholder="recipient@email.com"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-800 focus:ring-2 focus:ring-indigo-900/20"
                        required
                      />
                      {recipientFound && (
                        <div className="flex items-center gap-2 text-sm text-emerald-700">
                          <span>✓</span>
                          <span>Recipient found: {recipientFound.name}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm text-slate-700">Routing Number *</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formData.recipientRoutingNumber}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 9);
                            setFormData({ ...formData, recipientRoutingNumber: value });
                            handleRecipientLookup(null, formData.recipientAccountNumber, value);
                          }}
                          onBlur={(e) => handleRecipientLookup(null, formData.recipientAccountNumber, e.target.value)}
                          placeholder="9-digit routing number"
                          maxLength="9"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-800 focus:ring-2 focus:ring-indigo-900/20"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm text-slate-700">Account Number *</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formData.recipientAccountNumber}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 17);
                            setFormData({ ...formData, recipientAccountNumber: value });
                            handleRecipientLookup(null, value, formData.recipientRoutingNumber);
                          }}
                          onBlur={(e) => handleRecipientLookup(null, e.target.value, formData.recipientRoutingNumber)}
                          placeholder="Enter account number"
                          maxLength="17"
                          minLength="4"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-800 focus:ring-2 focus:ring-indigo-900/20"
                          required
                        />
                      </div>
                      
                      {recipientFound && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                          <div className="flex items-center gap-2 mb-1">
                            <span>✓</span>
                            <span className="font-semibold">Account Verified</span>
                          </div>
                          <div className="text-xs text-emerald-700/80">
                            Recipient: {recipientFound.name} ({recipientFound.email})
                          </div>
                        </div>
                      )}
                      {/* Removed explicit 'Account not found' warning per UX request */}
                    </div>
                  )}

                  {formData.lookupMethod === 'account' && (
                    <div className="space-y-2">
                      <label className="text-sm text-slate-700">Bank Name *</label>
                      <input
                        type="text"
                        value={formData.bankName}
                        onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                        placeholder="Recipient’s bank"
                        maxLength="100"
                        required
                        className="w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-800 focus:ring-2 focus:ring-indigo-900/20"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm text-slate-700">Recipient Name {formData.lookupMethod === 'account' ? '*' : '(optional)'}</label>
                    <input
                      type="text"
                      value={formData.recipientName}
                      onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                      placeholder={recipientFound?.isSameBank ? "Auto-filled from Aurora Bank" : "Enter recipient name"}
                      maxLength="100"
                      required={formData.lookupMethod === 'account'}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-800 focus:ring-2 focus:ring-indigo-900/20"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm text-slate-700">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pl-8 text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-800 focus:ring-2 focus:ring-indigo-900/20"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm text-slate-700">From Account</label>
                  <select
                    value={formData.fromAccount}
                    onChange={(e) => setFormData({ ...formData, fromAccount: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-indigo-800 focus:ring-2 focus:ring-indigo-900/20"
                  >
                    <option value="checking">Checking - ${Number(currentUser?.checking ?? 0).toFixed(2)}</option>
                    <option value="savings">Savings - ${Number(currentUser?.savings ?? 0).toFixed(2)}</option>
                  </select>
                </div>

                {formData.transferType === 'internal' && (
                  <div className="space-y-2">
                    <label className="text-sm text-slate-700">To Account</label>
                    <select
                      value={formData.toAccount}
                      onChange={(e) => setFormData({ ...formData, toAccount: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-indigo-800 focus:ring-2 focus:ring-indigo-900/20"
                    >
                      <option value="checking">Checking</option>
                      <option value="savings">Savings</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-700">Note (Optional)</label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="What's this for?"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-800 focus:ring-2 focus:ring-indigo-900/20"
                  rows="3"
                />
              </div>

              {message && (
                <div
                  className={`rounded-xl p-4 ${messageType === 'success'
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border border-rose-200 bg-rose-50 text-rose-700'
                  }`}
                >
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || (formData.transferType === 'external' && formData.lookupMethod === 'email' && !formData.recipientEmail)}
                className="w-full rounded-xl bg-gradient-to-r from-indigo-900 to-slate-950 py-3 text-sm font-semibold text-white transition hover:from-indigo-950 hover:to-black disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Send Money'}
              </button>
            </form>
          </div>

          <div className="min-w-0 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-lg sm:rounded-2xl sm:p-6">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">Available Balance</h3>
              <p className="text-2xl font-semibold text-indigo-900">${Number(currentUser?.balance ?? 0).toFixed(2)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-sm text-slate-600">
              <p>💡 <strong>External transfers</strong> to any bank require admin approval before funds are released.</p>
              <p>↔️ <strong>Internal transfers</strong> between your Checking and Savings move instantly.</p>
              <p>🔒 Funds are deducted immediately but held pending approval for external transfers.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Print styles scoped for the receipt modal */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0.5in;
          }
          body * { visibility: hidden; }
          .printable, .printable * { visibility: visible; }
          .receipt-overlay {
            position: static !important;
            display: block !important;
            inset: auto !important;
            overflow: visible !important;
            padding: 0 !important;
            background: white !important;
          }
          .printable { 
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            max-width: none !important;
            max-height: none !important;
            height: auto;
            overflow: visible !important;
            margin: 0;
            padding: 0;
            background: white !important;
            color: #000 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .print\\:hidden { display: none !important; }
          .no-print { display: none !important; }
          
          .printable * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {showReceiptModal && receipt && (
        <div className="receipt-overlay fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="printable my-auto w-full max-w-xl max-h-[calc(100dvh-1.5rem)] overflow-y-auto bg-white text-slate-900 shadow-2xl sm:max-h-[calc(100dvh-3rem)]">
            {/* Typewriter Style Receipt - Professional & Organized */}
            <div className="p-5 font-mono text-xs leading-relaxed bg-white sm:p-8" style={{fontFamily: "'Courier New', 'Courier', monospace"}}>
              
              {/* Header */}
              <div className="text-center mb-3">
                <p className="font-bold">AURORA BANK</p>
                <p>TRANSACTION RECEIPT</p>
              </div>

              <div className="border-t border-b border-black py-2 mb-3 text-center">
                <p>*** {receipt.status === 'completed' ? 'TRANSFER COMPLETED' : 'TRANSFER SUBMITTED'} ***</p>
              </div>

              {/* Transaction Info */}
              <div className="mb-3 space-y-0.5">
                <div className="flex justify-between">
                  <span>DATE:</span>
                  <span>{receipt.date}</span>
                </div>
                <div className="flex justify-between">
                  <span>REFERENCE:</span>
                  <span>{receipt.reference}</span>
                </div>
                <div className="flex justify-between">
                  <span>STATUS:</span>
                  <span>{String(receipt.status || 'pending').toUpperCase()}</span>
                </div>
              </div>

              <div className="border-t border-black my-3"></div>

              {/* Amount */}
              <div className="mb-3">
                <div className="flex justify-between font-bold">
                  <span>AMOUNT:</span>
                  <span>{formatCurrency(receipt.amount)}</span>
                </div>
              </div>

              <div className="border-t border-black my-3"></div>

              {/* From Account */}
              <div className="mb-3 space-y-0.5">
                <p className="font-bold">FROM:</p>
                <p className="ml-2">{currentUser?.name}</p>
                <div className="ml-2 flex justify-between">
                  <span>ACCOUNT:</span>
                  <span>{receipt.fromAccount.toUpperCase()}</span>
                </div>
                {currentUser?.accountNumber && (
                  <div className="ml-2 flex justify-between">
                    <span>ACCT #:</span>
                    <span>****{String(currentUser.accountNumber).slice(-4)}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-black my-3"></div>

              {/* To Account */}
              <div className="mb-3 space-y-0.5">
                <p className="font-bold">TO:</p>
                {receipt.toAccount ? (
                  <>
                    <p className="ml-2">{currentUser?.name}</p>
                    <div className="ml-2 flex justify-between">
                      <span>ACCOUNT:</span>
                      <span>{receipt.toAccount.toUpperCase()}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="ml-2">{receipt.recipient?.recipientName || receipt.recipient?.name || 'External Account'}</p>
                    <div className="ml-2 flex justify-between">
                      <span>BANK:</span>
                      <span className="ml-2 text-right">{receipt.recipient?.bankName || (receipt.recipient?.email ? 'Aurora Bank' : 'External bank')}</span>
                    </div>
                    {receipt.recipient?.accountNumber && (
                      <div className="ml-2 flex justify-between">
                        <span>ACCT #:</span>
                        <span>****{String(receipt.recipient.accountNumber).slice(-4)}</span>
                      </div>
                    )}
                    {receipt.recipient?.email && (
                      <div className="ml-2 flex justify-between">
                        <span>EMAIL:</span>
                        <span className="ml-2 break-all text-right">{receipt.recipient.email}</span>
                      </div>
                    )}
                    {receipt.recipient?.routingNumber && (
                      <div className="ml-2 flex justify-between">
                        <span>ROUTING:</span>
                        <span>{receipt.recipient.routingNumber}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Memo */}
              {receipt.note && (
                <>
                  <div className="border-t border-black my-3"></div>
                  <div className="mb-3">
                    <div className="flex">
                      <span className="font-bold">MEMO:</span>
                      <span className="ml-2">{receipt.note}</span>
                    </div>
                  </div>
                </>
              )}

              <div className="border-t border-black my-3"></div>

              {/* Notice */}
              <div className="mb-3 text-xs">
                <p className="text-center mb-1">IMPORTANT NOTICE</p>
                {receipt.status === 'completed' ? (
                  <p>{receipt.transferType === 'internal' ? 'Your internal transfer has completed.' : 'Your external mock transfer was approved and marked complete.'}</p>
                ) : (
                  <>
                    <p>Your transfer is pending administrator approval.</p>
                    <p>Funds are held until it is approved or rejected.</p>
                  </>
                )}
              </div>

              <div className="border-t border-black my-3"></div>

              {/* Footer */}
              <div className="text-center text-xs">
                <p>Questions? Contact us:</p>
                <p>support@aurorabank.com</p>
                <p>1-800-AURORA-1</p>
                <p className="mt-3">Member FDIC</p>
                <p className="mt-2">RETAIN FOR YOUR RECORDS</p>
              </div>

              {/* Bottom Border */}
              <div className="text-center mt-4">
                <p>{'='.repeat(50)}</p>
              </div>

            </div>

            {/* On-Screen Controls (Hidden on Print) */}
            <div className="no-print border-t border-slate-200 bg-slate-50 px-8 py-4">
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleReceiptClose}
                  className="rounded-lg border border-slate-300 bg-white px-6 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Print as PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TransferPage;
