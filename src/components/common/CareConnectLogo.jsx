import React from 'react';

export default function CareConnectLogo({ size = 'md', className = '' }) {
  const isSmall = size === 'sm';
  const isLarge = size === 'lg';

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Stylized CareConnect Medical Cross & Network Nodes */}
      <div className={`relative flex items-center justify-center rounded-full bg-gradient-to-tr from-[#0284c7] to-[#0ea5e9] shadow-sm text-white shrink-0 ${
        isSmall ? 'w-7 h-7' : isLarge ? 'w-10 h-10' : 'w-8 h-8'
      }`}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={isSmall ? 'w-4 h-4' : isLarge ? 'w-6 h-6' : 'w-5 h-5'}
        >
          {/* Medical cross with connected nodes */}
          <path d="M12 4v16" />
          <path d="M4 12h16" />
        </svg>
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#fed100] border border-white" />
        <span className="absolute -bottom-0.5 -left-0.5 w-1.5 h-1.5 rounded-full bg-[#009b48] border border-white" />
      </div>

      <div className="flex flex-col leading-none">
        <span className={`font-bold tracking-tight text-slate-900 ${
          isSmall ? 'text-sm' : isLarge ? 'text-lg' : 'text-[15px]'
        }`}>
          CareConnect
        </span>
        <span className={`font-medium tracking-wide text-slate-500 uppercase ${
          isSmall ? 'text-[9px]' : isLarge ? 'text-[11px]' : 'text-[10px]'
        }`}>
          Ethiopia
        </span>
      </div>
    </div>
  );
}
