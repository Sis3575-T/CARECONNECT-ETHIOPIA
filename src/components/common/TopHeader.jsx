import React, { useState } from 'react';
import { Menu, ChevronDown, Bell, Globe, User, LogOut, CheckCircle2 } from 'lucide-react';

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

  return (
    <header className="h-14 bg-white border-b border-slate-100 px-4 sm:px-6 flex items-center justify-between z-20">
      {/* Left: Hamburger menu toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle Navigation Menu"
          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none"
        >
          <Menu className="w-5 h-5" />
        </button>
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

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3.5 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-800">{userName}</p>
                <p className="text-[11px] text-slate-500">{userSubtitle}</p>
                <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Authorized CareConnect Staff</span>
                </div>
              </div>

              <button
                onClick={() => setDropdownOpen(false)}
                className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>My Profile & Facility</span>
              </button>

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  if (onLogout) onLogout();
                }}
                className="w-full text-left px-3.5 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5 text-red-500" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
