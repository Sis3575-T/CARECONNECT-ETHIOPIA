import axios from 'axios';

/**
 * CareConnect Ethiopia - Production API Client
 * Centralized HTTP client integrated with Part 11 backend response contracts,
 * distributed request tracing (X-Request-Id), JWT authentication, timeout management,
 * and standardized error normalization.
 */

const rawBaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL)
  ? import.meta.env.VITE_API_BASE_URL
  : 'http://localhost:5000/api/v1';

// Ensure standard /api/v1 prefix
export const API_BASE_URL = rawBaseUrl.endsWith('/api')
  ? `${rawBaseUrl}/v1`
  : rawBaseUrl;

export const DEFAULT_TIMEOUT_MS = 15000;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

/**
 * Generate unique client request tracing identifier
 */
export function generateRequestId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `req-${timestamp}-${random}`;
}

/**
 * Request Interceptor: Injects X-Request-Id and Bearer Token
 */
apiClient.interceptors.request.use(
  (config) => {
    // Inject distributed request tracing header
    if (!config.headers['X-Request-Id']) {
      config.headers['X-Request-Id'] = generateRequestId();
    }

    // Extract authentication token
    if (typeof window !== 'undefined') {
      try {
        const token =
          localStorage.getItem('careconnect_access_token') ||
          localStorage.getItem('careconnect_token');
        if (token && !config.headers.Authorization) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch {
        // Storage restricted
      }
    }

    return config;
  },
  (error) => Promise.reject(normalizeApiError(error))
);

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Response Interceptor: Unwraps data and normalizes errors,
 * with automatic access token renewal queue on 401 responses.
 */
apiClient.interceptors.response.use(
  (response) => {
    // If backend uses Part 11 envelope: { success: true, data: { ... } }
    if (response.data && typeof response.data === 'object' && response.data.success !== undefined) {
      return response.data;
    }
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const isAuthEndpoint =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/refresh') ||
      originalRequest?.url?.includes('/auth/forgot-password') ||
      originalRequest?.url?.includes('/auth/reset-password');

    // Handle token expiration & automatic renewal
    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthEndpoint &&
      typeof window !== 'undefined'
    ) {
      const storedRefreshToken = localStorage.getItem('careconnect_refresh_token');

      if (storedRefreshToken) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((newToken) => {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return apiClient(originalRequest);
            })
            .catch((err) => Promise.reject(normalizeApiError(err)));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        return new Promise((resolve, reject) => {
          axios
            .post(
              `${API_BASE_URL}/auth/refresh`,
              { refreshToken: storedRefreshToken },
              { headers: { 'Content-Type': 'application/json' } }
            )
            .then(({ data }) => {
              const payload = data.data || data;
              const newAccessToken = payload.accessToken;
              const newRefreshToken = payload.refreshToken;

              if (newAccessToken) {
                localStorage.setItem('careconnect_access_token', newAccessToken);
                apiClient.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
                originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
              }
              if (newRefreshToken) {
                localStorage.setItem('careconnect_refresh_token', newRefreshToken);
              }

              processQueue(null, newAccessToken);
              resolve(apiClient(originalRequest));
            })
            .catch((refreshErr) => {
              processQueue(refreshErr, null);
              try {
                localStorage.removeItem('careconnect_access_token');
                localStorage.removeItem('careconnect_refresh_token');
                localStorage.removeItem('careconnect_user');
                localStorage.removeItem('careconnect_token');
                window.dispatchEvent(
                  new CustomEvent('careconnect:session_expired', {
                    detail: { error: normalizeApiError(refreshErr) }
                  })
                );
              } catch {
                // Storage restricted
              }
              reject(normalizeApiError(refreshErr));
            })
            .finally(() => {
              isRefreshing = false;
            });
        });
      }
    }

    const normalizedError = normalizeApiError(error);

    // If 401 Unauthorized on non-login request, notify app
    if (normalizedError.status === 401 && !isAuthEndpoint && typeof window !== 'undefined') {
      try {
        window.dispatchEvent(
          new CustomEvent('careconnect:session_expired', {
            detail: { error: normalizedError }
          })
        );
      } catch {
        // Event dispatching unsupported
      }
    }

    return Promise.reject(normalizedError);
  }
);

/**
 * Normalizes backend error responses into a consistent UI error model
 */
export function normalizeApiError(error) {
  if (!error) {
    return {
      status: 0,
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected application error occurred.',
      details: null,
      isNetworkError: false,
      isAuthError: false
    };
  }

  // If already normalized
  if (error._isNormalized) {
    return error;
  }

  // 1. Response received from backend
  if (error.response) {
    const status = error.response.status;
    const body = error.response.data || {};
    const backendError = body.error || {};

    const code = backendError.code || `HTTP_${status}`;
    const message = backendError.message || body.message || getDefaultStatusMessage(status);
    const details = backendError.details || null;
    const requestId = error.response.headers?.['x-request-id'] || null;

    return {
      _isNormalized: true,
      status,
      code,
      message,
      details,
      requestId,
      isNetworkError: false,
      isAuthError: status === 401 || status === 403,
      isValidationError: status === 400,
      isNotFound: status === 404,
      isRateLimited: status === 429
    };
  }

  // 2. Request was made but no response received (network failure / timeout)
  if (error.request) {
    const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
    return {
      _isNormalized: true,
      status: 0,
      code: isTimeout ? 'TIMEOUT_ERROR' : 'NETWORK_ERROR',
      message: isTimeout
        ? 'Request timed out while contacting the healthcare server.'
        : 'Unable to reach the CareConnect server. Please check your network connection.',
      details: null,
      isNetworkError: true,
      isAuthError: false
    };
  }

  // 3. Client setup error
  return {
    _isNormalized: true,
    status: 0,
    code: 'CLIENT_ERROR',
    message: error.message || 'An error occurred while preparing the request.',
    details: null,
    isNetworkError: false,
    isAuthError: false
  };
}

function getDefaultStatusMessage(status) {
  switch (status) {
    case 400: return 'The request contains invalid parameters or clinical data.';
    case 401: return 'Your session has expired. Please sign in again to continue.';
    case 403: return 'You do not have permission to perform this clinical action.';
    case 404: return 'The requested healthcare record or resource was not found.';
    case 409: return 'Conflict: This record was modified by another user or already exists.';
    case 429: return 'Too many requests. Please wait a moment before trying again.';
    case 500: return 'A server error occurred. Our technical staff has been alerted.';
    case 503: return 'Service temporarily unavailable. Please retry in a few moments.';
    default: return 'An unexpected error occurred.';
  }
}

/**
 * Creates an AbortController for request cancellation
 */
export function createAbortController() {
  return new AbortController();
}

export default apiClient;
