import React from 'react';

export default function StatCard({
  icon: Icon,
  iconColor = 'blue', // blue, green, yellow, red, purple
  title,
  value,
  trend,
  className = ''
}) {
  const getIconStyles = () => {
    switch (iconColor) {
      case 'green':
        return 'bg-emerald-50 text-emerald-600 border border-emerald-100';
      case 'yellow':
        return 'bg-amber-50 text-amber-500 border border-amber-100';
      case 'red':
        return 'bg-rose-50 text-rose-500 border border-rose-100';
      case 'purple':
        return 'bg-violet-50 text-violet-600 border border-violet-100';
      case 'blue':
      default:
        return 'bg-sky-50 text-sky-600 border border-sky-100';
    }
  };

  return (
    <div className={`bg-white rounded-xl p-3.5 sm:p-4 border border-slate-100/90 shadow-sm flex items-center gap-3.5 hover:shadow-md transition-shadow ${className}`}>
      {/* Circular icon container */}
      <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${getIconStyles()}`}>
        {Icon && <Icon className="w-5 h-5" />}
      </div>

      <div className="flex flex-col min-w-0">
        <span className="text-[12px] font-medium text-slate-500 truncate leading-tight">
          {title}
        </span>
        <div className="flex items-baseline gap-2 mt-0.5">
          <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-tight">
            {value}
          </span>
          {trend && (
            <span className={`text-[11px] font-semibold ${
              trend.startsWith('+') || trend.startsWith('↑') ? 'text-emerald-600' : 'text-slate-400'
            }`}>
              {trend}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
