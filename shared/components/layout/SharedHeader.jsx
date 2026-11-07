import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Sun,
  Moon,
  Bell,
  ChevronDown,
  LogOut,
  User,
  Settings,
  ShieldCheck,
  Globe
} from 'lucide-react';
import { cn } from '../../utils/cn.js';
import Avatar from '../display/Avatar.jsx';
import StatusIndicator from '../display/StatusIndicator.jsx';
import { useTheme } from '../../hooks/useTheme.js';

/**
 * CareConnect Ethiopia - Reusable Shared Top Navigation Header
 * Features portal identification, live status, language toggle, notification entry point,
 * theme toggle, and authenticated user profile dropdown.
 */
export function SharedHeader({
  portalTitle = 'CareConnect Ethiopia',
  portalSubtitle = 'Healthcare Portal',
  portalColor = 'emerald', // emerald, sky, purple, navy
  facilityName = 'Federal Ministry of Health',
  facilityRegion = 'Addis Ababa',
  user = {
    firstName: 'Clinician',
    lastName: 'User',
    role: 'Healthcare Professional'
  },
  notificationCount = 0,
  onNotificationClick,
  onLogout,
  onMenuToggle,
  language = 'en',
  onToggleLanguage,
  className
}) {
  const { isDark, toggleTheme } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';

  return (
    <header
      className={cn(
        'h-16 px-4 sm:px-6 bg-white dark:bg-slate-800 border-b border-slate-200/80 dark:border-slate-700/80',
        'flex items-center justify-between z-20 sticky top-0 transition-colors',
        className
      )}
    >
      {/* Left: Mobile hamburger & Facility info */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuToggle}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 lg:hidden focus:outline-none focus:ring-2 focus:ring-emerald-500"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex flex-col">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
              {facilityName}
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
              {facilityRegion}
            </span>
          </div>

          <div className="hidden md:flex items-center">
            <StatusIndicator status="online" label="Network Live" size="sm" />
          </div>
        </div>
      </div>

      {/* Right Controls: Language, Theme, Notifications, Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Language Switcher */}
        {onToggleLanguage && (
          <button
            type="button"
            onClick={onToggleLanguage}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
            aria-label="Toggle language between English and Amharic"
          >
            <Globe className="w-4 h-4 text-slate-400" />
            <span className="uppercase">{language === 'en' ? 'EN' : 'አማ'}</span>
          </button>
        )}

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* In-App Notifications Bell */}
        <button
          type="button"
          onClick={onNotificationClick}
          className="relative p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
          aria-label={`Notifications, ${notificationCount} unread`}
        >
          <Bell className="w-4 h-4" />
          {notificationCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-800">
              {notificationCount > 99 ? '99+' : notificationCount}
            </span>
          )}
        </button>

        {/* Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen(prev => !prev)}
            aria-expanded={profileOpen}
            aria-haspopup="true"
            className="flex items-center gap-2 p-1 pl-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <Avatar name={fullName} size="sm" />
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                {fullName}
              </span>
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 capitalize">
                {user.role?.toLowerCase()?.replace(/_/g, ' ') || 'Staff'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {profileOpen && (
            <div
              className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-1"
              role="menu"
              aria-orientation="vertical"
            >
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700/60">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{fullName}</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{user.email || 'careconnect@health.et'}</p>
                <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                  <ShieldCheck className="w-3 h-3" />
                  <span>{user.role || 'Authorized'}</span>
                </div>
              </div>

              <div className="py-1">
                <a
                  href="#/settings"
                  className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  role="menuitem"
                  onClick={() => setProfileOpen(false)}
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Account Settings</span>
                </a>
              </div>

              {onLogout && (
                <div className="pt-1 border-t border-slate-100 dark:border-slate-700/60">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-left"
                    role="menuitem"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default SharedHeader;
