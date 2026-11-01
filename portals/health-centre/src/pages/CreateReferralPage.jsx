import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Send,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Building2,
  FileText,
  ArrowRight,
  Save,
  Check,
  Eye,
  X,
  HeartPulse,
  Ambulance,
  Calendar,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { useCareConnectData } from '@shared/hooks/useCareConnectData';

export default function CreateReferralPage() {
  const navigate = useNavigate();
  const { patients, facilities, createReferral } = useCareConnectData();

  // Selected patient
  const [selectedPatientId, setSelectedPatientId] = useState(patients[0]?.id || '');
  
  // Section 2: Referring facility
  const [referringFacility, setReferringFacility] = useState('Yeka Health Centre');
  const [referringDoctor, setReferringDoctor] = useState('Dr. Alemayehu Bekele');
  const [referringPhone, setReferringPhone] = useState('+251 91 144 2890');

  // Section 3: Receiving service
  const [serviceCategory, setServiceCategory] = useState('Cardiology');
  const [selectedHospitalId, setSelectedHospitalId] = useState(facilities[0]?.id || '');

  // Section 4 & 5: Reason & Clinical info
  const [referralReason, setReferralReason] = useState('Acute coronary syndrome evaluation');
  const [clinicalSummary, setClinicalSummary] = useState(
    'Patient presented with acute retrosternal chest pain radiating to left shoulder for >2 hrs. Elevated cardiac enzymes suspected. Initial ECG showing ST depression in leads V4-V6.'
  );
  const [vitals, setVitals] = useState({
    bp: '160/95',
    hr: '92',
    temp: '37.0',
    rr: '22',
    spo2: '94%'
  });

  // Section 6: Priority
  const [priorityReview, setPriorityReview] = useState('Emergency');

  // Section 7: Document upload
  const [documentName, setDocumentName] = useState('referral_note_scan_841.jpg');
  const [documentSize, setDocumentSize] = useState('1.4 MB');
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrSuccess, setOcrSuccess] = useState(false);

  // Section 8: Transport & notes
  const [transportRequired, setTransportRequired] = useState(true);
  const [additionalNotes, setAdditionalNotes] = useState('Requires ambulance with continuous cardiac monitoring and supplemental oxygen.');

  // UI state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveDraftMessage, setSaveDraftMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (patients.length > 0 && !selectedPatientId) {
      setSelectedPatientId(patients[0].id);
    }
    if (facilities.length > 0 && !selectedHospitalId) {
      setSelectedHospitalId(facilities[0].id);
    }
  }, [patients, facilities]);

  // Check if draft exists
  useEffect(() => {
    const savedDraft = localStorage.getItem('careconnect_referral_draft');
    if (savedDraft) {
      try {
        const d = JSON.parse(savedDraft);
        if (d.clinicalSummary) setClinicalSummary(d.clinicalSummary);
        if (d.referralReason) setReferralReason(d.referralReason);
        if (d.serviceCategory) setServiceCategory(d.serviceCategory);
        if (d.vitals) setVitals(d.vitals);
      } catch {}
    }
  }, []);

  const selectedPatient = patients.find(p => p.id === selectedPatientId) || patients[0] || {
    id: 'PAT-ET-8401',
    name: 'Kebede Alemu',
    age: 54,
    gender: 'Male',
    phone: '+251 91 144 2890'
  };

  const selectedHospital = facilities.find(f => f.id === selectedHospitalId) || facilities[0] || {
    id: 'fac-01',
    name: 'Tikur Anbessa Specialized Hospital (Black Lion)',
    distanceKmFromCenter: 8.4,
    availableBeds: 42
  };

  const handleSimulateOCR = () => {
    setIsOcrProcessing(true);
    setTimeout(() => {
      setIsOcrProcessing(false);
      setOcrSuccess(true);
      setClinicalSummary('Extracted via CareConnect Tesseract OCR: 54yo Male with sudden onset acute angina pectoris lasting >40 mins. Vitals: BP 160/95 mmHg, HR 92 bpm, SpO2 94%. Initial ECG shows acute ischemic changes.');
      setVitals({ bp: '160/95', hr: '92', temp: '37.0', rr: '22', spo2: '94%' });
    }, 1200);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setDocumentName(file.name);
      setDocumentSize(`${(file.size / (1024 * 1024)).toFixed(1)} MB`);
      handleSimulateOCR();
    }
  };

  const handleSaveDraft = () => {
    const draft = {
      selectedPatientId,
      serviceCategory,
      selectedHospitalId,
      referralReason,
      clinicalSummary,
      vitals,
      priorityReview,
      transportRequired,
      additionalNotes
    };
    localStorage.setItem('careconnect_referral_draft', JSON.stringify(draft));
    setSaveDraftMessage('Referral draft saved to persistent storage!');
    setTimeout(() => setSaveDraftMessage(''), 3000);
  };

  const validate = () => {
    const errs = {};
    if (!selectedPatientId) errs.patient = 'Please select a patient';
    if (!referralReason.trim()) errs.reason = 'Referral reason is required';
    if (!clinicalSummary.trim()) errs.summary = 'Clinical summary cannot be empty';
    if (!vitals.bp) errs.bp = 'Blood pressure is required';
    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!validate()) {
      alert('Please complete all required fields before submitting.');
      return;
    }

    setIsSubmitting(true);
    const newRef = {
      patientId: selectedPatient.id,
      patientName: selectedPatient.name,
      age: selectedPatient.age,
      gender: selectedPatient.gender,
      service: serviceCategory,
      referringFacility,
      referringDoctor,
      referringPhone,
      receivingFacility: selectedHospital.name,
      urgency: priorityReview,
      clinicalSummary: `${referralReason}. ${clinicalSummary}`,
      vitals,
      transportRequired,
      notes: additionalNotes,
      aiScore: 97
    };

    await createReferral(newRef);
    localStorage.removeItem('careconnect_referral_draft');
    setIsSubmitting(false);
    navigate('/referrals');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Create Digital Clinical Referral</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Standard Ethiopian MoH 8-section inter-facility referral and triage protocol
          </p>
        </div>

        <div className="flex items-center gap-2">
          {saveDraftMessage && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold animate-pulse">
              {saveDraftMessage}
            </span>
          )}
          <button
            type="button"
            onClick={handleSaveDraft}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Draft</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (validate()) setIsPreviewOpen(true);
              else alert('Please address form validation errors before previewing.');
            }}
            className="px-3.5 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview Referral</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 text-xs">
        {/* Section 1: Patient Information */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-3">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-400 flex items-center justify-center text-[10px] font-bold">1</span>
            <span>Patient Information</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Select Patient *</label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white font-bold"
              >
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.id} • {p.age}yo {p.gender} • Blood {p.bloodType})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Phone</label>
              <input
                type="text"
                readOnly
                value={selectedPatient.phone || ''}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900/60 text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Referring Facility */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-3">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-400 flex items-center justify-center text-[10px] font-bold">2</span>
            <span>Referring Facility & Clinician</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Origin Facility</label>
              <input
                type="text"
                value={referringFacility}
                onChange={(e) => setReferringFacility(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white font-semibold"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Referring Clinician</label>
              <input
                type="text"
                value={referringDoctor}
                onChange={(e) => setReferringDoctor(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white font-semibold"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Official Contact</label>
              <input
                type="text"
                value={referringPhone}
                onChange={(e) => setReferringPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Required Receiving Service */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-3">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-400 flex items-center justify-center text-[10px] font-bold">3</span>
            <span>Required Receiving Service & Specialty</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Specialty Service</label>
              <select
                value={serviceCategory}
                onChange={(e) => setServiceCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white font-bold"
              >
                <option value="Cardiology">Cardiology</option>
                <option value="Obstetrics & Gynaecology">Obstetrics & Gynaecology</option>
                <option value="Trauma & Orthopedics">Trauma & Orthopedics</option>
                <option value="General Surgery">General Surgery</option>
                <option value="Neurosurgery">Neurosurgery</option>
                <option value="Pediatrics & Child Health">Pediatrics & Child Health</option>
                <option value="Oncology">Oncology</option>
                <option value="Nephrology & Dialysis">Nephrology & Dialysis</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Primary Referral Reason *</label>
              <input
                type="text"
                required
                value={referralReason}
                onChange={(e) => setReferralReason(e.target.value)}
                placeholder="e.g. Acute coronary syndrome / STEMI evaluation"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Section 4 & 5: Relevant Clinical Information & Vitals */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-3">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-400 flex items-center justify-center text-[10px] font-bold">4 & 5</span>
            <span>Clinical Findings & Vital Signs</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div>
              <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-400 text-[11px]">BP (mmHg) *</label>
              <input
                type="text"
                value={vitals.bp}
                onChange={(e) => setVitals({ ...vitals, bp: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-400 text-[11px]">Pulse (bpm)</label>
              <input
                type="text"
                value={vitals.hr}
                onChange={(e) => setVitals({ ...vitals, hr: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-400 text-[11px]">Temp (°C)</label>
              <input
                type="text"
                value={vitals.temp}
                onChange={(e) => setVitals({ ...vitals, temp: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-400 text-[11px]">Resp Rate (/min)</label>
              <input
                type="text"
                value={vitals.rr}
                onChange={(e) => setVitals({ ...vitals, rr: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-400 text-[11px]">SpO2 (%)</label>
              <input
                type="text"
                value={vitals.spo2}
                onChange={(e) => setVitals({ ...vitals, spo2: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Detailed Clinical History & Examination Findings *</label>
            <textarea
              rows={4}
              required
              value={clinicalSummary}
              onChange={(e) => setClinicalSummary(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white leading-relaxed"
            />
          </div>
        </div>

        {/* Section 6: Priority Level */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-3">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-400 flex items-center justify-center text-[10px] font-bold">6</span>
            <span>Referral Priority & Urgency Classification</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'Emergency', title: 'Emergency (Red)', desc: 'Immediate threat to life or limb (< 1 hr transfer)' },
              { id: 'Urgent', title: 'Urgent (Yellow)', desc: 'Needs acute hospital intervention within 24 hrs' },
              { id: 'Routine', title: 'Routine (Green)', desc: 'Elective specialist outpatient consult' },
            ].map(p => (
              <label
                key={p.id}
                className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                  priorityReview === p.id
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 ring-1 ring-sky-500'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900 dark:text-white">{p.title}</span>
                  <input
                    type="radio"
                    name="priority"
                    checked={priorityReview === p.id}
                    onChange={() => setPriorityReview(p.id)}
                    className="text-sky-600"
                  />
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">{p.desc}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Section 7: Document Upload & AI OCR */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-3">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-400 flex items-center justify-center text-[10px] font-bold">7</span>
            <span>Document Upload & AI OCR Processing</span>
          </h3>

          <div className="p-4 rounded-xl border-2 border-dashed border-sky-200 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/20 flex flex-col items-center justify-center text-center">
            <FileText className="w-8 h-8 text-sky-500 mb-2" />
            <p className="font-bold text-slate-800 dark:text-white">{documentName} ({documentSize})</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Attach medical slip, lab sheets, or ECG photos</p>

            <div className="flex items-center gap-2 mt-3">
              <label className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-slate-700 dark:text-slate-200 shadow-xs cursor-pointer hover:bg-slate-50">
                <span>Browse File</span>
                <input type="file" onChange={handleFileUpload} className="hidden" accept="image/*,.pdf" />
              </label>
              <button
                type="button"
                onClick={handleSimulateOCR}
                disabled={isOcrProcessing}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>{isOcrProcessing ? 'Running AI OCR...' : 'Run OCR Ingestion'}</span>
              </button>
            </div>

            {ocrSuccess && (
              <span className="text-[11px] text-emerald-600 font-bold mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Clinical text & vitals parsed with 96.4% confidence!
              </span>
            )}
          </div>
        </div>

        {/* Section 8: Target Hospital & Transportation Requirement */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-400 flex items-center justify-center text-[10px] font-bold">8</span>
            <span>Receiving Hospital Selection & Transportation Request</span>
          </h3>

          <div className="space-y-2">
            <label className="block font-semibold text-slate-700 dark:text-slate-300">Select Receiving Hospital</label>
            <div className="grid grid-cols-1 gap-2">
              {facilities.filter(f => f.type.includes('Hospital')).slice(0, 3).map((f) => (
                <label
                  key={f.id}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    selectedHospitalId === f.id
                      ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 ring-1 ring-sky-500'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="hospital"
                      checked={selectedHospitalId === f.id}
                      onChange={() => setSelectedHospitalId(f.id)}
                      className="text-sky-600"
                    />
                    <div>
                      <h5 className="font-bold text-slate-800 dark:text-white">{f.name}</h5>
                      <p className="text-[11px] text-slate-500">
                        {f.distanceKmFromCenter} km • {f.availableBeds} beds available (ICU: {f.availableIcuBeds || 0}) • Workload: {f.workloadLevel}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-sky-600 dark:text-sky-400">Match: {f.ratingScore}%</span>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={transportRequired}
                onChange={(e) => setTransportRequired(e.target.checked)}
                className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
              />
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Ambulance className="w-4 h-4 text-sky-600" />
                <span>Require Emergency Patient Transportation (Dispatch to Transport Coordinator)</span>
              </span>
            </label>

            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Additional Coordination Notes</label>
              <input
                type="text"
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="e.g. Paramedic escort required, oxygen cylinder on-board"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => navigate('/referrals')}
            className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold rounded-xl shadow-md flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{isSubmitting ? 'Submitting to Hospital...' : 'Submit Digital Referral'}</span>
          </button>
        </div>
      </form>

      {/* Referral Preview Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-700">
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Referral Preview & Verification</h3>
                <p className="text-slate-500">Please review clinical fields before transmission to {selectedHospital.name}</p>
              </div>
              <button onClick={() => setIsPreviewOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/60">
              <div className="flex justify-between border-b pb-2 border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-500">Patient:</span>
                <span className="font-extrabold text-slate-900 dark:text-white">{selectedPatient.name} ({selectedPatient.id}, {selectedPatient.age}yo)</span>
              </div>
              <div className="flex justify-between border-b pb-2 border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-500">Priority Urgency:</span>
                <span className={`font-bold px-2 py-0.5 rounded ${
                  priorityReview === 'Emergency' ? 'bg-rose-100 text-rose-700' :
                  priorityReview === 'Urgent' ? 'bg-amber-100 text-amber-700' :
                  'bg-emerald-100 text-emerald-700'
                }`}>{priorityReview}</span>
              </div>
              <div className="flex justify-between border-b pb-2 border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-500">Service Category:</span>
                <span className="font-bold text-sky-600">{serviceCategory}</span>
              </div>
              <div className="flex justify-between border-b pb-2 border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-500">Receiving Facility:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedHospital.name}</span>
              </div>
              <div className="flex justify-between border-b pb-2 border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-500">Vitals Recorded:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  BP: {vitals.bp} | HR: {vitals.hr} | Temp: {vitals.temp}°C | RR: {vitals.rr} | SpO2: {vitals.spo2}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2 border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-500">Ambulance Transport:</span>
                <span className="font-bold text-slate-900 dark:text-white">{transportRequired ? 'Yes (Requested)' : 'No'}</span>
              </div>
              <div>
                <span className="font-bold text-slate-500 block mb-1">Clinical Summary:</span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  {clinicalSummary}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
              >
                Back to Editing
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-5 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Confirm & Transmit Referral</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
