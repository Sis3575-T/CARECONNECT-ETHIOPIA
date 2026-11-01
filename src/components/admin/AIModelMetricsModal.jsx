import React from 'react';
import { X, Cpu, CheckCircle2, AlertCircle, BarChart3, ShieldCheck } from 'lucide-react';
import { AI_BENCHMARKS, INITIAL_ADMIN_STATS } from '../../shared/mockData';

export default function AIModelMetricsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-sky-300" />
            <div>
              <h3 className="font-bold text-base leading-tight">AI Model Performance & Audit (AI-17)</h3>
              <p className="text-xs text-blue-200">{INITIAL_ADMIN_STATS.modelVersion}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
              <span className="text-slate-400 font-medium">Global Accuracy</span>
              <p className="text-xl font-bold text-slate-800 mt-0.5">94.2%</p>
              <span className="text-[10px] text-emerald-600 font-semibold">+2.1% MoM</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
              <span className="text-slate-400 font-medium">Inference Latency</span>
              <p className="text-xl font-bold text-slate-800 mt-0.5">185 ms</p>
              <span className="text-[10px] text-sky-600 font-semibold">FastAPI Engine</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
              <span className="text-slate-400 font-medium">Monthly Inferences</span>
              <p className="text-xl font-bold text-slate-800 mt-0.5">48,920</p>
              <span className="text-[10px] text-purple-600 font-semibold">100% Audited</span>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider text-slate-400">
              Evaluated Model Subsystem Benchmarks
            </h4>
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
              {AI_BENCHMARKS.map((b, i) => (
                <div key={i} className="p-3 flex items-center justify-between hover:bg-slate-50">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="font-semibold text-slate-700">{b.metric}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900">{b.value}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                      {b.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-blue-50/70 border border-blue-200/70 rounded-xl text-blue-900 text-[11px] leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-blue-700 inline mr-1" />
            <span className="font-semibold">Compliant with Section 6.19:</span> All AI extractions and classifications require human healthcare worker validation. Retraining pipeline checks for regional bias across all Ethiopian zones.
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-semibold rounded-lg shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
