/**
 * CareConnect Ethiopia - Local Development Orchestrator
 * Verifies environment settings, checks port availability, and prints service directory.
 */

import net from 'net';

const SERVICES = [
  { name: 'Health Centre Portal', port: 5173, url: 'http://localhost:5173', role: 'Patient Intake & Referrals' },
  { name: 'Hospital Portal', port: 5174, url: 'http://localhost:5174', role: 'Referral Receiving & Triage' },
  { name: 'Transport Portal', port: 5175, url: 'http://localhost:5175', role: 'Ambulance Dispatch & Telemetry' },
  { name: 'Administrator Portal', port: 5176, url: 'http://localhost:5176', role: 'Governance & Analytics' },
  { name: 'Main Backend API', port: 5000, url: 'http://localhost:5000', role: 'Core Orchestration Engine' },
  { name: 'AI Decision Service', port: 8000, url: 'http://localhost:8000', role: 'OCR & Recommendation Engine' }
];

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
}

export async function checkAllPorts() {
  console.log('\n============================================================');
  console.log('   CARECONNECT ETHIOPIA - PORT AVAILABILITY CHECK');
  console.log('============================================================\n');

  for (const s of SERVICES) {
    const available = await checkPort(s.port);
    const status = available ? 'AVAILABLE (Ready)' : 'PORT IN USE / ACTIVE';
    console.log(`- [${s.name.padEnd(24)}] Port ${s.port} : ${status}`);
  }
  console.log('\n============================================================\n');
}

if (process.argv[1] && process.argv[1].endsWith('dev-orchestrator.js')) {
  checkAllPorts();
}
