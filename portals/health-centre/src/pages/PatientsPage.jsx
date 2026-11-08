import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  RefreshCw,
  Search,
  Filter,
  ShieldCheck,
  Building2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@shared/components/ui/Button.jsx';
import { Card } from '@shared/components/display/Card.jsx';
import { EmptyState } from '@shared/components/display/EmptyState.jsx';
import { useAuth } from '@shared/context/AuthContext.jsx';
import { patientService } from '../services/patientService.js';
import { PatientTable } from '../components/patients/PatientTable.jsx';
import { PatientLoadingSkeleton } from '../components/patients/PatientLoadingSkeleton.jsx';
import { PatientErrorState } from '../components/patients/PatientErrorState.jsx';

export default function PatientsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);

  // Pagination & Filtering state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Search & Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGender, setFilterGender] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const facilityName = user?.facilityName || 'Assigned Health Centre';
  const facilityId = user?.facilityId || 'Tenant Facility';

  const loadPatients = useCallback(async (isRetry = false) => {
    if (isRetry) {
      setIsRetrying(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await patientService.getPatients({
        page: currentPage,
        limit: pageSize,
        search: searchTerm,
        gender: filterGender,
        status: filterStatus
      });

      setPatients(response.data || []);
      setTotalCount(response.pagination?.total || 0);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (err) {
      setError(err?.message || 'Unable to retrieve patient records. Please check facility network connectivity.');
    } finally {
      setLoading(false);
      setIsRetrying(false);
    }
  }, [currentPage, pageSize, searchTerm, filterGender, filterStatus]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  const handleRefresh = () => {
    loadPatients(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2 text-xs font-medium text-sky-600 dark:text-sky-400 mb-1">
            <Building2 className="w-3.5 h-3.5" />
            <span>Facility Tenancy: {facilityName}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <span>Patient Management Workspace</span>
            {!loading && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200">
                {totalCount} Total Registered
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Access, register, and manage healthcare records strictly within your authorized facility boundary
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading || isRetrying}
            className="inline-flex items-center gap-1.5"
            aria-label="Refresh patient records"
          >
            <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/patients/register')}
            className="inline-flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white"
          >
            <UserPlus className="w-4 h-4" />
            <span>Register New Patient</span>
          </Button>
        </div>
      </div>

      {/* Main Workspace Content Area */}
      {loading && !isRetrying ? (
        <PatientLoadingSkeleton rows={6} />
      ) : error ? (
        <PatientErrorState
          title="Facility Patient Directory Unavailable"
          message={error}
          onRetry={handleRefresh}
          isRetrying={isRetrying}
        />
      ) : patients.length === 0 ? (
        <Card className="p-8 text-center bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <EmptyState
            icon={Users}
            title="No Patient Records Found"
            description={
              searchTerm || filterGender !== 'ALL' || filterStatus !== 'ALL'
                ? "No patient records match the applied criteria at this health centre."
                : `No patients have been registered yet under ${facilityName}. Begin by adding the first patient.`
            }
            action={
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/patients/register')}
                className="inline-flex items-center gap-1.5 mt-2 bg-sky-600 hover:bg-sky-700 text-white"
              >
                <UserPlus className="w-4 h-4" />
                <span>Register Patient</span>
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <PatientTable patients={patients} />

          {/* Simple Pagination Bar for Workspace */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
            <div>
              Showing page <span className="font-semibold text-slate-900 dark:text-white">{currentPage}</span> of{' '}
              <span className="font-semibold text-slate-900 dark:text-white">{totalPages}</span> ({totalCount} total)
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1 || loading}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages || loading}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
