import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ArrowLeft, 
  Building2, 
  Award, 
  Calendar, 
  Hash, 
  QrCode, 
  Lock, 
  ExternalLink 
} from 'lucide-react';
import { verificationApi } from '../api';
import { PublicVerificationResult } from '../types';

export const PublicVerificationPage: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [verifierName, setVerifierName] = useState('');
  const [verifierOrganization, setVerifierOrganization] = useState('');
  const [purpose, setPurpose] = useState('Employment Verification');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PublicVerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);
    setHasSearched(true);

    try {
      const data = await verificationApi.publicVerify(identifier.trim());
      setResult(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'An error occurred while connecting to the AICTE verification registry.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 py-4 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white text-xs font-semibold">
            <ArrowLeft className="h-4 w-4" />
            Return to Home
          </Link>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-blue-700 flex items-center justify-center text-white font-bold text-xs">
              AP
            </div>
            <span className="font-extrabold text-sm text-white tracking-wide">
              AICTE Public Verification Portal
            </span>
          </div>
          <Link to="/access-portal" className="text-xs text-blue-400 hover:text-blue-300 font-semibold">
            Institutional Login →
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-6 py-12 flex-1 w-full">
        {/* Title & Trust Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 text-xs font-bold mb-3">
            <ShieldCheck className="h-4 w-4" />
            AICTE Authenticated Credential Gateway
          </div>
          <h1 className="text-3xl font-black text-white">
            Verify Student Academic Identity
          </h1>
          <p className="text-xs text-slate-400 mt-2 max-w-xl mx-auto">
            Authorized employers, government agencies, and higher education institutions can independently verify student credentials linked to their 12-digit APAAR ID.
          </p>
        </div>

        {/* Search Box Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl mb-8">
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Enter APAAR ID, Student ID, or Certificate Number *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. 123456789012 (APAAR) or STU2024-001 or CERT-2024-001"
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3.5 pl-11 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
                />
                <Search className="absolute left-4 top-4 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Verifier Name (Optional)
                </label>
                <input
                  type="text"
                  value={verifierName}
                  onChange={(e) => setVerifierName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Organization / Company (Optional)
                </label>
                <input
                  type="text"
                  value={verifierOrganization}
                  onChange={(e) => setVerifierOrganization(e.target.value)}
                  placeholder="e.g. Tata Consultancy Services"
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Purpose of Verification
                </label>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Employment Verification">Employment Verification</option>
                  <option value="Higher Education Admission">Higher Education Admission</option>
                  <option value="Visa & Immigration">Visa & Immigration</option>
                  <option value="Regulatory Audit">Regulatory Audit</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <Lock className="h-3 w-3 text-slate-400" />
                In accordance with AICTE privacy regulations, personal identifiers are safely masked.
              </span>
              <button
                type="submit"
                disabled={isLoading || !identifier.trim()}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2"
              >
                {isLoading ? 'Verifying Registry...' : 'Verify Credential'}
              </button>
            </div>
          </form>
        </div>

        {/* Verification Result Card */}
        {error && (
          <div className="bg-rose-950/40 border border-rose-800/80 rounded-2xl p-6 mb-8 text-rose-200">
            <div className="flex items-center gap-3">
              <XCircle className="h-6 w-6 text-rose-400 shrink-0" />
              <div>
                <h3 className="font-bold text-sm text-white">Verification Failed</h3>
                <p className="text-xs text-rose-300 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {hasSearched && result && (
          <div className="space-y-6">
            {result.verified ? (
              <div className="bg-slate-900 border border-emerald-800/60 rounded-2xl overflow-hidden shadow-2xl">
                {/* Status Bar */}
                <div className="bg-emerald-950/80 border-b border-emerald-800/60 p-5 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-600 flex items-center justify-center text-white">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                        Official Academic Record Verified
                        <span className="text-[10px] bg-emerald-900 text-emerald-300 px-2 py-0.5 rounded font-bold border border-emerald-700">
                          AICTE RECOGNISED
                        </span>
                      </h2>
                      <p className="text-xs text-emerald-300/80">
                        {result.message}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <span className="text-slate-400">Registry Status: </span>
                    <span className="font-mono text-emerald-300 font-bold">{result.verification_status || 'VERIFIED'}</span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Student Full Name (Privacy Masked)
                      </span>
                      <p className="text-lg font-bold text-white font-mono">{result.student_name || 'STUDENT RECORD'}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          APAAR ID
                        </span>
                        <p className="text-sm font-bold text-blue-400 font-mono">{result.apaar_id}</p>
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Student ID
                        </span>
                        <p className="text-sm font-bold text-slate-200 font-mono">{result.student_id}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Certificate Number
                      </span>
                      <p className="text-sm font-mono text-amber-300 font-semibold">
                        {result.certificate_number || 'N/A (Provisional Admission)'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Academic Program
                      </span>
                      <p className="text-sm font-semibold text-slate-200">
                        {result.degree_program || 'Engineering & Technology'}
                      </p>
                      <p className="text-xs text-slate-400">Academic Year: {result.academic_year || '2024-2025'}</p>
                    </div>
                  </div>

                  <div className="space-y-4 bg-slate-950/60 p-5 rounded-xl border border-slate-800/80">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Awarding / Enrolled Institution
                      </span>
                      <p className="text-sm font-bold text-white">
                        {result.institution_name}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/60">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Verification Security Hash
                      </span>
                      <p className="text-xs font-mono text-emerald-400 break-all bg-slate-900 p-2 rounded border border-slate-800">
                        {result.verification_code || 'SHA256:AUTHENTIC-RECORD'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <div className="p-2 bg-white rounded-lg">
                        <QrCode className="h-10 w-10 text-slate-950" />
                      </div>
                      <div className="text-xs text-slate-400">
                        <p className="font-semibold text-slate-300">Digital Seal Active</p>
                        <p className="text-[11px]">Valid AICTE Central Repository Record</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900 border border-amber-800/60 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <AlertTriangle className="h-7 w-7 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-extrabold text-base text-white">Record Not Found in National Registry</h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {result.message}
                    </p>
                    <p className="text-xs text-slate-400 mt-2">
                      Please double-check the 12-digit APAAR ID or certificate number. If this is a newly admitted student, their institution may still be completing post-admission data verification.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 px-6 bg-slate-950 border-t border-slate-900 text-center text-xs text-slate-500">
        AICTE National Student Registry Public Verification Gateway • Built for Smart India Hackathon PS2
      </footer>
    </div>
  );
};
