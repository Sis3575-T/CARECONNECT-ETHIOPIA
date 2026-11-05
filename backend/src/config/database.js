/**
 * Backend Database Client re-export
 */
import connection, { pool, query, testConnection, dbConfig } from '../../../database/connection.js';

export { pool, query, testConnection, dbConfig };
export default connection;
