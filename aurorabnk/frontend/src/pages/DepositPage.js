import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useBankContext } from '../context/BankContext';
import AuroraBankLogo from '../components/AuroraBankLogo';
import { API_BASE } from '../config';
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

  const apiBase = API_BASE;

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
        credentials: 'include',
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
        <h1 className="mb-2 text-3xl font-semibold text-slate-900">Deposit Check</h1>
        <p className="mb-8 text-slate-600">Mobile check deposit - snap a photo and deposit instantly</p>

        {error && (
          <div className="mb-6 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">
            <div className="mx-auto mb-6 flex h-32 w-32 items-center justify-center rounded-full bg-indigo-100">
              <span className="text-6xl">📷</span>
            </div>
            <h3 className="mb-2 text-xl font-semibold text-slate-900">Mobile Deposit</h3>
            <p className="mb-6 text-slate-600">
              Take photos of the front and back of your check to deposit instantly
            </p>
            <button 
              onClick={() => setStep(2)}
              className="rounded-xl bg-gradient-to-r from-indigo-900 to-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:from-indigo-950 hover:to-black"
            >
              Start Deposit
            </button>
            
            <div className="mt-8 rounded-xl border border-blue-200 bg-blue-50 p-4 text-left">
              <p className="text-sm text-slate-700">
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
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm text-slate-700 font-semibold">Check Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={depositData.amount}
                    onChange={(e) => setDepositData({ ...depositData, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pl-8 text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-800 focus:ring-2 focus:ring-indigo-900/20"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-700 font-semibold">Check Number (Optional)</label>
                <input
                  type="text"
                  value={depositData.checkNumber}
                  onChange={(e) => setDepositData({ ...depositData, checkNumber: e.target.value })}
                  placeholder="e.g., 1234"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-800 focus:ring-2 focus:ring-indigo-900/20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-700 font-semibold">Deposit To</label>
                <select
                  value={depositData.toAccount}
                  onChange={(e) => setDepositData({ ...depositData, toAccount: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-indigo-800 focus:ring-2 focus:ring-indigo-900/20"
                >
                  <option value="checking">Checking - ${Number(currentUser?.checking ?? 0).toFixed(2)}</option>
                  <option value="savings">Savings - ${Number(currentUser?.savings ?? 0).toFixed(2)}</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-700 font-semibold">Front of Check</label>
                <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6">
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
                      <span className="text-sm text-slate-600">Click to upload front image</span>
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
                <label className="text-sm text-slate-700 font-semibold">Back of Check</label>
                <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6">
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
                      <span className="text-sm text-slate-600">Click to upload back image</span>
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
                <label className="text-sm text-slate-700 font-semibold">Memo (Optional)</label>
                <textarea
                  value={depositData.memo}
                  onChange={(e) => setDepositData({ ...depositData, memo: e.target.value })}
                  placeholder="Add a note about this deposit"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-800 focus:ring-2 focus:ring-indigo-900/20"
                  rows="3"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-gradient-to-r from-indigo-900 to-slate-950 py-3 text-sm font-semibold text-white transition hover:from-indigo-950 hover:to-black disabled:opacity-50"
                >
                  {submitting ? 'Processing...' : 'Submit Deposit'}
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

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .printable, .printable * { visibility: visible; }
          .printable { position: absolute; left: 0; top: 0; }
          .no-print { display: none !important; }
          @page { size: A4; margin: 15mm; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
        }
      `}</style>

      {showReceiptModal && receipt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between no-print">
              <h2 className="text-2xl font-semibold text-slate-900">Mobile Deposit Receipt</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrint}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  🖨️ Print
                </button>
                <button
                  onClick={handleReceiptClose}
                  className="text-slate-400 hover:text-slate-900 transition text-2xl"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Receipt Content */}
            <div className="printable p-8 font-mono text-xs leading-relaxed bg-white" style={{fontFamily: "'Courier New', 'Courier', monospace"}}>
              
              {/* Header */}
              <div className="text-center mb-3">
                <p className="font-bold">AURORA BANK</p>
                <p>MOBILE DEPOSIT RECEIPT</p>
              </div>

              <div className="border-t border-b border-black py-2 mb-3 text-center">
                <p>*** DEPOSIT SUCCESSFUL ***</p>
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
                  <span className="uppercase">{receipt.status === 'pending' ? 'PENDING APPROVAL' : receipt.status}</span>
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

              {/* Deposit To */}
              <div className="mb-3 space-y-0.5">
                <p className="font-bold">DEPOSITED TO:</p>
                <p className="ml-2">{currentUser?.name}</p>
                <div className="ml-2 flex justify-between">
                  <span>ACCOUNT:</span>
                  <span className="uppercase">{receipt.toAccount}</span>
                </div>
                {currentUser?.accountNumber && (
                  <div className="ml-2 flex justify-between">
                    <span>ACCT #:</span>
                    <span>****{String(currentUser.accountNumber).slice(-4)}</span>
                  </div>
                )}
              </div>

              {/* Check Number */}
              {receipt.checkNumber && receipt.checkNumber !== 'N/A' && (
                <>
                  <div className="border-t border-black my-3"></div>
                  <div className="mb-3">
                    <div className="flex justify-between">
                      <span className="font-bold">CHECK #:</span>
                      <span>{receipt.checkNumber}</span>
                    </div>
                  </div>
                </>
              )}

              {/* Memo */}
              {receipt.memo && (
                <>
                  <div className="border-t border-black my-3"></div>
                  <div className="mb-3">
                    <div className="flex">
                      <span className="font-bold">MEMO:</span>
                      <span className="ml-2">{receipt.memo}</span>
                    </div>
                  </div>
                </>
              )}

              <div className="border-t border-black my-3"></div>

              {/* Notice */}
              {receipt.needsApproval ? (
                <div className="mb-3 text-xs">
                  <p className="text-center mb-1">IMPORTANT NOTICE</p>
                  <p>Your deposit is currently being processed.</p>
                  <p>Deposits over $1,000 require approval.</p>
                  <p>This takes 1-2 business days.</p>
                </div>
              ) : (
                <div className="mb-3 text-xs">
                  <p className="text-center mb-1">IMPORTANT NOTICE</p>
                  <p>Your deposit has been successfully processed.</p>
                  <p>Funds are now available in your account.</p>
                </div>
              )}

              <div className="border-t border-black my-3"></div>

              {/* Footer */}
              <div className="text-center text-xs">
                <p>Questions? Contact us:</p>
                <p>support@aurorabank.com</p>
                <p>1-800-AURORA-1</p>
                <p className="mt-3">Member FDIC</p>
                <p className="mt-2">RETAIN FOR YOUR RECORDS</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DepositPage;
