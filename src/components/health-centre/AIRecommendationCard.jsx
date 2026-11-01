import React from 'react';
import { Sparkles } from 'lucide-react';

export default function AIRecommendationCard({ onViewDetails }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-between h-full">
      {/* Top Header Badge */}
      <div>
        <div className="flex items-center gap-1.5 text-[#0284c7] font-bold text-xs">
          <Sparkles className="w-3.5 h-3.5 fill-[#0284c7]/20" />
          <span>AI Recommendation</span>
        </div>

        {/* Headline Description */}
        <p className="mt-2 text-[13px] sm:text-sm font-semibold text-slate-800 leading-snug max-w-[240px]">
          Referral to Tikur Anbessa Specialized Hospital <span className="font-normal text-slate-500">(for Cardiology)</span>
        </p>
      </div>

      {/* Button & Building Artwork */}
      <div className="mt-4 flex items-end justify-between">
        <button
          onClick={onViewDetails}
          className="bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg shadow-sm hover:shadow transition-all duration-150 active:scale-95 z-10"
        >
          View Details
        </button>

        {/* Hospital Building Illustration / Photo replica */}
        <div className="relative w-24 h-16 shrink-0 opacity-95">
          <div className="absolute inset-0 bg-gradient-to-t from-white/40 via-transparent to-transparent z-10 pointer-events-none" />
          <svg viewBox="0 0 120 80" className="w-full h-full object-contain drop-shadow-sm">
            {/* Sky background hint */}
            <rect width="120" height="80" rx="6" fill="#e0f2fe" />
            {/* Hospital main block */}
            <rect x="25" y="22" width="70" height="50" rx="3" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1" />
            {/* Hospital higher central tower */}
            <rect x="42" y="10" width="36" height="62" rx="2" fill="#ffffff" stroke="#64748b" strokeWidth="1.2" />
            {/* Red / Blue Cross Logo on top */}
            <circle cx="60" cy="18" r="5" fill="#ef4444" />
            <path d="M60 15v6M57 18h6" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
            {/* Windows grid on facade */}
            {[26, 34, 42, 50, 58].map((y) => (
              <g key={y}>
                <rect x="46" y={y} width="6" height="5" rx="1" fill="#0284c7" opacity="0.75" />
                <rect x="54" y={y} width="6" height="5" rx="1" fill="#0284c7" opacity="0.75" />
                <rect x="62" y={y} width="6" height="5" rx="1" fill="#0284c7" opacity="0.75" />
                <rect x="70" y={y} width="6" height="5" rx="1" fill="#0284c7" opacity="0.75" />
              </g>
            ))}
            {/* Wing windows */}
            {[28, 38, 48, 58].map((y) => (
              <g key={`w-${y}`}>
                <rect x="29" y={y} width="5" height="4" rx="1" fill="#38bdf8" opacity="0.6" />
                <rect x="36" y={y} width="5" height="4" rx="1" fill="#38bdf8" opacity="0.6" />
                <rect x="80" y={y} width="5" height="4" rx="1" fill="#38bdf8" opacity="0.6" />
                <rect x="87" y={y} width="5" height="4" rx="1" fill="#38bdf8" opacity="0.6" />
              </g>
            ))}
            {/* Entrance canopy */}
            <rect x="52" y="66" width="16" height="6" fill="#0369a1" rx="1" />
            {/* Green landscaping */}
            <path d="M10 74 Q 30 70 60 72 T 110 74 L 110 80 L 10 80 Z" fill="#22c55e" opacity="0.7" />
          </svg>
        </div>
      </div>
    </div>
  );
}
