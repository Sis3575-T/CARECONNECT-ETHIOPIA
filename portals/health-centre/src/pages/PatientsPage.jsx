import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  RefreshCw,
  Search,
  Filter,
  Building2,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { Button } from '@shared/components/ui/Button.jsx';
import { Card } from '@shared/components/display/Card.jsx';
import { EmptyState } from '@shared/components/display/EmptyState.jsx';
import { useAuth } from '@shared/context/AuthContext.jsx';
import { patientService } from '../services/patientService.js';
import { PatientTable } from '../components/patients/PatientTable.jsx';
import { PatientSearchFilter } from '../components/patients/PatientSearchFilter.jsx';
import { PatientPagination } from '../components/patients/PatientPagination.jsx';
import { PatientLoadingSkeleton } from '../components/patients/PatientLoadingSkeleton.jsx';
import { PatientErrorState } from '../components/patients/PatientErrorState.jsx';

export default function PatientsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Search & Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGender, setFilterGender] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterRegion, setFilterRegion] = useState('ALL');
  const [filterWoreda, setFilterWoreda] = useState('');

  const facilityName = user?.facilityName || 'Assigned Health Centre';
  const abortControllerRef = useRef(null);

  const loadPatients = useCallback(async (isRetry = false) => {
    // Abort previous in-flight request if user is typing
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    if (isRetry) {
      setIsRetrying(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await patientService.getPatients(
        {
          page: currentPage,
          limit: pageSize,
          search: searchTerm,
          gender: filterGender,
          status: filterStatus,
          region: filterRegion !== 'ALL' ? filterRegion : undefined,
          woreda: filterWoreda.trim() || undefined
        },
        abortControllerRef.current.signal
      );

      setPatients(response.data || []);
      setTotalCount(response.pagination?.total || 0);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (err) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') {
        return; // Ignore canceled requests
      }
      setError(err?.message || 'Unable to retrieve patient records. Please check facility network connectivity.');
    } finally {
      setLoading(false);
      setIsRetrying(false);
    }
  }, [currentPage, pageSize, searchTerm, filterGender, filterStatus, filterRegion, filterWoreda]);

  useEffect(() => {
    loadPatients();
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [loadPatients]);

  const handleSearchChange = (term) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  const handleGenderChange = (val) => {
    setFilterGender(val);
    setCurrentPage(1);
  };

  const handleStatusChange = (val) => {
    setFilterStatus(val);
    setCurrentPage(1);
  };

  const handleRegionChange = (val) => {
    setFilterRegion(val);
    setCurrentPage(1);
  };

  const handleWoredaChange = (val) => {
    setFilterWoreda(val);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterGender('ALL');
    setFilterStatus('ALL');
    setFilterRegion('ALL');
    setFilterWoreda('');
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const hasActiveFilters =
    Boolean(searchTerm) ||
    filterGender !== 'ALL' ||
    filterStatus !== 'ALL' ||
    filterRegion !== 'ALL' ||
    Boolean(filterWoreda);

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
            Access, search, filter, and register patient medical records under your health centre authority
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadPatients(true)}
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

      {/* Server-Side Search & Filters */}
      <PatientSearchFilter
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        gender={filterGender}
        onGenderChange={handleGenderChange}
        status={filterStatus}
        onStatusChange={handleStatusChange}
        region={filterRegion}
        onRegionChange={handleRegionChange}
        woreda={filterWoreda}
        onWoredaChange={handleWoredaChange}
        onReset={handleResetFilters}
        totalResults={totalCount}
        isLoading={loading}
      />

      {/* Main Workspace Content Area */}
      {loading && !isRetrying ? (
        <PatientLoadingSkeleton rows={6} />
      ) : error ? (
        <PatientErrorState
          title="Facility Patient Directory Unavailable"
          message={error}
          onRetry={() => loadPatients(true)}
          isRetrying={isRetrying}
        />
      ) : patients.length === 0 ? (
        <Card className="p-8 text-center bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <EmptyState
            icon={Users}
            title={hasActiveFilters ? "No Matching Patients Found" : "No Patient Records Found"}
            description={
              hasActiveFilters
                ? `No patient records at ${facilityName} matched your search criteria. Try modifying or clearing your filters.`
                : `No patients have been registered yet under ${facilityName}. Begin by adding the first patient.`
            }
            action={
              hasActiveFilters ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                  className="mt-3 inline-flex items-center gap-1.5"
                >
                  <X className="w-4 h-4" />
                  <span>Clear All Filters</span>
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/patients/register')}
                  className="inline-flex items-center gap-1.5 mt-3 bg-sky-600 hover:bg-sky-700 text-white"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Register Patient</span>
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <PatientTable patients={patients} />

          {/* Full Server-Side Pagination Bar */}
          <PatientPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalCount}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            isLoading={loading}
          />
        </div>
      )}
    </div>
  );
}
