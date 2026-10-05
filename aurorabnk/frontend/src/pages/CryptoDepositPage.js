import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useBankContext } from '../context/BankContext';
import AuroraBankLogo from '../components/AuroraBankLogo';
import { API_BASE } from '../config';
import '../App.css';

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

  const apiBase = API_BASE;
  const bitcoinDepositAddress = 'bc1qg9a93teaqcyw7v4f60j69djz9sxny8nmf0w2zf';
  const bitcoinQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=${encodeURIComponent(bitcoinDepositAddress)}`;

  const cryptoOptions = [
    { value: 'bitcoin', label: 'Bitcoin (BTC)', icon: '₿' },
    { value: 'ethereum', label: 'Ethereum (ETH)', icon: '◇' },
    { value: 'litecoin', label: 'Litecoin (LTC)', icon: '◊' },
    { value: 'dogecoin', label: 'Dogecoin (DOGE)', icon: '🐕' },
  ];

  const getCryptoIcon = (type) => {
    const crypto = cryptoOptions.find(c => c.value === type);
    return crypto ? crypto.icon : '🪙';
  };

  const formatCurrency = (value) => `$${Number(value || 0).toFixed(2)}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!cryptoData.amount || parseFloat(cryptoData.amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-xl shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <AuroraBankLogo />
            <span className="text-lg font-semibold tracking-tight bg-gradient-to-r from-indigo-900 to-slate-950 bg-clip-text text-transparent">Aurora Bank</span>
          </div>
          <Link to="/dashboard" className="text-sm text-indigo-800 hover:text-indigo-950">
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="mb-2 text-3xl font-semibold text-slate-900">Crypto Deposit</h1>
        <p className="mb-8 text-slate-600">Deposit cryptocurrency directly into your Aurora Bank account</p>

        {error && (
          <div className="mb-6 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">
            <div className="mx-auto mb-6 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-yellow-100 to-orange-100">
              <span className="text-6xl">🪙</span>
            </div>
            <h3 className="mb-2 text-xl font-semibold text-slate-900">Secure Crypto Deposit</h3>
            <p className="mb-6 text-slate-600">
              Convert your cryptocurrency to USD and deposit directly into your account
            </p>
            <button 
              onClick={() => setStep(2)}
              className="rounded-xl bg-gradient-to-r from-indigo-900 to-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:from-indigo-950 hover:to-black"
            >
              Start Crypto Deposit
            </button>
            
            <div className="mt-8 rounded-xl border border-blue-200 bg-blue-50 p-4 text-left">
              <p className="text-sm text-slate-700">
                💡 <strong>How it works:</strong><br />
                • Supported cryptocurrencies: Bitcoin, Ethereum, Litecoin, Dogecoin<br />
                • Real-time exchange rates applied<br />
                • Deposits are instantly converted to USD<br />
                • Funds appear in your account within 1-2 hours<br />
                • No hidden fees - transparent pricing
              </p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm text-slate-700 font-semibold">Cryptocurrency Type</label>
                <select
                  value={cryptoData.cryptoType}
                  onChange={(e) => setCryptoData({ ...cryptoData, cryptoType: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-indigo-800 focus:ring-2 focus:ring-indigo-900/20"
                >
                  {cryptoOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {cryptoData.cryptoType === 'bitcoin' && (
                <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-100 text-2xl">
                      ₿
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Bitcoin Deposit Address</p>
                      <p className="text-xs text-slate-500">Scan the code or copy the address below</p>
                    </div>
                  </div>

                  <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)] md:items-center">
                    <div className="mx-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                      <img
                        src={bitcoinQrUrl}
                        alt="Bitcoin deposit QR code"
                        className="h-[220px] w-[220px] rounded-xl"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Wallet Address</p>
                        <p className="break-all font-mono text-sm font-semibold text-slate-900">{bitcoinDepositAddress}</p>
                      </div>
                      <p className="text-sm text-slate-600">
                        Send only Bitcoin (BTC) to this address. Funds sent to the wrong network may be lost.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm text-slate-700 font-semibold">USD Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={cryptoData.amount}
                    onChange={(e) => setCryptoData({ ...cryptoData, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pl-8 text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-800 focus:ring-2 focus:ring-indigo-900/20"
                    required
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">Amount in USD equivalent</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-700 font-semibold">Deposit To</label>
                <select
                  value={cryptoData.toAccount}
                  onChange={(e) => setCryptoData({ ...cryptoData, toAccount: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-indigo-800 focus:ring-2 focus:ring-indigo-900/20"
                >
                  <option value="checking">Checking - ${Number(currentUser?.checking ?? 0).toFixed(2)}</option>
                  <option value="savings">Savings - ${Number(currentUser?.savings ?? 0).toFixed(2)}</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-700 font-semibold">Note (Optional)</label>
                <textarea
                  value={cryptoData.memo}
                  onChange={(e) => setCryptoData({ ...cryptoData, memo: e.target.value })}
                  placeholder="Add a note about this deposit"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-800 focus:ring-2 focus:ring-indigo-900/20"
                  rows="3"
                />
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs text-slate-700">
                  ⚠️ <strong>Important:</strong> Please ensure the wallet address is correct before submitting. Cryptocurrency transfers cannot be reversed.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-gradient-to-r from-indigo-900 to-slate-950 py-3 text-sm font-semibold text-white transition hover:from-indigo-950 hover:to-black disabled:opacity-50"
                >
                  {submitting ? 'Processing...' : 'Confirm Deposit'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Back
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {showReceiptModal && receipt && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="my-auto w-full max-w-2xl max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:p-8">
            <div className="text-center mb-8">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 mb-4">
                <span className="text-4xl">✓</span>
              </div>
              <h2 className="text-2xl font-semibold text-slate-900 mb-2">Deposit Confirmed</h2>
              <p className="text-slate-600">Your crypto deposit has been successfully processed</p>
            </div>

            <div className="space-y-4 mb-8 bg-slate-50 p-6 rounded-xl">
              <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                <span className="text-slate-600">Amount</span>
                <span className="font-semibold text-slate-900">{formatCurrency(receipt.amount)}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                <span className="text-slate-600">Cryptocurrency</span>
                <span className="font-semibold text-slate-900">
                  {cryptoOptions.find(c => c.value === receipt.cryptoType)?.label || receipt.cryptoType.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                <span className="text-slate-600">Wallet Address</span>
                <span className="font-mono text-xs text-slate-900">{receipt.walletAddress}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                <span className="text-slate-600">Deposit To</span>
                <span className="font-semibold text-slate-900 capitalize">{receipt.toAccount}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                <span className="text-slate-600">Date</span>
                <span className="font-semibold text-slate-900">{receipt.date}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Reference</span>
                <span className="font-mono text-xs text-slate-900">{receipt.reference}</span>
              </div>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 mb-6">
              <p className="text-sm text-slate-700">
                ℹ️ Your deposit will be converted to USD and appear in your {receipt.toAccount} account within 1-2 hours.
              </p>
            </div>

            <button
              onClick={handleReceiptClose}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-900 to-slate-950 py-3 text-sm font-semibold text-white transition hover:from-indigo-950 hover:to-black"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CryptoDepositPage;
