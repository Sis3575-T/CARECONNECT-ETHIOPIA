import { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';

export function useCareConnectData() {
  const [, setTick] = useState(0);

  useEffect(() => {
    // Subscribe to state updates across local components & cross-tab / cross-port events
    const unsubscribe = dataService.subscribe(() => {
      setTick(t => t + 1);
    });
    return unsubscribe;
  }, []);

  const state = dataService.getState();

  return {
    // Current live data
    facilities: state.facilities || [],
    patients: state.patients || [],
    referrals: state.referrals || [],
    transports: state.transports || [],
    resources: state.resources || [],
    users: state.users || [],
    aiSubsystems: state.aiSubsystems || [],
    aiBenchmarks: state.aiBenchmarks || [],
    auditLogs: state.auditLogs || [],
    feedback: state.feedback || [],

    // Real mutations
    createReferral: (data) => dataService.createReferral(data),
    updateReferralStatus: (id, status, notes, meta) => dataService.updateReferralStatus(id, status, notes, meta),
    createPatient: (data) => dataService.createPatient(data),
    updatePatient: (id, data) => dataService.updatePatient(id, data),
    deletePatient: (id) => dataService.deletePatient(id),
    updateFacilityCapacity: (id, capacity) => dataService.updateFacilityCapacity(id, capacity),
    createFacility: (data) => dataService.createFacility(data),
    updateFacility: (id, data) => dataService.updateFacility(id, data),
    toggleFacilityStatus: (id) => dataService.toggleFacilityStatus(id),
    assignTransport: (data) => dataService.assignTransport(data),
    updateTransportStatus: (id, status, meta) => dataService.updateTransportStatus(id, status, meta),
    createResource: (data) => dataService.createResource(data),
    updateResource: (id, data) => dataService.updateResource(id, data),
    createUser: (data) => dataService.createUser(data),
    updateUser: (id, data) => dataService.updateUser(id, data),
    toggleUserStatus: (id) => dataService.toggleUserStatus(id),
    toggleAISubsystem: (id) => dataService.toggleAISubsystem(id),
    createFeedback: (data) => dataService.createFeedback(data)
  };
}

export default useCareConnectData;
