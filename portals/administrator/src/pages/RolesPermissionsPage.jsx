import React, { useState } from 'react';
import {
  Shield,
  ShieldCheck,
  Check,
  X,
  Users,
  Building2,
  Ambulance,
  Lock,
  Info,
  Key,
  FileCheck2,
  Sparkles
} from 'lucide-react';
import { useCareConnectData } from '@shared/hooks/useCareConnectData';

const ROLES_INFO = [
  {
    role: 'Health Centre Staff',
    badge: 'Referring Clinicians',
    color: 'sky',
    description: 'Primary care practitioners, general practitioners, and health officers at regional health centres generating outbound hospital referrals.',
    portal: 'Health Centre Portal (Port 5173)'
  },
  {
    role: 'Hospital Staff',
    badge: 'Receiving Specialists',
    color: 'emerald',
    description: 'Triage officers, medical directors, and department nurses at general and tertiary hospitals reviewing intake requests and allocating beds.',
    portal: 'Hospital Portal (Port 5174)'
  },
  {
    role: 'Transport Coordinator',
    badge: 'Emergency Dispatch',
    color: 'amber',
    description: 'Regional dispatchers coordinating EMS ambulance fleets, assigning drivers, monitoring live GPS telemetry, and logging in-transit status.',
    portal: 'Transport Coordinator Portal (Port 5175)'
  },
  {
    role: 'System Administrator',
    badge: 'Platform Governance',
    color: 'blue',
    description: 'Ministry of Health and regional health bureau administrators managing system security, user provisioning, facility onboarding, and AI pipelines.',
    portal: 'System Administrator Portal (Port 5176)'
  }
];

const PERMISSIONS_MATRIX = [
  {
    category: 'Patient & Clinical Records',
    permissions: [
      { name: 'Register New Patient', health: true, hospital: false, transport: false, admin: true },
      { name: 'View Full Clinical History', health: true, hospital: true, transport: false, admin: false, sensitive: true },
      { name: 'Edit Demographic Info', health: true, hospital: true, transport: false, admin: true },
      { name: 'Export Patient Registry', health: true, hospital: false, transport: false, admin: true },
    ]
  },
  {
    category: 'Referral Lifecycle (MoH FR-01 & FR-22)',
    permissions: [
      { name: 'Create Outbound Referral', health: true, hospital: false, transport: false, admin: false },
      { name: 'Review AI-Assisted OCR Slip', health: true, hospital: false, transport: false, admin: false },
      { name: 'Acknowledge Intake Request', health: false, hospital: true, transport: false, admin: false },
      { name: 'Accept Referral & Allocate Bed', health: false, hospital: true, transport: false, admin: false },
      { name: 'Reject with Justification (FR-22)', health: false, hospital: true, transport: false, admin: false },
      { name: 'Issue Post-Discharge Feedback (FR-24)', health: false, hospital: true, transport: false, admin: false },
    ]
  },
  {
    category: 'Transport & Fleet Logistics',
    permissions: [
      { name: 'Request Emergency Transport', health: true, hospital: false, transport: true, admin: false },
      { name: 'Assign Ambulance & Driver', health: false, hospital: false, transport: true, admin: false },
      { name: 'Update Live GPS Telemetry', health: false, hospital: false, transport: true, admin: false },
      { name: 'Manage Fleet Vehicles', health: false, hospital: false, transport: true, admin: true },
    ]
  },
  {
    category: 'Facility & System Governance',
    permissions: [
      { name: 'Update Bed & ICU Capacity', health: false, hospital: true, transport: false, admin: true },
      { name: 'Register / Edit Facilities', health: false, hospital: false, transport: false, admin: true },
      { name: 'Manage User Accounts & RBAC', health: false, hospital: false, transport: false, admin: true },
      { name: 'Configure AI Subsystems (AI-01 to AI-09)', health: false, hospital: false, transport: false, admin: true },
      { name: 'Audit Trail Surveillance', health: false, hospital: false, transport: false, admin: true },
    ]
  }
];

