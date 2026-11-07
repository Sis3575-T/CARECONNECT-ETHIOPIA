/**
 * CareConnect Ethiopia - In-App Notification Repository
 * High-performance database operations with row-level ownership and offline in-memory fallback.
 */

import crypto from 'crypto';
import { DbService } from '../services/dbService.js';
import { NOTIFICATION_CATEGORIES, NOTIFICATION_PRIORITIES } from '../constants/notifications.js';

export class NotificationRepository {
  constructor() {
    this.inMemoryStore = new Map();
  }

  /**
   * Persists a new in-app notification record
   * @param {object} data
   * @returns {Promise<object>} Formatted notification
   */
  async create(data) {
    const uuid = data.uuid || crypto.randomUUID();
    const recipientUserId = Number(data.recipientUserId) || null;
    const recipientFacilityId = data.recipientFacilityId ? String(data.recipientFacilityId) : null;
    const recipientRole = data.recipientRole || null;
    const title = data.title;
    const message = data.message;
    const notificationType = data.notificationType;
    const category = data.category || NOTIFICATION_CATEGORIES.REFERRAL_UPDATE;
    const entityType = data.entityType || null;
    const entityId = data.entityId ? String(data.entityId) : null;
    const priority = data.priority || NOTIFICATION_PRIORITIES.NORMAL;
    const deduplicationKey = data.deduplicationKey || null;
    const metadata = data.metadata || {};
    const now = new Date().toISOString();

    // Check in-memory deduplication early if key provided
    if (deduplicationKey) {
      for (const item of this.inMemoryStore.values()) {
        if (item.recipient_user_id === recipientUserId && item.deduplication_key === deduplicationKey) {
          return this._format(item);
        }
      }
    }

    try {
      const sql = `
        INSERT INTO notifications (
          uuid, recipient_user_id, recipient_facility_id, recipient_role,
          title, message, notification_type, category, entity_type, entity_id,
          priority, deduplication_key, metadata, is_read, is_dismissed, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, FALSE, FALSE, $14)
        ON CONFLICT (recipient_user_id, deduplication_key) WHERE deduplication_key IS NOT NULL
        DO UPDATE SET title = EXCLUDED.title -- No-op returning existing
        RETURNING *;
      `;
      const values = [
        uuid,
        recipientUserId,
        recipientFacilityId,
        recipientRole,
        title,
        message,
        notificationType,
        category,
        entityType,
        entityId,
        priority,
        deduplicationKey,
        JSON.stringify(metadata),
        now
      ];
      const res = await DbService.query(sql, values);
      if (res.rows && res.rows.length > 0) {
        return this._format(res.rows[0]);
      }
    } catch {
      // In-memory fallback
    }

    const item = {
      id: this.inMemoryStore.size + 1,
      uuid,
      recipient_user_id: recipientUserId,
      recipient_facility_id: recipientFacilityId,
      recipient_role: recipientRole,
      title,
      message,
      notification_type: notificationType,
      category,
      entity_type: entityType,
      entity_id: entityId,
      priority,
      deduplication_key: deduplicationKey,
      metadata,
      is_read: false,
      read_at: null,
      is_dismissed: false,
      dismissed_at: null,
      created_at: now
    };

    this.inMemoryStore.set(uuid, item);
    return this._format(item);
  }

  /**
   * Retrieves notification by numeric ID or UUID
   */
  async findByIdOrUuid(identifier) {
    if (!identifier) return null;
    const isNum = !isNaN(identifier) && Number.isInteger(Number(identifier));

    try {
      const sql = isNum
        ? 'SELECT * FROM notifications WHERE id = $1'
        : 'SELECT * FROM notifications WHERE uuid = $1';
      const res = await DbService.query(sql, [isNum ? Number(identifier) : String(identifier)]);
      if (res.rows && res.rows.length > 0) {
        return this._format(res.rows[0]);
      }
    } catch {
      // In-memory fallback
    }

    for (const item of this.inMemoryStore.values()) {
      if ((isNum && item.id === Number(identifier)) || item.uuid === String(identifier)) {
        return this._format(item);
      }
    }
    return null;
  }

