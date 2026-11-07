import React from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import { cn } from '../../utils/cn.js';

/**
 * CareConnect Ethiopia - Reusable Portal-Aware Sidebar
 * Renders portal brand banner, responsive navigation links with active indicators,
 * badge counters, and collapsible state.
 */

const portalAccents = {
  sky: {
    bg: 'from-[#0284c7] to-[#0ea5e9]',
    activeBg: 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    indicator: 'bg-sky-500'
  },
  emerald: {
    bg: 'from-[#059669] to-[#10b981]',
    activeBg: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    indicator: 'bg-emerald-500'
  },
  purple: {
    bg: 'from-[#7c3aed] to-[#a855f7]',
    activeBg: 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    indicator: 'bg-purple-500'
  },
  navy: {
    bg: 'from-[#0f172a] to-[#334155]',
    activeBg: 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600',
    indicator: 'bg-slate-600'
  }
};

export function SharedSidebar({
  portalName = 'CareConnect',
  portalSubtitle = 'Portal',
  portalAccent = 'emerald', // emerald, sky, purple, navy
  portalIcon: PortalIcon = Activity,
  navItems = [],
  isCollapsed = false,
  onToggleCollapse,
  facilityName,
  facilityRegion,
  className
}) {
  const accent = portalAccents[portalAccent] || portalAccents.emerald;

  return (
    <aside
      className={cn(
        'bg-white dark:bg-slate-800 border-r border-slate-200/80 dark:border-slate-700/80',
        'hidden lg:flex flex-col z-30 transition-all duration-200 select-none shrink-0',
        isCollapsed ? 'w-20' : 'w-64',
        className
      )}
      aria-label="Portal Navigation Sidebar"
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center px-4 border-b border-slate-100 dark:border-slate-700/60 justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <div
            className={cn(
              'w-9 h-9 rounded-xl bg-gradient-to-tr flex items-center justify-center text-white shrink-0 shadow-sm',
              accent.bg
            )}
            aria-hidden="true"
          >
            <PortalIcon className="w-5 h-5 stroke-[2.25]" />
          </div>

          {!isCollapsed && (
            <div className="flex flex-col truncate">
              <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white leading-tight truncate">
                CareConnect
              </span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                {portalSubtitle}
              </span>
            </div>
          )}
        </div>

        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors focus:outline-none"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Facility pill if expanded */}
      {!isCollapsed && facilityName && (
        <div className="mx-3 mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{facilityName}</span>
            <span className="text-[9px] bg-emerald-500 text-white font-extrabold px-1.5 py-0.5 rounded shrink-0">Active</span>
          </div>
          {facilityRegion && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">{facilityRegion}</p>
          )}
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-2.5 space-y-1 overflow-y-auto" aria-label="Portal Navigation Links">
        {navItems.map((item) => {
          const Icon = item.icon || Activity;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end !== undefined ? item.end : item.to === '/'}
              title={isCollapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 relative group',
                  isActive
                    ? cn('border font-bold shadow-xs', accent.activeBg)
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-transparent'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn('w-4 h-4 shrink-0 transition-colors', isActive && accent.indicator)} aria-hidden="true" />

                  {!isCollapsed && (
                    <span className="truncate flex-1">{item.label}</span>
                  )}

                  {!isCollapsed && item.badge !== undefined && item.badge !== null && (
                    <span
                      className={cn(
                        'px-1.5 py-0.5 rounded-full text-[10px] font-extrabold shrink-0',
                        typeof item.badge === 'number' && item.badge > 0
                          ? 'bg-rose-500 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-700/60 text-[10px] text-slate-400 dark:text-slate-500 text-center">
        {!isCollapsed ? (
          <span>CareConnect Ethiopia v1.0 • MOH</span>
        ) : (
          <span>v1.0</span>
        )}
      </div>
    </aside>
  );
}

export default SharedSidebar;
