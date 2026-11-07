import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '../../utils/cn.js';

/**
 * CareConnect Ethiopia - Reusable Accessible Toast Notification
 */

const toastIcons = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info
};

const toastColors = {
  success: 'bg-emerald-600 text-white',
  error: 'bg-rose-600 text-white',
  warning: 'bg-amber-600 text-white',
  info: 'bg-sky-600 text-white'
};

export function Toast({
  id,
  type = 'info',
  title,
  message,
  duration = 4000,
  onClose,
  className
}) {
  const Icon = toastIcons[type] || toastIcons.info;

  useEffect(() => {
    if (!duration || !onClose) return;
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);
    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border border-white/10 select-none transition-all',
        toastColors[type] || toastColors.info,
        className
      )}
    >
      <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
      <div className="flex-1 text-xs">
        {title && <span className="font-bold block">{title}</span>}
        <span className="opacity-95">{message}</span>
      </div>

      {onClose && (
        <button
          type="button"
          onClick={() => onClose(id)}
          aria-label="Dismiss toast"
          className="p-1 rounded-md hover:bg-white/20 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export default Toast;
