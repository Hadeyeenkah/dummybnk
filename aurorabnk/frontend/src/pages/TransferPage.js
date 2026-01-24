import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useBankContext } from '../context/BankContext';
import AuroraBankLogo from '../components/AuroraBankLogo';
import '../App.css';

function TransferPage() {
  const { currentUser, transferMoney } = useBankContext();
  const navigate = useNavigate();
  const apiBase = process.env.REACT_APP_API_BASE || '/api';
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
        <h1 className="mb-2 text-3xl font-semibold text-white">Transfer Money</h1>
        <p className="mb-8 text-slate-300">Send ACH-style transfers to external banks or move money between your accounts</p>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-white/5 bg-white/5 p-6 md:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 cursor-pointer">
                  <input
                    type="radio"
                    name="transferType"
                    value="external"
                    checked={formData.transferType === 'external'}
                    onChange={() => setFormData({ ...formData, transferType: 'external' })}
                    className="accent-cyan-400"
                  />
                  External bank transfer (ACH)
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 cursor-pointer">
                  <input
                    type="radio"
                    name="transferType"
                    value="internal"
                    checked={formData.transferType === 'internal'}
                    onChange={() => setFormData({ ...formData, transferType: 'internal' })}
                    className="accent-cyan-400"
                  />
                  Between my accounts
                </label>
              </div>

              {formData.transferType === 'external' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-200">
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
                          ? 'bg-cyan-400 text-slate-900'
                          : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
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
                          ? 'bg-cyan-400 text-slate-900'
                          : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      🏦 By Account Number
                    </button>
                  </div>
                  
                  {formData.lookupMethod === 'email' ? (
                    <div className="space-y-2">
                      <label className="text-sm text-slate-200">Recipient Email *</label>
                      <input
                        type="email"
                        value={formData.recipientEmail}
                        onChange={(e) => {
                          setFormData({ ...formData, recipientEmail: e.target.value });
                          handleRecipientLookup(e.target.value, null, null);
                        }}
                        onBlur={(e) => handleRecipientLookup(e.target.value, null, null)}
                        placeholder="recipient@email.com"
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-400 outline-none focus:border-cyan-300/50"
                        required
                      />
                      {recipientFound && (
                        <div className="flex items-center gap-2 text-sm text-green-400">
                          <span>✓</span>
                          <span>Recipient found: {recipientFound.name}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm text-slate-200">Routing Number *</label>
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
                          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-400 outline-none focus:border-cyan-300/50"
                          required
                        />
                        <p className="text-xs text-slate-400">Aurora Bank Routing: 026009593</p>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm text-slate-200">Account Number *</label>
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
                          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-400 outline-none focus:border-cyan-300/50"
                          required
                        />
                      </div>
                      
                      {recipientFound && (
                        <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-400">
                          <div className="flex items-center gap-2 mb-1">
                            <span>✓</span>
                            <span className="font-semibold">Account Verified</span>
                          </div>
                          <div className="text-xs text-green-300">
                            Recipient: {recipientFound.name} ({recipientFound.email})
                          </div>
                        </div>
                      )}
                      {/* Removed explicit 'Account not found' warning per UX request */}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm text-slate-200">Recipient Name (auto-filled for Aurora users, editable)</label>
                    <input
                      type="text"
                      value={formData.recipientName}
                      onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                      placeholder={recipientFound?.isSameBank ? "Auto-filled from Aurora Bank" : "Enter recipient name"}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-400 outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm text-slate-200">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pl-8 text-white placeholder-slate-400 outline-none focus:border-cyan-300/50"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm text-slate-200">From Account</label>
                  <select
                    value={formData.fromAccount}
                    onChange={(e) => setFormData({ ...formData, fromAccount: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-300/50"
                  >
                    <option value="checking">Checking - ${Number(currentUser?.checking ?? 0).toFixed(2)}</option>
                    <option value="savings">Savings - ${Number(currentUser?.savings ?? 0).toFixed(2)}</option>
                  </select>
                </div>

                {formData.transferType === 'internal' && (
                  <div className="space-y-2">
                    <label className="text-sm text-slate-200">To Account</label>
                    <select
                      value={formData.toAccount}
                      onChange={(e) => setFormData({ ...formData, toAccount: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-300/50"
                    >
                      <option value="checking">Checking</option>
                      <option value="savings">Savings</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-200">Note (Optional)</label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="What's this for?"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-400 outline-none focus:border-cyan-300/50"
                  rows="3"
                />
              </div>

              {message && (
                <div
                  className={`rounded-xl p-4 ${messageType === 'success'
                    ? 'border border-green-500/20 bg-green-500/10 text-green-400'
                    : 'border border-red-500/20 bg-red-500/10 text-red-400'
                  }`}
                >
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || (formData.transferType === 'external' && formData.lookupMethod === 'email' && !formData.recipientEmail)}
                className="w-full rounded-xl bg-cyan-400 py-3 text-sm font-semibold text-slate-900 transition hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Send Money'}
              </button>
            </form>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/5 bg-white/5 p-6">
              <h3 className="mb-3 text-sm font-semibold text-white">Available Balance</h3>
              <p className="text-2xl font-semibold text-cyan-200">${Number(currentUser?.balance ?? 0).toFixed(2)}</p>
            </div>
            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 space-y-2 text-sm text-slate-300">
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
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Transaction</div>
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
                <span className="font-semibold capitalize text-green-600">{receipt.status || 'pending'}</span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.12em] text-slate-500 mb-1">From</div>
                <div className="font-semibold text-slate-900 capitalize">{receipt.fromAccount}</div>
                <div className="text-xs text-slate-500">{currentUser?.name}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.12em] text-slate-500 mb-1">To</div>
                {receipt.toAccount ? (
                  <>
                    <div className="font-semibold text-slate-900 capitalize">{receipt.toAccount}</div>
                    <div className="text-xs text-slate-500">Internal transfer</div>
                  </>
                ) : (
                  <>
                    <div className="font-semibold text-slate-900">{receipt.recipient?.recipientName || receipt.recipient?.name || 'External Account'}</div>
                    <div className="text-xs text-slate-500">{receipt.recipient?.bankName || 'Bank'}</div>
                    {receipt.recipient?.accountNumber && (
                      <div className="text-xs text-slate-500">Acct: ****{String(receipt.recipient.accountNumber).slice(-4)}</div>
                    )}
                    {receipt.recipient?.routingNumber && (
                      <div className="text-xs text-slate-500">Routing: {receipt.recipient.routingNumber}</div>
                    )}
                  </>
                )}
              </div>
              {receipt.note && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.12em] text-slate-500 mb-1">Note</div>
                  <div className="text-slate-800">{receipt.note}</div>
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

export default TransferPage;
