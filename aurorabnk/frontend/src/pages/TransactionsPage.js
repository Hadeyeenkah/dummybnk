import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBankContext } from '../context/BankContext';
import AuroraBankLogo from '../components/AuroraBankLogo';
import { API_BASE } from '../config';

const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0));
const date = (value) => { const valueDate = new Date(value); return Number.isNaN(valueDate.getTime()) ? '—' : valueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); };
const csvValue = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

function TransactionsPage() {
  const { currentUser, updateTransactions } = useBankContext();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [account, setAccount] = useState('all');
  const [range, setRange] = useState('30');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!currentUser?.id) return;
    let active = true;
    const load = async () => {
      setLoading(true); setError('');
      try {
        const response = await fetch(`${API_BASE}/transactions?limit=100`, { credentials: 'include' });
        if (!response.ok) throw new Error('Unable to load account activity');
        const payload = await response.json();
        const transactions = (payload.transactions || []).map((item) => ({ id: item._id || item.id, date: item.date, description: item.description, amount: Number(item.amount || 0), category: item.category || 'Other', accountType: item.accountType || 'checking', status: item.status || 'completed', note: item.note || '', reference: item.reference || '' }));
        if (active) updateTransactions(transactions, transactions.filter((item) => item.status === 'pending'));
      } catch (_) { if (active) setError('We could not refresh your activity. Showing transactions already available on this device.'); }
      finally { if (active) setLoading(false); }
    };
    load();
    return () => { active = false; };
  }, [currentUser?.id]);

  const transactions = useMemo(() => {
    const unique = new Map();
    [...(currentUser?.transactions || []), ...(currentUser?.pendingTransactions || [])].forEach((item, index) => {
      const id = item.id || item._id || `transaction-${index}`;
      const existing = unique.get(id);
      unique.set(id, { ...(existing || {}), ...item, id, status: item.status || existing?.status || 'completed' });
    });
    return [...unique.values()].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [currentUser?.transactions, currentUser?.pendingTransactions]);

  const categories = useMemo(() => [...new Set(transactions.map((item) => item.category).filter(Boolean))].sort(), [transactions]);
  const results = useMemo(() => {
    const query = search.trim().toLowerCase();
    const cutoff = range === 'all' ? null : new Date(Date.now() - Number(range) * 86400000);
    return transactions.filter((item) => {
      const text = `${item.description || ''} ${item.category || ''} ${item.note || ''} ${item.reference || ''}`.toLowerCase();
      return (!cutoff || new Date(item.date) >= cutoff) && (category === 'all' || item.category?.toLowerCase() === category.toLowerCase()) && (account === 'all' || item.accountType?.toLowerCase() === account) && (!query || text.includes(query));
    });
  }, [transactions, search, category, account, range]);
  const totals = useMemo(() => results.reduce((value, item) => { if (Number(item.amount) >= 0) value.credit += Number(item.amount); else value.debit += Math.abs(Number(item.amount)); return value; }, { credit: 0, debit: 0 }), [results]);
  const status = (value) => { const current = String(value || 'completed').toLowerCase(); return current === 'pending' ? ['Pending', 'text-amber-700 bg-amber-50'] : current === 'rejected' || current === 'failed' ? ['Declined', 'text-rose-700 bg-rose-50'] : ['Posted', 'text-emerald-700 bg-emerald-50']; };
  const reset = () => { setSearch(''); setCategory('all'); setAccount('all'); setRange('30'); };
  const exportCsv = () => {
    const rows = results.map((item) => [date(item.date), item.description || 'Transaction', item.category || 'Other', item.accountType || 'checking', item.status || 'completed', Number(item.amount || 0).toFixed(2), item.reference || '']);
    const content = [['Date', 'Description', 'Category', 'Account', 'Status', 'Amount', 'Reference'], ...rows].map((row) => row.map(csvValue).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `aurora-account-activity-${new Date().toISOString().slice(0, 10)}.csv`; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  };

  const rows = results.map((item) => {
    const credit = Number(item.amount) >= 0; const [label, color] = status(item.status);
    return <tr key={item.id} className="hover:bg-[#f8fbff]"><td className="px-6 py-4 text-sm text-slate-600">{date(item.date)}</td><td className="px-4 py-4"><p className="truncate text-sm font-semibold text-[#102a43]">{item.description || 'Transaction'}</p><p className="mt-0.5 truncate text-xs text-slate-500">{item.category || 'Other'}{item.note ? ` · ${item.note}` : ''}</p></td><td className="px-4 py-4 text-sm capitalize text-slate-600">{item.accountType || 'checking'}</td><td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>{label}</span></td><td className={`px-6 py-4 text-right text-sm font-bold tabular-nums ${credit ? 'text-emerald-700' : 'text-rose-700'}`}>{credit ? '+' : '−'}{money(Math.abs(Number(item.amount) || 0))}</td></tr>;
  });

  return <div className="min-h-screen bg-[#f5f7fa] text-slate-900">
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-xl"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6"><div className="flex items-center gap-3"><AuroraBankLogo /><span className="text-lg font-bold tracking-tight text-[#102a43]">Aurora Bank</span></div><Link to="/dashboard" className="rounded-md px-3 py-2 text-sm font-semibold text-[#0b4f8a] hover:bg-[#e9f1fb]">← Accounts</Link></div></header>
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#436b96]">Account activity</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-[#102a43]">Transactions</h1><p className="mt-2 text-sm text-slate-600">View, search, and download your account activity.</p></div><button onClick={exportCsv} disabled={!results.length} className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#0b4f8a] shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Download CSV</button></div>
      <section className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="grid divide-y divide-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0"><div className="p-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Credits</p><p className="mt-1 text-2xl font-bold text-emerald-700">{money(totals.credit)}</p></div><div className="p-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Debits</p><p className="mt-1 text-2xl font-bold text-rose-700">−{money(totals.debit)}</p></div><div className="p-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Net activity</p><p className={`mt-1 text-2xl font-bold ${totals.credit - totals.debit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{money(totals.credit - totals.debit)}</p></div></div></section>
      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]"><input aria-label="Search transactions" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search description or reference" className="rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#0b5a9d] focus:ring-2 focus:ring-[#0b5a9d]/15" /><select aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="all">All categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select><select aria-label="Filter by account" value={account} onChange={(event) => setAccount(event.target.value)} className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="all">All accounts</option><option value="checking">Checking</option><option value="savings">Savings</option></select><select aria-label="Filter by date" value={range} onChange={(event) => setRange(event.target.value)} className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="180">Last 6 months</option><option value="365">Last 12 months</option><option value="all">All activity</option></select></div><div className="mt-3 flex items-center justify-between"><p className="text-xs text-slate-500">{results.length} transaction{results.length === 1 ? '' : 's'} shown</p><button onClick={reset} className="text-xs font-semibold text-[#0b4f8a] hover:underline">Clear filters</button></div></section>
      {error && <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</div>}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="hidden overflow-x-auto md:block"><table className="w-full table-fixed border-collapse"><thead className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500"><tr><th className="w-36 px-6 py-3">Date</th><th className="px-4 py-3">Description</th><th className="w-28 px-4 py-3">Account</th><th className="w-28 px-4 py-3">Status</th><th className="w-36 px-6 py-3 text-right">Amount</th></tr></thead><tbody className="divide-y divide-slate-100">{rows}</tbody></table></div>
      <div className="divide-y divide-slate-100 md:hidden">{results.map((item) => { const credit = Number(item.amount) >= 0; const [label, color] = status(item.status); return <div key={item.id} className="px-4 py-4"><div className="flex justify-between gap-4"><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#102a43]">{item.description || 'Transaction'}</p><p className="mt-1 text-xs text-slate-500">{date(item.date)} · {item.accountType || 'checking'}</p></div><p className={`shrink-0 text-sm font-bold tabular-nums ${credit ? 'text-emerald-700' : 'text-rose-700'}`}>{credit ? '+' : '−'}{money(Math.abs(Number(item.amount) || 0))}</p></div><div className="mt-2 flex gap-2"><span className="text-xs text-slate-500">{item.category || 'Other'}</span><span className={`text-xs font-semibold ${color}`}>{label}</span></div></div>; })}</div>
      {!loading && !results.length && <div className="px-6 py-14 text-center"><p className="font-semibold text-[#102a43]">No transactions found</p><p className="mt-1 text-sm text-slate-500">Try changing your filters or check back after activity posts.</p></div>}{loading && <div className="px-6 py-14 text-center text-sm text-slate-500">Loading account activity…</div>}{results.length > 0 && <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 text-xs text-slate-500">Pending transactions are not final and may change before posting.</div>}</section>
    </main>
  </div>;
}

export default TransactionsPage;
