import React, { useState, useMemo } from 'react';
import {
  Cpu,
  CheckCircle2,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Activity,
  Layers,
  Search,
  Filter,
  ShieldAlert,
  Server,
  Zap
} from 'lucide-react';
import { useCareConnectData } from '@shared/hooks/useCareConnectData';

export default function AIManagementPage() {
  const { aiSubsystems, toggleAISubsystem } = useCareConnectData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Stats
  const activeCount = aiSubsystems.filter(s => s.enabled || s.status === 'Active' || s.status === 'Enabled').length;
  const totalCount = aiSubsystems.length;

  // Filtered
  const filtered = useMemo(() => {
    return aiSubsystems.filter(s => {
      const matchSearch =
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.engine && s.engine.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.description && s.description.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCategory = selectedCategory === 'All' || s.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [aiSubsystems, searchTerm, selectedCategory]);

  const handleToggle = async (id) => {
    await toggleAISubsystem(id);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            AI Subsystems & Feature Control (Section 9.H, AI-01 to AI-09)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Configure machine learning inference pipelines, OCR extractors, and recommendation engines
          </p>
        </div>
      </div>

      {/* Safety Notice */}
      <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200 flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <span className="font-bold">Human-in-the-Loop AI Governance:</span> In compliance with Ethiopian Ministry of Health clinical validation rules, all AI outputs (urgency classification, OCR fields, and hospital recommendations) serve as assistive suggestions and must be verified by licensed healthcare providers.
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <span className="text-slate-400 font-semibold block text-[11px]">Active AI Services</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{activeCount}</span>
              <span className="text-xs text-slate-400 font-mono">/ {totalCount} deployed</span>
            </div>
            <span className="text-[10px] text-emerald-600 font-bold block mt-1">High Availability</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <span className="text-slate-400 font-semibold block text-[11px]">Mean Latency</span>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">140 ms</p>
            <span className="text-[10px] text-emerald-600 font-bold block mt-1">FastAPI Backend</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100 dark:border-purple-900">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <span className="text-slate-400 font-semibold block text-[11px]">Model Framework</span>
            <p className="text-base font-bold text-slate-900 dark:text-white mt-1">PyTorch / Transformers</p>
            <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">HuggingFace + Tesseract</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center shrink-0 border border-sky-100 dark:border-sky-900">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <span className="text-slate-400 font-semibold block text-[11px]">Bilingual Support</span>
            <p className="text-base font-bold text-slate-900 dark:text-white mt-1">Amharic & English</p>
            <span className="text-[10px] text-sky-600 font-bold mt-0.5 block">AI-09 Assistant Enabled</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search AI subsystem by name, engine, or version..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full md:w-auto">
          <span className="text-slate-400">Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold"
          >
            <option value="All">All Categories</option>
            <option value="Computer Vision">Computer Vision (OCR)</option>
            <option value="NLP">Natural Language Processing</option>
            <option value="Classification">Urgency Classification</option>
            <option value="Optimization">Routing & Dispatch</option>
            <option value="Predictive Analytics">Bed Forecasting</option>
            <option value="Conversational AI">Bilingual Assistant</option>
          </select>
        </div>
      </div>

      {/* AI Subsystems Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((sub) => {
          const isEnabled = sub.enabled || sub.status === 'Active' || sub.status === 'Enabled';

          return (
            <div
              key={sub.id}
              className={`bg-white dark:bg-slate-800 p-5 rounded-3xl border transition-all shadow-xs flex flex-col justify-between space-y-4 ${
                isEnabled
                  ? 'border-slate-200/80 dark:border-slate-700 hover:border-slate-300'
                  : 'border-slate-200/50 dark:border-slate-800 opacity-70 bg-slate-50/50 dark:bg-slate-800/50'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                      {sub.id} • {sub.version || 'v2.1'}
                    </span>
                    <h4 className="font-bold text-slate-900 dark:text-white text-base mt-1.5">{sub.name}</h4>
                    <p className="text-[11px] text-slate-400 font-medium">Engine: {sub.engine || 'FastAPI Microservice'}</p>
                  </div>
                  <button
                    onClick={() => handleToggle(sub.id)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 ${
                      isEnabled
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {isEnabled ? <ToggleRight className="w-4 h-4 text-emerald-600" /> : <ToggleLeft className="w-4 h-4" />}
                    <span>{isEnabled ? 'Enabled' : 'Disabled'}</span>
                  </button>
                </div>

                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-xs mt-3">
                  {sub.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between font-mono text-[11px]">
                <span>
                  Accuracy: <strong className="text-blue-700 dark:text-blue-400 font-bold">{sub.accuracy || '94.2%'}</strong>
                </span>
                <span>
                  Latency: <strong className="text-slate-700 dark:text-slate-300 font-bold">{sub.latency || '120ms'}</strong>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}