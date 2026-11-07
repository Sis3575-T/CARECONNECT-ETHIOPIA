/**
 * CareConnect Ethiopia - API Architecture & Domain Conventions Verification Suite
 * Tests master router endpoint registrations, pipeline layering, and architectural contracts.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import v1Router from '../src/routes/v1/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

describe('API Architecture Standardization Suite — Commit 081', () => {
  it('Architecture audit documentation exists with pipeline and contract standards', () => {
    const docPath = path.join(ROOT_DIR, 'docs', 'api', 'architecture-audit-and-standardization.md');
    assert.ok(fs.existsSync(docPath), 'Architecture audit document must exist');
    const content = fs.readFileSync(docPath, 'utf-8');
    assert.ok(content.includes('Standardized Request & Response Pipeline'), 'Must define request pipeline');
    assert.ok(content.includes('Standard Success Envelope'), 'Must specify success response contract');
    assert.ok(content.includes('Standard Error Envelope'), 'Must specify error response contract');
    assert.ok(content.includes('Implementation Roadmap for Part 11'), 'Must include 8-commit roadmap');
  });

  it('Master v1 router mounts all modular domain sub-routers', () => {
    const indexPath = path.join(__dirname, '..', 'src', 'routes', 'v1', 'index.js');
    const indexSql = fs.readFileSync(indexPath, 'utf-8');

    const expectedSubrouters = [
      "router.use('/health'",
      "router.use('/docs'",
      "router.use('/auth'",
      "router.use('/users'",
      "router.use('/facilities'",
      "router.use('/roles'",
      "router.use('/audit'",
      "router.use('/patients'",
      "router.use('/referrals'",
      "router.use('/documents'",
      "router.use('/coordination'"
    ];

    for (const r of expectedSubrouters) {
      assert.ok(indexSql.includes(r), `Master router must mount ${r}`);
    }
  });

  it('Controllers consistently use asyncHandler and standard response helpers', () => {
    const controllersDir = path.join(__dirname, '..', 'src', 'controllers');
    const controllerFiles = fs.readdirSync(controllersDir).filter(f => f.endsWith('.js'));

    assert.ok(controllerFiles.length >= 8, 'Must have at least 8 domain controllers');

    for (const file of controllerFiles) {
      const content = fs.readFileSync(path.join(controllersDir, file), 'utf-8');
      assert.ok(
        content.includes('asyncHandler') || content.includes('successResponse') || content.includes('paginatedResponse') || content.includes('success: true'),
        `Controller ${file} must use standardized response or error handling utilities`
      );
    }
  });
});
