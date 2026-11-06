import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { request } from './testHelper.js';
import UserModel from '../src/models/userModel.js';

test('Login Security & Account Lockout Suite', async (t) => {
  UserModel.clearMockUsers();

  const testEmail = 'triage.nurse@adama.et';
  const testPassword = 'ValidPassword2026!';

  await request(app).post('/api/v1/auth/register', {
    email: testEmail,
    password: testPassword,
    firstName: 'Tsehay',
    lastName: 'Alemu',
    roleId: 1,
    facilityId: 'hc-adama-01'
  });

  await t.test('Login returns short-lived access token and safe user payload', async () => {
    const res = await request(app).post('/api/v1/auth/login', {
      email: testEmail,
      password: testPassword
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.accessToken);
    assert.equal(res.body.data.expiresIn, 900);
    assert.equal(res.body.data.user.roleName, 'HEALTH_CENTRE_STAFF');
    assert.equal(res.body.data.user.portal, 'HEALTH_CENTRE');

    // Crucial security check: password hash must NOT be exposed
    assert.equal(res.body.data.user.password_hash, undefined);
    assert.equal(res.body.data.user.password, undefined);
  });

  await t.test('Locks account after 5 consecutive failed login attempts', async () => {
    const victimEmail = 'lockout.test@careconnect.et';
    const correctPassword = 'CorrectPass2026!';

    await request(app).post('/api/v1/auth/register', {
      email: victimEmail,
      password: correctPassword,
      firstName: 'Lock',
      lastName: 'Out',
      roleId: 2
    });

    // Fail 1 to 4 times
    for (let i = 1; i <= 4; i++) {
      const res = await request(app).post('/api/v1/auth/login', {
        email: victimEmail,
        password: `WrongAttempt#${i}`
      });
      assert.equal(res.status, 401);
      assert.ok(res.body.error.message.includes('Invalid email or password'));
    }

    // 5th failed attempt -> locks account
    const res5 = await request(app).post('/api/v1/auth/login', {
      email: victimEmail,
      password: 'WrongAttempt#5'
    });
    assert.equal(res5.status, 401);

    // 6th attempt (even with correct password!) must be rejected due to account lockout
    const resLocked = await request(app).post('/api/v1/auth/login', {
      email: victimEmail,
      password: correctPassword
    });
    assert.equal(resLocked.status, 401);
    assert.ok(
      resLocked.body.error.message.includes('temporarily locked'),
      'Must reject locked account even with correct credentials'
    );
  });

  await t.test('Rejects deactivated user account with explicit error', async () => {
    const inactiveEmail = 'deactivated.user@careconnect.et';
    const pass = 'Deactivated2026!';

    await request(app).post('/api/v1/auth/register', {
      email: inactiveEmail,
      password: pass,
      firstName: 'Inactive',
      lastName: 'User'
    });

    const user = await UserModel.findByEmail(inactiveEmail);
    assert.ok(user);
    await UserModel.setAccountStatus(user.id, false);

    const res = await request(app).post('/api/v1/auth/login', {
      email: inactiveEmail,
      password: pass
    });

    assert.equal(res.status, 401);
    assert.ok(res.body.error.message.includes('deactivated'));
  });
});
