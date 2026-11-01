import React, { useState } from 'react';

export default function PlatformAnalyticsChart() {
  const [hoveredMonth, setHoveredMonth] = useState(null);

  // Months matching screenshot: Jan, Feb, Mar, Apr, May, Jun
  // Y-axis range: 0, 500, 1K, 1.5K (1500)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

  // Referrals (Blue line)
  const referralsData = [700, 920, 800, 1020, 950, 1150];

  // Transport (Green line)
  const transportData = [550, 750, 680, 850, 1050, 950];

  // Admissions (Purple line)
  const admissionsData = [350, 480, 420, 520, 500, 650];

  const width = 440;
  const height = 150;
  const paddingX = 40;
  const paddingY = 20;
  const graphWidth = width - paddingX - 20;
  const graphHeight = height - paddingY - 30;

  const getX = (index) => paddingX + (index * (graphWidth / (months.length - 1)));
  const getY = (val) => height - 30 - ((val / 1500) * graphHeight);

  // Smooth SVG Bezier curves
  const createCurvedPath = (data) => {
    return data.reduce((acc, val, i, arr) => {
      const x = getX(i);
      const y = getY(val);
      if (i === 0) return `M ${x} ${y}`;
      const prevX = getX(i - 1);
      const prevY = getY(arr[i - 1]);
      const cp1x = prevX + (x - prevX) / 2;
      const cp1y = prevY;
      const cp2x = prevX + (x - prevX) / 2;
      const cp2y = y;
      return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x} ${y}`;
    }, '');
  };

  const referralsPath = createCurvedPath(referralsData);
  const transportPath = createCurvedPath(transportData);
  const admissionsPath = createCurvedPath(admissionsData);

  return (
    <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between h-full">
      {/* Header and Legend */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-slate-800">
          Platform Analytics
        </h3>

        {/* Legend matching screenshot: Referrals (blue), Transport (green), Admissions (purple) */}
        <div className="flex items-center gap-2.5 text-[10.5px] font-medium text-slate-600">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#0284c7]" />
            <span>Referrals</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#10b981]" />
            <span>Transport</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#8b5cf6]" />
            <span>Admissions</span>
          </div>
        </div>
      </div>

      {/* SVG Multi-Line Chart */}
      <div className="relative w-full h-[155px]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          {/* Y-axis grid levels (0, 500, 1K, 1.5K) */}
          {[
            { val: 0, label: '0' },
            { val: 500, label: '500' },
            { val: 1000, label: '1K' },
            { val: 1500, label: '1.5K' }
          ].map((item) => {
            const y = getY(item.val);
            return (
              <g key={item.val}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - 15}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                  strokeDasharray={item.val === 0 ? 'none' : '3 3'}
                />
                <text
                  x={paddingX - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="text-[9.5px] fill-slate-400 font-medium"
                >
                  {item.label}
                </text>
              </g>
            );
          })}

          {/* Month labels */}
          {months.map((m, i) => (
            <text
              key={m}
              x={getX(i)}
              y={height - 8}
              textAnchor="middle"
              className="text-[10px] fill-slate-400 font-medium"
            >
              {m}
            </text>
          ))}

          {/* Admissions Curve (Purple) */}
          <path
            d={admissionsPath}
            fill="none"
            stroke="#8b5cf6"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Transport Curve (Green) */}
          <path
            d={transportPath}
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Referrals Curve (Blue) */}
          <path
            d={referralsPath}
            fill="none"
            stroke="#0284c7"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Points */}
          {referralsData.map((val, i) => (
            <circle
              key={`ref-${i}`}
              cx={getX(i)}
              cy={getY(val)}
              r="3.5"
              fill="#ffffff"
              stroke="#0284c7"
              strokeWidth="2"
              className="cursor-pointer hover:scale-150 transition-transform"
              onMouseEnter={() => setHoveredMonth({ month: months[i], referrals: val, transport: transportData[i], admissions: admissionsData[i] })}
              onMouseLeave={() => setHoveredMonth(null)}
            />
          ))}

          {transportData.map((val, i) => (
            <circle
              key={`tr-${i}`}
              cx={getX(i)}
              cy={getY(val)}
              r="3.5"
              fill="#ffffff"
              stroke="#10b981"
              strokeWidth="2"
              className="cursor-pointer hover:scale-150 transition-transform"
              onMouseEnter={() => setHoveredMonth({ month: months[i], referrals: referralsData[i], transport: val, admissions: admissionsData[i] })}
              onMouseLeave={() => setHoveredMonth(null)}
            />
          ))}

          {admissionsData.map((val, i) => (
            <circle
              key={`adm-${i}`}
              cx={getX(i)}
              cy={getY(val)}
              r="3.5"
              fill="#ffffff"
              stroke="#8b5cf6"
              strokeWidth="2"
              className="cursor-pointer hover:scale-150 transition-transform"
              onMouseEnter={() => setHoveredMonth({ month: months[i], referrals: referralsData[i], transport: transportData[i], admissions: val })}
              onMouseLeave={() => setHoveredMonth(null)}
            />
          ))}
        </svg>

        {/* Hover Tooltip */}
        {hoveredMonth && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-[11px] px-3 py-1.5 rounded-md shadow pointer-events-none flex items-center gap-2.5">
            <span className="font-semibold">{hoveredMonth.month}:</span>
            <span className="text-sky-300">Ref: {hoveredMonth.referrals}</span>
            <span className="text-emerald-300">Trans: {hoveredMonth.transport}</span>
            <span className="text-purple-300">Adm: {hoveredMonth.admissions}</span>
          </div>
        )}
      </div>
    </div>
  );
}
