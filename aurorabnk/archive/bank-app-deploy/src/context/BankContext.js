import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import API_URL from '../config';

const BankContext = createContext();

export const useBankContext = () => {
  const context = useContext(BankContext);
  if (!context) {
    throw new Error('useBankContext must be used within a BankProvider');
  }
  return context;
};

export const BankProvider = ({ children }) => {
  // Current logged-in user
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  // Network/backend availability (only setter used by code)
  const [, setBackendError] = useState(null);
  
  // All users data
  const [users, setUsers] = useState([
    {
      id: 1,
      name: 'Jamie Doe',
      email: 'jamie@example.com',
      accountNumber: '****4892',
      balance: 48920.15,
      checking: 18400.00,
      savings: 30520.15,
      transactions: [
        { id: 1, date: '2025-12-20', description: 'Grocery Store', amount: -152.43, category: 'Shopping', status: 'completed' },
        { id: 2, date: '2025-12-19', description: 'Salary Deposit', amount: 5200.00, category: 'Income', status: 'completed' },
        { id: 3, date: '2025-12-18', description: 'Coffee Shop', amount: -8.50, category: 'Dining', status: 'completed' },
      ],
      pendingTransactions: [],
    },
    {
      id: 2,
      name: 'Alex Smith',
      email: 'alex@example.com',
      accountNumber: '****3421',
      balance: 25300.50,
      checking: 12500.00,
      savings: 12800.50,
      transactions: [
        { id: 1, date: '2025-12-21', description: 'Rent Payment', amount: -1500.00, category: 'Bills', status: 'completed' },
        { id: 2, date: '2025-12-20', description: 'Freelance Income', amount: 3200.00, category: 'Income', status: 'completed' },
      ],
      pendingTransactions: [],
    },
  ]);

  // Admin pending approvals
  const [pendingApprovals, setPendingApprovals] = useState([]);

  // Backend: helper to call API with cookies
  // Start with configured API URL (from frontend/src/config.js) or env override
  const getApiBase = () => {
    const envBase = process.env.REACT_APP_API_BASE || API_URL || '/api';
     return process.env.REACT_APP_API_BASE || 'https://aurora-wine-pi.vercel.app/api';
  };

  const [apiBase, setApiBase] = useState(getApiBase());

  // Try to detect a reachable backend and fall back to relative `/api` if unreachable.
  const tryResolveApiBase = useCallback(async () => {
    const candidates = [getApiBase(), '/api'];
    const timeoutMs = 1500;

    const tryFetch = async (url) => {
      try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeoutMs);
        const res = await fetch(url, { method: 'GET', mode: 'cors', signal: controller.signal });
        clearTimeout(id);
        return res;
      } catch (e) {
        return null;
      }
    };

    for (const candidate of candidates) {
      // normalize candidate to ensure it doesn't double `/api`
        const normalized = candidate.endsWith('/api') ? candidate : `${candidate}/api`;
      // try common health endpoints
      const healthUrls = [
        `${normalized}/health`,
        `${normalized}/auth/health`,
        `${normalized}`,
      ];
      for (const u of healthUrls) {
        const r = await tryFetch(u);
        if (r && (r.ok || r.status === 404 || r.status === 401)) {
          // 404 or 401 still indicates host reachable (server responded)
          setApiBase(normalized);
          setBackendError(null);
          console.log('🔍 Resolved API base to', normalized);
          return;
        }
      }
    }

    // Nothing reachable: fall back to relative proxy and set backend error
    setApiBase('/api');
    setBackendError('Backend unreachable. Using relative `/api` proxy. Start backend or set REACT_APP_API_BASE.');
    console.warn('⚠️  Backend not reachable at configured hosts; using /api fallback');
  }, []);


  const fetchProfile = useCallback(async () => {
    try {
      const profileUrl = `${apiBase}/auth/profile`;
      const token = localStorage.getItem('authToken');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      console.log('📡 Fetching profile from:', profileUrl);
      const res = await fetch(profileUrl, {
        method: 'GET',
        headers,
        credentials: 'include',
      });
      // Clear previous backend error on successful network connection
      setBackendError(null);

      console.log('📡 Profile response status:', res.status);

      // If not logged in, avoid noisy errors and just return
      if (res.status === 401 || res.status === 403) {
        console.warn('⚠️  Profile fetch failed with status:', res.status);
        setIsAuthenticated(false);
        setCurrentUser(null);
        return false;
      }

      if (!res.ok) {
        console.error('❌ Profile fetch failed with status:', res.status);
        setIsAuthenticated(false);
        setCurrentUser(null);
        return false;
      }

      // Verify response is JSON
      const contentType = res.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        const text = await res.text();
        console.error('❌ Non-JSON response:', text.substring(0, 200));
        setIsAuthenticated(false);
        setCurrentUser(null);
        return false;
      }

      const data = await res.json();
      console.log('✅ Profile data received:', { email: data.user?.email });
      
      // Don't fetch transactions on login - they'll be fetched when dashboard mounts (lazy load)
      let transactions = [];
      let pendingTransactions = [];
      
      setCurrentUser({
        id: data.user._id || data.user.id,
        name: `${data.user.firstName} ${data.user.lastName}`.trim() || data.user.email,
        email: data.user.email,
        phone: data.user.phone,
        avatarUrl: data.user.avatarUrl,
        role: data.user.role,
        accountNumber: data.user.accountNumber || 'Generating...',
        routingNumber: data.user.routingNumber || '026009593',
        balance: data.user.balance ?? 0,
        checking: (data.user.accounts?.find(a => a.accountType==='checking')?.balance) ?? 0,
        savings: (data.user.accounts?.find(a => a.accountType==='savings')?.balance) ?? 0,
        transactions,
        pendingTransactions,
      });
      setIsAuthenticated(true);
      return true;
    } catch (err) {
      console.error('❌ Profile fetch error:', err);
      // If network failure, set backendError so UI can inform user
      if (err instanceof TypeError) {
        setBackendError('Unable to contact backend server. Please ensure the backend is running on the configured host (usually http://localhost:5001).');
      } else {
        setBackendError(String(err));
      }
      setIsAuthenticated(false);
      setCurrentUser(null);
      return false;
    }
  }, [apiBase]);

  // Initialize auth on mount - check if user has an active session
  useEffect(() => {
    const initializeAuth = async () => {
      setIsInitializing(true);
      // Resolve API base before attempting profile fetch
      await tryResolveApiBase();
      await fetchProfile();
      setIsInitializing(false);
    };
    initializeAuth();
  }, [fetchProfile, tryResolveApiBase]);

  // Login function via backend
  const login = async (email, password) => {
    try {
      console.log('🔐 Login attempt:', email);
      const loginUrl = `${apiBase}/auth/login`;
      console.log('📡 Calling:', loginUrl);
      
      const res = await fetch(loginUrl, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      // Clear previous backend error when we get a network response
      setBackendError(null);
      
      console.log('📡 Login response status:', res.status);
      console.log('🍪 Response headers:', Array.from(res.headers.entries()));
      
      if (!res.ok) {
        // Check if response is JSON
        const contentType = res.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          const errorData = await res.json();
          console.error('❌ Login failed:', errorData);
          return { success: false, message: errorData.message || `Login failed (${res.status})` };
        } else {
          const text = await res.text();
          console.error('❌ Non-JSON error response:', text.substring(0, 200));
          return { success: false, message: `Server error: ${res.status} - ${res.statusText}` };
        }
      }
      
      // Verify response is JSON
      const contentType = res.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        const text = await res.text();
        console.error('❌ Non-JSON success response:', text.substring(0, 200));
        return { success: false, message: 'Invalid server response' };
      }
      
      const data = await res.json();
      // Store JWT if present
      if (data.token) {
        localStorage.setItem('authToken', data.token);
        console.log('✅ Token stored:', data.token);
      }
      console.log('✅ Login successful, fetching profile...');
      // Fetch profile immediately (no delay - cookies are already set)
      const profileSuccess = await fetchProfile();
      if (profileSuccess) {
        console.log('✅ Profile fetched, user authenticated');
      } else {
        console.warn('⚠️  Profile fetch returned false, but login succeeded');
      }
      return { success: true, user: data.user };
    } catch (err) {
      console.error('❌ Login error:', err);
      if (err instanceof TypeError) {
        setBackendError('Unable to contact backend server. Please ensure the backend is running on the configured host (usually http://localhost:5001).');
        return { success: false, message: 'Network error: cannot reach backend server.' };
      }
      setBackendError(String(err));
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  // Signup function
  const signup = async (userData) => {
    try {
      const nameParts = userData.name?.trim().split(/\s+/) || [];
      const firstName = nameParts[0] || userData.firstName || '';
      const lastName = nameParts.slice(1).join(' ') || userData.lastName || 'User';
      
      const res = await fetch(`${apiBase}/auth/register`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userData.email,
          password: userData.password,
          firstName,
          lastName,
          phone: userData.phone || undefined,
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return { success: false, message: errorData.message || errorData.errors?.[0]?.msg || 'Registration failed' };
      }
      
      const data = await res.json();

      // Server now sets auth cookies on register; fetch profile to hydrate state.
      await fetchProfile();

      return { success: true, message: data.message, verificationLink: data.verificationLink };
    } catch (err) {
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await fetch(`${apiBase}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {}
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  // Update profile
  const updateProfile = async (profileData) => {
    try {
      const res = await fetch(`${apiBase}/auth/profile`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return { success: false, message: errorData.message || 'Update failed' };
      }
      const data = await res.json();
      setCurrentUser((prev) => ({
        ...prev,
        name: `${data.user.firstName} ${data.user.lastName}`.trim() || data.user.email,
        email: data.user.email,
        phone: data.user.phone,
        avatarUrl: data.user.avatarUrl,
      }));
      return { success: true, message: data.message, user: data.user };
    } catch (err) {
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  // Add transaction (optionally require admin approval)
  const addTransaction = (userId, transaction, requireApproval = false) => {
    const needsApproval = requireApproval || Math.abs(transaction.amount) > 1000;
    const transactionId = Date.now();

    setUsers((prevUsers) => {
      const nextUsers = prevUsers.map((user) => {
        if (user.id !== userId) return user;

        if (needsApproval) {
          const pendingTransaction = {
            ...transaction,
            id: transactionId,
            status: 'pending',
            userId,
            userName: user.name,
          };
          return {
            ...user,
            transactions: [pendingTransaction, ...user.transactions],
            pendingTransactions: [...user.pendingTransactions, pendingTransaction],
          };
        }

        const completedTransaction = {
          ...transaction,
          id: transactionId,
          status: 'completed',
        };

        return {
          ...user,
          balance: user.balance + transaction.amount,
          checking: transaction.accountType === 'checking'
            ? user.checking + transaction.amount
            : user.checking,
          savings: transaction.accountType === 'savings'
            ? user.savings + transaction.amount
            : user.savings,
          transactions: [completedTransaction, ...user.transactions],
        };
      });

      const updatedUser = nextUsers.find((u) => u.id === userId);
      if (updatedUser && currentUser?.id === userId) {
        setCurrentUser(updatedUser);
      }

      if (needsApproval) {
        const pendingTransaction = nextUsers
          .find((u) => u.id === userId)
          ?.pendingTransactions.find((t) => t.id === transactionId);
        if (pendingTransaction) {
          setPendingApprovals((prev) => [...prev, pendingTransaction]);
        }
      }

      return nextUsers;
    });
  };

  // Admin approve transaction
  const approveTransaction = (transactionId) => {
    const approval = pendingApprovals.find((t) => t.id === transactionId);
    if (!approval) return;

    setUsers((prevUsers) => {
      const nextUsers = prevUsers.map((user) => {
        if (user.id !== approval.userId) return user;

        const updatedTransactions = user.transactions.map((t) =>
          t.id === transactionId ? { ...t, status: 'completed' } : t
        );

        const alreadyPresent = updatedTransactions.some((t) => t.id === transactionId);
        const transactionsWithApproval = alreadyPresent
          ? updatedTransactions
          : [{ ...approval, status: 'completed' }, ...updatedTransactions];

        const updatedUser = {
          ...user,
          balance: user.balance + approval.amount,
          checking:
            approval.accountType === 'checking'
              ? user.checking + approval.amount
              : user.checking,
          savings:
            approval.accountType === 'savings'
              ? user.savings + approval.amount
              : user.savings,
          transactions: transactionsWithApproval,
          pendingTransactions: user.pendingTransactions.filter((t) => t.id !== transactionId),
        };

        return updatedUser;
      });

      const updatedUser = nextUsers.find((u) => u.id === approval.userId);
      if (updatedUser && currentUser?.id === approval.userId) {
        setCurrentUser(updatedUser);
      }

      return nextUsers;
    });

    setPendingApprovals((prev) => prev.filter((t) => t.id !== transactionId));
  };

  // Admin reject transaction
  const rejectTransaction = (transactionId) => {
    setUsers((prevUsers) => {
      let affectedUserId = null;
      const nextUsers = prevUsers.map((user) => {
        const owns = user.pendingTransactions.some((t) => t.id === transactionId);
        if (!owns) return user;

        affectedUserId = user.id;

        return {
          ...user,
          transactions: user.transactions.map((t) =>
            t.id === transactionId ? { ...t, status: 'rejected' } : t
          ),
          pendingTransactions: user.pendingTransactions.filter((t) => t.id !== transactionId),
        };
      });

      if (affectedUserId) {
        const updatedUser = nextUsers.find((u) => u.id === affectedUserId);
        if (updatedUser && currentUser?.id === affectedUserId) {
          setCurrentUser(updatedUser);
        }
      }

      return nextUsers;
    });

    setPendingApprovals((prev) => prev.filter((t) => t.id !== transactionId));
  };

  // Admin update user balance
  const updateUserBalance = (userId, field, amount) => {
    setUsers(prevUsers => prevUsers.map(user => {
      if (user.id === userId) {
        const updatedUser = { ...user };
        if (field === 'checking') {
          updatedUser.checking = amount;
          updatedUser.balance = amount + user.savings;
        } else if (field === 'savings') {
          updatedUser.savings = amount;
          updatedUser.balance = user.checking + amount;
        } else if (field === 'balance') {
          updatedUser.balance = amount;
        }
        return updatedUser;
      }
      return user;
    }));
  };

  // Transfer between own accounts (instant) or to external bank (pending approval)
  const transferMoney = ({
    fromUserId,
    amount,
    fromAccount = 'checking',
    transferType = 'external',
    toAccount,
    recipient,
    note,
  }) => {
    const existingSender = users.find((u) => u.id === fromUserId);
    const fallbackSender = existingSender || (currentUser?.id === fromUserId
      ? {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          accountNumber: currentUser.accountNumber || '****0000',
          balance: currentUser.balance || 0,
          checking: currentUser.checking || 0,
          savings: currentUser.savings || 0,
          transactions: currentUser.transactions || [],
          pendingTransactions: [],
        }
      : null);

    if (!fallbackSender) {
      return { success: true, message: 'Transfer initiated successfully', receipt: { status: 'accepted' } };
    }

    const numericAmount = Number(amount);
    if (!numericAmount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      return { success: false, message: 'Enter a valid amount' };
    }

    const available = fromAccount === 'checking' ? fallbackSender.checking : fallbackSender.savings;
    if (available < numericAmount) {
      return { success: false, message: 'Insufficient funds' };
    }

    const today = new Date().toISOString().split('T')[0];

    const receiptBase = {
      date: today,
      amount: numericAmount,
      fromAccount,
      transferType,
      note,
    };

    if (transferType === 'internal') {
      if (!toAccount || toAccount === fromAccount) {
        return { success: false, message: 'Select a different destination account' };
      }

      const debitTx = {
        date: today,
        description: `Transfer to ${toAccount === 'checking' ? 'Checking' : 'Savings'}`,
        amount: -numericAmount,
        category: 'Internal Transfer',
        accountType: fromAccount,
        note,
      };

      const creditTx = {
        date: today,
        description: `Transfer from ${fromAccount === 'checking' ? 'Checking' : 'Savings'}`,
        amount: numericAmount,
        category: 'Internal Transfer',
        accountType: toAccount,
        note,
      };

      // Save debit transaction to backend
      const saveDebit = fetch(`${apiBase}/transactions`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: -numericAmount,
          description: debitTx.description,
          category: debitTx.category,
          accountType: fromAccount,
          status: 'completed',
          transferType: 'internal',
          note,
          date: today,
        }),
      }).catch(err => console.error('Failed to save debit:', err));

      // Save credit transaction to backend
      const saveCredit = fetch(`${apiBase}/transactions`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numericAmount,
          description: creditTx.description,
          category: creditTx.category,
          accountType: toAccount,
          status: 'completed',
          transferType: 'internal',
          note,
          date: today,
        }),
      }).catch(err => console.error('Failed to save credit:', err));

      Promise.all([saveDebit, saveCredit]).then(() => {
        // Refresh profile to get updated balances and transactions
        fetchProfile();
      });

      setUsers((prevUsers) => {
        const nextUsers = prevUsers.map((user) => {
          if (user.id !== fromUserId) return user;

          const updatedChecking = user.checking
            + (fromAccount === 'checking' ? -numericAmount : 0)
            + (toAccount === 'checking' ? numericAmount : 0);
          const updatedSavings = user.savings
            + (fromAccount === 'savings' ? -numericAmount : 0)
            + (toAccount === 'savings' ? numericAmount : 0);

          return {
            ...user,
            balance: updatedChecking + updatedSavings,
            checking: updatedChecking,
            savings: updatedSavings,
            transactions: [debitTx, creditTx, ...user.transactions],
          };
        });

        const updatedUser = nextUsers.find((u) => u.id === fromUserId);
        if (updatedUser && currentUser?.id === fromUserId) {
          setCurrentUser(updatedUser);
        }

        return nextUsers;
      });

      return {
        success: true,
        message: 'Transfer completed',
        receipt: {
          ...receiptBase,
          toAccount,
          status: 'completed',
          reference: `${fromUserId}-${Date.now()}`,
        },
      };
    }

    // External transfer: send for admin approval and log in history immediately
    const pendingTx = {
      id: Date.now(),
      date: today,
      description: `Transfer to ${recipient?.name || 'External Account'}`,
      amount: -numericAmount,
      category: 'External Transfer',
      accountType: fromAccount,
      status: 'pending',
      userId: fromUserId,
      userName: fallbackSender.name,
      meta: {
        recipientName: recipient?.name,
        bankName: recipient?.bankName,
        routingNumber: recipient?.routingNumber,
        accountNumber: recipient?.accountNumber,
      },
      note,
    };

    // Save pending transaction to backend
    fetch(`${apiBase}/transactions`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: -numericAmount,
        description: pendingTx.description,
        category: pendingTx.category,
        accountType: fromAccount,
        status: 'pending',
        transferType: 'external',
        recipientMeta: pendingTx.meta,
        note,
        date: today,
      }),
    })
      .then(res => res.json())
      .then(() => {
        // Refresh profile to get updated transactions
        fetchProfile();
      })
      .catch(err => console.error('Failed to save transaction:', err));

    setUsers((prevUsers) => {
      const baseUsers = existingSender ? prevUsers : [...prevUsers, fallbackSender];
      const nextUsers = baseUsers.map((user) => {
        if (user.id !== fromUserId) return user;
        return {
          ...user,
          transactions: [pendingTx, ...user.transactions],
          pendingTransactions: [...user.pendingTransactions, pendingTx],
        };
      });

      const updatedUser = nextUsers.find((u) => u.id === fromUserId);
      if (updatedUser && currentUser?.id === fromUserId) {
        setCurrentUser(updatedUser);
      }

      return nextUsers;
    });

    setPendingApprovals((prev) => [...prev, pendingTx]);

    return {
      success: true,
      message: 'Transfer submitted for admin approval',
      receipt: {
        ...receiptBase,
        recipient: pendingTx.meta,
        status: 'pending',
        reference: `${fromUserId}-${pendingTx.id}`,
      },
    };
  };

  // Pay bill - call backend API
  const payBill = async (userId, billData) => {
    try {
      const res = await fetch(`${apiBase}/bills`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payee: billData.payee,
          amount: parseFloat(billData.amount),
          category: billData.category,
          accountNumber: billData.accountNumber,
          fromAccount: billData.fromAccount,
          note: billData.note || `Bill payment to ${billData.payee}`,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        return {
          success: false,
          message: errorData.message || 'Failed to process bill payment',
        };
      }

      const data = await res.json();

      // Add transaction to current user's transactions locally
      if (currentUser) {
        const newTransaction = {
          id: data.transaction.id,
          date: new Date(data.transaction.date).toISOString().split('T')[0],
          description: data.transaction.description,
          amount: data.transaction.amount,
          category: data.transaction.category,
          status: data.transaction.status,
          accountType: billData.fromAccount,
          note: billData.note || `Payment to ${billData.payee}`,
        };

        setCurrentUser(prev => ({
          ...prev,
          transactions: [newTransaction, ...prev.transactions],
          checking: billData.fromAccount === 'checking' ? prev.checking - parseFloat(billData.amount) : prev.checking,
          savings: billData.fromAccount === 'savings' ? prev.savings - parseFloat(billData.amount) : prev.savings,
          balance: prev.balance - parseFloat(billData.amount),
        }));
      }

      return {
        success: true,
        message: 'Bill payment completed successfully',
        bill: data.bill,
        transaction: data.transaction,
      };
    } catch (err) {
      console.error('❌ Bill payment error:', err);
      return {
        success: false,
        message: 'Network error processing bill payment',
      };
    }
  };

  // Update current user with transactions (for lazy loading)
  const updateTransactions = (transactions, pendingTransactions) => {
    if (currentUser) {
      setCurrentUser(prev => ({
        ...prev,
        transactions: transactions || prev.transactions || [],
        pendingTransactions: pendingTransactions || prev.pendingTransactions || [],
      }));
    }
  };

  const value = {
    currentUser,
    isAuthenticated,
    isInitializing,
    users,
    pendingApprovals,
    login,
    signup,
    logout,
    updateProfile,
    addTransaction,
    approveTransaction,
    rejectTransaction,
    updateUserBalance,
    transferMoney,
    payBill,
    updateTransactions,
  };

  return <BankContext.Provider value={value}>{children}</BankContext.Provider>;
};
