/**
 * Backend Database Client re-export
 */
import connection, { pool, query, testConnection, dbConfig, sanitizeConnectionString } from '../../../database/connection.js';

export { pool, query, testConnection, dbConfig, sanitizeConnectionString };
export default connection;
