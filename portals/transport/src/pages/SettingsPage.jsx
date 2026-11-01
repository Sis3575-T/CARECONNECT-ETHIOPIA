import React from 'react';
import { Settings, Truck, Moon, Sun } from 'lucide-react';
import { useTheme } from '@shared/hooks/useTheme';

export default function SettingsPage() {
  const { isDark, toggleTheme } = useTheme('transport');

  return (
    <div className="max-w-3xl mx-auto space-y-6 text-xs">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Transport Dispatch Configuration</h1>
        <p className="text-slate-500">Ambulance dispatch unit profile and coordinator preferences</p>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
          <Truck className="w-4 h-4 text-violet-600" />
          <span>Dispatch Center Information</span>
        </h3>
        <div className="grid grid-cols-2 gap-3 text-slate-700 dark:text-slate-300">
          <div><span className="font-semibold text-slate-400 block">Unit:</span> Addis Ababa Emergency Dispatch Center</div>
          <div><span className="font-semibold text-slate-400 block">Lead Coordinator:</span> Abebe Kebede</div>
          <div><span className="font-semibold text-slate-400 block">Emergency Dispatch Line:</span> 907 / +251 11 551 0000</div>
          <div><span className="font-semibold text-slate-400 block">Coverage Area:</span> Addis Ababa & Central Zone</div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Interface Appearance</h3>
          <p className="text-slate-400">Toggle light / dark mode for dispatch room screens</p>
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
