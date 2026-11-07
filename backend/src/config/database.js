/**
 * Backend Database Client re-export
 */
import connection, {
  pool,
  query,
  testConnection,
  dbConfig,
  sanitizeConnectionString,
  getPoolMetrics,
  isTransientError,
  executeWithRetry,
  closePool
} from '../../../database/connection.js';

export {
  pool,
  query,
  testConnection,
  dbConfig,
  sanitizeConnectionString,
  getPoolMetrics,
  isTransientError,
  executeWithRetry,
  closePool
};
export default connection;
