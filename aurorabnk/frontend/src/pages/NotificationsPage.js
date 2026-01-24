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
        const apiBase = process.env.REACT_APP_API_BASE || '/api';
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
    if (location.state) {
      if (location.state.filter) setFilter(location.state.filter);
      if (location.state.showOnlyId) setOnlyId(location.state.showOnlyId);
      if (location.state.messageId) setOnlyMessageId(location.state.messageId);
      navigate('/notifications', { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

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
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="absolute inset-0 -z-10 gradient-veil" />
      
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs sm:text-sm uppercase tracking-[0.2em] text-cyan-200">Notifications</p>
            <h1 className="text-2xl sm:text-3xl font-semibold text-white mt-1">Your latest alerts</h1>
            <p className="text-sm text-slate-300 mt-2">
              Real-time account activity and updates
            </p>
          </div>
        </header>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Live updates enabled
          </div>

          <div className="flex gap-2 flex-wrap">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs sm:text-sm text-cyan-400 hover:text-cyan-300 transition"
              >
                Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="text-xs sm:text-sm text-red-400 hover:text-red-300 transition"
              >
                Clear all
              </button>
            )}
            <button
              onClick={() => setShowSettings(true)}
              className="text-slate-400 hover:text-cyan-300 transition"
              title="Notification settings"
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap ${
                  filter === tab.key
                    ? 'bg-cyan-400 text-slate-900'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                {tab.label} {tab.count > 0 && `(${tab.count})`}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
            <div className="text-5xl mb-4">🔔</div>
            <p className="text-lg text-slate-300">No notifications to show</p>
            <p className="text-sm text-slate-400 mt-2">
              {filter === 'unread' 
                ? "You're all caught up! No unread notifications."
                : "When you have account activity, you'll see it here."}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden divide-y divide-white/5">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`px-4 py-4 sm:px-6 hover:bg-white/[0.03] transition group ${
                  !notification.read ? 'bg-cyan-500/5' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left: Icon + Content */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="text-2xl flex-shrink-0">{notification.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start flex-wrap gap-2">
                        <div className="text-sm font-semibold text-white">{notification.title}</div>
                        {!notification.read && (
                          <span className="h-2 w-2 rounded-full bg-cyan-400 flex-shrink-0 mt-1"></span>
                        )}
                        {notification.status && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${
                            notification.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                            notification.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                            'bg-green-500/20 text-green-400'
                          }`}>
                            {notification.status.toUpperCase()}
                          </span>
                        )}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${
                          notification.type === 'transaction' ? 'bg-blue-500/20 text-blue-400' :
                          notification.type === 'security' ? 'bg-red-500/20 text-red-400' :
                          'bg-purple-500/20 text-purple-400'
                        }`}>
                          {notification.type}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1.5">{notification.detail}</div>
                      <div className="text-[11px] text-slate-500 mt-2">
                        {formatTime(notification.time)}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="p-1 text-cyan-400 hover:text-cyan-300 transition text-lg"
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
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-slate-400">Total Notifications</p>
              <p className="text-2xl font-semibold text-white mt-1">{notifications.length}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-slate-400">Unread</p>
              <p className="text-2xl font-semibold text-cyan-400 mt-1">{unreadCount}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-slate-400">Today</p>
              <p className="text-2xl font-semibold text-white mt-1">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Notification Preferences</h2>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white text-2xl">
                ×
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-slate-300">Choose which notifications you want to receive:</p>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-lg border border-white/10 bg-white/5">
                  <div>
                    <p className="text-sm font-semibold text-white">Transaction Alerts</p>
                    <p className="text-xs text-slate-400 mt-1">Deposits, withdrawals, and purchases</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.transactions}
                    onChange={(e) => setPreferences({ ...preferences, transactions: e.target.checked })}
                    className="h-5 w-5 rounded border-white/10"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border border-white/10 bg-white/5">
                  <div>
                    <p className="text-sm font-semibold text-white">Security Alerts</p>
                    <p className="text-xs text-slate-400 mt-1">Login attempts and security changes</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.security}
                    onChange={(e) => setPreferences({ ...preferences, security: e.target.checked })}
                    className="h-5 w-5 rounded border-white/10"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border border-white/10 bg-white/5">
                  <div>
                    <p className="text-sm font-semibold text-white">Account Updates</p>
                    <p className="text-xs text-slate-400 mt-1">Statements, rewards, and service updates</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.account}
                    onChange={(e) => setPreferences({ ...preferences, account: e.target.checked })}
                    className="h-5 w-5 rounded border-white/10"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border border-white/10 bg-white/5">
                  <div>
                    <p className="text-sm font-semibold text-white">Marketing & Offers</p>
                    <p className="text-xs text-slate-400 mt-1">Promotions and special offers</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.marketing}
                    onChange={(e) => setPreferences({ ...preferences, marketing: e.target.checked })}
                    className="h-5 w-5 rounded border-white/10"
                  />
                </div>
              </div>

              <button
                onClick={savePreferences}
                className="w-full rounded-lg bg-cyan-400 px-4 py-3 font-semibold text-slate-900 hover:bg-cyan-300 transition"
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
