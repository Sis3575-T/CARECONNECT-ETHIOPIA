import React from 'react';
import { Settings, Building2, Moon, Sun, Shield } from 'lucide-react';
import { useTheme } from '@shared/hooks/useTheme';

export default function SettingsPage() {
  const { isDark, toggleTheme } = useTheme('hospital');

  return (
    <div className="max-w-3xl mx-auto space-y-6 text-xs">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Hospital Configuration & Triage Preferences</h1>
        <p className="text-slate-500">Tikur Anbessa (Black Lion) Hospital portal configuration</p>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
          <Building2 className="w-4 h-4 text-emerald-600" />
          <span>Hospital Operational Profile</span>
        </h3>
        <div className="grid grid-cols-2 gap-3 text-slate-700 dark:text-slate-300">
          <div><span className="font-semibold text-slate-400 block">Facility:</span> Tikur Anbessa Specialized Hospital</div>
          <div><span className="font-semibold text-slate-400 block">Level:</span> Comprehensive Tertiary Teaching Hospital</div>
          <div><span className="font-semibold text-slate-400 block">Location:</span> Lideta Subcity, Addis Ababa</div>
          <div><span className="font-semibold text-slate-400 block">Emergency Line:</span> +251 11 551 1211</div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Interface Theme</h3>
          <p className="text-slate-400">Toggle dark / light appearance</p>
        </div>
        <button
          onClick={toggleTheme}
          className="px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl font-bold flex items-center gap-2"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          <span>{isDark ? 'Dark Mode' : 'Light Mode'}</span>
        </button>
      </div>
    </div>
  );
}
