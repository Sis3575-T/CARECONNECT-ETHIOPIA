/**
 * CareConnect Ethiopia - Cryptographic Password Hashing & Security Utility
 */

import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const DEFAULT_SALT_ROUNDS = 10;

// Common dictionary weak passwords to reject
const COMMON_WEAK_PASSWORDS = new Set([
  'password',
  'password123',
  '12345678',
  '123456789',
  '1234567890',
  'qwerty123',
  'admin123',
  'careconnect',
  'careconnect123',
  'ethiopia123',
  'welcome123',
  'letmein123',
  'doctor123',
  'hospital123',
  'changeme123'
]);

/**
 * Hash plain text password using bcrypt
 */
export async function hashPassword(plainText, rounds = DEFAULT_SALT_ROUNDS) {
  if (!plainText || typeof plainText !== 'string') {
    throw new Error('Password must be a non-empty string');
  }

  // Bcrypt truncates inputs after 72 bytes; enforce explicit upper bound
  if (Buffer.byteLength(plainText, 'utf8') > 72) {
    throw new Error('Password exceeds maximum length of 72 bytes');
  }

  return bcrypt.hash(plainText, rounds);
}

/**
 * Compare plain text password against stored bcrypt hash safely
 */
export async function comparePassword(plainText, hash) {
  if (!plainText || !hash || typeof plainText !== 'string' || typeof hash !== 'string') {
    return false;
  }
  try {
    return await bcrypt.compare(plainText, hash);
  } catch {
    return false;
  }
}

/**
 * Validates password complexity requirements and common blacklist
 */
export function validatePasswordStrength(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required' };
  }

  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }

  if (Buffer.byteLength(password, 'utf8') > 72) {
    return { valid: false, message: 'Password must not exceed 72 characters' };
  }

  const normalized = password.trim().toLowerCase();
  if (COMMON_WEAK_PASSWORDS.has(normalized)) {
    return { valid: false, message: 'Password is too common or easily guessable. Please choose a stronger password.' };
  }

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasLetter || !hasNumber) {
    return { valid: false, message: 'Password must contain at least one letter and one number' };
  }

  return { valid: true };
}

/**
 * Generate cryptographically secure 32-byte password reset token
 */
export function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Compute SHA-256 hash of password reset token for safe database persistence
 */
export function hashResetToken(token) {
  if (!token || typeof token !== 'string') {
    throw new Error('Token must be a valid string');
  }
  return crypto.createHash('sha256').update(token).digest('hex');
}

export default {
  hashPassword,
  comparePassword,
  validatePasswordStrength,
  generateResetToken,
  hashResetToken
};
