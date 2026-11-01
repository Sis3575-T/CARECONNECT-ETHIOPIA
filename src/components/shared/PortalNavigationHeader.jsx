import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import CareConnectLogo from '../common/CareConnectLogo';
import {
  Grid,
  Plus,
  Building2,
  Truck,
  Settings,
  Globe,
  Copy,
  Check
} from 'lucide-react';

export default function PortalNavigationHeader({
  language = 'en',
  onToggleLanguage
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [copiedUrl, setCopiedUrl] = React.useState(false);

  const navTabs = [
    {
      path: '/',
      label: '4-Portal Collage View',
      icon: Grid,
      badge: 'Collage',
      color: 'bg-slate-800'
    },
    {
      path: '/health-centre',
      label: 'Health Centre Portal',
      icon: Plus,
      badge: 'Dr. Alemayehu',
      color: 'bg-[#0284c7]'
    },
    {
      path: '/hospital',
      label: 'Hospital Portal',
      icon: Building2,
      badge: 'Dr. Fitsum',
      color: 'bg-[#0f766e]'
    },
    {
      path: '/transport',
      label: 'Transport Coordinator Portal',
      icon: Truck,
      badge: 'Abebe Kebede',
      color: 'bg-[#4338ca]'
    },
    {
      path: '/admin',
      label: 'System Administrator Portal',
      icon: Settings,
      badge: 'Admin User',
      color: 'bg-[#1e3a8a]'
    }
  ];

  const currentPath = location.pathname;
  const isCurrent = (p) => {
    if (p === '/') return currentPath === '/' || currentPath === '/collage';
    return currentPath === p;
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      {/* Top Banner with Ethiopian Flag Accent */}
      <div className="h-1 bg-gradient-to-r from-[#009b48] via-[#fed100] to-[#e4002b]" />

      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <Link to="/" className="cursor-pointer hover:opacity-95 transition-opacity">
            <CareConnectLogo size="md" />
          </Link>
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

        {/* Portal Switcher Buttons with Dedicated URLs */}
        <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl overflow-x-auto max-w-full">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const active = isCurrent(tab.path);

            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  active
                    ? `${tab.color} text-white shadow-sm`
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
                title={`Open ${tab.label} at ${tab.path}`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
                <span className={`text-[10px] font-mono px-1 py-0.2 rounded ${
                  active ? 'bg-white/20 text-white' : 'bg-slate-200/70 text-slate-500'
                }`}>
                  {tab.path}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right actions: Copy URL and Language */}
        <div className="flex items-center gap-2">
          {/* Share/Copy current portal URL */}
          <button
            onClick={handleCopyUrl}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
            title="Copy portal URL to clipboard"
          >
            {copiedUrl ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Copy Portal URL</span>
              </>
            )}
          </button>

          {/* Language Toggle */}
          <button
            onClick={onToggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-slate-500" />
            <span>{language === 'en' ? 'English' : 'አማርኛ'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
