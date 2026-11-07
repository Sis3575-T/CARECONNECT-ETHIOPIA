/**
 * CareConnect Ethiopia - Real-Time Communication Constants
 * Standardized close codes, message types, and channel prefixes.
 */

export const WS_CLOSE_CODES = Object.freeze({
  NORMAL_CLOSURE: 1000,
  GOING_AWAY: 1001,
  PROTOCOL_ERROR: 1002,
  UNSUPPORTED_DATA: 1003,
  POLICY_VIOLATION: 1008,
  MESSAGE_TOO_BIG: 1009,
  INTERNAL_ERROR: 1011,
  SERVICE_RESTART: 1012,
  TRY_AGAIN_LATER: 1013,
  // Custom CareConnect Application-level WebSocket close codes (4000-4999)
  UNAUTHORIZED: 4401,
  FORBIDDEN: 4403,
  AUTH_TIMEOUT: 4408,
  RATE_LIMITED: 4429,
  SESSION_EXPIRED: 4440,
  SERVER_SHUTDOWN: 4499
});

export const CLIENT_MESSAGE_TYPES = Object.freeze({
  AUTH: 'auth',
  PING: 'ping',
  PONG: 'pong',
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe',
  SYNC: 'sync'
});

export const SERVER_MESSAGE_TYPES = Object.freeze({
  CONNECTED: 'connected',
  AUTH_SUCCESS: 'auth_success',
  AUTH_ERROR: 'auth_error',
  SUBSCRIBED: 'subscribed',
  UNSUBSCRIBED: 'unsubscribed',
  EVENT: 'event',
  HEARTBEAT: 'heartbeat',
  PONG: 'pong',
  SYNC_RESPONSE: 'sync_response',
  ERROR: 'error',
  WARNING: 'warning'
});

export const CHANNEL_TYPES = Object.freeze({
  USER: 'user',
  FACILITY: 'facility',
  REFERRAL: 'referral',
  TRANSPORT: 'transport',
  ADMIN: 'admin'
});

export const REALTIME_EVENT_VERSION = 1;

export default {
  WS_CLOSE_CODES,
  CLIENT_MESSAGE_TYPES,
  SERVER_MESSAGE_TYPES,
  CHANNEL_TYPES,
  REALTIME_EVENT_VERSION
};
