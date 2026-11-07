/**
 * CareConnect Ethiopia - Multi-Channel Notification Delivery Service
 * Manages provider dispatch, delivery status tracking, deduplication, and retries.
 */

import crypto from 'crypto';
import { DbService } from './dbService.js';
import { inAppNotificationProvider } from './notificationProviders/inAppProvider.js';
import { emailNotificationProvider } from './notificationProviders/emailProvider.js';
import { smsNotificationProvider } from './notificationProviders/smsProvider.js';
import { NOTIFICATION_CHANNELS, DELIVERY_STATUS } from '../constants/jobs.js';

export class NotificationDeliveryService {
  constructor() {
    this.providers = new Map([
      [NOTIFICATION_CHANNELS.IN_APP, inAppNotificationProvider],
      [NOTIFICATION_CHANNELS.EMAIL, emailNotificationProvider],
      [NOTIFICATION_CHANNELS.SMS, smsNotificationProvider]
    ]);
    this.inMemoryDeliveries = new Map();
  }

  /**
   * Registers a custom provider adapter
   * @param {string} channel
   * @param {object} providerInstance
   */
  registerProvider(channel, providerInstance) {
    this.providers.set(channel, providerInstance);
  }

  /**
   * Dispatches a notification via specified channel with deduplication
   * @param {object} params
   * @returns {Promise<object>} Delivery record
   */
  async dispatch(params = {}) {
    const {
      channel = NOTIFICATION_CHANNELS.IN_APP,
      recipientUserId,
      recipientAddress,
      title,
      message,
      notificationType,
      entityType,
      entityId,
      priority = 'NORMAL',
      deduplicationKey
    } = params;

    const dedupKey = deduplicationKey || `${channel}:${recipientUserId || recipientAddress}:${entityType}:${entityId}:${title}`;
    const deliveryId = crypto.randomUUID();
    const now = new Date().toISOString();

    // 1. Check deduplication
    const existing = await this._getDeliveryByDedupKey(dedupKey);
    if (existing) {
      return existing; // Already sent or in progress
    }

    const provider = this.providers.get(channel);
    if (!provider) {
      throw new Error(`Unsupported notification delivery channel: ${channel}`);
    }

    // 2. Execute delivery via provider
    const sendResult = await provider.send(
      { title, message, notificationType, entityType, entityId, priority },
      recipientAddress || { userId: recipientUserId }
    );

    const deliveryStatus = sendResult.success ? DELIVERY_STATUS.SENT : DELIVERY_STATUS.FAILED;
    const errorMessage = sendResult.error || null;
    const providerMessageId = sendResult.messageId || null;

    // 3. Persist delivery record
    try {
      const sql = `
        INSERT INTO notification_deliveries (
          id, channel, recipient_user_id, recipient_address, status,
          attempts, deduplication_key, error_message, provider_name,
          provider_message_id, sent_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, 1, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (deduplication_key) DO NOTHING
        RETURNING *;
      `;
      const res = await DbService.query(sql, [
        deliveryId,
        channel,
        Number(recipientUserId) || null,
        recipientAddress ? String(recipientAddress) : null,
        deliveryStatus,
        dedupKey,
        errorMessage,
        provider.name,
        providerMessageId,
        sendResult.success ? now : null,
        now
      ]);

      if (res.rows && res.rows.length > 0) {
        return this._formatDelivery(res.rows[0]);
      }
    } catch {
      // In-memory fallback
    }

    const record = {
      id: deliveryId,
      channel,
      recipient_user_id: recipientUserId,
      recipient_address: recipientAddress,
      status: deliveryStatus,
      attempts: 1,
      deduplication_key: dedupKey,
      error_message: errorMessage,
      provider_name: provider.name,
      provider_message_id: providerMessageId,
      sent_at: sendResult.success ? now : null,
      created_at: now
    };

    this.inMemoryDeliveries.set(deliveryId, record);
    return this._formatDelivery(record);
  }

  async _getDeliveryByDedupKey(dedupKey) {
    try {
      const sql = 'SELECT * FROM notification_deliveries WHERE deduplication_key = $1';
      const res = await DbService.query(sql, [dedupKey]);
      if (res.rows && res.rows.length > 0) {
        return this._formatDelivery(res.rows[0]);
      }
    } catch {
      // In-memory fallback
    }

    for (const d of this.inMemoryDeliveries.values()) {
      if (d.deduplication_key === dedupKey) {
        return this._formatDelivery(d);
      }
    }
    return null;
  }

  _formatDelivery(row) {
    if (!row) return null;
    return {
      id: row.id,
      channel: row.channel,
      recipientUserId: row.recipient_user_id,
      recipientAddress: row.recipient_address,
      status: row.status,
      attempts: row.attempts,
      deduplicationKey: row.deduplication_key,
      errorMessage: row.error_message,
      providerName: row.provider_name,
      providerMessageId: row.provider_message_id,
      sentAt: row.sent_at,
      createdAt: row.created_at
    };
  }

  clearInMemory() {
    this.inMemoryDeliveries.clear();
    for (const provider of this.providers.values()) {
      if (typeof provider.clearInMemory === 'function') provider.clearInMemory();
      if (typeof provider.clearSent === 'function') provider.clearSent();
    }
  }
}

export const notificationDeliveryService = new NotificationDeliveryService();
export default notificationDeliveryService;
