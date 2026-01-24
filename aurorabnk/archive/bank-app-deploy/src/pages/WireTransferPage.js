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

      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="mb-2 text-3xl font-semibold text-white">Wire Transfer</h1>
        <p className="mb-8 text-slate-300">Send domestic and international wire transfers securely and quickly</p>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Form Section */}
          <div className="rounded-2xl border border-white/5 bg-white/5 p-6 md:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Message Display */}
              {message && (
                <div className={`rounded-lg p-4 text-sm ${messageType === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                  {message}
                </div>
              )}

              {/* From Account */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-200">
                  From Account
                </label>
                <select
                  name="fromAccount"
                  value={formData.fromAccount}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-300/50 transition"
                >
                  <option value="checking">Checking - ${currentUser?.checking?.toFixed(2) || '0.00'}</option>
                  <option value="savings">Savings - ${currentUser?.savings?.toFixed(2) || '0.00'}</option>
                </select>
              </div>

              <div className="border-t border-white/10 pt-6">
                <h3 className="mb-4 text-lg font-semibold text-white">Recipient Information</h3>

                {/* Recipient Name */}
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-semibold text-slate-200">
                    Recipient Full Name *
                  </label>
                  <input
                    type="text"
                    name="recipientName"
                    value={formData.recipientName}
                    onChange={handleChange}
                    placeholder="e.g., John Smith"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-cyan-300/50 transition"
                  />
                </div>

                {/* Bank Name */}
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-semibold text-slate-200">
                    Recipient Bank Name *
                  </label>
                  <input
                    type="text"
                    name="recipientBankName"
                    value={formData.recipientBankName}
                    onChange={handleChange}
                    placeholder="e.g., First National Bank"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-cyan-300/50 transition"
                  />
                </div>

                {/* Bank Address */}
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-semibold text-slate-200">
                    Bank Address
                  </label>
                  <input
                    type="text"
                    name="recipientBankAddress"
                    value={formData.recipientBankAddress}
                    onChange={handleChange}
                    placeholder="e.g., 123 Main St, New York, NY 10001"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-cyan-300/50 transition"
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
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-cyan-300/50 transition"
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
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-cyan-300/50 transition"
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
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-cyan-300/50 transition"
                  />
                </div>
              </div>

              <div className="border-t border-white/10 pt-6">
                <h3 className="mb-4 text-lg font-semibold text-white">Transfer Details</h3>

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
                      className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-cyan-300/50 transition"
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
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-300/50 transition"
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
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-cyan-300/50 transition resize-none"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-cyan-400 py-3 text-sm font-semibold text-slate-900 hover:bg-cyan-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Processing...' : 'Send Wire Transfer'}
                </button>
                <Link
                  to="/dashboard"
                  className="flex-1 rounded-lg border border-white/10 py-3 text-sm font-semibold text-white hover:bg-white/5 transition text-center"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </div>

          {/* Info Section */}
          <div className="space-y-6">
            {/* Wire Transfer Info */}
            <div className="rounded-2xl border border-white/5 bg-white/5 p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">Wire Transfer Info</h3>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex gap-3">
                  <span className="text-cyan-400">⏱</span>
                  <span>Typically processed within 1-2 business days</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-cyan-400">💰</span>
                  <span>May require admin approval for amounts over $5,000</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-cyan-400">🔒</span>
                  <span>All transfers are encrypted and secure</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-cyan-400">📋</span>
                  <span>Keep your confirmation number for reference</span>
                </li>
              </ul>
            </div>

            {/* Account Balance */}
            <div className="rounded-2xl border border-white/5 bg-white/5 p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">Your Accounts</h3>
              <div className="space-y-3">
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <p className="text-xs text-slate-400">Checking</p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    ${currentUser?.checking?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                  </p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <p className="text-xs text-slate-400">Savings</p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    ${currentUser?.savings?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                  </p>
                </div>
              </div>
            </div>

            {/* Requirements */}
            <div className="rounded-2xl border border-white/5 bg-white/5 p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">Requirements</h3>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-1">✓</span>
                  <span>Valid recipient name</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-1">✓</span>
                  <span>Bank name and routing number</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-1">✓</span>
                  <span>Recipient account number</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-1">✓</span>
                  <span>Valid transfer amount</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-1">✓</span>
                  <span>Sufficient funds in selected account</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Receipt Modal */}
      {showReceiptModal && receipt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 border-b border-white/10 bg-slate-900 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-white">Wire Transfer Confirmation</h2>
              <button
                onClick={handleReceiptClose}
                className="text-slate-400 hover:text-white transition text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Status */}
              <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-300">Status</p>
                    <p className="text-2xl font-semibold text-yellow-400 mt-1">Pending Approval</p>
                  </div>
                  <span className="text-4xl">⏱</span>
                </div>
              </div>

              {/* Transfer Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Transfer Details</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <p className="text-xs text-slate-400">From</p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {currentUser?.name}
                    </p>
                    <p className="text-sm text-slate-400 mt-1">
                      {receipt.fromAccount === 'checking' ? 'Checking' : 'Savings'} Account
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <p className="text-xs text-slate-400">To</p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {receipt.recipientName}
                    </p>
                    <p className="text-sm text-slate-400 mt-1">
                      {receipt.recipientBankName}
                    </p>
                  </div>
                </div>
              </div>

              {/* Amount */}
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-400">Amount</p>
                <p className="mt-2 text-4xl font-semibold text-green-400">
                  ${parseFloat(receipt.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* Confirmation Details */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">Confirmation Details</h3>
                <div className="grid gap-3">
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="text-xs text-slate-400">Confirmation Number</p>
                    <p className="text-sm font-mono text-white mt-1">
                      {receipt.reference || `WIR-${Date.now().toString().slice(-10)}`}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="text-xs text-slate-400">Date & Time</p>
                    <p className="text-sm text-white mt-1">
                      {receipt.date} at {receipt.time}
                    </p>
                  </div>
                </div>
              </div>

              {/* Next Steps */}
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4">
                <p className="text-sm font-semibold text-cyan-400 mb-2">Next Steps</p>
                <ul className="text-sm text-slate-300 space-y-1">
                  <li>• Your wire transfer has been submitted for approval</li>
                  <li>• You'll receive an email confirmation shortly</li>
                  <li>• Processing typically takes 1-2 business days</li>
                  <li>• Save your confirmation number for reference</li>
                </ul>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handlePrint}
                  className="flex-1 rounded-lg border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/5 transition"
                >
                  🖨️ Print
                </button>
                <button
                  onClick={handleReceiptClose}
                  className="flex-1 rounded-lg bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-cyan-300 transition"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WireTransferPage;
