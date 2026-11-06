/**
 * CareConnect Ethiopia - Security Audit & Event Logging Service
 */

import { query } from '../config/database.js';
import { SECURITY_EVENTS } from '../constants/index.js';

export class SecurityAuditService {
  /**
   * Record a security event in PostgreSQL system_events & audit_logs
   */
  static async recordEvent(options) {
    const {
      eventName,
      category = 'SECURITY',
      severity = 'INFO',
      userId = null,
      facilityId = null,
      ipAddress = '127.0.0.1',
      userAgent = 'Unknown',
      details = {}
    } = options;

    try {
      // 1. Insert into system_events
      const eventSql = `
        INSERT INTO system_events (
          event_category, event_name, severity, source_service, details, triggered_by_user_id
        ) VALUES ($1, $2, $3, 'EXPRESS_API', $4, $5)
      `;
      await query(eventSql, [
        category,
        eventName,
        severity,
        JSON.stringify({ ...details, ipAddress, userAgent }),
        userId
      ]);

      // 2. Also record in audit_logs if an actionable resource or user is involved
      const auditSql = `
        INSERT INTO audit_logs (
          user_id, facility_id, action, resource_type, resource_id, ip_address, user_agent, details, severity
        ) VALUES ($1, $2, $3, 'auth', $4, $5, $6, $7, $8)
      `;
      await query(auditSql, [
        userId,
        facilityId,
        eventName,
        userId ? String(userId) : null,
        ipAddress,
        userAgent,
        JSON.stringify(details),
        severity
      ]);
    } catch {
      // In-memory or offline fallback: log securely to console in dev mode
      if (process.env.NODE_ENV !== 'test') {
        console.log(`[Security Event] ${eventName} | User: ${userId || 'anon'} | Severity: ${severity}`);
      }
    }
  }
}

export default SecurityAuditService;
