import React, { useState } from 'react';
import { Settings, Building2, Bell, Shield, Moon, Sun } from 'lucide-react';
import { useTheme } from '@shared/hooks/useTheme';

export default function SettingsPage() {
  const { isDark, toggleTheme } = useTheme('health_centre');
  const [notifySms, setNotifySms] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);

  return (
    <div className="max-w-3xl mx-auto space-y-6 text-xs">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Facility Profile & Settings</h1>
        <p className="text-slate-500">Manage Yeka Health Centre referral preferences and system appearance</p>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
          <Building2 className="w-4 h-4 text-sky-600" />
          <span>Health Facility Credentials</span>
        </h3>
        <div className="grid grid-cols-2 gap-3 text-slate-700 dark:text-slate-300">
          <div><span className="font-semibold text-slate-400 block">Facility Name:</span> Yeka Health Centre</div>
          <div><span className="font-semibold text-slate-400 block">Facility Level:</span> Primary Health Centre</div>
          <div><span className="font-semibold text-slate-400 block">Region / Zone:</span> Addis Ababa / Yeka Subcity</div>
          <div><span className="font-semibold text-slate-400 block">Contact Phone:</span> +251 11 661 4590</div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
          <Bell className="w-4 h-4 text-sky-600" />
          <span>Referral Status Alert Notifications</span>
        </h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="font-bold text-slate-800 dark:text-white">Immediate SMS Alerts on Hospital Acceptance</p>
              <p className="text-slate-400">Receive instant SMS notification when referral is accepted</p>
            </div>
            <input
              type="checkbox"
              checked={notifySms}
              onChange={(e) => setNotifySms(e.target.checked)}
              className="rounded text-sky-600 focus:ring-sky-500"
            />
          </label>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Color Theme</h3>
          <p className="text-slate-400">Toggle between professional light and dark mode</p>
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
