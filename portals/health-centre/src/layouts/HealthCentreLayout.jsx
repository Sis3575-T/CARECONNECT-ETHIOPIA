import React, { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  PlusCircle,
  FileText,
  Building2,
  GitBranch,
  Sparkles,
  BarChart3,
  Bot,
  Settings,
  LogOut,
  Menu,
  Sun,
  Moon,
  Bell,
  ChevronDown,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { useTheme } from '@shared/hooks/useTheme';

export default function HealthCentreLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [notificationCount, setNotificationCount] = useState(2);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const { isDark, toggleTheme } = useTheme('health_centre');
  const navigate = useNavigate();

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/patients', label: 'Patients', icon: Users },
    { to: '/create-referral', label: 'Create Referral', icon: PlusCircle },
    { to: '/referrals', label: 'All Referrals', icon: FileText },
    { to: '/ai-review', label: 'AI OCR Review', icon: Sparkles },
    { to: '/hospitals', label: 'Hospital Matches', icon: Building2 },
    { to: '/tracking', label: 'Referral Tracking', icon: GitBranch },
    { to: '/reports', label: 'Reports', icon: BarChart3 },
    { to: '/ai-assistant', label: 'AI Assistant', icon: Bot },
    { to: '/settings', label: 'Profile & Settings', icon: Settings },
  ];

  const handleLogout = () => {
    localStorage.removeItem('careconnect_user');
    navigate('/login');
  };

  return (
    <div className={`min-h-screen flex bg-slate-50 dark:bg-slate-900 transition-colors duration-150`}>
      {/* Sidebar */}
      <aside className={`bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col z-30 transition-all duration-200 select-none ${
        isSidebarOpen ? 'w-64' : 'w-20'
      }`}>
        {/* Logo and Brand */}
        <div className="h-16 flex items-center px-4 border-b border-slate-100 dark:border-slate-700/60 justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0284c7] to-[#0ea5e9] flex items-center justify-center text-white shrink-0 shadow-sm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
                <path d="M12 4v16M4 12h16" />
              </svg>
            </div>
            {isSidebarOpen && (
              <div className="flex flex-col">
                <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white leading-tight">CareConnect</span>
                <span className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider">Health Centre Portal</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>

        {/* Facility Info Pill */}
        {isSidebarOpen && (
          <div className="mx-3 mt-3 p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/60 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200">Yeka Health Centre</span>
              <span className="text-[10px] bg-emerald-500 text-white font-bold px-1.5 py-0.2 rounded">Online</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Woreda 03, Addis Ababa</p>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 py-4 px-2.5 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#0284c7] text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                } ${!isSidebarOpen ? 'justify-center px-2' : ''}`}
                title={item.label}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {isSidebarOpen && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom User / Port Link */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-700/60 space-y-2">
          {isSidebarOpen && (
            <div className="text-[10px] text-slate-400 text-center">
              <span>Port: 5173 • Independent App</span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors ${
              !isSidebarOpen ? 'justify-center px-2' : ''
            }`}
          >
            <LogOut className="w-4 h-4" />
            {isSidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Health Centre Workspace</span>
            <span className="text-slate-300 dark:text-slate-600">/</span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 font-mono">http://localhost:5173</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="Toggle Light / Dark mode"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Notifications */}
            <div className="relative cursor-pointer p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">
              <Bell className="w-4 h-4" />
              {notificationCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
              )}
            </div>

            {/* User Profile */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[#0284c7] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                  DA
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-800 dark:text-white">Dr. Alemayehu Bekele</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Chief Referring Officer</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 py-2 z-50 animate-in fade-in">
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700 text-xs">
                    <p className="font-bold text-slate-900 dark:text-white">Dr. Alemayehu Bekele</p>
                    <p className="text-[11px] text-slate-500">dr.alemayehu@careconnect.gov.et</p>
                  </div>
                  <NavLink
                    to="/settings"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Facility Settings</span>
                  </NavLink>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content Outlet */}
        <main className="p-4 sm:p-6 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
