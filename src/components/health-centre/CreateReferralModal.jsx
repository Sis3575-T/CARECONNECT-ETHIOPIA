import React, { useState } from 'react';
import { X, Upload, Sparkles, CheckCircle2, AlertTriangle, FileText, ArrowRight, Building2, Send } from 'lucide-react';
import { INITIAL_FACILITIES } from '../../shared/mockData';

export default function CreateReferralModal({ isOpen, onClose, onSubmitReferral }) {
  const [step, setStep] = useState(1); // 1: Patient info & doc, 2: AI extraction & recommendation, 3: Confirm & Submit
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('Male');
  const [patientPhone, setPatientPhone] = useState('+251 9');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [selectedService, setSelectedService] = useState('Cardiology');
  const [selectedHospital, setSelectedHospital] = useState(INITIAL_FACILITIES[0].id);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [aiExtracted, setAiExtracted] = useState(false);

  if (!isOpen) return null;

  const handleSimulateOCR = () => {
    setIsProcessingAI(true);
    setTimeout(() => {
      setPatientName('Tadesse Mamo');
      setPatientAge('61');
      setPatientGender('Male');
      setPatientPhone('+251 91 144 2890');
      setSelectedService('Cardiology');
      setClinicalNotes('Patient presented with acute retrosternal chest tightness lasting 45 minutes, diaphoresis. BP 155/95 mmHg, Pulse 94 bpm. ECG reveals ST elevation in leads II, III, aVF. Primary diagnosis: Inferior STEMI. Immediate coronary intervention recommended.');
      setIsProcessingAI(false);
      setAiExtracted(true);
      setStep(2);
    }, 1200);
  };

  const handleProceed = () => {
    if (step === 1) {
      if (!patientName) {
        alert('Please enter patient name or simulate OCR upload');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else {
      // Submit
      const facility = INITIAL_FACILITIES.find(f => f.id === selectedHospital) || INITIAL_FACILITIES[0];
      const newReferral = {
        id: `REF-2025-${Math.floor(1000 + Math.random() * 9000)}`,
        patientName,
        age: patientAge || 45,
        gender: patientGender,
        service: selectedService,
        referringFacility: 'Yeka Health Centre',
        receivingFacility: facility.name,
        status: 'Pending',
        date: 'Today',
        urgency: 'High Priority (Urgent Review Flagged)',
        clinicalSummary: clinicalNotes || 'Referral submitted for specialized clinical evaluation.',
        aiScore: 97,
        completeness: '100% Complete'
      };

      if (onSubmitReferral) {
        onSubmitReferral(newReferral);
      }
      onClose();
      // Reset
      setStep(1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-sky-600 to-blue-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-sky-200" />
            <div>
              <h3 className="font-bold text-base">Create New Digital Referral</h3>
              <p className="text-xs text-sky-100">CareConnect Ethiopia Health Centre Module</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-2.5 flex items-center justify-between text-xs">
          <div className={`flex items-center gap-2 font-semibold ${step >= 1 ? 'text-sky-600' : 'text-slate-400'}`}>
            <span className="w-5 h-5 rounded-full bg-sky-100 flex items-center justify-center text-[11px]">1</span>
            <span>Patient Info & Document</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
          <div className={`flex items-center gap-2 font-semibold ${step >= 2 ? 'text-sky-600' : 'text-slate-400'}`}>
            <span className="w-5 h-5 rounded-full bg-sky-100 flex items-center justify-center text-[11px]">2</span>
            <span>AI Extraction & Recommendation</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
          <div className={`flex items-center gap-2 font-semibold ${step >= 3 ? 'text-sky-600' : 'text-slate-400'}`}>
            <span className="w-5 h-5 rounded-full bg-sky-100 flex items-center justify-center text-[11px]">3</span>
            <span>Confirm & Submit</span>
          </div>
        </div>

        {/* Body content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {step === 1 && (
            <div className="space-y-4">
              {/* OCR Document Upload Zone */}
              <div className="p-4 rounded-xl border-2 border-dashed border-sky-200 bg-sky-50/50 flex flex-col items-center justify-center text-center">
                <FileText className="w-8 h-8 text-sky-500 mb-2" />
                <h4 className="text-xs font-bold text-slate-700">Upload Handwritten / Paper Referral Document</h4>
                <p className="text-[11px] text-slate-500 max-w-sm mt-0.5">
                  CareConnect AI uses Tesseract OCR and NLP to extract patient details, clinical notes, and urgency flags.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSimulateOCR}
                    disabled={isProcessingAI}
                    className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-2 transition-all active:scale-95"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>{isProcessingAI ? 'Processing OCR with OpenCV & NLP...' : 'Simulate OCR Document Extraction'}</span>
                  </button>
                </div>
              </div>

              {/* Patient Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Patient Full Name *</label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="e.g. Tadesse Mamo"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Age</label>
                  <input
                    type="number"
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                    placeholder="61"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                  <select
                    value={patientGender}
                    onChange={(e) => setPatientGender(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Clinical Summary / Referral Reason</label>
                <textarea
                  rows={3}
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  placeholder="Enter clinical presentation, vital signs, physical exam findings and reason for referral..."
                  className="w-full text-xs p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {/* Completeness check & Urgency Badge */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold text-emerald-900">Completeness: 100%</p>
                    <p className="text-[10px] text-emerald-700">All required referral fields present</p>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <p className="font-bold text-amber-900">Clinical Review Priority</p>
                    <p className="text-[10px] text-amber-700">Inferior STEMI (High Priority)</p>
                  </div>
                </div>
              </div>

              {/* Service Classification */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  AI Classified Service Category
                </label>
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 font-semibold text-slate-800"
                >
                  <option value="Cardiology">Cardiology (Predicted 98% confidence)</option>
                  <option value="Obstetrics & Gynaecology">Obstetrics & Gynaecology</option>
                  <option value="Trauma & Orthopedics">Trauma & Orthopedics</option>
                  <option value="Neurosurgery">Neurosurgery</option>
                  <option value="Pediatrics">Pediatrics</option>
                </select>
              </div>

              {/* AI Recommended Hospitals */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                  <span>Ranked Receiving Hospital Recommendations (AI-06)</span>
                </label>
                <div className="space-y-2">
                  {INITIAL_FACILITIES.slice(0, 3).map((f, i) => (
                    <label
                      key={f.id}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedHospital === f.id
                          ? 'border-sky-500 bg-sky-50/70 ring-1 ring-sky-400'
                          : 'border-slate-100 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="hospital"
                          checked={selectedHospital === f.id}
                          onChange={() => setSelectedHospital(f.id)}
                          className="text-sky-600"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800">{f.name}</span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              {f.distanceKm} km away
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Available Beds: {f.availableBeds} • Workload: {f.workloadLevel}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-sky-700">
                        Rank #{i + 1}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3.5 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                <h4 className="font-bold text-slate-800 text-sm">Review Digital Referral Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-slate-600 pt-1">
                  <div><span className="font-semibold text-slate-700">Patient:</span> {patientName} ({patientAge} yo, {patientGender})</div>
                  <div><span className="font-semibold text-slate-700">Phone:</span> {patientPhone}</div>
                  <div><span className="font-semibold text-slate-700">Referring Unit:</span> Yeka Health Centre</div>
                  <div><span className="font-semibold text-slate-700">Target Facility:</span> {INITIAL_FACILITIES.find(f => f.id === selectedHospital)?.name}</div>
                  <div><span className="font-semibold text-slate-700">Specialty:</span> {selectedService}</div>
                  <div><span className="font-semibold text-slate-700">Transport:</span> Require Emergency Coordination</div>
                </div>
                <div className="pt-2 border-t border-slate-200">
                  <span className="font-semibold text-slate-700">Clinical Reason:</span>
                  <p className="text-slate-600 mt-1 italic">{clinicalNotes}</p>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 italic">
                By submitting, the receiving hospital triage team will be immediately notified through the CareConnect system.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={() => {
              if (step > 1) setStep(step - 1);
              else onClose();
            }}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          <button
            onClick={handleProceed}
            className="px-4 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
          >
            <span>{step === 3 ? 'Submit Referral' : 'Continue'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
