/**
 * CareConnect Ethiopia - User Notification Preferences Service
 * Enforces safe defaults, channel configurations, and non-negotiable mandatory categories
 * (Security and Escalation) with immutable audit trail logging.
 */

import { DbService } from './dbService.js';
import SecurityAuditService from './securityAuditService.js';
import {
  NOTIFICATION_CATEGORIES,
  DEFAULT_USER_PREFERENCES,
  MANDATORY_CATEGORIES
} from '../constants/notifications.js';
import { ValidationError, ForbiddenError } from '../utils/errors.js';

export class NotificationPreferenceService {
  constructor() {
    this.inMemoryPreferences = new Map(); // userId -> preferences object
  }

  /**
   * Retrieves user notification preferences with fallback to safe defaults
   * @param {number|string} userId
   * @returns {Promise<object>}
   */
  async getPreferences(userId) {
    const numUserId = Number(userId);
    if (!numUserId) {
      throw new ValidationError('Valid numeric userId is required');
    }

    try {
      const sql = `
        SELECT in_app_enabled, email_enabled, sms_enabled, categories_config
        FROM notification_preferences
        WHERE user_id = $1
        LIMIT 1;
      `;
      const res = await DbService.query(sql, [numUserId]);
      if (res.rows && res.rows.length > 0) {
        return this._format(res.rows[0], numUserId);
      }
    } catch {
      // In-memory fallback
    }

    const mem = this.inMemoryPreferences.get(numUserId);
    if (mem) {
      return JSON.parse(JSON.stringify(mem));
    }

    // Default configuration
    return {
      userId: numUserId,
      ...JSON.parse(JSON.stringify(DEFAULT_USER_PREFERENCES))
    };
  }

  /**
   * Updates notification preferences enforcing mandatory category rules
   * @param {number|string} targetUserId
   * @param {object} updates - Partial preference updates
   * @param {object} actingUser - Authenticated user context
   * @returns {Promise<object>} Updated preferences
   */
  async updatePreferences(targetUserId, updates = {}, actingUser = {}) {
    const numTargetUserId = Number(targetUserId);
    if (!numTargetUserId) {
      throw new ValidationError('Valid numeric targetUserId is required');
    }

    // 1. Authorization check: User can update own preferences; Admin can manage any
    const actingUserId = Number(actingUser.id || actingUser.userId);
    const isAdmin = actingUser.roleId === 6 || actingUser.roleName === 'SYSTEM_ADMINISTRATOR';

    if (actingUserId !== numTargetUserId && !isAdmin) {
      throw new ForbiddenError('You can only modify your own notification preferences');
    }

    // 2. Validate mandatory categories
    if (updates.categories && typeof updates.categories === 'object') {
      for (const mandatory of MANDATORY_CATEGORIES) {
        if (updates.categories[mandatory] === false) {
          throw new ValidationError(
            `Mandatory notification category '${mandatory}' cannot be disabled to preserve clinical safety and operational oversight.`
          );
        }
      }
    }

    // 3. Retrieve current state and merge
    const current = await this.getPreferences(numTargetUserId);
    const merged = {
      userId: numTargetUserId,
      inAppEnabled: updates.inAppEnabled !== undefined ? Boolean(updates.inAppEnabled) : current.inAppEnabled,
      emailEnabled: updates.emailEnabled !== undefined ? Boolean(updates.emailEnabled) : current.emailEnabled,
      smsEnabled: updates.smsEnabled !== undefined ? Boolean(updates.smsEnabled) : current.smsEnabled,
      categories: {
        ...current.categories,
        ...(updates.categories || {})
      }
    };

    // Ensure mandatory categories are strictly true
    for (const mandatory of MANDATORY_CATEGORIES) {
      merged.categories[mandatory] = true;
    }

    const now = new Date().toISOString();

    // 4. Persist to database
    try {
      const sql = `
        INSERT INTO notification_preferences (
          user_id, channel, in_app_enabled, email_enabled, sms_enabled, categories_config, updated_at
        ) VALUES ($1, 'IN_APP', $2, $3, $4, $5, $6)
        ON CONFLICT (user_id, channel) DO UPDATE
        SET in_app_enabled = EXCLUDED.in_app_enabled,
            email_enabled = EXCLUDED.email_enabled,
            sms_enabled = EXCLUDED.sms_enabled,
            categories_config = EXCLUDED.categories_config,
            updated_at = EXCLUDED.updated_at
        RETURNING in_app_enabled, email_enabled, sms_enabled, categories_config;
      `;
      const values = [
        numTargetUserId,
        merged.inAppEnabled,
        merged.emailEnabled,
        merged.smsEnabled,
        JSON.stringify(merged.categories),
        now
      ];
      const res = await DbService.query(sql, values);
      if (res.rows && res.rows.length > 0) {
        // Record audit event
        await SecurityAuditService.recordEvent({
          eventCategory: 'SECURITY',
          eventName: 'NOTIFICATION_PREFERENCES_UPDATED',
          severity: 'INFO',
          userId: actingUserId,
          details: {
            targetUserId: numTargetUserId,
            channels: { inApp: merged.inAppEnabled, email: merged.emailEnabled, sms: merged.smsEnabled }
          }
        }).catch(() => {});

        return this._format(res.rows[0], numTargetUserId);
      }
    } catch {
      // In-memory fallback
    }

    this.inMemoryPreferences.set(numTargetUserId, merged);

    await SecurityAuditService.recordEvent({
      eventCategory: 'SECURITY',
      eventName: 'NOTIFICATION_PREFERENCES_UPDATED',
      severity: 'INFO',
      userId: actingUserId,
      details: {
        targetUserId: numTargetUserId,
        channels: { inApp: merged.inAppEnabled, email: merged.emailEnabled, sms: merged.smsEnabled }
      }
    }).catch(() => {});

    return merged;
  }

  /**
   * Evaluates if a notification should be delivered to a user via channel
   * @param {number|string} userId
   * @param {string} category
   * @param {string} channel - 'IN_APP', 'EMAIL', 'SMS'
   * @returns {Promise<boolean>}
   */
  async shouldDeliver(userId, category, channel = 'IN_APP') {
    // Security and escalation alerts are ALWAYS delivered in-app
    if (channel === 'IN_APP' && MANDATORY_CATEGORIES.includes(category)) {
      return true;
    }

    const prefs = await this.getPreferences(userId);

    // Channel level check
    if (channel === 'IN_APP' && !prefs.inAppEnabled) return false;
    if (channel === 'EMAIL' && !prefs.emailEnabled) return false;
    if (channel === 'SMS' && !prefs.smsEnabled) return false;

    // Category level check (mandatory always true)
    if (MANDATORY_CATEGORIES.includes(category)) {
      return true;
    }

    if (prefs.categories && prefs.categories[category] !== undefined) {
      return Boolean(prefs.categories[category]);
    }

    return true; // Default allow
  }

  _format(row, userId) {
    let categories = row.categories_config;
    if (typeof categories === 'string') {
      try { categories = JSON.parse(categories); } catch { categories = {}; }
    }
    return {
      userId,
      inAppEnabled: Boolean(row.in_app_enabled),
      emailEnabled: Boolean(row.email_enabled),
      smsEnabled: Boolean(row.sms_enabled),
      categories: {
        ...DEFAULT_USER_PREFERENCES.categories,
        ...(categories || {})
      }
    };
  }

  clearInMemory() {
    this.inMemoryPreferences.clear();
  }
}

export const notificationPreferenceService = new NotificationPreferenceService();
export default notificationPreferenceService;
