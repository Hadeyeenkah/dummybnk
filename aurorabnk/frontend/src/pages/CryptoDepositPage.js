import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useBankContext } from '../context/BankContext';
import AuroraBankLogo from '../components/AuroraBankLogo';
import { API_BASE } from '../config';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  Info,
  PiggyBank,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import '../App.css';

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
const sectionTitleCls = 'text-base font-bold text-[#0a2540] sm:text-lg';
const inputCls =
  'w-full min-w-0 rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#0b5cab] focus:ring-2 focus:ring-[#0b5cab]/20 sm:text-sm';

const money = (value) =>
  `$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function CryptoDepositPage() {
  const { currentUser } = useBankContext();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [cryptoData, setCryptoData] = useState({
    amount: '',
    cryptoType: 'bitcoin',
    toAccount: 'checking',
    memo: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [copied, setCopied] = useState(false);

  const apiBase = API_BASE;
  const bitcoinDepositAddress = 'bc1qg9a93teaqcyw7v4f60j69djz9sxny8nmf0w2zf';
  const bitcoinQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=${encodeURIComponent(bitcoinDepositAddress)}`;

  const cryptoOptions = [
    { value: 'bitcoin', label: 'Bitcoin (BTC)', short: 'Bitcoin', icon: '₿' },
    { value: 'ethereum', label: 'Ethereum (ETH)', short: 'Ethereum', icon: '◇' },
    { value: 'litecoin', label: 'Litecoin (LTC)', short: 'Litecoin', icon: '◊' },
    { value: 'dogecoin', label: 'Dogecoin (DOGE)', short: 'Dogecoin', icon: '🐕' },
  ];

  const getCryptoIcon = (type) => {
    const crypto = cryptoOptions.find(c => c.value === type);
    return crypto ? crypto.icon : '🪙';
  };

  const formatCurrency = (value) => `$${Number(value || 0).toFixed(2)}`;

  const handleCopyAddress = () => {
    navigator.clipboard?.writeText(bitcoinDepositAddress).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!cryptoData.amount || parseFloat(cryptoData.amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    const startedAt = Date.now();
    setSubmitting(true);

    try {
      const amount = parseFloat(cryptoData.amount);
      const depositAddress = cryptoData.cryptoType === 'bitcoin' ? bitcoinDepositAddress : bitcoinDepositAddress;

      const response = await fetch(`${apiBase}/transactions`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          description: `Crypto deposit - ${cryptoData.cryptoType.toUpperCase()}`,
          category: 'Deposit',
          accountType: cryptoData.toAccount,
          status: 'completed',
          transferType: 'crypto_deposit',
          note: cryptoData.memo || `Deposit address: ${depositAddress.substring(0, 10)}...`,
          date: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit crypto deposit');
      }

      const data = await response.json();

      // Keep the processing screen up for a minimum time before the receipt appears.
      const remaining = PROCESSING_MS - (Date.now() - startedAt);
      if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));

      setReceipt({
        amount,
        cryptoType: cryptoData.cryptoType,
        walletAddress: depositAddress,
        toAccount: cryptoData.toAccount,
        status: 'completed',
        date: new Date().toISOString().split('T')[0],
        reference: data.transaction?.reference || `${currentUser.id}-${Date.now()}`,
        memo: cryptoData.memo,
      });

      setShowReceiptModal(true);
      setSubmitting(false);
    } catch (err) {
      setError(err.message || 'Failed to process crypto deposit. Please try again.');
      setSubmitting(false);
    }
  };

  const handleReceiptClose = () => {
    setShowReceiptModal(false);
    navigate('/dashboard', {
      state: {
        notification: {
          title: 'Crypto deposit completed',
          detail: `${formatCurrency(receipt?.amount)} deposited to ${receipt?.toAccount}`,
          time: 'just now',
        },
      },
      replace: true,
    });
  };

  /* ---------------- derived display values ---------------- */
  const checkingBalance = Number(currentUser?.checking ?? 0);
  const savingsBalance = Number(currentUser?.savings ?? 0);
  const amountNumber = parseFloat(cryptoData.amount);
  const selectedCrypto = cryptoOptions.find((c) => c.value === cryptoData.cryptoType);

  const AccountPick = ({ id, balance }) => {
    const selected = cryptoData.toAccount === id;
    const Icon = id === 'savings' ? PiggyBank : Wallet;
    return (
      <button
        type="button"
        aria-pressed={selected}
        onClick={() => setCryptoData((prev) => ({ ...prev, toAccount: id }))}
        className={`flex min-w-0 items-center gap-3 rounded-2xl border p-3 text-left transition ${
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

  const SummaryRow = ({ label, children }) => (
    <div className="flex items-start justify-between gap-3 py-2.5 text-sm">
      <span className="shrink-0 text-slate-500">{label}</span>
      <span className="min-w-0 break-words text-right font-semibold text-slate-900">{children}</span>
    </div>
  );

  const howItWorks = [
    'Supported cryptocurrencies: Bitcoin, Ethereum, Litecoin, Dogecoin',
    'Real-time exchange rates applied',
    'Deposits are instantly converted to USD',
    'Funds appear in your account within 1-2 hours',
    'No hidden fees - transparent pricing',
  ];

  const receiptRows = receipt
    ? [
        ['Cryptocurrency', cryptoOptions.find(c => c.value === receipt.cryptoType)?.label || receipt.cryptoType.toUpperCase()],
        ['Deposit to', receipt.toAccount, 'capitalize'],
        ['Date', receipt.date],
        ['Wallet address', receipt.walletAddress, 'font-mono text-xs'],
        ['Reference', receipt.reference, 'font-mono text-xs'],
      ]
    : [];

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
        <h1 className="text-xl font-extrabold tracking-tight text-[#0a2540] sm:text-2xl lg:text-3xl">Crypto deposit</h1>
        <p className="mb-5 mt-0.5 text-sm text-slate-600">Deposit cryptocurrency directly into your Aurora Bank account.</p>

        {error && (
          <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="mx-auto max-w-2xl space-y-4">
            <section className="hero-card rounded-3xl p-6 text-center text-white sm:p-8">
              <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/15">
                <Coins size={30} aria-hidden="true" />
              </span>
              <h2 className="text-xl font-extrabold sm:text-2xl">Secure crypto deposit</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-blue-100 sm:text-base">
                Convert your cryptocurrency to USD and deposit directly into your account
              </p>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="mt-6 w-full rounded-xl bg-[#c8102e] px-6 py-3.5 text-base font-bold text-white transition hover:bg-[#a90d26] active:scale-[0.99] sm:w-auto"
              >
                Start crypto deposit
              </button>
            </section>

            <section className={`${cardCls} p-4 sm:p-5`}>
              <h2 className={`${sectionTitleCls} mb-3 flex items-center gap-2`}>
                <Info size={18} className="shrink-0 text-[#0b5cab]" aria-hidden="true" /> How it works
              </h2>
              <ul className="space-y-2.5 text-sm text-slate-700">
                {howItWorks.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check size={16} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />
                    <span className="min-w-0">{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-6">
            <form onSubmit={handleSubmit} className="min-w-0 space-y-4">
              {/* Crypto type */}
              <section className={`${cardCls} p-4 sm:p-5`}>
                <h2 className="mb-3 text-base font-bold text-[#0a2540]">Cryptocurrency</h2>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4" role="group" aria-label="Cryptocurrency type">
                  {cryptoOptions.map((option) => {
                    const selected = cryptoData.cryptoType === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setCryptoData({ ...cryptoData, cryptoType: option.value })}
                        className={`flex min-w-0 flex-col items-center gap-1 rounded-2xl border px-2 py-3 text-center transition ${
                          selected ? 'border-[#0b5cab] bg-[#eef5fc] ring-2 ring-[#0b5cab]/20' : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <span className={`flex h-10 w-10 items-center justify-center rounded-full text-xl ${selected ? 'bg-[#0b5cab] text-white' : 'bg-slate-100 text-slate-700'}`} aria-hidden="true">
                          {option.icon}
                        </span>
                        <span className="w-full truncate text-sm font-bold text-[#0a2540]">{option.short}</span>
                        <span className="text-[11px] font-medium text-slate-500">{option.label.match(/\(([^)]+)\)/)?.[1]}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Bitcoin address */}
              {cryptoData.cryptoType === 'bitcoin' && (
                <section className={`${cardCls} p-4 sm:p-5`}>
                  <div className="mb-4 flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-100 text-2xl text-orange-600" aria-hidden="true">₿</span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#0a2540]">Bitcoin deposit address</p>
                      <p className="text-xs text-slate-500">Scan the code or copy the address below</p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)] md:items-center">
                    <div className="mx-auto w-full max-w-[220px] rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                      <img
                        src={bitcoinQrUrl}
                        alt="Bitcoin deposit QR code"
                        className="aspect-square w-full rounded-xl"
                      />
                    </div>

                    <div className="min-w-0 space-y-3">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="mb-1 text-xs font-semibold text-slate-500">Wallet address</p>
                        <p className="break-all font-mono text-sm font-semibold text-slate-900">{bitcoinDepositAddress}</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyAddress}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#0b5cab] py-2.5 text-sm font-bold text-[#0b5cab] transition hover:bg-[#eef5fc]"
                      >
                        {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                        {copied ? 'Address copied' : 'Copy address'}
                      </button>
                      <p className="text-sm text-slate-600">
                        Send only Bitcoin (BTC) to this address. Funds sent to the wrong network may be lost.
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {/* Amount */}
              <section className={`${cardCls} p-4 sm:p-5`}>
                <label htmlFor="amount" className="mb-2 block text-base font-bold text-[#0a2540]">USD amount</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">$</span>
                  <input
                    id="amount"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={cryptoData.amount}
                    onChange={(e) => setCryptoData({ ...cryptoData, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full min-w-0 rounded-xl border border-slate-300 bg-white py-3.5 pl-10 pr-4 text-2xl font-extrabold tabular-nums text-[#0a2540] placeholder-slate-300 outline-none transition focus:border-[#0b5cab] focus:ring-2 focus:ring-[#0b5cab]/20"
                    required
                  />
                </div>
                <p className="mt-2 text-sm text-slate-500">Amount in USD equivalent</p>
              </section>

              {/* Deposit to */}
              <section className={`${cardCls} p-4 sm:p-5`}>
                <h2 className="mb-3 text-base font-bold text-[#0a2540]">Deposit to</h2>
                <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2">
                  <AccountPick id="checking" balance={checkingBalance} />
                  <AccountPick id="savings" balance={savingsBalance} />
                </div>
              </section>

              {/* Note */}
              <section className={`${cardCls} p-4 sm:p-5`}>
                <label htmlFor="memo" className="mb-2 block text-base font-bold text-[#0a2540]">
                  Note <span className="text-sm font-medium text-slate-400">(optional)</span>
                </label>
                <textarea
                  id="memo"
                  value={cryptoData.memo}
                  onChange={(e) => setCryptoData({ ...cryptoData, memo: e.target.value })}
                  placeholder="Add a note about this deposit"
                  className={`${inputCls} resize-none`}
                  rows="3"
                />
              </section>

              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-700" aria-hidden="true" />
                <p className="text-sm text-amber-900">
                  <strong>Important:</strong> Please ensure the wallet address is correct before submitting. Cryptocurrency transfers cannot be reversed.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-[1fr_auto]">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-[#c8102e] py-3.5 text-base font-bold text-white transition hover:bg-[#a90d26] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? 'Processing...' : 'Confirm deposit'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-xl border border-slate-300 bg-white px-8 py-3.5 text-base font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Back
                </button>
              </div>
            </form>

            {/* Sidebar */}
            <aside className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
              <section className="hero-card rounded-3xl p-4 text-white sm:p-5">
                <p className="text-sm font-medium text-blue-100">You're depositing</p>
                <div className="mt-1">
                  <Fit text={amountNumber > 0 ? money(amountNumber) : '$0.00'} min={20} max={36} className="font-extrabold tracking-tight" />
                </div>
                <p className="mt-1 truncate text-xs text-blue-100">
                  {selectedCrypto?.label} → {cryptoData.toAccount === 'savings' ? 'Savings' : 'Checking'}
                </p>
              </section>

              <section className={`${cardCls} px-4 py-3 sm:px-5`}>
                <h2 className="py-2 text-base font-bold text-[#0a2540]">Deposit summary</h2>
                <div className="divide-y divide-slate-100">
                  <SummaryRow label="Crypto">{selectedCrypto?.label}</SummaryRow>
                  <SummaryRow label="Deposit to"><span className="capitalize">{cryptoData.toAccount}</span></SummaryRow>
                  <SummaryRow label="Fee">None</SummaryRow>
                  <SummaryRow label="Arrives">Within 1-2 hours</SummaryRow>
                </div>
              </section>

              <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <p className="flex gap-3"><Clock size={18} className="mt-0.5 shrink-0 text-[#0b5cab]" aria-hidden="true" /><span>Funds appear in your account within 1-2 hours.</span></p>
                <p className="flex gap-3"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#0b5cab]" aria-hidden="true" /><span>Deposits are instantly converted to USD at real-time rates.</span></p>
              </section>
            </aside>
          </div>
        )}
      </main>

      {/* Processing screen (shown while the deposit is submitted, before the receipt) */}
      {submitting && !showReceiptModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0a2540]/70 p-4 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-live="assertive" aria-labelledby="crypto-processing-title">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl sm:p-8">
            <div className="mx-auto mb-5 h-14 w-14 animate-spin rounded-full border-4 border-[#e8f0fa] border-t-[#0b5cab]" aria-hidden="true" />
            <h2 id="crypto-processing-title" className="text-lg font-extrabold text-[#0a2540]">Processing your deposit</h2>
            <p className="mt-1.5 text-sm text-slate-600">Securely submitting your details. Please don't close or refresh this page.</p>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
              <div className="crypto-progress h-full rounded-full bg-[#0b5cab]" />
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes crypto-progress { from { width: 8%; } to { width: 96%; } }
        .crypto-progress { width: 8%; animation: crypto-progress ${PROCESSING_MS}ms ease-out forwards; }
      `}</style>

      {/* Receipt Modal */}
      {showReceiptModal && receipt && (
        <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/60 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="crypto-receipt-title">
          <div className="w-full max-w-lg max-h-[92dvh] overflow-y-auto rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:rounded-3xl">
            <div className="px-5 pb-2 pt-6 text-center sm:px-8">
              <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={30} aria-hidden="true" />
              </span>
              <h2 id="crypto-receipt-title" className="text-xl font-extrabold text-[#0a2540] sm:text-2xl">Deposit confirmed</h2>
              <p className="mt-1 text-sm text-slate-600">Your crypto deposit has been successfully processed</p>
              <div className="mt-4 rounded-2xl bg-[#eef5fc] px-4 py-4">
                <Fit text={money(receipt.amount)} min={22} max={36} className="text-center font-extrabold text-[#0a2540]" />
                <p className="mt-1 truncate text-sm text-slate-600">
                  <span aria-hidden="true">{getCryptoIcon(receipt.cryptoType)}</span> to your {receipt.toAccount} account
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100 px-5 py-2 sm:px-8">
              {receiptRows.map(([label, value, extra]) => (
                <div key={label} className="flex items-start justify-between gap-4 py-2.5 text-sm">
                  <span className="shrink-0 text-slate-500">{label}</span>
                  <span className={`min-w-0 break-all text-right font-semibold text-slate-900 ${extra || ''}`}>{value}</span>
                </div>
              ))}
            </div>

            <div className="mx-5 mb-4 mt-2 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3 sm:mx-8">
              <Info size={18} className="mt-0.5 shrink-0 text-[#0b5cab]" aria-hidden="true" />
              <p className="text-sm text-slate-700">
                Your deposit will be converted to USD and appear in your {receipt.toAccount} account within 1-2 hours.
              </p>
            </div>

            <div className="sticky bottom-0 border-t border-slate-200 bg-white px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 sm:px-8">
              <button
                type="button"
                onClick={handleReceiptClose}
                className="w-full rounded-xl bg-[#0b5cab] py-3.5 text-sm font-bold text-white transition hover:bg-[#0a4a8f]"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CryptoDepositPage;