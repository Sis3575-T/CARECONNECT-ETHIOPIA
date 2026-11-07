/**
 * CareConnect Ethiopia - Base Notification Provider Interface
 */

export class BaseNotificationProvider {
  constructor(name) {
    this.name = name;
  }

  /**
   * Sends a notification to the destination address
   * @param {object} notification - { title, message, entityType, entityId, priority }
   * @param {string|object} recipient - Destination address (phone, email, or user context)
   * @returns {Promise<{ success: boolean, messageId: string, status: string, error?: string }>}
   */
  async send(notification, recipient) {
    throw new Error(`send() must be implemented by ${this.name} provider`);
  }

  /**
   * Validates provider configuration parameters
   * @returns {{ isConfigured: boolean, missingParameters: string[] }}
   */
  validateConfiguration() {
    return { isConfigured: true, missingParameters: [] };
  }

  /**
   * Queries delivery status from upstream gateway if supported
   * @param {string} providerMessageId
   * @returns {Promise<string>} e.g. 'DELIVERED', 'PENDING', 'FAILED'
   */
  async getDeliveryStatus(providerMessageId) {
    return 'UNKNOWN';
  }
}

export default BaseNotificationProvider;
