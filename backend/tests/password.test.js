import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, comparePassword, validatePasswordStrength } from '../src/utils/password.js';

test('Cryptographic Password Hashing Suite', async (t) => {
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

  await t.test('validatePasswordStrength checks length, letters, and numbers', () => {
    assert.equal(validatePasswordStrength('short1').valid, false);
    assert.equal(validatePasswordStrength('alllettersonly').valid, false);
    assert.equal(validatePasswordStrength('1234567890').valid, false);
    assert.equal(validatePasswordStrength('ValidPass123').valid, true);
  });
});
