import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBankContext } from '../context/BankContext';
import AuroraBankLogo from '../components/AuroraBankLogo';
import { API_BASE } from '../config';
import '../App.css';

/*
  Design notes:
  - Shares the Aurora Bank brand tokens used on the customer stock page:
    ink #10182B, paper #F3F4EF, forest #163B2E (brand/primary action),
    gold #A9843C (highlight), positive #1E7245, negative #9B3232.
  - Left sidebar replaces the horizontal tab strip so section labels and
    badge counts stay visible at a glance, which is the more standard
    pattern for an internal console with this many sections.
  - marketWatchlistSymbols now matches every symbol shown on the customer
    stock page (including AMD, NFLX, DIS, WMT, KO, BA) so admins can
    actually control the change% for everything customers see — those
    six were previously uncontrollable from this screen.
*/

const marketWatchlistSymbols = [
  'AAPL', 'MSFT', 'NVDA', 'VOO', 'AMZN', 'TSLA', 'META', 'GOOGL', 'JPM', 'SPY', 'QQQ',
  'AMD', 'NFLX', 'DIS', 'WMT', 'KO', 'BA',
];

const marketWatchlistNames = {
  AAPL: 'Apple', MSFT: 'Microsoft', NVDA: 'NVIDIA', VOO: 'Vanguard S&P 500 ETF',
  AMZN: 'Amazon.com', TSLA: 'Tesla', META: 'Meta Platforms', GOOGL: 'Alphabet Class A',
  JPM: 'JPMorgan Chase', SPY: 'SPDR S&P 500 ETF Trust', QQQ: 'Invesco QQQ Trust',
  AMD: 'Advanced Micro Devices', NFLX: 'Netflix', DIS: 'Walt Disney', WMT: 'Walmart',
  KO: 'Coca-Cola', BA: 'Boeing',
};

const navItems = [
  { id: 'users', label: 'User management' },
  { id: 'approvals', label: 'Pending approvals' },
  { id: 'transactions', label: 'Transaction management' },
  { id: 'chat', label: 'User chat' },
  { id: 'messages', label: 'Send messages' },
  { id: 'activity', label: 'Recent activity' },
  { id: 'market', label: 'Stock market' },
];

