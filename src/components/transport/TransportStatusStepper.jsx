import React, { useState } from 'react';
import { Check, Car, MapPin } from 'lucide-react';

export default function TransportStatusStepper() {
  const [currentStep, setCurrentStep] = useState(3); // 1: Request, 2: Assigned, 3: In Transit, 4: Arrived

  const steps = [
    { id: 1, label: 'Request', icon: Check, color: 'green' },
    { id: 2, label: 'Assigned', icon: Car, color: 'blue' },
    { id: 3, label: 'In Transit', icon: MapPin, color: 'blue' },
    { id: 4, label: 'Arrived', icon: Check, color: 'green' }
  ];

  return (
    <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-slate-800">
          Transport Status
        </h3>
        <span className="text-[11px] font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full">
          Active Dispatch
        </span>
      </div>

      {/* Stepper matching screenshot */}
      <div className="py-6 px-2 my-auto">
        <div className="relative flex items-center justify-between">
          {/* Background Connecting Line */}
          <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-[3px] bg-slate-100 z-0" />
          
          {/* Active Progress Line */}
          <div
            className="absolute left-6 top-1/2 -translate-y-1/2 h-[3px] bg-gradient-to-r from-emerald-500 via-sky-500 to-sky-600 z-0 transition-all duration-300"
            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          />

          {steps.map((step) => {
            const Icon = step.icon;
            const isCompleted = step.id < currentStep;
            const isCurrent = step.id === currentStep;

            return (
              <div
                key={step.id}
                onClick={() => setCurrentStep(step.id)}
                className="relative z-10 flex flex-col items-center cursor-pointer group"
              >
                {/* Node Circle */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  step.color === 'green'
                    ? 'bg-[#10b981] text-white shadow-sm ring-4 ring-emerald-50'
                    : 'bg-[#0284c7] text-white shadow-sm ring-4 ring-sky-50'
                } group-hover:scale-110`}>
                  <Icon className="w-4 h-4 stroke-[2.5]" />
                </div>

                {/* Step Label */}
                <span className={`text-[11px] font-medium mt-2 transition-colors ${
                  isCurrent ? 'text-slate-800 font-bold' : 'text-slate-500'
                }`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
