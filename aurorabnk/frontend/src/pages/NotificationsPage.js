import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBankContext } from '../context/BankContext';
import './Page.css';

function NotificationsPage() {
  const { currentUser } = useBankContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [adminMessages, setAdminMessages] = useState([]);
  const [filter, setFilter] = useState('all'); // all, unread, transactions, security, account, admin
  const [onlyId, setOnlyId] = useState(null);
  const [onlyMessageId, setOnlyMessageId] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState({
    transactions: true,
    security: true,
    account: true,
    marketing: false,
  });

  // Fetch admin messages for the user
  useEffect(() => {
    const fetchAdminMessages = async () => {
      if (!currentUser?.id) return;
      try {
        const apiBase = process.env.NODE_ENV === 'production'
          ? (process.env.REACT_APP_API_BASE || '/api')
          : 'http://localhost:5001/api';
        // For Vercel, set REACT_APP_API_BASE to your backend deployment URL if needed
        const res = await fetch(`${apiBase}/admin/users/${currentUser.id}/messages`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setAdminMessages(data.messages || []);
        }
      } catch (err) {
        console.error('Failed to fetch admin messages:', err);
      }
    };

    fetchAdminMessages();
    const interval = setInterval(fetchAdminMessages, 10000);
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  // Apply intent from Dashboard bell clicks
  useEffect(() => {
    if (location.state && Object.keys(location.state).length > 0) {
      if (location.state.filter) setFilter(location.state.filter);
      if (location.state.showOnlyId) setOnlyId(location.state.showOnlyId);
      if (location.state.messageId) setOnlyMessageId(location.state.messageId);
      // Clear state by navigating without state
      setTimeout(() => navigate('/notifications', { replace: true, state: {} }), 0);
    }
  }, []);

  // Generate real notifications from user's actual account activity
  useEffect(() => {
    if (!currentUser) return;

    const realNotifications = [];

    // Admin messages at top
    if (adminMessages && adminMessages.length > 0) {
      adminMessages.forEach((msg) => {
        realNotifications.push({
          id: `admin-${msg._id || msg.createdAt}`,
          type: 'admin',
          title: msg.message,
          detail: 'Message from Aurora Bank',
          time: new Date(msg.createdAt).toISOString(),
          read: msg.read || false,
          icon: '📢',
          messageId: msg._id,
        });
      });
    }

    // Transactions - show actual transaction history
    if (currentUser.transactions && currentUser.transactions.length > 0) {
      currentUser.transactions.forEach((tx) => {
        let icon = '💳';
        let typeCategory = 'transaction';

        if (tx.amount > 0) icon = '💰';
        else if (tx.category === 'Bills') icon = '📄';
        else if (tx.category === 'Transfer') icon = '↗️';
        else if (tx.category === 'Shopping') icon = '🛍️';
        else if (tx.category === 'Dining') icon = '🍽️';

        const title = tx.status === 'pending' 
          ? `${tx.description} - Pending`
          : tx.status === 'rejected'
          ? `${tx.description} - Rejected`
          : tx.description;

        realNotifications.push({
          id: `tx-${tx.id}`,
          type: typeCategory,
          title: title,
          detail: `${tx.amount < 0 ? 'Spent' : 'Received'} $${Math.abs(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} • ${tx.category}`,
          time: new Date(tx.date).toISOString(),
          read: false,
          icon: icon,
          status: tx.status,
        });
      });
    }

    // Pending transactions
    if (currentUser.pendingTransactions && currentUser.pendingTransactions.length > 0) {
      currentUser.pendingTransactions.forEach((tx) => {
        realNotifications.push({
          id: `pending-${tx.id}`,
          type: 'transaction',
          title: `Pending: ${tx.description}`,
          detail: `$${Math.abs(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} awaiting approval`,
          time: new Date(tx.date || Date.now()).toISOString(),
          read: false,
          icon: '⏱',
          status: 'pending',
        });
      });
    }

    // Account alerts
    realNotifications.push({
      id: 'account-balance',
      type: 'account',
      title: 'Account Balance Updated',
      detail: `Current balance: $${(currentUser.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      time: new Date().toISOString(),
      read: false,
      icon: '💵',
    });

    // Checking/Savings breakdown
    realNotifications.push({
      id: 'account-breakdown',
      type: 'account',
      title: 'Account Details',
      detail: `Checking: $${(currentUser.checking || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} | Savings: $${(currentUser.savings || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      time: new Date().toISOString(),
      read: false,
      icon: '📊',
    });

    // Sort by time (most recent first)
    realNotifications.sort((a, b) => new Date(b.time) - new Date(a.time));
    
    setNotifications(realNotifications);
  }, [currentUser, adminMessages]);

  // Real-time notification polling - fetch new activity every 30 seconds
  useEffect(() => {
    if (!currentUser) return;

    const interval = setInterval(() => {
      // This would trigger a refetch of transactions from the backend
      // For now, we rely on the context's built-in polling
      // In a real app, you'd call an API endpoint here
    }, 30000);

    return () => clearInterval(interval);
  }, [currentUser]);

  // Format relative time
  const formatTime = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Filter notifications
  let filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'transactions') return n.type === 'transaction';
    if (filter === 'security') return n.type === 'security';
    if (filter === 'account') return n.type === 'account';
    if (filter === 'admin') return n.type === 'admin';
    return true;
  });

  // If arrived from bell click with a specific item, show only that
  if (onlyId) {
    filteredNotifications = filteredNotifications.filter((n) => n.id === onlyId);
  } else if (onlyMessageId) {
    filteredNotifications = filteredNotifications.filter((n) => n.messageId === onlyMessageId);
  }

  // Mark as read
  const markAsRead = async (id) => {
    const notif = notifications.find((n) => n.id === id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    // If this is an admin message, mark it as read on server
    if (notif && notif.type === 'admin' && notif.messageId && currentUser?.id) {
      try {
        const apiBase = process.env.REACT_APP_API_BASE || '/api';
        await fetch(`${apiBase}/admin/users/${currentUser.id}/messages/${notif.messageId}/read`, {
          method: 'PATCH',
          credentials: 'include',
        });
        // Refresh admin messages
        const res = await fetch(`${apiBase}/admin/users/${currentUser.id}/messages`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setAdminMessages(data.messages || []);
        }
      } catch (err) {
        console.error('Failed to mark message read:', err);
      }
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    // Also mark all unread admin messages as read server-side
    try {
      if (!currentUser?.id) return;
      const apiBase = process.env.REACT_APP_API_BASE || '/api';
      const unreadAdmin = adminMessages.filter((m) => !m.read && m._id);
      await Promise.all(
        unreadAdmin.map((m) =>
          fetch(`${apiBase}/admin/users/${currentUser.id}/messages/${m._id}/read`, {
            method: 'PATCH',
            credentials: 'include',
          })
        )
      );
      // Refresh
      const res = await fetch(`${apiBase}/admin/users/${currentUser.id}/messages`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setAdminMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Failed to mark all admin messages read:', err);
    }
  };

  // Delete notification
  const deleteNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Clear all notifications
  const clearAll = () => {
    if (window.confirm('Are you sure you want to clear all notifications?')) {
      setNotifications([]);
    }
  };

  // Save preferences
  const savePreferences = () => {
    setShowSettings(false);
    // In a real app, this would save to backend
    alert('Notification preferences saved successfully!');
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-950 to-slate-950 text-slate-50">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-900/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-900/20 rounded-full blur-3xl" />
      </div>
      
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12 space-y-8 sm:space-y-10">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs sm:text-sm uppercase tracking-[0.2em] text-indigo-300 font-semibold">Notifications & Alerts</p>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mt-2">Activity Center</h1>
            <p className="text-sm text-slate-300 mt-3">
              Track all your account activity, messages, and updates in one place
            </p>
          </div>
        </header>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/5 backdrop-blur-sm rounded-2xl border border-indigo-500/20 p-4">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            Real-time updates enabled
          </div>

          <div className="flex gap-2 flex-wrap">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs sm:text-sm px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition border border-indigo-500/30"
              >
                Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="text-xs sm:text-sm px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 transition border border-red-500/30"
              >
                Clear all
              </button>
            )}
            <button
              onClick={() => setShowSettings(true)}
              className="text-xs sm:text-sm px-3 py-1.5 rounded-lg bg-slate-500/20 text-slate-300 hover:bg-slate-500/30 transition border border-slate-500/30"
              title="Notification settings"
            >
              ⚙️ Settings
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {[
            { key: 'all', label: 'All', count: notifications.length },
            { key: 'unread', label: 'Unread', count: unreadCount },
            { key: 'transactions', label: 'Transactions', count: notifications.filter(n => n.type === 'transaction').length },
            { key: 'security', label: 'Security', count: notifications.filter(n => n.type === 'security').length },
            { key: 'account', label: 'Account', count: notifications.filter(n => n.type === 'account').length },
            { key: 'admin', label: 'Admin', count: notifications.filter(n => n.type === 'admin').length },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                filter === tab.key
                  ? 'bg-indigo-600 text-white border border-indigo-400/50'
                  : 'bg-white/5 border border-indigo-500/20 text-slate-300 hover:bg-indigo-500/10'
              }`}
            >
              {tab.label} {tab.count > 0 && `(${tab.count})`}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <div className="rounded-2xl border border-indigo-500/20 bg-white/5 backdrop-blur-sm p-12 text-center">
            <div className="text-5xl mb-4">🔔</div>
            <p className="text-lg text-slate-200 font-semibold">No notifications to show</p>
            <p className="text-sm text-slate-400 mt-2">
              {filter === 'unread' 
                ? "You're all caught up! No unread notifications."
                : "When you have account activity, you'll see it here."}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-indigo-500/20 bg-white/5 backdrop-blur-sm overflow-hidden divide-y divide-indigo-500/10">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`px-4 py-5 sm:px-6 hover:bg-indigo-500/5 transition group ${
                  !notification.read ? 'bg-indigo-500/5 border-l-2 border-indigo-400' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left: Icon + Content */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="text-2xl flex-shrink-0 mt-1">{notification.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start flex-wrap gap-2">
                        <div className="text-sm font-semibold text-white">{notification.title}</div>
                        {!notification.read && (
                          <span className="h-2.5 w-2.5 rounded-full bg-indigo-400 flex-shrink-0 mt-1.5"></span>
                        )}
                        {notification.status && (
                          <span className={`text-[11px] px-2 py-0.5 rounded-full flex-shrink-0 font-medium ${
                            notification.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                            notification.status === 'rejected' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                            'bg-green-500/20 text-green-300 border border-green-500/30'
                          }`}>
                            {notification.status.toUpperCase()}
                          </span>
                        )}
                        <span className={`text-[11px] px-2 py-0.5 rounded-full flex-shrink-0 font-medium border ${
                          notification.type === 'transaction' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                          notification.type === 'security' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                          notification.type === 'admin' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
                          'bg-slate-500/20 text-slate-300 border-slate-500/30'
                        }`}>
                          {notification.type}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-2">{notification.detail}</div>
                      <div className="text-[11px] text-slate-500 mt-2.5">
                        {formatTime(notification.time)}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="p-1 text-indigo-400 hover:text-indigo-300 transition text-lg"
                        title="Mark as read"
                      >
                        ✓
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="p-1 text-red-400 hover:text-red-300 transition text-lg"
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        {notifications.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 backdrop-blur-sm p-5">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Total Notifications</p>
              <p className="text-3xl font-bold text-white mt-2">{notifications.length}</p>
            </div>
            <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 backdrop-blur-sm p-5">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Unread</p>
              <p className="text-3xl font-bold text-cyan-400 mt-2">{unreadCount}</p>
            </div>
            <div className="rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-purple-600/5 backdrop-blur-sm p-5">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Today</p>
              <p className="text-3xl font-bold text-purple-400 mt-2">
                {notifications.filter(n => {
                  const diffHours = (new Date() - new Date(n.time)) / 3600000;
                  return diffHours < 24;
                }).length}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-slate-900 to-slate-950 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Notification Preferences</h2>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white text-2xl transition">
                ×
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-slate-300">Choose which notifications you want to receive:</p>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 transition">
                  <div>
                    <p className="text-sm font-semibold text-white">Transaction Alerts</p>
                    <p className="text-xs text-slate-400 mt-1">Deposits, withdrawals, and purchases</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.transactions}
                    onChange={(e) => setPreferences({ ...preferences, transactions: e.target.checked })}
                    className="h-5 w-5 rounded border border-indigo-500/30 accent-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition">
                  <div>
                    <p className="text-sm font-semibold text-white">Security Alerts</p>
                    <p className="text-xs text-slate-400 mt-1">Login attempts and security changes</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.security}
                    onChange={(e) => setPreferences({ ...preferences, security: e.target.checked })}
                    className="h-5 w-5 rounded border border-red-500/30 accent-red-500"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 transition">
                  <div>
                    <p className="text-sm font-semibold text-white">Account Updates</p>
                    <p className="text-xs text-slate-400 mt-1">Statements, rewards, and service updates</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.account}
                    onChange={(e) => setPreferences({ ...preferences, account: e.target.checked })}
                    className="h-5 w-5 rounded border border-cyan-500/30 accent-cyan-500"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 transition">
                  <div>
                    <p className="text-sm font-semibold text-white">Marketing & Offers</p>
                    <p className="text-xs text-slate-400 mt-1">Promotions and special offers</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.marketing}
                    onChange={(e) => setPreferences({ ...preferences, marketing: e.target.checked })}
                    className="h-5 w-5 rounded border border-purple-500/30 accent-purple-500"
                  />
                </div>
              </div>

              <button
                onClick={savePreferences}
                className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-3 font-semibold text-white hover:from-indigo-500 hover:to-indigo-600 transition mt-6 border border-indigo-500/50"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationsPage;
