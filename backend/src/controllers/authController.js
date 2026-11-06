/**
 * CareConnect Ethiopia - Authentication Controller
 */

import UserModel from '../models/userModel.js';
import TokenModel from '../models/tokenModel.js';
import SecurityAuditService from '../services/securityAuditService.js';
import { hashPassword, comparePassword, validatePasswordStrength } from '../utils/password.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/token.js';
import { ConflictError, ValidationError, UnauthorizedError, NotFoundError } from '../utils/errors.js';
import { SECURITY_EVENTS, AUTH_CONFIG } from '../constants/index.js';

// Dummy bcrypt hash to run constant-time comparison when email is not found
const DUMMY_HASH = '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuv';

export class AuthController {
  /**
   * Register a new user
   */
  static async register(req, res, next) {
    try {
      const { email, password, firstName, lastName, phoneNumber, roleId, facilityId, department, jobTitle } = req.body;

      // Validate password strength & common blacklist
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
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown';

    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new ValidationError('Email and password are required');
      }

      const user = await UserModel.findByEmailWithRole(email);

      // Defend against timing attacks: execute comparison even when account does not exist
      if (!user) {
        await comparePassword(password, DUMMY_HASH);
        await SecurityAuditService.recordEvent({
          eventName: SECURITY_EVENTS.USER_LOGIN_FAILED,
          severity: 'WARNING',
          ipAddress,
          userAgent,
          details: { reason: 'User not found' }
        });
        throw new UnauthorizedError('Invalid email or password credentials');
      }

      // 1. Check account deletion
      if (user.deleted_at) {
        throw new UnauthorizedError('Invalid email or password credentials');
      }

      // 2. Check account lockout status
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        const remainingMinutes = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000);
        await SecurityAuditService.recordEvent({
          eventName: SECURITY_EVENTS.ACCOUNT_LOCKED,
          severity: 'WARNING',
          userId: user.id,
          ipAddress,
          userAgent,
          details: { lockedUntil: user.locked_until, remainingMinutes }
        });
        throw new UnauthorizedError(`Account is temporarily locked due to consecutive failed login attempts. Please try again in ${remainingMinutes} minute(s).`);
      }

      // 3. Check account activation
      if (!user.is_active) {
        throw new UnauthorizedError('User account is deactivated. Contact system administrator.');
      }

      // 4. Verify password hash
      const isMatch = await comparePassword(password, user.password_hash);
      if (!isMatch) {
        const failureResult = await UserModel.recordLoginFailure(user.id, user.failed_login_attempts || 0);
        if (failureResult.isLocked) {
          await SecurityAuditService.recordEvent({
            eventName: SECURITY_EVENTS.ACCOUNT_LOCKED,
            severity: 'CRITICAL',
            userId: user.id,
            ipAddress,
            userAgent,
            details: { failedAttempts: failureResult.attempts, lockedUntil: failureResult.lockedUntil }
          });
        } else {
          await SecurityAuditService.recordEvent({
            eventName: SECURITY_EVENTS.USER_LOGIN_FAILED,
            severity: 'WARNING',
            userId: user.id,
            ipAddress,
            userAgent,
            details: { failedAttempts: failureResult.attempts }
          });
        }
        throw new UnauthorizedError('Invalid email or password credentials');
      }

      // 5. Successful login: reset failed attempts & record event
      await UserModel.recordLoginSuccess(user.id);
      await SecurityAuditService.recordEvent({
        eventName: SECURITY_EVENTS.USER_LOGIN_SUCCESS,
        severity: 'INFO',
        userId: user.id,
        facilityId: user.facility_id,
        ipAddress,
        userAgent
      });

      // 6. Generate JWT Access & Refresh Tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);
      await TokenModel.saveRefreshToken(user.id, refreshToken);

      // Set hardened HttpOnly cookie for browser clients
      res.cookie(AUTH_CONFIG.REFRESH_COOKIE_NAME, refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/api/v1/auth',
        maxAge: AUTH_CONFIG.REFRESH_TOKEN_TTL_MS
      });

      // Safe user payload (password hash is strictly stripped)
      const safeUser = {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        roleId: user.role_id,
        roleName: user.role_name || 'HEALTH_CENTRE_STAFF',
        portal: user.portal_access || 'HEALTH_CENTRE',
        facilityId: user.facility_id,
        department: user.department,
        jobTitle: user.job_title
      };

      res.status(200).json({
        success: true,
        message: 'Authentication successful',
        data: {
          user: safeUser,
          accessToken,
          refreshToken,
          expiresIn: AUTH_CONFIG.ACCESS_TOKEN_TTL_SECONDS
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Refresh expired access token using valid refresh token
   */
  static async refresh(req, res, next) {
    try {
      const refreshToken = req.body.refreshToken || req.cookies?.[AUTH_CONFIG.REFRESH_COOKIE_NAME];
      if (!refreshToken) {
        throw new UnauthorizedError('Refresh token is required');
      }

      // Verify cryptographic signature and expiration
      const decoded = verifyRefreshToken(refreshToken);

      // Verify token hasn't been revoked
      const isValid = await TokenModel.isTokenValid(refreshToken);
      if (!isValid) {
        throw new UnauthorizedError('Refresh token has been revoked or expired');
      }

      const user = await UserModel.findById(decoded.userId);
      if (!user || !user.is_active) {
        throw new UnauthorizedError('User account not found or deactivated');
      }

      // Generate new access token
      const newAccessToken = generateAccessToken(user);

      res.status(200).json({
        success: true,
        message: 'Access token renewed successfully',
        data: {
          accessToken: newAccessToken,
          expiresIn: AUTH_CONFIG.ACCESS_TOKEN_TTL_SECONDS
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Terminate session and revoke tokens
   */
  static async logout(req, res, next) {
    try {
      const refreshToken = req.body.refreshToken || req.cookies?.[AUTH_CONFIG.REFRESH_COOKIE_NAME];
      if (refreshToken) {
        await TokenModel.revokeToken(refreshToken);
      }

      // If user is authenticated, revoke all user tokens
      if (req.user && req.user.userId) {
        await TokenModel.revokeAllUserTokens(req.user.userId);
      }

      // Clear refresh cookie
      res.clearCookie(AUTH_CONFIG.REFRESH_COOKIE_NAME, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/api/v1/auth'
      });

      res.status(200).json({
        success: true,
        message: 'Session terminated successfully and tokens revoked'
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get authenticated user profile
   */
  static async getProfile(req, res, next) {
    try {
      const user = await UserModel.findById(req.user.userId);
      if (!user) {
        throw new NotFoundError('User profile not found');
      }

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            roleId: user.role_id,
            facilityId: user.facility_id,
            department: user.department,
            jobTitle: user.job_title,
            isActive: user.is_active
          }
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

export default AuthController;
