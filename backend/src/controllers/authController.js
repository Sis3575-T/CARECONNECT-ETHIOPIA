/**
 * CareConnect Ethiopia - Authentication Controller
 */

import UserModel from '../models/userModel.js';
import { ConflictError, ValidationError, UnauthorizedError } from '../utils/errors.js';

export class AuthController {
  /**
   * Register a new user
   */
  static async register(req, res, next) {
    try {
      const { email, password, firstName, lastName, phoneNumber, roleId, facilityId, department, jobTitle } = req.body;

      // Check if user already exists
      const existing = await UserModel.findByEmail(email);
      if (existing) {
        throw new ConflictError(`User with email '${email}' already exists`);
      }

      // Password hashing placeholder for commit 41 (will be enhanced with bcrypt in commit 42)
      const passwordHash = password;

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
