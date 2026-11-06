/**
 * CareConnect Ethiopia - Local Development Orchestrator & Port Scanner
 * Verifies environment settings, checks port availability across all services,
 * and prints an actionable service directory.
 */

import net from 'net';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const getServices = () => [
  {
    name: 'Health Centre Portal',
    port: parseInt(process.env.HEALTH_CENTRE_PORT || '5173', 10),
    url: `http://localhost:${process.env.HEALTH_CENTRE_PORT || '5173'}`,
    role: 'Patient Intake, Referrals, Document OCR'
  },
  {
    name: 'Hospital Portal',
    port: parseInt(process.env.HOSPITAL_PORT || '5174', 10),
    url: `http://localhost:${process.env.HOSPITAL_PORT || '5174'}`,
    role: 'Referral Queue, Triage, Bed Capacity'
  },
  {
    name: 'Transport Portal',
    port: parseInt(process.env.TRANSPORT_PORT || '5175', 10),
    url: `http://localhost:${process.env.TRANSPORT_PORT || '5175'}`,
    role: 'Ambulance Dispatch & Route Telemetry'
  },
  {
    name: 'Administrator Portal',
    port: parseInt(process.env.ADMIN_PORT || '5176', 10),
    url: `http://localhost:${process.env.ADMIN_PORT || '5176'}`,
    role: 'RBAC, Facility Registry & Analytics'
  },
  {
    name: 'Main Backend API',
    port: parseInt(process.env.BACKEND_PORT || '5000', 10),
    url: `http://localhost:${process.env.BACKEND_PORT || '5000'}`,
    role: 'Express REST API & Workflow Orchestrator'
  },
  {
    name: 'AI Decision Service',
    port: parseInt(process.env.AI_SERVICE_PORT || '8000', 10),
    url: `http://localhost:${process.env.AI_SERVICE_PORT || '8000'}`,
    role: 'FastAPI OCR & Clinical Recommendation Engine'
  },
  {
    name: 'PostgreSQL Database',
    port: parseInt(process.env.PGPORT || '5432', 10),
    url: `postgresql://localhost:${process.env.PGPORT || '5432'}`,
    role: 'Relational Persistence (Local / Neon Cloud)'
  }
];

export function checkPort(port) {
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
  const services = getServices();
  console.log('\n============================================================');
  console.log('   CARECONNECT ETHIOPIA - PORT & SERVICE DIRECTORY CHECK');
  console.log('============================================================\n');

  const results = [];
  for (const s of services) {
    const available = await checkPort(s.port);
    const status = available ? 'AVAILABLE (Ready to start)' : 'ACTIVE / IN USE';
    results.push({ ...s, available, status });
    console.log(`- [${s.name.padEnd(25)}] Port ${String(s.port).padEnd(6)} : ${status}`);
  }
  console.log('\n============================================================\n');
  return results;
}

if (process.argv[1] && process.argv[1].endsWith('dev-orchestrator.js')) {
  checkAllPorts();
}
