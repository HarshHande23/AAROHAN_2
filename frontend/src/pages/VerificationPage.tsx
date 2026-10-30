import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Search, 
  UserCheck, 
  Building2, 
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { verificationApi, studentsApi } from '../api';
import { Student } from '../types';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export const VerificationPage: React.FC = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'verified' | 'all'>('pending');

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const data = await studentsApi.getStudents({ page_size: 100 });
      setStudents(data.items);
    } catch (err) {
      console.error('Failed to load students for verification', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleVerify = async (studentId: number, status: 'VERIFIED' | 'REJECTED') => {
    setIsSubmitting(true);
    try {
      await verificationApi.verifyRecord(studentId, {
        status,
        notes: actionReason || (status === 'VERIFIED' ? 'Institutional verification passed' : 'Discrepancy identified in records')
      });
      setSelectedStudent(null);
      setActionReason('');
      await fetchRecords();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to update verification status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    const matchesSearch = 
      s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.apaar_id.includes(searchQuery) ||
      s.student_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.institution_name.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === 'pending') {
      return s.verification_status === 'PENDING' || s.verification_status === 'FLAGGED';
    }
    if (activeTab === 'verified') {
      return s.verification_status === 'VERIFIED';
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-emerald-400" />
            Verification Queue & Authorisation
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Audit and confirm student academic credentials submitted across institutions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchRecords}
            disabled={isLoading}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-2 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            to="/verify"
            target="_blank"
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow flex items-center gap-1.5 transition"
          >
            Public Verification Portal <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'pending'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            Pending Verification (
            {students.filter((s) => s.verification_status === 'PENDING' || s.verification_status === 'FLAGGED').length}
            )
          </button>
          <button
            onClick={() => setActiveTab('verified')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'verified'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Verified (
            {students.filter((s) => s.verification_status === 'VERIFIED').length}
            )
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'all'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Records ({students.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student, APAAR, college..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 pl-9 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
        </div>
      </div>

      {/* Table of Records */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Student & APAAR</th>
                <th className="py-3 px-4">Institution & Program</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Enrolment Flags</th>
                <th className="py-3 px-4">Verification Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No student records found matching the current verification filter.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{student.full_name}</div>
                      <div className="font-mono text-[11px] text-blue-400">APAAR: {student.apaar_id}</div>
                      <div className="text-[10px] text-slate-500 font-mono">ID: {student.student_id}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-200">{student.institution_name}</div>
                      <div className="text-[11px] text-slate-400">{student.degree_program}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {student.admission_category || 'GENERAL'}
                      </span>
                      {student.supernumerary_quota && student.supernumerary_quota !== 'None' && (
                        <div className="text-[10px] text-amber-400 mt-1">Supernumerary ({student.supernumerary_quota})</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        {student.is_cross_institution_duplicate && (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                            Cross-Inst Duplicate
                          </span>
                        )}
                        {student.is_excess_intake && (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                            Excess Enrolment
                          </span>
                        )}
                        {student.anomaly_status === 'ANOMALOUS' && (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800">
                            ML Anomaly
                          </span>
                        )}
                        {!student.is_cross_institution_duplicate && !student.is_excess_intake && student.anomaly_status !== 'ANOMALOUS' && (
                          <span className="text-[11px] text-emerald-400">Valid Intake</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          student.verification_status === 'VERIFIED'
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                            : student.verification_status === 'REJECTED'
                            ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                            : student.verification_status === 'FLAGGED'
                            ? 'bg-purple-950/80 text-purple-300 border-purple-800'
                            : 'bg-amber-950/80 text-amber-300 border-amber-800'
                        }`}
                      >
                        {student.verification_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/app/students/${student.id}`}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-medium border border-slate-700"
                        >
                          Details
                        </Link>
                        {student.verification_status !== 'VERIFIED' && (
                          <button
                            onClick={() => setSelectedStudent(student)}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-bold shadow-sm"
                          >
                            Verify / Review
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Verification Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-blue-400" />
                Review & Verify Record
              </h3>
              <button
                onClick={() => setSelectedStudent(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Student Name:</span>
                <span className="font-bold text-white">{selectedStudent.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">APAAR ID:</span>
                <span className="font-mono text-blue-400 font-bold">{selectedStudent.apaar_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Student ID:</span>
                <span className="font-mono text-slate-200">{selectedStudent.student_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Institution:</span>
                <span className="text-slate-200">{selectedStudent.institution_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Program:</span>
                <span className="text-slate-200">{selectedStudent.degree_program}</span>
              </div>
              {selectedStudent.is_cross_institution_duplicate && (
                <div className="p-2 bg-rose-950/60 border border-rose-800 rounded text-rose-300 text-[11px] font-semibold">
                  Notice: System detected cross-institution duplicate enrolment matching another college.
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Verification Notes / Justification:
              </label>
              <textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Enter audit remarks or committee verification reference..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 h-20"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg text-xs"
              >
                Cancel
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleVerify(selectedStudent.id, 'REJECTED')}
                  className="px-4 py-2 bg-rose-700 hover:bg-rose-600 disabled:opacity-50 text-white font-bold rounded-lg text-xs"
                >
                  Reject Record
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleVerify(selectedStudent.id, 'VERIFIED')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-lg text-xs"
                >
                  Confirm & Mark Verified
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
