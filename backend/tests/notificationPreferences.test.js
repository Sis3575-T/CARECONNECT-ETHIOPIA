/**
 * CareConnect Ethiopia - User Notification Preferences Unit Tests
 * Verifies safe preference defaults, channel controls, mandatory category enforcement,
 * cross-user modification boundaries, and delivery decisions — Commit 100.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { NotificationPreferenceService } from '../src/services/notificationPreferenceService.js';
import {
  NOTIFICATION_CATEGORIES,
  DEFAULT_USER_PREFERENCES
} from '../src/constants/notifications.js';

describe('Commit 100: Notification Preferences & Policies Suite', () => {
  let prefService;

  beforeEach(() => {
    prefService = new NotificationPreferenceService();
  });

  test('1. Returns standardized default preferences for users without custom configuration', async () => {
    const prefs = await prefService.getPreferences(301);

    assert.equal(prefs.userId, 301);
    assert.equal(prefs.inAppEnabled, DEFAULT_USER_PREFERENCES.inAppEnabled);
    assert.equal(prefs.emailEnabled, DEFAULT_USER_PREFERENCES.emailEnabled);
    assert.equal(prefs.smsEnabled, DEFAULT_USER_PREFERENCES.smsEnabled);
    assert.equal(prefs.categories[NOTIFICATION_CATEGORIES.ESCALATION], true);
    assert.equal(prefs.categories[NOTIFICATION_CATEGORIES.SECURITY], true);
  });

  test('2. Updates optional channel preferences successfully for account owner', async () => {
    const updated = await prefService.updatePreferences(302, {
      smsEnabled: true,
      emailEnabled: false
    }, { id: 302, roleId: 1 });

    assert.equal(updated.smsEnabled, true);
    assert.equal(updated.emailEnabled, false);
    assert.equal(updated.inAppEnabled, true);
  });

  test('3. Rejects user attempts to disable mandatory categories (SECURITY and ESCALATION)', async () => {
    // Attempt to disable ESCALATION
    await assert.rejects(
      async () => {
        await prefService.updatePreferences(303, {
          categories: { [NOTIFICATION_CATEGORIES.ESCALATION]: false }
        }, { id: 303, roleId: 1 });
      },
      {
        name: 'ValidationError',
        message: /Mandatory notification category 'ESCALATION' cannot be disabled/
      }
    );

    // Attempt to disable SECURITY
    await assert.rejects(
      async () => {
        await prefService.updatePreferences(303, {
          categories: { [NOTIFICATION_CATEGORIES.SECURITY]: false }
        }, { id: 303, roleId: 1 });
      },
      {
        name: 'ValidationError',
        message: /Mandatory notification category 'SECURITY' cannot be disabled/
      }
    );
  });

  test('4. Enforces ownership: Non-admin users cannot modify another user preferences', async () => {
    await assert.rejects(
      async () => {
        // User 304 tries to modify User 305's preferences
        await prefService.updatePreferences(305, {
          inAppEnabled: false
        }, { id: 304, roleId: 1 });
      },
      {
        name: 'ForbiddenError',
        message: /You can only modify your own notification preferences/
      }
    );
  });

  test('5. System Administrator can adjust notification preferences for any user', async () => {
    const adminUser = { id: 999, roleId: 6, roleName: 'SYSTEM_ADMINISTRATOR' };

    const updated = await prefService.updatePreferences(306, {
      smsEnabled: true
    }, adminUser);

    assert.equal(updated.userId, 306);
    assert.equal(updated.smsEnabled, true);
  });

  test('6. shouldDeliver accurately enforces channel status and mandatory delivery rules', async () => {
    // Configure user 307 with SMS disabled and IN_APP disabled
    await prefService.updatePreferences(307, {
      inAppEnabled: false,
      smsEnabled: false
    }, { id: 307, roleId: 1 });

    // Routine referral update on SMS -> False
    assert.equal(await prefService.shouldDeliver(307, NOTIFICATION_CATEGORIES.REFERRAL_UPDATE, 'SMS'), false);

    // Routine referral update in-app when in-app disabled -> False
    assert.equal(await prefService.shouldDeliver(307, NOTIFICATION_CATEGORIES.REFERRAL_UPDATE, 'IN_APP'), false);

    // MANDATORY SECURITY Alert in-app -> ALWAYS True regardless of inAppEnabled setting
    assert.equal(await prefService.shouldDeliver(307, NOTIFICATION_CATEGORIES.SECURITY, 'IN_APP'), true);

    // MANDATORY ESCALATION Alert in-app -> ALWAYS True
    assert.equal(await prefService.shouldDeliver(307, NOTIFICATION_CATEGORIES.ESCALATION, 'IN_APP'), true);
  });
});
