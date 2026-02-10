import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBankContext } from '../context/BankContext';
import AuroraBankLogo from '../components/AuroraBankLogo';
import { API_BASE } from '../config';

function NotificationsPage() {
  const { currentUser } = useBankContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [adminMessages, setAdminMessages] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyId, setOnlyId] = useState(null);
  const [onlyMessageId, setOnlyMessageId] = useState(null);

  // Fetch admin messages for the user
  useEffect(() => {
    const fetchAdminMessages = async () => {
      if (!currentUser?.id) return;
      try {
        const res = await fetch(`${API_BASE}/admin/users/${currentUser.id}/messages`, {
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
    // Apply category filter
    if (filter === 'unread') return !n.read;
    if (filter === 'transactions') return n.type === 'transaction';
    if (filter === 'alerts') return n.type === 'admin';
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        n.title.toLowerCase().includes(query) ||
        n.detail.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  // If arrived from bell click with a specific item, show only that
  if (onlyId) {
    filteredNotifications = filteredNotifications.filter((n) => n.id === onlyId);
  } else if (onlyMessageId) {
    filteredNotifications = filteredNotifications.filter((n) => n.messageId === onlyMessageId);
  }

  // Group notifications by date
  const groupByDate = (notifications) => {
    const groups = {};
    const now = new Date();
    
    notifications.forEach(notification => {
      const date = new Date(notification.time);
      const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
      
      let key;
      if (diffDays === 0) key = 'Today';
      else if (diffDays === 1) key = 'Yesterday';
      else if (diffDays <= 7) key = 'This Week';
      else if (diffDays <= 30) key = 'This Month';
      else key = 'Earlier';
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(notification);
    });
    
    return groups;
  };

  const groupedNotifications = groupByDate(filteredNotifications);

  // Mark as read
  const markAsRead = async (id) => {
    const notif = notifications.find((n) => n.id === id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    // If this is an admin message, mark it as read on server
    if (notif && notif.type === 'admin' && notif.messageId && currentUser?.id) {
      try {
        await fetch(`${API_BASE}/admin/users/${currentUser.id}/messages/${notif.messageId}/read`, {
          method: 'PATCH',
          credentials: 'include',
        });
        // Refresh admin messages
        const res = await fetch(`${API_BASE}/admin/users/${currentUser.id}/messages`, {
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
      const unreadAdmin = adminMessages.filter((m) => !m.read && m._id);
      await Promise.all(
        unreadAdmin.map((m) =>
          fetch(`${API_BASE}/admin/users/${currentUser.id}/messages/${m._id}/read`, {
            method: 'PATCH',
            credentials: 'include',
          })
        )
      );
      // Refresh
      const res = await fetch(`${API_BASE}/admin/users/${currentUser.id}/messages`, {
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
    if (window.confirm('Are you sure you want to clear all notifications? This action cannot be undone.')) {
      setNotifications([]);
    }
  };

  // Export notifications as CSV
  const exportToCSV = () => {
    if (filteredNotifications.length === 0) {
      alert('No notifications to export');
      return;
    }

    const headers = ['Date', 'Type', 'Title', 'Details', 'Status'];
    const rows = filteredNotifications.map(n => [
      new Date(n.time).toLocaleString('en-US'),
      n.type,
      n.title,
      n.detail,
      n.read ? 'Read' : 'Unread'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aurora-bank-notifications-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Print notifications
  const handlePrint = () => {
    if (filteredNotifications.length === 0) {
      alert('No notifications to print');
      return;
    }
    window.print();
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .printable, .printable * { visibility: visible; }
          .printable { position: absolute; left: 0; top: 0; }
          .no-print { display: none !important; }
          @page { size: A4; margin: 15mm; }
          * { color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
        }
      `}</style>

      {/* Header */}
      <div className="bg-white border-b border-gray-200 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-gray-600 hover:text-gray-900 transition"
              >
                ← Back
              </button>
              <div className="h-8 w-px bg-gray-300"></div>
              <AuroraBankLogo className="h-8" />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">{currentUser?.name}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Page Title and Actions */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-600 mt-1">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
            </p>
          </div>
          
          <div className="flex gap-2 no-print">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Mark all as read
              </button>
            )}
            {filteredNotifications.length > 0 && (
              <>
                <button
                  onClick={exportToCSV}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  title="Download as CSV"
                >
                  Download
                </button>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  title="Print"
                >
                  Print
                </button>
              </>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition"
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 no-print">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 pl-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            
            {/* Filter Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                  filter === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                  filter === 'unread'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Unread {unreadCount > 0 && `(${unreadCount})`}
              </button>
              <button
                onClick={() => setFilter('transactions')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                  filter === 'transactions'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Transactions
              </button>
              <button
                onClick={() => setFilter('alerts')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                  filter === 'alerts'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Alerts
              </button>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No notifications</h3>
            <p className="text-sm text-gray-500">
              {searchQuery ? 'No results found for your search.' : 
               filter === 'unread' ? "You're all caught up!" : 
               'You don\'t have any notifications yet.'}
            </p>
          </div>
        ) : (
          <div className="printable space-y-6">
            {/* Print Header */}
            <div className="hidden print:block mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-black">Aurora Bank</h1>
                  <h2 className="text-lg font-semibold text-gray-800 mt-1">Notifications Statement</h2>
                </div>
                <div className="text-right text-sm text-gray-600">
                  <p>Account: {currentUser?.name}</p>
                  <p>Date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>
              <hr className="border-gray-300 mb-6" />
            </div>

            {/* Grouped Notifications */}
            {Object.keys(groupedNotifications).length > 0 && (
              <div className="space-y-6">
                {['Today', 'Yesterday', 'This Week', 'This Month', 'Earlier'].map(group => {
                  if (!groupedNotifications[group] || groupedNotifications[group].length === 0) return null;
                  
                  return (
                    <div key={group}>
                      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{group}</h2>
                      <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
                        {groupedNotifications[group].map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-4 hover:bg-gray-50 transition group ${
                              !notification.read ? 'bg-blue-50' : ''
                            }`}
                          >
                            <div className="flex gap-4">
                              {/* Icon */}
                              <div className="flex-shrink-0">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                                  notification.type === 'transaction' ? 'bg-green-100' :
                                  notification.type === 'admin' ? 'bg-purple-100' :
                                  'bg-gray-100'
                                }`}>
                                  {notification.icon}
                                </div>
                              </div>
                              
                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <h3 className="text-sm font-semibold text-gray-900">{notification.title}</h3>
                                      {!notification.read && (
                                        <span className="h-2 w-2 bg-blue-600 rounded-full"></span>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-600 mt-1">{notification.detail}</p>
                                    <div className="flex items-center gap-3 mt-2">
                                      <span className="text-xs text-gray-500">{formatTime(notification.time)}</span>
                                      {notification.status && (
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                          notification.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                          notification.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                          'bg-green-100 text-green-800'
                                        }`}>
                                          {notification.status}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Actions */}
                                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition no-print">
                                    {!notification.read && (
                                      <button
                                        onClick={() => markAsRead(notification.id)}
                                        className="p-1 text-gray-400 hover:text-blue-600 transition"
                                        title="Mark as read"
                                      >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                      </button>
                                    )}
                                    <button
                                      onClick={() => deleteNotification(notification.id)}
                                      className="p-1 text-gray-400 hover:text-red-600 transition"
                                      title="Delete"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Summary Stats */}
        {notifications.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 no-print">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs font-medium text-gray-500 uppercase">Total</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{notifications.length}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs font-medium text-gray-500 uppercase">Unread</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{unreadCount}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs font-medium text-gray-500 uppercase">Today</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {notifications.filter(n => {
                  const diffHours = (new Date() - new Date(n.time)) / 3600000;
                  return diffHours < 24;
                }).length}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default NotificationsPage;
