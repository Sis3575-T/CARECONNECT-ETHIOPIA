import React from 'react';
import { User, FileText, Building2, Paperclip, CheckCircle2 } from 'lucide-react';

export const REFERRAL_STEPS = [
  { id: 1, label: 'Patient Selection', icon: User, short: 'Patient' },
  { id: 2, label: 'Clinical Information', icon: FileText, short: 'Clinical' },
  { id: 3, label: 'Destination Hospital', icon: Building2, short: 'Destination' },
  { id: 4, label: 'Supporting Documents', icon: Paperclip, short: 'Documents' },
  { id: 5, label: 'Review & Submit', icon: CheckCircle2, short: 'Review' }
];

export function ReferralStepIndicator({ currentStep = 1, onStepClick, completedSteps = [] }) {
  return (
    <nav aria-label="Referral creation progress" className="w-full">
      <ol className="grid grid-cols-5 gap-2 sm:gap-4">
        {REFERRAL_STEPS.map((step) => {
          const isCurrent = step.id === currentStep;
          const isCompleted = completedSteps.includes(step.id) || step.id < currentStep;
          const isClickable = isCompleted || step.id <= currentStep;
          const Icon = step.icon;

          return (
            <li key={step.id} className="relative">
              <button
                type="button"
                onClick={() => isClickable && onStepClick && onStepClick(step.id)}
                disabled={!isClickable}
                aria-current={isCurrent ? 'step' : undefined}
                className={`w-full flex flex-col items-center p-2 sm:p-3 rounded-xl border text-center transition-all ${
                  isCurrent
                    ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 shadow-sm ring-1 ring-sky-500/20'
                    : isCompleted
                    ? 'border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer'
                    : 'border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-60'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center mb-1.5 transition-colors ${
                    isCurrent
                      ? 'bg-sky-600 text-white'
                      : isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}
                  aria-hidden="true"
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-wider block truncate max-w-full">
                  <span className="sm:hidden">{step.short}</span>
                  <span className="hidden sm:inline">{step.label}</span>
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 hidden md:block">
                  Step {step.id} of 5
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default ReferralStepIndicator;
