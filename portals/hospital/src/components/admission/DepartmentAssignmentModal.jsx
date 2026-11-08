import React, { useState, useEffect } from 'react';
import {
  Building2,
  Layers,
  User,
  X,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Stethoscope,
  Info
} from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext.jsx';
import { hospitalService } from '../../services/hospitalService.js';

export function DepartmentAssignmentModal({
  isOpen,
  onClose,
  referral,
  onSuccess
}) {
  const { user } = useAuth();

  const [departments, setDepartments] = useState([]);
  const [services, setServices] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // Form states
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedDeptName, setSelectedDeptName] = useState('');
  const [selectedServiceCode, setSelectedServiceCode] = useState('');
  const [wardUnitName, setWardUnitName] = useState('');
  const [selectedBedType, setSelectedBedType] = useState('STANDARD');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [assignmentNotes, setAssignmentNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const currentDept = referral?.allocated_ward_department || '';
  const isReassignment = Boolean(currentDept && currentDept !== 'General Inpatient' && currentDept !== 'Unassigned');

  // Load real departments, services, and staff for hospital facility
  useEffect(() => {
    if (!isOpen || !referral) return;

    let isMounted = true;
    setLoadingOptions(true);
    setErrorMessage(null);

    async function loadFacilityContext() {
      const facilityId = referral.destination_facility_id || user?.facilityId;
      try {
        const [deptsRes, srvsRes, staffRes] = await Promise.allSettled([
          hospitalService.getHospitalDepartments(facilityId),
          hospitalService.getHospitalServices(facilityId),
          hospitalService.getHospitalStaff(facilityId)
        ]);

        if (isMounted) {
          const depts = deptsRes.status === 'fulfilled' ? deptsRes.value : [];
          setDepartments(depts.filter(d => d.isActive !== false));

          const srvs = srvsRes.status === 'fulfilled' ? srvsRes.value : [];
          setServices(srvs.filter(s => s.isAvailable !== false));

          const staff = staffRes.status === 'fulfilled' ? staffRes.value : [];
          setStaffList(staff);

          // Pre-populate if currently assigned
          if (referral.allocated_ward_department) {
            setSelectedDeptName(referral.allocated_ward_department);
            const matchedDept = depts.find(d => d.name === referral.allocated_ward_department);
            if (matchedDept) setSelectedDeptId(matchedDept.id);
          }
          if (referral.assigned_bed_type) {
            setSelectedBedType(referral.assigned_bed_type);
          }
          if (referral.receiving_clinician_id) {
            setSelectedStaffId(String(referral.receiving_clinician_id));
          }
        }
      } catch (err) {
        if (isMounted) {
          setErrorMessage('Failed to load facility departments and active staff list.');
        }
      } finally {
        if (isMounted) setLoadingOptions(false);
      }
    }

    loadFacilityContext();
    return () => { isMounted = false; };
  }, [isOpen, referral, user?.facilityId]);

  if (!isOpen || !referral) return null;

  const handleDeptSelect = (deptId) => {
    setSelectedDeptId(deptId);
    const found = departments.find(d => String(d.id) === String(deptId));
    if (found) {
      setSelectedDeptName(found.name);
    } else {
      setSelectedDeptName('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    const effectiveDept = selectedDeptName.trim();
    if (!effectiveDept) {
      setErrorMessage('Please select an active hospital department for patient admission.');
      return;
    }

    if (!assignmentNotes.trim() || assignmentNotes.trim().length < 5) {
      setErrorMessage('Please provide assignment instructions / transfer notes (minimum 5 characters).');
      return;
    }

    // Facility tenancy isolation check
    if (user?.facilityId && referral.destination_facility_id && referral.destination_facility_id !== user.facilityId) {
      setErrorMessage('Access denied: You cannot assign departments for referrals assigned to other hospitals.');
      return;
    }

    setSubmitting(true);
    try {
      const selectedStaff = staffList.find(s => String(s.id) === String(selectedStaffId));
      const staffName = selectedStaff ? `${selectedStaff.firstName} ${selectedStaff.lastName}` : null;

      const payload = {
        department_name: wardUnitName.trim() ? `${effectiveDept} - ${wardUnitName.trim()}` : effectiveDept,
        department_id: selectedDeptId,
        service_code: selectedServiceCode || null,
        bed_type: selectedBedType,
        assigned_bed_type: selectedBedType,
        staff_id: selectedStaffId ? Number(selectedStaffId) : null,
        staff_name: staffName,
        notes: assignmentNotes.trim(),
        is_reassignment: isReassignment
      };

      const updated = await hospitalService.assignDepartment(referral.id, payload);

      if (onSuccess) {
        onSuccess(updated, `${isReassignment ? 'Reassigned' : 'Assigned'} to ${payload.department_name}`);
      }
      onClose();
    } catch (err) {
      console.error('[DepartmentAssignmentModal] Assignment failed:', err);
      setErrorMessage(err?.response?.data?.message || err.message || 'Department assignment failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dept-modal-title"
      data-testid="department-assignment-modal"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 id="dept-modal-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
                {isReassignment ? 'Reassign Hospital Department' : 'Hospital Department & Bed Assignment'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Referral: <strong className="font-mono text-slate-700 dark:text-slate-300">{referral.reference_number || referral.id}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Current Assignment Notification if Reassigning */}
          {isReassignment && (
            <div className="flex items-start gap-3 p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-200">
              <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong>Current Department:</strong> {currentDept} ({referral.assigned_bed_type || 'Standard'}).
                Reassigning will preserve this transfer in the referral audit history.
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="flex items-start gap-3 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-200">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>{errorMessage}</div>
            </div>
          )}

          {loadingOptions ? (
            <div className="py-8 text-center text-xs text-slate-500 animate-pulse">
              Loading active facility departments and specialist roster...
            </div>
          ) : (
            <div className="space-y-4">
              {/* 1. Select Hospital Department */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Target Department <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedDeptId}
                  onChange={(e) => handleDeptSelect(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">— Select Active Department —</option>
                  {departments.map((dept) => (
                    <option key={dept.id || dept.code} value={dept.id}>
                      {dept.name} ({dept.code})
                    </option>
                  ))}
                </select>
                <span className="text-2xs text-slate-400 mt-1 block">
                  Only active departments authorized for this hospital are selectable.
                </span>
              </div>

              {/* 2. Ward Room / Sub-Unit Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Ward Name / Bay / Room (Optional)
                  </label>
                  <input
                    type="text"
                    value={wardUnitName}
                    onChange={(e) => setWardUnitName(e.target.value)}
                    placeholder="e.g. Ward 3B, Bed 12"
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Bed Classification */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Bed Classification <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedBedType}
                    onChange={(e) => setSelectedBedType(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="STANDARD">Standard Inpatient Bed</option>
                    <option value="EMERGENCY_OBSERVATION">Emergency Observation Unit</option>
                    <option value="ICU">Intensive Care Unit (ICU)</option>
                    <option value="ISOLATION">Isolation Ward Bed</option>
                  </select>
                </div>
              </div>

              {/* 3. Attending Specialist / Medical Staff */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Assigned Clinician / Specialist
                  </label>
                  <select
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">— Unassigned (Ward Team) —</option>
                    {staffList.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.firstName} {st.lastName} ({st.roleName || 'Specialist'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Associated Clinical Service */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Associated Clinical Service
                  </label>
                  <select
                    value={selectedServiceCode}
                    onChange={(e) => setSelectedServiceCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">— General Clinical Care —</option>
                    {services.map((srv) => (
                      <option key={srv.id || srv.serviceCode} value={srv.serviceCode}>
                        {srv.serviceCode.replace(/_/g, ' ')} ({srv.operatingHours || '24/7'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 4. Assignment / Transfer Instructions */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isReassignment ? 'Transfer Reason & Clinical Justification' : 'Admission Instructions & Nursing Notes'} <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={assignmentNotes}
                  onChange={(e) => setAssignmentNotes(e.target.value)}
                  rows={3}
                  placeholder={
                    isReassignment
                      ? 'Specify clinical reason for transferring patient to this department...'
                      : 'Record admission directives, primary nursing care plan, or bed notes...'
                  }
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Human Decision Disclaimer */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-2xs text-slate-500 dark:text-slate-400">
                <strong>Policy Notice:</strong> Department assignment is an authorized clinician responsibility.
                Ensure ward capacity and bed readiness prior to confirming admission placement.
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || loadingOptions}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50 transition-colors"
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving Assignment...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{isReassignment ? 'Confirm Reassignment' : 'Assign Department'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DepartmentAssignmentModal;
