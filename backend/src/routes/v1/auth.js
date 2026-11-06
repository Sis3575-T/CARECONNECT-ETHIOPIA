/**
 * CareConnect Ethiopia - Authentication & Session Management Routes
 */

import { Router } from 'express';
import AuthController from '../../controllers/authController.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { authRateLimiter } from '../../middleware/rateLimit.js';

const router = Router();

// Registration validation schema
const registerSchema = {
  email: { required: true, type: 'email' },
  password: { required: true, minLength: 8 },
  firstName: { required: true, minLength: 2 },
  lastName: { required: true, minLength: 2 },
  roleId: { required: false, type: 'number' },
  facilityId: { required: false }
};

router.post('/register', authRateLimiter, validate(registerSchema), AuthController.register);

// Login validation schema
const loginSchema = {
  email: { required: true, type: 'email' },
  password: { required: true, minLength: 1 }
};

router.post('/login', authRateLimiter, validate(loginSchema), AuthController.login);

// Refresh Token route (validates either body refreshToken or cookie)
router.post('/refresh', AuthController.refresh);

// Logout current session
router.post('/logout', AuthController.logout);

// Global logout across all devices
router.post('/logout-all', authenticate, AuthController.logoutAll);

// Current User Profile
router.get('/me', authenticate, AuthController.getProfile);

// User Permissions & Portal Access
router.get('/permissions', authenticate, AuthController.getPermissions);

// Active Sessions Management
router.get('/sessions', authenticate, AuthController.getSessions);
router.delete('/sessions/:sessionId', authenticate, AuthController.revokeSession);

export default router;
