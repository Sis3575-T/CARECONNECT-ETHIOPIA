import { apiClient } from './apiClient';
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
} from '../data/initialSeedData';

const STORAGE_KEY = 'careconnect_database_v1';
const BUS_CHANNEL = 'careconnect_et_bus';

// Safe BroadcastChannel initialization
let bus = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    bus = new BroadcastChannel(BUS_CHANNEL);
  } catch {
    bus = null;
  }
}

// In-memory cache synced with localStorage
let state = null;
const subscribers = new Set();

function notifySubscribers() {
  subscribers.forEach(fn => {
    try { fn(); } catch (err) { console.error('Subscriber error:', err); }
  });
}

// Broadcast change event to other tabs / portals
function broadcastChange(type, payload) {
  if (bus) {
    try {
      bus.postMessage({ type, payload, timestamp: Date.now() });
    } catch {}
  }
}

// Listen for broadcast changes from other portals (Health Centre, Hospital, Transport, Admin)
if (typeof window !== 'undefined') {
  if (bus) {
    bus.onmessage = () => {
      reloadFromStorage();
      notifySubscribers();
    };
  }

  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      reloadFromStorage();
      notifySubscribers();
    }
  });
}

function getInitialState() {
  return {
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
}

function reloadFromStorage() {
  if (typeof window === 'undefined') {
    state = getInitialState();
    return;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      state = JSON.parse(raw);
    } else {
      state = getInitialState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch {
    state = getInitialState();
  }
}

function saveState() {
  if (typeof window !== 'undefined' && state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn('Failed to save to localStorage:', err);
    }
  }
  notifySubscribers();
  broadcastChange('STATE_UPDATE', null);
}

// Ensure state is loaded initially
if (!state) {
  reloadFromStorage();
}

export const dataService = {
  subscribe(callback) {
    subscribers.add(callback);
    return () => subscribers.delete(callback);
  },

  getState() {
    if (!state) reloadFromStorage();
    return state;
  },

  // 1. REFERRALS
  async getReferrals() {
    try {
      const res = await apiClient.get('/referrals');
      if (res.data && Array.isArray(res.data)) {
        state.referrals = res.data;
        saveState();
        return res.data;
      }
    } catch {}
    if (!state) reloadFromStorage();
    return [...state.referrals];
  },

  async createReferral(data) {
    const newId = `REF-2025-${Math.floor(8500 + Math.random() * 1000)}`;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const nowClock = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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
        { step: 'Created at Health Centre', timestamp: nowClock, done: true, by: data.referringDoctor || 'Clinician' },
        { step: 'Hospital Acknowledged', timestamp: 'Pending', done: false },
        { step: 'Hospital Accepted', timestamp: 'Pending', done: false },
        ...(data.transportRequired ? [{ step: 'Ambulance Dispatched', timestamp: 'Pending', done: false }] : []),
        { step: 'Hospital Arrival & Admission', timestamp: 'Pending', done: false }
      ],
      notes: data.notes || ''
    };

    // Try API
    try {
      await apiClient.post('/referrals', newReferral);
    } catch {}

    state.referrals.unshift(newReferral);

    // If transport required, create linked transport record
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
        routeSector: 'Central Addis Corridor',
        notes: newReferral.notes || 'Emergency transfer'
      };
      state.transports.unshift(newTransport);
    }

    // Add audit log
    state.auditLogs.unshift({
      id: `LOG-${Math.floor(8900 + Math.random() * 1000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      user: data.referringDoctor || 'Dr. Alemayehu Bekele',
      role: 'Health Centre Staff',
      facility: newReferral.referringFacility,
      action: 'CREATE_REFERRAL',
      entity: `${newReferral.id} (${newReferral.patientName})`,
      details: `Created ${newReferral.urgency} referral to ${newReferral.receivingFacility}`
    });

    saveState();
    return newReferral;
  },

  async updateReferralStatus(id, newStatus, notes = '', meta = {}) {
    const nowClock = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const actorName = meta.actorName || 'Healthcare Provider';

    try {
      await apiClient.patch(`/referrals/${id}/status`, { status: newStatus, notes, actorName, ...meta });
    } catch {}

    const idx = state.referrals.findIndex(r => r.id === id);
    if (idx !== -1) {
      const existing = state.referrals[idx];
      let updatedTimeline = [...(existing.timeline || [])];

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

        // Decrement bed in the receiving hospital
        const hosp = state.facilities.find(f => f.name === existing.receivingFacility);
        if (hosp && hosp.availableBeds > 0) {
          hosp.availableBeds -= 1;
          hosp.lastCapacityUpdate = 'Just now';
        }
      } else if (newStatus === 'Rejected') {
        updatedTimeline.push({
          step: `Rejected (FR-22: ${meta.rejectionReason || 'Facility Constraints'})`,
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

      state.referrals[idx] = {
        ...existing,
        status: newStatus,
        notes: notes || existing.notes,
        rejectionReason: meta.rejectionReason || existing.rejectionReason,
        timeline: updatedTimeline,
        updatedAt: new Date().toISOString()
      };

      state.auditLogs.unshift({
        id: `LOG-${Math.floor(8900 + Math.random() * 1000)}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        user: actorName,
        role: meta.actorRole || 'Hospital Staff',
        facility: meta.actorFacility || existing.receivingFacility,
        action: `UPDATE_REFERRAL_${newStatus.toUpperCase()}`,
        entity: id,
        details: `Updated referral status to ${newStatus}. Notes: ${notes}`
      });

      saveState();
      return state.referrals[idx];
    }
    return null;
  },

  // 2. PATIENTS
  async getPatients() {
    try {
      const res = await apiClient.get('/patients');
      if (res.data && Array.isArray(res.data)) {
        state.patients = res.data;
        saveState();
        return res.data;
      }
    } catch {}
    if (!state) reloadFromStorage();
    return [...state.patients];
  },

  async createPatient(data) {
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

    try {
      await apiClient.post('/patients', newPatient);
    } catch {}

    state.patients.unshift(newPatient);

    state.auditLogs.unshift({
      id: `LOG-${Math.floor(8900 + Math.random() * 1000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      user: 'Registration Officer',
      role: 'Health Centre Staff',
      facility: newPatient.registeredFacility,
      action: 'REGISTER_PATIENT',
      entity: `${newPatient.id} (${newPatient.name})`,
      details: `Registered new patient with National ID ${newPatient.nationalId}`
    });

    saveState();
    return newPatient;
  },

  async updatePatient(id, data) {
    try {
      await apiClient.put(`/patients/${id}`, data);
    } catch {}

    const idx = state.patients.findIndex(p => p.id === id);
    if (idx !== -1) {
      state.patients[idx] = { ...state.patients[idx], ...data, id };
      saveState();
      return state.patients[idx];
    }
    return null;
  },

  async deletePatient(id) {
    try {
      await apiClient.delete(`/patients/${id}`);
    } catch {}

    state.patients = state.patients.filter(p => p.id !== id);
    saveState();
    return true;
  },

  // 3. FACILITIES & CAPACITY
  async getFacilities() {
    try {
      const res = await apiClient.get('/facilities');
      if (res.data && Array.isArray(res.data)) {
        state.facilities = res.data;
        saveState();
        return res.data;
      }
    } catch {}
    if (!state) reloadFromStorage();
    return [...state.facilities];
  },

  async updateFacilityCapacity(id, capacityData) {
    try {
      await apiClient.patch(`/facilities/${id}/capacity`, capacityData);
    } catch {}

    const idx = state.facilities.findIndex(f => f.id === id);
    if (idx !== -1) {
      state.facilities[idx] = {
        ...state.facilities[idx],
        ...capacityData,
        lastCapacityUpdate: 'Just now'
      };

      state.auditLogs.unshift({
        id: `LOG-${Math.floor(8900 + Math.random() * 1000)}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        user: 'Chief Nursing Officer',
        role: 'Hospital Staff',
        facility: state.facilities[idx].name,
        action: 'UPDATE_CAPACITY',
        entity: state.facilities[idx].name,
        details: `Updated capacity: Available Beds=${state.facilities[idx].availableBeds}, ICU=${state.facilities[idx].availableIcuBeds}`
      });

      saveState();
      return state.facilities[idx];
    }
    return null;
  },

  async createFacility(data) {
    const newFacility = {
      id: `fac-${Math.floor(10 + Math.random() * 90)}`,
      name: data.name,
      type: data.type || 'General Hospital',
      region: data.region || 'Addis Ababa',
      zone: data.zone || 'Central',
      woreda: data.woreda || 'Woreda 01',
      beds: Number(data.beds) || 100,
      availableBeds: Number(data.availableBeds) || 20,
      icuBeds: Number(data.icuBeds) || 4,
      availableIcuBeds: Number(data.availableIcuBeds) || 1,
      ventilators: Number(data.ventilators) || 4,
      availableVentilators: Number(data.availableVentilators) || 1,
      oxygenLevel: data.oxygenLevel || '85% Adequate',
      bloodUnitsAvailable: Number(data.bloodUnitsAvailable) || 50,
      workloadLevel: data.workloadLevel || 'Moderate',
      specialties: data.specialties || ['General Medicine'],
      operatingStatus: 'Operational',
      distanceKmFromCenter: Number(data.distanceKmFromCenter) || 10,
      contactPhone: data.contactPhone || '+251 11',
      lat: Number(data.lat) || 9.02,
      lng: Number(data.lng) || 38.75,
      lastCapacityUpdate: 'Just now',
      ratingScore: 90
    };

    try {
      await apiClient.post('/facilities', newFacility);
    } catch {}

    state.facilities.push(newFacility);
    state.auditLogs.unshift({
      id: `LOG-${Math.floor(8900 + Math.random() * 1000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      user: 'System Administrator',
      role: 'System Administrator',
      facility: 'Ministry of Health',
      action: 'REGISTER_FACILITY',
      entity: newFacility.name,
      details: `Registered ${newFacility.type} in ${newFacility.region} with ${newFacility.beds} beds`
    });
    saveState();
    return newFacility;
  },

  async updateFacility(id, data) {
    const idx = state.facilities.findIndex(f => f.id === id);
    if (idx !== -1) {
      state.facilities[idx] = {
        ...state.facilities[idx],
        ...data,
        id
      };
      state.auditLogs.unshift({
        id: `LOG-${Math.floor(8900 + Math.random() * 1000)}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        user: 'System Administrator',
        role: 'System Administrator',
        facility: 'Ministry of Health',
        action: 'UPDATE_FACILITY',
        entity: state.facilities[idx].name,
        details: `Updated facility details for ${state.facilities[idx].name}`
      });
      saveState();
      return state.facilities[idx];
    }
    return null;
  },

  async toggleFacilityStatus(id) {
    const idx = state.facilities.findIndex(f => f.id === id);
    if (idx !== -1) {
      const prev = state.facilities[idx].operatingStatus;
      const next = prev === 'Operational' ? 'Maintenance' : 'Operational';
      state.facilities[idx].operatingStatus = next;
      state.auditLogs.unshift({
        id: `LOG-${Math.floor(8900 + Math.random() * 1000)}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        user: 'System Administrator',
        role: 'System Administrator',
        facility: 'Ministry of Health',
        action: 'FACILITY_STATUS_TOGGLE',
        entity: state.facilities[idx].name,
        details: `Operating status toggled from ${prev} to ${next}`
      });
      saveState();
      return state.facilities[idx];
    }
    return null;
  },

  // 4. TRANSPORTS & FLEET
  async getTransports() {
    try {
      const res = await apiClient.get('/transports');
      if (res.data && Array.isArray(res.data)) {
        state.transports = res.data;
        saveState();
        return res.data;
      }
    } catch {}
    if (!state) reloadFromStorage();
    return [...state.transports];
  },

  async assignTransport(assignmentData) {
    try {
      await apiClient.post('/transports/assign', assignmentData);
    } catch {}

    const idx = state.transports.findIndex(
      t => t.id === assignmentData.transportId || t.referralId === assignmentData.referralId
    );
    if (idx !== -1) {
      state.transports[idx] = {
        ...state.transports[idx],
        assignedVehicle: assignmentData.assignedVehicle,
        driver: assignmentData.driver,
        driverPhone: assignmentData.driverPhone,
        scheduledDeparture: assignmentData.scheduledDeparture || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'Dispatched',
        speedKmH: 0,
        etaMinutes: Number(assignmentData.etaMinutes) || 20,
        notes: assignmentData.notes || state.transports[idx].notes
      };

      // Also update linked referral
      const refIdx = state.referrals.findIndex(r => r.id === state.transports[idx].referralId);
      if (refIdx !== -1) {
        state.referrals[refIdx].transportStatus = 'Dispatched';
        state.referrals[refIdx].assignedAmbulance = assignmentData.assignedVehicle;
      }

      state.auditLogs.unshift({
        id: `LOG-${Math.floor(8900 + Math.random() * 1000)}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        user: assignmentData.coordinator || 'Yohannes Girma',
        role: 'Transport Coordinator',
        facility: 'Central Dispatch Hub',
        action: 'ASSIGN_AMBULANCE',
        entity: `${state.transports[idx].id} (${assignmentData.assignedVehicle})`,
        details: `Assigned vehicle ${assignmentData.assignedVehicle} with driver ${assignmentData.driver}`
      });

      saveState();
      return state.transports[idx];
    }
    return null;
  },

  async updateTransportStatus(id, newStatus, meta = {}) {
    try {
      await apiClient.patch(`/transports/${id}/status`, { status: newStatus, ...meta });
    } catch {}

    const idx = state.transports.findIndex(t => t.id === id);
    if (idx !== -1) {
      state.transports[idx] = {
        ...state.transports[idx],
        status: newStatus,
        speedKmH: meta.speedKmH !== undefined ? meta.speedKmH : state.transports[idx].speedKmH,
        etaMinutes: meta.etaMinutes !== undefined ? meta.etaMinutes : state.transports[idx].etaMinutes,
        notes: meta.notes || state.transports[idx].notes
      };

      const refIdx = state.referrals.findIndex(r => r.id === state.transports[idx].referralId);
      if (refIdx !== -1) {
        state.referrals[refIdx].transportStatus = newStatus;
        if (newStatus === 'In Transit') {
          state.referrals[refIdx].status = 'In Transit';
        } else if (newStatus === 'Arrived' || newStatus === 'Completed') {
          state.referrals[refIdx].status = 'Arrived';
        }
      }

      state.auditLogs.unshift({
        id: `LOG-${Math.floor(8900 + Math.random() * 1000)}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        user: 'Transport Dispatcher',
        role: 'Transport Coordinator',
        facility: 'Central Dispatch Hub',
        action: `TRANSPORT_${newStatus.toUpperCase()}`,
        entity: id,
        details: `Transport status changed to ${newStatus}`
      });

      saveState();
      return state.transports[idx];
    }
    return null;
  },

  // 5. RESOURCES (Fleet)
  async getResources() {
    if (!state) reloadFromStorage();
    return [...state.resources];
  },

  async createResource(data) {
    const newRes = {
      id: `res-${Math.floor(10 + Math.random() * 90)}`,
      identifier: data.identifier || `AMB-AA-${Math.floor(100 + Math.random() * 900)}`,
      name: data.name,
      type: data.type || 'Basic Life Support (BLS)',
      status: 'Available',
      baseFacility: data.baseFacility || 'Addis Ababa Central Station',
      currentLocation: 'Stationary',
      equipment: data.equipment || ['Stretcher', 'Oxygen 1x40L', 'First Aid Kit'],
      assignedDriver: data.assignedDriver || 'Pending Assignment',
      driverPhone: data.driverPhone || '-',
      lastServiceDate: new Date().toISOString().split('T')[0],
      fuelLevel: '100%'
    };

    state.resources.unshift(newRes);
    saveState();
    return newRes;
  },

  async updateResource(id, data) {
    const idx = state.resources.findIndex(r => r.id === id);
    if (idx !== -1) {
      state.resources[idx] = { ...state.resources[idx], ...data };
      saveState();
      return state.resources[idx];
    }
    return null;
  },

  // 6. USERS
  async getUsers() {
    if (!state) reloadFromStorage();
    return [...state.users];
  },

  async createUser(data) {
    const displayName = data.fullName || data.name || 'Staff User';
    const newUser = {
      id: `usr-${Math.floor(100 + Math.random() * 900)}`,
      name: displayName,
      fullName: displayName,
      email: data.email,
      role: data.role || 'Health Centre Staff',
      facility: data.facility || 'Yeka Health Centre',
      phone: data.phone || '+251 91 123 4567',
      status: 'Active',
      lastLogin: 'Never',
      permissions: data.permissions || ['create_referral', 'view_patients']
    };
    state.users.push(newUser);
    state.auditLogs.unshift({
      id: `LOG-${Math.floor(8900 + Math.random() * 1000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      user: 'System Administrator',
      role: 'System Administrator',
      facility: 'Ministry of Health',
      action: 'CREATE_USER',
      entity: displayName,
      details: `Created user account with role ${newUser.role} for ${newUser.facility}`
    });
    saveState();
    return newUser;
  },

  async updateUser(id, data) {
    const idx = state.users.findIndex(u => u.id === id);
    if (idx !== -1) {
      const displayName = data.fullName || data.name || state.users[idx].name;
      state.users[idx] = {
        ...state.users[idx],
        ...data,
        name: displayName,
        fullName: displayName,
        id
      };
      state.auditLogs.unshift({
        id: `LOG-${Math.floor(8900 + Math.random() * 1000)}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        user: 'System Administrator',
        role: 'System Administrator',
        facility: 'Ministry of Health',
        action: 'UPDATE_USER',
        entity: displayName,
        details: `Updated user profile and role ${state.users[idx].role}`
      });
      saveState();
      return state.users[idx];
    }
    return null;
  },

  async toggleUserStatus(id) {
    const idx = state.users.findIndex(u => u.id === id);
    if (idx !== -1) {
      const next = state.users[idx].status === 'Active' ? 'Deactivated' : 'Active';
      state.users[idx].status = next;
      state.auditLogs.unshift({
        id: `LOG-${Math.floor(8900 + Math.random() * 1000)}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        user: 'System Administrator',
        role: 'System Administrator',
        facility: 'Ministry of Health',
        action: 'USER_STATUS_CHANGE',
        entity: state.users[idx].name || state.users[idx].fullName,
        details: `Account status changed to ${next}`
      });
      saveState();
      return state.users[idx];
    }
    return null;
  },

  // 7. AI SUBSYSTEMS
  async getAISubsystems() {
    if (!state) reloadFromStorage();
    return [...state.aiSubsystems];
  },

  async toggleAISubsystem(id) {
    const idx = state.aiSubsystems.findIndex(s => s.id === id);
    if (idx !== -1) {
      state.aiSubsystems[idx].enabled = !state.aiSubsystems[idx].enabled;
      state.aiSubsystems[idx].status = state.aiSubsystems[idx].enabled ? 'Active' : 'Disabled';

      state.auditLogs.unshift({
        id: `LOG-${Math.floor(8900 + Math.random() * 1000)}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        user: 'System Administrator',
        role: 'System Administrator',
        facility: 'MoH Federal Data Center',
        action: 'AI_SUBSYSTEM_TOGGLE',
        entity: id,
        details: `Toggled ${state.aiSubsystems[idx].name} to ${state.aiSubsystems[idx].status}`
      });

      saveState();
      return state.aiSubsystems[idx];
    }
    return null;
  },

  // 8. AUDIT LOGS
  async getAuditLogs() {
    if (!state) reloadFromStorage();
    return [...state.auditLogs];
  },

  // 9. FEEDBACK
  async getFeedback() {
    if (!state) reloadFromStorage();
    return [...state.feedback];
  },

  async createFeedback(feedbackData) {
    const newFeedback = {
      id: `FDB-${Math.floor(100 + Math.random() * 900)}`,
      referralId: feedbackData.referralId,
      patientName: feedbackData.patientName || 'Referred Patient',
      referringFacility: feedbackData.referringFacility || 'Health Centre',
      receivingFacility: feedbackData.receivingFacility || 'Hospital',
      attendingPhysician: feedbackData.attendingPhysician || 'Attending Specialist',
      outcome: feedbackData.outcome || 'Treated & Discharged',
      dischargeSummary: feedbackData.dischargeSummary || '',
      recommendationsToHealthCentre: feedbackData.recommendationsToHealthCentre || '',
      submittedDate: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    state.feedback.unshift(newFeedback);

    // Mark referral completed if outcome implies completion
    const refIdx = state.referrals.findIndex(r => r.id === feedbackData.referralId);
    if (refIdx !== -1) {
      state.referrals[refIdx].status = 'Completed';
    }

    state.auditLogs.unshift({
      id: `LOG-${Math.floor(8900 + Math.random() * 1000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      user: feedbackData.attendingPhysician || 'Hospital Specialist',
      role: 'Hospital Staff',
      facility: feedbackData.receivingFacility || 'Hospital',
      action: 'SUBMIT_FEEDBACK',
      entity: feedbackData.referralId,
      details: `Submitted clinical outcome report for ${feedbackData.referralId}`
    });

    saveState();
    return newFeedback;
  }
};

export default dataService;
