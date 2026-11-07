import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { X, Activity } from 'lucide-react';
import { cn } from '../../utils/cn.js';

/**
 * CareConnect Ethiopia - Reusable Mobile Navigation Drawer
 */
export function SharedMobileNav({
  isOpen = false,
  onClose,
  portalName = 'CareConnect',
  portalSubtitle = 'Portal',
  portalAccent = 'emerald',
  portalIcon: PortalIcon = Activity,
  navItems = [],
  facilityName
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 lg:hidden flex"
      role="dialog"
      aria-modal="true"
      aria-label="Mobile Navigation"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="relative flex flex-col w-72 max-w-[85vw] bg-white dark:bg-slate-800 h-full shadow-2xl z-50 animate-in slide-in-from-left duration-200">
        <div className="h-16 flex items-center px-4 border-b border-slate-100 dark:border-slate-700/60 justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shrink-0">
              <PortalIcon className="w-4 h-4" />
            </div>
            <div>
              <p className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">CareConnect</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">{portalSubtitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {facilityName && (
          <div className="p-3 mx-3 mt-3 rounded-xl bg-slate-50 dark:bg-slate-900 text-xs border border-slate-200/60 dark:border-slate-700/60">
            <p className="font-bold text-slate-800 dark:text-slate-200">{facilityName}</p>
          </div>
        )}

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon || Activity;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end !== undefined ? item.end : item.to === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors',
                    isActive
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                  )
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge !== undefined && item.badge !== null && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-700">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export default SharedMobileNav;
