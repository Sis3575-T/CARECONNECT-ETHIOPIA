import { execSync } from 'child_process';
import { loadState, saveState, TASKS } from './progress-tracker.js';

const taskId = parseInt(process.argv[2], 10);
const testsPerformed = process.argv[3] || 'Verified structure and syntax';
const remainingIssues = process.argv[4] || 'None';

if (!taskId || taskId < 1 || taskId > 220) {
  console.error('Usage: node scripts/commit-task.js <taskId> [testsPerformed] [remainingIssues]');
  process.exit(1);
}

const task = TASKS.find(t => t.id === taskId);
if (!task) {
  console.error(`Task ${taskId} not found`);
  process.exit(1);
}

const state = loadState();

// Check if previous task committed, record its hash if missing
if (taskId > 1) {
  const prevId = taskId - 1;
  if (!state[prevId].commitHash) {
    try {
      const prevHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
      state[prevId].commitHash = prevHash;
      state[prevId].status = 'COMMITTED';
    } catch (e) {
      console.warn('Could not determine previous commit hash:', e.message);
    }
  }
}

// Mark current task as TESTED
state[taskId].status = 'TESTED';
state[taskId].testsPerformed = testsPerformed;
state[taskId].remainingIssues = remainingIssues;
saveState(state);

// Stage all files
execSync('git add -A', { stdio: 'inherit' });

// Commit
try {
  execSync(`git commit -m "${task.title}"`, { stdio: 'inherit' });
} catch (e) {
  console.error('Git commit failed:', e.message);
  process.exit(1);
}

// Now get the current commit hash and update state for this task
const currentHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
state[taskId].status = 'COMMITTED';
state[taskId].commitHash = currentHash;
saveState(state);

console.log(`\nSuccessfully committed Task ${taskId} [${currentHash}]: ${task.title}\n`);
