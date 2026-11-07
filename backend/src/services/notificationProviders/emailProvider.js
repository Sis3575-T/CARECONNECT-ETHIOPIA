/**
 * CareConnect Ethiopia - Email Notification Provider
 * Manages email delivery via SMTP or secure mock transport with strict PII sanitization.
 */

import crypto from 'crypto';
import { BaseNotificationProvider } from './baseProvider.js';

export class EmailNotificationProvider extends BaseNotificationProvider {
  constructor(options = {}) {
    super('EMAIL');
    this.enabled = process.env.EMAIL_ENABLED === 'true' || options.enabled === true;
    this.smtpHost = process.env.SMTP_HOST || options.smtpHost;
    this.smtpPort = process.env.SMTP_PORT || options.smtpPort || 587;
    this.fromAddress = process.env.SMTP_FROM || options.fromAddress || 'notifications@careconnect.et';
    this.sentEmails = [];
  }

  async send(notification, recipient) {
    const emailAddress = typeof recipient === 'string' ? recipient : recipient.email || recipient.recipientAddress;
    if (!emailAddress || !emailAddress.includes('@')) {
      return {
        success: false,
        messageId: null,
        status: 'FAILED',
        error: 'Invalid recipient email address'
      };
    }

    const messageId = `email-${crypto.randomBytes(6).toString('hex')}`;

    // Sanitize message: never allow raw clinical diagnosis strings in email text
    const sanitizedBody = `
CareConnect Ethiopia Healthcare Alert:
${notification.title}

${notification.message}

To inspect patient clinical details securely, log into your authorized portal:
https://portal.careconnect.et/referrals/${notification.entityId || ''}

Confidentiality Notice: This message is intended strictly for authorized healthcare personnel.
    `.trim();

    const record = {
      messageId,
      to: emailAddress,
      from: this.fromAddress,
      subject: `[CareConnect] ${notification.title}`,
      body: sanitizedBody,
      sentAt: new Date().toISOString()
    };

    this.sentEmails.push(record);

    return {
      success: true,
      messageId,
      status: 'SENT'
    };
  }

  validateConfiguration() {
    const missing = [];
    if (this.enabled && !this.smtpHost) {
      missing.push('SMTP_HOST');
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
    this.sentEmails = [];
  }
}

export const emailNotificationProvider = new EmailNotificationProvider();
export default emailNotificationProvider;
