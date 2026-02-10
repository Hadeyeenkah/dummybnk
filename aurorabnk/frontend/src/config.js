// config.js - API Configuration
// This file centralizes all API endpoint configuration

// Determine API URL based on environment
export const getApiBase = () => {
  // Prefer explicit production base `REACT_APP_API_BASE` or `REACT_APP_API_URL`.
  // If provided, normalize and ensure it ends with `/api` so frontend calls correct routes.
  const envBase = process.env.REACT_APP_API_BASE || process.env.REACT_APP_API_URL;
  if (envBase) {
    const normalized = envBase.replace(/\/+$/, '');
    // Fall back to correct regex if above was malformed
    // (some environments or minifiers may corrupt repeated plus signs)
    // Ensure we remove trailing slashes
    // NOTE: keep simple and compatible: /\/+$/
    const normalizedFixed = normalized.replace(/\/+$/, '');
    const finalBase = normalizedFixed;
    return finalBase.endsWith('/api') ? finalBase : `${finalBase}/api`;
  }

  // If no env var provided:
  // - In production default to deployed backend
  // - In development default to local backend
  if (process.env.NODE_ENV === 'production') {
    return 'https://dummyback.vercel.app/api';
  }
  return 'http://localhost:5001/api';
};

export const API_BASE = getApiBase();
export const API_URL = API_BASE;

// Log configuration in development
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 API Configuration:', {
    apiUrl: API_URL,
    env: process.env.NODE_ENV,
    reactAppApiUrl: process.env.REACT_APP_API_URL
  });
}

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  LOGIN: `${API_URL}/auth/login`,
  SIGNUP: `${API_URL}/auth/signup`,
  LOGOUT: `${API_URL}/auth/logout`,
  VERIFY_OTP: `${API_URL}/auth/verify-otp`,
  RESET_PASSWORD: `${API_URL}/auth/reset-password`,
  
  // Transactions
  TRANSACTIONS: `${API_URL}/transactions`,
  TRANSACTION_DETAIL: (id) => `${API_URL}/transactions/${id}`,
  
  // Transfers
  TRANSFERS: `${API_URL}/transfers`,
  
  // Bills
  BILLS: `${API_URL}/bills`,
  
  // Accounts
  ACCOUNTS: `${API_URL}/accounts`,
  
  // Notifications
  NOTIFICATIONS: `${API_URL}/notifications`,
  
  // Health check
  HEALTH: `${API_URL}/health`,
};

export default API_URL;
