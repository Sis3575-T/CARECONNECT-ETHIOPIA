/**
 * CareConnect Ethiopia - Authentication Routes
 */

import { Router } from 'express';
import AuthController from '../../controllers/authController.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';

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

router.post('/register', validate(registerSchema), AuthController.register);

// Login validation schema
const loginSchema = {
  email: { required: true, type: 'email' },
  password: { required: true, minLength: 1 }
};

router.post('/login', validate(loginSchema), AuthController.login);

// Current User Profile
router.get('/me', authenticate, AuthController.getProfile);

export default router;
