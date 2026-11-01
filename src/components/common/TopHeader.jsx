import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, ChevronDown, Bell, Globe, User, LogOut, CheckCircle2, LayoutGrid, Building2, Truck, Plus, ShieldCheck } from 'lucide-react';

export default function TopHeader({
  userName = 'Dr. Alemayehu',
  userSubtitle = 'Health Centre',
  avatarUrl = null,
  onToggleSidebar,
  portalTheme = 'sky', // sky, emerald, purple, blue
  onLogout,
  notificationCount = 0
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const portalsList = [
    { label: 'Health Centre Portal', path: '/health-centre', icon: Plus, color: 'text-sky-600' },
    { label: 'Hospital Portal', path: '/hospital', icon: Building2, color: 'text-emerald-600' },
    { label: 'Transport Portal', path: '/transport', icon: Truck, color: 'text-violet-600' },
    { label: 'System Admin Portal', path: '/admin', icon: ShieldCheck, color: 'text-blue-700' },
    { label: '4-Portal Collage View', path: '/', icon: LayoutGrid, color: 'text-slate-700' }
  ];

  return (
    <header className="h-14 bg-white border-b border-slate-100 px-4 sm:px-6 flex items-center justify-between z-20">
      {/* Left: Hamburger menu toggle & current route badge */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle Navigation Menu"
          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Current URL indicator pill */}
        <div className="hidden md:flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-md text-[11px] font-mono text-slate-600">
          <span className="text-slate-400">URL:</span>
          <span className="font-bold text-slate-800">{location.pathname}</span>
        </div>
      </div>

      {/* Right: Quick actions and user profile */}
      <div className="flex items-center gap-4">
        {notificationCount > 0 && (
          <div className="relative cursor-pointer text-slate-500 hover:text-slate-700">
            <Bell className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500" />
          </div>
        )}

        {/* User profile dropdown trigger */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-slate-50 transition-colors focus:outline-none"
          >
            {/* User Avatar */}
            <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
              ) : (
                <div className={`w-full h-full flex items-center justify-center text-white text-xs font-semibold ${
                  portalTheme === 'emerald' ? 'bg-emerald-600' :
                  portalTheme === 'purple' ? 'bg-violet-600' :
                  portalTheme === 'admin' ? 'bg-blue-700' :
                  'bg-sky-600'
                }`}>
                  {userName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
              )}
            </div>

            {/* User Name and Subtitle */}
            <div className="hidden sm:flex flex-col text-left leading-tight">
              <span className="text-[13px] font-semibold text-slate-800">
                {userName}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {userSubtitle}
              </span>
            </div>

            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Dropdown Menu with Direct Portal Switching */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3.5 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-800">{userName}</p>
                <p className="text-[11px] text-slate-500">{userSubtitle}</p>
                <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Authorized CareConnect Staff</span>
                </div>
              </div>

              {/* Quick portal navigation */}
              <div className="py-1 border-b border-slate-100">
                <span className="px-3.5 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Switch Portal URL
                </span>
                <div className="mt-1 space-y-0.5">
                  {portalsList.map((p) => {
                    const Icon = p.icon;
                    const isSelected = location.pathname === p.path;
                    return (
                      <button
                        key={p.path}
                        onClick={() => {
                          setDropdownOpen(false);
                          navigate(p.path);
                        }}
                        className={`w-full text-left px-3.5 py-1.5 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                          isSelected ? 'font-bold bg-slate-50 text-slate-900' : 'text-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={`w-3.5 h-3.5 ${p.color}`} />
                          <span>{p.label}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">{p.path}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  if (onLogout) onLogout();
                  else navigate('/');
                }}
                className="w-full text-left px-3.5 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5 text-red-500" />
                <span>Sign Out to Overview</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
