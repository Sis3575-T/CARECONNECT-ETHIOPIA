/**
 * CareConnect Ethiopia - Main Backend API Application
 * Express.js core server instance.
 */

import express from 'express';
import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { configureSecurity } from './middleware/security.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const server = http.createServer(app);

// Apply Security Headers & CORS
configureSecurity(app);

const PORT = parseInt(process.env.PORT || process.env.BACKEND_PORT || '5000', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Basic JSON & URL-encoded parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Root welcome route
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'CareConnect Ethiopia - Main REST API',
    version: '1.0.0',
    documentation: '/api/v1/docs',
    health: '/api/v1/health'
  });
});

// Centralized error handling
app.use(notFoundHandler);
app.use(errorHandler);

/**
 * Start HTTP server listening
 */
export function startServer(port = PORT) {
  return new Promise((resolve) => {
    server.listen(port, HOST, () => {
      console.log(`[CareConnect API] Server running on http://${HOST}:${port}`);
      resolve(server);
    });
  });
}

/**
 * Stop HTTP server
 */
export function stopServer() {
  return new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

// Graceful shutdown listeners
process.on('SIGTERM', () => {
  console.log('[CareConnect API] Received SIGTERM signal. Shutting down gracefully...');
  server.close(() => process.exit(0));
});

if (process.argv[1] && process.argv[1].endsWith('app.js')) {
  startServer();
}

export { app, server };
export default app;
