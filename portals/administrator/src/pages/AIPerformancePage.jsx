import React, { useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  Cpu,
  ShieldCheck,
  Sparkles,
  Layers,
  Sliders,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { useCareConnectData } from '@shared/hooks/useCareConnectData';

export default function AIPerformancePage() {
  const { aiBenchmarks } = useCareConnectData();
  const [confidenceThreshold, setConfidenceThreshold] = useState(85);

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-xs">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          AI Model Performance & Evaluation Metrics (Section 9.H, AI-17)
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Rigorous model evaluation benchmarks, OCR precision, and clinical entity validation reports
        </p>
      </div>

      {/* Top 3 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <span className="text-slate-400 font-semibold block text-[11px]">Model Global Accuracy</span>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">94.2%</p>
          <span className="text-emerald-600 font-bold block mt-1">✓ +2.1% over baseline heuristic triage</span>
        </div>
        <div className="p-5 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <span className="text-slate-400 font-semibold block text-[11px]">Inference Response Latency</span>
          <p className="text-3xl font-black text-blue-600 dark:text-blue-400 mt-1">185 ms</p>
          <span className="text-slate-500 font-medium block mt-1">FastAPI Microservice Engine (p95 &lt; 250ms)</span>
        </div>
        <div className="p-5 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <span className="text-slate-400 font-semibold block text-[11px]">Validation Test Slips</span>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">4,200</p>
          <span className="text-slate-500 font-medium block mt-1">Verified Ethiopian health centre referrals</span>
        </div>
      </div>

      {/* Benchmarks Table */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Evaluated Subsystem Metrics</h3>
            <p className="text-slate-400 text-xs mt-0.5">Empirical precision, recall, and F1 benchmarks across core referral tasks</p>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
            Clinical Grade Verified
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-700 border border-slate-100 dark:border-slate-700 rounded-2xl overflow-hidden">
          {aiBenchmarks.map((b, i) => (
            <div key={i} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">{b.metric}</span>
                  {b.dataset && <span className="text-[10px] text-slate-400">Dataset: {b.dataset}</span>}
                </div>
              </div>
              <div className="flex items-center gap-3 self-end sm:self-auto">
                <span className="font-black text-slate-900 dark:text-white font-mono text-sm">{b.value}</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900">
                  {b.status || 'Verified'}
                </span>
              </div>
            </div>
          ))}

          {/* Explicit unbenchmarked models per Section 9.H */}
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors bg-slate-50/30 dark:bg-slate-900/30">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="font-bold text-slate-600 dark:text-slate-300 block text-xs">
                  Hospital Workload Demand Time-Series (AI-08)
                </span>
                <span className="text-[10px] text-slate-400">Time-series forecasting model for seasonal bed surge</span>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 self-end sm:self-auto">
              Not evaluated yet (Requires 12-month baseline data)
            </span>
          </div>

          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors bg-slate-50/30 dark:bg-slate-900/30">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="font-bold text-slate-600 dark:text-slate-300 block text-xs">
                  Cross-Border Patient Flow Predictor
                </span>
                <span className="text-[10px] text-slate-400">Inter-regional patient movement prediction across state borders</span>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 self-end sm:self-auto">
              Not evaluated yet (Under MoH Ethics Review)
            </span>
          </div>
        </div>
      </div>

      {/* Confidence Threshold Configuration Preview */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-blue-600" />
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">
            AI Assistive Confidence Threshold Governance
          </h3>
        </div>
        <p className="text-slate-500 text-xs leading-relaxed">
          Determines the minimum confidence score required before the AI recommendation is highlighted to the referring clinician. Suggestions below this threshold trigger a mandatory manual verification flag.
        </p>

        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl space-y-3">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-700 dark:text-slate-300">Minimum Suggestion Confidence:</span>
            <span className="font-mono text-blue-600 dark:text-blue-400 text-sm">{confidenceThreshold}%</span>
          </div>
          <input
            type="range"
            min="60"
            max="95"
            step="5"
            value={confidenceThreshold}
            onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
            className="w-full accent-[#1e3a8a] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>60% (More Permissive)</span>
            <span>85% (Recommended MoH Standard)</span>
            <span>95% (Strict High Precision)</span>
          </div>
        </div>
      </div>
    </div>
  );
}