import React, { useState } from 'react';

export default function ReferralsBySourceDonut() {
  const [activeSegment, setActiveSegment] = useState(null);

  // Data matching screenshot:
  // Health Centers: 60% (Blue #0284c7)
  // Other Hospitals: 30% (Yellow #f59e0b)
  // Others: 10% (Light Blue #38bdf8)
  const segments = [
    { label: 'Health Centers', percentage: 60, color: '#0284c7', count: 216 },
    { label: 'Other Hospitals', percentage: 30, color: '#f59e0b', count: 108 },
    { label: 'Others', percentage: 10, color: '#38bdf8', count: 36 }
  ];

  // SVG donut calculation: radius 50, stroke width 18, circumference = 2 * PI * 50 ≈ 314.159
  const radius = 50;
  const circumference = 2 * Math.PI * radius;

  // Calculate stroke offsets
  let cumulativePercentage = 0;
  const renderedSegments = segments.map((seg) => {
    const strokeDasharray = `${(seg.percentage / 100) * circumference} ${circumference}`;
    // SVG stroke-dashoffset rotates counter-clockwise; offset by accumulated percentage
    const strokeDashoffset = -(cumulativePercentage / 100) * circumference;
    cumulativePercentage += seg.percentage;
    return {
      ...seg,
      strokeDasharray,
      strokeDashoffset
    };
  });

  return (
    <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between h-full">
      <h3 className="text-sm font-bold text-slate-800 mb-2">
        Referrals by Source
      </h3>

      <div className="flex items-center justify-between gap-4 my-auto">
        {/* SVG Donut Chart */}
        <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 140 140">
            {/* Background track circle */}
            <circle
              cx="70"
              cy="70"
              r={radius}
              stroke="#f1f5f9"
              strokeWidth="18"
              fill="transparent"
            />
            {/* Donut Segments */}
            {renderedSegments.map((seg, idx) => (
              <circle
                key={idx}
                cx="70"
                cy="70"
                r={radius}
                stroke={seg.color}
                strokeWidth={activeSegment === seg.label ? '22' : '18'}
                strokeDasharray={seg.strokeDasharray}
                strokeDashoffset={seg.strokeDashoffset}
                strokeLinecap="butt"
                fill="transparent"
                className="transition-all duration-200 cursor-pointer"
                onMouseEnter={() => setActiveSegment(seg.label)}
                onMouseLeave={() => setActiveSegment(null)}
              />
            ))}
          </svg>

          {/* Center Info Indicator */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-[11px] font-bold text-slate-700">
              {activeSegment ? segments.find(s => s.label === activeSegment)?.percentage + '%' : '360'}
            </span>
            <span className="text-[9px] text-slate-400 font-medium">
              {activeSegment || 'Total'}
            </span>
          </div>
        </div>

        {/* Legend matching screenshot */}
        <div className="flex flex-col gap-2.5 text-xs font-medium text-slate-700 pr-2">
          {segments.map((seg) => (
            <div
              key={seg.label}
              onMouseEnter={() => setActiveSegment(seg.label)}
              onMouseLeave={() => setActiveSegment(null)}
              className="flex items-center gap-2 cursor-pointer transition-transform hover:translate-x-1"
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: seg.color }}
              />
              <span className="text-slate-600 font-medium whitespace-nowrap">
                {seg.label}
              </span>
              <span className="font-bold text-slate-800 ml-auto pl-1">
                {seg.percentage}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
