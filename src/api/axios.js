// src/api/axios.js
import axios from 'axios';

// ✅ Use REACT_APP_API_BASE env var or fall back to current host (helpful on LAN)
const API_BASE =
  process.env.REACT_APP_API_BASE ||
  `${window.location.protocol}//${window.location.hostname}:5000/`;

// ✅ Create axios instance
const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000, // ⏱️ optional: 15s timeout to catch network issues
  headers: {
    'Content-Type': 'application/json',
  },
});

// ✅ Attach token automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('🔴 Request Error:', error);
    return Promise.reject(error);
  }
);

// ⚠️ Global error interceptor (optional enhancement)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle token expiration or unauthorized access
    if (error.response?.status === 401) {
      console.warn('🔒 Unauthorized — Token may be expired');
      localStorage.removeItem('token');
      window.location.href = '/login'; // redirect to login
    }

    // Ignore abort errors triggered by Axios cancelation
    if (axios.isCancel(error) || error.code === 'ERR_CANCELED') {
      console.debug('⚠️ Request canceled:', error.message);
      return Promise.reject(error);
    }
    
    // General logging
    if (error.response) {
      console.error(`❌ ${error.response.status}: ${error.response.data.message}`);
    } else {
      console.error('❌ Network or Server error:', error.message);
    }

    return Promise.reject(error);
  }
);

export default api;