import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useBankContext } from './context/BankContext';
import AuroraBankLogo from './components/AuroraBankLogo';
import SupportChatWidget from './components/SupportChatWidget';
import './App.css';

function Dashboard() {
  const { currentUser, logout, updateProfile, updateTransactions } = useBankContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [adminMessages, setAdminMessages] = useState([]);
  const unreadCount = notifications.filter((n) => !n.read).length;

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

  const formatCurrency = (value) => {
    const numericValue = Number(value ?? 0);
    return `$${numericValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const getBalanceSizeClass = (value) => {
    const length = formatCurrency(value).length;

    if (length > 18) return 'text-xl sm:text-2xl md:text-3xl';
    if (length > 15) return 'text-2xl sm:text-3xl md:text-4xl';
    if (length > 12) return 'text-3xl sm:text-4xl md:text-5xl';
    return 'text-4xl sm:text-5xl md:text-6xl';
  };
  const [formData, setFormData] = useState({
    firstName: currentUser?.name.split(' ')[0] || '',
    lastName: currentUser?.name.split(' ').slice(1).join(' ') || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    avatarUrl: currentUser?.avatarUrl || '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [copiedField, setCopiedField] = useState('');
  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const [showRoutingNumber, setShowRoutingNumber] = useState(false);
  const [showBalance, setShowBalance] = useState(true);


  const handleToggleNotifications = async () => {
    setShowNotifications((prev) => !prev);
    // If opening the dropdown, mark unread as read locally and on server for admin messages
    if (!showNotifications && unreadCount > 0) {
      // Mark all locally as read for instant UX
      setNotifications((existing) => existing.map((n) => ({ ...n, read: true })));

      try {
        const apiBase = process.env.REACT_APP_API_BASE || '/api';
        // For admin-sourced notifications, call API to mark as read
        const unreadAdmin = adminMessages.filter((m) => !m.read && m._id);
        await Promise.all(
          unreadAdmin.map((m) =>
            fetch(`${apiBase}/admin/users/${currentUser.id}/messages/${m._id}/read`, {
              method: 'PATCH',
              credentials: 'include',
            })
          )
        );
        // Refresh admin messages after marking
        const res = await fetch(`${apiBase}/admin/users/${currentUser.id}/messages`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setAdminMessages(data.messages || []);
        }
      } catch (err) {
        console.error('Failed to mark admin messages as read:', err);
      }
    }
  };

  // Keep form data in sync with latest user profile
  useEffect(() => {
    if (!currentUser) return;
    setFormData({
      firstName: currentUser.name.split(' ')[0] || '',
      lastName: currentUser.name.split(' ').slice(1).join(' ') || '',
      email: currentUser.email || '',
      phone: currentUser.phone || '',
      avatarUrl: currentUser.avatarUrl || '',
    });
  }, [currentUser]);

  // Lazy fetch transactions when dashboard mounts (not during login)
  useEffect(() => {
    if (!currentUser || (currentUser.transactions && currentUser.transactions.length > 0)) return;
    
    const fetchTransactions = async () => {
      try {
        const apiBase = process.env.REACT_APP_API_BASE || '/api';
        const res = await fetch(`${apiBase}/transactions?limit=100`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          const transactions = (data.transactions || []).map(tx => ({
            id: tx._id,
            date: tx.date ? new Date(tx.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            description: tx.description,
            amount: tx.amount,
            category: tx.category,
            status: tx.status,
            accountType: tx.accountType,
            note: tx.note,
          }));
          // Update context with transactions
          const pendingTx = transactions.filter(t => t.status === 'pending');
          updateTransactions(transactions, pendingTx);
        }
      } catch (err) {
        console.log('Failed to lazy load transactions:', err);
      }
    };
    
    fetchTransactions();
  }, [currentUser, updateTransactions]); // Only run when user changes

  // Generate real notifications from user's actual transactions and admin messages
  useEffect(() => {
    if (!currentUser) return;

    const realNotifications = [];

    // Add admin messages to notifications (all messages go to bell)
    if (adminMessages && adminMessages.length > 0) {
      adminMessages.forEach((msg) => {
        realNotifications.push({
          id: `admin-${msg._id || msg.createdAt}`,
          title: msg.message,
          detail: 'Message from Aurora Bank',
          time: new Date(msg.createdAt).toISOString(),
          read: msg.read || false,
          icon: '📢',
          source: 'admin',
          messageId: msg._id,
          type: 'admin',
        });
      });
    }

    // Get recent transactions (last 10)
    if (currentUser.transactions && currentUser.transactions.length > 0) {
      const recentTransactions = currentUser.transactions.slice(0, 10);
      
      recentTransactions.forEach((tx) => {
        let icon = '💳';
        if (tx.amount > 0) icon = '💰';
        else if (tx.category === 'Bills') icon = '📄';
        else if (tx.category === 'Transfer') icon = '↗️';
        else if (tx.category === 'Shopping') icon = '🛍️';
        else if (tx.category === 'Dining') icon = '🍽️';

        const title = tx.status === 'pending' 
          ? `Pending: ${tx.description}`
          : tx.status === 'rejected'
          ? `Rejected: ${tx.description}`
          : tx.description;

        realNotifications.push({
          id: `tx-${tx.id}`,
          title: title,
          detail: `${tx.amount < 0 ? 'Spent' : 'Received'} $${Math.abs(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
          time: new Date(tx.date).toISOString(),
          read: false,
          icon: icon,
          type: 'transaction',
        });
      });
    }

    // Add pending transactions
    if (currentUser.pendingTransactions && currentUser.pendingTransactions.length > 0) {
      currentUser.pendingTransactions.slice(0, 5).forEach((tx) => {
        realNotifications.push({
          id: `pending-${tx.id}`,
          title: `Pending Approval`,
          detail: `${tx.description} - $${Math.abs(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
          time: new Date(tx.date || Date.now()).toISOString(),
          read: false,
          icon: '⏱',
          type: 'transaction',
        });
      });
    }

    // Sort by time (most recent first)
    realNotifications.sort((a, b) => new Date(b.time) - new Date(a.time));
    
    setNotifications(realNotifications.slice(0, 15)); // Keep top 15
  }, [currentUser, currentUser?.transactions, currentUser?.pendingTransactions, adminMessages]);

  // Handle flash notification coming from navigation state (e.g., transfer success)
  useEffect(() => {
    const flash = location.state?.notification;
    if (!flash) return;
    setNotifications((prev) => {
      const nextId = (prev[0]?.id || 0) + 1;
      return [
        {
          id: nextId,
          read: false,
          time: new Date().toISOString(),
          ...flash,
        },
        ...prev,
      ].slice(0, 10);
    });
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state, location.pathname, navigate]);

  // Fetch admin messages in real-time
  useEffect(() => {
    const fetchAdminMessages = async () => {
      try {
        const apiBase = process.env.REACT_APP_API_BASE || '/api';
        console.log('🔍 Fetching admin messages for user:', currentUser.id);
        console.log('🔍 API Base:', apiBase);
        
        const res = await fetch(`${apiBase}/admin/users/${currentUser.id}/messages`, {
          credentials: 'include',
        });
        
        console.log('📡 Response status:', res.status);
        
        if (res.ok) {
          const data = await res.json();
          console.log('✅ Admin messages received:', data.messages?.length || 0);
          setAdminMessages(data.messages || []);
        } else {
          const errorData = await res.json().catch(() => ({}));
          console.error('❌ Failed to fetch admin messages:', res.status, errorData);
        }
      } catch (err) {
        console.error('❌ Error fetching admin messages:', err);
      }
    };

    if (currentUser?.id) {
      fetchAdminMessages();
      // Poll for new admin messages every 5 seconds
      const interval = setInterval(fetchAdminMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <p>Please log in to access your dashboard</p>
          <Link to="/login" className="mt-4 inline-block text-cyan-400 hover:text-cyan-300">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  const user = currentUser;

  const recentTransactions = currentUser.transactions.slice(0, 5);

  const quickActions = [
    { title: 'Transfer Money', icon: '→', link: '/transfer' },
    { title: 'Wire Transfer', icon: '🌐', link: '/wire-transfer' },
    { title: 'Pay Bills', icon: '💳', link: '/bills' },
    { title: 'Deposit Check', icon: '📄', link: '/deposit' },
    { title: 'Card Controls', icon: '🔒', link: '/cards' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavigate = (path) => {
    setShowProfileMenu(false);
    navigate(path);
  };

  const handleSaveProfile = async () => {
    setSaveError('');
    setSavingProfile(true);
    
    // Prepare profile data
    const profileDataToSave = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      avatarUrl: formData.avatarUrl, // Include avatar in profile update
    };
    
    const result = await updateProfile(profileDataToSave);
    setSavingProfile(false);
    
    if (!result.success) {
      setSaveError(result.message || 'Update failed');
      return;
    }
    
    if (result.user) {
      setFormData({
        firstName: result.user.firstName || '',
        lastName: result.user.lastName || '',
        email: result.user.email || '',
        phone: result.user.phone || '',
        avatarUrl: result.user.avatarUrl || '',
      });
    }
    
    setEditMode(false);
    setShowSettingsModal(false);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setSaveError('Please select a valid image file.');
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5000000) {
      setSaveError('Image is too large. Please choose a file smaller than 5MB.');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      // Compress image using canvas if it's too large
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Scale down if image is very large
        const maxWidth = 800;
        const maxHeight = 800;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to data URL with compression
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        // Check compressed size
        if (compressedDataUrl.length > 2000000) {
          setSaveError('Compressed image is still too large. Please use a smaller image.');
          return;
        }
        
        setFormData((prev) => ({ ...prev, avatarUrl: compressedDataUrl }));
      };
      img.src = event.target.result;
    };
    reader.onerror = () => {
      setSaveError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleCopyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(''), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Header */}
      <header className="border-b border-white/5 bg-slate-900/50 backdrop-blur relative z-30">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-4 gap-3 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-cyan-400">
              <AuroraBankLogo />
              <span className="text-lg font-semibold tracking-tight text-slate-50">Aurora Bank, FSB</span>
            </div>
            
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={handleToggleNotifications}
                className="rounded-full border border-white/10 p-2 hover:border-cyan-200/50 transition"
              >
                <span className="relative inline-flex items-center justify-center text-lg">
                  🔔
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white text-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </span>
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl border border-white/10 bg-slate-900 shadow-2xl z-50">
                  <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                    <span className="text-sm font-semibold text-white">Notifications</span>
                    <button
                      className="text-xs text-cyan-300 hover:text-cyan-200"
                      onClick={() => setNotifications([])}
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
                    {notifications.length === 0 && (
                      <div className="p-4 text-sm text-slate-400">No new notifications</div>
                    )}
                    {notifications.map((n) => {
                      // Determine notification color
                      let notificationBg = "bg-slate-800";
                      let notificationBorder = "border-white/10";
                      if (n.title?.toLowerCase().includes("on hold") || n.detail?.toLowerCase().includes("on hold")) {
                        notificationBg = "bg-yellow-400/20";
                        notificationBorder = "border-yellow-400/50";
                      } else if (n.title?.toLowerCase().includes("blocked by") || n.detail?.toLowerCase().includes("blocked by")) {
                        notificationBg = "bg-red-500/20";
                        notificationBorder = "border-red-500/50";
                      }
                      return (
                        <div
                          key={n.id}
                          className={`p-4 hover:bg-white/5 transition cursor-pointer rounded-lg mb-2 border ${notificationBg} ${notificationBorder}`}
                          onClick={() => {
                            setShowNotifications(false);
                            const targetFilter = n.source === 'admin' ? 'admin' : (n.type || 'all');
                            navigate('/notifications', {
                              state: { filter: targetFilter, showOnlyId: n.id, messageId: n.messageId }
                            });
                          }}
                        >
                          <div className="text-sm font-semibold text-white">{n.title}</div>
                          <div className="text-xs text-slate-400 mt-1">{n.detail}</div>
                          <div className="text-[11px] text-slate-500 mt-1">{formatTime(n.time)}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t border-white/10 px-4 py-3 text-right">
                    <button
                      onClick={() => handleNavigate('/notifications')}
                      className="text-sm text-cyan-300 hover:text-cyan-200"
                    >
                      View all
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-3 transition hover:opacity-80"
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt="Profile avatar"
                    className="h-10 w-10 rounded-full object-cover border border-white/10"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-semibold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="hidden md:block">
                  <div className="text-sm font-semibold text-white">{user.name}</div>
                  <div className="text-xs text-slate-400 font-mono">{user.accountNumber || 'Loading...'}</div>
                </div>
              </button>

              {/* Profile Dropdown Menu */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl border border-white/10 bg-slate-900 shadow-2xl z-50">
                  <div className="border-b border-white/10 p-4">
                    <div className="flex items-center gap-3">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt="Profile avatar"
                          className="h-12 w-12 rounded-full object-cover border border-white/10"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-semibold text-lg">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-white">{user.name}</div>
                        <div className="text-xs text-slate-400">{user.email}</div>
                      </div>
                    </div>
                  </div>
                  <div className="p-2 space-y-1">
                    <button
                      onClick={() => {
                        setShowSettingsModal(true);
                        setShowProfileMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 rounded-lg hover:bg-white/5 text-slate-200 transition text-sm flex items-center gap-2"
                    >
                      <span>⚙️</span> Profile Settings
                    </button>
                    <button
                      onClick={() => handleNavigate('/security')}
                      className="w-full text-left px-4 py-2 rounded-lg hover:bg-white/5 text-slate-200 transition text-sm flex items-center gap-2"
                    >
                      <span>🔐</span> Security
                    </button>
                    <button
                      onClick={() => handleNavigate('/notifications')}
                      className="w-full text-left px-4 py-2 rounded-lg hover:bg-white/5 text-slate-200 transition text-sm flex items-center gap-2"
                    >
                      <span>🔔</span> Notifications
                    </button>
                    <button
                      onClick={() => handleNavigate('/transactions')}
                      className="w-full text-left px-4 py-2 rounded-lg hover:bg-white/5 text-slate-200 transition text-sm flex items-center gap-2"
                    >
                      <span>💸</span> Transactions
                    </button>
                    <div className="border-t border-white/10 my-1"></div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 rounded-lg hover:bg-red-500/10 text-red-400 transition text-sm flex items-center gap-2"
                    >
                      <span>🚪</span> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-white">Welcome back, {user.name.split(' ')[0]}</h1>
          <p className="mt-2 text-slate-300">Here's what's happening with your accounts today.</p>
        </div>

        {/* Admin Messages - Slim Container (shows latest message only) */}
        {adminMessages.length > 0 && adminMessages.filter(m => !m.read).length > 0 && (() => {
          const latestUnread = adminMessages.filter(m => !m.read).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
          const unreadCount = adminMessages.filter(m => !m.read).length;
          return (
            <div className="mb-6 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="text-xl flex-shrink-0">📢</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-cyan-200 truncate">
                    {latestUnread.message}
                  </p>
                  {unreadCount > 1 && (
                    <p className="text-xs text-cyan-300/70 mt-0.5">
                      +{unreadCount - 1} more message{unreadCount - 1 !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => navigate('/notifications', { state: { filter: 'admin' } })}
                className="text-sm font-medium text-cyan-300 hover:text-cyan-200 whitespace-nowrap flex-shrink-0"
              >
                View →
              </button>
            </div>
          );
        })()}

        {/* Admin Messages Alert removed: message content not shown on dashboard */}

        {/* Account Balance Cards */}
        <div className="mb-8 grid gap-6 md:grid-cols-3">
          <div className="card primary md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-100">Total Balance</p>
                <div className="flex items-center gap-3 mt-3">
                  <p className={`font-semibold text-white leading-tight break-words ${getBalanceSizeClass(user.balance)}`}>
                    {showBalance 
                      ? formatCurrency(user.balance)
                      : '$ •••••••'}
                  </p>
                  <button
                    onClick={() => setShowBalance(!showBalance)}
                    className="text-cyan-200 hover:text-white transition text-xl"
                    title={showBalance ? 'Hide balance' : 'Show balance'}
                  >
                    {showBalance ? '🔓' : '🔒'}
                  </button>
                </div>
              </div>
              <span className="rounded-full bg-white/10 px-4 py-2 text-xs text-cyan-50">Premium Account</span>
            </div>
            
            {/* Account Details - Prominently displayed */}
            <div className="mb-6 rounded-xl border border-cyan-400/30 bg-cyan-400/10 p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-cyan-200 mb-1">Account Number</p>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-mono font-semibold text-white">
                      {showAccountNumber 
                        ? (user.accountNumber || 'Loading...') 
                        : '••••••••••••'}
                    </p>
                    <button
                      onClick={() => setShowAccountNumber(!showAccountNumber)}
                      className="text-cyan-300 hover:text-cyan-100 transition text-sm"
                      title={showAccountNumber ? 'Hide account number' : 'Show account number'}
                    >
                      {showAccountNumber ? '�' : '🔒'}
                    </button>
                    {user.accountNumber && showAccountNumber && (
                      <button
                        onClick={() => handleCopyToClipboard(user.accountNumber, 'account')}
                        className="text-cyan-300 hover:text-cyan-100 transition"
                        title="Copy account number"
                      >
                        {copiedField === 'account' ? '✓' : '📋'}
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-cyan-200 mb-1">Routing Number</p>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-mono font-semibold text-white">
                      {showRoutingNumber 
                        ? (user.routingNumber || '026009593') 
                        : '•••••••••'}
                    </p>
                    <button
                      onClick={() => setShowRoutingNumber(!showRoutingNumber)}
                      className="text-cyan-300 hover:text-cyan-100 transition text-sm"
                      title={showRoutingNumber ? 'Hide routing number' : 'Show routing number'}
                    >
                      {showRoutingNumber ? '�' : '🔒'}
                    </button>
                    {showRoutingNumber && (
                      <button
                        onClick={() => handleCopyToClipboard(user.routingNumber || '026009593', 'routing')}
                        className="text-cyan-300 hover:text-cyan-100 transition"
                        title="Copy routing number"
                      >
                        {copiedField === 'routing' ? '✓' : '📋'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-xs text-cyan-300 mt-2">💡 Share these details to receive transfers</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-slate-300">Checking</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {showBalance 
                    ? `$${user.checking.toLocaleString('en-US', { minimumFractionDigits: 2 })}` 
                    : '$ ••••••'}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-slate-300">Savings</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {showBalance 
                    ? `$${user.savings.toLocaleString('en-US', { minimumFractionDigits: 2 })}` 
                    : '$ ••••••'}
                </p>
              </div>
            </div>
          </div>

          <div className="card secondary">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Quick Transfer</p>
            <form className="mt-4 space-y-4">
              <input
                type="text"
                placeholder="Recipient"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-400 outline-none focus:border-cyan-300/50"
              />
              <input
                type="number"
                placeholder="Amount"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-400 outline-none focus:border-cyan-300/50"
              />
              <button type="submit" className="w-full rounded-xl bg-cyan-400 py-3 text-sm font-semibold text-slate-900 transition hover:bg-cyan-300">
                Send Money
              </button>
            </form>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-white">Quick Actions</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                to={action.link}
                className="group rounded-2xl border border-white/5 bg-white/5 p-6 text-left transition hover:-translate-y-1 hover:border-cyan-200/50"
              >
                <div className="mb-3 text-3xl">{action.icon}</div>
                <div className="text-sm font-semibold text-white">{action.title}</div>
              </Link>
            ))}
          </div>
        </div>

        {/* Messages Section removed: message content not shown on dashboard */}

        {/* Recent Transactions */}
        <div className="mb-8">
          <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-white">Recent Transactions</h2>
            <Link to="/transactions" className="text-sm text-cyan-200 hover:text-cyan-100">View all →</Link>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/5 overflow-hidden">
            <div className="divide-y divide-white/5">
              {recentTransactions.map((transaction) => (
                <div key={transaction.id} className="px-4 py-4 sm:px-6 hover:bg-white/[0.03] transition">
                  <div className="flex items-start justify-between gap-3">
                    {/* Left side: Icon + Description */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg font-semibold ${
                        transaction.amount < 0 
                          ? 'bg-red-500/20 text-red-400' 
                          : 'bg-green-500/20 text-green-400'
                      }`}>
                        {transaction.amount < 0 ? '−' : '+'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-white truncate">
                          {transaction.description}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1 text-xs text-slate-400">
                          <span>{transaction.date}</span>
                          <span>•</span>
                          <span className="capitalize">{transaction.category}</span>
                          {transaction.status === 'pending' && (
                            <>
                              <span>•</span>
                              <span className="text-yellow-400">Pending</span>
                            </>
                          )}
                          {transaction.status === 'rejected' && (
                            <>
                              <span>•</span>
                              <span className="text-red-400">Rejected</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Right side: Amount */}
                    <div className="flex-shrink-0 text-right">
                      <div className={`text-sm sm:text-base font-semibold whitespace-nowrap ${
                        transaction.amount < 0 ? 'text-red-400' : 'text-green-400'
                      }`}>
                        {transaction.amount < 0 ? '−' : '+'}${Math.abs(transaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Spending Overview */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-white/5 bg-white/5 p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">Spending This Month</h3>
            <div className="space-y-4">
              {(() => {
                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();
                
                // Calculate spending by category for current month
                const spendingByCategory = {};
                let totalSpending = 0;
                
                if (currentUser?.transactions && currentUser.transactions.length > 0) {
                  currentUser.transactions.forEach((tx) => {
                    const txDate = new Date(tx.date);
                    // Only include expenses (negative amounts) from current month
                    if (tx.amount < 0 && txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
                      const category = tx.category || 'Other';
                      spendingByCategory[category] = (spendingByCategory[category] || 0) + Math.abs(tx.amount);
                      totalSpending += Math.abs(tx.amount);
                    }
                  });
                }
                
                // If no transactions this month, show zero
                if (totalSpending === 0) {
                  return (
                    <div className="text-slate-400 text-sm">
                      <p>No spending recorded this month</p>
                    </div>
                  );
                }
                
                // Convert to array and sort by amount descending
                const categories = Object.entries(spendingByCategory)
                  .map(([cat, amt]) => ({
                    category: cat,
                    amount: amt,
                    percent: Math.round((amt / totalSpending) * 100)
                  }))
                  .sort((a, b) => b.amount - a.amount);
                
                return categories.map((item) => (
                  <div key={item.category}>
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="text-slate-200">{item.category}</span>
                      <span className="text-white">${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-cyan-400" style={{ width: `${item.percent}%` }} />
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/5 p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">Financial Insights</h3>
            <div className="space-y-4">
              <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-xl">✓</span>
                  <span className="text-sm font-semibold text-green-400">On Track</span>
                </div>
                <p className="text-sm text-slate-300">You're spending 15% less than last month. Great job!</p>
              </div>
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-xl">💡</span>
                  <span className="text-sm font-semibold text-blue-400">Tip</span>
                </div>
                <p className="text-sm text-slate-300">Set up automatic transfers to savings to reach your $50K goal faster.</p>
              </div>
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-xl">📊</span>
                  <span className="text-sm font-semibold text-cyan-400">Forecast</span>
                </div>
                <p className="text-sm text-slate-300">At this rate, you'll save $3,200 by the end of the quarter.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 border-b border-white/10 bg-slate-900 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-white">Profile Settings</h2>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-white transition text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Error Message */}
              {saveError && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                  {saveError}
                </div>
              )}
              
              {/* Profile Picture Section */}
              <div className="flex flex-col items-center gap-4">
                {formData.avatarUrl ? (
                  <img
                    src={formData.avatarUrl}
                    alt="Avatar"
                    className="h-24 w-24 rounded-full object-cover border border-white/10"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold text-4xl">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <label className="px-4 py-2 rounded-lg bg-cyan-400/20 text-cyan-300 hover:bg-cyan-400/30 transition text-sm font-medium cursor-pointer">
                  Change Picture
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </label>
                <p className="text-xs text-slate-400">JPG, PNG up to 5MB (auto-compressed)</p>
              </div>

              {/* Personal Information */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Personal Information</h3>
                  {!editMode && (
                    <button
                      onClick={() => setEditMode(true)}
                      className="text-cyan-400 hover:text-cyan-300 text-sm font-medium transition"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {editMode ? (
                  // Edit Form
                  <div className="space-y-4 bg-white/5 p-4 rounded-xl border border-white/10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-slate-300 block mb-2">First Name</label>
                        <input
                          type="text"
                          value={formData.firstName}
                          onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                          className="w-full rounded-lg border border-white/10 bg-slate-800 px-4 py-2 text-white outline-none focus:border-cyan-400 transition"
                          placeholder="First name"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-slate-300 block mb-2">Last Name</label>
                        <input
                          type="text"
                          value={formData.lastName}
                          onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                          className="w-full rounded-lg border border-white/10 bg-slate-800 px-4 py-2 text-white outline-none focus:border-cyan-400 transition"
                          placeholder="Last name"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-slate-300 block mb-2">Email Address</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full rounded-lg border border-white/10 bg-slate-800 px-4 py-2 text-white outline-none focus:border-cyan-400 transition"
                        placeholder="Email"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-300 block mb-2">Phone Number</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="w-full rounded-lg border border-white/10 bg-slate-800 px-4 py-2 text-white outline-none focus:border-cyan-400 transition"
                        placeholder="Phone number"
                      />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={handleSaveProfile}
                        className="flex-1 px-4 py-2 bg-cyan-400 text-slate-900 rounded-lg font-semibold hover:bg-cyan-300 transition disabled:opacity-50"
                        disabled={savingProfile}
                      >
                        {savingProfile ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={() => setEditMode(false)}
                        className="flex-1 px-4 py-2 bg-white/10 text-slate-200 rounded-lg font-semibold hover:bg-white/20 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="space-y-3">
                    {saveError && (
                      <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                        {saveError}
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                        <p className="text-xs text-slate-400 mb-1">First Name</p>
                        <p className="text-white font-medium">{user.name.split(' ')[0]}</p>
                      </div>
                      <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                        <p className="text-xs text-slate-400 mb-1">Last Name</p>
                        <p className="text-white font-medium">{user.name.split(' ').slice(1).join(' ')}</p>
                      </div>
                    </div>
                    <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                      <p className="text-xs text-slate-400 mb-1">Email Address</p>
                      <p className="text-white font-medium">{user.email}</p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                      <p className="text-xs text-slate-400 mb-1">Phone Number</p>
                      <p className="text-white font-medium">{user.phone || 'Not provided'}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Account Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Account Information</h3>
                
                {/* Highlighted Account Details */}
                <div className="rounded-xl border-2 border-cyan-400/50 bg-cyan-400/10 p-5">
                  <p className="text-sm font-semibold text-cyan-200 mb-4">🏦 Your Account Details</p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-xs text-cyan-300 mb-1">Account Number</p>
                        <div className="flex items-center gap-2">
                          <p className="text-white font-mono font-semibold text-lg">
                            {showAccountNumber 
                              ? (user.accountNumber || 'Generating...') 
                              : '••••••••••••'}
                          </p>
                          <button
                            onClick={() => setShowAccountNumber(!showAccountNumber)}
                            className="text-cyan-300 hover:text-cyan-100 transition"
                            title={showAccountNumber ? 'Hide' : 'Show'}
                          >
                            {showAccountNumber ? '�' : '🔒'}
                          </button>
                        </div>
                      </div>
                      {user.accountNumber && showAccountNumber && (
                        <button
                          onClick={() => handleCopyToClipboard(user.accountNumber, 'account-modal')}
                          className="px-3 py-2 rounded-lg bg-cyan-400/20 hover:bg-cyan-400/30 text-cyan-200 text-sm transition"
                        >
                          {copiedField === 'account-modal' ? '✓ Copied' : '📋 Copy'}
                        </button>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-xs text-cyan-300 mb-1">Routing Number</p>
                        <div className="flex items-center gap-2">
                          <p className="text-white font-mono font-semibold text-lg">
                            {showRoutingNumber 
                              ? (user.routingNumber || '026009593') 
                              : '•••••••••'}
                          </p>
                          <button
                            onClick={() => setShowRoutingNumber(!showRoutingNumber)}
                            className="text-cyan-300 hover:text-cyan-100 transition"
                            title={showRoutingNumber ? 'Hide' : 'Show'}
                          >
                            {showRoutingNumber ? '�' : '🔒'}
                          </button>
                        </div>
                      </div>
                      {showRoutingNumber && (
                        <button
                          onClick={() => handleCopyToClipboard(user.routingNumber || '026009593', 'routing-modal')}
                          className="px-3 py-2 rounded-lg bg-cyan-400/20 hover:bg-cyan-400/30 text-cyan-200 text-sm transition"
                        >
                          {copiedField === 'routing-modal' ? '✓ Copied' : '📋 Copy'}
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-cyan-300 mt-3">💡 Share these with others to receive transfers to your Aurora Bank account</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                    <p className="text-xs text-slate-400 mb-1">Total Balance</p>
                    <p className="text-white font-semibold text-lg">
                      {showBalance 
                        ? `$${user.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}` 
                        : '$ •••••••'}
                    </p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                    <p className="text-xs text-slate-400 mb-1">Account Type</p>
                    <p className="text-white font-semibold">Personal Checking & Savings</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                    <p className="text-xs text-slate-400 mb-1">Checking Balance</p>
                    <p className="text-white font-semibold text-lg">
                      {showBalance 
                        ? `$${user.checking.toLocaleString('en-US', { minimumFractionDigits: 2 })}` 
                        : '$ ••••••'}
                    </p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                    <p className="text-xs text-slate-400 mb-1">Savings Balance</p>
                    <p className="text-white font-semibold text-lg">
                      {showBalance 
                        ? `$${user.savings.toLocaleString('en-US', { minimumFractionDigits: 2 })}` 
                        : '$ ••••••'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Security Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Security</h3>
                <button className="w-full px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 transition text-left flex items-center justify-between">
                  <span>Change Password</span>
                  <span>→</span>
                </button>
                <button className="w-full px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 transition text-left flex items-center justify-between">
                  <span>Two-Factor Authentication</span>
                  <span className="text-cyan-400">Enabled</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Support Chat Widget */}
      <SupportChatWidget />
    </div>
  );
}

export default Dashboard;
