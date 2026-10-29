import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { studentsApi } from '../api';
import { Student } from '../types';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { 
  ArrowLeft, 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle, 
  AlertTriangle, 
  Copy, 
  Sparkles, 
  Building2, 
  Calendar, 
  FileText, 
  Award, 
  UserCheck, 
  XCircle, 
  AlertCircle 
} from 'lucide-react';

export const StudentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, hasRole } = useAuth();

  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Verification Action State
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationNotes, setVerificationNotes] = useState<string>('');

  const fetchStudent = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await studentsApi.getStudentById(Number(id));
      setStudent(data);
    } catch (err: any) {
      console.error("Student detail error:", err);
      setError(err?.response?.data?.detail || "Student record not found in academic database.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudent();
  }, [id]);

  const handleVerify = async (newStatus: 'VERIFIED' | 'REJECTED' | 'FLAGGED') => {
    if (!student) return;
    setIsVerifying(true);
    try {
      const updated = await studentsApi.verifyStudent(student.id, {
        status: newStatus,
        notes: verificationNotes || undefined,
      });
      setStudent(updated);
      alert(`Verification status updated to: ${newStatus}`);
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to update verification status.");
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Retrieving academic record & inference logs from database..." />;
  }

  if (error || !student) {
    return (
      <div className="bg-white p-8 rounded-xl border border-rose-200 text-center space-y-4">
        <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-900">Record Not Found</h3>
        <p className="text-xs text-slate-500">{error || "The requested student record does not exist in the database."}</p>
        <Link
          to="/students"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-700 text-white rounded-lg text-xs font-semibold"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Registry
        </Link>
      </div>
    );
  }

  const canVerify = hasRole(['AICTE_ADMIN', 'COLLEGE_ADMIN', 'AUTHORIZED_VERIFIER']);

  return (
    <div className="space-y-6">
      {/* Top Navigation & Profile Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            to="/students"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            title="Back to Students Registry"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{student.full_name}</h1>
              <Badge status={student.overall_risk_level} label={`Risk: ${student.overall_risk_level}`} />
              <Badge status={student.verification_status} />
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              APAAR ID: <span className="font-bold text-slate-700">{student.apaar_id}</span> • Reg No: {student.student_id}
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Details & Model Evaluations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Academic & Identity Record (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Institution & Enrolment Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <Building2 className="h-4 w-4 text-blue-700" /> Institution & Academic Profile
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Institution Name</span>
                <span className="font-semibold text-slate-900">{student.institution_name}</span>
                <span className="text-[11px] text-slate-500 font-mono block">Code: {student.institution_code}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Degree Program</span>
                <span className="font-semibold text-slate-900">{student.degree_program}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Department</span>
                <span className="font-semibold text-slate-800">{student.department || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Current Semester & Academic Year</span>
                <span className="font-semibold text-slate-800">{student.current_semester} Sem • AY {student.academic_year}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Admission Date</span>
                <span className="font-semibold text-slate-800">{student.admission_date}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Contact Details</span>
                <span className="font-semibold text-slate-800">{student.email}</span>
                <span className="text-[11px] text-slate-500 block">{student.phone || 'Phone not registered'}</span>
              </div>
            </div>
          </div>

          {/* Academic Performance & Behavioral Metrics */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <Award className="h-4 w-4 text-blue-700" /> Academic Performance & Lifestyle Indicators
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-slate-500 font-medium block">Cumulative CGPA</span>
                <span className="text-lg font-extrabold text-blue-900">{student.cgpa.toFixed(2)}</span>
                <span className="text-[10px] text-slate-400 block">Scale: 0 - 4.0</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-slate-500 font-medium block">Last Semester GPA</span>
                <span className="text-lg font-extrabold text-slate-800">{student.last_semester_gpa.toFixed(2)}</span>
                <span className="text-[10px] text-slate-400 block">Previous Term</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-slate-500 font-medium block">Attendance</span>
                <span className="text-lg font-extrabold text-slate-800">{student.attendance_percentage}%</span>
                <span className="text-[10px] text-slate-400 block">Verified Sessions</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-slate-500 font-medium block">Study Hours</span>
                <span className="text-lg font-extrabold text-slate-800">{student.study_hours_per_day}h</span>
                <span className="text-[10px] text-slate-400 block">Per Day</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs pt-2">
              <div>
                <span className="text-slate-400 font-medium block">Sleep Hours / Day</span>
                <span className="font-semibold text-slate-800">{student.sleep_hours} hrs</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Gaming Hours / Day</span>
                <span className="font-semibold text-slate-800">{student.gaming_hours} hrs</span>
              </div>
            </div>
          </div>

          {/* Verification Certificate */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <FileText className="h-4 w-4 text-blue-700" /> Certificate & Document Credentials
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Document / Certificate No.</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{student.certificate_number}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Issue Date</span>
                <span className="font-semibold text-slate-800">{student.certificate_issue_date}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: AI/ML & Validation Engine Audit (1 Col) */}
        <div className="space-y-6">
          {/* Deterministic Validation Rules Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-blue-700" /> Deterministic Rules
              </h4>
              <Badge status={student.validation_status} size="sm" />
            </div>

            {student.validation_errors && student.validation_errors.length > 0 ? (
              <div className="space-y-1.5 pt-1">
                <p className="text-[11px] font-semibold text-rose-700">Violations Detected:</p>
                {student.validation_errors.map((err, i) => (
                  <div key={i} className="text-[11px] bg-rose-50 text-rose-800 p-2 rounded border border-rose-200 flex items-start gap-1.5">
                    <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-rose-600" />
                    <span>{err}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-600 bg-emerald-50 p-2.5 rounded border border-emerald-200 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Passed all APAAR ID format, range, and date rules.</span>
              </p>
            )}
          </div>

          {/* Deterministic Duplicate Check Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Copy className="h-3.5 w-3.5 text-blue-700" /> Duplicate Check
              </h4>
              <Badge status={student.duplicate_status} size="sm" />
            </div>

            {student.duplicate_status === 'DUPLICATE_FLAGGED' || student.duplicate_status === 'CONFIRMED_DUPLICATE' ? (
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-xs text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  Potential Duplicate Record
                </p>
                <p className="text-[11px] text-amber-800">{student.duplicate_reason || "Matched with an existing registered student record."}</p>
                {student.duplicate_match_id && (
                  <p className="text-[11px] font-mono text-amber-900 pt-1">
                    Matched Record ID: #{student.duplicate_match_id}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200">
                Unique record. No duplicate APAAR ID, certificate, or registration number detected in database.
              </p>
            )}
          </div>

          {/* Isolation Forest Anomaly Detection Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-600" /> Isolation Forest
              </h4>
              <Badge status={student.anomaly_status} size="sm" />
            </div>
            <div className="text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Anomaly Score:</span>
                <span className="font-mono font-bold text-slate-900">
                  {student.anomaly_score !== null && student.anomaly_score !== undefined
                    ? student.anomaly_score.toFixed(4)
                    : 'Not Evaluated'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {student.anomaly_reason || (student.anomaly_status === 'ANOMALOUS' 
                  ? 'Record is statistically unusual compared to multivariate training distribution.' 
                  : 'Record is within normal statistical behavioral distribution.')}
              </p>
            </div>
          </div>

          {/* Random Forest Classification Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-700" /> Random Forest
              </h4>
              <Badge status={student.ml_classification} size="sm" />
            </div>
            <div className="text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Model Confidence:</span>
                <span className="font-mono font-bold text-slate-900">
                  {student.ml_confidence !== null && student.ml_confidence !== undefined
                    ? `${Math.round(student.ml_confidence * 100)}%`
                    : 'Not Evaluated'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {student.ml_reason || (student.ml_classification === 'SUSPICIOUS' 
                  ? 'Supervised model classified attributes as suspicious.' 
                  : 'Supervised model confirmed consistent genuine patterns.')}
              </p>
            </div>
          </div>

          {/* Verifier Action Panel */}
          {canVerify && (
            <div className="bg-slate-900 text-white p-5 rounded-xl shadow-md space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-blue-300">
                <UserCheck className="h-4 w-4" /> Academic Credential Audit
              </h4>
              <p className="text-[11px] text-slate-300">
                As an authorized auditor, you can review the ML signals, check supporting documents, and record official verification.
              </p>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Audit Notes / Reason</label>
                <textarea
                  rows={2}
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder="e.g. Verified with institution examination cell records..."
                  className="w-full bg-slate-800 text-white text-xs rounded border border-slate-700 p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => handleVerify('VERIFIED')}
                  disabled={isVerifying}
                  className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                >
                  <CheckCircle className="h-3.5 w-3.5" /> Verify Valid
                </button>
                <button
                  onClick={() => handleVerify('REJECTED')}
                  disabled={isVerifying}
                  className="py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                >
                  <XCircle className="h-3.5 w-3.5" /> Reject Record
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

