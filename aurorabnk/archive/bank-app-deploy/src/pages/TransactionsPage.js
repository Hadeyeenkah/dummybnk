import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useBankContext } from '../context/BankContext';
import AuroraBankLogo from '../components/AuroraBankLogo';
import '../App.css';

function TransactionsPage() {
  const { currentUser } = useBankContext();
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('30');
  const [searchQuery, setSearchQuery] = useState('');
  const [accountFilter, setAccountFilter] = useState('all');

  // Merge regular and pending transactions with unique keys
  const allTransactions = useMemo(() => {
    const regular = (currentUser?.transactions || []).map((t, idx) => ({
      ...t,
      uniqueKey: `tx-${t.id}-${idx}`,
      isPending: true,
      status: 'pending',
    }));
    
    const pending = (currentUser?.pendingTransactions || [])
      .filter(pt => !regular.some(r => r.id === pt.id))
      .map((t, idx) => ({
        ...t,
        uniqueKey: `pending-${t.id}-${idx}`,
        isPending: true,
        status: 'pending',
      }));
    
    return [...regular, ...pending].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [currentUser?.transactions, currentUser?.pendingTransactions]);

  // Apply filters
  const filteredTransactions = useMemo(() => {
    let filtered = [...allTransactions];

    // Date filter
    if (dateFilter !== 'all') {
      const daysAgo = parseInt(dateFilter);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
      filtered = filtered.filter(t => new Date(t.date) >= cutoffDate);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(t => 
        t.category?.toLowerCase() === categoryFilter.toLowerCase()
      );
    }

    // Account filter
    if (accountFilter !== 'all') {
      filtered = filtered.filter(t => 
        t.accountType?.toLowerCase() === accountFilter.toLowerCase()
      );
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.description?.toLowerCase().includes(query) ||
        t.category?.toLowerCase().includes(query) ||
        t.note?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [allTransactions, categoryFilter, dateFilter, searchQuery, accountFilter]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const income = filteredTransactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = Math.abs(
      filteredTransactions
        .filter(t => t.amount < 0)
        .reduce((sum, t) => sum + t.amount, 0)
    );
    
    const net = income - expenses;
    
    return { income, expenses, net };
  }, [filteredTransactions]);

  // Export to CSV
  const handleExport = () => {
    const headers = ['Date', 'Description', 'Category', 'Account', 'Amount', 'Status'];
    const rows = filteredTransactions.map(t => [
      t.date,
      t.description,
      t.category || 'Other',
      t.accountType || 'N/A',
      t.amount.toFixed(2),
      t.isPending ? 'Pending Admin Approval' : 'Completed',
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-white/5 bg-slate-900/50 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3 text-cyan-400">
            <AuroraBankLogo />
            <span className="text-base sm:text-lg font-semibold tracking-tight text-slate-50">Aurora Bank</span>
          </div>
          <Link to="/dashboard" className="text-xs sm:text-sm text-cyan-200 hover:text-white flex items-center gap-1">
            <span>←</span>
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-12">
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="mb-1 sm:mb-2 text-2xl sm:text-3xl font-semibold text-white">Transactions</h1>
            <p className="text-sm text-slate-300">
              {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
            </p>
            <p className="mt-1 text-xs text-yellow-300">
              All transactions are successful and pending admin approval.
            </p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2.5 text-sm font-semibold text-cyan-400 transition hover:bg-cyan-400/20"
          >
            <span>📊</span>
            <span>Export CSV</span>
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Description, category..."
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-400 outline-none focus:border-cyan-300/50 transition"
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-300/50 transition appearance-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              <option value="income">Income</option>
              <option value="shopping">Shopping</option>
              <option value="dining">Dining</option>
              <option value="bills">Bills</option>
              <option value="transfer">Transfer</option>
              <option value="deposit">Deposit</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">Account</label>
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-300/50 transition appearance-none cursor-pointer"
            >
              <option value="all">All Accounts</option>
              <option value="checking">Checking</option>
              <option value="savings">Savings</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">Date Range</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-300/50 transition appearance-none cursor-pointer"
            >
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="180">Last 6 Months</option>
              <option value="365">This Year</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
          <div className="rounded-xl border border-white/5 bg-white/5 p-4 sm:p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Total Income</p>
            <p className="mt-2 text-xl sm:text-2xl font-semibold text-green-400">
              ${stats.income.toFixed(2)}
            </p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/5 p-4 sm:p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Total Expenses</p>
            <p className="mt-2 text-xl sm:text-2xl font-semibold text-red-400">
              ${stats.expenses.toFixed(2)}
            </p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/5 p-4 sm:p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Net Change</p>
            <p className={`mt-2 text-xl sm:text-2xl font-semibold ${stats.net >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
              ${stats.net.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Transactions List */}
        <div className="rounded-2xl border border-white/5 bg-white/5 overflow-hidden">
          {filteredTransactions.length === 0 ? (
            <div className="py-12 text-center px-4">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/5">
                <span className="text-3xl">📭</span>
              </div>
              <p className="text-lg font-semibold text-white">No transactions found</p>
              <p className="mt-1 text-sm text-slate-400">
                {searchQuery || categoryFilter !== 'all' || dateFilter !== '30'
                  ? 'Try adjusting your filters'
                  : 'Your transactions will appear here'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredTransactions.map((transaction) => (
                <div
                  key={transaction.uniqueKey}
                  className="px-4 py-4 sm:px-6 hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Left side: Icon + Details */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div
                        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg font-semibold ${
                          transaction.isPending
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : transaction.amount < 0
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-green-500/20 text-green-400'
                        }`}
                      >
                        {transaction.isPending
                          ? '⏱'
                          : transaction.amount < 0
                          ? '−'
                          : '+'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-white">
                            {transaction.description || 'Transaction'}
                          </span>
                          {transaction.isPending && (
                            <span className="inline-flex items-center rounded-full bg-yellow-500/20 px-2 py-0.5 text-[10px] font-medium text-yellow-400">
                              PENDING APPROVAL
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs text-slate-400">
                          <span>{transaction.date}</span>
                          {transaction.category && (
                            <>
                              <span>•</span>
                              <span className="capitalize">{transaction.category}</span>
                            </>
                          )}
                          {transaction.accountType && (
                            <>
                              <span>•</span>
                              <span className="capitalize">{transaction.accountType}</span>
                            </>
                          )}
                        </div>
                        {transaction.note && (
                          <p className="mt-1.5 text-xs text-slate-500 line-clamp-1">
                            {transaction.note}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right side: Amount */}
                    <div className="flex-shrink-0 text-right">
                      <div
                        className={`text-sm sm:text-base font-semibold whitespace-nowrap ${
                          transaction.amount < 0 ? 'text-red-400' : 'text-green-400'
                        }`}
                      >
                        {transaction.amount < 0 ? '−' : '+'}$
                        {Math.abs(transaction.amount).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default TransactionsPage;
