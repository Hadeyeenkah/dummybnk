import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBankContext } from '../context/BankContext';
import AuroraBankLogo from '../components/AuroraBankLogo';
import '../App.css';

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
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [adminMessage, setAdminMessage] = useState('');
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [conversationMessages, setConversationMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
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

  const apiBase = process.env.REACT_APP_API_BASE || '/api';

  // Fetch admin data in real-time
  const fetchAdminData = async () => {
    try {
      console.log('Fetching admin data...');
      
      // Fetch all users
      const usersRes = await fetch(`${apiBase}/admin/users`, {
        credentials: 'include',
      });
      
      console.log('Users response status:', usersRes.status);
      
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        console.log('Users data received:', usersData);
        setDisplayUsers(usersData.users || []);
      } else if (usersRes.status === 401 || usersRes.status === 403) {
        console.error('Unauthorized - redirecting to login');
        // Not authorized, redirect to login
        logout();
        navigate('/login');
        return;
      } else {
        const errorData = await usersRes.json().catch(() => ({}));
        console.error('Failed to fetch users:', errorData);
      }

      // Fetch pending approvals
      const approvalsRes = await fetch(`${apiBase}/admin/pending-approvals`, {
        credentials: 'include',
      });
      
      console.log('Approvals response status:', approvalsRes.status);
      
      if (approvalsRes.ok) {
        const approvalsData = await approvalsRes.json();
        console.log('Approvals data received:', approvalsData);
        setDisplayPendingApprovals(approvalsData.pendingApprovals || []);
      }

      setLastUpdate(new Date());
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
      setLoading(false);
    }
  };

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      const res = await fetch(`${apiBase}/admin/conversations`, {
        credentials: 'include',
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
      const res = await fetch(`${apiBase}/chat/messages/${convId}`, {
        credentials: 'include',
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
      const res = await fetch(`${apiBase}/chat/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
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
      const res = await fetch(`${apiBase}/transactions/${transactionId}/approve`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (res.ok) {
        // Refresh data immediately
        await fetchAdminData();
      } else {
        alert('Failed to approve transaction');
      }
    } catch (err) {
      console.error('Approve error:', err);
      alert('Error approving transaction');
    }
  };

  const handleReject = async (transactionId) => {
    try {
      const res = await fetch(`${apiBase}/transactions/${transactionId}/reject`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (res.ok) {
        // Refresh data immediately
        await fetchAdminData();
      } else {
        alert('Failed to reject transaction');
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
      const res = await fetch(`${apiBase}/admin/users/${userId}/balance`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checking: parseFloat(editValues.checking),
          savings: parseFloat(editValues.savings),
        }),
      });

      if (res.ok) {
        setEditingUser(null);
        // Refresh data immediately
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
    if (!selectedUserId || !newTransaction.description || !newTransaction.amount) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const res = await fetch(`${apiBase}/admin/users/${selectedUserId}/transactions`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTransaction,
          amount: parseFloat(newTransaction.amount),
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
    }
  };

  const handleDeleteTransaction = async (userId, transactionId) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    try {
      const res = await fetch(`${apiBase}/admin/users/${userId}/transactions/${transactionId}`, {
        method: 'DELETE',
        credentials: 'include',
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
    if (!selectedTransaction || !editTransaction.description || editTransaction.amount === '') {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const res = await fetch(
        `${apiBase}/admin/users/${selectedTransaction.userId}/transactions/${selectedTransaction.id}`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...editTransaction,
            amount: parseFloat(editTransaction.amount),
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
    }
  };

  const handleSendMessage = async () => {
    if (!selectedUserId || adminMessage.trim().length === 0) {
      alert('Please select a user and enter a message');
      return;
    }

    try {
      const res = await fetch(`${apiBase}/admin/users/${selectedUserId}/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-white/5 bg-slate-900/50 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3 text-cyan-400">
            <AuroraBankLogo />
            <span className="text-lg font-semibold tracking-tight text-slate-50">Aurora Bank</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-cyan-200 hover:text-white"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <h1 className="mb-2 text-3xl font-semibold text-white">Admin Dashboard</h1>
        <p className="mb-8 flex items-center justify-between text-slate-300">
          <span>Manage users, approve transactions, and monitor system activity</span>
          <span className="text-xs text-cyan-400">
            {loading ? 'Loading...' : `Last updated: ${lastUpdate.toLocaleTimeString()}`}
          </span>
        </p>

        {/* Stats Overview */}
        <div className="mb-8 grid gap-6 md:grid-cols-4">
          <div className="card secondary">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Total Users</p>
            <p className="mt-2 text-3xl font-semibold text-white">{displayUsers.length}</p>
          </div>
          <div className="card secondary">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">System Balance</p>
            <p className="mt-2 text-3xl font-semibold text-white">${displayUsers.reduce((sum, user) => sum + user.balance, 0).toFixed(2)}</p>
          </div>
          <div className="card secondary">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Pending Approvals</p>
            <p className="mt-2 text-3xl font-semibold text-yellow-400">{displayPendingApprovals.length}</p>
          </div>
          <div className="card secondary">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Total Transactions</p>
            <p className="mt-2 text-3xl font-semibold text-white">{displayUsers.reduce((sum, user) => sum + (user.transactions?.length || 0), 0)}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-4 border-b border-white/5">
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-3 text-sm font-semibold transition ${activeTab === 'users' ? 'border-b-2 border-cyan-400 text-cyan-400' : 'text-slate-400 hover:text-white'}`}
          >
            User Management
          </button>
          <button
            onClick={() => setActiveTab('approvals')}
            className={`pb-3 text-sm font-semibold transition ${activeTab === 'approvals' ? 'border-b-2 border-cyan-400 text-cyan-400' : 'text-slate-400 hover:text-white'}`}
          >
            Pending Approvals {displayPendingApprovals.length > 0 && `(${displayPendingApprovals.length})`}
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`pb-3 text-sm font-semibold transition ${activeTab === 'transactions' ? 'border-b-2 border-cyan-400 text-cyan-400' : 'text-slate-400 hover:text-white'}`}
          >
            Transaction Management
          </button>
          <button
            onClick={() => {
              setActiveTab('chat');
              if (conversations.length > 0 && !selectedConversationId) {
                setSelectedConversationId(conversations[0]._id);
                fetchConversationMessages(conversations[0]._id);
              }
            }}
            className={`pb-3 text-sm font-semibold transition ${activeTab === 'chat' ? 'border-b-2 border-cyan-400 text-cyan-400' : 'text-slate-400 hover:text-white'}`}
          >
            User Chat ({conversations.length})
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`pb-3 text-sm font-semibold transition ${activeTab === 'messages' ? 'border-b-2 border-cyan-400 text-cyan-400' : 'text-slate-400 hover:text-white'}`}
          >
            Send Messages
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`pb-3 text-sm font-semibold transition ${activeTab === 'activity' ? 'border-b-2 border-cyan-400 text-cyan-400' : 'text-slate-400 hover:text-white'}`}
          >
            Recent Activity
          </button>
        </div>

        {/* User Management Tab */}
        {activeTab === 'users' && (
          <div className="rounded-2xl border border-white/5 bg-white/5 p-6">
            <h2 className="mb-6 text-xl font-semibold text-white">All Users</h2>
            {loading ? (
              <p className="py-8 text-center text-slate-400">Loading users...</p>
            ) : displayUsers.length === 0 ? (
              <p className="py-8 text-center text-slate-400">No users found. Please register users first.</p>
            ) : (
              <div className="space-y-4">
                {displayUsers.map((user) => (
                <div
                  key={user.id}
                  className="rounded-xl border border-white/5 bg-white/5 p-6"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500" />
                        <div>
                          <h3 className="font-semibold text-white">{user.name}</h3>
                          <p className="text-sm text-slate-400">{user.email}</p>
                          <p className="text-xs text-slate-500">Account: {user.accountNumber}</p>
                        </div>
                      </div>

                      {editingUser === user.id ? (
                        <div className="grid gap-4 md:grid-cols-3">
                          <div>
                            <label className="mb-1 block text-xs text-slate-400">Checking</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editValues.checking}
                              onChange={(e) => setEditValues({ ...editValues, checking: e.target.value })}
                              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/50"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-slate-400">Savings</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editValues.savings}
                              onChange={(e) => setEditValues({ ...editValues, savings: e.target.value })}
                              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/50"
                            />
                          </div>
                          <div className="flex items-end gap-2">
                            <button
                              onClick={() => handleSave(user.id)}
                              className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-cyan-300"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingUser(null)}
                              className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/5"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="rounded-lg border border-white/5 bg-white/5 p-3">
                            <p className="text-xs text-slate-400">Total Balance</p>
                            <p className="text-xl font-semibold text-white">${user.balance.toFixed(2)}</p>
                          </div>
                          <div className="rounded-lg border border-white/5 bg-white/5 p-3">
                            <p className="text-xs text-slate-400">Checking</p>
                            <p className="text-xl font-semibold text-white">${user.checking.toFixed(2)}</p>
                          </div>
                          <div className="rounded-lg border border-white/5 bg-white/5 p-3">
                            <p className="text-xs text-slate-400">Savings</p>
                            <p className="text-xl font-semibold text-white">${user.savings.toFixed(2)}</p>
                          </div>
                        </div>
                      )}

                      <div className="mt-4">
                        <p className="text-xs text-slate-400">
                          {user.transactions.length} transactions • {user.pendingTransactions.length} pending
                        </p>
                      </div>
                    </div>

                    {editingUser !== user.id && (
                      <button
                        onClick={() => handleEdit(user)}
                        className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/5"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        )}

        {/* Pending Approvals Tab */}
        {activeTab === 'approvals' && (
          <div className="rounded-2xl border border-white/5 bg-white/5 p-6">
            <h2 className="mb-6 text-xl font-semibold text-white">Pending Transaction Approvals</h2>
            {displayPendingApprovals.length === 0 ? (
              <p className="py-8 text-center text-slate-400">No pending approvals</p>
            ) : (
              <div className="space-y-4">
                {displayPendingApprovals.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-6"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-yellow-500/20">
                        <span className="text-2xl">⏱</span>
                      </div>
                      <div>
                        <div className="font-semibold text-white">{transaction.description}</div>
                        <div className="text-sm text-slate-300">
                          {transaction.userName} • {transaction.date} • {transaction.category}
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          From: {transaction.accountType}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className={`text-2xl font-semibold ${transaction.amount < 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {transaction.amount < 0 ? '-' : '+'}$
                        {Math.abs(transaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(transaction.id)}
                          className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-400"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(transaction.id)}
                          className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-400"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Transaction Management Tab */}
        {activeTab === 'transactions' && (
          <div className="rounded-2xl border border-white/5 bg-white/5 p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Transaction Management</h2>
              <button
                onClick={() => setShowAddTransactionModal(true)}
                className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-cyan-300"
              >
                + Add Transaction
              </button>
            </div>
            {displayUsers.length === 0 ? (
              <p className="py-8 text-center text-slate-400">No users found</p>
            ) : (
              <div className="space-y-6">
                {displayUsers.map((user) => (
                  <div key={user.id} className="rounded-xl border border-white/5 bg-white/5 p-6">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500" />
                      <div>
                        <h3 className="font-semibold text-white">{user.name}</h3>
                        <p className="text-xs text-slate-400">{user.email}</p>
                      </div>
                    </div>
                    {user.transactions && user.transactions.length > 0 ? (
                      <div className="space-y-2">
                        {user.transactions.slice(0, 5).map((transaction, idx) => (
                          <div
                            key={`${transaction.id}-${idx}`}
                            className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-4"
                          >
                            <div className="flex-1">
                              <div className="text-sm font-semibold text-white">{transaction.description}</div>
                              <div className="text-xs text-slate-400">
                                {transaction.date} • {transaction.category} • {transaction.accountType}
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className={`text-lg font-semibold ${transaction.amount < 0 ? 'text-red-400' : 'text-green-400'}`}>
                                {transaction.amount < 0 ? '-' : '+'}${Math.abs(transaction.amount).toFixed(2)}
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditTransaction(transaction, user.id)}
                                  className="rounded-lg border border-blue-500/50 px-3 py-1 text-xs font-semibold text-blue-400 hover:bg-blue-500/10"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteTransaction(user.id, transaction.id)}
                                  className="rounded-lg border border-red-500/50 px-3 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/10"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="py-4 text-center text-sm text-slate-400">No transactions</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div className="rounded-2xl border border-white/5 bg-white/5 p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Send Messages to Users</h2>
              <button
                onClick={() => {
                  setShowSendMessageModal(true);
                  setSelectedUserId('');
                  setAdminMessage('');
                }}
                className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-cyan-300"
              >
                + Send Message
              </button>
            </div>
            <div className="rounded-xl border border-white/5 bg-white/5 p-6">
              <p className="mb-4 text-sm text-slate-300">Use this feature to send important notifications and information to users. Messages will appear on their profile.</p>
              <div className="space-y-2">
                {displayUsers.length === 0 ? (
                  <p className="py-8 text-center text-slate-400">No users available</p>
                ) : (
                  displayUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/10 p-4">
                      <div>
                        <p className="font-semibold text-white">{user.name}</p>
                        <p className="text-xs text-slate-400">{user.email}</p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedUserId(user.id);
                          setShowSendMessageModal(true);
                          setAdminMessage('');
                        }}
                        className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-cyan-300"
                      >
                        Send Message
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* User Chat Tab */}
        {activeTab === 'chat' && (
          <div className="rounded-2xl border border-white/5 bg-white/5 p-6">
            <h2 className="mb-6 text-xl font-semibold text-white">User Chat Support</h2>
            <div className="grid grid-cols-3 gap-6 h-[600px]">
              {/* Conversations List */}
              <div className="col-span-1 space-y-2 overflow-y-auto">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Active Conversations ({conversations.length})</h3>
                {conversations.length === 0 ? (
                  <p className="text-sm text-slate-400">No conversations yet</p>
                ) : (
                  conversations.map((conv) => (
                    <button
                      key={conv._id}
                      onClick={() => {
                        setSelectedConversationId(conv._id);
                        fetchConversationMessages(conv._id);
                      }}
                      className={`w-full text-left px-4 py-3 rounded-lg transition ${
                        selectedConversationId === conv._id
                          ? 'bg-cyan-500/20 border border-cyan-500/50'
                          : 'bg-white/5 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <p className="font-semibold text-white text-sm">{conv.userName}</p>
                      <p className="text-xs text-slate-400 mt-1">{conv.userEmail}</p>
                      {conv.lastMessage && (
                        <p className="text-xs text-slate-500 mt-1 truncate">{conv.lastMessage}</p>
                      )}
                    </button>
                  ))
                )}
              </div>

              {/* Chat Messages */}
              <div className="col-span-2 border border-white/10 rounded-lg bg-slate-800/50 flex flex-col">
                {!selectedConversationId ? (
                  <div className="flex-1 flex items-center justify-center text-slate-400">
                    <p>Select a conversation to view messages</p>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {conversationMessages.length === 0 ? (
                        <p className="text-center text-slate-400 py-8">No messages yet</p>
                      ) : (
                        conversationMessages.map((msg, idx) => (
                          <div
                            key={idx}
                            className={`flex ${msg.senderRole === 'admin' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-xs px-4 py-2 rounded-lg text-sm ${
                                msg.senderRole === 'admin'
                                  ? 'bg-cyan-500 text-white'
                                  : 'bg-slate-700 text-slate-100'
                              }`}
                            >
                              <div className="text-xs font-semibold mb-1 opacity-70">
                                {msg.senderName}
                              </div>
                              {msg.message}
                              <div className="text-xs mt-1 opacity-70">
                                {new Date(msg.createdAt).toLocaleTimeString([], { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Chat Input */}
                    <div className="border-t border-slate-700 p-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSendChatMessage()}
                          placeholder="Type a message..."
                          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-400"
                        />
                        <button
                          onClick={handleSendChatMessage}
                          disabled={!chatInput.trim()}
                          className="rounded-lg bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 px-4 py-2 text-white font-semibold transition"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity Tab */}
        {activeTab === 'activity' && (
          <div className="rounded-2xl border border-white/5 bg-white/5 p-6">
            <h2 className="mb-6 text-xl font-semibold text-white">Recent System Activity</h2>
            <div className="space-y-4">
              {displayUsers.flatMap(user => 
                user.transactions.slice(0, 3).map(t => ({
                  ...t,
                  userName: user.name,
                  userEmail: user.email,
                }))
              ).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20).map((transaction, idx) => (
                <div
                  key={`${transaction.id}-${idx}`}
                  className="flex items-center justify-between border-b border-white/5 pb-4 last:border-0"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5">
                      <span className="text-lg">{transaction.amount < 0 ? '↓' : '↑'}</span>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{transaction.description}</div>
                      <div className="text-xs text-slate-400">
                        {transaction.userName} ({transaction.userEmail}) • {transaction.date}
                      </div>
                    </div>
                  </div>
                  <div className={`text-lg font-semibold ${transaction.amount < 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {transaction.amount < 0 ? '-' : '+'}$
                    {Math.abs(transaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Add Transaction Modal */}
      {showAddTransactionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-900 p-8">
            <h2 className="mb-6 text-2xl font-semibold text-white">Add Transaction</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-200">Select User</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-300/50"
                  required
                >
                  <option value="">Choose a user...</option>
                  {displayUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-200">Description</label>
                  <input
                    type="text"
                    value={newTransaction.description}
                    onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                    placeholder="e.g., Salary Deposit, Grocery Store"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-400 outline-none focus:border-cyan-300/50"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-200">Amount (use - for debit)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newTransaction.amount}
                    onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                    placeholder="150.00 or -150.00"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-400 outline-none focus:border-cyan-300/50"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-200">Category</label>
                  <select
                    value={newTransaction.category}
                    onChange={(e) => setNewTransaction({ ...newTransaction, category: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-300/50"
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
                  <label className="mb-2 block text-sm font-semibold text-slate-200">Account Type</label>
                  <select
                    value={newTransaction.accountType}
                    onChange={(e) => setNewTransaction({ ...newTransaction, accountType: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-300/50"
                  >
                    <option value="checking">Checking</option>
                    <option value="savings">Savings</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-200">Date (Backdate)</label>
                  <input
                    type="date"
                    value={newTransaction.date}
                    onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-300/50"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-200">Note (Optional)</label>
                <textarea
                  value={newTransaction.note}
                  onChange={(e) => setNewTransaction({ ...newTransaction, note: e.target.value })}
                  placeholder="Additional details..."
                  rows="2"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-400 outline-none focus:border-cyan-300/50"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleAddTransaction}
                  className="flex-1 rounded-xl bg-cyan-400 py-3 text-sm font-semibold text-slate-900 hover:bg-cyan-300"
                >
                  Add Transaction
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
                  className="flex-1 rounded-xl border border-white/10 py-3 text-sm font-semibold text-white hover:bg-white/5"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-900 p-8">
            <h2 className="mb-6 text-2xl font-semibold text-white">Edit Transaction</h2>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-200">Description</label>
                  <input
                    type="text"
                    value={editTransaction.description}
                    onChange={(e) => setEditTransaction({ ...editTransaction, description: e.target.value })}
                    placeholder="e.g., Salary Deposit, Grocery Store"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-400 outline-none focus:border-cyan-300/50"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-200">Amount (use - for debit)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editTransaction.amount}
                    onChange={(e) => setEditTransaction({ ...editTransaction, amount: e.target.value })}
                    placeholder="150.00 or -150.00"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-400 outline-none focus:border-cyan-300/50"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-200">Category</label>
                  <select
                    value={editTransaction.category}
                    onChange={(e) => setEditTransaction({ ...editTransaction, category: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-300/50"
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
                  <label className="mb-2 block text-sm font-semibold text-slate-200">Account Type</label>
                  <select
                    value={editTransaction.accountType}
                    onChange={(e) => setEditTransaction({ ...editTransaction, accountType: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-300/50"
                  >
                    <option value="checking">Checking</option>
                    <option value="savings">Savings</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-200">Date</label>
                  <input
                    type="date"
                    value={editTransaction.date}
                    onChange={(e) => setEditTransaction({ ...editTransaction, date: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-300/50"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleUpdateTransaction}
                  className="flex-1 rounded-xl bg-cyan-400 py-3 text-sm font-semibold text-slate-900 hover:bg-cyan-300"
                >
                  Update Transaction
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
                  className="flex-1 rounded-xl border border-white/10 py-3 text-sm font-semibold text-white hover:bg-white/5"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-900 p-8">
            <h2 className="mb-6 text-2xl font-semibold text-white">Send Message to User</h2>
            <div className="space-y-4">
              {selectedUserId === '' && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-200">Select User</label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-300/50"
                    required
                  >
                    <option value="">Choose a user...</option>
                    {displayUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedUserId && (
                <div className="rounded-lg border border-white/5 bg-white/5 p-3">
                  <p className="text-sm text-slate-300">
                    Sending to: <span className="font-semibold text-white">{displayUsers.find(u => u.id === selectedUserId)?.name}</span>
                  </p>
                </div>
              )}

              <div>
                <label className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-200">
                  <span>Message</span>
                  <span className={`text-xs ${adminMessage.length > 1000 ? 'text-red-400' : 'text-slate-500'}`}>
                    {adminMessage.length}/1000
                  </span>
                </label>
                <textarea
                  value={adminMessage}
                  onChange={(e) => setAdminMessage(e.target.value.slice(0, 1000))}
                  placeholder="Enter your message here. This will be displayed on the user's profile..."
                  rows="6"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-400 outline-none focus:border-cyan-300/50"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSendMessage}
                  className="flex-1 rounded-xl bg-cyan-400 py-3 text-sm font-semibold text-slate-900 hover:bg-cyan-300"
                >
                  Send Message
                </button>
                <button
                  onClick={() => {
                    setShowSendMessageModal(false);
                    setAdminMessage('');
                    setSelectedUserId('');
                  }}
                  className="flex-1 rounded-xl border border-white/10 py-3 text-sm font-semibold text-white hover:bg-white/5"
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
