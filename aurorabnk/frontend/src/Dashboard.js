import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useBankContext } from './context/BankContext';
import AuroraBankLogo from './components/AuroraBankLogo';
import SupportChatWidget from './components/SupportChatWidget';
import { API_BASE, getAuthHeaders } from './config';
import {
  ArrowLeftRight,
  ChartCandlestick,
  CircleDollarSign,
  CreditCard,
  Download,
  Landmark,
  ReceiptText,
  ScanLine,
} from 'lucide-react';
import './App.css';

// API base for all fetch calls
console.log('🌍 Environment:', process.env.NODE_ENV);
console.log('🔗 API Base:', API_BASE);

/* ------------------------------------------------------------------ */
/* Small presentational helpers (no business logic)                    */
/* ------------------------------------------------------------------ */
const ICONS = {
  eye: ['M15 12a3 3 0 11-6 0 3 3 0 016 0z', 'M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'],
  eyeOff: ['M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21'],
  copy: ['M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z'],
  check: ['M5 13l4 4L19 7'],
  bell: ['M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9'],
  close: ['M6 18L18 6M6 6l12 12'],
  chevron: ['M9 5l7 7-7 7'],
  megaphone: ['M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z'],
  settings: ['M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', 'M15 12a3 3 0 11-6 0 3 3 0 016 0z'],
  lock: ['M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'],
  list: ['M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'],
  logout: ['M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1'],
  shield: ['M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'],
  home: ['M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3v-6h6v6h3a1 1 0 001-1V10'],
  swap: ['M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4'],
  card: ['M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z'],
  bill: ['M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z'],
};

function Icon({ name, className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      {ICONS[name].map((d, i) => (
        <path key={i} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
      ))}
    </svg>
  );
}

