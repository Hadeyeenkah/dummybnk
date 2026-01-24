const getApiUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    return '';
  }
  return '/api';
};

export const API_URL = getApiUrl();

export const API_ENDPOINTS = {
  LOGIN: `/api/auth/login`,
  REGISTER: `/api/auth/register`,
  LOGOUT: `/api/auth/logout`,
  PROFILE: `/api/auth/profile`,
  TRANSACTIONS: `/api/transactions`,
  HEALTH: `/api/health`,
};

export default API_URL;
