import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  ETHIOPIAN_FACILITIES,
  INITIAL_PATIENTS,
  INITIAL_REFERRALS,
  INITIAL_TRANSPORTS,
  INITIAL_RESOURCES,
  INITIAL_USERS,
  AI_SUBSYSTEMS,
  AI_BENCHMARKS,
  INITIAL_AUDIT_LOGS,
  INITIAL_FEEDBACK
} from '../shared/data/initialSeedData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'data', 'database.json');
const PORT = process.env.PORT || 5000;

// Initialize or load database
let db = {
  facilities: [...ETHIOPIAN_FACILITIES],
  patients: [...INITIAL_PATIENTS],
  referrals: [...INITIAL_REFERRALS],
  transports: [...INITIAL_TRANSPORTS],
  resources: [...INITIAL_RESOURCES],
  users: [...INITIAL_USERS],
  aiSubsystems: [...AI_SUBSYSTEMS],
  aiBenchmarks: [...AI_BENCHMARKS],
  auditLogs: [...INITIAL_AUDIT_LOGS],
  feedback: [...INITIAL_FEEDBACK]
};

function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      db = { ...db, ...parsed };
      console.log(`[CareConnect API] Loaded existing database with ${db.referrals.length} referrals, ${db.patients.length} patients.`);
    } else {
      saveDatabase();
      console.log('[CareConnect API] Initialized new database with Ethiopian seed records.');
    }
  } catch (err) {
    console.error('[CareConnect API] Error loading database:', err.message);
  }
}

function saveDatabase() {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('[CareConnect API] Failed to save database:', err.message);
  }
}

