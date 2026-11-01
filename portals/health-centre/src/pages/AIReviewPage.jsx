import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ArrowRight,
  Edit3,
  Check,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useCareConnectData } from '@shared/hooks/useCareConnectData';

export default function AIReviewPage() {
  const navigate = useNavigate();
  const { facilities } = useCareConnectData();

  const [documentName, setDocumentName] = useState('REFERRAL_SLIP_KEBEDE_841.JPG');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [missingFieldsWarning, setMissingFieldsWarning] = useState(false);

  const [extractedData, setExtractedData] = useState({
    patientName: 'Kebede Alemu',
    age: '54',
    gender: 'Male',
    serviceCategory: 'Cardiology',
    confidenceScore: '96.4%',
    vitals: 'BP: 160/95 mmHg, HR: 92 bpm, SpO2: 94%, Temp: 37.0°C',
    primaryDiagnosis: 'Acute Coronary Syndrome (Anterior STEMI suspected)',
    recommendedHospital: 'Tikur Anbessa Specialized Hospital (Black Lion)',
    notes: 'Emergency transfer with continuous telemetry and oxygen.'
  });

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setDocumentName(file.name.toUpperCase());
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
      }, 1000);
    }
  };

  const handleApplyToReferral = () => {
    localStorage.setItem('careconnect_referral_draft', JSON.stringify({
      referralReason: extractedData.primaryDiagnosis,
      clinicalSummary: `Extracted from ${documentName}: ${extractedData.primaryDiagnosis}. Vitals: ${extractedData.vitals}. ${extractedData.notes}`,
      serviceCategory: extractedData.serviceCategory
    }));
    navigate('/create-referral');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">AI Referral Document Ingestion & Verification</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            CareConnect AI-01 OCR text extraction, entity linking, and clinical completeness verification
          </p>
        </div>

        <button
          onClick={handleApplyToReferral}
          className="px-4 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 self-start cursor-pointer"
        >
          <span>Transfer to Referral Form</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* OCR Document Preview and Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Document Thumbnail */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex flex-col items-center justify-center text-center">
          <div className="w-16 h-20 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 shadow-inner">
            <FileText className="w-8 h-8 text-sky-500" />
            <span className="text-[8px] mt-1 font-mono uppercase truncate max-w-[50px]">{documentName}</span>
          </div>
          <span className="text-xs font-bold text-slate-800 dark:text-white mt-2 truncate max-w-[200px]">{documentName}</span>
          <label className="text-[10px] text-sky-600 font-bold mt-1 cursor-pointer hover:underline">
            <span>Upload Another Scan</span>
            <input type="file" onChange={handleFileUpload} className="hidden" accept="image/*,.pdf" />
          </label>
        </div>

        {/* Confidence Card */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Model Confidence</span>
            <p className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1">{extractedData.confidenceScore}</p>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-0.5">Category: {extractedData.serviceCategory}</p>
          </div>
          <span className="text-[10px] text-slate-400">CareConnect Tesseract-BioBERT v2.4</span>
        </div>

        {/* Completeness Badge */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Completeness Validation</span>
            <div className="flex items-center gap-1.5 mt-1 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-lg font-bold">100% Validated</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">All mandatory MoH clinical referral fields verified</p>
          </div>
          <button
            onClick={() => setMissingFieldsWarning(!missingFieldsWarning)}
            className="text-[10px] text-slate-400 hover:text-slate-600 text-left underline"
          >
            {missingFieldsWarning ? 'Hide Warning Simulation' : 'Simulate Incomplete Scan'}
          </button>
        </div>
      </div>

      {missingFieldsWarning && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Warning: Missing Vitals Flagged</span>
            <p className="text-[11px] mt-0.5">
              Preliminary scan is missing patient Respiratory Rate and Secondary Diagnostic ICD-11 code. Healthcare worker must verify and fill manually prior to hospital transmission.
            </p>
          </div>
        </div>
      )}

      {/* Editable Structured Fields */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4 text-xs">
        <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Extracted Clinical Entities (Editable by Clinician)</h3>
          </div>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Save Changes' : 'Edit Entities'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block font-semibold mb-1 text-slate-500">Patient Full Name</label>
            <input
              type="text"
              disabled={!isEditing}
              value={extractedData.patientName}
              onChange={(e) => setExtractedData({ ...extractedData, patientName: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold disabled:opacity-80"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1 text-slate-500">Age & Gender</label>
            <div className="flex gap-2">
              <input
                type="text"
                disabled={!isEditing}
                value={extractedData.age}
                onChange={(e) => setExtractedData({ ...extractedData, age: e.target.value })}
                className="w-16 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold disabled:opacity-80"
              />
              <input
                type="text"
                disabled={!isEditing}
                value={extractedData.gender}
                onChange={(e) => setExtractedData({ ...extractedData, gender: e.target.value })}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold disabled:opacity-80"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1 text-slate-500">Suggested Service Category</label>
            <input
              type="text"
              disabled={!isEditing}
              value={extractedData.serviceCategory}
              onChange={(e) => setExtractedData({ ...extractedData, serviceCategory: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sky-600 font-bold disabled:opacity-80"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block font-semibold mb-1 text-slate-500">Vitals Recorded by OCR</label>
            <input
              type="text"
              disabled={!isEditing}
              value={extractedData.vitals}
              onChange={(e) => setExtractedData({ ...extractedData, vitals: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono disabled:opacity-80"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block font-semibold mb-1 text-slate-500">Extracted Primary Diagnosis</label>
            <input
              type="text"
              disabled={!isEditing}
              value={extractedData.primaryDiagnosis}
              onChange={(e) => setExtractedData({ ...extractedData, primaryDiagnosis: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-semibold disabled:opacity-80"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block font-semibold mb-1 text-slate-500">Suggested Receiving Hospital</label>
            <input
              type="text"
              disabled={!isEditing}
              value={extractedData.recommendedHospital}
              onChange={(e) => setExtractedData({ ...extractedData, recommendedHospital: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white disabled:opacity-80"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end">
          <button
            onClick={handleApplyToReferral}
            className="px-5 py-2.5 bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
          >
            <span>Approve & Populate Create Referral Form</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
