import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('Design Tokens & Theme Architecture Suite — Commit 114', async (t) => {
  const themeCssPath = path.resolve(__dirname, '../styles/theme.css');
  const themeCss = fs.readFileSync(themeCssPath, 'utf8');

  await t.test('1. theme.css contains complete primary Ethiopian healthcare palette', () => {
    assert.ok(themeCss.includes('--cc-primary-50:'), 'missing --cc-primary-50');
    assert.ok(themeCss.includes('--cc-primary-500:'), 'missing --cc-primary-500');
    assert.ok(themeCss.includes('--cc-primary-700:'), 'missing --cc-primary-700');
    assert.ok(themeCss.includes('--cc-primary-900:'), 'missing --cc-primary-900');
  });

  await t.test('2. theme.css defines clinical triage severity tokens matching guidelines', () => {
    assert.ok(themeCss.includes('--cc-triage-emergency: #e11d48;'), 'missing emergency triage token');
    assert.ok(themeCss.includes('--cc-triage-urgent: #d97706;'), 'missing urgent triage token');
    assert.ok(themeCss.includes('--cc-triage-priority: #2563eb;'), 'missing priority triage token');
    assert.ok(themeCss.includes('--cc-triage-routine: #059669;'), 'missing routine triage token');
  });

  await t.test('3. theme.css defines surface, border, and typography tokens for light mode', () => {
    assert.ok(themeCss.includes('--cc-bg-page:'), 'missing --cc-bg-page');
    assert.ok(themeCss.includes('--cc-bg-surface:'), 'missing --cc-bg-surface');
    assert.ok(themeCss.includes('--cc-border-subtle:'), 'missing --cc-border-subtle');
    assert.ok(themeCss.includes('--cc-text-primary:'), 'missing --cc-text-primary');
    assert.ok(themeCss.includes('--cc-font-sans:'), 'missing --cc-font-sans');
  });

  await t.test('4. theme.css includes comprehensive .dark theme overrides', () => {
    assert.ok(themeCss.includes('.dark {'), 'missing .dark class rule block');
    assert.ok(themeCss.includes('--cc-bg-page: #0b1120;'), 'missing dark page background');
    assert.ok(themeCss.includes('--cc-text-primary: #f8fafc;'), 'missing dark text primary');
    assert.ok(themeCss.includes('--cc-border-subtle: #334155;'), 'missing dark border subtle');
  });

  await t.test('5. theme.css includes accessible focus rings and reduced motion media query', () => {
    assert.ok(themeCss.includes('--cc-focus-ring:'), 'missing focus ring token');
    assert.ok(themeCss.includes('prefers-reduced-motion: reduce'), 'missing reduced motion media query');
  });
});
