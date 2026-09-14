// config.js - API Configuration
// This file centralizes all API endpoint configuration

// Use the deployed backend when configured; local development uses the CRA proxy.
const configuredApiBase = process.env.REACT_APP_API_BASE || process.env.REACT_APP_API_URL || '';
export const API_BASE = configuredApiBase
  ? `${configuredApiBase.replace(/\/+$/, '')}${configuredApiBase.endsWith('/api') ? '' : '/api'}`
  : '/api';
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
