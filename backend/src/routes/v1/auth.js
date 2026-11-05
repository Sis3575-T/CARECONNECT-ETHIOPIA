/**
 * CareConnect Ethiopia - Authentication Routes
 */

import { Router } from 'express';
import AuthController from '../../controllers/authController.js';
import { validate } from '../../middleware/validate.js';

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

export default router;
