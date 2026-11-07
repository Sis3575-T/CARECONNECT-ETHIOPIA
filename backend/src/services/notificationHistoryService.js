/**
 * CareConnect Ethiopia - Notification Delivery Tracking & History Service
 * Manages delivery attempt audit history, operator delivery diagnostics,
 * and safe notification lifecycle retention.
 */

import { DbService } from './dbService.js';
import { notificationDeliveryService } from './notificationDeliveryService.js';
import { notificationRepository } from '../repositories/notificationRepository.js';
import SecurityAuditService from './securityAuditService.js';
import { MANDATORY_CATEGORIES, NOTIFICATION_CATEGORIES } from '../constants/notifications.js';
import { DELIVERY_STATUS } from '../constants/jobs.js';

export class NotificationHistoryService {
  constructor(options = {}) {
    this.deliveryService = options.deliveryService || notificationDeliveryService;
    this.repo = options.repo || notificationRepository;
  }

  /**
   * Retrieves delivery history for a user across all channels
   * @param {number|string} recipientUserId
   * @param {object} [options]
   */
  async getDeliveryHistory(recipientUserId, options = {}) {
    const { limit = 50, offset = 0, channel, status } = options;
    const userId = Number(recipientUserId);

    try {
      const whereClauses = ['recipient_user_id = $1'];
      const values = [userId];
      let valIdx = 2;

      if (channel) {
        whereClauses.push(`channel = $${valIdx++}`);
        values.push(channel);
      }
      if (status) {
        whereClauses.push(`status = $${valIdx++}`);
        values.push(status);
      }

      const sql = `
        SELECT * FROM notification_deliveries
        WHERE ${whereClauses.join(' AND ')}
        ORDER BY created_at DESC
        LIMIT $${valIdx++} OFFSET $${valIdx++};
      `;
      const res = await DbService.query(sql, [...values, limit, offset]);
      return res.rows.map(r => this.deliveryService._formatDelivery(r));
    } catch {
      // In-memory fallback
      let list = Array.from(this.deliveryService.inMemoryDeliveries.values())
        .filter(d => Number(d.recipient_user_id) === userId);

      if (channel) list = list.filter(d => d.channel === channel);
      if (status) list = list.filter(d => d.status === status);

      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return list.slice(offset, offset + limit).map(d => this.deliveryService._formatDelivery(d));
    }
  }

  /**
   * Safe retention cleanup for aged routine notifications.
   * STRICT SAFETY RULE: Mandatory categories (SECURITY, ESCALATION), active unread records,
   * and clinical referral communications are strictly protected from routine automated deletion.
   *
   * @param {object} options
   * @param {number} [options.retentionDays=90]
   * @param {boolean} [options.dryRun=false]
   * @param {object} [options.actingUser]
   * @returns {Promise<{ eligible: number, archivedCount: number, dryRun: boolean }>}
   */
  async cleanupAgedNotifications(options = {}) {
    const { retentionDays = 90, dryRun = false, actingUser = {} } = options;
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const nonDeletableCategories = [...MANDATORY_CATEGORIES, NOTIFICATION_CATEGORIES.REFERRAL_UPDATE];

    try {
      // 1. Identify eligible routine records (Only read or dismissed, non-mandatory, older than cutoff)
      const countSql = `
        SELECT COUNT(*)::int as eligible
        FROM notifications
        WHERE created_at < $1
          AND (is_read = TRUE OR is_dismissed = TRUE)
          AND category NOT IN ('SECURITY', 'ESCALATION', 'REFERRAL_UPDATE');
      `;
      const countRes = await DbService.query(countSql, [cutoffDate.toISOString()]);
      const eligible = countRes.rows[0]?.eligible || 0;

      if (dryRun || eligible === 0) {
        return { eligible, archivedCount: 0, dryRun: Boolean(dryRun) };
      }

      // 2. Mark as dismissed / archived (non-destructive)
      const archiveSql = `
        UPDATE notifications
        SET is_dismissed = TRUE,
            dismissed_at = NOW(),
            metadata = metadata || '{"retentionArchived": true}'::jsonb
        WHERE created_at < $1
          AND (is_read = TRUE OR is_dismissed = TRUE)
          AND category NOT IN ('SECURITY', 'ESCALATION', 'REFERRAL_UPDATE')
        RETURNING id;
      `;
      const archiveRes = await DbService.query(archiveSql, [cutoffDate.toISOString()]);
      const archivedCount = archiveRes.rowCount || 0;

      // Audit log the retention execution
      await SecurityAuditService.recordEvent({
        eventCategory: 'SYSTEM',
        eventName: 'NOTIFICATION_RETENTION_CLEANUP',
        severity: 'INFO',
        userId: actingUser.id || null,
        details: { retentionDays, archivedCount, cutoffDate: cutoffDate.toISOString() }
      }).catch(() => {});

      return { eligible, archivedCount, dryRun: false };
    } catch {
      // In-memory fallback
      let eligible = 0;
      let archivedCount = 0;

      for (const item of this.repo.inMemoryStore.values()) {
        const itemCreated = new Date(item.created_at).getTime();
        const isAged = itemCreated < cutoffDate.getTime();
        const isProcessed = item.is_read || item.is_dismissed;
        const isProtectedCategory = nonDeletableCategories.includes(item.category);

        if (isAged && isProcessed && !isProtectedCategory) {
          eligible += 1;
          if (!dryRun) {
            item.is_dismissed = true;
            item.dismissed_at = new Date().toISOString();
            item.metadata = { ...(item.metadata || {}), retentionArchived: true };
            archivedCount += 1;
          }
        }
      }

      if (!dryRun && archivedCount > 0) {
        await SecurityAuditService.recordEvent({
          eventCategory: 'SYSTEM',
          eventName: 'NOTIFICATION_RETENTION_CLEANUP',
          severity: 'INFO',
          userId: actingUser.id || null,
          details: { retentionDays, archivedCount, cutoffDate: cutoffDate.toISOString() }
        }).catch(() => {});
      }

      return { eligible, archivedCount, dryRun: Boolean(dryRun) };
    }
  }
}

export const notificationHistoryService = new NotificationHistoryService();
export default notificationHistoryService;
