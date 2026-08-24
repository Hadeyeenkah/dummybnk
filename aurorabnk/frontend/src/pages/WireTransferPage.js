import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useBankContext } from '../context/BankContext';
import AuroraBankLogo from '../components/AuroraBankLogo';
import '../App.css';

function WireTransferPage() {
  const { currentUser, transferMoney } = useBankContext();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    recipientName: '',
    recipientBankName: '',
    recipientBankAddress: '',
    recipientRoutingNumber: '',
    recipientAccountNumber: '',
    recipientSwiftCode: '',
    amount: '',
    fromAccount: 'checking',
    purpose: '',
    note: '',
  });
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (!formData.recipientName.trim()) {
      setMessage('Recipient name is required');
      setMessageType('error');
      return false;
    }
    if (!formData.recipientBankName.trim()) {
      setMessage('Recipient bank name is required');
      setMessageType('error');
      return false;
    }
    if (!formData.recipientRoutingNumber.trim()) {
      setMessage('Routing number is required');
      setMessageType('error');
      return false;
    }
    if (!formData.recipientAccountNumber.trim()) {
      setMessage('Account number is required');
      setMessageType('error');
      return false;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setMessage('Please enter a valid amount');
      setMessageType('error');
      return false;
    }
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setMessage('');

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const amount = parseFloat(formData.amount);
      const result = transferMoney({
        fromUserId: currentUser.id,
        amount,
        fromAccount: formData.fromAccount,
        transferType: 'wire',
        recipient: {
          name: formData.recipientName,
          bankName: formData.recipientBankName,
          bankAddress: formData.recipientBankAddress,
          routingNumber: formData.recipientRoutingNumber,
          accountNumber: formData.recipientAccountNumber,
          swiftCode: formData.recipientSwiftCode,
        },
        purpose: formData.purpose,
        note: formData.note,
      });

      if (result.success) {
        setMessageType('success');
        setMessage(result.message || 'Wire transfer submitted successfully!');
        setReceipt({
          ...result.receipt,
          amount,
          recipientName: formData.recipientName,
          recipientBankName: formData.recipientBankName,
          fromAccount: formData.fromAccount,
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString(),
          status: 'pending',
        });
        setShowReceiptModal(true);
      } else {
        setMessageType('error');
        setMessage(result.message || 'Wire transfer failed');
      }
    } catch (err) {
      console.error('Wire transfer error:', err);
      setMessageType('error');
      setMessage('An error occurred while processing the wire transfer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReceiptClose = () => {
    setShowReceiptModal(false);
    navigate('/dashboard', {
      state: {
        notification: {
          title: 'Wire transfer submitted',
          detail: `${receipt?.recipientName} - ${receipt?.amount ? '$' + parseFloat(receipt.amount).toFixed(2) : ''}`,
          time: 'just now',
        },
      },
      replace: true,
    });
  };

  const handlePrint = () => {
    window.print();
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

      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="mb-2 text-3xl font-semibold text-slate-900">Wire Transfer</h1>
        <p className="mb-8 text-slate-600">Send domestic and international wire transfers securely and quickly</p>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Form Section */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg md:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Message Display */}
              {message && (
                <div className={`rounded-lg p-4 text-sm ${messageType === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                  {message}
                </div>
              )}

              {/* From Account */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  From Account
                </label>
                <select
                  name="fromAccount"
                  value={formData.fromAccount}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-indigo-800 focus:ring-2 focus:ring-indigo-900/20 transition"
                >
                  <option value="checking">Checking - ${currentUser?.checking?.toFixed(2) || '0.00'}</option>
                  <option value="savings">Savings - ${currentUser?.savings?.toFixed(2) || '0.00'}</option>
                </select>
              </div>

              <div className="border-t border-slate-200 pt-6">
                <h3 className="mb-4 text-lg font-semibold text-slate-900">Recipient Information</h3>

                {/* Recipient Name */}
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Recipient Full Name *
                  </label>
                  <input
                    type="text"
                    name="recipientName"
                    value={formData.recipientName}
                    onChange={handleChange}
                    placeholder="e.g., John Smith"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-800 focus:ring-2 focus:ring-indigo-900/20 transition"
                  />
                </div>

                {/* Bank Name */}
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Recipient Bank Name *
                  </label>
                  <input
                    type="text"
                    name="recipientBankName"
                    value={formData.recipientBankName}
                    onChange={handleChange}
                    placeholder="e.g., First National Bank"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-800 focus:ring-2 focus:ring-indigo-900/20 transition"
                  />
                </div>

                {/* Bank Address */}
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Bank Address
                  </label>
                  <input
                    type="text"
                    name="recipientBankAddress"
                    value={formData.recipientBankAddress}
                    onChange={handleChange}
                    placeholder="e.g., 123 Main St, New York, NY 10001"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-800 focus:ring-2 focus:ring-indigo-900/20 transition"
                  />
                </div>

                {/* Routing Number */}
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-semibold text-slate-200">
                    Routing Number *
                  </label>
                  <input
                    type="text"
                    name="recipientRoutingNumber"
                    value={formData.recipientRoutingNumber}
                    onChange={handleChange}
                    placeholder="e.g., 021000021"
                    maxLength="9"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-800 focus:ring-2 focus:ring-indigo-900/20 transition"
                  />
                  <p className="mt-1 text-xs text-slate-400">9-digit ABA routing number</p>
                </div>

                {/* Account Number */}
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-semibold text-slate-200">
                    Account Number *
                  </label>
                  <input
                    type="text"
                    name="recipientAccountNumber"
                    value={formData.recipientAccountNumber}
                    onChange={handleChange}
                    placeholder="e.g., 123456789"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-800 focus:ring-2 focus:ring-indigo-900/20 transition"
                  />
                </div>

                {/* SWIFT Code (Optional) */}
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-semibold text-slate-200">
                    SWIFT Code (International)
                  </label>
                  <input
                    type="text"
                    name="recipientSwiftCode"
                    value={formData.recipientSwiftCode}
                    onChange={handleChange}
                    placeholder="e.g., CHASUS33"
                    maxLength="11"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-800 focus:ring-2 focus:ring-indigo-900/20 transition"
                  />
                </div>
              </div>

              <div className="border-t border-slate-200 pt-6">
                <h3 className="mb-4 text-lg font-semibold text-slate-900">Transfer Details</h3>

                {/* Amount */}
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-semibold text-slate-200">
                    Amount *
                  </label>
                  <div className="flex items-center">
                    <span className="text-slate-400 mr-2">$</span>
                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleChange}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-800 focus:ring-2 focus:ring-indigo-900/20 transition"
                    />
                  </div>
                </div>

                {/* Purpose */}
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-semibold text-slate-200">
                    Purpose of Wire
                  </label>
                  <select
                    name="purpose"
                    value={formData.purpose}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-indigo-800 focus:ring-2 focus:ring-indigo-900/20 transition"
                  >
                    <option value="">Select a purpose</option>
                    <option value="payment">Payment</option>
                    <option value="personal">Personal Transfer</option>
                    <option value="business">Business Payment</option>
                    <option value="investment">Investment</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Note */}
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-semibold text-slate-200">
                    Notes/Reference
                  </label>
                  <textarea
                    name="note"
                    value={formData.note}
                    onChange={handleChange}
                    placeholder="Add any additional details about this transfer..."
                    rows="3"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-800 focus:ring-2 focus:ring-indigo-900/20 transition resize-none"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-gradient-to-r from-indigo-900 to-slate-950 py-3 text-sm font-semibold text-white hover:from-indigo-950 hover:to-black transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Processing...' : 'Send Wire Transfer'}
                </button>
                <Link
                  to="/dashboard"
                  className="flex-1 rounded-lg border border-slate-200 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition text-center"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </div>

          {/* Info Section */}
          <div className="space-y-6">
            {/* Wire Transfer Info */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
              <h3 className="mb-4 text-lg font-semibold text-slate-900">Wire Transfer Info</h3>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex gap-3">
                  <span className="text-indigo-700">⏱</span>
                  <span>Typically processed within 1-2 business days</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-indigo-700">💰</span>
                  <span>May require admin approval for amounts over $5,000</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-indigo-700">🔒</span>
                  <span>All transfers are encrypted and secure</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-indigo-700">📋</span>
                  <span>Keep your confirmation number for reference</span>
                </li>
              </ul>
            </div>

            {/* Account Balance */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
              <h3 className="mb-4 text-lg font-semibold text-slate-900">Your Accounts</h3>
              <div className="space-y-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-400">Checking</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    ${currentUser?.checking?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-400">Savings</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    ${currentUser?.savings?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                  </p>
                </div>
              </div>
            </div>

            {/* Requirements */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
              <h3 className="mb-4 text-lg font-semibold text-slate-900">Requirements</h3>
              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-700 mt-1">✓</span>
                  <span>Valid recipient name</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-700 mt-1">✓</span>
                  <span>Bank name and routing number</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-700 mt-1">✓</span>
                  <span>Recipient account number</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-700 mt-1">✓</span>
                  <span>Valid transfer amount</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-700 mt-1">✓</span>
                  <span>Sufficient funds in selected account</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
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

      {/* Receipt Modal */}
      {showReceiptModal && receipt && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="my-auto w-full max-w-2xl max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)]">
            {/* Modal Header */}
            <div className="sticky top-0 border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between no-print">
              <h2 className="text-2xl font-semibold text-slate-900">Wire Transfer Receipt</h2>
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
                <p>WIRE TRANSFER RECEIPT</p>
              </div>

              <div className="border-t border-b border-black py-2 mb-3 text-center">
                <p>*** WIRE TRANSFER SUBMITTED ***</p>
              </div>

              {/* Transaction Info */}
              <div className="mb-3 space-y-0.5">
                <div className="flex justify-between">
                  <span>DATE:</span>
                  <span>{receipt.date}</span>
                </div>
                <div className="flex justify-between">
                  <span>REFERENCE:</span>
                  <span>{receipt.reference || `WIR-${Date.now().toString().slice(-10)}`}</span>
                </div>
                <div className="flex justify-between">
                  <span>STATUS:</span>
                  <span>PENDING APPROVAL</span>
                </div>
              </div>

              <div className="border-t border-black my-3"></div>

              {/* Amount */}
              <div className="mb-3">
                <div className="flex justify-between font-bold">
                  <span>AMOUNT:</span>
                  <span>${parseFloat(receipt.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="border-t border-black my-3"></div>

              {/* From Account */}
              <div className="mb-3 space-y-0.5">
                <p className="font-bold">FROM:</p>
                <p className="ml-2">{currentUser?.name}</p>
                <div className="ml-2 flex justify-between">
                  <span>ACCOUNT:</span>
                  <span>{receipt.fromAccount === 'checking' ? 'CHECKING' : 'SAVINGS'}</span>
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
                <p className="ml-2">{receipt.recipientName}</p>
                <div className="ml-2 flex justify-between">
                  <span>BANK:</span>
                  <span>{receipt.recipientBankName}</span>
                </div>
                {receipt.recipientAccountNumber && (
                  <div className="ml-2 flex justify-between">
                    <span>ACCT #:</span>
                    <span>****{String(receipt.recipientAccountNumber).slice(-4)}</span>
                  </div>
                )}
                {receipt.recipientRoutingNumber && (
                  <div className="ml-2 flex justify-between">
                    <span>ROUTING:</span>
                    <span>{receipt.recipientRoutingNumber}</span>
                  </div>
                )}
              </div>

              {/* Purpose */}
              {formData.purpose && (
                <>
                  <div className="border-t border-black my-3"></div>
                  <div className="mb-3">
                    <div className="flex">
                      <span className="font-bold">PURPOSE:</span>
                      <span className="ml-2">{formData.purpose}</span>
                    </div>
                  </div>
                </>
              )}

              {/* Note */}
              {formData.note && (
                <>
                  <div className="border-t border-black my-3"></div>
                  <div className="mb-3">
                    <div className="flex">
                      <span className="font-bold">NOTE:</span>
                      <span className="ml-2">{formData.note}</span>
                    </div>
                  </div>
                </>
              )}

              <div className="border-t border-black my-3"></div>

              {/* Notice */}
              <div className="mb-3 text-xs">
                <p className="text-center mb-1">IMPORTANT NOTICE</p>
                <p>Your wire transfer is currently being</p>
                <p>processed. This takes 1-2 business days.</p>
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WireTransferPage;
