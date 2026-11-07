/**
 * CareConnect Ethiopia - Real-Time Subsystem Entrypoint
 */

import { realtimeServer } from './realtimeServer.js';
import { connectionRegistry } from './connectionRegistry.js';
import { WS_CLOSE_CODES, CLIENT_MESSAGE_TYPES, SERVER_MESSAGE_TYPES, CHANNEL_TYPES } from '../constants/realtime.js';

export {
  realtimeServer,
  connectionRegistry,
  WS_CLOSE_CODES,
  CLIENT_MESSAGE_TYPES,
  SERVER_MESSAGE_TYPES,
  CHANNEL_TYPES
};

export default realtimeServer;
