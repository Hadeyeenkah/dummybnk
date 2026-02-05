import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useBankContext } from './context/BankContext';
import AuroraBankLogo from './components/AuroraBankLogo';
import SupportChatWidget from './components/SupportChatWidget';
import './App.css';

// API base for all fetch calls
const API_BASE = process.env.NODE_ENV === 'production'
  ? (process.env.REACT_APP_API_BASE || '/api')
  : 'http://localhost:5001/api';
// For Vercel, set REACT_APP_API_BASE to your backend deployment URL if needed
console.log('🌍 Environment:', process.env.NODE_ENV);
console.log('🔗 API Base:', API_BASE);

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
        // Use unified API_BASE
        // For admin-sourced notifications, call API to mark as read
        const unreadAdmin = adminMessages.filter((m) => !m.read && m._id);
        await Promise.all(
          unreadAdmin.map((m) =>
            fetch(`${API_BASE}/admin/users/${currentUser.id}/messages/${m._id}/read`, {
              method: 'PATCH',
              credentials: 'include',
            })
          )
        );
        // Refresh admin messages after marking
        const res = await fetch(`${API_BASE}/admin/users/${currentUser.id}/messages`, {
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
        const res = await fetch(`${API_BASE}/transactions?limit=100`, {
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
        
        const res = await fetch(`${API_BASE}/admin/users/${currentUser.id}/messages`, {
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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <p className="text-slate-700">Please log in to access your dashboard</p>
          <Link to="/login" className="mt-4 inline-block text-indigo-950 hover:text-black font-medium">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  const user = currentUser;

  const recentTransactions = currentUser.transactions.slice(0, 5);

  const quickActions = [
    { title: 'Transfer Money', icon: '↗️', link: '/transfer', gradient: 'from-indigo-900 to-slate-950' },
    { title: 'Wire Transfer', icon: '🌐', link: '/wire-transfer', gradient: 'from-indigo-800 to-slate-900' },
    { title: 'Pay Bills', icon: '💳', link: '/bills', gradient: 'from-emerald-500 to-teal-600' },
    { title: 'Deposit Check', icon: '📄', link: '/deposit', gradient: 'from-amber-500 to-orange-600' },
    { title: 'Card Controls', icon: '🔒', link: '/cards', gradient: 'from-rose-500 to-pink-600' },
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-xl shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-4 gap-3 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <AuroraBankLogo />
              <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-indigo-900 to-slate-950 bg-clip-text text-transparent">Aurora Bank</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={handleToggleNotifications}
                className="relative rounded-full p-2.5 hover:bg-slate-100 transition-colors"
              >
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white shadow-2xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-gradient-to-r from-slate-50 to-white">
                    <span className="text-sm font-semibold text-slate-900">Notifications</span>
                    <button
                      className="text-xs text-indigo-700 hover:text-indigo-800 font-medium"
                      onClick={() => setNotifications([])}
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 && (
                      <div className="p-6 text-center text-sm text-slate-500">No new notifications</div>
                    )}
                    {notifications.map((n) => {
                      let bgColor = "bg-white hover:bg-slate-50";
                      let borderColor = "border-slate-100";
                      if (n.title?.toLowerCase().includes("on hold") || n.detail?.toLowerCase().includes("on hold")) {
                        bgColor = "bg-amber-50 hover:bg-amber-100";
                        borderColor = "border-amber-200";
                      } else if (n.title?.toLowerCase().includes("blocked by") || n.detail?.toLowerCase().includes("blocked by")) {
                        bgColor = "bg-rose-50 hover:bg-rose-100";
                        borderColor = "border-rose-200";
                      }
                      return (
                        <div
                          key={n.id}
                          className={`px-5 py-4 border-b ${borderColor} ${bgColor} transition cursor-pointer`}
                          onClick={() => {
                            setShowNotifications(false);
                            const targetFilter = n.source === 'admin' ? 'admin' : (n.type || 'all');
                            navigate('/notifications', {
                              state: { filter: targetFilter, showOnlyId: n.id, messageId: n.messageId }
                            });
                          }}
                        >
                          <div className="text-sm font-semibold text-slate-900">{n.title}</div>
                          <div className="text-xs text-slate-600 mt-1">{n.detail}</div>
                          <div className="text-[11px] text-slate-400 mt-1">{formatTime(n.time)}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t border-slate-100 px-5 py-3 text-right bg-slate-50">
                    <button
                      onClick={() => handleNavigate('/notifications')}
                      className="text-sm text-indigo-700 hover:text-indigo-800 font-medium"
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
                className="flex items-center gap-3 transition hover:opacity-80 rounded-full hover:bg-slate-100 pr-3 py-1"
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt="Profile avatar"
                    className="h-10 w-10 rounded-full object-cover border-2 border-slate-200"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-900 to-slate-950 flex items-center justify-center text-white font-semibold shadow-md">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="hidden md:block text-left">
                  <div className="text-sm font-semibold text-slate-900">{user.name}</div>
                  <div className="text-xs text-slate-500 font-mono">{user.accountNumber || 'Loading...'}</div>
                </div>
              </button>

              {/* Profile Dropdown Menu */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 bg-white shadow-2xl z-50 overflow-hidden">
                  <div className="border-b border-slate-100 p-4 bg-gradient-to-br from-slate-50 to-white">
                    <div className="flex items-center gap-3">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt="Profile avatar"
                          className="h-12 w-12 rounded-full object-cover border-2 border-slate-200"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-900 to-slate-950 flex items-center justify-center text-white font-semibold text-lg shadow-md">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-slate-900">{user.name}</div>
                        <div className="text-xs text-slate-600">{user.email}</div>
                      </div>
                    </div>
                  </div>
                  <div className="p-2 space-y-1">
                    <button
                      onClick={() => {
                        setShowSettingsModal(true);
                        setShowProfileMenu(false);
                      }}
                      className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-slate-50 text-slate-700 transition text-sm flex items-center gap-3 font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Profile Settings
                    </button>
                    <button
                      onClick={() => handleNavigate('/security')}
                      className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-slate-50 text-slate-700 transition text-sm flex items-center gap-3 font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Security
                    </button>
                    <button
                      onClick={() => handleNavigate('/notifications')}
                      className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-slate-50 text-slate-700 transition text-sm flex items-center gap-3 font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      Notifications
                    </button>
                    <button
                      onClick={() => handleNavigate('/transactions')}
                      className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-slate-50 text-slate-700 transition text-sm flex items-center gap-3 font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Transactions
                    </button>
                    <div className="border-t border-slate-100 my-1"></div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-rose-50 text-rose-600 transition text-sm flex items-center gap-3 font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Logout
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
          <h1 className="text-3xl font-bold text-slate-900">Welcome back, {user.name.split(' ')[0]}</h1>
          <p className="mt-2 text-slate-600">Here's what's happening with your accounts today.</p>
        </div>

        {/* Admin Messages - Slim Container */}
        {adminMessages.length > 0 && adminMessages.filter(m => !m.read).length > 0 && (() => {
          const latestUnread = adminMessages.filter(m => !m.read).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
          const unreadCount = adminMessages.filter(m => !m.read).length;
          return (
            <div className="mb-6 rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-indigo-100 px-5 py-4 flex items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-indigo-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-indigo-950 truncate">
                    {latestUnread.message}
                  </p>
                  {unreadCount > 1 && (
                    <p className="text-xs text-indigo-800 mt-0.5">
                      +{unreadCount - 1} more message{unreadCount - 1 !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => navigate('/notifications', { state: { filter: 'admin' } })}
                className="text-sm font-semibold text-indigo-800 hover:text-indigo-900 whitespace-nowrap flex-shrink-0 flex items-center gap-1"
              >
                View
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          );
        })()}

        {/* Account Balance Cards */}
        <div className="mb-8 grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 rounded-2xl bg-gradient-to-br from-indigo-900 via-slate-950 to-black p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <p className="text-xs uppercase tracking-wider text-indigo-200 font-medium mb-2">Total Balance</p>
                <div className="flex items-center gap-2">
                  <p className="text-3xl font-bold text-white">
                    {showBalance 
                      ? formatCurrency(user.balance)
                      : '$ •••••••'}
                  </p>
                  <button
                    onClick={() => setShowBalance(!showBalance)}
                    className="text-white/70 hover:text-white transition ml-1"
                    title={showBalance ? 'Hide balance' : 'Show balance'}
                  >
                    {showBalance ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <span className="rounded-full bg-white/15 backdrop-blur-sm px-3 py-1 text-[10px] text-white font-medium uppercase tracking-wide">Premium</span>
            </div>
            
            {/* Account Details */}
            <div className="mb-4 rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-indigo-200 mb-1.5 font-medium uppercase tracking-wide">Account Number</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono font-semibold text-white">
                      {showAccountNumber 
                        ? (user.accountNumber || 'Loading...') 
                        : '••••••••••••'}
                    </p>
                    <button
                      onClick={() => setShowAccountNumber(!showAccountNumber)}
                      className="text-white/70 hover:text-white transition"
                      title={showAccountNumber ? 'Hide account number' : 'Show account number'}
                    >
                      {showAccountNumber ? (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      )}
                    </button>
                    {user.accountNumber && showAccountNumber && (
                      <button
                        onClick={() => handleCopyToClipboard(user.accountNumber, 'account')}
                        className="text-white/70 hover:text-white transition"
                        title="Copy account number"
                      >
                        {copiedField === 'account' ? (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-indigo-200 mb-1.5 font-medium uppercase tracking-wide">Routing Number</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono font-semibold text-white">
                      {showRoutingNumber 
                        ? (user.routingNumber || '026009593') 
                        : '•••••••••'}
                    </p>
                    <button
                      onClick={() => setShowRoutingNumber(!showRoutingNumber)}
                      className="text-white/70 hover:text-white transition"
                      title={showRoutingNumber ? 'Hide routing number' : 'Show routing number'}
                    >
                      {showRoutingNumber ? (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      )}
                    </button>
                    {showRoutingNumber && (
                      <button
                        onClick={() => handleCopyToClipboard(user.routingNumber || '026009593', 'routing')}
                        className="text-white/70 hover:text-white transition"
                        title="Copy routing number"
                      >
                        {copiedField === 'routing' ? (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-indigo-200/80 mt-2.5 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Share these details to receive transfers
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm p-4">
                <p className="text-[10px] text-indigo-200 font-medium uppercase tracking-wide mb-1">Checking</p>
                <p className="text-xl font-bold text-white">
                  {showBalance 
                    ? `$${user.checking.toLocaleString('en-US', { minimumFractionDigits: 2 })}` 
                    : '$ ••••••'}
                </p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm p-4">
                <p className="text-[10px] text-indigo-200 font-medium uppercase tracking-wide mb-1">Savings</p>
                <p className="text-xl font-bold text-white">
                  {showBalance 
                    ? `$${user.savings.toLocaleString('en-US', { minimumFractionDigits: 2 })}` 
                    : '$ ••••••'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-lg">
            <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold">Quick Transfer</p>
            <form className="mt-6 space-y-4">
              <input
                type="text"
                placeholder="Recipient"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-800 focus:ring-2 focus:ring-indigo-900/20 transition"
              />
              <input
                type="number"
                placeholder="Amount"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-800 focus:ring-2 focus:ring-indigo-900/20 transition"
              />
              <button type="submit" className="w-full rounded-xl bg-gradient-to-r from-indigo-900 to-slate-950 py-3 text-sm font-semibold text-white transition hover:from-indigo-950 hover:to-black shadow-lg shadow-indigo-900/30">
                Send Money
              </button>
            </form>
          </div>
        </div>

        {/* Account Summary Cards - More realistic banking feature */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded ${user.creditAvailable > 0 ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>Active</span>
            </div>
            <p className="text-sm text-slate-600 mb-1">Available Credit</p>
            <p className="text-2xl font-bold text-slate-900">${(user.creditAvailable || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
            <p className="text-xs text-slate-500 mt-2">Credit Card ending in {user.creditCardLastFour || '****'}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded ${user.savingsPercentage >= 75 ? 'text-emerald-700 bg-emerald-50' : user.savingsPercentage >= 50 ? 'text-indigo-700 bg-indigo-50' : 'text-amber-700 bg-amber-50'}`}>{user.savingsPercentage >= 75 ? 'On Track' : user.savingsPercentage >= 50 ? 'In Progress' : 'Just Started'}</span>
            </div>
            <p className="text-sm text-slate-600 mb-1">Savings Goal</p>
            <p className="text-2xl font-bold text-slate-900">{user.savingsPercentage || 0}%</p>
            <p className="text-xs text-slate-500 mt-2">${(user.savingsCurrent || 0).toLocaleString('en-US')} of ${(user.savingsTarget || 0).toLocaleString('en-US')} target</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded ${user.daysUntilPayment <= 5 ? 'text-red-600 bg-red-50' : 'text-amber-600 bg-amber-50'}`}>{user.daysUntilPayment <= 5 ? 'Due Soon' : 'Upcoming'}</span>
            </div>
            <p className="text-sm text-slate-600 mb-1">Next Payment</p>
            <p className="text-2xl font-bold text-slate-900">${(user.nextPaymentAmount || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
            <p className="text-xs text-slate-500 mt-2">Credit card due {user.paymentDueDate || 'N/A'}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-violet-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded ${user.investmentReturn >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>{user.investmentReturnPercent >= 0 ? '+' : ''}{user.investmentReturnPercent || 0}%</span>
            </div>
            <p className="text-sm text-slate-600 mb-1">Investment Return</p>
            <p className="text-2xl font-bold text-slate-900">${(user.investmentReturn || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
            <p className="text-xs text-slate-500 mt-2">This quarter performance</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="mb-6 text-xl font-bold text-slate-900">Quick Actions</h2>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                to={action.link}
                className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 text-center transition hover:shadow-lg hover:border-indigo-300"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-5 transition-opacity`}></div>
                <div className="relative">
                  <div className="mb-2 text-2xl">{action.icon}</div>
                  <div className="text-xs font-semibold text-slate-900">{action.title}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="mb-8">
          <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-900">Recent Transactions</h2>
            <Link to="/transactions" className="text-sm text-indigo-800 hover:text-indigo-900 font-semibold flex items-center gap-1">
              View all
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-lg">
            <div className="divide-y divide-slate-100">
              {recentTransactions.map((transaction) => (
                <div key={transaction.id} className="px-6 py-5 hover:bg-slate-50 transition">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-semibold shadow-sm ${
                        transaction.amount < 0 
                          ? 'bg-rose-100 text-rose-600' 
                          : 'bg-emerald-100 text-emerald-600'
                      }`}>
                        {transaction.amount < 0 ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-slate-900 truncate">
                          {transaction.description}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-1 text-xs text-slate-500">
                          <span>{transaction.date}</span>
                          <span>•</span>
                          <span className="capitalize">{transaction.category}</span>
                          {transaction.status === 'pending' && (
                            <>
                              <span>•</span>
                              <span className="text-amber-600 font-medium">Pending</span>
                            </>
                          )}
                          {transaction.status === 'rejected' && (
                            <>
                              <span>•</span>
                              <span className="text-rose-600 font-medium">Rejected</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-shrink-0 text-right">
                      <div className={`text-base font-bold whitespace-nowrap ${
                        transaction.amount < 0 ? 'text-rose-600' : 'text-emerald-600'
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

        {/* Spending Overview & Insights */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
            <h3 className="mb-6 text-lg font-bold text-slate-900">Spending This Month</h3>
            <div className="space-y-5">
              {(() => {
                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();
                
                const spendingByCategory = {};
                let totalSpending = 0;
                
                if (currentUser?.transactions && currentUser.transactions.length > 0) {
                  currentUser.transactions.forEach((tx) => {
                    const txDate = new Date(tx.date);
                    if (tx.amount < 0 && txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
                      const category = tx.category || 'Other';
                      spendingByCategory[category] = (spendingByCategory[category] || 0) + Math.abs(tx.amount);
                      totalSpending += Math.abs(tx.amount);
                    }
                  });
                }
                
                if (totalSpending === 0) {
                  return (
                    <div className="text-slate-500 text-sm">
                      <p>No spending recorded this month</p>
                    </div>
                  );
                }
                
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
                      <span className="text-slate-700 font-medium">{item.category}</span>
                      <span className="text-slate-900 font-semibold">${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-indigo-800 to-slate-950" style={{ width: `${item.percent}%` }} />
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
            <h3 className="mb-6 text-lg font-bold text-slate-900">Financial Insights</h3>
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-5">
                <div className="mb-2 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm font-bold text-emerald-900">On Track</span>
                </div>
                <p className="text-sm text-emerald-800">You're spending 15% less than last month. Great job!</p>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-indigo-100 p-5">
                <div className="mb-2 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-indigo-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <span className="text-sm font-bold text-indigo-950">Tip</span>
                </div>
                <p className="text-sm text-indigo-900">Set up automatic transfers to savings to reach your $50K goal faster.</p>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-slate-100 p-5">
                <div className="mb-2 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-indigo-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <span className="text-sm font-bold text-indigo-950">Forecast</span>
                </div>
                <p className="text-sm text-indigo-900">At this rate, you'll save $3,200 by the end of the quarter.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 border-b border-slate-200 bg-white px-6 py-5 flex items-center justify-between rounded-t-3xl">
              <h2 className="text-2xl font-bold text-slate-900">Profile Settings</h2>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-8">
              {/* Error Message */}
              {saveError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  {saveError}
                </div>
              )}
              
              {/* Profile Picture Section */}
              <div className="flex flex-col items-center gap-4">
                {formData.avatarUrl ? (
                  <img
                    src={formData.avatarUrl}
                    alt="Avatar"
                    className="h-24 w-24 rounded-full object-cover border-4 border-slate-200"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-gradient-to-br from-indigo-900 to-slate-950 flex items-center justify-center text-white font-bold text-4xl shadow-lg">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <label className="px-5 py-2.5 rounded-xl bg-indigo-100 text-indigo-900 hover:bg-indigo-200 transition text-sm font-semibold cursor-pointer">
                  Change Picture
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </label>
                <p className="text-xs text-slate-500">JPG, PNG up to 5MB (auto-compressed)</p>
              </div>

              {/* Personal Information */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">Personal Information</h3>
                  {!editMode && (
                    <button
                      onClick={() => setEditMode(true)}
                      className="text-indigo-800 hover:text-indigo-900 text-sm font-semibold transition"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {editMode ? (
                  <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-slate-700 font-medium block mb-2">First Name</label>
                        <input
                          type="text"
                          value={formData.firstName}
                          onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-indigo-800 focus:ring-2 focus:ring-indigo-900/20 transition"
                          placeholder="First name"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-slate-700 font-medium block mb-2">Last Name</label>
                        <input
                          type="text"
                          value={formData.lastName}
                          onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-indigo-800 focus:ring-2 focus:ring-indigo-900/20 transition"
                          placeholder="Last name"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-slate-700 font-medium block mb-2">Email Address</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-indigo-800 focus:ring-2 focus:ring-indigo-900/20 transition"
                        placeholder="Email"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-700 font-medium block mb-2">Phone Number</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-indigo-800 focus:ring-2 focus:ring-indigo-900/20 transition"
                        placeholder="Phone number"
                      />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={handleSaveProfile}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-900 to-slate-950 text-white rounded-xl font-semibold hover:from-indigo-950 hover:to-black transition disabled:opacity-50 shadow-lg shadow-indigo-900/30"
                        disabled={savingProfile}
                      >
                        {savingProfile ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={() => setEditMode(false)}
                        className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <p className="text-xs text-slate-500 mb-1 font-medium">First Name</p>
                        <p className="text-slate-900 font-semibold">{user.name.split(' ')[0]}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <p className="text-xs text-slate-500 mb-1 font-medium">Last Name</p>
                        <p className="text-slate-900 font-semibold">{user.name.split(' ').slice(1).join(' ')}</p>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <p className="text-xs text-slate-500 mb-1 font-medium">Email Address</p>
                      <p className="text-slate-900 font-semibold">{user.email}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <p className="text-xs text-slate-500 mb-1 font-medium">Phone Number</p>
                      <p className="text-slate-900 font-semibold">{user.phone || 'Not provided'}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Account Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900">Account Information</h3>
                
                <div className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-indigo-100 p-6">
                  <p className="text-sm font-bold text-indigo-950 mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Your Account Details
                  </p>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-xs text-indigo-900 mb-2 font-medium">Account Number</p>
                        <div className="flex items-center gap-2">
                          <p className="text-slate-900 font-mono font-bold text-base">
                            {showAccountNumber 
                              ? (user.accountNumber || 'Generating...') 
                              : '••••••••••••'}
                          </p>
                          <button
                            onClick={() => setShowAccountNumber(!showAccountNumber)}
                            className="text-indigo-800 hover:text-indigo-900 transition"
                            title={showAccountNumber ? 'Hide' : 'Show'}
                          >
                            {showAccountNumber ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                      {user.accountNumber && showAccountNumber && (
                        <button
                          onClick={() => handleCopyToClipboard(user.accountNumber, 'account-modal')}
                          className="px-3 py-2 rounded-xl bg-indigo-200 hover:bg-indigo-300 text-indigo-950 text-sm font-semibold transition flex items-center gap-1"
                        >
                          {copiedField === 'account-modal' ? (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Copied
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              Copy
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-xs text-indigo-900 mb-2 font-medium">Routing Number</p>
                        <div className="flex items-center gap-2">
                          <p className="text-slate-900 font-mono font-bold text-base">
                            {showRoutingNumber 
                              ? (user.routingNumber || '026009593') 
                              : '•••••••••'}
                          </p>
                          <button
                            onClick={() => setShowRoutingNumber(!showRoutingNumber)}
                            className="text-indigo-800 hover:text-indigo-900 transition"
                            title={showRoutingNumber ? 'Hide' : 'Show'}
                          >
                            {showRoutingNumber ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                      {showRoutingNumber && (
                        <button
                          onClick={() => handleCopyToClipboard(user.routingNumber || '026009593', 'routing-modal')}
                          className="px-3 py-2 rounded-xl bg-indigo-200 hover:bg-indigo-300 text-indigo-950 text-sm font-semibold transition flex items-center gap-1"
                        >
                          {copiedField === 'routing-modal' ? (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Copied
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              Copy
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-indigo-900 mt-4 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Share these with others to receive transfers to your Aurora Bank account
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1 font-medium">Total Balance</p>
                    <p className="text-slate-900 font-bold text-lg">
                      {showBalance 
                        ? `$${user.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}` 
                        : '$ •••••••'}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1 font-medium">Account Type</p>
                    <p className="text-slate-900 font-semibold">Personal Checking & Savings</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1 font-medium">Checking Balance</p>
                    <p className="text-slate-900 font-bold text-lg">
                      {showBalance 
                        ? `$${user.checking.toLocaleString('en-US', { minimumFractionDigits: 2 })}` 
                        : '$ ••••••'}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1 font-medium">Savings Balance</p>
                    <p className="text-slate-900 font-bold text-lg">
                      {showBalance 
                        ? `$${user.savings.toLocaleString('en-US', { minimumFractionDigits: 2 })}` 
                        : '$ ••••••'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Security Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900">Security</h3>
                <button className="w-full px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition text-left flex items-center justify-between font-medium">
                  <span>Change Password</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <button className="w-full px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition text-left flex items-center justify-between font-medium">
                  <span>Two-Factor Authentication</span>
                  <span className="text-emerald-600 font-semibold">Enabled</span>
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