function AdminPage() {
  const navigate = useNavigate();
  const { logout } = useBankContext();
  const [activeTab, setActiveTab] = useState('users');
  const [editingUser, setEditingUser] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [displayUsers, setDisplayUsers] = useState([]);
  const [displayPendingApprovals, setDisplayPendingApprovals] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [showAddTransactionModal, setShowAddTransactionModal] = useState(false);
  const [showEditTransactionModal, setShowEditTransactionModal] = useState(false);
  const [showSendMessageModal, setShowSendMessageModal] = useState(false);
  const [transactionSaving, setTransactionSaving] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [adminMessage, setAdminMessage] = useState('');
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [conversationMessages, setConversationMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [marketSettings, setMarketSettings] = useState({ estimatedTradeTotal: 0, marketStatus: 'open', marketMessage: 'Prices update during US market hours.' });
  const [marketForm, setMarketForm] = useState({ marketStatus: 'open', marketMessage: 'Prices update during US market hours.', watchlistChanges: {} });
  const [marketSaving, setMarketSaving] = useState(false);
  // Tracks whether marketForm has been seeded from the server yet. Once it
  // has, the 5-second polling refresh stops overwriting it — otherwise any
  // number the admin was mid-typing into the watchlist form kept getting
  // reset out from under them before they could finish or save it.
  const marketFormInitialized = useRef(false);
  // Today's return is per user (user A's return can differ from user B's),
  // so it's edited as a draft keyed by user id rather than one global value.
  const [userReturnDrafts, setUserReturnDrafts] = useState({});
  const [savingUserReturnId, setSavingUserReturnId] = useState(null);
  // Which user ids already have a seeded draft — same guard as marketForm,
  // so polling doesn't overwrite a return an admin is mid-typing for a user.
  const userReturnInitialized = useRef(new Set());
  const [newTransaction, setNewTransaction] = useState({
    description: '',
    amount: '',
    category: 'Other',
    accountType: 'checking',
    date: new Date().toISOString().split('T')[0],
    note: '',
  });
  const [editTransaction, setEditTransaction] = useState({
    description: '',
    amount: '',
    category: 'Other',
    accountType: 'checking',
    date: new Date().toISOString().split('T')[0],
  });

  const getAuthHeaders = (additionalHeaders = {}) => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      return additionalHeaders;
    }
    return { Authorization: `Bearer ${token}`, ...additionalHeaders };
  };

  // Fetch admin data in real-time
  const fetchAdminData = async () => {
    try {
      const usersRes = await fetch(`${API_BASE}/admin/users`, {
        credentials: 'include',
        headers: getAuthHeaders(),
      });

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setDisplayUsers(usersData.users || []);
      } else if (usersRes.status === 401 || usersRes.status === 403) {
        // Not authorized, redirect to login
        logout();
        navigate('/login');
        return;
      } else {
        const errorData = await usersRes.json().catch(() => ({}));
        console.error('Failed to fetch users:', errorData);
      }

      // Fetch pending approvals
      const approvalsRes = await fetch(`${API_BASE}/admin/pending-approvals`, {
        credentials: 'include',
        headers: getAuthHeaders(),
      });

      if (approvalsRes.ok) {
        const approvalsData = await approvalsRes.json();
        setDisplayPendingApprovals(approvalsData.pendingApprovals || []);
      }

      const marketRes = await fetch(`${API_BASE}/market/overview`, {
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (marketRes.ok) {
        const marketData = await marketRes.json();
        const nextSettings = marketData.settings || marketSettings;
        setMarketSettings(nextSettings);
        // Only seed the editable form once. Re-seeding it on every poll is
        // what was making typed values vanish before you could save them.
        if (!marketFormInitialized.current) {
          setMarketForm({
            todaysReturn: String(nextSettings.todaysReturn ?? ''),
            todaysReturnPercent: String(nextSettings.todaysReturnPercent ?? ''),
            marketStatus: nextSettings.marketStatus || 'open',
            marketMessage: nextSettings.marketMessage || '',
            watchlistChanges: Object.fromEntries((nextSettings.watchlistChanges || []).map((item) => [item.symbol, String(item.changePercent)])),
          });
          marketFormInitialized.current = true;
        }
      }

      setLastUpdate(new Date());
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
      setLoading(false);
    }
  };

  const handleSaveMarketSettings = async (event) => {
    event.preventDefault();
    setMarketSaving(true);
    try {
      const response = await fetch(`${API_BASE}/market/settings`, {
        method: 'PATCH',
        credentials: 'include',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          todaysReturn: Number(marketForm.todaysReturn),
          todaysReturnPercent: Number(marketForm.todaysReturnPercent),
          marketStatus: marketForm.marketStatus,
          marketMessage: marketForm.marketMessage,
          watchlistChanges: marketWatchlistSymbols.map((symbol) => ({
            symbol,
            changePercent: Number(marketForm.watchlistChanges[symbol] ?? 0),
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to update market settings.');
      setMarketSettings(data.settings);
      setMarketForm({
        todaysReturn: String(data.settings.todaysReturn),
        todaysReturnPercent: String(data.settings.todaysReturnPercent),
        marketStatus: data.settings.marketStatus,
        marketMessage: data.settings.marketMessage,
        watchlistChanges: Object.fromEntries((data.settings.watchlistChanges || []).map((item) => [item.symbol, String(item.changePercent)])),
      });
      alert('Market settings updated successfully.');
    } catch (error) {
      alert(error.message);
    } finally {
      setMarketSaving(false);
    }
  };

  const handleResetWatchlistChanges = () => {
    setMarketForm({
      ...marketForm,
      watchlistChanges: Object.fromEntries(marketWatchlistSymbols.map((symbol) => [symbol, '0'])),
    });
  };

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/conversations`, {
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    }
  };

  // Fetch messages for a conversation
  const fetchConversationMessages = async (convId) => {
    try {
      const res = await fetch(`${API_BASE}/chat/messages/${convId}`, {
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setConversationMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  // Send chat message
  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || !selectedConversationId) return;

    try {
      const res = await fetch(`${API_BASE}/chat/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          conversationId: selectedConversationId,
          message: chatInput,
        }),
      });

      if (res.ok) {
        setChatInput('');
        await fetchConversationMessages(selectedConversationId);
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  useEffect(() => {
    // Fetch immediately
    fetchAdminData();
    fetchConversations();

    // Set up interval for real-time updates (every 5 seconds)
    const interval = setInterval(() => {
      fetchAdminData();
      fetchConversations();
      if (selectedConversationId) {
        fetchConversationMessages(selectedConversationId);
      }
    }, 5000);

    return () => clearInterval(interval);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApprove = async (transactionId) => {
    try {
      const res = await fetch(`${API_BASE}/transactions/${transactionId}/approve`, {
        method: 'PATCH',
        credentials: 'include',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      });
      if (res.ok) {
        await fetchAdminData();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Failed to approve transaction: ${errorData.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Approve error:', err);
      alert('Error approving transaction');
    }
  };

  const handleReject = async (transactionId) => {
    try {
      const res = await fetch(`${API_BASE}/transactions/${transactionId}/reject`, {
        method: 'PATCH',
        credentials: 'include',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      });
      if (res.ok) {
        await fetchAdminData();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Failed to reject transaction: ${errorData.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Reject error:', err);
      alert('Error rejecting transaction');
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user.id);
    setEditValues({
      checking: user.checking,
      savings: user.savings,
    });
  };

  const handleSave = async (userId) => {
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/balance`, {
        method: 'PATCH',
        credentials: 'include',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          checking: parseFloat(editValues.checking),
          savings: parseFloat(editValues.savings),
        }),
      });

      if (res.ok) {
        setEditingUser(null);
        await fetchAdminData();
      } else {
        const error = await res.json();
        alert(`Failed to update balance: ${error.message}`);
      }
    } catch (err) {
      console.error('Save error:', err);
      alert('Error updating balance');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleAddTransaction = async () => {
    const amount = Number(newTransaction.amount);
    if (!selectedUserId || !newTransaction.description.trim() || !Number.isFinite(amount) || amount === 0) {
      alert('Select a user, enter a description, and enter a non-zero amount. Use a negative amount for a debit.');
      return;
    }

    try {
      setTransactionSaving(true);
      const res = await fetch(`${API_BASE}/admin/users/${selectedUserId}/transactions`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          ...newTransaction,
          amount,
        }),
      });

      if (res.ok) {
        setShowAddTransactionModal(false);
        setNewTransaction({
          description: '',
          amount: '',
          category: 'Other',
          accountType: 'checking',
          date: new Date().toISOString().split('T')[0],
          note: '',
        });
        setSelectedUserId('');
        await fetchAdminData();
      } else {
        const error = await res.json();
        alert(`Failed to add transaction: ${error.message}`);
      }
    } catch (err) {
      console.error('Add transaction error:', err);
      alert('Error adding transaction');
    } finally {
      setTransactionSaving(false);
    }
  };

  const handleDeleteTransaction = async (userId, transactionId) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/transactions/${transactionId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        await fetchAdminData();
      } else {
        const error = await res.json();
        alert(`Failed to delete transaction: ${error.message}`);
      }
    } catch (err) {
      console.error('Delete transaction error:', err);
      alert('Error deleting transaction');
    }
  };

  const handleEditTransaction = (transaction, userId) => {
    setSelectedTransaction({ ...transaction, userId });
    setEditTransaction({
      description: transaction.description,
      amount: transaction.amount,
      category: transaction.category,
      accountType: transaction.accountType,
      date: transaction.date,
    });
    setShowEditTransactionModal(true);
  };

  const handleUpdateTransaction = async () => {
    const amount = Number(editTransaction.amount);
    if (!selectedTransaction || !editTransaction.description.trim() || !Number.isFinite(amount) || amount === 0) {
      alert('Enter a description and a non-zero amount. Use a negative amount for a debit.');
      return;
    }

    try {
      setTransactionSaving(true);
      const res = await fetch(
        `${API_BASE}/admin/users/${selectedTransaction.userId}/transactions/${selectedTransaction.id}`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            ...editTransaction,
            amount,
          }),
        }
      );

      if (res.ok) {
        setShowEditTransactionModal(false);
        setSelectedTransaction(null);
        setEditTransaction({
          description: '',
          amount: '',
          category: 'Other',
          accountType: 'checking',
          date: new Date().toISOString().split('T')[0],
        });
        await fetchAdminData();
      } else {
        const error = await res.json();
        alert(`Failed to update transaction: ${error.message}`);
      }
    } catch (err) {
      console.error('Update transaction error:', err);
      alert('Error updating transaction');
    } finally {
      setTransactionSaving(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedUserId || adminMessage.trim().length === 0) {
      alert('Please select a user and enter a message');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/admin/users/${selectedUserId}/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ message: adminMessage }),
      });

      if (res.ok) {
        setShowSendMessageModal(false);
        setAdminMessage('');
        setSelectedUserId('');
        alert('Message sent successfully!');
        await fetchAdminData();
      } else {
        const error = await res.json();
        alert(`Failed to send message: ${error.message}`);
      }
    } catch (err) {
      console.error('Send message error:', err);
      alert('Error sending message');
    }
  };

  const systemBalance = displayUsers.reduce((sum, user) => sum + (user.balance || 0), 0);
  const totalTransactions = displayUsers.reduce((sum, user) => sum + (user.transactions?.length || 0), 0);

  return (
    <div className="min-h-screen bg-[#F3F4EF] text-[#10182B]">
      <header className="bg-[#163B2E] text-[#F3F4EF]">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <AuroraBankLogo />
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-lg font-semibold tracking-tight" style={{ fontFamily: "'Iowan Old Style', 'Source Serif 4', Georgia, serif" }}>Aurora Bank</span>
              <span className="rounded border border-[#3d5a4c] px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#c9d6cd]">Admin</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-xs text-[#a9bcae] sm:inline">
              {loading ? 'Syncing…' : `Last synced ${lastUpdate.toLocaleTimeString()}`}
            </span>
            <button
              onClick={handleLogout}
              className="rounded-md border border-[#3d5a4c] px-3 py-1.5 text-sm font-medium text-[#dfe6de] transition hover:border-[#6e8c7c] hover:text-white"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl" style={{ fontFamily: "'Iowan Old Style', 'Source Serif 4', Georgia, serif" }}>
            Admin console
          </h1>
          <p className="mt-1 text-sm text-[#5b6459]">Manage users, approve transactions, and monitor system activity.</p>
        </div>

        {/* Stats Overview */}
        <section className="mb-8 grid gap-px overflow-hidden border border-[#D9DBD2] bg-[#D9DBD2] sm:grid-cols-4">
          <div className="bg-white p-5">
            <p className="text-sm text-[#5b6459]">Total users</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{displayUsers.length}</p>
          </div>
          <div className="bg-white p-5">
            <p className="text-sm text-[#5b6459]">System balance</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">${systemBalance.toFixed(2)}</p>
          </div>
          <div className="bg-white p-5">
            <p className="text-sm text-[#5b6459]">Pending approvals</p>
            <p className={`mt-2 text-2xl font-semibold tabular-nums ${displayPendingApprovals.length > 0 ? 'text-[#A9843C]' : ''}`}>{displayPendingApprovals.length}</p>
          </div>
          <div className="bg-white p-5">
            <p className="text-sm text-[#5b6459]">Total transactions</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{totalTransactions}</p>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          {/* Sidebar nav */}
          <nav className="flex gap-1 overflow-x-auto border border-[#D9DBD2] bg-white p-2 lg:h-fit lg:flex-col lg:overflow-visible lg:p-2">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              const badge = item.id === 'approvals' ? displayPendingApprovals.length
                : item.id === 'chat' ? conversations.length
                : null;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (item.id === 'chat' && conversations.length > 0 && !selectedConversationId) {
                      setSelectedConversationId(conversations[0]._id);
                      fetchConversationMessages(conversations[0]._id);
                    }
                  }}
                  className={`flex shrink-0 items-center justify-between gap-3 border-l-2 px-3 py-2.5 text-left text-sm font-medium transition ${
                    isActive ? 'border-[#A9843C] bg-[#FAFAF7] text-[#10182B]' : 'border-transparent text-[#5b6459] hover:bg-[#FAFAF7]'
                  }`}
                >
                  <span className="whitespace-nowrap">{item.label}</span>
                  {badge !== null && badge > 0 && (
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                      item.id === 'approvals' ? 'bg-[#FBF6EC] text-[#8a6c2e]' : 'bg-[#ECEDE7] text-[#5b6459]'
                    }`}>
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Content */}
          <div className="min-w-0">
            {activeTab === 'market' && (
              <section className="border border-[#D9DBD2] bg-white">
                <div className="border-b border-[#D9DBD2] px-5 py-5 sm:px-6">
                  <p className="text-sm text-[#5b6459]">Market controls</p>
                  <h2 className="mt-1 text-lg font-semibold">Today&apos;s return &amp; watchlist</h2>
                  <p className="mt-1 text-sm text-[#5b6459]">These values appear on the stock market page for every customer.</p>
                </div>
                <form onSubmit={handleSaveMarketSettings} className="p-5 sm:p-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="block text-sm font-semibold">
                      Return ($)
                      <input
                        type="number"
                        step="0.01"
                        value={marketForm.todaysReturn}
                        onChange={(event) => setMarketForm({ ...marketForm, todaysReturn: event.target.value })}
                        className="mt-2 w-full rounded-md border border-[#c7ccc0] px-3 py-2.5 text-sm tabular-nums outline-none focus:border-[#163B2E] focus:ring-2 focus:ring-[#163B2E]/15"
                        required
                      />
                    </label>
                    <label className="block text-sm font-semibold">
                      Return (%)
                      <input
                        type="number"
                        step="0.01"
                        value={marketForm.todaysReturnPercent}
                        onChange={(event) => setMarketForm({ ...marketForm, todaysReturnPercent: event.target.value })}
                        className="mt-2 w-full rounded-md border border-[#c7ccc0] px-3 py-2.5 text-sm tabular-nums outline-none focus:border-[#163B2E] focus:ring-2 focus:ring-[#163B2E]/15"
                        required
                      />
                    </label>
                    <label className="block text-sm font-semibold">
                      Market status
                      <select
                        value={marketForm.marketStatus}
                        onChange={(event) => setMarketForm({ ...marketForm, marketStatus: event.target.value })}
                        className="mt-2 w-full rounded-md border border-[#c7ccc0] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#163B2E] focus:ring-2 focus:ring-[#163B2E]/15"
                      >
                        <option value="open">Open</option>
                        <option value="closed">Closed</option>
                      </select>
                    </label>
                  </div>

                  <label className="mt-4 block text-sm font-semibold">
                    Market note
                    <input
                      type="text"
                      value={marketForm.marketMessage}
                      onChange={(event) => setMarketForm({ ...marketForm, marketMessage: event.target.value })}
                      maxLength="160"
                      className="mt-2 w-full rounded-md border border-[#c7ccc0] px-3 py-2.5 text-sm outline-none focus:border-[#163B2E] focus:ring-2 focus:ring-[#163B2E]/15"
                    />
                  </label>

                  <div className="mt-6 border-t border-[#ECEDE7] pt-5">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Watchlist daily change (%)</p>
                        <p className="mt-1 text-xs text-[#8a9081]">Controls the price and percentage shown for each symbol on the customer stock page.</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleResetWatchlistChanges}
                        className="text-xs font-semibold text-[#5b6459] underline decoration-[#c7ccc0] underline-offset-4 hover:text-[#10182B]"
                      >
                        Reset all to 0%
                      </button>
                    </div>

                    <div className="mt-4 overflow-hidden border border-[#ECEDE7]">
                      <div className="grid grid-cols-[64px_minmax(0,1fr)_140px] gap-3 border-b border-[#ECEDE7] bg-[#FAFAF7] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#8a9081]">
                        <span>Symbol</span>
                        <span>Company</span>
                        <span className="text-right">Change (%)</span>
                      </div>
                      <div className="divide-y divide-[#ECEDE7]">
                        {marketWatchlistSymbols.map((symbol) => {
                          const rawValue = marketForm.watchlistChanges[symbol] ?? '';
                          const numericValue = Number(rawValue);
                          const isNegative = Number.isFinite(numericValue) && numericValue < 0;
                          const isPositive = Number.isFinite(numericValue) && numericValue > 0;
                          return (
                            <div key={symbol} className="grid grid-cols-[64px_minmax(0,1fr)_140px] items-center gap-3 px-4 py-2.5">
                              <span className="font-semibold">{symbol}</span>
                              <span className="truncate text-sm text-[#5b6459]">{marketWatchlistNames[symbol] || '—'}</span>
                              <div className="flex items-center justify-end">
                                <div className={`flex items-center gap-1 rounded-md border px-2 py-1.5 focus-within:border-[#163B2E] focus-within:ring-2 focus-within:ring-[#163B2E]/15 ${
                                  isNegative ? 'border-[#e3b3b3]' : isPositive ? 'border-[#bcdcc6]' : 'border-[#c7ccc0]'
                                }`}>
                                  <input
                                    type="number"
                                    step="0.01"
                                    inputMode="decimal"
                                    value={rawValue}
                                    onChange={(event) => setMarketForm({ ...marketForm, watchlistChanges: { ...marketForm.watchlistChanges, [symbol]: event.target.value } })}
                                    placeholder="0.00"
                                    className={`w-16 bg-transparent text-right text-sm tabular-nums outline-none ${
                                      isNegative ? 'text-[#9B3232]' : isPositive ? 'text-[#1E7245]' : ''
                                    }`}
                                  />
                                  <span className="text-xs text-[#8a9081]">%</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-[#ECEDE7] pt-5">
                    <button
                      type="submit"
                      disabled={marketSaving}
                      className="rounded-md bg-[#163B2E] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0F2C22] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {marketSaving ? 'Saving…' : 'Save market settings'}
                    </button>
                    <span className="text-sm text-[#5b6459]">
                      Current: <span className={marketSettings.todaysReturn >= 0 ? 'text-[#1E7245]' : 'text-[#9B3232]'}>
                        {marketSettings.todaysReturn >= 0 ? '+' : '-'}${Math.abs(Number(marketSettings.todaysReturn || 0)).toFixed(2)}
                      </span> ({Number(marketSettings.todaysReturnPercent || 0).toFixed(2)}%)
                    </span>
                  </div>
                </form>
              </section>
            )}

            {/* User Management Tab */}
            {activeTab === 'users' && (
              <section className="border border-[#D9DBD2] bg-white">
                <div className="border-b border-[#D9DBD2] px-5 py-5 sm:px-6">
                  <h2 className="text-lg font-semibold">All users</h2>
                </div>
                {loading ? (
                  <p className="px-6 py-10 text-center text-sm text-[#5b6459]">Loading users…</p>
                ) : displayUsers.length === 0 ? (
                  <p className="px-6 py-10 text-center text-sm text-[#5b6459]">No users found. Please register users first.</p>
                ) : (
                  <div className="divide-y divide-[#ECEDE7]">
                    {displayUsers.map((user) => (
                      <div key={user.id} className="px-5 py-5 sm:px-6">
                        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                          <div className="min-w-0 flex-1">
                            <div className="mb-3 flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#10182B] text-xs font-bold text-white">
                                {(user.name || '?').slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <h3 className="truncate font-semibold">{user.name}</h3>
                                <p className="truncate text-sm text-[#5b6459]">{user.email}</p>
                                <p className="text-xs text-[#8a9081]">Account: {user.accountNumber}</p>
                              </div>
                            </div>

                            {editingUser === user.id ? (
                              <div className="grid gap-3 md:grid-cols-3">
                                <div>
                                  <label className="mb-1 block text-xs text-[#5b6459]">Checking</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={editValues.checking}
                                    onChange={(e) => setEditValues({ ...editValues, checking: e.target.value })}
                                    className="w-full rounded-md border border-[#c7ccc0] px-3 py-2 text-sm tabular-nums outline-none focus:border-[#163B2E] focus:ring-2 focus:ring-[#163B2E]/15"
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs text-[#5b6459]">Savings</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={editValues.savings}
                                    onChange={(e) => setEditValues({ ...editValues, savings: e.target.value })}
                                    className="w-full rounded-md border border-[#c7ccc0] px-3 py-2 text-sm tabular-nums outline-none focus:border-[#163B2E] focus:ring-2 focus:ring-[#163B2E]/15"
                                  />
                                </div>
                                <div className="flex items-end gap-2">
                                  <button onClick={() => handleSave(user.id)} className="rounded-md bg-[#163B2E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0F2C22]">
                                    Save
                                  </button>
                                  <button onClick={() => setEditingUser(null)} className="rounded-md border border-[#c7ccc0] px-4 py-2 text-sm font-semibold hover:bg-[#FAFAF7]">
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="grid gap-3 sm:grid-cols-3">
                                <div className="border border-[#ECEDE7] bg-[#FAFAF7] p-3">
                                  <p className="text-xs text-[#8a9081]">Total balance</p>
                                  <p className="text-lg font-semibold tabular-nums">${(user.balance || 0).toFixed(2)}</p>
                                </div>
                                <div className="border border-[#ECEDE7] bg-[#FAFAF7] p-3">
                                  <p className="text-xs text-[#8a9081]">Checking</p>
                                  <p className="text-lg font-semibold tabular-nums">${(user.checking || 0).toFixed(2)}</p>
                                </div>
                                <div className="border border-[#ECEDE7] bg-[#FAFAF7] p-3">
                                  <p className="text-xs text-[#8a9081]">Savings</p>
                                  <p className="text-lg font-semibold tabular-nums">${(user.savings || 0).toFixed(2)}</p>
                                </div>
                              </div>
                            )}

                            <p className="mt-3 text-xs text-[#8a9081]">
                              {user.transactions?.length || 0} transactions · {user.pendingTransactions?.length || 0} pending
                            </p>
                          </div>

                          {editingUser !== user.id && (
                            <button
                              onClick={() => handleEdit(user)}
                              className="shrink-0 rounded-md border border-[#c7ccc0] px-4 py-2 text-sm font-semibold hover:bg-[#FAFAF7]"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Pending Approvals Tab */}
            {activeTab === 'approvals' && (
              <section className="border border-[#D9DBD2] bg-white">
                <div className="border-b border-[#D9DBD2] px-5 py-5 sm:px-6">
                  <h2 className="text-lg font-semibold">Pending transaction approvals</h2>
                </div>
                {displayPendingApprovals.length === 0 ? (
                  <p className="px-6 py-10 text-center text-sm text-[#5b6459]">No pending approvals</p>
                ) : (
                  <div className="divide-y divide-[#ECEDE7]">
                    {displayPendingApprovals.map((transaction) => (
                      <div key={transaction.id} className="flex flex-col gap-4 border-l-2 border-[#A9843C] bg-[#FBF6EC] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                        <div className="min-w-0">
                          <p className="font-semibold">{transaction.description}</p>
                          <p className="text-sm text-[#5b6459]">{transaction.userName} · {transaction.date} · {transaction.category}</p>
                          <p className="mt-0.5 text-xs text-[#8a9081]">From: {transaction.accountType}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-4">
                          <span className={`text-lg font-semibold tabular-nums ${transaction.amount < 0 ? 'text-[#9B3232]' : 'text-[#1E7245]'}`}>
                            {transaction.amount < 0 ? '-' : '+'}${Math.abs(transaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                          <div className="flex gap-2">
                            <button onClick={() => handleApprove(transaction.id)} className="rounded-md bg-[#163B2E] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#0F2C22]">
                              Approve
                            </button>
                            <button onClick={() => handleReject(transaction.id)} className="rounded-md border border-[#9B3232] px-3 py-1.5 text-sm font-semibold text-[#9B3232] hover:bg-[#fbf1f1]">
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Transaction Management Tab */}
            {activeTab === 'transactions' && (
              <section className="border border-[#D9DBD2] bg-white">
                <div className="flex items-center justify-between border-b border-[#D9DBD2] px-5 py-5 sm:px-6">
                  <h2 className="text-lg font-semibold">Transaction management</h2>
                  <button
                    onClick={() => setShowAddTransactionModal(true)}
                    className="rounded-md bg-[#163B2E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0F2C22]"
                  >
                    + Add transaction
                  </button>
                </div>
                {displayUsers.length === 0 ? (
                  <p className="px-6 py-10 text-center text-sm text-[#5b6459]">No users found</p>
                ) : (
                  <div className="divide-y divide-[#ECEDE7]">
                    {displayUsers.map((user) => (
                      <div key={user.id} className="px-5 py-5 sm:px-6">
                        <div className="mb-3 flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#10182B] text-xs font-bold text-white">
                            {(user.name || '?').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h3 className="truncate font-semibold">{user.name}</h3>
                            <p className="truncate text-xs text-[#8a9081]">{user.email}</p>
                          </div>
                        </div>
                        {user.transactions && user.transactions.length > 0 ? (
                          <div className="divide-y divide-[#ECEDE7] border border-[#ECEDE7]">
                            {user.transactions.slice(0, 5).map((transaction, idx) => (
                              <div key={`${transaction.id}-${idx}`} className="flex items-center justify-between gap-4 px-4 py-3">
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold">{transaction.description}</p>
                                  <p className="text-xs text-[#8a9081]">{transaction.date} · {transaction.category} · {transaction.accountType}</p>
                                </div>
                                <div className="flex shrink-0 items-center gap-3">
                                  <span className={`text-sm font-semibold tabular-nums ${transaction.amount < 0 ? 'text-[#9B3232]' : 'text-[#1E7245]'}`}>
                                    {transaction.amount < 0 ? '-' : '+'}${Math.abs(transaction.amount).toFixed(2)}
                                  </span>
                                  <div className="flex gap-1.5">
                                    <button onClick={() => handleEditTransaction(transaction, user.id)} className="rounded-md border border-[#c7ccc0] px-2.5 py-1 text-xs font-semibold hover:bg-[#FAFAF7]">
                                      Edit
                                    </button>
                                    <button onClick={() => handleDeleteTransaction(user.id, transaction.id)} className="rounded-md border border-[#9B3232] px-2.5 py-1 text-xs font-semibold text-[#9B3232] hover:bg-[#fbf1f1]">
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="py-3 text-center text-sm text-[#8a9081]">No transactions</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Messages Tab */}
            {activeTab === 'messages' && (
              <section className="border border-[#D9DBD2] bg-white">
                <div className="flex items-center justify-between border-b border-[#D9DBD2] px-5 py-5 sm:px-6">
                  <h2 className="text-lg font-semibold">Send messages to users</h2>
                  <button
                    onClick={() => {
                      setShowSendMessageModal(true);
                      setSelectedUserId('');
                      setAdminMessage('');
                    }}
                    className="rounded-md bg-[#163B2E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0F2C22]"
                  >
                    + Send message
                  </button>
                </div>
                <div className="px-5 py-5 sm:px-6">
                  <p className="mb-4 text-sm text-[#5b6459]">Use this feature to send important notifications and information to users. Messages will appear on their profile.</p>
                  {displayUsers.length === 0 ? (
                    <p className="py-8 text-center text-sm text-[#8a9081]">No users available</p>
                  ) : (
                    <div className="divide-y divide-[#ECEDE7] border border-[#ECEDE7]">
                      {displayUsers.map((user) => (
                        <div key={user.id} className="flex items-center justify-between gap-4 px-4 py-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{user.name}</p>
                            <p className="truncate text-xs text-[#8a9081]">{user.email}</p>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedUserId(user.id);
                              setShowSendMessageModal(true);
                              setAdminMessage('');
                            }}
                            className="shrink-0 rounded-md bg-[#163B2E] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#0F2C22]"
                          >
                            Send message
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* User Chat Tab */}
            {activeTab === 'chat' && (
              <section className="border border-[#D9DBD2] bg-white">
                <div className="border-b border-[#D9DBD2] px-5 py-5 sm:px-6">
                  <h2 className="text-lg font-semibold">User chat support</h2>
                </div>
                <div className="grid min-h-[60vh] gap-px bg-[#D9DBD2] md:h-[600px] md:grid-cols-3">
                  {/* Conversations List */}
                  <div className="overflow-y-auto bg-white md:col-span-1">
                    <p className="px-4 pt-4 text-xs font-semibold uppercase tracking-wide text-[#8a9081]">Active conversations ({conversations.length})</p>
                    {conversations.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-[#8a9081]">No conversations yet</p>
                    ) : (
                      <div className="mt-2 divide-y divide-[#ECEDE7]">
                        {conversations.map((conv) => (
                          <button
                            key={conv._id}
                            onClick={() => {
                              setSelectedConversationId(conv._id);
                              fetchConversationMessages(conv._id);
                            }}
                            className={`block w-full border-l-2 px-4 py-3 text-left transition ${
                              selectedConversationId === conv._id ? 'border-[#A9843C] bg-[#FAFAF7]' : 'border-transparent hover:bg-[#FAFAF7]'
                            }`}
                          >
                            <p className="text-sm font-semibold">{conv.userName}</p>
                            <p className="mt-0.5 text-xs text-[#8a9081]">{conv.userEmail}</p>
                            {conv.lastMessage && <p className="mt-1 truncate text-xs text-[#8a9081]">{conv.lastMessage}</p>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Chat Messages */}
                  <div className="flex min-h-0 flex-col bg-[#FAFAF7] md:col-span-2">
                    {!selectedConversationId ? (
                      <div className="flex flex-1 items-center justify-center text-sm text-[#8a9081]">
                        <p>Select a conversation to view messages</p>
                      </div>
                    ) : (
                      <>
                        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                          {conversationMessages.length === 0 ? (
                            <p className="py-8 text-center text-sm text-[#8a9081]">No messages yet</p>
                          ) : (
                            conversationMessages.map((msg, idx) => (
                              <div key={idx} className={`flex ${msg.senderRole === 'admin' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-xs px-4 py-2 text-sm ${msg.senderRole === 'admin' ? 'bg-[#163B2E] text-white' : 'border border-[#D9DBD2] bg-white'}`}>
                                  <div className={`mb-1 text-xs font-semibold ${msg.senderRole === 'admin' ? 'text-[#c9d6cd]' : 'text-[#8a9081]'}`}>{msg.senderName}</div>
                                  {msg.message}
                                  <div className={`mt-1 text-xs ${msg.senderRole === 'admin' ? 'text-[#c9d6cd]' : 'text-[#8a9081]'}`}>
                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                        <div className="border-t border-[#D9DBD2] p-3">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && handleSendChatMessage()}
                              placeholder="Type a message…"
                              className="flex-1 rounded-md border border-[#c7ccc0] bg-white px-3 py-2 text-sm outline-none focus:border-[#163B2E] focus:ring-2 focus:ring-[#163B2E]/15"
                            />
                            <button
                              onClick={handleSendChatMessage}
                              disabled={!chatInput.trim()}
                              className="rounded-md bg-[#163B2E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0F2C22] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Send
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Recent Activity Tab */}
            {activeTab === 'activity' && (
              <section className="border border-[#D9DBD2] bg-white">
                <div className="border-b border-[#D9DBD2] px-5 py-5 sm:px-6">
                  <h2 className="text-lg font-semibold">Recent system activity</h2>
                </div>
                <div className="divide-y divide-[#ECEDE7]">
                  {displayUsers.flatMap((user) =>
                    (user.transactions || []).slice(0, 3).map((t) => ({
                      ...t,
                      userName: user.name,
                      userEmail: user.email,
                    }))
                  ).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20).map((transaction, idx) => (
                    <div key={`${transaction.id}-${idx}`} className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-[#ECEDE7] bg-[#FAFAF7] text-base">
                          {transaction.amount < 0 ? '↓' : '↑'}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{transaction.description}</p>
                          <p className="truncate text-xs text-[#8a9081]">{transaction.userName} ({transaction.userEmail}) · {transaction.date}</p>
                        </div>
                      </div>
                      <span className={`shrink-0 text-base font-semibold tabular-nums ${transaction.amount < 0 ? 'text-[#9B3232]' : 'text-[#1E7245]'}`}>
                        {transaction.amount < 0 ? '-' : '+'}${Math.abs(transaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </main>

      {/* Add Transaction Modal */}
      {showAddTransactionModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#10182B]/60 p-4 backdrop-blur-sm sm:items-center">
          <div className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-lg border-t-4 border-[#A9843C] bg-white p-5 shadow-xl sm:p-6">
            <h2 className="mb-5 text-xl font-semibold">Add transaction</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold">Select user</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full rounded-md border border-[#c7ccc0] px-3 py-2.5 text-sm outline-none focus:border-[#163B2E] focus:ring-2 focus:ring-[#163B2E]/15"
                  required
                >
                  <option value="">Choose a user…</option>
                  {displayUsers.map((user) => (
                    <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">Description</label>
                  <input
                    type="text"
                    value={newTransaction.description}
                    onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                    placeholder="e.g., Salary deposit, Grocery store"
                    className="w-full rounded-md border border-[#c7ccc0] px-3 py-2.5 text-sm outline-none focus:border-[#163B2E] focus:ring-2 focus:ring-[#163B2E]/15"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">Amount (use - for debit)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newTransaction.amount}
                    onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                    placeholder="150.00 or -150.00"
                    className="w-full rounded-md border border-[#c7ccc0] px-3 py-2.5 text-sm tabular-nums outline-none focus:border-[#163B2E] focus:ring-2 focus:ring-[#163B2E]/15"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">Category</label>
                  <select
                    value={newTransaction.category}
                    onChange={(e) => setNewTransaction({ ...newTransaction, category: e.target.value })}
                    className="w-full rounded-md border border-[#c7ccc0] px-3 py-2.5 text-sm outline-none focus:border-[#163B2E] focus:ring-2 focus:ring-[#163B2E]/15"
                  >
                    <option value="Income">Income</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Dining">Dining</option>
                    <option value="Bills">Bills</option>
                    <option value="Transfer">Transfer</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">Account type</label>
                  <select
                    value={newTransaction.accountType}
                    onChange={(e) => setNewTransaction({ ...newTransaction, accountType: e.target.value })}
                    className="w-full rounded-md border border-[#c7ccc0] px-3 py-2.5 text-sm outline-none focus:border-[#163B2E] focus:ring-2 focus:ring-[#163B2E]/15"
                  >
                    <option value="checking">Checking</option>
                    <option value="savings">Savings</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">Date (backdate)</label>
                  <input
                    type="date"
                    value={newTransaction.date}
                    onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                    className="w-full rounded-md border border-[#c7ccc0] px-3 py-2.5 text-sm outline-none focus:border-[#163B2E] focus:ring-2 focus:ring-[#163B2E]/15"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold">Note (optional)</label>
                <textarea
                  value={newTransaction.note}
                  onChange={(e) => setNewTransaction({ ...newTransaction, note: e.target.value })}
                  placeholder="Additional details…"
                  rows="2"
                  className="w-full rounded-md border border-[#c7ccc0] px-3 py-2.5 text-sm outline-none focus:border-[#163B2E] focus:ring-2 focus:ring-[#163B2E]/15"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleAddTransaction}
                  disabled={transactionSaving}
                  className="flex-1 rounded-md bg-[#163B2E] py-2.5 text-sm font-semibold text-white transition hover:bg-[#0F2C22] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {transactionSaving ? 'Adding transaction…' : 'Add transaction'}
                </button>
                <button
                  onClick={() => {
                    setShowAddTransactionModal(false);
                    setNewTransaction({
                      description: '',
                      amount: '',
                      category: 'Other',
                      accountType: 'checking',
                      date: new Date().toISOString().split('T')[0],
                      note: '',
                    });
                    setSelectedUserId('');
                  }}
                  className="flex-1 rounded-md border border-[#c7ccc0] py-2.5 text-sm font-semibold hover:bg-[#FAFAF7]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {showEditTransactionModal && selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#10182B]/60 p-4 backdrop-blur-sm sm:items-center">
          <div className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-lg border-t-4 border-[#A9843C] bg-white p-5 shadow-xl sm:p-6">
            <h2 className="mb-5 text-xl font-semibold">Edit transaction</h2>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">Description</label>
                  <input
                    type="text"
                    value={editTransaction.description}
                    onChange={(e) => setEditTransaction({ ...editTransaction, description: e.target.value })}
                    placeholder="e.g., Salary deposit, Grocery store"
                    className="w-full rounded-md border border-[#c7ccc0] px-3 py-2.5 text-sm outline-none focus:border-[#163B2E] focus:ring-2 focus:ring-[#163B2E]/15"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">Amount (use - for debit)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editTransaction.amount}
                    onChange={(e) => setEditTransaction({ ...editTransaction, amount: e.target.value })}
                    placeholder="150.00 or -150.00"
                    className="w-full rounded-md border border-[#c7ccc0] px-3 py-2.5 text-sm tabular-nums outline-none focus:border-[#163B2E] focus:ring-2 focus:ring-[#163B2E]/15"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">Category</label>
                  <select
                    value={editTransaction.category}
                    onChange={(e) => setEditTransaction({ ...editTransaction, category: e.target.value })}
                    className="w-full rounded-md border border-[#c7ccc0] px-3 py-2.5 text-sm outline-none focus:border-[#163B2E] focus:ring-2 focus:ring-[#163B2E]/15"
                  >
                    <option value="Income">Income</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Dining">Dining</option>
                    <option value="Bills">Bills</option>
                    <option value="Transfer">Transfer</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">Account type</label>
                  <select
                    value={editTransaction.accountType}
                    onChange={(e) => setEditTransaction({ ...editTransaction, accountType: e.target.value })}
                    className="w-full rounded-md border border-[#c7ccc0] px-3 py-2.5 text-sm outline-none focus:border-[#163B2E] focus:ring-2 focus:ring-[#163B2E]/15"
                  >
                    <option value="checking">Checking</option>
                    <option value="savings">Savings</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">Date</label>
                  <input
                    type="date"
                    value={editTransaction.date}
                    onChange={(e) => setEditTransaction({ ...editTransaction, date: e.target.value })}
                    className="w-full rounded-md border border-[#c7ccc0] px-3 py-2.5 text-sm outline-none focus:border-[#163B2E] focus:ring-2 focus:ring-[#163B2E]/15"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleUpdateTransaction}
                  disabled={transactionSaving}
                  className="flex-1 rounded-md bg-[#163B2E] py-2.5 text-sm font-semibold text-white transition hover:bg-[#0F2C22] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {transactionSaving ? 'Updating transaction…' : 'Update transaction'}
                </button>
                <button
                  onClick={() => {
                    setShowEditTransactionModal(false);
                    setSelectedTransaction(null);
                    setEditTransaction({
                      description: '',
                      amount: '',
                      category: 'Other',
                      accountType: 'checking',
                      date: new Date().toISOString().split('T')[0],
                    });
                  }}
                  className="flex-1 rounded-md border border-[#c7ccc0] py-2.5 text-sm font-semibold hover:bg-[#FAFAF7]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Message Modal */}
      {showSendMessageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#10182B]/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-lg border-t-4 border-[#A9843C] bg-white p-5 shadow-xl sm:p-6">
            <h2 className="mb-5 text-xl font-semibold">Send message to user</h2>
            <div className="space-y-4">
              {selectedUserId === '' && (
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">Select user</label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full rounded-md border border-[#c7ccc0] px-3 py-2.5 text-sm outline-none focus:border-[#163B2E] focus:ring-2 focus:ring-[#163B2E]/15"
                    required
                  >
                    <option value="">Choose a user…</option>
                    {displayUsers.map((user) => (
                      <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
                    ))}
                  </select>
                </div>
              )}

              {selectedUserId && (
                <div className="border border-[#ECEDE7] bg-[#FAFAF7] p-3">
                  <p className="text-sm text-[#5b6459]">
                    Sending to: <span className="font-semibold text-[#10182B]">{displayUsers.find((u) => u.id === selectedUserId)?.name}</span>
                  </p>
                </div>
              )}

              <div>
                <label className="mb-1.5 flex items-center justify-between text-sm font-semibold">
                  <span>Message</span>
                  <span className={`text-xs font-normal ${adminMessage.length > 1000 ? 'text-[#9B3232]' : 'text-[#8a9081]'}`}>{adminMessage.length}/1000</span>
                </label>
                <textarea
                  value={adminMessage}
                  onChange={(e) => setAdminMessage(e.target.value.slice(0, 1000))}
                  placeholder="Enter your message here. This will be displayed on the user's profile…"
                  rows="6"
                  className="w-full rounded-md border border-[#c7ccc0] px-3 py-2.5 text-sm outline-none focus:border-[#163B2E] focus:ring-2 focus:ring-[#163B2E]/15"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={handleSendMessage} className="flex-1 rounded-md bg-[#163B2E] py-2.5 text-sm font-semibold text-white transition hover:bg-[#0F2C22]">
                  Send message
                </button>
                <button
                  onClick={() => {
                    setShowSendMessageModal(false);
                    setAdminMessage('');
                    setSelectedUserId('');
                  }}
                  className="flex-1 rounded-md border border-[#c7ccc0] py-2.5 text-sm font-semibold hover:bg-[#FAFAF7]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPage;
