/**
 * CareConnect Ethiopia - In-App Notification Center & Preferences Router
 * Standardized endpoints for user alerts, read states, unread counts, and preferences under /api/v1/notifications.
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { notificationService } from '../../services/notificationService.js';
import { notificationPreferenceService } from '../../services/notificationPreferenceService.js';
import { successResponse, paginatedResponse } from '../../utils/response.js';
import { HTTP_STATUS } from '../../constants/index.js';

const router = Router();

// All notification endpoints require authenticated session
router.use(authenticate);

/**
 * GET /api/v1/notifications/unread-count
 * Fast unread badge counter
 */
router.get('/unread-count', async (req, res, next) => {
  try {
    const result = await notificationService.getUnreadCount(req.user.id);
    return successResponse(res, result, 'Unread count retrieved successfully', HTTP_STATUS.OK);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/notifications/unread
 * Dedicated unread notification inbox view
 */
router.get('/unread', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const category = req.query.category || null;

    const { items, total } = await notificationService.getUnreadNotifications(req.user.id, {
      page,
      limit,
      category
    });

    return paginatedResponse(res, items, page, limit, total, 'Unread notifications retrieved successfully');
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/notifications/preferences
 * Retrieve authenticated user notification preferences
 */
router.get('/preferences', async (req, res, next) => {
  try {
    const preferences = await notificationPreferenceService.getPreferences(req.user.id);
    return successResponse(res, { preferences }, 'Notification preferences retrieved successfully', HTTP_STATUS.OK);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/notifications/preferences
 * Update authenticated user notification preferences
 */
router.patch('/preferences', async (req, res, next) => {
  try {
    const updated = await notificationPreferenceService.updatePreferences(req.user.id, req.body, req.user);
    return successResponse(res, { preferences: updated }, 'Notification preferences updated successfully', HTTP_STATUS.OK);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/notifications/read-all
 * Mark all active unread notifications as read
 */
router.patch('/read-all', async (req, res, next) => {
  try {
    const category = req.query.category || req.body?.category || null;
    const result = await notificationService.markAllAsRead(req.user.id, { category });
    return successResponse(res, result, 'All notifications marked as read', HTTP_STATUS.OK);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/notifications
 * Paginated notification center inbox with filtering
 */
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const category = req.query.category || null;
    const isRead = req.query.isRead !== undefined ? req.query.isRead === 'true' : undefined;

    const { items, total } = await notificationService.getNotifications(req.user.id, {
      page,
      limit,
      category,
      isRead
    });

    return paginatedResponse(res, items, page, limit, total, 'Notifications retrieved successfully');
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/notifications/:id
 * Retrieve single notification details with strict ownership verification
 */
router.get('/:id', async (req, res, next) => {
  try {
    const notification = await notificationService.getNotificationById(req.params.id, req.user.id);
    return successResponse(res, { notification }, 'Notification details retrieved successfully', HTTP_STATUS.OK);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/notifications/:id/read
 * Mark notification as read
 */
router.patch('/:id/read', async (req, res, next) => {
  try {
    const notification = await notificationService.markAsRead(req.params.id, req.user.id);
    return successResponse(res, { notification }, 'Notification marked as read', HTTP_STATUS.OK);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/notifications/:id/unread
 * Mark notification as unread
 */
router.patch('/:id/unread', async (req, res, next) => {
  try {
    const notification = await notificationService.markAsUnread(req.params.id, req.user.id);
    return successResponse(res, { notification }, 'Notification marked as unread', HTTP_STATUS.OK);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/v1/notifications/:id
 * Soft-dismiss/archive notification
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const notification = await notificationService.dismissNotification(req.params.id, req.user.id);
    return successResponse(res, { notification }, 'Notification dismissed successfully', HTTP_STATUS.OK);
  } catch (err) {
    next(err);
  }
});

export default router;
