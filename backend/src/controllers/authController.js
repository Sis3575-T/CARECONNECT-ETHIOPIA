/**
 * CareConnect Ethiopia - Authentication Controller
 */

import UserModel from '../models/userModel.js';
import { hashPassword, validatePasswordStrength } from '../utils/password.js';
import { ConflictError, ValidationError, UnauthorizedError } from '../utils/errors.js';

export class AuthController {
  /**
   * Register a new user
   */
  static async register(req, res, next) {
    try {
      const { email, password, firstName, lastName, phoneNumber, roleId, facilityId, department, jobTitle } = req.body;

      // Validate password strength
      const strength = validatePasswordStrength(password);
      if (!strength.valid) {
        throw new ValidationError(strength.message);
      }

      // Check if user already exists
      const existing = await UserModel.findByEmail(email);
      if (existing) {
        throw new ConflictError(`User with email '${email}' already exists`);
      }

      // Cryptographically hash password
      const passwordHash = await hashPassword(password);

      const newUser = await UserModel.create({
        email,
        passwordHash,
        firstName,
        lastName,
        phoneNumber,
        roleId,
        facilityId,
        department,
        jobTitle
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: { user: newUser }
      });
    } catch (err) {
      next(err);
    }
  }
}

export default AuthController;
