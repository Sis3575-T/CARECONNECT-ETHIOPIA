import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FilePlus2,
  Building2,
  UserCheck,
  ShieldAlert,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext.jsx';
import { patientService } from '../services/patientService.js';
import { referralCreationService } from '../services/referralCreationService.js';
import { ReferralStepIndicator } from '../components/referrals/ReferralStepIndicator.jsx';
import { ReferralPatientStep } from '../components/referrals/ReferralPatientStep.jsx';
import { ReferralClinicalStep } from '../components/referrals/ReferralClinicalStep.jsx';
import { ReferralDestinationStep } from '../components/referrals/ReferralDestinationStep.jsx';
import { ReferralDocumentsStep } from '../components/referrals/ReferralDocumentsStep.jsx';
import { ReferralReviewStep } from '../components/referrals/ReferralReviewStep.jsx';
import { ReferralConfirmationStep } from '../components/referrals/ReferralConfirmationStep.jsx';
import { Card } from '@shared/components/display/Card.jsx';
import { Spinner } from '@shared/components/feedback/Spinner.jsx';

export default function CreateReferralPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const paramPatientId = searchParams.get('patientId');

  // Multi-step Wizard State
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [loadingInitialPatient, setLoadingInitialPatient] = useState(false);

  // Referral Data Model
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [clinicalData, setClinicalData] = useState({
    priority: 'ROUTINE', // 'ROUTINE' | 'URGENT' | 'EMERGENCY'
    primary_diagnosis: '',
    reason_for_referral: '',
    clinical_summary: '',
    vitals_blood_pressure: '',
    vitals_pulse_rate: '',
    vitals_respiratory_rate: '',
    vitals_temperature: '',
    vitals_spo2: '',
    provisional_treatment_given: '',
    transport_required: false,
    transport_notes: ''
  });

  const [destinationData, setDestinationData] = useState({
    destination_facility_id: '',
    destination_facility_name: '',
    required_specialty: ''
  });

  const [attachedFiles, setAttachedFiles] = useState([]);
  const [createdReferral, setCreatedReferral] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState(null);

  const facilityName = user?.facilityName || 'Assigned Health Centre';

  // Pre-load patient if patientId query param provided
  useEffect(() => {
    if (paramPatientId && !selectedPatient) {
      let isMounted = true;
      setLoadingInitialPatient(true);

      patientService
        .getPatientById(paramPatientId)
        .then((pat) => {
          if (isMounted && pat) {
            setSelectedPatient(pat);
            setCompletedSteps((prev) => (prev.includes(1) ? prev : [...prev, 1]));
          }
        })
        .catch(() => {
          // If pre-load fails, keep patient selection open
        })
        .finally(() => {
          if (isMounted) setLoadingInitialPatient(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [paramPatientId]);

  const markStepComplete = (stepId) => {
    setCompletedSteps((prev) => (prev.includes(stepId) ? prev : [...prev, stepId]));
  };

  const handleSubmitReferral = async () => {
    if (!selectedPatient?.id) {
      setSubmissionError('Please select a valid patient before submitting');
      return;
    }
    if (!destinationData.destination_facility_id) {
      setSubmissionError('Please select an authorized destination hospital');
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      const payload = {
        patient_id: selectedPatient.id,
        priority: clinicalData.priority,
        primary_diagnosis: clinicalData.primary_diagnosis,
        reason_for_referral: clinicalData.reason_for_referral,
        clinical_summary: clinicalData.clinical_summary,
        destination_facility_id: destinationData.destination_facility_id,
        required_specialty: destinationData.required_specialty || undefined,
        vitals_blood_pressure: clinicalData.vitals_blood_pressure || undefined,
        vitals_pulse_rate: clinicalData.vitals_pulse_rate ? Number(clinicalData.vitals_pulse_rate) : undefined,
        vitals_respiratory_rate: clinicalData.vitals_respiratory_rate ? Number(clinicalData.vitals_respiratory_rate) : undefined,
        vitals_temperature: clinicalData.vitals_temperature ? Number(clinicalData.vitals_temperature) : undefined,
        vitals_spo2: clinicalData.vitals_spo2 ? Number(clinicalData.vitals_spo2) : undefined,
        provisional_treatment_given: clinicalData.provisional_treatment_given || undefined,
        transport_required: Boolean(clinicalData.transport_required),
        status: 'SUBMITTED'
      };

      const referral = await referralCreationService.createReferral(payload);

      // Upload attached documents if any
      if (attachedFiles.length > 0 && referral?.id) {
        for (const item of attachedFiles) {
          try {
            await referralCreationService.uploadReferralDocument(referral.id, item.file, {
              title: item.description || item.fileName,
              documentType: item.documentType
            });
          } catch (uploadErr) {
            // Log without sensitive patient info
          }
        }
      }

      setCreatedReferral(referral);
      markStepComplete(5);
    } catch (err) {
      setSubmissionError(err.message || 'Failed to submit referral. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedPatient(null);
    setClinicalData({
      priority: 'ROUTINE',
      primary_diagnosis: '',
      reason_for_referral: '',
      clinical_summary: '',
      vitals_blood_pressure: '',
      vitals_pulse_rate: '',
      vitals_respiratory_rate: '',
      vitals_temperature: '',
      vitals_spo2: '',
      provisional_treatment_given: '',
      transport_required: false,
      transport_notes: ''
    });
    setDestinationData({
      destination_facility_id: '',
      destination_facility_name: '',
      required_specialty: ''
    });
    setAttachedFiles([]);
    setCreatedReferral(null);
    setCompletedSteps([]);
    setCurrentStep(1);
    setSubmissionError(null);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <button
            onClick={() => navigate('/referrals')}
            className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-sky-600 mb-1 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back to Referrals Overview
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <FilePlus2 className="w-7 h-7 text-sky-600 dark:text-sky-400" />
            <span>Digital Referral Creation</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Initiate a secure clinical transfer from <span className="font-semibold text-slate-700 dark:text-slate-300">{facilityName}</span> to an authorized hospital
          </p>
        </div>

        <div className="text-xs px-3 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-900/40 text-sky-800 dark:text-sky-300">
          Referring Tenancy: <strong className="font-semibold">{facilityName}</strong>
        </div>
      </div>

      {createdReferral ? (
        <ReferralConfirmationStep
          referral={createdReferral}
          patient={selectedPatient}
          destinationData={destinationData}
          clinicalData={clinicalData}
          attachedFilesCount={attachedFiles.length}
          onReset={handleReset}
        />
      ) : (
        <>
          {/* Step Indicator */}
          <ReferralStepIndicator
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepClick={(stepId) => setCurrentStep(stepId)}
          />

          {/* Step Content */}
          {loadingInitialPatient ? (
            <Card className="p-8 text-center bg-white dark:bg-slate-900">
              <Spinner size="lg" className="mx-auto mb-2 text-sky-600" />
              <p className="text-xs text-slate-500">Loading pre-selected patient details...</p>
            </Card>
          ) : (
            <>
              {currentStep === 1 && (
                <ReferralPatientStep
                  selectedPatient={selectedPatient}
                  onSelectPatient={(patient) => {
                    setSelectedPatient(patient);
                    if (patient) {
                      markStepComplete(1);
                    } else {
                      setCompletedSteps((prev) => prev.filter((s) => s !== 1));
                    }
                  }}
                  onProceed={() => {
                    if (selectedPatient) {
                      markStepComplete(1);
                      setCurrentStep(2);
                    }
                  }}
                />
              )}

              {currentStep === 2 && (
                <ReferralClinicalStep
                  clinicalData={clinicalData}
                  onChange={setClinicalData}
                  onBack={() => setCurrentStep(1)}
                  onProceed={() => {
                    markStepComplete(2);
                    setCurrentStep(3);
                  }}
                />
              )}

              {currentStep === 3 && (
                <ReferralDestinationStep
                  destinationData={destinationData}
                  onChange={setDestinationData}
                  onBack={() => setCurrentStep(2)}
                  onProceed={() => {
                    markStepComplete(3);
                    setCurrentStep(4);
                  }}
                />
              )}

              {currentStep === 4 && (
                <ReferralDocumentsStep
                  attachedFiles={attachedFiles}
                  onChangeFiles={setAttachedFiles}
                  onBack={() => setCurrentStep(3)}
                  onProceed={() => {
                    markStepComplete(4);
                    setCurrentStep(5);
                  }}
                />
              )}

              {currentStep === 5 && (
                <ReferralReviewStep
                  patient={selectedPatient}
                  clinicalData={clinicalData}
                  destinationData={destinationData}
                  attachedFiles={attachedFiles}
                  facilityName={facilityName}
                  submitting={isSubmitting}
                  submissionError={submissionError}
                  onBack={() => setCurrentStep(4)}
                  onJumpToStep={(stepId) => setCurrentStep(stepId)}
                  onSubmit={handleSubmitReferral}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
