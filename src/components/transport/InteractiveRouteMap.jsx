import React, { useState } from 'react';
import { MapPin, Navigation, Car, AlertCircle } from 'lucide-react';

export default function InteractiveRouteMap({ onOpenDispatch }) {
  const [isLiveActive, setIsLiveActive] = useState(true);

  return (
    <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between h-full relative overflow-hidden">
      <div className="flex items-center justify-between mb-2 z-10">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <h3 className="text-sm font-bold text-slate-800">
            Live Route Tracking
          </h3>
        </div>
        <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
          Addis Ababa
        </span>
      </div>

      {/* Stylized Vector Map representation */}
      <div className="relative w-full h-[155px] rounded-lg overflow-hidden bg-[#eef2f6] border border-slate-200/70">
        {/* Street grid patterns */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 340 155" preserveAspectRatio="none">
          {/* Street blocks */}
          <rect x="10" y="10" width="80" height="40" fill="#e2e8f0" opacity="0.4" rx="4" />
          <rect x="110" y="15" width="100" height="35" fill="#e2e8f0" opacity="0.4" rx="4" />
          <rect x="230" y="10" width="95" height="50" fill="#e2e8f0" opacity="0.4" rx="4" />
          <rect x="20" y="90" width="110" height="50" fill="#e2e8f0" opacity="0.4" rx="4" />
          <rect x="150" y="95" width="160" height="45" fill="#e2e8f0" opacity="0.4" rx="4" />

          {/* Secondary streets */}
          <line x1="0" y1="65" x2="340" y2="65" stroke="#cbd5e1" strokeWidth="3" />
          <line x1="100" y1="0" x2="100" y2="155" stroke="#cbd5e1" strokeWidth="2.5" />
          <line x1="220" y1="0" x2="220" y2="155" stroke="#cbd5e1" strokeWidth="2.5" />

          {/* Active Navigation Route Curve (Blue dashed/solid line matching screenshot) */}
          <path
            d="M 45 75 C 90 90, 160 80, 210 75 S 270 50, 295 45"
            fill="none"
            stroke="#0284c7"
            strokeWidth="3.5"
            strokeDasharray="5 3"
            strokeLinecap="round"
          />

          {/* Start Point Pin: Yeka HC */}
          <circle cx="45" cy="75" r="7" fill="#0284c7" />
          <circle cx="45" cy="75" r="3" fill="#ffffff" />

          {/* Destination Point Pin: Tikur Anbessa Hospital (Red pin) */}
          <circle cx="295" cy="45" r="7" fill="#ef4444" />
          <circle cx="295" cy="45" r="3" fill="#ffffff" />
        </svg>

        {/* Start Pin Tooltip */}
        <div className="absolute left-3 top-20 bg-slate-900/80 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded shadow pointer-events-none">
          Yeka HC
        </div>

        {/* Moving Ambulance / Car Icon on the route */}
        <div className="absolute left-[54%] top-[42%] -translate-x-1/2 -translate-y-1/2 z-20">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white shadow-lg flex items-center justify-center border-2 border-white ring-2 ring-sky-400">
              <Car className="w-4 h-4 text-sky-400" />
            </div>
            {/* Speed pulse */}
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white" />
          </div>
        </div>

        {/* Destination Tooltip */}
        <div className="absolute right-3 top-2 bg-slate-900/80 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded shadow pointer-events-none">
          Tikur Anbessa
        </div>

        {/* Bottom map overlay label matching screenshot */}
        <div className="absolute bottom-1.5 right-2 text-[10px] font-bold text-slate-500 bg-white/80 backdrop-blur-xs px-2 py-0.5 rounded">
          Addis Ababa
        </div>
      </div>
    </div>
  );
}
