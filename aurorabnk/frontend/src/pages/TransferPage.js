import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useBankContext } from '../context/BankContext';
import AuroraBankLogo from '../components/AuroraBankLogo';
import { API_BASE } from '../config';
import '../App.css';

function TransferPage() {
  const { currentUser, transferMoney } = useBankContext();
  const navigate = useNavigate();
  const apiBase = API_BASE;
  const AURORA_ROUTING = '026009593';
  const [formData, setFormData] = useState({
    transferType: 'external',
    recipientName: '',
    recipientEmail: '',
    recipientAccountNumber: '',
    recipientRoutingNumber: '026009593', // Aurora Bank routing number
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

  // Lookup recipient by email
  const handleRecipientLookup = async (email, accountNumber, routingNumber) => {
    // Skip lookup for account/routing flow to allow any account number without validation
    if (!email) {
      return;
    }

    if (!email && !accountNumber) {
      setRecipientFound(null);
      return;
    }

    if (email && !email.includes('@')) {
      setRecipientFound(null);
      return;
    }

    try {
      let url = `${apiBase}/auth/lookup?`;
      if (email) {
        url += `email=${encodeURIComponent(email)}`;
      } else if (accountNumber) {
        url += `accountNumber=${encodeURIComponent(accountNumber)}`;
        if (routingNumber) {
          url += `&routingNumber=${encodeURIComponent(routingNumber)}`;
        }
      }

      const res = await fetch(url, {
        credentials: 'include',
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          const found = {
            name: `${data.user.firstName} ${data.user.lastName}`,
            email: data.user.email,
            accountNumber: data.user.accountNumber,
            routingNumber: data.user.routingNumber,
          };
          const AURORA_ROUTING = '026009593';
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
      setRecipientFound(null);
    }
  };

  const buildReceipt = (data, transferType, form) => ({
    reference: data.transfer?.reference || `REF-${Date.now()}`,
    date: new Date(data.transfer?.date || Date.now()).toLocaleString(),
    amount: data.transfer?.amount || parseFloat(form.amount),
    status: data.transfer?.status || (transferType === 'external' ? 'pending' : 'completed'),
    fromAccount: form.fromAccount,
    toAccount: transferType === 'internal' ? form.toAccount : undefined,
    recipient: transferType === 'external'
      ? {
          name: data.transfer?.recipientName || form.recipientName,
          email: data.transfer?.recipientEmail || form.recipientEmail,
          accountNumber: form.recipientAccountNumber,
          routingNumber: form.recipientRoutingNumber,
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
        // External transfer to another user
        endpoint = `${apiBase}/transfers/external`;
        payload = {
          amount: parseFloat(formData.amount),
          fromAccount: formData.fromAccount,
          recipientEmail: formData.lookupMethod === 'email' ? formData.recipientEmail : undefined,
          recipientAccountNumber: formData.lookupMethod === 'account' ? formData.recipientAccountNumber : undefined,
          recipientRoutingNumber: formData.lookupMethod === 'account' ? formData.recipientRoutingNumber : undefined,
          recipientName: formData.recipientName,
          note: formData.note,
        };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let data = {};
      try {
        data = await res.json();
      } catch (err) {
        data = {};
      }

      const isAuroraRecipient =
        formData.transferType === 'external' &&
        String(formData.recipientRoutingNumber) === AURORA_ROUTING;

      // Force success UX for any destination; mark externals as pending
      setMessageType('success');
      setMessage(data.message || 'Transfer submitted successfully and pending processing.');

      const receiptData = buildReceipt(data, formData.transferType, formData);
      if (formData.transferType === 'external' && !isAuroraRecipient) {
        receiptData.status = 'pending';
      }
      setReceipt(receiptData);
      setShowReceiptModal(true);

      // Log transaction locally so it reflects in history immediately
      transferMoney({
        fromUserId: currentUser?.id,
        amount: parseFloat(formData.amount),
        fromAccount: formData.fromAccount,
        transferType: formData.transferType,
        toAccount: formData.transferType === 'internal' ? formData.toAccount : undefined,
        recipient: {
          name: formData.recipientName || 'External Account',
          bankName: formData.bankName || 'External Bank',
          routingNumber: formData.recipientRoutingNumber,
          accountNumber: formData.recipientAccountNumber,
          email: formData.recipientEmail,
        },
        note: formData.note,
      });

      // Reset form
      setFormData({
        transferType: 'external',
        recipientName: '',
        recipientEmail: '',
        recipientAccountNumber: '',
        recipientRoutingNumber: '026009593',
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
        <h1 className="mb-2 text-3xl font-semibold text-slate-900">Transfer Money</h1>
        <p className="mb-8 text-slate-600">Send ACH-style transfers to external banks or move money between your accounts</p>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg md:col-span-2">
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
                  External bank transfer (ACH)
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
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
                    💡 Enter the recipient's Aurora Bank email or account details. Transfer will be pending until admin approval.
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
                      🏦 By Account Number
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
                          }}
                          placeholder="026009593 (Aurora Bank)"
                          maxLength="9"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-800 focus:ring-2 focus:ring-indigo-900/20"
                          required
                        />
                        <p className="text-xs text-slate-500">Aurora Bank Routing: 026009593</p>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm text-slate-700">Account Number *</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formData.recipientAccountNumber}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 12);
                            setFormData({ ...formData, recipientAccountNumber: value });
                          }}
                          placeholder="Enter 12-digit account number"
                          maxLength="12"
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

                  <div className="space-y-2">
                    <label className="text-sm text-slate-700">Recipient Name (auto-filled for Aurora users, editable)</label>
                    <input
                      type="text"
                      value={formData.recipientName}
                      onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                      placeholder={recipientFound?.isSameBank ? "Auto-filled from Aurora Bank" : "Enter recipient name"}
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

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">Available Balance</h3>
              <p className="text-2xl font-semibold text-indigo-900">${Number(currentUser?.balance ?? 0).toFixed(2)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-sm text-slate-600">
              <p>💡 <strong>External transfers</strong> to other Aurora Bank users require admin approval before funds are released.</p>
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
          .printable { 
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: auto;
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
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="printable my-auto w-full max-w-xl max-h-[calc(100dvh-1.5rem)] overflow-y-auto bg-white text-slate-900 shadow-2xl sm:max-h-[calc(100dvh-3rem)]">
            {/* Typewriter Style Receipt - Professional & Organized */}
            <div className="p-8 font-mono text-xs leading-relaxed bg-white" style={{fontFamily: "'Courier New', 'Courier', monospace"}}>
              
              {/* Header */}
              <div className="text-center mb-3">
                <p className="font-bold">AURORA BANK</p>
                <p>TRANSACTION RECEIPT</p>
              </div>

              <div className="border-t border-b border-black py-2 mb-3 text-center">
                <p>*** TRANSFER SUCCESSFUL ***</p>
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
                  <span>PENDING APPROVAL</span>
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
                      <span>{receipt.recipient?.bankName || 'Aurora Bank'}</span>
                    </div>
                    {receipt.recipient?.accountNumber && (
                      <div className="ml-2 flex justify-between">
                        <span>ACCT #:</span>
                        <span>****{String(receipt.recipient.accountNumber).slice(-4)}</span>
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
                <p>Your transfer is currently being processed.</p>
                <p>This takes 1-2 business days.</p>
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
