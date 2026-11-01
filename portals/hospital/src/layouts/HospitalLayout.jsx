import React, { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Inbox,
  Clock,
  CheckCircle,
  XCircle,
  Bed,
  Layers,
  BedDouble,
  MessageSquare,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  Sun,
  Moon,
  Bell,
  ChevronDown,
  Building2,
  ExternalLink
} from 'lucide-react';
import { useTheme } from '@shared/hooks/useTheme';
import { useCareConnectData } from '@shared/hooks/useCareConnectData';

export default function HospitalLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const { isDark, toggleTheme } = useTheme('hospital');
  const { referrals, facilities } = useCareConnectData();
  const navigate = useNavigate();

  const currentHospital = facilities.find(f => f.name.includes('Tikur')) || facilities[0];
  const pendingCount = referrals.filter(r => r.status === 'Pending').length;

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/incoming', label: 'Incoming Referrals', icon: Inbox, badge: referrals.length },
    { to: '/pending', label: 'Pending Triage', icon: Clock, badge: pendingCount > 0 ? pendingCount : null },
    { to: '/accepted', label: 'Accepted Cases', icon: CheckCircle },
    { to: '/rejected', label: 'Rejected (FR-22)', icon: XCircle },
    { to: '/arrivals', label: 'Patient Admissions', icon: Bed },
    { to: '/services', label: 'Facility Services', icon: Layers },
    { to: '/capacity', label: 'Capacity Management', icon: BedDouble },
    { to: '/feedback', label: 'Clinical Feedback', icon: MessageSquare },
    { to: '/reports', label: 'Hospital Reports', icon: BarChart3 },
    { to: '/settings', label: 'Profile & Settings', icon: Settings },
  ];

  const handleLogout = () => {
    localStorage.removeItem('careconnect_user');
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-900 transition-colors duration-150">
      {/* Sidebar with Teal/Emerald theme */}
      <aside className={`bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col z-30 transition-all duration-200 select-none ${
        isSidebarOpen ? 'w-64' : 'w-20'
      }`}>
        <div className="h-16 flex items-center px-4 border-b border-slate-100 dark:border-slate-700/60 justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#059669] to-[#10b981] flex items-center justify-center text-white shrink-0 shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            {isSidebarOpen && (
              <div className="flex flex-col">
                <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white leading-tight">CareConnect</span>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Hospital Portal</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>

        {/* Hospital Facility Badge */}
        {isSidebarOpen && (
          <div className="mx-3 mt-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{currentHospital?.name?.split('(')[0] || 'Tikur Anbessa'}</span>
              <span className="text-[10px] bg-emerald-600 text-white font-bold px-1.5 py-0.2 rounded shrink-0">Tertiary</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Black Lion • <b className="text-emerald-600">{currentHospital?.availableBeds || 42} Free Beds</b>
            </p>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2.5 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                {isSidebarOpen && <span className="flex-1 truncate">{item.label}</span>}
                {isSidebarOpen && item.badge && (
                  <span className="px-1.5 py-0.2 text-[10px] rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-700/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                FW
              </div>
              {isSidebarOpen && (
                <div className="flex flex-col truncate">
                  <span className="text-xs font-bold text-slate-800 dark:text-white truncate">Dr. Fitsum Tadesse</span>
                  <span className="text-[10px] text-slate-400">Chief Triage Officer</span>
                </div>
              )}
            </div>
            {isSidebarOpen && (
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 z-20">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Hospital Referral Management Workspace</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={() => navigate('/incoming')}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 relative cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {pendingCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
