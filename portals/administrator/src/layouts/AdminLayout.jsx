import React, { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Shield,
  Building2,
  Activity,
  GitBranch,
  Cpu,
  Sparkles,
  BarChart3,
  FileCheck2,
  Settings,
  LogOut,
  Menu,
  Sun,
  Moon,
  Bell,
  ShieldCheck
} from 'lucide-react';
import { useTheme } from '@shared/hooks/useTheme';

export default function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { isDark, toggleTheme } = useTheme('administrator');
  const navigate = useNavigate();

  const navItems = [
    { to: '/', label: 'System Overview', icon: LayoutDashboard },
    { to: '/users', label: 'User Management', icon: Users },
    { to: '/roles', label: 'Roles & Permissions', icon: Shield },
    { to: '/facilities', label: 'Health Facilities', icon: Building2 },
    { to: '/capacity-monitoring', label: 'Capacity Monitoring', icon: Activity },
    { to: '/referrals', label: 'Referral Monitoring', icon: GitBranch },
    { to: '/ai-management', label: 'AI Subsystems', icon: Cpu },
    { to: '/ai-performance', label: 'AI Performance', icon: Sparkles },
    { to: '/analytics', label: 'Platform Analytics', icon: BarChart3 },
    { to: '/audit-logs', label: 'Audit Logs', icon: FileCheck2 },
    { to: '/settings', label: 'System Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-900 transition-colors duration-150">
      {/* Sidebar with Dark Navy theme */}
      <aside className={`bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col z-30 transition-all duration-200 select-none ${
        isSidebarOpen ? 'w-64' : 'w-20'
      }`}>
        <div className="h-16 flex items-center px-4 border-b border-slate-100 dark:border-slate-700/60 justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#1e3a8a] to-[#2563eb] flex items-center justify-center text-white shrink-0 shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            {isSidebarOpen && (
              <div className="flex flex-col">
                <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white leading-tight">CareConnect</span>
                <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Admin Portal</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>

        {/* System Health Badge */}
        {isSidebarOpen && (
          <div className="mx-3 mt-3 p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200">Federal Health Authority</span>
              <span className="text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.2 rounded">Uptime 99.9%</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">89 Facilities Monitored</p>
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
                className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#1e3a8a] text-white shadow-sm'
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

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-700/60 space-y-2">
          {isSidebarOpen && (
            <div className="text-[10px] text-slate-400 text-center">
              <span>Port: 5176 • Independent App</span>
            </div>
          )}
          <button
            onClick={() => navigate('/login')}
            className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors ${
              !isSidebarOpen ? 'justify-center px-2' : ''
            }`}
          >
            <LogOut className="w-4 h-4" />
            {isSidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">System Administration</span>
            <span className="text-slate-300 dark:text-slate-600">/</span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 font-mono">http://localhost:5176</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            <div className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500" />
            </div>

            <div className="flex items-center gap-2.5 p-1.5 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-[#1e3a8a] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                AU
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-800 dark:text-white">Admin User</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">System Admin • MoH</span>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
