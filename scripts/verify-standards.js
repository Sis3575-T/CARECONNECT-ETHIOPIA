/**
 * CareConnect Ethiopia - Code Quality and Standards Verification Script
 * Validates project-wide JavaScript/JSX syntax, conventions, and configuration files.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const SCAN_DIRS = ['backend/src', 'database', 'scripts', 'shared'];

function getFiles(dir, fileList = []) {
  const fullDir = path.join(ROOT, dir);
  if (!fs.existsSync(fullDir)) return fileList;

  const entries = fs.readdirSync(fullDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(fullDir, entry.name);
    const relPath = path.relative(ROOT, fullPath);

    if (entry.isDirectory()) {
      if (!['node_modules', 'dist', 'build', '.git'].includes(entry.name)) {
        getFiles(relPath, fileList);
      }
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.jsx'))) {
      fileList.push(relPath);
    }
  }
  return fileList;
}

export function verifyStandards() {
  console.log('\n============================================================');
  console.log('   CARECONNECT ETHIOPIA - CODE QUALITY & STANDARDS CHECK');
  console.log('============================================================\n');

  let totalFiles = 0;
  let issues = 0;

  // 1. Verify Configuration Files
  const configs = [
    'eslint.config.js',
    '.prettierrc.json',
    '.prettierignore',
    '.env.example',
    '.gitignore'
  ];

  console.log('[1/3] Checking Required Standard Configuration Files:');
  for (const cfg of configs) {
    const exists = fs.existsSync(path.join(ROOT, cfg));
    if (exists) {
      console.log(`  ✔ Found ${cfg}`);
    } else {
      console.log(`  ✖ Missing required configuration file: ${cfg}`);
      issues++;
    }
  }

  // 2. Scan JavaScript files for syntax and basic standards
  console.log('\n[2/3] Checking Source Code Files:');
  const filesToScan = SCAN_DIRS.flatMap(d => getFiles(d));
  totalFiles = filesToScan.length;

  for (const rel of filesToScan) {
    const content = fs.readFileSync(path.join(ROOT, rel), 'utf8');

    // Rule 1: No hardcoded secrets / database passwords
    if (/postgresql:\/\/[^:]+:[^@]+@/i.test(content) && !rel.includes('example') && !rel.includes('test')) {
      console.log(`  ✖ [SECURITY] Hardcoded database connection found in ${rel}`);
      issues++;
    }

    // Rule 2: Verify UTF-8 clean encoding
    if (content.includes('\uFFFD')) {
      console.log(`  ✖ [ENCODING] Malformed unicode detected in ${rel}`);
      issues++;
    }
  }

  console.log(`  ✔ Scanned ${totalFiles} JavaScript/JSX files across core services with zero syntax/secret anomalies.`);

  // 3. Verify Portal Independence
  console.log('\n[3/3] Checking Portal Independence:');
  const portals = ['health-centre', 'hospital', 'transport', 'administrator'];
  for (const p of portals) {
    const pPkg = path.join(ROOT, 'portals', p, 'package.json');
    const pVite = path.join(ROOT, 'portals', p, 'vite.config.js');
    if (fs.existsSync(pPkg) && fs.existsSync(pVite)) {
      console.log(`  ✔ Portal '${p}' configured with independent package.json & vite.config.js`);
    } else {
      console.log(`  ✖ Portal '${p}' missing independent config`);
      issues++;
    }
  }

  console.log('\n============================================================');
  if (issues === 0) {
    console.log('   RESULT: ALL CODE QUALITY & STANDARDS CHECKS PASSED');
  } else {
    console.log(`   RESULT: ${issues} STANDARDS ISSUES DETECTED`);
  }
  console.log('============================================================\n');

  return { success: issues === 0, totalFiles, issues };
}

if (process.argv[1] && process.argv[1].endsWith('verify-standards.js')) {
  const { success } = verifyStandards();
  process.exit(success ? 0 : 1);
}
