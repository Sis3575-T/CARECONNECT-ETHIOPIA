import React, { useState } from 'react';
import {
  Settings,
  Shield,
  Moon,
  Sun,
  Server,
  Lock,
  Database,
  CheckCircle2,
  Bell,
  RefreshCw
} from 'lucide-react';
import { useTheme } from '@shared/hooks/useTheme';

export default function SettingsPage() {
  const { isDark, toggleTheme } = useTheme('administrator');
  const [sessionTimeout, setSessionTimeout] = useState('30');
  const [phiRedaction, setPhiRedaction] = useState(true);
  const [savedNotification, setSavedNotification] = useState(false);

  const handleSaveSettings = (e) => {
    e.preventDefault();
    setSavedNotification(true);
    setTimeout(() => setSavedNotification(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-xs">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          System Administration & Governance Settings (Section 9.K)
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Health data privacy regulations, backend API connection, and platform security standards
        </p>
      </div>

      {savedNotification && (
        <div className="p-3 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-2xl border border-emerald-200 dark:border-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span className="font-bold">System configurations successfully persisted.</span>
        </div>
      )}

      {/* Security & Health Compliance Standards */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Ethiopian Health Data Protection & Privacy (Section 11)
            </h3>
            <p className="text-slate-400 text-xs">Compliance with Federal Ministry of Health directives</p>
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200 block">Protected Health Information (PHI) Redaction</span>
              <span className="text-slate-400 text-[11px]">Automatically mask sensitive clinical diagnoses for non-clinical roles</span>
            </div>
            <button
              onClick={() => setPhiRedaction(!phiRedaction)}
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                phiRedaction ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${phiRedaction ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Admin Session Inactivity Timeout
            </label>
            <select
              value={sessionTimeout}
              onChange={(e) => setSessionTimeout(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-semibold"
            >
              <option value="15">15 Minutes (Strict)</option>
              <option value="30">30 Minutes (Standard)</option>
              <option value="60">60 Minutes</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Audit Log Retention Schedule
            </label>
            <input
              type="text"
              readOnly
              value="7 Years (Permanent Federal Health Standard)"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Backend & Microservices Architecture */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
            <Server className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Backend Microservices & Telemetry Endpoints
            </h3>
            <p className="text-slate-400 text-xs">Live API connections and cross-portal synchronizer</p>
          </div>
        </div>

        <div className="space-y-3 font-mono text-xs">
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center justify-between">
            <span className="text-slate-500 font-sans">REST Backend Server:</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">http://localhost:5000/api</span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center justify-between">
            <span className="text-slate-500 font-sans">Cross-Portal Synchronizer:</span>
            <span className="font-bold text-emerald-600">BroadcastChannel('careconnect_et_bus')</span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center justify-between">
            <span className="text-slate-500 font-sans">Persistent Storage Engine:</span>
            <span className="font-bold text-purple-600">server/data/database.json + LocalStorage</span>
          </div>
        </div>
      </div>

      {/* Display & Visual Theme Preference */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Theme Preference</h3>
          <p className="text-slate-400 text-xs mt-0.5">Toggle interface dark and light mode for the Administrator Portal</p>
        </div>
        <button
          onClick={toggleTheme}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl font-bold flex items-center gap-2 transition-colors"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          <span>{isDark ? 'Dark Mode' : 'Light Mode'}</span>
        </button>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveSettings}
          className="px-6 py-2.5 bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-bold rounded-xl shadow-xs transition-all"
        >
          Save Configuration
        </button>
      </div>
    </div>
  );
}