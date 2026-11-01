import React from 'react';
import { Sparkles, ArrowUpRight } from 'lucide-react';

export default function AIPerformanceCard({ onOpenDetails }) {
  return (
    <div
      onClick={onOpenDetails}
      className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between h-full relative overflow-hidden cursor-pointer group hover:border-sky-300 transition-all"
    >
      {/* Top Header */}
      <div>
        <div className="flex items-center gap-1.5 text-[#0284c7] font-bold text-xs">
          <Sparkles className="w-3.5 h-3.5 fill-[#0284c7]/20" />
          <span>AI Performance</span>
        </div>
      </div>

      {/* Main Stats and Brain Graphic */}
      <div className="my-auto flex items-center justify-between">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
              94%
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Prediction Accuracy
          </p>
          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-1">
            <span>↑ 2%</span>
            <span className="font-normal text-slate-400">vs last month</span>
          </div>
        </div>

        {/* Glowing Stylized AI Brain Vector matching screenshot */}
        <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
          {/* Subtle radial glow */}
          <div className="absolute inset-0 bg-sky-400/15 rounded-full blur-xl group-hover:bg-sky-400/25 transition-all" />

          <svg
            viewBox="0 0 100 100"
            className="w-full h-full relative z-10 drop-shadow-[0_4px_12px_rgba(2,132,199,0.25)]"
          >
            {/* Left Brain Hemisphere */}
            <path
              d="M 47 20 C 35 20, 22 28, 20 42 C 18 52, 22 60, 26 66 C 30 72, 36 78, 47 80 Z"
              fill="#38bdf8"
              opacity="0.9"
            />
            {/* Right Brain Hemisphere */}
            <path
              d="M 53 20 C 65 20, 78 28, 80 42 C 82 52, 78 60, 74 66 C 70 72, 64 78, 53 80 Z"
              fill="#0284c7"
              opacity="0.95"
            />

            {/* Neural Lobes & Sulci Patterns */}
            <path
              d="M 28 36 Q 38 32, 47 40"
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
              opacity="0.8"
            />
            <path
              d="M 24 50 Q 36 48, 47 56"
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
              opacity="0.8"
            />
            <path
              d="M 28 66 Q 38 64, 47 70"
              stroke="#ffffff"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
              opacity="0.8"
            />

            {/* Right hemisphere lobes */}
            <path
              d="M 72 36 Q 62 32, 53 40"
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
              opacity="0.8"
            />
            <path
              d="M 76 50 Q 64 48, 53 56"
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
              opacity="0.8"
            />
            <path
              d="M 72 66 Q 62 64, 53 70"
              stroke="#ffffff"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
              opacity="0.8"
            />

            {/* Connecting central synapse cleft */}
            <line x1="50" y1="22" x2="50" y2="78" stroke="#ffffff" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" />

            {/* Synaptic nodes */}
            <circle cx="34" cy="35" r="2.5" fill="#ffffff" />
            <circle cx="66" cy="35" r="2.5" fill="#ffffff" />
            <circle cx="38" cy="52" r="2.5" fill="#ffffff" />
            <circle cx="62" cy="52" r="2.5" fill="#ffffff" />
            <circle cx="42" cy="68" r="2" fill="#ffffff" />
            <circle cx="58" cy="68" r="2" fill="#ffffff" />
          </svg>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-50 text-[11px] text-slate-500">
        <span>CareConnect AI v2.4</span>
        <span className="text-[#0284c7] font-semibold group-hover:underline flex items-center">
          Model Metrics &rarr;
        </span>
      </div>
    </div>
  );
}
