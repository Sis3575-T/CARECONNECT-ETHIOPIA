/**
 * CareConnect Ethiopia - In-App Notification Center Service
 * Manages notification querying, fast unread metrics, ownership-enforced read states,
 * and soft-dismissal operations.
 */

import { notificationRepository } from '../repositories/notificationRepository.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';

export class NotificationService {
  constructor(repo = notificationRepository) {
    this.repo = repo;
  }

  /**
   * Retrieves paginated active notifications for the authorized recipient
   */
  async getNotifications(recipientUserId, options = {}) {
    return await this.repo.listByRecipient(recipientUserId, {
      ...options,
      isDismissed: options.isDismissed !== undefined ? options.isDismissed : false
    });
  }

  /**
   * Retrieves only unread active notifications for the authorized recipient
   */
  async getUnreadNotifications(recipientUserId, options = {}) {
    return await this.repo.listByRecipient(recipientUserId, {
      ...options,
      isRead: false,
      isDismissed: false
    });
  }

  /**
   * Returns instantaneous count of unread, non-dismissed notifications
   */
  async getUnreadCount(recipientUserId) {
    const count = await this.repo.countUnread(recipientUserId);
    return { unreadCount: count };
  }

  /**
   * Retrieves single notification ensuring strict recipient ownership
   */
  async getNotificationById(identifier, recipientUserId) {
    const notif = await this.repo.findByIdOrUuid(identifier);
    if (!notif) {
      throw new NotFoundError(`Notification '${identifier}' not found`);
    }

    if (notif.recipientUserId !== Number(recipientUserId)) {
      throw new ForbiddenError('Access denied: You do not have permission to view this notification');
    }

    return notif;
  }

  /**
   * Marks a notification as read with strict recipient ownership guard
   */
  async markAsRead(identifier, recipientUserId) {
    // Check existence and ownership
    const notif = await this.repo.findByIdOrUuid(identifier);
    if (!notif) {
      throw new NotFoundError(`Notification '${identifier}' not found`);
    }

    if (notif.recipientUserId !== Number(recipientUserId)) {
      throw new ForbiddenError('Access denied: You cannot mark another user notification as read');
    }

    if (notif.isRead) {
      return notif; // Idempotent: already read
    }

    return await this.repo.markAsRead(identifier, recipientUserId);
  }

  /**
   * Marks a notification as unread
   */
  async markAsUnread(identifier, recipientUserId) {
    const notif = await this.repo.findByIdOrUuid(identifier);
    if (!notif) {
      throw new NotFoundError(`Notification '${identifier}' not found`);
    }

    if (notif.recipientUserId !== Number(recipientUserId)) {
      throw new ForbiddenError('Access denied: You cannot modify another user notification');
    }

    if (!notif.isRead) {
      return notif; // Idempotent: already unread
    }

    return await this.repo.markAsUnread(identifier, recipientUserId);
  }

  /**
   * Marks all eligible active unread notifications as read
   */
  async markAllAsRead(recipientUserId, options = {}) {
    const updatedCount = await this.repo.markAllAsRead(recipientUserId, options);
    return {
      success: true,
      markedCount: updatedCount
    };
  }

  /**
   * Soft-dismisses/archives a notification from the active notification center
   */
  async dismissNotification(identifier, recipientUserId) {
    const notif = await this.repo.findByIdOrUuid(identifier);
    if (!notif) {
      throw new NotFoundError(`Notification '${identifier}' not found`);
    }

    if (notif.recipientUserId !== Number(recipientUserId)) {
      throw new ForbiddenError('Access denied: You cannot dismiss another user notification');
    }

    return await this.repo.dismiss(identifier, recipientUserId);
  }
}

export const notificationService = new NotificationService();
export default notificationService;
