import React from 'react';
import CareConnectLogo from '../common/CareConnectLogo';
import {
  Grid,
  Plus,
  Building2,
  Truck,
  Settings,
  Globe,
  Sparkles,
  ShieldAlert,
  Activity
} from 'lucide-react';
import { PORTAL_TYPES } from '../../shared/mockData';

export default function PortalNavigationHeader({
  activeView = PORTAL_TYPES.COLLAGE,
  onSelectView,
  language = 'en',
  onToggleLanguage
}) {
  const navTabs = [
    {
      id: PORTAL_TYPES.COLLAGE,
      label: '4-Portal Collage View (Original Spec)',
      icon: Grid,
      badge: '2x2 View',
      color: 'bg-slate-800'
    },
    {
      id: PORTAL_TYPES.HEALTH_CENTRE,
      label: 'Health Centre Portal',
      icon: Plus,
      badge: 'Dr. Alemayehu',
      color: 'bg-[#0284c7]'
    },
    {
      id: PORTAL_TYPES.HOSPITAL,
      label: 'Hospital Portal',
      icon: Building2,
      badge: 'Dr. Fitsum',
      color: 'bg-[#0f766e]'
    },
    {
      id: PORTAL_TYPES.TRANSPORT,
      label: 'Transport Coordinator Portal',
      icon: Truck,
      badge: 'Abebe Kebede',
      color: 'bg-[#4338ca]'
    },
    {
      id: PORTAL_TYPES.ADMIN,
      label: 'System Administrator Portal',
      icon: Settings,
      badge: 'Admin User',
      color: 'bg-[#1e3a8a]'
    }
  ];

  return (
    <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      {/* Top Banner with Ethiopian Flag Accent */}
      <div className="h-1 bg-gradient-to-r from-[#009b48] via-[#fed100] to-[#e4002b]" />

      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <CareConnectLogo size="md" />
          <div className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Federal Ministry of Health • Ethiopia
            </span>
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>AI System v1.0 Online</span>
            </span>
          </div>
        </div>

        {/* Portal Switcher Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl overflow-x-auto max-w-full">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeView === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onSelectView(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? `${tab.color} text-white shadow-sm`
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right actions: Language and Mode */}
        <div className="flex items-center gap-2">
          {/* Language Toggle */}
          <button
            onClick={onToggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-slate-500" />
            <span>{language === 'en' ? 'English' : 'አማርኛ (Amharic)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