loadDatabase();

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost:5000'}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  try {
    // 1. Health check
    if (pathname === '/api/health' && method === 'GET') {
      return sendJson(res, 200, {
        status: 'online',
        service: 'CareConnect Ethiopia Central Healthcare Backend',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        counts: {
          facilities: db.facilities.length,
          patients: db.patients.length,
          referrals: db.referrals.length,
          transports: db.transports.length,
          users: db.users.length
        }
      });
    }

    // 2. REFERRALS API
    if (pathname === '/api/referrals' && method === 'GET') {
      return sendJson(res, 200, db.referrals);
    }

    if (pathname === '/api/referrals' && method === 'POST') {
      const data = await parseBody(req);
      const newId = `REF-2025-${Math.floor(8500 + Math.random() * 1000)}`;
      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
      
      const newReferral = {
        id: newId,
        patientId: data.patientId || 'PAT-ET-8401',
        patientName: data.patientName || 'Anonymous Patient',
        age: Number(data.age) || 30,
        gender: data.gender || 'Other',
        referringFacility: data.referringFacility || 'Yeka Health Centre',
        referringDoctor: data.referringDoctor || 'Dr. Alemayehu Bekele',
        referringPhone: data.referringPhone || '+251 91 144 2890',
        receivingFacility: data.receivingFacility || 'Tikur Anbessa Specialized Hospital',
        service: data.service || 'General Medicine',
        urgency: data.urgency || 'Routine',
        clinicalSummary: data.clinicalSummary || '',
        vitals: data.vitals || { bp: '120/80', hr: '75', temp: '36.6', rr: '16', spo2: '98%' },
        status: 'Pending',
        date: nowStr,
        completeness: data.completeness || '100% Complete',
        missingFields: data.missingFields || [],
        aiScore: data.aiScore || 94,
        transportRequired: !!data.transportRequired,
        transportStatus: data.transportRequired ? 'Requested' : 'None',
        assignedAmbulance: null,
        timeline: [
          { step: 'Created at Health Centre', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), done: true, by: data.referringDoctor || 'Clinician' },
          { step: 'Hospital Acknowledged', timestamp: 'Pending', done: false },
          { step: 'Hospital Accepted', timestamp: 'Pending', done: false },
          ...(data.transportRequired ? [{ step: 'Ambulance Dispatched', timestamp: 'Pending', done: false }] : []),
          { step: 'Hospital Arrival & Admission', timestamp: 'Pending', done: false }
        ],
        notes: data.notes || ''
      };

      db.referrals.unshift(newReferral);

      // If transport is required, auto-create a transport request for the Transport Coordinator
      if (newReferral.transportRequired) {
        const newTransport = {
          id: `TR-ET-${Math.floor(9200 + Math.random() * 800)}`,
          referralId: newReferral.id,
          patientId: newReferral.patientId,
          patientName: newReferral.patientName,
          age: newReferral.age,
          urgency: newReferral.urgency,
          origin: newReferral.referringFacility,
          originCoord: [9.0305, 38.7952],
          destination: newReferral.receivingFacility,
          destCoord: [9.0142, 38.7523],
          currentCoord: [9.0305, 38.7952],
          vehicleType: newReferral.urgency === 'Emergency' ? 'Advanced Life Support (ALS)' : 'Basic Life Support (BLS)',
          assignedVehicle: 'Unassigned',
          driver: 'Pending Assignment',
          driverPhone: '-',
          coordinator: 'Central Medical Dispatch',
          coordinatorPhone: '+251 92 888 1234',
          scheduledDeparture: 'Awaiting Assignment',
          etaMinutes: null,
          speedKmH: 0,
          status: 'Pending Assignment',
          distanceKm: 8.5,
          oxygenRequired: true,
          ventilatorRequired: false,
          routeSector: 'Addis Ababa Central Arterial',
          notes: newReferral.notes || 'Emergency transfer'
        };
        db.transports.unshift(newTransport);
      }

      // Add to audit logs
      db.auditLogs.unshift({
        id: `LOG-${Math.floor(8900 + Math.random() * 1000)}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        user: data.referringDoctor || 'Dr. Alemayehu Bekele',
        role: 'Health Centre Staff',
        facility: newReferral.referringFacility,
        action: 'CREATE_REFERRAL',
        entity: `${newReferral.id} (${newReferral.patientName})`,
        details: `Submitted ${newReferral.urgency} ${newReferral.service} referral to ${newReferral.receivingFacility}`
      });

      saveDatabase();
      return sendJson(res, 201, newReferral);
    }

    if (pathname.startsWith('/api/referrals/') && method === 'PATCH') {
      const parts = pathname.split('/');
      const id = parts[3];
      const isStatusOnly = parts[4] === 'status';
      const data = await parseBody(req);

      const refIndex = db.referrals.findIndex(r => r.id === id);
      if (refIndex === -1) {
        return sendJson(res, 404, { error: 'Referral not found' });
      }

      const existing = db.referrals[refIndex];
      const newStatus = data.status || existing.status;
      const notes = data.notes || existing.notes;
      const actorName = data.actorName || 'Healthcare Provider';

      // Update timeline
      let updatedTimeline = [...(existing.timeline || [])];
      const nowClock = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (newStatus === 'Acknowledged') {
        updatedTimeline = updatedTimeline.map(t =>
          t.step.includes('Acknowledged') ? { ...t, timestamp: nowClock, done: true, by: actorName } : t
        );
      } else if (newStatus === 'Accepted') {
        updatedTimeline = updatedTimeline.map(t => {
          if (t.step.includes('Acknowledged') || t.step.includes('Accepted')) {
            return { ...t, timestamp: t.done ? t.timestamp : nowClock, done: true, by: actorName };
          }
          return t;
        });

        // Decrement bed in the hospital
        const hosp = db.facilities.find(f => f.name === existing.receivingFacility);
        if (hosp && hosp.availableBeds > 0) {
          hosp.availableBeds -= 1;
          hosp.lastCapacityUpdate = 'Just now';
        }
      } else if (newStatus === 'Rejected') {
        updatedTimeline.push({
          step: `Rejected (FR-22: ${data.rejectionReason || 'Capacity Constraints'})`,
          timestamp: nowClock,
          done: true,
          by: actorName
        });
      } else if (newStatus === 'In Transit') {
        updatedTimeline = updatedTimeline.map(t =>
          t.step.includes('Patient En-Route') || t.step.includes('Dispatched') ? { ...t, timestamp: nowClock, done: true, by: actorName } : t
        );
      } else if (newStatus === 'Completed' || newStatus === 'Arrived') {
        updatedTimeline = updatedTimeline.map(t =>
          t.step.includes('Arrival') ? { ...t, timestamp: nowClock, done: true, by: actorName } : t
        );
      }

      const updated = {
        ...existing,
        ...data,
        status: newStatus,
        notes: notes,
        timeline: updatedTimeline,
        updatedAt: new Date().toISOString()
      };

      db.referrals[refIndex] = updated;

      // Log audit
      db.auditLogs.unshift({
        id: `LOG-${Math.floor(8900 + Math.random() * 1000)}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        user: actorName,
        role: data.actorRole || 'System User',
        facility: data.actorFacility || existing.receivingFacility,
        action: `UPDATE_REFERRAL_${newStatus.toUpperCase()}`,
        entity: id,
        details: `Referral status updated to ${newStatus}. Notes: ${notes}`
      });

      saveDatabase();
      return sendJson(res, 200, updated);
    }

    if (pathname.startsWith('/api/referrals/') && method === 'GET') {
      const id = pathname.split('/')[3];
      const referral = db.referrals.find(r => r.id === id);
      if (!referral) return sendJson(res, 404, { error: 'Referral not found' });
      return sendJson(res, 200, referral);
    }

    // 3. PATIENTS API
    if (pathname === '/api/patients' && method === 'GET') {
      return sendJson(res, 200, db.patients);
    }

    if (pathname === '/api/patients' && method === 'POST') {
      const data = await parseBody(req);
      const newPatient = {
        id: `PAT-ET-${Math.floor(8410 + Math.random() * 900)}`,
        nationalId: data.nationalId || `ET-FIN-${Math.floor(10000 + Math.random() * 90000)}-AA`,
        name: data.name,
        age: Number(data.age) || 30,
        gender: data.gender || 'Male',
        phone: data.phone || '+251 9',
        region: data.region || 'Addis Ababa',
        zone: data.zone || 'Yeka',
        woreda: data.woreda || 'Woreda 03',
        kebele: data.kebele || 'Kebele 08',
        houseNo: data.houseNo || 'House 101',
        emergencyContact: data.emergencyContact || 'Family Member',
        bloodType: data.bloodType || 'O+',
        knownAllergies: data.knownAllergies || 'None',
        chronicConditions: data.chronicConditions || 'None',
        registeredFacility: data.registeredFacility || 'Yeka Health Centre',
        registeredAt: new Date().toISOString().split('T')[0]
      };
      db.patients.unshift(newPatient);

      db.auditLogs.unshift({
        id: `LOG-${Math.floor(8900 + Math.random() * 1000)}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        user: 'Intake Clinician',
        role: 'Health Centre Staff',
        facility: newPatient.registeredFacility,
        action: 'REGISTER_PATIENT',
        entity: `${newPatient.id} (${newPatient.name})`,
        details: `Registered new patient with National ID ${newPatient.nationalId}`
      });

      saveDatabase();
      return sendJson(res, 201, newPatient);
    }

    if (pathname.startsWith('/api/patients/') && method === 'PUT') {
      const id = pathname.split('/')[3];
      const data = await parseBody(req);
      const idx = db.patients.findIndex(p => p.id === id);
      if (idx === -1) return sendJson(res, 404, { error: 'Patient not found' });
      db.patients[idx] = { ...db.patients[idx], ...data, id };
      saveDatabase();
      return sendJson(res, 200, db.patients[idx]);
    }

    if (pathname.startsWith('/api/patients/') && method === 'DELETE') {
      const id = pathname.split('/')[3];
      db.patients = db.patients.filter(p => p.id !== id);
      saveDatabase();
      return sendJson(res, 200, { success: true, id });
    }

    // 4. FACILITIES API
    if (pathname === '/api/facilities' && method === 'GET') {
      return sendJson(res, 200, db.facilities);
    }

    if (pathname === '/api/facilities' && method === 'POST') {
      const data = await parseBody(req);
      const newFacility = {
        id: `fac-${Math.floor(10 + Math.random() * 90)}`,
        name: data.name,
        type: data.type || 'General Hospital',
        region: data.region || 'Addis Ababa',
        zone: data.zone || 'Central',
        woreda: data.woreda || 'Woreda 01',
        beds: Number(data.beds) || 100,
        availableBeds: Number(data.availableBeds) || 20,
        icuBeds: Number(data.icuBeds) || 5,
        availableIcuBeds: Number(data.availableIcuBeds) || 1,
        ventilators: Number(data.ventilators) || 4,
        availableVentilators: Number(data.availableVentilators) || 1,
        oxygenLevel: data.oxygenLevel || '85% Adequate',
        bloodUnitsAvailable: Number(data.bloodUnitsAvailable) || 50,
        workloadLevel: data.workloadLevel || 'Moderate',
        specialties: data.specialties || ['General Medicine'],
        operatingStatus: data.operatingStatus || 'Operational',
        distanceKmFromCenter: Number(data.distanceKmFromCenter) || 10,
        contactPhone: data.contactPhone || '+251 11',
        lat: Number(data.lat) || 9.02,
        lng: Number(data.lng) || 38.75,
        lastCapacityUpdate: 'Just now',
        ratingScore: 90
      };
      db.facilities.push(newFacility);
      saveDatabase();
      return sendJson(res, 201, newFacility);
    }

    if (pathname.startsWith('/api/facilities/') && pathname.endsWith('/capacity') && method === 'PATCH') {
      const id = pathname.split('/')[3];
      const data = await parseBody(req);
      const idx = db.facilities.findIndex(f => f.id === id);
      if (idx === -1) return sendJson(res, 404, { error: 'Facility not found' });
      db.facilities[idx] = {
        ...db.facilities[idx],
        ...data,
        lastCapacityUpdate: 'Just now'
      };
      saveDatabase();
      return sendJson(res, 200, db.facilities[idx]);
    }

    if (pathname.startsWith('/api/facilities/') && method === 'PUT') {
      const id = pathname.split('/')[3];
      const data = await parseBody(req);
      const idx = db.facilities.findIndex(f => f.id === id);
      if (idx === -1) return sendJson(res, 404, { error: 'Facility not found' });
      db.facilities[idx] = { ...db.facilities[idx], ...data, id };
      saveDatabase();
      return sendJson(res, 200, db.facilities[idx]);
    }

    // 5. TRANSPORTS API
    if (pathname === '/api/transports' && method === 'GET') {
      return sendJson(res, 200, db.transports);
    }

    if (pathname === '/api/transports/assign' && method === 'POST') {
      const data = await parseBody(req);
      const idx = db.transports.findIndex(t => t.id === data.transportId || t.referralId === data.referralId);
      if (idx === -1) return sendJson(res, 404, { error: 'Transport record not found' });

      db.transports[idx] = {
        ...db.transports[idx],
        assignedVehicle: data.assignedVehicle,
        driver: data.driver,
        driverPhone: data.driverPhone,
        scheduledDeparture: data.scheduledDeparture || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'Dispatched',
        speedKmH: 0,
        etaMinutes: Number(data.etaMinutes) || 20,
        notes: data.notes || db.transports[idx].notes
      };

      // Also update linked referral
      const refIdx = db.referrals.findIndex(r => r.id === db.transports[idx].referralId);
      if (refIdx !== -1) {
        db.referrals[refIdx].transportStatus = 'Dispatched';
        db.referrals[refIdx].assignedAmbulance = data.assignedVehicle;
      }

      saveDatabase();
      return sendJson(res, 200, db.transports[idx]);
    }

    if (pathname.startsWith('/api/transports/') && pathname.endsWith('/status') && method === 'PATCH') {
      const id = pathname.split('/')[3];
      const data = await parseBody(req);
      const idx = db.transports.findIndex(t => t.id === id);
      if (idx === -1) return sendJson(res, 404, { error: 'Transport record not found' });

      db.transports[idx] = {
        ...db.transports[idx],
        status: data.status,
        speedKmH: data.speedKmH !== undefined ? data.speedKmH : db.transports[idx].speedKmH,
        etaMinutes: data.etaMinutes !== undefined ? data.etaMinutes : db.transports[idx].etaMinutes,
        notes: data.notes || db.transports[idx].notes
      };

      // Sync with linked referral
      const refIdx = db.referrals.findIndex(r => r.id === db.transports[idx].referralId);
      if (refIdx !== -1) {
        db.referrals[refIdx].transportStatus = data.status;
        if (data.status === 'In Transit') {
          db.referrals[refIdx].status = 'In Transit';
        } else if (data.status === 'Arrived') {
          db.referrals[refIdx].status = 'Arrived';
        }
      }

      saveDatabase();
      return sendJson(res, 200, db.transports[idx]);
    }

    // 6. RESOURCES API (Ambulance Fleet)
    if (pathname === '/api/resources' && method === 'GET') {
      return sendJson(res, 200, db.resources);
    }

    if (pathname === '/api/resources' && method === 'POST') {
      const data = await parseBody(req);
      const newRes = {
        id: `res-${Math.floor(10 + Math.random() * 90)}`,
        identifier: data.identifier || `AMB-AA-${Math.floor(100 + Math.random() * 900)}`,
        name: data.name,
        type: data.type || 'Basic Life Support (BLS)',
        status: data.status || 'Available',
        baseFacility: data.baseFacility || 'Addis Ababa Central Station',
        currentLocation: data.currentLocation || 'Stationary',
        equipment: data.equipment || ['Stretcher', 'Oxygen 1x40L', 'First Aid Kit'],
        assignedDriver: data.assignedDriver || 'Pending Assignment',
        driverPhone: data.driverPhone || '-',
        lastServiceDate: new Date().toISOString().split('T')[0],
        fuelLevel: '100%'
      };
      db.resources.unshift(newRes);
      saveDatabase();
      return sendJson(res, 201, newRes);
    }

    if (pathname.startsWith('/api/resources/') && method === 'PATCH') {
      const id = pathname.split('/')[3];
      const data = await parseBody(req);
      const idx = db.resources.findIndex(r => r.id === id);
      if (idx === -1) return sendJson(res, 404, { error: 'Resource not found' });
      db.resources[idx] = { ...db.resources[idx], ...data };
      saveDatabase();
      return sendJson(res, 200, db.resources[idx]);
    }

    // 7. USERS API
    if (pathname === '/api/users' && method === 'GET') {
      return sendJson(res, 200, db.users);
    }

    if (pathname === '/api/users' && method === 'POST') {
      const data = await parseBody(req);
      const newUser = {
        id: `usr-${Math.floor(100 + Math.random() * 900)}`,
        name: data.name,
        email: data.email,
        role: data.role || 'Health Centre Staff',
        facility: data.facility || 'Yeka Health Centre',
        phone: data.phone || '+251 9',
        status: 'Active',
        lastLogin: 'Never',
        permissions: data.permissions || ['create_referral', 'view_patients']
      };
      db.users.push(newUser);
      saveDatabase();
      return sendJson(res, 201, newUser);
    }

    if (pathname.startsWith('/api/users/') && pathname.endsWith('/status') && method === 'PATCH') {
      const id = pathname.split('/')[3];
      const data = await parseBody(req);
      const idx = db.users.findIndex(u => u.id === id);
      if (idx === -1) return sendJson(res, 404, { error: 'User not found' });
      db.users[idx].status = data.status;
      saveDatabase();
      return sendJson(res, 200, db.users[idx]);
    }

    if (pathname.startsWith('/api/users/') && method === 'PUT') {
      const id = pathname.split('/')[3];
      const data = await parseBody(req);
      const idx = db.users.findIndex(u => u.id === id);
      if (idx === -1) return sendJson(res, 404, { error: 'User not found' });
      db.users[idx] = { ...db.users[idx], ...data, id };
      saveDatabase();
      return sendJson(res, 200, db.users[idx]);
    }

    // 8. AI SUBSYSTEMS API
    if (pathname === '/api/ai/subsystems' && method === 'GET') {
      return sendJson(res, 200, db.aiSubsystems);
    }

    if (pathname.startsWith('/api/ai/subsystems/') && pathname.endsWith('/toggle') && method === 'PATCH') {
      const id = pathname.split('/')[4];
      const idx = db.aiSubsystems.findIndex(s => s.id === id);
      if (idx === -1) return sendJson(res, 404, { error: 'AI Subsystem not found' });
      db.aiSubsystems[idx].enabled = !db.aiSubsystems[idx].enabled;
      db.aiSubsystems[idx].status = db.aiSubsystems[idx].enabled ? 'Active' : 'Disabled';
      saveDatabase();
      return sendJson(res, 200, db.aiSubsystems[idx]);
    }

    if (pathname === '/api/ai/benchmarks' && method === 'GET') {
      return sendJson(res, 200, db.aiBenchmarks);
    }

    // 9. AUDIT LOGS API
    if (pathname === '/api/audit-logs' && method === 'GET') {
      return sendJson(res, 200, db.auditLogs);
    }

    // 10. FEEDBACK API
    if (pathname === '/api/feedback' && method === 'GET') {
      return sendJson(res, 200, db.feedback);
    }

    if (pathname === '/api/feedback' && method === 'POST') {
      const data = await parseBody(req);
      const newFeedback = {
        id: `FDB-${Math.floor(100 + Math.random() * 900)}`,
        referralId: data.referralId,
        patientName: data.patientName || 'Referred Patient',
        referringFacility: data.referringFacility || 'Health Centre',
        receivingFacility: data.receivingFacility || 'Hospital',
        attendingPhysician: data.attendingPhysician || 'Attending Specialist',
        outcome: data.outcome || 'Treated & Discharged',
        dischargeSummary: data.dischargeSummary || '',
        recommendationsToHealthCentre: data.recommendationsToHealthCentre || '',
        submittedDate: new Date().toISOString().replace('T', ' ').substring(0, 16)
      };
      db.feedback.unshift(newFeedback);
      saveDatabase();
      return sendJson(res, 201, newFeedback);
    }

    // Default 404
    return sendJson(res, 404, { error: `Endpoint ${method} ${pathname} not found` });
  } catch (err) {
    console.error('[CareConnect API Server Error]', err);
    return sendJson(res, 500, { error: 'Internal server error', message: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(` CareConnect Ethiopia REST API Server Running`);
  console.log(` Local URL: http://localhost:${PORT}/api`);
  console.log(` Health Check: http://localhost:${PORT}/api/health`);
  console.log(` Storage Path: ${DB_FILE}`);
  console.log(`======================================================\n`);
});
