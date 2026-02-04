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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-xl shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <AuroraBankLogo />
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-indigo-900 to-slate-950 bg-clip-text text-transparent">Aurora Bank</span>
          </div>
          <Link to="/dashboard" className="text-sm px-4 py-2 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition border border-indigo-200 flex items-center gap-2">
            <span>←</span>
            <span>Back</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs sm:text-sm uppercase tracking-[0.2em] text-gray-500 font-semibold">Transaction History</p>
            <h1 className="mb-2 text-3xl sm:text-4xl font-bold text-gray-900 mt-2">Your Transactions</h1>
            <p className="text-sm text-gray-600">
              {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            <span>📊</span>
            <span>Export CSV</span>
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Description, category..."
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition appearance-none cursor-pointer"
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
            <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Account</label>
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition appearance-none cursor-pointer"
            >
              <option value="all">All Accounts</option>
              <option value="checking">Checking</option>
              <option value="savings">Savings</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Date Range</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition appearance-none cursor-pointer"
            >
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="180">Last 6 Months</option>
              <option value="365">This Year</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>

        {/* Summary Section */}
        <div className="mb-6 bg-white border border-gray-200 rounded-lg p-6">
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Income</p>
              <p className="mt-2 text-2xl sm:text-3xl font-bold text-green-600">
                ${stats.income.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Expenses</p>
              <p className="mt-2 text-2xl sm:text-3xl font-bold text-red-600">
                ${stats.expenses.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Net Change</p>
              <p className={`mt-2 text-2xl sm:text-3xl font-bold ${stats.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${stats.net.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {filteredTransactions.length === 0 ? (
            <div className="py-12 text-center px-4">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
                <span className="text-3xl">📭</span>
              </div>
              <p className="text-lg font-semibold text-gray-900">No transactions found</p>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery || categoryFilter !== 'all' || dateFilter !== '30'
                  ? 'Try adjusting your filters'
                  : 'Your transactions will appear here'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredTransactions.map((transaction) => (
                <div
                  key={transaction.uniqueKey}
                  className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    {/* Left side: Icon + Details */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg font-semibold ${
                          transaction.isPending
                            ? 'bg-yellow-100 text-yellow-700'
                            : transaction.amount < 0
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {transaction.isPending
                          ? '⏳'
                          : transaction.amount < 0
                          ? '−'
                          : '+'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">
                            {transaction.description || 'Transaction'}
                          </span>
                          {transaction.isPending && (
                            <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold bg-yellow-100 text-yellow-700">
                              PENDING
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs text-gray-500">
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
                      </div>
                    </div>

                    {/* Right side: Amount */}
                    <div className="flex-shrink-0 text-right">
                      <div
                        className={`text-sm sm:text-base font-semibold whitespace-nowrap ${
                          transaction.amount < 0 ? 'text-red-600' : 'text-green-600'
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