  /**
   * Lists notifications for a recipient with filters and pagination
   */
  async listByRecipient(recipientUserId, options = {}) {
    const {
      isRead,
      category,
      isDismissed = false,
      page = 1,
      limit = 20
    } = options;

    const offset = (Math.max(1, page) - 1) * Math.max(1, limit);
    const userId = Number(recipientUserId);

    try {
      const whereClauses = ['recipient_user_id = $1'];
      const values = [userId];
      let valIdx = 2;

      if (isDismissed !== undefined && isDismissed !== null) {
        whereClauses.push(`is_dismissed = $${valIdx++}`);
        values.push(Boolean(isDismissed));
      }
      if (isRead !== undefined && isRead !== null) {
        whereClauses.push(`is_read = $${valIdx++}`);
        values.push(Boolean(isRead));
      }
      if (category) {
        whereClauses.push(`category = $${valIdx++}`);
        values.push(category);
      }

      const whereStr = `WHERE ${whereClauses.join(' AND ')}`;
      const countSql = `SELECT COUNT(*)::int as total FROM notifications ${whereStr};`;
      const countRes = await DbService.query(countSql, values);
      const total = countRes.rows[0]?.total || 0;

      const dataSql = `
        SELECT * FROM notifications
        ${whereStr}
        ORDER BY created_at DESC
        LIMIT $${valIdx++} OFFSET $${valIdx++};
      `;
      const dataRes = await DbService.query(dataSql, [...values, limit, offset]);
      const items = dataRes.rows.map(r => this._format(r));

      return { items, total };
    } catch {
      // In-memory fallback
      let list = Array.from(this.inMemoryStore.values()).filter(n => n.recipient_user_id === userId);

      if (isDismissed !== undefined && isDismissed !== null) {
        list = list.filter(n => Boolean(n.is_dismissed) === Boolean(isDismissed));
      }
      if (isRead !== undefined && isRead !== null) {
        list = list.filter(n => Boolean(n.is_read) === Boolean(isRead));
      }
      if (category) {
        list = list.filter(n => n.category === category);
      }

      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const total = list.length;
      const items = list.slice(offset, offset + limit).map(n => this._format(n));
      return { items, total };
    }
  }

  /**
   * Fast count of unread and active (non-dismissed) notifications
   */
  async countUnread(recipientUserId) {
    const userId = Number(recipientUserId);
    try {
      const sql = `
        SELECT COUNT(*)::int as unread_count
        FROM notifications
        WHERE recipient_user_id = $1 AND is_read = FALSE AND is_dismissed = FALSE;
      `;
      const res = await DbService.query(sql, [userId]);
      return res.rows[0]?.unread_count || 0;
    } catch {
      let count = 0;
      for (const item of this.inMemoryStore.values()) {
        if (item.recipient_user_id === userId && !item.is_read && !item.is_dismissed) {
          count += 1;
        }
      }
      return count;
    }
  }

  /**
   * Marks a single notification as read
   */
  async markAsRead(identifier, recipientUserId) {
    const userId = Number(recipientUserId);
    const now = new Date().toISOString();
    const isNum = !isNaN(identifier) && Number.isInteger(Number(identifier));

    try {
      const sql = isNum
        ? `UPDATE notifications SET is_read = TRUE, read_at = $1
           WHERE id = $2 AND recipient_user_id = $3
           RETURNING *;`
        : `UPDATE notifications SET is_read = TRUE, read_at = $1
           WHERE uuid = $2 AND recipient_user_id = $3
           RETURNING *;`;
      const res = await DbService.query(sql, [now, identifier, userId]);
      if (res.rows && res.rows.length > 0) {
        return this._format(res.rows[0]);
      }
    } catch {
      // In-memory fallback
    }

    for (const item of this.inMemoryStore.values()) {
      if (((isNum && item.id === Number(identifier)) || item.uuid === String(identifier)) &&
          item.recipient_user_id === userId) {
        item.is_read = true;
        item.read_at = now;
        return this._format(item);
      }
    }
    return null;
  }

