import React from 'react';
import { LogOut } from 'lucide-react';

/**
 * CareConnect Ethiopia - Hospital Discharge & Outcome Workspace
 */
export default function DischargeWorkspacePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6" data-testid="discharge-workspace-page">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
          <LogOut className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Hospital Referral Discharge & Transfer Workspace
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Authoritative clinical discharge, inter-facility transfer, return to referrer, and patient outcome documentation.
          </p>
        </div>
      </div>
    </div>
  );
}
