import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useBankContext } from '../context/BankContext';
import AuroraBankLogo from '../components/AuroraBankLogo';
import '../App.css';

function DepositPage() {
  const { currentUser } = useBankContext();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [depositData, setDepositData] = useState({
    amount: '',
    checkNumber: '',
    frontImage: null,
    backImage: null,
    toAccount: 'checking',
    memo: '',
  });
  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview, setBackPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const apiBase = process.env.REACT_APP_API_BASE || 'http://localhost:5001/api';

  const formatCurrency = (value) => `$${Number(value || 0).toFixed(2)}`;

  const handlePrint = () => {
    window.print();
  };

  const handleFileChange = (e, side) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (side === 'front') {
        setFrontPreview(reader.result);
        setDepositData(prev => ({ ...prev, frontImage: reader.result }));
      } else {
        setBackPreview(reader.result);
        setDepositData(prev => ({ ...prev, backImage: reader.result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!depositData.amount || parseFloat(depositData.amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!depositData.frontImage || !depositData.backImage) {
      setError('Please upload both front and back images of the check');
      return;
    }

    setSubmitting(true);

    try {
      const amount = parseFloat(depositData.amount);
      const needsApproval = amount > 1000;

      const response = await fetch(`${apiBase}/transactions`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          description: `Check deposit #${depositData.checkNumber || 'N/A'}`,
          category: 'Deposit',
          accountType: depositData.toAccount,
          status: needsApproval ? 'pending' : 'completed',
          transferType: 'deposit',
          note: depositData.memo,
          date: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit deposit');
      }

      const data = await response.json();

      setReceipt({
        amount,
        checkNumber: depositData.checkNumber || 'N/A',
        toAccount: depositData.toAccount,
        status: needsApproval ? 'pending' : 'completed',
        date: new Date().toISOString().split('T')[0],
        reference: data.transaction?.reference || `${currentUser.id}-${Date.now()}`,
        memo: depositData.memo,
        needsApproval,
      });

      setShowReceiptModal(true);
      setSubmitting(false);
    } catch (err) {
      setError(err.message || 'Failed to process deposit. Please try again.');
      setSubmitting(false);
    }
  };

  const handleReceiptClose = () => {
    setShowReceiptModal(false);
    navigate('/dashboard', {
      state: {
        notification: {
          title: receipt?.needsApproval ? 'Check deposit submitted' : 'Check deposit completed',
          detail: `$${Number(receipt?.amount || 0).toFixed(2)} ${receipt?.needsApproval ? 'pending approval' : 'deposited to ' + receipt?.toAccount}`,
          time: 'just now',
        },
      },
      replace: true,
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-white/5 bg-slate-900/50 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3 text-cyan-400">
            <AuroraBankLogo />
            <span className="text-lg font-semibold tracking-tight text-slate-50">Aurora Bank</span>
          </div>
          <Link to="/dashboard" className="text-sm text-cyan-200 hover:text-white">
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="mb-2 text-3xl font-semibold text-white">Deposit Check</h1>
        <p className="mb-8 text-slate-300">Mobile check deposit - snap a photo and deposit instantly</p>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="rounded-2xl border border-white/5 bg-white/5 p-8 text-center">
            <div className="mx-auto mb-6 flex h-32 w-32 items-center justify-center rounded-full bg-cyan-400/20">
              <span className="text-6xl">📷</span>
            </div>
            <h3 className="mb-2 text-xl font-semibold text-white">Mobile Deposit</h3>
            <p className="mb-6 text-slate-300">
              Take photos of the front and back of your check to deposit instantly
            </p>
            <button 
              onClick={() => setStep(2)}
              className="rounded-xl bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-cyan-300"
            >
              Start Deposit
            </button>
            
            <div className="mt-8 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-left">
              <p className="text-sm text-slate-300">
                💡 <strong>Tips for best results:</strong><br />
                • Ensure check is on a dark surface<br />
                • Make sure all corners are visible<br />
                • Check must be endorsed on the back<br />
                • Deposits over $1,000 may require admin approval
              </p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="rounded-2xl border border-white/5 bg-white/5 p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm text-slate-200">Check Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={depositData.amount}
                    onChange={(e) => setDepositData({ ...depositData, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pl-8 text-white placeholder-slate-400 outline-none focus:border-cyan-300/50"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-200">Check Number (Optional)</label>
                <input
                  type="text"
                  value={depositData.checkNumber}
                  onChange={(e) => setDepositData({ ...depositData, checkNumber: e.target.value })}
                  placeholder="e.g., 1234"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-400 outline-none focus:border-cyan-300/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-200">Deposit To</label>
                <select
                  value={depositData.toAccount}
                  onChange={(e) => setDepositData({ ...depositData, toAccount: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-300/50"
                >
                  <option value="checking">Checking - ${Number(currentUser?.checking ?? 0).toFixed(2)}</option>
                  <option value="savings">Savings - ${Number(currentUser?.savings ?? 0).toFixed(2)}</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-200">Front of Check</label>
                <div className="rounded-xl border-2 border-dashed border-white/10 bg-white/5 p-6">
                  {frontPreview ? (
                    <div className="relative">
                      <img src={frontPreview} alt="Check front" className="w-full rounded-lg" />
                      <button
                        type="button"
                        onClick={() => {
                          setFrontPreview(null);
                          setDepositData(prev => ({ ...prev, frontImage: null }));
                        }}
                        className="absolute right-2 top-2 rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer flex-col items-center">
                      <span className="mb-2 text-4xl">📸</span>
                      <span className="text-sm text-slate-300">Click to upload front image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, 'front')}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-200">Back of Check</label>
                <div className="rounded-xl border-2 border-dashed border-white/10 bg-white/5 p-6">
                  {backPreview ? (
                    <div className="relative">
                      <img src={backPreview} alt="Check back" className="w-full rounded-lg" />
                      <button
                        type="button"
                        onClick={() => {
                          setBackPreview(null);
                          setDepositData(prev => ({ ...prev, backImage: null }));
                        }}
                        className="absolute right-2 top-2 rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer flex-col items-center">
                      <span className="mb-2 text-4xl">📸</span>
                      <span className="text-sm text-slate-300">Click to upload back image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, 'back')}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-200">Memo (Optional)</label>
                <textarea
                  value={depositData.memo}
                  onChange={(e) => setDepositData({ ...depositData, memo: e.target.value })}
                  placeholder="Add a note about this deposit"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-400 outline-none focus:border-cyan-300/50"
                  rows="3"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-cyan-400 py-3 text-sm font-semibold text-slate-900 transition hover:bg-cyan-300 disabled:opacity-50"
                >
                  {submitting ? 'Processing...' : 'Submit Deposit'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Back
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Print styles scoped for the receipt modal */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .printable, .printable * { visibility: visible; }
          .printable { position: absolute; inset: 0; margin: 0; padding: 32px; background: white; color: #0f172a; }
        }
      `}</style>

      {showReceiptModal && receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="printable w-full max-w-lg rounded-2xl border border-white/10 bg-white text-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-2 text-green-600">
                <span className="text-xl">✔</span>
                <div>
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Deposit</div>
                  <div className="text-lg font-semibold text-slate-900">Successful</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:border-cyan-300 hover:text-cyan-700"
                aria-label="Print receipt"
              >
                <span className="text-sm">🖨</span>
                <span>PDF</span>
              </button>
            </div>

            <div className="space-y-4 px-5 py-5 text-sm text-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Reference</span>
                <span className="font-semibold text-slate-900">{receipt.reference}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Date</span>
                <span className="font-semibold text-slate-900">{receipt.date}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Amount</span>
                <span className="text-lg font-semibold text-slate-900">{formatCurrency(receipt.amount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Status</span>
                <span className={`font-semibold capitalize ${receipt.status === 'pending' ? 'text-yellow-600' : 'text-green-600'}`}>
                  {receipt.status}
                </span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.12em] text-slate-500 mb-1">Deposit To</div>
                <div className="font-semibold text-slate-900 capitalize">{receipt.toAccount}</div>
                <div className="text-xs text-slate-500">{currentUser?.name}</div>
              </div>
              {receipt.checkNumber && receipt.checkNumber !== 'N/A' && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.12em] text-slate-500 mb-1">Check Number</div>
                  <div className="font-semibold text-slate-900">{receipt.checkNumber}</div>
                </div>
              )}
              {receipt.memo && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.12em] text-slate-500 mb-1">Memo</div>
                  <div className="text-slate-800">{receipt.memo}</div>
                </div>
              )}
              {receipt.needsApproval && (
                <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3">
                  <div className="flex gap-2">
                    <span className="text-yellow-600">⏳</span>
                    <div>
                      <div className="text-xs font-semibold text-yellow-800 mb-1">Pending Admin Approval</div>
                      <div className="text-xs text-yellow-700">
                        Deposits over $1,000 require approval. You'll be notified once approved.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
              <button
                type="button"
                onClick={handleReceiptClose}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DepositPage;
