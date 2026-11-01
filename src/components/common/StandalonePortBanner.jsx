import React from 'react';
import { ExternalLink, Radio, Server, Layers } from 'lucide-react';

export default function StandalonePortBanner({ currentPort, portalName, theme = 'sky' }) {
  const ports = [
    { port: '3000', label: 'Collage (All 4)', path: 'http://localhost:3000/' },
    { port: '3001', label: 'Health Centre', path: 'http://localhost:3001/' },
    { port: '3002', label: 'Hospital', path: 'http://localhost:3002/' },
    { port: '3003', label: 'Transport', path: 'http://localhost:3003/' },
    { port: '3004', label: 'System Admin', path: 'http://localhost:3004/' },
  ];

  return (
    <div className="bg-slate-900 text-white text-xs px-4 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-sm">
      <div className="flex items-center gap-2.5">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <div className="flex items-center gap-1.5 font-medium">
          <Server className="w-3.5 h-3.5 text-sky-400" />
          <span>Standalone Port Server:</span>
          <span className="font-mono bg-sky-950 text-sky-300 px-2 py-0.5 rounded font-bold border border-sky-800">
            :{currentPort}
          </span>
          <span className="text-slate-400 font-semibold">• {portalName}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
          Switch Port:
        </span>
        <div className="flex items-center gap-1">
          {ports.map((p) => {
            const isCurrent = p.port === currentPort;
            return (
              <a
                key={p.port}
                href={p.path}
                className={`text-[11px] px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                  isCurrent
                    ? 'bg-sky-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
                title={`Open ${p.label} on port ${p.port}`}
              >
                <span>:{p.port}</span>
                <span className="hidden md:inline text-[10px] opacity-75">{p.label}</span>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
