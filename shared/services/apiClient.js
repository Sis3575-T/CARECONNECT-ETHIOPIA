import axios from 'axios';

// Base Axios client configured for CareConnect Ethiopia REST APIs
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor for auth token if present
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('careconnect_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor with graceful mock fallback when offline or in demo mode
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.warn('[CareConnect API Client] Backend request unfulfilled, falling back to local demo state:', error.message);
    return Promise.reject(error);
  }
);

export default apiClient;
