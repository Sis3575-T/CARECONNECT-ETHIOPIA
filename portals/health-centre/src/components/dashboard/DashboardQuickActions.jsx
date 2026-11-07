import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  UserPlus,
  Truck,
  Building2,
  Sparkles,
  RotateCw
} from 'lucide-react';
import { Button } from '@shared/components/ui/Button.jsx';

/**
 * DashboardQuickActions Component
 * Provides rapid clinical navigation and manual operational data refresh.
 */
export function DashboardQuickActions({
  onRefresh,
  refreshing = false
}) {
  const navigate = useNavigate();

  return (
    <div
      role="toolbar"
      aria-label="Dashboard quick actions"
      className="flex flex-wrap items-center gap-2"
    >
      {/* Primary Action: Create Referral */}
      <Button
        variant="primary"
        size="sm"
        onClick={() => navigate('/create-referral')}
        className="bg-sky-600 hover:bg-sky-700 text-white shadow-xs cursor-pointer active:scale-95 transition-transform"
      >
        <PlusCircle className="w-4 h-4 mr-1.5" />
        <span>Create Referral</span>
      </Button>

      {/* Register Patient */}
      <Button
        variant="secondary"
        size="sm"
        onClick={() => navigate('/patients')}
        className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 cursor-pointer shadow-xs"
      >
        <UserPlus className="w-3.5 h-3.5 mr-1.5 text-slate-500 dark:text-slate-400" />
        <span>Patients</span>
      </Button>

      {/* AI OCR Review */}
      <Button
        variant="secondary"
        size="sm"
        onClick={() => navigate('/ai-review')}
        className="hidden sm:inline-flex bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 cursor-pointer shadow-xs"
      >
        <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
        <span>AI Slip OCR</span>
      </Button>

      {/* Track Ambulance */}
      <Button
        variant="secondary"
        size="sm"
        onClick={() => navigate('/tracking')}
        className="hidden md:inline-flex bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 cursor-pointer shadow-xs"
      >
        <Truck className="w-3.5 h-3.5 mr-1.5 text-purple-500" />
        <span>Fleet Tracking</span>
      </Button>

      {/* Hospital Directory */}
      <Button
        variant="secondary"
        size="sm"
        onClick={() => navigate('/hospitals')}
        className="hidden lg:inline-flex bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 cursor-pointer shadow-xs"
      >
        <Building2 className="w-3.5 h-3.5 mr-1.5 text-sky-500" />
        <span>Hospital Beds</span>
      </Button>

      {/* Refresh Trigger */}
      {onRefresh && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Refresh operational metrics"
          className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
        >
          <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-sky-600' : ''}`} />
        </Button>
      )}
    </div>
  );
}

export default DashboardQuickActions;
