/**
 * CareConnect Ethiopia - Authentication Controller
 */

import UserModel from '../models/userModel.js';
import { hashPassword, comparePassword, validatePasswordStrength } from '../utils/password.js';
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

  /**
   * Authenticate user with email and password
   */
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;

      const user = await UserModel.findByEmail(email);
      if (!user) {
        throw new UnauthorizedError('Invalid email or password credentials');
      }

      if (!user.is_active) {
        throw new UnauthorizedError('User account is deactivated. Contact system administrator.');
      }

      const isMatch = await comparePassword(password, user.password_hash);
      if (!isMatch) {
        throw new UnauthorizedError('Invalid email or password credentials');
      }

      // Safe user payload without password hash
      const safeUser = {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        roleId: user.role_id,
        facilityId: user.facility_id,
        department: user.department,
        jobTitle: user.job_title
      };

      res.status(200).json({
        success: true,
        message: 'Authentication successful',
        data: {
          user: safeUser
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

export default AuthController;