export default function RolesPermissionsPage() {
  const { users } = useCareConnectData();
  const [selectedRole, setSelectedRole] = useState(null);

  const getRoleUserCount = (roleName) => {
    return users.filter(u => u.role === roleName).length;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Roles & Access Permissions (Section 9.D, FR-04)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Role-Based Access Control (RBAC) governance conforming to Ethiopian Health Data Privacy standards
          </p>
        </div>
      </div>

      {/* Security Banner */}
      <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-sm block">Strict Separation of Responsibilities</span>
          <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
            Per Ministry of Health Clinical Referral Guidelines (Section 13), System Administrators manage users, facilities, and AI services but <strong>cannot modify clinical diagnoses or triage outcomes</strong>. Transport coordinators manage vehicle dispatches but have strictly redacted access to sensitive medical notes.
          </p>
        </div>
      </div>

      {/* 4 Role Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {ROLES_INFO.map((r) => {
          const count = getRoleUserCount(r.role);
          return (
            <div
              key={r.role}
              onClick={() => setSelectedRole(r.role === selectedRole ? null : r.role)}
              className={`bg-white dark:bg-slate-800 p-5 rounded-2xl border transition-all cursor-pointer shadow-xs ${
                selectedRole === r.role
                  ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-md'
                  : 'border-slate-200/80 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  {r.badge}
                </span>
                <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                  {count} {count === 1 ? 'user' : 'users'}
                </span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">{r.role}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed line-clamp-3">
                {r.description}
              </p>
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>{r.portal.split(' ')[0]}</span>
                <span className="font-semibold text-slate-600 dark:text-slate-300">Active</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* RBAC Matrix */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-base text-slate-900 dark:text-white">Permission Matrix by Role</h2>
            <p className="text-slate-500 text-xs mt-0.5">Matrix of granular privileges enforced across all four independent portals</p>
          </div>
          {selectedRole && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Filtered by:</span>
              <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 font-bold rounded-lg text-xs">
                {selectedRole}
              </span>
              <button
                onClick={() => setSelectedRole(null)}
                className="text-xs text-slate-400 hover:text-slate-600 ml-1 underline"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 text-slate-500 uppercase text-[10px] font-bold">
              <tr>
                <th className="py-3 px-5 min-w-[240px]">Privilege & Operation</th>
                <th className={`py-3 px-4 text-center min-w-[140px] ${selectedRole === 'Health Centre Staff' ? 'bg-blue-50/50 dark:bg-blue-950/30 font-black text-blue-600' : ''}`}>
                  Health Centre Staff
                </th>
                <th className={`py-3 px-4 text-center min-w-[140px] ${selectedRole === 'Hospital Staff' ? 'bg-blue-50/50 dark:bg-blue-950/30 font-black text-blue-600' : ''}`}>
                  Hospital Staff
                </th>
                <th className={`py-3 px-4 text-center min-w-[140px] ${selectedRole === 'Transport Coordinator' ? 'bg-blue-50/50 dark:bg-blue-950/30 font-black text-blue-600' : ''}`}>
                  Transport Coord.
                </th>
                <th className={`py-3 px-4 text-center min-w-[140px] ${selectedRole === 'System Administrator' ? 'bg-blue-50/50 dark:bg-blue-950/30 font-black text-blue-600' : ''}`}>
                  System Admin
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {PERMISSIONS_MATRIX.map((cat, catIdx) => (
                <React.Fragment key={cat.category}>
                  <tr className="bg-slate-50/70 dark:bg-slate-900/40">
                    <td colSpan={5} className="py-2.5 px-5 font-bold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wider">
                      {cat.category}
                    </td>
                  </tr>
                  {cat.permissions.map((p, pIdx) => (
                    <tr key={p.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{p.name}</span>
                          {p.sensitive && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              PHI Sensitive
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`py-3 px-4 text-center ${selectedRole === 'Health Centre Staff' ? 'bg-blue-50/30 dark:bg-blue-950/20' : ''}`}>
                        {p.health ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700/50 text-slate-400">
                            <X className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </td>
                      <td className={`py-3 px-4 text-center ${selectedRole === 'Hospital Staff' ? 'bg-blue-50/30 dark:bg-blue-950/20' : ''}`}>
                        {p.hospital ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700/50 text-slate-400">
                            <X className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </td>
                      <td className={`py-3 px-4 text-center ${selectedRole === 'Transport Coordinator' ? 'bg-blue-50/30 dark:bg-blue-950/20' : ''}`}>
                        {p.transport ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700/50 text-slate-400">
                            <X className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </td>
                      <td className={`py-3 px-4 text-center ${selectedRole === 'System Administrator' ? 'bg-blue-50/30 dark:bg-blue-950/20' : ''}`}>
                        {p.admin ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700/50 text-slate-400">
                            <X className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}