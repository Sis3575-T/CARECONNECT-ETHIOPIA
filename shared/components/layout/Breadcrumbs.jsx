import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '../../utils/cn.js';

/**
 * CareConnect Ethiopia - Reusable Accessible Breadcrumbs
 */
export function Breadcrumbs({
  items,
  homePath = '/',
  homeLabel = 'Dashboard',
  className
}) {
  const location = useLocation();

  // If items not provided, parse path segments
  const breadcrumbItems = items || (() => {
    const segments = location.pathname.split('/').filter(Boolean);
    let currentPath = '';
    return segments.map((seg, idx) => {
      currentPath += `/${seg}`;
      const isLast = idx === segments.length - 1;
      const label = seg
        .replace(/-/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase());

      return {
        label,
        path: currentPath,
        isCurrent: isLast
      };
    });
  })();

  if (breadcrumbItems.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center text-xs text-slate-500 py-2', className)}>
      <ol className="flex items-center gap-1.5 flex-wrap">
        <li>
          <NavLink
            to={homePath}
            className="flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <Home className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only font-medium">{homeLabel}</span>
          </NavLink>
        </li>

        {breadcrumbItems.map((item, index) => (
          <li key={item.path || index} className="flex items-center gap-1.5">
            <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" aria-hidden="true" />
            {item.isCurrent ? (
              <span
                aria-current="page"
                className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-xs"
              >
                {item.label}
              </span>
            ) : (
              <NavLink
                to={item.path}
                className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors truncate max-w-xs"
              >
                {item.label}
              </NavLink>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default Breadcrumbs;
