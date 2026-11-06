/**
 * CareConnect Ethiopia - Standalone HTTP Server Entry Point
 * Manages HTTP server lifecycle, socket port binding, and graceful process shutdown.
 */

import http from 'http';
import app from './app.js';
import config from './config/env.js';
import { pool } from './config/database.js';

const PORT = config.server.port;
const HOST = config.server.host;

const server = http.createServer(app);

server.listen(PORT, HOST, () => {
  console.log(`[CareConnect Server] Running in ${config.env} mode on http://${HOST}:${PORT}`);
  console.log(`[CareConnect Server] API Documentation: http://${HOST}:${PORT}/api/v1/docs`);
  console.log(`[CareConnect Server] Health Probe: http://${HOST}:${PORT}/health`);
});

/**
 * Graceful termination handler
 */
async function gracefulShutdown(signal) {
  console.log(`\n[CareConnect Server] Received ${signal}. Terminating gracefully...`);

  server.close(async () => {
    console.log('[CareConnect Server] HTTP connections closed.');
    try {
      if (pool && typeof pool.end === 'function') {
        await pool.end();
        console.log('[CareConnect Server] PostgreSQL connection pool drained.');
      }
    } catch (err) {
      console.error('[CareConnect Server] Error closing database pool:', err.message);
    }
    process.exit(0);
  });

  // Force exit if shutdown hangs beyond 10s
  setTimeout(() => {
    console.error('[CareConnect Server] Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default server;