  /**
   * Marks a single notification as unread
   */
  async markAsUnread(identifier, recipientUserId) {
    const userId = Number(recipientUserId);
    const isNum = !isNaN(identifier) && Number.isInteger(Number(identifier));

    try {
      const sql = isNum
        ? `UPDATE notifications SET is_read = FALSE, read_at = NULL
           WHERE id = $1 AND recipient_user_id = $2
           RETURNING *;`
        : `UPDATE notifications SET is_read = FALSE, read_at = NULL
           WHERE uuid = $1 AND recipient_user_id = $2
           RETURNING *;`;
      const res = await DbService.query(sql, [identifier, userId]);
      if (res.rows && res.rows.length > 0) {
        return this._format(res.rows[0]);
      }
    } catch {
      // In-memory fallback
    }

    for (const item of this.inMemoryStore.values()) {
      if (((isNum && item.id === Number(identifier)) || item.uuid === String(identifier)) &&
          item.recipient_user_id === userId) {
        item.is_read = false;
        item.read_at = null;
        return this._format(item);
      }
    }
    return null;
  }

  /**
   * Marks all unread notifications as read for a recipient
   */
  async markAllAsRead(recipientUserId, { category } = {}) {
    const userId = Number(recipientUserId);
    const now = new Date().toISOString();

    try {
      let sql = `
        UPDATE notifications
        SET is_read = TRUE, read_at = $1
        WHERE recipient_user_id = $2 AND is_read = FALSE AND is_dismissed = FALSE
      `;
      const params = [now, userId];
      if (category) {
        sql += ' AND category = $3';
        params.push(category);
      }
      sql += ' RETURNING id;';

      const res = await DbService.query(sql, params);
      return res.rowCount || 0;
    } catch {
      let count = 0;
      for (const item of this.inMemoryStore.values()) {
        if (item.recipient_user_id === userId && !item.is_read && !item.is_dismissed) {
          if (!category || item.category === category) {
            item.is_read = true;
            item.read_at = now;
            count += 1;
          }
        }
      }
      return count;
    }
  }

  /**
   * Soft-dismisses/archives a notification
   */
  async dismiss(identifier, recipientUserId) {
    const userId = Number(recipientUserId);
    const now = new Date().toISOString();
    const isNum = !isNaN(identifier) && Number.isInteger(Number(identifier));

    try {
      const sql = isNum
        ? `UPDATE notifications SET is_dismissed = TRUE, dismissed_at = $1
           WHERE id = $2 AND recipient_user_id = $3
           RETURNING *;`
        : `UPDATE notifications SET is_dismissed = TRUE, dismissed_at = $1
           WHERE uuid = $2 AND recipient_user_id = $3
           RETURNING *;`;
      const res = await DbService.query(sql, [now, identifier, userId]);
      if (res.rows && res.rows.length > 0) {
        return this._format(res.rows[0]);
      }
    } catch {
      // In-memory fallback
    }

    for (const item of this.inMemoryStore.values()) {
      if (((isNum && item.id === Number(identifier)) || item.uuid === String(identifier)) &&
          item.recipient_user_id === userId) {
        item.is_dismissed = true;
        item.dismissed_at = now;
        return this._format(item);
      }
    }
    return null;
  }

  _format(row) {
    if (!row) return null;
    let metadata = row.metadata;
    if (typeof metadata === 'string') {
      try { metadata = JSON.parse(metadata); } catch { metadata = {}; }
    }
    return {
      id: row.id,
      uuid: row.uuid,
      recipientUserId: row.recipient_user_id,
      recipientFacilityId: row.recipient_facility_id,
      recipientRole: row.recipient_role,
      title: row.title,
      message: row.message,
      notificationType: row.notification_type,
      category: row.category,
      entityType: row.entity_type,
      entityId: row.entity_id,
      priority: row.priority,
      deduplicationKey: row.deduplication_key,
      metadata: metadata || {},
      isRead: Boolean(row.is_read),
      readAt: row.read_at,
      isDismissed: Boolean(row.is_dismissed),
      dismissedAt: row.dismissed_at,
      createdAt: row.created_at
    };
  }

  clearInMemory() {
    this.inMemoryStore.clear();
  }
}

export const notificationRepository = new NotificationRepository();
export default notificationRepository;
