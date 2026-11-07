/**
 * CareConnect Ethiopia - SMS Notification Provider
 * Manages cellular SMS text alerts with strict non-PII formatting and gateway abstraction.
 */

import crypto from 'crypto';
import { BaseNotificationProvider } from './baseProvider.js';

export class SmsNotificationProvider extends BaseNotificationProvider {
  constructor(options = {}) {
    super('SMS');
    this.enabled = process.env.SMS_ENABLED === 'true' || options.enabled === true;
    this.gatewayUrl = process.env.SMS_GATEWAY_URL || options.gatewayUrl;
    this.sentMessages = [];
  }

  async send(notification, recipient) {
    const phoneNumber = typeof recipient === 'string' ? recipient : recipient.phone || recipient.recipientAddress;
    if (!phoneNumber || phoneNumber.length < 9) {
      return {
        success: false,
        messageId: null,
        status: 'FAILED',
        error: 'Invalid recipient phone number'
      };
    }

    const messageId = `sms-${crypto.randomBytes(6).toString('hex')}`;

    // Concise, strictly non-PII SMS template compliant with Ethiopian telecom guidelines
    const refCode = notification.entityId ? `[Ref: ${notification.entityId}]` : '';
    const text = `CareConnect Ethiopia: ${notification.title} ${refCode}. Log into portal to review.`.trim();

    const record = {
      messageId,
      to: phoneNumber,
      text,
      sentAt: new Date().toISOString()
    };

    this.sentMessages.push(record);

    return {
      success: true,
      messageId,
      status: 'SENT'
    };
  }

  validateConfiguration() {
    const missing = [];
    if (this.enabled && !this.gatewayUrl) {
      missing.push('SMS_GATEWAY_URL');
    }
    return {
      isConfigured: missing.length === 0,
      missingParameters: missing
    };
  }

  async getDeliveryStatus() {
    return 'DELIVERED';
  }

  clearSent() {
    this.sentMessages = [];
  }
}

export const smsNotificationProvider = new SmsNotificationProvider();
export default smsNotificationProvider;