// Reveal / copy row used for account + routing numbers (header card and settings modal)
function DetailRow({ label, value, shown, onToggle, onCopy, copied }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="mt-0.5 font-mono text-[15px] font-semibold tracking-wide text-slate-900">{value}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onToggle}
          title={shown ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-[#0b4a8f] focus:outline-none focus:ring-2 focus:ring-[#0b5cab]/40"
        >
          <Icon name={shown ? 'eye' : 'eyeOff'} className="w-4 h-4" />
        </button>
        {onCopy && (
          <button
            type="button"
            onClick={onCopy}
            title={`Copy ${label.toLowerCase()}`}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-[#0b4a8f] focus:outline-none focus:ring-2 focus:ring-[#0b5cab]/40"
          >
            <Icon name={copied ? 'check' : 'copy'} className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

const cardCls = 'rounded-xl border border-slate-200 bg-white';
const sectionTitleCls = 'text-lg font-semibold text-[#0a2540]';

function Dashboard() {
  const { currentUser, logout, updateProfile, updateTransactions } = useBankContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [supportChatOpen, setSupportChatOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [appInstalled, setAppInstalled] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [adminMessages, setAdminMessages] = useState([]);
  const [supportChatMessages, setSupportChatMessages] = useState([]);
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const displayMode = window.matchMedia('(display-mode: standalone)');
    const updateInstalledState = () => {
      setAppInstalled(displayMode.matches || window.navigator.standalone === true);
    };
    const handleInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const handleAppInstalled = () => {
      setAppInstalled(true);
      setInstallPrompt(null);
    };

    updateInstalledState();
    displayMode.addEventListener?.('change', updateInstalledState);
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      displayMode.removeEventListener?.('change', updateInstalledState);
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

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

  const formatTransactionDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Pending date';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getBalanceSizeClass = (value) => {
    const length = formatCurrency(value).length;

    if (length > 18) return 'text-xl sm:text-2xl md:text-3xl';
    if (length > 15) return 'text-2xl sm:text-3xl md:text-4xl';
    if (length > 12) return 'text-3xl sm:text-4xl md:text-5xl';
    return 'text-4xl sm:text-5xl md:text-6xl';
  };

  // Helper for checking/savings amounts in smaller containers
  const getAccountBalanceSizeClass = (value) => {
    const formatted = `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    const length = formatted.length;

    if (length > 15) return 'text-sm sm:text-base';
    if (length > 12) return 'text-base sm:text-lg';
    if (length > 10) return 'text-lg sm:text-xl';
    return 'text-xl sm:text-2xl';
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
              headers: getAuthHeaders(),
            })
          )
        );
        // Refresh admin messages after marking
        const res = await fetch(`${API_BASE}/admin/users/${currentUser.id}/messages`, {
          credentials: 'include',
          headers: getAuthHeaders(),
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
          headers: getAuthHeaders(),
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

    // Add support chat messages to notifications
    if (supportChatMessages && supportChatMessages.length > 0) {
      const chatAdminMessages = supportChatMessages.filter((msg) => msg.senderRole === 'admin');
      chatAdminMessages.forEach((msg) => {
        realNotifications.push({
          id: `chat-${msg._id || msg.createdAt}`,
          title: msg.message,
          detail: 'New support chat message',
          time: new Date(msg.createdAt).toISOString(),
          read: msg.read || false,
          icon: '💬',
          source: 'chat',
          type: 'chat',
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
  }, [currentUser, currentUser?.transactions, currentUser?.pendingTransactions, adminMessages, supportChatMessages]);

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
        console.log('🔍 Fetching admin messages for user:', currentUser.id);
        console.log('🔍 API Base:', API_BASE);

        const res = await fetch(`${API_BASE}/admin/users/${currentUser.id}/messages`, {
          credentials: 'include',
          headers: getAuthHeaders(),
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

  // Fetch support chat messages for notification bell
  useEffect(() => {
    const fetchSupportChatMessages = async () => {
      try {
        // First get or create conversation ID
        const convRes = await fetch(`${API_BASE}/chat/conversation`, {
          credentials: 'include',
          headers: getAuthHeaders(),
        });

        if (convRes.ok) {
          const convData = await convRes.json();
          const convId = convData.conversation?._id;

          if (convId) {
            // Fetch messages for this conversation
            const msgRes = await fetch(`${API_BASE}/chat/messages/${convId}`, {
              credentials: 'include',
              headers: getAuthHeaders(),
            });

            if (msgRes.ok) {
              const msgData = await msgRes.json();
              setSupportChatMessages(msgData.messages || []);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching support chat messages:', err);
      }
    };

    if (currentUser?.id) {
      fetchSupportChatMessages();
      // Poll for new support chat messages every 5 seconds
      const interval = setInterval(fetchSupportChatMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f6f9]">
        <div className={`${cardCls} px-8 py-10 text-center`}>
          <p className="text-slate-700">Please log in to access your dashboard</p>
          <Link to="/login" className="mt-4 inline-block rounded-lg bg-[#0b5cab] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0a4a8f]">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  const user = currentUser;

  const recentTransactions = currentUser.transactions.slice(0, 5);

  const quickActions = [
    { title: 'Transfer money', icon: ArrowLeftRight, link: '/transfer', description: 'Move money' },
    { title: 'Wire transfer', icon: Landmark, link: '/wire-transfer', description: 'Send a wire' },
    { title: 'Pay bills', icon: ReceiptText, link: '/bills', description: 'Pay a bill' },
    { title: 'Deposit a check', icon: ScanLine, link: '/deposit', description: 'Mobile deposit' },
    { title: 'Fund Stock market', icon: CircleDollarSign, link: '/crypto-deposit', description: 'Fund Stock market' },
    { title: 'Buy stocks', icon: ChartCandlestick, link: '/stocks', description: 'Invest in markets' },
    { title: 'Manage cards', icon: CreditCard, link: '/cards', description: 'Card controls' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleInstallApp = async () => {
    setShowProfileMenu(false);
    if (!installPrompt) {
      setShowInstallHelp(true);
      return;
    }

    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') setAppInstalled(true);
      setInstallPrompt(null);
    } catch (error) {
      console.error('App installation prompt failed:', error);
      setShowInstallHelp(true);
    }
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

  /* ---------------- derived display values ---------------- */
  const accountNumberDisplay = showAccountNumber ? (user.accountNumber || 'Loading...') : '••••••••••••';
  const routingNumberDisplay = showRoutingNumber ? (user.routingNumber || '026009593') : '•••••••••';
  const hidden = '$ ••••••';
  const firstName = user.name.split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

  const unreadAdmin = adminMessages.filter(m => !m.read);
  const latestUnreadAdmin = unreadAdmin.length
    ? [...unreadAdmin].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
    : null;

  const Avatar = ({ size = 'h-10 w-10', text = 'text-base', src = user.avatarUrl }) =>
    src ? (
      <img src={src} alt="Profile avatar" className={`${size} rounded-full object-cover border border-slate-300`} />
    ) : (
      <div className={`${size} ${text} flex items-center justify-center rounded-full bg-[#0a2540] font-semibold text-white`}>
        {user.name.charAt(0).toUpperCase()}
      </div>
    );

  const navLinkBase = 'rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-[#0a2540]';

  /* ---------------- spending this month ---------------- */
  const renderSpending = () => {
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
      return <p className="text-sm text-slate-500">No spending recorded this month</p>;
    }

    const categories = Object.entries(spendingByCategory)
      .map(([cat, amt]) => ({
        category: cat,
        amount: amt,
        percent: Math.round((amt / totalSpending) * 100),
      }))
      .sort((a, b) => b.amount - a.amount);

    return categories.map((item) => (
      <div key={item.category}>
        <div className="mb-1.5 flex justify-between text-sm">
          <span className="text-slate-700">{item.category}</span>
          <span className="font-semibold tabular-nums text-slate-900">${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-[#0b5cab]" style={{ width: `${item.percent}%` }} />
        </div>
      </div>
    ));
  };

  /* ---------------- transaction row bits ---------------- */
  const txMeta = (transaction) => {
    const isPending = transaction.status === 'pending';
    const isRejected = transaction.status === 'rejected';
    const isCredit = Number(transaction.amount) >= 0;
    return {
      isCredit,
      statusLabel: isPending ? 'Pending' : isRejected ? 'Declined' : 'Posted',
      statusClass: isPending ? 'bg-amber-50 text-amber-800' : isRejected ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-800',
      amountText: `${isCredit ? '+' : '−'}${formatCurrency(Math.abs(Number(transaction.amount) || 0))}`,
    };
  };

  const summaryItems = [
    {
      label: 'Available credit',
      value: `$${(user.creditAvailable || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      sub: `Card ending in ${user.creditCardLastFour || '****'}`,
      badge: 'Active',
      badgeClass: user.creditAvailable > 0 ? 'text-emerald-800 bg-emerald-50' : 'text-red-700 bg-red-50',
    },
    {
      label: 'Savings goal',
      value: `${user.savingsPercentage || 0}%`,
      sub: `$${(user.savingsCurrent || 0).toLocaleString('en-US')} of $${(user.savingsTarget || 0).toLocaleString('en-US')} target`,
      badge: user.savingsPercentage >= 75 ? 'On Track' : user.savingsPercentage >= 50 ? 'In Progress' : 'Just Started',
      badgeClass: user.savingsPercentage >= 75 ? 'text-emerald-800 bg-emerald-50' : user.savingsPercentage >= 50 ? 'text-blue-800 bg-blue-50' : 'text-amber-800 bg-amber-50',
      progress: Math.min(Math.max(user.savingsPercentage || 0, 0), 100),
    },
    {
      label: 'Next payment',
      value: `$${(user.nextPaymentAmount || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`,
      sub: `Credit card due ${user.paymentDueDate || 'N/A'}`,
      badge: user.daysUntilPayment <= 5 ? 'Due Soon' : 'Upcoming',
      badgeClass: user.daysUntilPayment <= 5 ? 'text-red-700 bg-red-50' : 'text-amber-800 bg-amber-50',
    },
    {
      label: 'Investment return',
      value: `$${(user.investmentReturn || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      sub: 'This quarter performance',
      badge: `${user.investmentReturnPercent >= 0 ? '+' : ''}${user.investmentReturnPercent || 0}%`,
      badgeClass: user.investmentReturn >= 0 ? 'text-emerald-800 bg-emerald-50' : 'text-red-700 bg-red-50',
    },
  ];

  const profileMenuItems = [
    { label: 'Profile Settings', icon: 'settings', onClick: () => { setShowSettingsModal(true); setShowProfileMenu(false); } },
    { label: 'Security', icon: 'lock', onClick: () => handleNavigate('/security') },
    { label: 'Notifications', icon: 'bell', onClick: () => handleNavigate('/notifications') },
    { label: 'Transactions', icon: 'list', onClick: () => handleNavigate('/transactions') },
  ];

  return (
    <div className="bank-dashboard min-h-screen bg-[#f4f6f9] pb-20 text-slate-900 lg:pb-0">
      {/* ============================ Header ============================ */}
      <header className="dashboard-header sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="dashboard-header-inner mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div className="flex min-w-0 items-center gap-6">
            <div className="flex items-center gap-2.5">
              <AuroraBankLogo />
              <span className="truncate text-lg font-bold tracking-tight text-[#0a2540]">Aurora Bank</span>
            </div>
            <nav aria-label="Primary navigation" className="hidden items-center gap-1 lg:flex">
              <Link to="/dashboard" className="rounded-md bg-[#e8f0fa] px-3 py-2 text-sm font-semibold text-[#0a4a8f]">Accounts</Link>
              <Link to="/transfer" className={navLinkBase}>Transfer</Link>
              <Link to="/bills" className={navLinkBase}>Pay &amp; manage</Link>
              <Link to="/cards" className={navLinkBase}>Cards</Link>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={handleToggleNotifications}
                aria-label="Notifications"
                className="relative rounded-full p-2.5 text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0b5cab]/40"
              >
                <Icon name="bell" />
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#c8102e] px-1 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="fixed left-4 right-4 top-16 z-50 max-h-96 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96">
                  <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
                    <span className="text-sm font-semibold text-[#0a2540]">Notifications</span>
                    <button
                      className="text-xs font-semibold text-[#0b5cab] hover:underline"
                      onClick={() => setNotifications([])}
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 && (
                      <div className="p-8 text-center text-sm text-slate-500">No new notifications</div>
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
                          className={`cursor-pointer border-b px-5 py-3.5 transition ${borderColor} ${bgColor}`}
                          onClick={() => {
                            setShowNotifications(false);
                            if (n.type === 'chat') {
                              setSupportChatOpen(true);
                              return;
                            }
                            const targetFilter = n.source === 'admin' ? 'admin' : (n.type || 'all');
                            navigate('/notifications', {
                              state: { filter: targetFilter, showOnlyId: n.id, messageId: n.messageId }
                            });
                          }}
                        >
                          <div className="text-sm font-semibold text-slate-900">{n.title}</div>
                          <div className="mt-0.5 text-xs text-slate-600">{n.detail}</div>
                          <div className="mt-1 text-[11px] text-slate-500">{formatTime(n.time)}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t border-slate-200 px-5 py-3 text-right">
                    <button
                      onClick={() => handleNavigate('/notifications')}
                      className="text-sm font-semibold text-[#0b5cab] hover:underline"
                    >
                      View all
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Profile */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-3 rounded-full py-1 pl-1 pr-3 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0b5cab]/40"
              >
                <Avatar />
                <div className="hidden text-left md:block">
                  <div className="text-sm font-semibold leading-tight text-slate-900">{user.name}</div>
                  <div className="font-mono text-xs text-slate-500">{user.accountNumber || 'Loading...'}</div>
                </div>
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                  <div className="flex items-center gap-3 border-b border-slate-200 p-4">
                    <Avatar size="h-12 w-12" text="text-lg" />
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-900">{user.name}</div>
                      <div className="truncate text-xs text-slate-600">{user.email}</div>
                    </div>
                  </div>
                  <div className="p-2">
                    {profileMenuItems.map((item) => (
                      <button
                        key={item.label}
                        onClick={item.onClick}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                      >
                        <Icon name={item.icon} className="w-4 h-4 text-slate-500" />
                        {item.label}
                      </button>
                    ))}
                    {!appInstalled && (
                      <button
                        onClick={handleInstallApp}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                      >
                        <Download className="h-4 w-4 text-slate-500" aria-hidden="true" />
                        Install app
                      </button>
                    )}
                    <div className="my-1 border-t border-slate-200" />
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                    >
                      <Icon name="logout" className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ============================= Main ============================= */}
      <main className="dashboard-main mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <div className="dashboard-welcome mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-[#0a2540] sm:text-3xl">Good {greeting}, {firstName}</h1>
          <p className="mt-1 text-sm text-slate-600 sm:text-base">Review your balances, recent activity, and next steps.</p>
        </div>

        {/* Admin message banner */}
        {latestUnreadAdmin && (
          <div className="mb-6 flex flex-col gap-3 rounded-xl border border-[#c9dcf2] bg-[#eef5fc] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#0b5cab]">
                <Icon name="megaphone" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#0a2540]">{latestUnreadAdmin.message}</p>
                {unreadAdmin.length > 1 && (
                  <p className="mt-0.5 text-xs text-slate-600">
                    +{unreadAdmin.length - 1} more message{unreadAdmin.length - 1 !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => navigate('/notifications', { state: { filter: 'admin' } })}
              className="flex shrink-0 items-center gap-1 text-sm font-semibold text-[#0b5cab] hover:underline"
            >
              View
              <Icon name="chevron" className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* ------------------------ Left / main column ------------------------ */}
          <div className="space-y-6 lg:col-span-2">
            {/* Accounts */}
            <section className={`dashboard-accounts ${cardCls} overflow-hidden`}>
              <div className="dashboard-balance-card flex flex-wrap items-start justify-between gap-3 bg-[#0a2540] px-5 py-5 text-white sm:px-6 sm:py-6">
                <div className="min-w-0">
                  <p className="text-sm text-slate-300">Total balance</p>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-3xl font-bold tabular-nums sm:text-4xl">
                      {showBalance ? formatCurrency(user.balance) : '$ •••••••'}
                    </p>
                    <button
                      onClick={() => setShowBalance(!showBalance)}
                      className="rounded-md p-1.5 text-white/70 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40"
                      title={showBalance ? 'Hide balance' : 'Show balance'}
                    >
                      <Icon name={showBalance ? 'eye' : 'eyeOff'} />
                    </button>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 rounded-full border border-white/25 px-3 py-1.5 text-xs font-semibold text-white">
                  <Icon name="shield" className="w-3.5 h-3.5" />
                  FDIC insured · Member FDIC
                </span>
              </div>

              <div className="divide-y divide-slate-200">
                <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
                  <div>
                    <p className="font-semibold text-[#0a2540]">Checking</p>
                    <p className="text-xs text-slate-500">Everyday Checking · ending in {String(user.accountNumber || '0000').slice(-4)}</p>
                  </div>
                  <p className={`${getAccountBalanceSizeClass(user.checking)} break-all text-right font-bold tabular-nums text-slate-900`}>
                    {showBalance ? `$${user.checking.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : hidden}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
                  <div>
                    <p className="font-semibold text-[#0a2540]">Savings</p>
                    <p className="text-xs text-slate-500">Available balance</p>
                  </div>
                  <p className={`${getAccountBalanceSizeClass(user.savings)} break-all text-right font-bold tabular-nums text-slate-900`}>
                    {showBalance ? `$${user.savings.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : hidden}
                  </p>
                </div>
                <div className="px-5 py-1 sm:px-6">
                  <div className="divide-y divide-slate-100">
                    <DetailRow
                      label="Account number"
                      value={accountNumberDisplay}
                      shown={showAccountNumber}
                      onToggle={() => setShowAccountNumber(!showAccountNumber)}
                      onCopy={user.accountNumber && showAccountNumber ? () => handleCopyToClipboard(user.accountNumber, 'account') : null}
                      copied={copiedField === 'account'}
                    />
                    <DetailRow
                      label="Routing number"
                      value={routingNumberDisplay}
                      shown={showRoutingNumber}
                      onToggle={() => setShowRoutingNumber(!showRoutingNumber)}
                      onCopy={showRoutingNumber ? () => handleCopyToClipboard(user.routingNumber || '026009593', 'routing') : null}
                      copied={copiedField === 'routing'}
                    />
                  </div>
                  <p className="pb-3 text-xs text-slate-500">Share these details to receive transfers</p>
                </div>
              </div>
            </section>

            {/* Quick actions */}
            <section className="dashboard-actions">
              <h2 className={`${sectionTitleCls} mb-3`}>Quick actions</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {quickActions.map((action) => {
                  const ActionIcon = action.icon;
                  return (
                    <Link
                      key={action.title}
                      to={action.link}
                      className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 transition hover:border-[#0b5cab] focus:outline-none focus:ring-2 focus:ring-[#0b5cab]/40"
                    >
                      <span
                        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/80 bg-gradient-to-br from-white via-[#e8f0fa] to-[#d1e0ef] text-[#0b5cab] shadow-[0_3px_0_#b9cde1,0_7px_12px_rgba(10,37,64,0.12)] transition duration-200 group-hover:-translate-y-0.5 group-hover:rotate-[-3deg] group-hover:shadow-[0_4px_0_#b9cde1,0_9px_14px_rgba(10,37,64,0.16)] group-active:translate-y-0.5 group-active:shadow-[0_1px_0_#b9cde1,0_2px_4px_rgba(10,37,64,0.12)]"
                        aria-hidden="true"
                      >
                        <ActionIcon size={19} strokeWidth={2} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-[#0a2540]">{action.title}</span>
                        <span className="hidden truncate text-xs text-slate-500 sm:block">{action.description}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* Recent transactions */}
            <section className="dashboard-activity">
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <h2 className={sectionTitleCls}>Recent transactions</h2>
                  <p className="text-sm text-slate-500">Everyday Checking · ending in {String(user.accountNumber || '0000').slice(-4)}</p>
                </div>
                <Link to="/transactions" className="flex shrink-0 items-center gap-1 text-sm font-semibold text-[#0b5cab] hover:underline">
                  View all activity
                  <Icon name="chevron" className="w-4 h-4" />
                </Link>
              </div>
              <div className={`${cardCls} overflow-hidden`}>
                {recentTransactions.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <p className="font-semibold text-[#0a2540]">No recent activity</p>
                    <p className="mt-1 text-sm text-slate-500">New account transactions will appear here.</p>
                  </div>
                ) : (
                  <>
                    <div className="hidden overflow-x-auto md:block">
                      <table className="w-full table-fixed border-collapse text-left">
                        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
                          <tr>
                            <th className="w-32 px-6 py-3">Date</th>
                            <th className="px-4 py-3">Description</th>
                            <th className="w-28 px-4 py-3">Type</th>
                            <th className="w-28 px-4 py-3">Status</th>
                            <th className="w-36 px-6 py-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {recentTransactions.map((transaction) => {
                            const m = txMeta(transaction);
                            return (
                              <tr key={transaction.id} className="transition hover:bg-slate-50">
                                <td className="px-6 py-4 text-sm text-slate-600">{formatTransactionDate(transaction.date)}</td>
                                <td className="px-4 py-4">
                                  <p className="truncate text-sm font-semibold text-[#0a2540]">{transaction.description || 'Account transaction'}</p>
                                  <p className="mt-0.5 truncate text-xs text-slate-500">{transaction.note || 'Everyday Checking'}</p>
                                </td>
                                <td className="px-4 py-4 text-sm text-slate-600">{transaction.category || 'Other'}</td>
                                <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${m.statusClass}`}>{m.statusLabel}</span></td>
                                <td className={`px-6 py-4 text-right text-sm font-bold tabular-nums ${m.isCredit ? 'text-emerald-700' : 'text-red-700'}`}>{m.amountText}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="divide-y divide-slate-100 md:hidden">
                      {recentTransactions.map((transaction) => {
                        const m = txMeta(transaction);
                        return (
                          <div key={transaction.id} className="px-4 py-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-[#0a2540]">{transaction.description || 'Account transaction'}</p>
                                <p className="mt-1 text-xs text-slate-500">{formatTransactionDate(transaction.date)} · {transaction.category || 'Other'}</p>
                              </div>
                              <p className={`shrink-0 text-sm font-bold tabular-nums ${m.isCredit ? 'text-emerald-700' : 'text-red-700'}`}>{m.amountText}</p>
                            </div>
                            <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${m.statusClass}`}>{m.statusLabel}</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
                {recentTransactions.length > 0 && (
                  <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 text-xs text-slate-500">
                    Transactions may take time to post. Pending transactions are not final.
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* ------------------------ Right rail ------------------------ */}
          <aside className="space-y-6">
            {/* Make a transfer */}
            <section className={`dashboard-transfer-card ${cardCls} p-5`}>
              <h2 className={sectionTitleCls}>Make a transfer</h2>
              <form className="mt-4 space-y-3" onSubmit={(event) => { event.preventDefault(); navigate('/transfer'); }}>
                <input
                  type="text"
                  placeholder="Recipient"
                  aria-label="Transfer recipient"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#0b5cab] focus:ring-2 focus:ring-[#0b5cab]/20"
                />
                <input
                  type="number"
                  placeholder="Amount"
                  aria-label="Transfer amount"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#0b5cab] focus:ring-2 focus:ring-[#0b5cab]/20"
                />
                <button type="submit" className="w-full rounded-lg bg-[#0b5cab] py-3 text-sm font-semibold text-white transition hover:bg-[#0a4a8f] focus:outline-none focus:ring-4 focus:ring-[#0b5cab]/25">
                  Continue to transfer
                </button>
              </form>
              <p className="mt-3 text-xs leading-5 text-slate-500">For your protection, we’ll confirm transfer details before money is sent.</p>
            </section>

            {/* Account summary */}
            <section className={`dashboard-summary ${cardCls} divide-y divide-slate-100`}>
              {summaryItems.map((item) => (
                <div key={item.label} className="p-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-slate-600">{item.label}</p>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${item.badgeClass}`}>{item.badge}</span>
                  </div>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-[#0a2540]">{item.value}</p>
                  {item.progress !== undefined && (
                    <div className="mt-2 h-1.5 rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-emerald-600" style={{ width: `${item.progress}%` }} />
                    </div>
                  )}
                  <p className="mt-1.5 text-xs text-slate-500">{item.sub}</p>
                </div>
              ))}
            </section>

            {/* Spending */}
            <section className={`${cardCls} p-5`}>
              <h3 className={`${sectionTitleCls} mb-4`}>Spending this month</h3>
              <div className="space-y-4">{renderSpending()}</div>
            </section>

            {/* Insights */}
            <section className={`${cardCls} p-5`}>
              <h3 className={`${sectionTitleCls} mb-4`}>Financial insights</h3>
              <div className="space-y-3">
                <div className="border-l-4 border-emerald-600 bg-emerald-50 px-4 py-3">
                  <p className="text-sm font-semibold text-emerald-900">On Track</p>
                  <p className="mt-0.5 text-sm text-emerald-800">You're spending 15% less than last month. Great job!</p>
                </div>
                <div className="border-l-4 border-[#0b5cab] bg-[#eef5fc] px-4 py-3">
                  <p className="text-sm font-semibold text-[#0a2540]">Tip</p>
                  <p className="mt-0.5 text-sm text-slate-700">Set up automatic transfers to savings to reach your $50K goal faster.</p>
                </div>
                <div className="border-l-4 border-slate-400 bg-slate-50 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">Forecast</p>
                  <p className="mt-0.5 text-sm text-slate-700">At this rate, you'll save $3,200 by the end of the quarter.</p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <nav aria-label="Mobile navigation" className="dashboard-mobile-nav fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4">
          {[
            { to: '/dashboard', label: 'Accounts', icon: 'home', active: true },
            { to: '/transfer', label: 'Transfer', icon: 'swap' },
            { to: '/bills', label: 'Pay', icon: 'bill' },
            { to: '/cards', label: 'Cards', icon: 'card' },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-1 py-2.5 text-xs font-medium ${item.active ? 'text-[#0b5cab]' : 'text-slate-500'}`}
            >
              <Icon name={item.icon} className="w-5 h-5" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* ========================= Settings Modal ========================= */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <h2 className="text-xl font-bold text-[#0a2540]">Profile Settings</h2>
              <button
                onClick={() => setShowSettingsModal(false)}
                aria-label="Close"
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <Icon name="close" className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-8 p-6">
              {saveError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{saveError}</div>
              )}

              {/* Profile picture */}
              <div className="flex flex-col items-center gap-3">
                <Avatar size="h-24 w-24" text="text-4xl" src={formData.avatarUrl} />
                <label className="cursor-pointer rounded-lg border border-[#0b5cab] px-5 py-2 text-sm font-semibold text-[#0b5cab] transition hover:bg-[#eef5fc]">
                  Change Picture
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </label>
                <p className="text-xs text-slate-500">JPG, PNG up to 5MB (auto-compressed)</p>
              </div>

              {/* Personal information */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className={sectionTitleCls}>Personal Information</h3>
                  {!editMode && (
                    <button onClick={() => setEditMode(true)} className="text-sm font-semibold text-[#0b5cab] hover:underline">
                      Edit
                    </button>
                  )}
                </div>

                {editMode ? (
                  <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {[
                        ['First Name', 'firstName', 'text', 'First name'],
                        ['Last Name', 'lastName', 'text', 'Last name'],
                      ].map(([label, key, type, ph]) => (
                        <div key={key}>
                          <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
                          <input
                            type={type}
                            value={formData[key]}
                            onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-[#0b5cab] focus:ring-2 focus:ring-[#0b5cab]/20"
                            placeholder={ph}
                          />
                        </div>
                      ))}
                    </div>
                    {[
                      ['Email Address', 'email', 'email', 'Email'],
                      ['Phone Number', 'phone', 'tel', 'Phone number'],
                    ].map(([label, key, type, ph]) => (
                      <div key={key}>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
                        <input
                          type={type}
                          value={formData[key]}
                          onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-[#0b5cab] focus:ring-2 focus:ring-[#0b5cab]/20"
                          placeholder={ph}
                        />
                      </div>
                    ))}
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={handleSaveProfile}
                        className="flex-1 rounded-lg bg-[#0b5cab] px-4 py-3 font-semibold text-white transition hover:bg-[#0a4a8f] disabled:opacity-50"
                        disabled={savingProfile}
                      >
                        {savingProfile ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={() => setEditMode(false)}
                        className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {[
                      ['First Name', user.name.split(' ')[0]],
                      ['Last Name', user.name.split(' ').slice(1).join(' ')],
                      ['Email Address', user.email],
                      ['Phone Number', user.phone || 'Not provided'],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between gap-4 px-4 py-3">
                        <p className="text-sm text-slate-500">{label}</p>
                        <p className="truncate text-sm font-semibold text-slate-900">{value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Account information */}
              <div className="space-y-4">
                <h3 className={sectionTitleCls}>Account Information</h3>

                <div className="rounded-xl border border-[#c9dcf2] bg-[#eef5fc] px-4">
                  <div className="divide-y divide-[#c9dcf2]">
                    <DetailRow
                      label="Account number"
                      value={showAccountNumber ? (user.accountNumber || 'Generating...') : '••••••••••••'}
                      shown={showAccountNumber}
                      onToggle={() => setShowAccountNumber(!showAccountNumber)}
                      onCopy={user.accountNumber && showAccountNumber ? () => handleCopyToClipboard(user.accountNumber, 'account-modal') : null}
                      copied={copiedField === 'account-modal'}
                    />
                    <DetailRow
                      label="Routing number"
                      value={routingNumberDisplay}
                      shown={showRoutingNumber}
                      onToggle={() => setShowRoutingNumber(!showRoutingNumber)}
                      onCopy={showRoutingNumber ? () => handleCopyToClipboard(user.routingNumber || '026009593', 'routing-modal') : null}
                      copied={copiedField === 'routing-modal'}
                    />
                  </div>
                  <p className="pb-3 text-xs text-slate-600">Share these with others to receive transfers to your Aurora Bank account</p>
                </div>

                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between gap-4 px-4 py-3">
                    <p className="text-sm text-slate-500">Total Balance</p>
                    <p className="font-bold tabular-nums text-slate-900">
                      {showBalance ? `$${user.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '$ •••••••'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-4 px-4 py-3">
                    <p className="text-sm text-slate-500">Account Type</p>
                    <p className="text-sm font-semibold text-slate-900">Personal Checking & Savings</p>
                  </div>
                  <div className="flex items-center justify-between gap-4 px-4 py-3">
                    <p className="text-sm text-slate-500">Checking Balance</p>
                    <p className="break-all font-bold tabular-nums text-slate-900">
                      {showBalance ? `$${user.checking.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : hidden}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-4 px-4 py-3">
                    <p className="text-sm text-slate-500">Savings Balance</p>
                    <p className="break-all font-bold tabular-nums text-slate-900">
                      {showBalance ? `$${user.savings.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : hidden}
                    </p>
                  </div>
                </div>
              </div>

              {/* Security */}
              <div className="space-y-3">
                <h3 className={sectionTitleCls}>Security</h3>
                <button className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3.5 text-left font-medium text-slate-700 transition hover:bg-slate-50">
                  <span>Change Password</span>
                  <Icon name="chevron" className="w-5 h-5 text-slate-400" />
                </button>
                <button className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3.5 text-left font-medium text-slate-700 transition hover:bg-slate-50">
                  <span>Two-Factor Authentication</span>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">Enabled</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showInstallHelp && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-labelledby="install-app-title">
          <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <h2 id="install-app-title" className="text-lg font-bold text-[#0a2540]">Install Aurora Bank</h2>
              <button
                type="button"
                onClick={() => setShowInstallHelp(false)}
                aria-label="Close install instructions"
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <Icon name="close" className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <p><strong className="text-slate-900">Android:</strong> Open your browser menu and choose Install app or Add to Home screen.</p>
              <p><strong className="text-slate-900">iPhone or iPad:</strong> In Safari, tap Share, then Add to Home Screen.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowInstallHelp(false)}
              className="mt-5 w-full rounded-md bg-[#0b5cab] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0a4a8f]"
            >
              Done
            </button>
          </section>
        </div>
      )}

      {/* Support Chat Widget */}
      <SupportChatWidget
        isOpen={supportChatOpen}
        onOpen={() => setSupportChatOpen(true)}
        onClose={() => setSupportChatOpen(false)}
      />
    </div>
  );
}

export default Dashboard;