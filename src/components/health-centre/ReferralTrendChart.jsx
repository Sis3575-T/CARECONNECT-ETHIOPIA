import React, { useState } from 'react';

export default function ReferralTrendChart() {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Data points matching the curve in screenshot
  // Months: Jan, Feb, Mar, Apr, May, Jun
  // y-axis range: 0 to 150
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  
  // Sent values (Blue line)
  const sentData = [48, 76, 68, 92, 82, 114];
  
  // Completed values (Green line)
  const completedData = [32, 54, 46, 58, 96, 88];

  // SVG coordinate calculations (width: 440, height: 160)
  const width = 440;
  const height = 150;
  const paddingX = 40;
  const paddingY = 20;
  const graphWidth = width - paddingX - 20;
  const graphHeight = height - paddingY - 30;

  const getX = (index) => paddingX + (index * (graphWidth / (months.length - 1)));
  const getY = (val) => height - 30 - ((val / 150) * graphHeight);

  // Generate smooth SVG bezier path
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

  const sentPath = createCurvedPath(sentData);
  const completedPath = createCurvedPath(completedData);

  return (
    <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between h-full">
      {/* Card Header & Legend */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-slate-800">
          Referral Trend
        </h3>

        {/* Legend matching screenshot: Sent (blue) / Completed (green) */}
        <div className="flex items-center gap-3 text-[11px] font-medium text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7]" />
            <span>Sent</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
            <span>Completed</span>
          </div>
        </div>
      </div>

      {/* Responsive SVG Chart */}
      <div className="relative w-full h-[155px]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          {/* Horizontal Grid lines (0, 50, 100, 150) */}
          {[0, 50, 100, 150].map((level) => {
            const y = getY(level);
            return (
              <g key={level}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - 15}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                  strokeDasharray={level === 0 ? 'none' : '3 3'}
                />
                <text
                  x={paddingX - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="text-[9.5px] fill-slate-400 font-medium"
                >
                  {level}
                </text>
              </g>
            );
          })}

          {/* Month labels on x-axis */}
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

          {/* Completed Line (Green) */}
          <path
            d={completedPath}
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Sent Line (Blue) */}
          <path
            d={sentPath}
            fill="none"
            stroke="#0284c7"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Data Points on curves */}
          {sentData.map((val, i) => (
            <circle
              key={`sent-${i}`}
              cx={getX(i)}
              cy={getY(val)}
              r="3.5"
              fill="#ffffff"
              stroke="#0284c7"
              strokeWidth="2"
              className="cursor-pointer transition-transform hover:scale-150"
              onMouseEnter={() => setHoveredPoint({ month: months[i], sent: val, completed: completedData[i] })}
              onMouseLeave={() => setHoveredPoint(null)}
            />
          ))}

          {completedData.map((val, i) => (
            <circle
              key={`comp-${i}`}
              cx={getX(i)}
              cy={getY(val)}
              r="3.5"
              fill="#ffffff"
              stroke="#10b981"
              strokeWidth="2"
              className="cursor-pointer transition-transform hover:scale-150"
              onMouseEnter={() => setHoveredPoint({ month: months[i], sent: sentData[i], completed: val })}
              onMouseLeave={() => setHoveredPoint(null)}
            />
          ))}
        </svg>

        {/* Hover Tooltip */}
        {hoveredPoint && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-[11px] px-2.5 py-1 rounded-md shadow pointer-events-none flex items-center gap-2">
            <span className="font-semibold">{hoveredPoint.month}:</span>
            <span className="text-sky-300">Sent: {hoveredPoint.sent}</span>
            <span className="text-emerald-300">Completed: {hoveredPoint.completed}</span>
          </div>
        )}
      </div>
    </div>
  );
}
