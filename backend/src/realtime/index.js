/**
 * CareConnect Ethiopia - Real-Time Subsystem Entrypoint
 */

import { realtimeServer } from './realtimeServer.js';
import { connectionRegistry } from './connectionRegistry.js';
import { subscriptionManager, SubscriptionManager } from './subscriptionManager.js';
import { extractAuthToken, authenticateConnection, createAuthMessageHandler } from './websocketAuth.js';
import { eventBroadcaster, EventBroadcaster } from './eventBroadcaster.js';
import {
  REALTIME_EVENT_TYPES,
  validateEventEnvelope,
  createRealtimeEvent,
  sanitizePayloadData
} from './eventContract.js';
import { WS_CLOSE_CODES, CLIENT_MESSAGE_TYPES, SERVER_MESSAGE_TYPES, CHANNEL_TYPES } from '../constants/realtime.js';

export {
  realtimeServer,
  connectionRegistry,
  subscriptionManager,
  SubscriptionManager,
  eventBroadcaster,
  EventBroadcaster,
  extractAuthToken,
  authenticateConnection,
  createAuthMessageHandler,
  REALTIME_EVENT_TYPES,
  validateEventEnvelope,
  createRealtimeEvent,
  sanitizePayloadData,
  WS_CLOSE_CODES,
  CLIENT_MESSAGE_TYPES,
  SERVER_MESSAGE_TYPES,
  CHANNEL_TYPES
};

export default realtimeServer;
