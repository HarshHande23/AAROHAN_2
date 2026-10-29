import React, { useEffect, useState } from 'react';
import { studentsApi, institutionsApi } from '../api';
import { Student, Institution } from '../types';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Pagination } from '../components/ui/Pagination';
import { Link } from 'react-router-dom';
import { 
  UserPlus, 
  Search, 
  Filter, 
  Eye, 
  Trash2, 
  CheckCircle, 
  X, 
  AlertCircle,
  FileCheck,
  RefreshCw,
  Sparkles
} from 'lucide-react';

export const StudentsPage: React.FC = () => {
  const { user, hasRole } = useAuth();

  const [students, setStudents] = useState<Student[]>([]);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [institutions, setInstitutions] = useState<Institution[]>([]);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedInstId, setSelectedInstId] = useState<string>('');
  const [validationFilter, setValidationFilter] = useState<string>('');
  const [anomalyFilter, setAnomalyFilter] = useState<string>('');
  const [mlFilter, setMlFilter] = useState<string>('');
  const [duplicateFilter, setDuplicateFilter] = useState<string>('');
  const [verificationFilter, setVerificationFilter] = useState<string>('');

  // Add Student Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    apaar_id: '',
    student_id: '',
    full_name: '',
    email: '',
    phone: '',
    gender: 'Male',
    date_of_birth: '2004-05-15',
    institution_id: 1,
    degree_program: 'B.Tech Computer Science and Engineering',
    department: 'Computer Science and Engineering',
    academic_year: '2025-2026',
    current_semester: '4th',
    admission_date: '2023-08-01',
    cgpa: 3.45,
    last_semester_gpa: 3.50,
    attendance_percentage: 82.5,
    study_hours_per_day: 5.0,
    sleep_hours: 7.0,
    gaming_hours: 1.5,
    certificate_number: '',
    certificate_issue_date: '2023-07-20',
  });

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const res = await studentsApi.getStudents({
        search: searchQuery || undefined,
        institution_id: selectedInstId ? Number(selectedInstId) : undefined,
        validation_status: validationFilter || undefined,
        duplicate_status: duplicateFilter || undefined,
        anomaly_status: anomalyFilter || undefined,
        ml_classification: mlFilter || undefined,
        verification_status: verificationFilter || undefined,
        page: currentPage,
        page_size: pageSize,
      });
      setStudents(res.items);
      setTotalItems(res.total);
      setTotalPages(res.total_pages);
    } catch (err) {
      console.error("Failed to fetch students:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    institutionsApi.getInstitutions().then(setInstitutions).catch(console.error);
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [
    currentPage, 
    pageSize, 
    searchQuery, 
    selectedInstId, 
    validationFilter, 
    duplicateFilter, 
    anomalyFilter, 
    mlFilter, 
    verificationFilter
  ]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as any;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value,
    }));
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      const newStudent = await studentsApi.createStudent(formData);
      setFormSuccess(`Student ${newStudent.full_name} enrolled successfully! ML analysis completed.`);
      setTimeout(() => {
        setIsAddModalOpen(false);
        setFormSuccess(null);
        fetchStudents();
      }, 1500);
    } catch (err: any) {
      console.error("Enrolment error:", err);
      const msg = err?.response?.data?.detail || "Failed to create student enrolment. Please review the inputs.";
      setFormError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (studentId: number, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete enrolment for ${name}?`)) {
      return;
    }
    try {
      await studentsApi.deleteStudent(studentId);
      fetchStudents();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to delete student.");
    }
  };

  const canEnrol = hasRole(['AICTE_ADMIN', 'COLLEGE_ADMIN', 'ADMISSION_STAFF']);
  const canDelete = hasRole(['AICTE_ADMIN', 'COLLEGE_ADMIN']);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Student Enrolment Registry</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Central repository of permanent academic accounts, credentials, and verification indicators.
          </p>
        </div>
        {canEnrol && (
          <button
            onClick={() => {
              // Open the enrolment form with blank fields - user fills in real values
              setFormData((prev) => ({
                ...prev,
                apaar_id: '',
                student_id: '',
                certificate_number: '',
              }));
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs transition"
          >
            <UserPlus className="h-4 w-4" />
            Enrol New Student
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student name, APAAR ID, or registration number..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 bg-slate-50/50"
            />
          </div>

          {/* Institution Selector */}
          <select
            value={selectedInstId}
            onChange={(e) => {
              setSelectedInstId(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            <option value="">All Institutions</option>
            {institutions.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.name} ({inst.code})
              </option>
            ))}
          </select>
        </div>

        {/* Secondary Filter Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-medium flex items-center gap-1">
            <Filter className="h-3 w-3" /> Filters:
          </span>

          {/* Validation Filter */}
          <select
            value={validationFilter}
            onChange={(e) => { setValidationFilter(e.target.value); setCurrentPage(1); }}
            className="text-[11px] border border-slate-200 rounded px-2 py-1 bg-slate-50 text-slate-700"
          >
            <option value="">Validation: All</option>
            <option value="VALID">Valid</option>
            <option value="INVALID">Invalid</option>
          </select>

          {/* Duplicate Filter */}
          <select
            value={duplicateFilter}
            onChange={(e) => { setDuplicateFilter(e.target.value); setCurrentPage(1); }}
            className="text-[11px] border border-slate-200 rounded px-2 py-1 bg-slate-50 text-slate-700"
          >
            <option value="">Duplicates: All</option>
            <option value="UNIQUE">Unique</option>
            <option value="DUPLICATE_FLAGGED">Duplicate Flagged</option>
          </select>

          {/* Isolation Forest Anomaly */}
          <select
            value={anomalyFilter}
            onChange={(e) => { setAnomalyFilter(e.target.value); setCurrentPage(1); }}
            className="text-[11px] border border-slate-200 rounded px-2 py-1 bg-slate-50 text-slate-700"
          >
            <option value="">Isolation Forest: All</option>
            <option value="NORMAL">Normal</option>
            <option value="ANOMALOUS">Anomalous</option>
          </select>

          {/* Random Forest Classification */}
          <select
            value={mlFilter}
            onChange={(e) => { setMlFilter(e.target.value); setCurrentPage(1); }}
            className="text-[11px] border border-slate-200 rounded px-2 py-1 bg-slate-50 text-slate-700"
          >
            <option value="">Random Forest: All</option>
            <option value="GENUINE">Genuine</option>
            <option value="SUSPICIOUS">Suspicious</option>
          </select>

          {/* Verification Status */}
          <select
            value={verificationFilter}
            onChange={(e) => { setVerificationFilter(e.target.value); setCurrentPage(1); }}
            className="text-[11px] border border-slate-200 rounded px-2 py-1 bg-slate-50 text-slate-700"
          >
            <option value="">Verification: All</option>
            <option value="PENDING">Pending</option>
            <option value="VERIFIED">Verified</option>
            <option value="REJECTED">Rejected</option>
          </select>

          {(searchQuery || selectedInstId || validationFilter || duplicateFilter || anomalyFilter || mlFilter || verificationFilter) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedInstId('');
                setValidationFilter('');
                setDuplicateFilter('');
                setAnomalyFilter('');
                setMlFilter('');
                setVerificationFilter('');
                setCurrentPage(1);
              }}
              className="text-[11px] text-blue-700 hover:underline font-semibold ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Student Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <LoadingSpinner message="Retrieving student records from academic database..." />
        ) : students.length === 0 ? (
          <EmptyState
            title="No Students Found"
            description={
              totalItems === 0 && !searchQuery
                ? "No students have been enrolled in the database yet. Enrol a student manually or use Bulk Import to populate the registry."
                : "No student records matched your search query and filter criteria."
            }
            actionText={canEnrol ? "Enrol First Student" : undefined}
            onAction={canEnrol ? () => setIsAddModalOpen(true) : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Student Details</th>
                  <th className="py-3 px-4">APAAR ID / Roll No</th>
                  <th className="py-3 px-4">Institution & Program</th>
                  <th className="py-3 px-4">Academic Metrics</th>
                  <th className="py-3 px-4">Deterministic Rules</th>
                  <th className="py-3 px-4">Isolation Forest</th>
                  <th className="py-3 px-4">Random Forest</th>
                  <th className="py-3 px-4">Verification</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{student.full_name}</div>
                      <div className="text-[11px] text-slate-400">{student.email}</div>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <div className="font-bold text-slate-800 text-[11px]">{student.apaar_id}</div>
                      <div className="text-[10px] text-slate-500">{student.student_id}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{student.institution_name}</div>
                      <div className="text-[11px] text-slate-500">{student.degree_program}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-800">
                        CGPA: <span className="font-semibold">{student.cgpa.toFixed(2)}</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Attendance: <span className="font-medium">{student.attendance_percentage}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 space-y-1">
                      <div><Badge status={student.validation_status} size="sm" /></div>
                      <div><Badge status={student.duplicate_status} size="sm" /></div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge status={student.anomaly_status} size="sm" />
                      {student.anomaly_score !== null && student.anomaly_score !== undefined && (
                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                          Score: {student.anomaly_score.toFixed(3)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge status={student.ml_classification} size="sm" />
                      {student.ml_confidence !== null && student.ml_confidence !== undefined && (
                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                          Conf: {Math.round(student.ml_confidence * 100)}%
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge status={student.verification_status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/students/${student.id}`}
                          className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded transition"
                          title="View Full Profile & ML Breakdown"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(student.id, student.full_name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                            title="Delete Student Enrolment"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Add Student Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold tracking-wide">New Student Enrolment</h3>
                <p className="text-xs text-slate-400">Registers student in database and immediately executes deterministic checks & ML inference.</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateStudent} className="p-6 overflow-y-auto space-y-4 text-xs">
              {formError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
              {formSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-lg flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* Identity & Identifiers */}
              <div className="border-b border-slate-100 pb-3">
                <h4 className="font-bold text-slate-800 mb-2.5">1. Student Identification & APAAR Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">APAAR ID *</label>
                    <input
                      type="text"
                      name="apaar_id"
                      required
                      value={formData.apaar_id}
                      onChange={handleInputChange}
                      placeholder="e.g. APAAR-2026-8491"
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-600 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Roll / Registration No *</label>
                    <input
                      type="text"
                      name="student_id"
                      required
                      value={formData.student_id}
                      onChange={handleInputChange}
                      placeholder="e.g. REG-2026-8491"
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-600 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Full Legal Name *</label>
                    <input
                      type="text"
                      name="full_name"
                      required
                      value={formData.full_name}
                      onChange={handleInputChange}
                      placeholder="e.g. Rajesh Sharma"
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Email Address *</label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="e.g. rajesh.sharma@example.edu"
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                </div>
              </div>

              {/* Institution & Academic Program */}
              <div className="border-b border-slate-100 pb-3">
                <h4 className="font-bold text-slate-800 mb-2.5">2. Institution & Academic Enrolment</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Institution *</label>
                    <select
                      name="institution_id"
                      value={formData.institution_id}
                      onChange={handleInputChange}
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-600 bg-white"
                    >
                      {institutions.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          {inst.name} ({inst.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Degree Program *</label>
                    <input
                      type="text"
                      name="degree_program"
                      required
                      value={formData.degree_program}
                      onChange={handleInputChange}
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Current Semester</label>
                    <select
                      name="current_semester"
                      value={formData.current_semester}
                      onChange={handleInputChange}
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-600 bg-white"
                    >
                      <option value="1st">1st Semester</option>
                      <option value="2nd">2nd Semester</option>
                      <option value="3rd">3rd Semester</option>
                      <option value="4th">4th Semester</option>
                      <option value="5th">5th Semester</option>
                      <option value="6th">6th Semester</option>
                      <option value="7th">7th Semester</option>
                      <option value="8th">8th Semester</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Admission Date</label>
                    <input
                      type="date"
                      name="admission_date"
                      value={formData.admission_date}
                      onChange={handleInputChange}
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                </div>
              </div>

              {/* Performance & Behavioral Indicators (Used by ML & Anomaly Detection) */}
              <div className="border-b border-slate-100 pb-3">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                  <h4 className="font-bold text-slate-800">3. Performance & Behavioral Attributes (Inference Inputs)</h4>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">CGPA (0 - 4.0) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="4"
                      name="cgpa"
                      required
                      value={formData.cgpa}
                      onChange={handleInputChange}
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Attendance % *</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      name="attendance_percentage"
                      required
                      value={formData.attendance_percentage}
                      onChange={handleInputChange}
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Study Hrs/Day</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="24"
                      name="study_hours_per_day"
                      value={formData.study_hours_per_day}
                      onChange={handleInputChange}
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Sleep Hrs/Day</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="24"
                      name="sleep_hours"
                      value={formData.sleep_hours}
                      onChange={handleInputChange}
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                </div>
              </div>

              {/* Certificate & Document Details */}
              <div>
                <h4 className="font-bold text-slate-800 mb-2.5">4. Certificate & Verification Document</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Certificate Number *</label>
                    <input
                      type="text"
                      name="certificate_number"
                      required
                      value={formData.certificate_number}
                      onChange={handleInputChange}
                      placeholder="e.g. CERT-2026-981245"
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-600 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Certificate Issue Date</label>
                    <input
                      type="date"
                      name="certificate_issue_date"
                      value={formData.certificate_issue_date}
                      onChange={handleInputChange}
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold shadow-xs transition flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileCheck className="h-4 w-4" />}
                  {isSubmitting ? 'Registering & Inferring...' : 'Enrol Student & Run Inference'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

