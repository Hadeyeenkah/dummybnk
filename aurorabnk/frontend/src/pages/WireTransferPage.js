import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useBankContext } from '../context/BankContext';
import AuroraBankLogo from '../components/AuroraBankLogo';
import {
  ArrowLeft,
  Banknote,
  Check,
  ClipboardList,
  Clock,
  Lock,
  PiggyBank,
  Printer,
  Wallet,
  X,
} from 'lucide-react';
import '../App.css';

// How long the "processing" screen stays up before the receipt opens.
const PROCESSING_MS = 2500;

const PURPOSES = [
  { value: 'payment', label: 'Payment' },
  { value: 'personal', label: 'Personal transfer' },
  { value: 'business', label: 'Business payment' },
  { value: 'investment', label: 'Investment' },
  { value: 'other', label: 'Other' },
];

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
  'w-full min-w-0 rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#0b5cab] focus:ring-2 focus:ring-[#0b5cab]/20 sm:text-sm';

const money = (value) =>
  `$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const amount = parseFloat(formData.amount);
      const result = await transferMoney({
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
        // Keep the processing screen up briefly before the receipt appears.
        await new Promise((resolve) => setTimeout(resolve, PROCESSING_MS));
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

  const checkingBalance = currentUser?.checking || 0;
  const savingsBalance = currentUser?.savings || 0;
  const amountNumber = parseFloat(formData.amount);

  const AccountPick = ({ id, balance }) => {
    const selected = formData.fromAccount === id;
    const Icon = id === 'savings' ? PiggyBank : Wallet;
    return (
      <button
        type="button"
        aria-pressed={selected}
        onClick={() => setFormData((prev) => ({ ...prev, fromAccount: id }))}
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

  const ReceiptRow = ({ label, children, bold }) => (
    <div className={`flex justify-between gap-3 ${bold ? 'font-bold' : ''}`}>
      <span className="shrink-0">{label}</span>
      <span className="min-w-0 break-words text-right">{children}</span>
    </div>
  );

  const infoItems = [
    { icon: Clock, text: 'Typically processed within 1-2 business days' },
    { icon: Banknote, text: 'May require admin approval for amounts over $5,000' },
    { icon: Lock, text: 'All transfers are encrypted and secure' },
    { icon: ClipboardList, text: 'Keep your confirmation number for reference' },
  ];

  const requirements = [
    'Valid recipient name',
    'Bank name and routing number',
    'Recipient account number',
    'Valid transfer amount',
    'Sufficient funds in selected account',
  ];

  return (
    <div className="bank-dashboard text-slate-900">
      <header className="dashboard-header sticky top-0 z-30 border-b border-slate-200 no-print">
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

      <main className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-6 sm:py-8 no-print">
        <h1 className="text-xl font-extrabold tracking-tight text-[#0a2540] sm:text-2xl lg:text-3xl">Wire transfer</h1>
        <p className="mb-5 mt-0.5 text-sm text-slate-600">Send domestic and international wire transfers securely and quickly.</p>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-6">
          {/* ------------------------------ Form ------------------------------ */}
          <form onSubmit={handleSubmit} className="min-w-0 space-y-4">
            {message && (
              <div
                role="alert"
                className={`rounded-xl border p-4 text-sm font-medium ${
                  messageType === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-rose-200 bg-rose-50 text-rose-700'
                }`}
              >
                {message}
              </div>
            )}

            {/* From account */}
            <section className={`${cardCls} p-4 sm:p-5`}>
              <h2 className="mb-3 text-base font-bold text-[#0a2540]">From account</h2>
              <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2">
                <AccountPick id="checking" balance={checkingBalance} />
                <AccountPick id="savings" balance={savingsBalance} />
              </div>
            </section>

            {/* Recipient */}
            <section className={`${cardCls} space-y-4 p-4 sm:p-5`}>
              <h2 className="text-base font-bold text-[#0a2540]">Recipient information</h2>

              <div>
                <label htmlFor="recipientName" className={labelCls}>Recipient full name *</label>
                <input
                  id="recipientName"
                  type="text"
                  name="recipientName"
                  value={formData.recipientName}
                  onChange={handleChange}
                  placeholder="e.g., John Smith"
                  autoComplete="off"
                  className={inputCls}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="recipientBankName" className={labelCls}>Recipient bank name *</label>
                  <input
                    id="recipientBankName"
                    type="text"
                    name="recipientBankName"
                    value={formData.recipientBankName}
                    onChange={handleChange}
                    placeholder="e.g., First National Bank"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor="recipientBankAddress" className={labelCls}>Bank address</label>
                  <input
                    id="recipientBankAddress"
                    type="text"
                    name="recipientBankAddress"
                    value={formData.recipientBankAddress}
                    onChange={handleChange}
                    placeholder="e.g., 123 Main St, New York, NY 10001"
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="recipientRoutingNumber" className={labelCls}>Routing number *</label>
                  <input
                    id="recipientRoutingNumber"
                    type="text"
                    inputMode="numeric"
                    name="recipientRoutingNumber"
                    value={formData.recipientRoutingNumber}
                    onChange={handleChange}
                    placeholder="e.g., 021000021"
                    maxLength="9"
                    className={`${inputCls} font-mono`}
                  />
                  <p className="mt-1 text-xs text-slate-500">9-digit ABA routing number</p>
                </div>
                <div>
                  <label htmlFor="recipientAccountNumber" className={labelCls}>Account number *</label>
                  <input
                    id="recipientAccountNumber"
                    type="text"
                    inputMode="numeric"
                    name="recipientAccountNumber"
                    value={formData.recipientAccountNumber}
                    onChange={handleChange}
                    placeholder="e.g., 123456789"
                    className={`${inputCls} font-mono`}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="recipientSwiftCode" className={labelCls}>SWIFT code (international)</label>
                <input
                  id="recipientSwiftCode"
                  type="text"
                  name="recipientSwiftCode"
                  value={formData.recipientSwiftCode}
                  onChange={handleChange}
                  placeholder="e.g., CHASUS33"
                  maxLength="11"
                  autoCapitalize="characters"
                  className={`${inputCls} font-mono`}
                />
              </div>
            </section>

            {/* Amount */}
            <section className={`${cardCls} p-4 sm:p-5`}>
              <label htmlFor="amount" className="mb-2 block text-base font-bold text-[#0a2540]">Amount *</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">$</span>
                <input
                  id="amount"
                  type="number"
                  inputMode="decimal"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full min-w-0 rounded-xl border border-slate-300 bg-white py-3.5 pl-10 pr-4 text-2xl font-extrabold tabular-nums text-[#0a2540] placeholder-slate-300 outline-none transition focus:border-[#0b5cab] focus:ring-2 focus:ring-[#0b5cab]/20"
                />
              </div>
              {formData.amount && amountNumber > 0 && (
                <p className="mt-2 text-sm text-slate-600">You are sending {money(amountNumber)}</p>
              )}
            </section>

            {/* Purpose + note */}
            <section className={`${cardCls} space-y-4 p-4 sm:p-5`}>
              <div>
                <span className="mb-2 block text-base font-bold text-[#0a2540]">
                  Purpose of wire <span className="text-sm font-medium text-slate-400">(optional)</span>
                </span>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Purpose of wire">
                  {PURPOSES.map((p) => {
                    const selected = formData.purpose === p.value;
                    return (
                      <button
                        key={p.value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setFormData((prev) => ({ ...prev, purpose: selected ? '' : p.value }))}
                        className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
                          selected ? 'border-[#0b5cab] bg-[#eef5fc] text-[#0a4a8f]' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {selected && <Check size={14} aria-hidden="true" />}
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label htmlFor="note" className="mb-2 block text-base font-bold text-[#0a2540]">
                  Notes / reference <span className="text-sm font-medium text-slate-400">(optional)</span>
                </label>
                <textarea
                  id="note"
                  name="note"
                  value={formData.note}
                  onChange={handleChange}
                  placeholder="Add any additional details about this transfer..."
                  rows="3"
                  className={`${inputCls} resize-none`}
                />
              </div>
            </section>

            {/* Actions */}
            <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-[1fr_auto]">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-[#c8102e] py-3.5 text-base font-bold text-white transition hover:bg-[#a90d26] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? 'Processing...' : 'Send wire transfer'}
              </button>
              <Link
                to="/dashboard"
                className="rounded-xl border border-slate-300 bg-white px-8 py-3.5 text-center text-base font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </Link>
            </div>
          </form>

          {/* ----------------------------- Sidebar ----------------------------- */}
          <aside className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
            <section className="hero-card rounded-3xl p-4 text-white sm:p-5">
              <p className="text-sm font-medium text-blue-100">Your accounts</p>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <div className="min-w-0 rounded-2xl bg-white/10 p-3">
                  <p className="text-xs font-medium text-blue-100">Checking</p>
                  <div className="mt-1"><Fit text={money(checkingBalance)} min={12} max={22} className="font-bold" /></div>
                </div>
                <div className="min-w-0 rounded-2xl bg-white/10 p-3">
                  <p className="text-xs font-medium text-blue-100">Savings</p>
                  <div className="mt-1"><Fit text={money(savingsBalance)} min={12} max={22} className="font-bold" /></div>
                </div>
              </div>
            </section>

            <section className={`${cardCls} p-4 sm:p-5`}>
              <h2 className={`${sectionTitleCls} mb-3`}>Wire transfer info</h2>
              <ul className="space-y-3 text-sm text-slate-600">
                {infoItems.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e8f0fa] text-[#0b5cab]">
                      <Icon size={16} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 pt-1">{text}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className={`${cardCls} p-4 sm:p-5`}>
              <h2 className={`${sectionTitleCls} mb-3`}>Requirements</h2>
              <ul className="space-y-2 text-sm text-slate-600">
                {requirements.map((r) => (
                  <li key={r} className="flex items-start gap-2">
                    <Check size={16} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />
                    <span className="min-w-0">{r}</span>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      </main>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .printable, .printable * { visibility: visible; }
          .printable { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          @page { size: A4; margin: 15mm; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
        }
      `}</style>

      {/* Processing screen (shown while the wire is submitted, before the receipt) */}
      {submitting && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0a2540]/70 p-4 backdrop-blur-sm no-print" role="alertdialog" aria-modal="true" aria-live="assertive" aria-labelledby="wire-processing-title">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl sm:p-8">
            <div className="mx-auto mb-5 h-14 w-14 animate-spin rounded-full border-4 border-[#e8f0fa] border-t-[#0b5cab]" aria-hidden="true" />
            <h2 id="wire-processing-title" className="text-lg font-extrabold text-[#0a2540]">Processing your wire transfer</h2>
            <p className="mt-1.5 text-sm text-slate-600">Securely submitting your details. Please don't close or refresh this page.</p>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
              <div className="wire-progress h-full rounded-full bg-[#0b5cab]" />
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes wire-progress { from { width: 8%; } to { width: 96%; } }
        .wire-progress { width: 8%; animation: wire-progress ${PROCESSING_MS}ms ease-out forwards; }
      `}</style>

      {/* Receipt Modal */}
      {showReceiptModal && receipt && (
        <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/60 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="wire-receipt-title">
          <div className="w-full max-w-2xl max-h-[92dvh] overflow-y-auto rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:rounded-3xl">
            {/* Modal Header */}
            <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
              <h2 id="wire-receipt-title" className="min-w-0 truncate text-lg font-extrabold text-[#0a2540] sm:text-2xl">Wire transfer receipt</h2>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 rounded-full border border-[#0b5cab] px-3.5 py-2 text-sm font-bold text-[#0b5cab] transition hover:bg-[#eef5fc]"
                >
                  <Printer size={16} aria-hidden="true" /> Print
                </button>
                <button
                  type="button"
                  onClick={handleReceiptClose}
                  aria-label="Close receipt"
                  className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  <X size={22} aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Receipt Content */}
            <div className="printable bg-white p-5 font-mono text-xs leading-relaxed sm:p-8" style={{ fontFamily: "'Courier New', 'Courier', monospace" }}>

              {/* Header */}
              <div className="mb-3 text-center">
                <p className="font-bold">AURORA BANK</p>
                <p>WIRE TRANSFER RECEIPT</p>
              </div>

              <div className="mb-3 border-b border-t border-black py-2 text-center">
                <p>*** WIRE TRANSFER SUBMITTED ***</p>
              </div>

              {/* Transaction Info */}
              <div className="mb-3 space-y-0.5">
                <ReceiptRow label="DATE:">{receipt.date}</ReceiptRow>
                <ReceiptRow label="REFERENCE:"><span className="break-all">{receipt.reference || `WIR-${Date.now().toString().slice(-10)}`}</span></ReceiptRow>
                <ReceiptRow label="STATUS:">PENDING APPROVAL</ReceiptRow>
              </div>

              <div className="my-3 border-t border-black"></div>

              {/* Amount */}
              <div className="mb-3">
                <ReceiptRow label="AMOUNT:" bold>
                  ${parseFloat(receipt.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </ReceiptRow>
              </div>

              <div className="my-3 border-t border-black"></div>

              {/* From Account */}
              <div className="mb-3 space-y-0.5">
                <p className="font-bold">FROM:</p>
                <p className="ml-2 break-words">{currentUser?.name}</p>
                <div className="ml-2 space-y-0.5">
                  <ReceiptRow label="ACCOUNT:">{receipt.fromAccount === 'checking' ? 'CHECKING' : 'SAVINGS'}</ReceiptRow>
                  {currentUser?.accountNumber && (
                    <ReceiptRow label="ACCT #:">****{String(currentUser.accountNumber).slice(-4)}</ReceiptRow>
                  )}
                </div>
              </div>

              <div className="my-3 border-t border-black"></div>

              {/* To Account */}
              <div className="mb-3 space-y-0.5">
                <p className="font-bold">TO:</p>
                <p className="ml-2 break-words">{receipt.recipientName}</p>
                <div className="ml-2 space-y-0.5">
                  <ReceiptRow label="BANK:">{receipt.recipientBankName}</ReceiptRow>
                  {receipt.recipientAccountNumber && (
                    <ReceiptRow label="ACCT #:">****{String(receipt.recipientAccountNumber).slice(-4)}</ReceiptRow>
                  )}
                  {receipt.recipientRoutingNumber && (
                    <ReceiptRow label="ROUTING:">{receipt.recipientRoutingNumber}</ReceiptRow>
                  )}
                </div>
              </div>

              {/* Purpose */}
              {formData.purpose && (
                <>
                  <div className="my-3 border-t border-black"></div>
                  <div className="mb-3">
                    <div className="flex">
                      <span className="font-bold">PURPOSE:</span>
                      <span className="ml-2 break-words">{formData.purpose}</span>
                    </div>
                  </div>
                </>
              )}

              {/* Note */}
              {formData.note && (
                <>
                  <div className="my-3 border-t border-black"></div>
                  <div className="mb-3">
                    <div className="flex">
                      <span className="font-bold">NOTE:</span>
                      <span className="ml-2 break-words">{formData.note}</span>
                    </div>
                  </div>
                </>
              )}

              <div className="my-3 border-t border-black"></div>

              {/* Notice */}
              <div className="mb-3 text-xs">
                <p className="mb-1 text-center">IMPORTANT NOTICE</p>
                <p>Your wire transfer is currently being</p>
                <p>processed. This takes 1-2 business days.</p>
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
            </div>

            <div className="no-print border-t border-slate-200 bg-slate-50 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 sm:px-8">
              <button
                type="button"
                onClick={handleReceiptClose}
                className="w-full rounded-xl bg-[#0b5cab] py-3 text-sm font-bold text-white transition hover:bg-[#0a4a8f]"
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

export default WireTransferPage;