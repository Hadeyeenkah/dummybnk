import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useBankContext } from '../context/BankContext';
import AuroraBankLogo from '../components/AuroraBankLogo';
import { API_BASE } from '../config';
import {
  AtSign,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpDown,
  BadgeCheck,
  Clock,
  Landmark,
  Send,
  ShieldCheck,
  Wallet,
  PiggyBank,
  X,
} from 'lucide-react';
import '../App.css';

const AURORA_ROUTING = '026009593';
const QUICK_AMOUNTS = [50, 100, 250, 500, 1000];
// Minimum time the "processing" screen stays up before the receipt opens.
const PROCESSING_MS = 2500;

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
const labelCls = 'mb-1.5 block text-sm font-semibold text-slate-700';
const inputCls =
  'w-full min-w-0 rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#0b5cab] focus:ring-2 focus:ring-[#0b5cab]/20 sm:text-sm';

function Segmented({ value, onChange, options }) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1" role="tablist">
      {options.map((o) => {
        const Active = o.icon;
        const selected = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(o.value)}
            className={`flex min-w-0 items-center justify-center gap-2 rounded-xl px-2 py-2.5 text-sm font-semibold transition ${
              selected ? 'bg-white text-[#0a2540] shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Active size={16} className="shrink-0" aria-hidden="true" />
            <span className="truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function TransferPage() {
  const { currentUser, refreshProfile } = useBankContext();
  const navigate = useNavigate();
  const apiBase = API_BASE;
  const recipientLookupVersion = useRef(0);
  const submission = useRef({ fingerprint: '', idempotencyKey: '' });
  const emptyForm = {
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
  };
  const [formData, setFormData] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recipientFound, setRecipientFound] = useState(null);

  const formatCurrency = (value) =>
    `$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
          const isSameBank = String(found.routingNumber) === AURORA_ROUTING;

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

  /* ---------------- derived display values ---------------- */
  const isExternal = formData.transferType === 'external';
  const balanceOf = (account) => Number(currentUser?.[account] ?? 0);
  const amountNumber = Number(formData.amount);
  const insufficient = amountNumber > 0 && amountNumber > balanceOf(formData.fromAccount);
  const sameAccount = !isExternal && formData.fromAccount === formData.toAccount;
  const accountLabel = (a) => (a === 'savings' ? 'Savings' : 'Checking');
  const lastFour = (v) => String(v || '').slice(-4);
  const recipientLabel = isExternal
    ? formData.recipientName
      || recipientFound?.name
      || formData.recipientEmail
      || (formData.recipientAccountNumber ? `Account ••••${lastFour(formData.recipientAccountNumber)}` : 'Not entered yet')
    : `My ${accountLabel(formData.toAccount)}`;
  const recipientBank = isExternal
    ? (formData.lookupMethod === 'account' ? formData.bankName : recipientFound ? (recipientFound.isSameBank ? 'Aurora Bank' : '') : '')
    : 'Aurora Bank';

  // Same validation rules as before; returns an error message or ''.
  const validate = () => {
    if (!formData.amount || Number(formData.amount) <= 0) {
      return 'Enter a valid amount greater than $0.00';
    }
    if (sameAccount) return 'Choose two different accounts.';
    if (isExternal) {
      if (formData.lookupMethod === 'email' && !formData.recipientEmail) return 'Recipient email is required.';
      if (formData.lookupMethod === 'account' && (!formData.recipientAccountNumber || !formData.recipientRoutingNumber)) {
        return 'Recipient account and routing numbers are required.';
      }
      if (formData.lookupMethod === 'account' && (!formData.bankName.trim() || !formData.recipientName.trim())) {
        return 'Recipient name and bank name are required.';
      }
    }
    return '';
  };

  // Step 1: validate, then show the review sheet.
  const handleReview = (e) => {
    e.preventDefault();
    setMessage('');
    setMessageType('');
    const error = validate();
    if (error) {
      setMessageType('error');
      setMessage(error);
      return;
    }
    setShowReview(true);
  };

  // Step 2: submit to the server (unchanged request logic).
  const submitTransfer = async () => {
    const startedAt = Date.now();
    setLoading(true);
    setMessage('');
    setMessageType('');

    const error = validate();
    if (error) {
      setMessageType('error');
      setMessage(error);
      setLoading(false);
      return;
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

      // Keep the processing screen up for a minimum time before the receipt appears.
      const remaining = PROCESSING_MS - (Date.now() - startedAt);
      if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));

      setMessageType('success');
      setMessage(data.message || 'Transfer submitted successfully.');

      const receiptData = buildReceipt(data, formData.transferType, formData);
      setReceipt(receiptData);
      setShowReview(false);
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
      setFormData(emptyForm);
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

  const swapAccounts = () =>
    setFormData((prev) => ({ ...prev, fromAccount: prev.toAccount, toAccount: prev.fromAccount }));

  /* ---------------- small UI pieces ---------------- */
  const AccountPick = ({ id, selected, onSelect }) => {
    const Icon = id === 'savings' ? PiggyBank : Wallet;
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={`flex min-w-0 items-center gap-3 rounded-2xl border p-3 text-left transition ${
          selected ? 'border-[#0b5cab] bg-[#eef5fc] ring-2 ring-[#0b5cab]/20' : 'border-slate-200 bg-white hover:bg-slate-50'
        }`}
      >
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${selected ? 'bg-[#0b5cab] text-white' : 'bg-slate-100 text-slate-600'}`}>
          <Icon size={18} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-[#0a2540]">{accountLabel(id)}</span>
          <Fit text={formatCurrency(balanceOf(id))} min={11} max={15} className="font-semibold text-slate-600" />
        </span>
      </button>
    );
  };

  const SummaryRow = ({ label, children }) => (
    <div className="flex items-start justify-between gap-3 py-2.5 text-sm">
      <span className="shrink-0 text-slate-500">{label}</span>
      <span className="min-w-0 break-words text-right font-semibold text-slate-900">{children}</span>
    </div>
  );

  const arrival = isExternal ? 'Pending admin approval' : 'Instant';

  return (
    <div className="bank-dashboard text-slate-900">
      <header className="dashboard-header sticky top-0 z-30 border-b border-slate-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-2.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <AuroraBankLogo />
            <span className="truncate text-lg font-extrabold tracking-tight text-[#0a2540]">Aurora Bank</span>
          </div>
          <Link to="/dashboard" className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-[#0b5cab] hover:bg-slate-100">
            <ArrowLeft size={16} aria-hidden="true" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-6 sm:py-8">
        <h1 className="text-xl font-extrabold tracking-tight text-[#0a2540] sm:text-2xl lg:text-3xl">Transfer money</h1>
        <p className="mb-5 mt-0.5 text-sm text-slate-600">Send to another bank or move money between your accounts.</p>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-6">
          {/* ------------------------------ Form ------------------------------ */}
          <form onSubmit={handleReview} className="min-w-0 space-y-4" noValidate>
            <Segmented
              value={formData.transferType}
              onChange={(v) => { setFormData({ ...formData, transferType: v }); setMessage(''); }}
              options={[
                { value: 'external', label: 'Send money', icon: Send },
                { value: 'internal', label: 'Between my accounts', icon: ArrowLeftRight },
              ]}
            />

            {/* From / To */}
            <section className={`${cardCls} p-4 sm:p-5`}>
              <h2 className="mb-3 text-base font-bold text-[#0a2540]">From</h2>
              <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2">
                {['checking', 'savings'].map((id) => (
                  <AccountPick key={id} id={id} selected={formData.fromAccount === id} onSelect={() => setFormData({ ...formData, fromAccount: id })} />
                ))}
              </div>

              {!isExternal && (
                <>
                  <div className="my-3 flex items-center gap-3">
                    <div className="h-px flex-1 bg-slate-200" />
                    <button
                      type="button"
                      onClick={swapAccounts}
                      aria-label="Swap accounts"
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-[#0b5cab] hover:bg-[#eef5fc]"
                    >
                      <ArrowUpDown size={18} aria-hidden="true" />
                    </button>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>
                  <h2 className="mb-3 text-base font-bold text-[#0a2540]">To</h2>
                  <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2">
                    {['checking', 'savings'].map((id) => (
                      <AccountPick key={id} id={id} selected={formData.toAccount === id} onSelect={() => setFormData({ ...formData, toAccount: id })} />
                    ))}
                  </div>
                  {sameAccount && <p className="mt-3 text-sm font-medium text-rose-600">Choose two different accounts.</p>}
                </>
              )}
            </section>

            {/* Recipient */}
            {isExternal && (
              <section className={`${cardCls} space-y-4 p-4 sm:p-5`}>
                <h2 className="text-base font-bold text-[#0a2540]">Recipient</h2>
                <Segmented
                  value={formData.lookupMethod}
                  onChange={(v) => { setFormData({ ...formData, lookupMethod: v }); setRecipientFound(null); }}
                  options={[
                    { value: 'email', label: 'By email', icon: AtSign },
                    { value: 'account', label: 'Bank account', icon: Landmark },
                  ]}
                />

                {formData.lookupMethod === 'email' ? (
                  <div>
                    <label htmlFor="recipientEmail" className={labelCls}>Recipient email *</label>
                    <input
                      id="recipientEmail"
                      type="email"
                      inputMode="email"
                      autoComplete="off"
                      value={formData.recipientEmail}
                      onChange={(e) => {
                        setFormData({ ...formData, recipientEmail: e.target.value });
                        handleRecipientLookup(e.target.value, null, null);
                      }}
                      onBlur={(e) => handleRecipientLookup(e.target.value, null, null)}
                      placeholder="recipient@email.com"
                      className={inputCls}
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="recipientRouting" className={labelCls}>Routing number *</label>
                        <input
                          id="recipientRouting"
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
                          className={`${inputCls} font-mono`}
                        />
                      </div>
                      <div>
                        <label htmlFor="recipientAccount" className={labelCls}>Account number *</label>
                        <input
                          id="recipientAccount"
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
                          className={`${inputCls} font-mono`}
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="bankName" className={labelCls}>Bank name *</label>
                      <input
                        id="bankName"
                        type="text"
                        value={formData.bankName}
                        onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                        placeholder="Recipient’s bank"
                        maxLength="100"
                        className={inputCls}
                      />
                    </div>
                  </div>
                )}

                {recipientFound && (
                  <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                    <BadgeCheck size={20} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-emerald-900">
                        {formData.lookupMethod === 'account' ? 'Account verified' : 'Recipient found'}
                      </p>
                      <p className="break-words text-sm text-emerald-800">{recipientFound.name}</p>
                      <p className="break-all text-xs text-emerald-700/80">{recipientFound.email}</p>
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="recipientName" className={labelCls}>
                    Recipient name {formData.lookupMethod === 'account' ? '*' : '(optional)'}
                  </label>
                  <input
                    id="recipientName"
                    type="text"
                    value={formData.recipientName}
                    onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                    placeholder={recipientFound?.isSameBank ? 'Auto-filled from Aurora Bank' : 'Enter recipient name'}
                    maxLength="100"
                    className={inputCls}
                  />
                </div>
              </section>
            )}

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
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full min-w-0 rounded-xl border border-slate-300 bg-white py-3.5 pl-10 pr-4 text-2xl font-extrabold tabular-nums text-[#0a2540] placeholder-slate-300 outline-none transition focus:border-[#0b5cab] focus:ring-2 focus:ring-[#0b5cab]/20"
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {QUICK_AMOUNTS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setFormData({ ...formData, amount: String(q) })}
                    className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:border-[#0b5cab] hover:text-[#0b5cab]"
                  >
                    ${q.toLocaleString('en-US')}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, amount: balanceOf(formData.fromAccount).toFixed(2) })}
                  className="rounded-full bg-[#e8f0fa] px-3.5 py-2 text-sm font-bold text-[#0a4a8f] hover:bg-[#d7e5f6]"
                >
                  Max
                </button>
              </div>
              <p className={`mt-3 text-sm ${insufficient ? 'font-semibold text-rose-600' : 'text-slate-500'}`}>
                {insufficient
                  ? `This is more than your ${accountLabel(formData.fromAccount)} balance of ${formatCurrency(balanceOf(formData.fromAccount))}.`
                  : `Available in ${accountLabel(formData.fromAccount)}: ${formatCurrency(balanceOf(formData.fromAccount))}`}
              </p>
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
                placeholder="What's this for?"
                className={inputCls}
                rows="3"
              />
            </section>

            {message && !showReview && (
              <div
                role="alert"
                className={`rounded-xl p-4 text-sm font-medium ${messageType === 'success'
                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border border-rose-200 bg-rose-50 text-rose-700'
                }`}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || sameAccount || (isExternal && formData.lookupMethod === 'email' && !formData.recipientEmail)}
              className="w-full rounded-xl bg-[#c8102e] py-3.5 text-base font-bold text-white transition hover:bg-[#a90d26] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Review transfer
            </button>
          </form>

          {/* ----------------------------- Sidebar ----------------------------- */}
          <aside className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
            <section className="hero-card rounded-3xl p-4 text-white sm:p-5">
              <p className="text-sm font-medium text-blue-100">Available balance</p>
              <div className="mt-1">
                <Fit text={formatCurrency(currentUser?.balance)} min={20} max={36} className="font-extrabold tracking-tight" />
              </div>
              <p className="mt-1 text-xs text-blue-100">Checking + Savings · Member FDIC</p>
            </section>

            <section className={`${cardCls} px-4 py-3 sm:px-5`}>
              <h2 className="py-2 text-base font-bold text-[#0a2540]">Transfer summary</h2>
              <div className="divide-y divide-slate-100">
                <SummaryRow label="Amount">{amountNumber > 0 ? formatCurrency(amountNumber) : '—'}</SummaryRow>
                <SummaryRow label="From">{accountLabel(formData.fromAccount)}</SummaryRow>
                <SummaryRow label="To">
                  {recipientLabel}
                  {recipientBank && <span className="block text-xs font-medium text-slate-500">{recipientBank}</span>}
                </SummaryRow>
                <SummaryRow label="Fee">Free</SummaryRow>
                <SummaryRow label="Arrives">{arrival}</SummaryRow>
              </div>
            </section>

            <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p className="flex gap-3"><Clock size={18} className="mt-0.5 shrink-0 text-[#0b5cab]" aria-hidden="true" /><span><strong className="text-slate-900">External transfers</strong> to any bank require admin approval before funds are released.</span></p>
              <p className="flex gap-3"><ArrowLeftRight size={18} className="mt-0.5 shrink-0 text-[#0b5cab]" aria-hidden="true" /><span><strong className="text-slate-900">Internal transfers</strong> between Checking and Savings move instantly.</span></p>
              <p className="flex gap-3"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#0b5cab]" aria-hidden="true" /><span>Funds are deducted immediately but held pending approval for external transfers.</span></p>
            </section>
          </aside>
        </div>
      </main>

      {/* ============================ Review sheet ============================ */}
      {showReview && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="review-title">
          <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between px-5 pt-5">
              <h2 id="review-title" className="text-lg font-extrabold text-[#0a2540]">Review transfer</h2>
              <button type="button" onClick={() => setShowReview(false)} aria-label="Close review" className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <div className="px-5 pb-5 pt-3">
              <div className="rounded-2xl bg-[#eef5fc] px-4 py-5 text-center">
                <p className="text-xs font-medium text-slate-600">You're sending</p>
                <div className="mt-1"><Fit text={formatCurrency(amountNumber)} min={22} max={40} className="text-center font-extrabold text-[#0a2540]" /></div>
              </div>
              <div className="mt-2 divide-y divide-slate-100">
                <SummaryRow label="From">{accountLabel(formData.fromAccount)}</SummaryRow>
                <SummaryRow label="To">
                  {recipientLabel}
                  {recipientBank && <span className="block text-xs font-medium text-slate-500">{recipientBank}</span>}
                </SummaryRow>
                {isExternal && formData.lookupMethod === 'email' && formData.recipientEmail && (
                  <SummaryRow label="Email"><span className="break-all">{formData.recipientEmail}</span></SummaryRow>
                )}
                {formData.note && <SummaryRow label="Note">{formData.note}</SummaryRow>}
                <SummaryRow label="Fee">Free</SummaryRow>
                <SummaryRow label="Arrives">{arrival}</SummaryRow>
              </div>
              {insufficient && (
                <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-800">
                  This amount is higher than your {accountLabel(formData.fromAccount)} balance and may be declined.
                </p>
              )}
              {message && messageType === 'error' && (
                <div role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700">{message}</div>
              )}
              <div className="mt-5 grid grid-cols-2 gap-3 pb-[env(safe-area-inset-bottom)]">
                <button type="button" onClick={() => setShowReview(false)} disabled={loading} className="rounded-xl border border-slate-300 bg-white py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                  Edit
                </button>
                <button type="button" onClick={submitTransfer} disabled={loading} className="rounded-xl bg-[#c8102e] py-3.5 text-sm font-bold text-white hover:bg-[#a90d26] disabled:cursor-not-allowed disabled:opacity-60">
                  {loading ? 'Processing...' : 'Confirm & send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Processing screen (shown while the transfer is submitted, before the receipt) */}
      {loading && !showReceiptModal && (
        <div className="no-print fixed inset-0 z-[70] flex items-center justify-center bg-[#0a2540]/70 p-4 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-live="assertive" aria-labelledby="transfer-processing-title">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl sm:p-8">
            <div className="mx-auto mb-5 h-14 w-14 animate-spin rounded-full border-4 border-[#e8f0fa] border-t-[#0b5cab]" aria-hidden="true" />
            <h2 id="transfer-processing-title" className="text-lg font-extrabold text-[#0a2540]">Processing your transfer</h2>
            <p className="mt-1.5 text-sm text-slate-600">Securely submitting your details. Please don't close or refresh this page.</p>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
              <div className="transfer-progress h-full rounded-full bg-[#0b5cab]" />
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes transfer-progress { from { width: 8%; } to { width: 96%; } }
        .transfer-progress { width: 8%; animation: transfer-progress ${PROCESSING_MS}ms ease-out forwards; }
      `}</style>

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
        <div className="receipt-overlay fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="printable my-auto w-full max-w-xl max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-2xl bg-white text-slate-900 shadow-2xl sm:max-h-[calc(100dvh-3rem)]">
            {/* Typewriter Style Receipt - Professional & Organized */}
            <div className="bg-white p-5 font-mono text-xs leading-relaxed sm:p-8" style={{ fontFamily: "'Courier New', 'Courier', monospace" }}>

              {/* Header */}
              <div className="mb-3 text-center">
                <p className="font-bold">AURORA BANK</p>
                <p>TRANSACTION RECEIPT</p>
              </div>

              <div className="mb-3 border-b border-t border-black py-2 text-center">
                <p>*** {receipt.status === 'completed' ? 'TRANSFER COMPLETED' : 'TRANSFER SUBMITTED'} ***</p>
              </div>

              {/* Transaction Info */}
              <div className="mb-3 space-y-0.5">
                <div className="flex justify-between gap-3">
                  <span>DATE:</span>
                  <span className="text-right">{receipt.date}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>REFERENCE:</span>
                  <span className="break-all text-right">{receipt.reference}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>STATUS:</span>
                  <span>{String(receipt.status || 'pending').toUpperCase()}</span>
                </div>
              </div>

              <div className="my-3 border-t border-black"></div>

              {/* Amount */}
              <div className="mb-3">
                <div className="flex justify-between gap-3 font-bold">
                  <span>AMOUNT:</span>
                  <span>{formatCurrency(receipt.amount)}</span>
                </div>
              </div>

              <div className="my-3 border-t border-black"></div>

              {/* From Account */}
              <div className="mb-3 space-y-0.5">
                <p className="font-bold">FROM:</p>
                <p className="ml-2 break-words">{currentUser?.name}</p>
                <div className="ml-2 flex justify-between gap-3">
                  <span>ACCOUNT:</span>
                  <span>{receipt.fromAccount.toUpperCase()}</span>
                </div>
                {currentUser?.accountNumber && (
                  <div className="ml-2 flex justify-between gap-3">
                    <span>ACCT #:</span>
                    <span>****{String(currentUser.accountNumber).slice(-4)}</span>
                  </div>
                )}
              </div>

              <div className="my-3 border-t border-black"></div>

              {/* To Account */}
              <div className="mb-3 space-y-0.5">
                <p className="font-bold">TO:</p>
                {receipt.toAccount ? (
                  <>
                    <p className="ml-2 break-words">{currentUser?.name}</p>
                    <div className="ml-2 flex justify-between gap-3">
                      <span>ACCOUNT:</span>
                      <span>{receipt.toAccount.toUpperCase()}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="ml-2 break-words">{receipt.recipient?.recipientName || receipt.recipient?.name || 'External Account'}</p>
                    <div className="ml-2 flex justify-between gap-3">
                      <span>BANK:</span>
                      <span className="ml-2 text-right">{receipt.recipient?.bankName || (receipt.recipient?.email ? 'Aurora Bank' : 'External bank')}</span>
                    </div>
                    {receipt.recipient?.accountNumber && (
                      <div className="ml-2 flex justify-between gap-3">
                        <span>ACCT #:</span>
                        <span>****{String(receipt.recipient.accountNumber).slice(-4)}</span>
                      </div>
                    )}
                    {receipt.recipient?.email && (
                      <div className="ml-2 flex justify-between gap-3">
                        <span>EMAIL:</span>
                        <span className="ml-2 break-all text-right">{receipt.recipient.email}</span>
                      </div>
                    )}
                    {receipt.recipient?.routingNumber && (
                      <div className="ml-2 flex justify-between gap-3">
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
                  <div className="my-3 border-t border-black"></div>
                  <div className="mb-3">
                    <div className="flex">
                      <span className="font-bold">MEMO:</span>
                      <span className="ml-2 break-words">{receipt.note}</span>
                    </div>
                  </div>
                </>
              )}

              <div className="my-3 border-t border-black"></div>

              {/* Notice */}
              <div className="mb-3 text-xs">
                <p className="mb-1 text-center">IMPORTANT NOTICE</p>
                {receipt.status === 'completed' ? (
                  <p>{receipt.transferType === 'internal' ? 'Your internal transfer has completed.' : 'Your external mock transfer was approved and marked complete.'}</p>
                ) : (
                  <>
                    <p>Your transfer is pending administrator approval.</p>
                    <p>Funds are held until it is approved or rejected.</p>
                  </>
                )}
              </div>

              <div className="my-3 border-t border-black"></div>

              {/* Footer */}
              <div className="text-center text-xs">
                <p>Questions? Contact us:</p>
                <p>support@aurorabank.com</p>
                <p>1-800-AURORA-1</p>
                <p className="mt-3">Member FDIC</p>
                <p className="mt-2">RETAIN FOR YOUR RECORDS</p>
              </div>

              {/* Bottom Border */}
              <div className="mt-4 overflow-hidden text-center">
                <p className="whitespace-nowrap">{'='.repeat(50)}</p>
              </div>
            </div>

            {/* On-Screen Controls (Hidden on Print) */}
            <div className="no-print border-t border-slate-200 bg-slate-50 px-4 py-4 sm:px-8">
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleReceiptClose}
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100 sm:flex-none"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex-1 rounded-xl bg-[#0b5cab] px-6 py-3 text-sm font-bold text-white hover:bg-[#0a4a8f] sm:flex-none"
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