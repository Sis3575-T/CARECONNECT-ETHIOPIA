/**
 * CareConnect Ethiopia - Cryptographic Password Hashing Utility
 */

import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Hash plain text password using bcrypt
 */
export async function hashPassword(plainText, rounds = SALT_ROUNDS) {
  if (!plainText || typeof plainText !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  return bcrypt.hash(plainText, rounds);
}

/**
 * Compare plain text password against stored bcrypt hash
 */
export async function comparePassword(plainText, hash) {
  if (!plainText || !hash) return false;
  return bcrypt.compare(plainText, hash);
}

/**
 * Validates password complexity requirements
 */
export function validatePasswordStrength(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required' };
  }
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  if (!hasLetter || !hasNumber) {
    return { valid: false, message: 'Password must contain at least one letter and one number' };
  }
  return { valid: true };
}

export default { hashPassword, comparePassword, validatePasswordStrength };
