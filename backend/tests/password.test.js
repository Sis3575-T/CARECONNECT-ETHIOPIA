import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hashPassword,
  comparePassword,
  validatePasswordStrength,
  generateResetToken,
  hashResetToken
} from '../src/utils/password.js';

test('Cryptographic Password Hashing & Security Suite', async (t) => {
  await t.test('hashPassword generates valid non-reversible bcrypt hash', async () => {
    const raw = 'CareConnect2026!';
    const hash = await hashPassword(raw);

    assert.notEqual(hash, raw, 'Hash must not equal plain text');
    assert.ok(hash.startsWith('$2a$') || hash.startsWith('$2b$'), 'Must be valid bcrypt salt format');
    assert.equal(hash.length, 60, 'Bcrypt hashes are 60 characters');

    // Verification
    const isMatch = await comparePassword(raw, hash);
    assert.equal(isMatch, true, 'comparePassword should return true for correct password');

    const isWrongMatch = await comparePassword('WrongPassword123!', hash);
    assert.equal(isWrongMatch, false, 'comparePassword should return false for incorrect password');
  });

  await t.test('validatePasswordStrength checks length, letters, numbers, and common dictionary', () => {
    assert.equal(validatePasswordStrength('short1').valid, false);
    assert.equal(validatePasswordStrength('alllettersonly').valid, false);
    assert.equal(validatePasswordStrength('1234567890').valid, false);
    assert.equal(validatePasswordStrength('password123').valid, false, 'Should reject blacklisted common password');
    assert.equal(validatePasswordStrength('admin123').valid, false, 'Should reject blacklisted admin password');
    assert.equal(validatePasswordStrength('ValidSecurePass123!').valid, true);
  });

  await t.test('Rejects passwords exceeding bcrypt 72-byte limit', async () => {
    const tooLong = 'A'.repeat(80);
    assert.equal(validatePasswordStrength(tooLong).valid, false);
    await assert.rejects(async () => {
      await hashPassword(tooLong);
    }, /exceeds maximum length/);
  });

  await t.test('comparePassword gracefully handles null, undefined, or empty inputs', async () => {
    assert.equal(await comparePassword(null, 'hash'), false);
    assert.equal(await comparePassword('password', null), false);
    assert.equal(await comparePassword('', ''), false);
    assert.equal(await comparePassword('password', 'not-a-valid-bcrypt-hash'), false);
  });

  await t.test('generateResetToken and hashResetToken generate safe cryptographic reset hashes', () => {
    const token = generateResetToken();
    assert.equal(typeof token, 'string');
    assert.equal(token.length, 64, '32 bytes in hex is 64 characters');

    const tokenHash = hashResetToken(token);
    assert.equal(tokenHash.length, 64, 'SHA-256 digest is 64 hex characters');
    assert.notEqual(tokenHash, token, 'Hash must not equal raw token');

    // Deterministic hash check
    const tokenHash2 = hashResetToken(token);
    assert.equal(tokenHash, tokenHash2, 'SHA-256 hashing must be deterministic');
  });
});
