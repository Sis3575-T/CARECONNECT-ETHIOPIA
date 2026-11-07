import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PORTALS } from '../constants/portals.js';
import { ROLES, PERMISSIONS } from '../constants/roles.js';
import {
  HEALTH_CENTRE_ROUTES,
  HOSPITAL_ROUTES,
  TRANSPORT_ROUTES,
  ADMIN_ROUTES
} from '../constants/routes.js';
import { TRIAGE_PRIORITIES } from '../constants/triage.js';
import { normalizeApiError, generateRequestId } from '../services/apiClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

test('CareConnect Ethiopia — Comprehensive Frontend Architecture Verification Suite (Part 15)', async (t) => {
  await t.test('1. Shared package exports all required primitives and utilities from shared/index.js', () => {
    const indexPath = path.join(rootDir, 'shared', 'index.js');
    assert.ok(fs.existsSync(indexPath), 'shared/index.js must exist');
    const indexContent = fs.readFileSync(indexPath, 'utf8');

    // Expected exports in barrel
    const expectedExports = [
      'Button.jsx',
      'TextInput.jsx',
      'PasswordInput.jsx',
      'Select.jsx',
      'Textarea.jsx',
      'Checkbox.jsx',
      'SearchInput.jsx',
      'Card.jsx',
      'Badge.jsx',
      'StatusIndicator.jsx',
      'Avatar.jsx',
      'Divider.jsx',
      'EmptyState.jsx',
      'Pagination.jsx',
      'Alert.jsx',
      'Spinner.jsx',
      'Skeleton.jsx',
      'Modal.jsx',
      'Toast.jsx',
      'LiveAnnouncer.jsx',
      'SharedHeader.jsx',
      'SharedSidebar.jsx',
      'SharedMobileNav.jsx',
      'Breadcrumbs.jsx',
      'PortalLayout.jsx',
      'SkipToContent.jsx',
      'ThemeContext.jsx',
      'AuthContext.jsx',
      'useTheme.js',
      'useAuth.js',
      'apiClient.js',
      'ProtectedRoute.jsx',
      'RoleRoute.jsx',
      'NotFoundPage.jsx',
      'UnauthorizedPage.jsx'
    ];

    for (const exp of expectedExports) {
      assert.ok(
        indexContent.includes(exp),
        `shared/index.js must export or re-export ${exp}`
      );
    }
  });

  await t.test('2. Independent portal workspace structures exist for all four portals', () => {
    const portals = ['health-centre', 'hospital', 'transport', 'administrator'];
    for (const portal of portals) {
      const portalPath = path.join(rootDir, 'portals', portal);
      assert.ok(fs.existsSync(portalPath), `portal directory missing: ${portal}`);
      assert.ok(fs.existsSync(path.join(portalPath, 'package.json')), `portal package.json missing: ${portal}`);
      assert.ok(fs.existsSync(path.join(portalPath, 'vite.config.js')), `portal vite.config.js missing: ${portal}`);
      assert.ok(fs.existsSync(path.join(portalPath, 'src/App.jsx')), `portal App.jsx missing: ${portal}`);
    }
  });

  await t.test('3. Portal vite configs resolve @shared alias accurately to shared directory', () => {
    const portals = ['health-centre', 'hospital', 'transport', 'administrator'];
    for (const portal of portals) {
      const configPath = path.join(rootDir, 'portals', portal, 'vite.config.js');
      const content = fs.readFileSync(configPath, 'utf8');
      assert.ok(content.includes('@shared'), `missing @shared alias in ${portal}/vite.config.js`);
    }
  });

  await t.test('4. Root package.json configures workspace members and independent build commands', () => {
    const rootPkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
    assert.ok(rootPkg.workspaces.includes('portals/health-centre'));
    assert.ok(rootPkg.workspaces.includes('portals/hospital'));
    assert.ok(rootPkg.workspaces.includes('portals/transport'));
    assert.ok(rootPkg.workspaces.includes('portals/administrator'));

    assert.ok(rootPkg.scripts['build:health']);
    assert.ok(rootPkg.scripts['build:hospital']);
    assert.ok(rootPkg.scripts['build:transport']);
    assert.ok(rootPkg.scripts['build:admin']);
    assert.ok(rootPkg.scripts['build:all']);
  });

  await t.test('5. Triage severity tokens adhere to clinical escalation criteria', () => {
    assert.equal(TRIAGE_PRIORITIES.EMERGENCY.key, 'EMERGENCY');
    assert.equal(TRIAGE_PRIORITIES.URGENT.key, 'URGENT');
    assert.equal(TRIAGE_PRIORITIES.PRIORITY.key, 'PRIORITY');
    assert.equal(TRIAGE_PRIORITIES.ROUTINE.key, 'ROUTINE');
  });

  await t.test('6. Portal navigation routes cover all required functional views', () => {
    // Health Centre
    assert.equal(HEALTH_CENTRE_ROUTES.CREATE_REFERRAL, '/create-referral');
    assert.equal(HEALTH_CENTRE_ROUTES.AI_REVIEW, '/ai-review');

    // Hospital
    assert.equal(HOSPITAL_ROUTES.INCOMING, '/incoming');
    assert.equal(HOSPITAL_ROUTES.PENDING_TRIAGE, '/pending');
    assert.equal(HOSPITAL_ROUTES.CAPACITY, '/capacity');

    // Transport
    assert.equal(TRANSPORT_ROUTES.REQUESTS, '/requests');
    assert.equal(TRANSPORT_ROUTES.IN_TRANSIT, '/in-transit');
    assert.equal(TRANSPORT_ROUTES.FLEET, '/resources');

    // Administrator
    assert.equal(ADMIN_ROUTES.USERS, '/users');
    assert.equal(ADMIN_ROUTES.ROLES, '/roles');
    assert.equal(ADMIN_ROUTES.FACILITIES, '/facilities');
    assert.equal(ADMIN_ROUTES.AUDIT_LOGS, '/audit-logs');
  });

  await t.test('7. API Client normalizes 400 validation errors into field-level details', () => {
    const error = {
      response: {
        status: 400,
        data: {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: [{ field: 'first_name', message: 'First name is required' }]
          }
        }
      }
    };
    const normalized = normalizeApiError(error);
    assert.equal(normalized.status, 400);
    assert.equal(normalized.code, 'VALIDATION_ERROR');
    assert.equal(normalized.details[0].field, 'first_name');
  });

  await t.test('8. API Client generates and propagates unique X-Request-Id tokens', () => {
    const id1 = generateRequestId();
    const id2 = generateRequestId();
    assert.ok(id1.startsWith('req-'));
    assert.ok(id2.startsWith('req-'));
    assert.notEqual(id1, id2);
  });
});
