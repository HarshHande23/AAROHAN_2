import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Building2, 
  Award, 
  FileCheck2, 
  Cpu, 
  ArrowRight, 
  CheckCircle2, 
  Layers, 
  Database, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Fingerprint
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top AICTE Gov Bar */}
      <div className="bg-slate-900 border-b border-slate-800 text-xs py-2 px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="bg-blue-600 text-white font-bold px-2 py-0.5 rounded text-[10px] tracking-wider">
              GOVERNMENT OF INDIA
            </span>
            <span className="text-slate-400 font-medium">
              Ministry of Education • All India Council for Technical Education (AICTE)
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>APAAR Academic Identity Framework (NEP 2020)</span>
            <span className="text-slate-600">|</span>
            <Link to="/verify" className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1">
              Public Credential Verification <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation Header */}
      <header className="bg-slate-900/80 backdrop-blur sticky top-0 z-50 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-700 to-indigo-800 flex items-center justify-center text-white shadow-lg font-black text-xl tracking-wider border border-blue-500/30">
              AP
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-extrabold tracking-tight text-white">APAAR-AICTE</span>
                <span className="text-[10px] bg-blue-900/80 text-blue-300 border border-blue-600/60 font-bold px-2 py-0.5 rounded-full">
                  SIH PS2 PLATFORM
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                National Student Data Management & Verification Portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/verify"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5"
            >
              <Fingerprint className="h-4 w-4 text-emerald-400" />
              Verify Credential
            </Link>
            <Link
              to="/access-portal"
              className="px-5 py-2.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-900/30 transition flex items-center gap-2"
            >
              Access Portal
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-6 bg-gradient-to-b from-slate-900/60 to-slate-950">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-950/80 border border-blue-800/80 text-blue-300 text-xs font-semibold">
                <ShieldCheck className="h-4 w-4 text-blue-400" />
                Problem Statement 2: AICTE-Approved Institutions Enrolment
              </div>
              
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white leading-tight">
                National APAAR-Based Student Data Management & Verification Platform
              </h1>
              
              <p className="text-base text-slate-300 leading-relaxed max-w-2xl">
                A unified, authenticated digital platform enabling AICTE-approved institutions to securely submit student-level data after admissions, continuously monitor approved intake quotas, detect cross-institution duplicate enrolments, and issue verifiable credentials linked to the national APAAR ID.
              </p>

              <div className="flex flex-wrap gap-4 pt-2">
                <Link
                  to="/access-portal"
                  className="px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-900/40 flex items-center gap-2.5 transition"
                >
                  Enter Institutional Gateway
                  <ChevronRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/verify"
                  className="px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm rounded-xl border border-slate-700 flex items-center gap-2.5 transition"
                >
                  <Fingerprint className="h-4 w-4 text-emerald-400" />
                  Public Verification Portal
                </Link>
              </div>

              {/* High-level trust badges */}
              <div className="pt-6 grid grid-cols-3 gap-4 border-t border-slate-800/80">
                <div>
                  <div className="text-xl font-black text-blue-400">12-Digit</div>
                  <div className="text-xs text-slate-400">APAAR National Identity</div>
                </div>
                <div>
                  <div className="text-xl font-black text-emerald-400">Real-Time</div>
                  <div className="text-xs text-slate-400">Intake & Excess Monitoring</div>
                </div>
                <div>
                  <div className="text-xl font-black text-amber-400">ML + Rules</div>
                  <div className="text-xs text-slate-400">Unbiased Anomaly Detection</div>
                </div>
              </div>
            </div>

            {/* Architecture Card */}
            <div className="lg:col-span-5">
              <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-2xl relative">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      National Data Pipeline
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">NEP-2020 Standard</span>
                </div>

                <div className="mt-5 space-y-3 font-mono text-xs">
                  <div className="p-3 rounded-lg bg-slate-800/70 border border-slate-700/60 flex items-center justify-between">
                    <span className="text-slate-300 font-sans font-semibold">1. Institution Submission</span>
                    <span className="text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded text-[11px]">CSV / API / Manual</span>
                  </div>

                  <div className="text-center text-slate-600">↓</div>

                  <div className="p-3 rounded-lg bg-slate-800/70 border border-slate-700/60 flex items-center justify-between">
                    <span className="text-slate-300 font-sans font-semibold">2. Automated Validation</span>
                    <span className="text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded text-[11px]">8 Core Deterministic Rules</span>
                  </div>

                  <div className="text-center text-slate-600">↓</div>

                  <div className="p-3 rounded-lg bg-slate-800/70 border border-slate-700/60 flex items-center justify-between">
                    <span className="text-slate-300 font-sans font-semibold">3. Duplicate & Intake Audit</span>
                    <span className="text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded text-[11px]">Cross-Institution Check</span>
                  </div>

                  <div className="text-center text-slate-600">↓</div>

                  <div className="p-3 rounded-lg bg-slate-800/70 border border-slate-700/60 flex items-center justify-between">
                    <span className="text-slate-300 font-sans font-semibold">4. Isolation Forest ML</span>
                    <span className="text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded text-[11px]">Flags For Review Only</span>
                  </div>

                  <div className="text-center text-slate-600">↓</div>

                  <div className="p-3 rounded-lg bg-blue-900/40 border border-blue-700/60 flex items-center justify-between">
                    <span className="text-blue-200 font-sans font-bold">5. Verifiable Record & QR</span>
                    <span className="text-white bg-blue-600 px-2 py-0.5 rounded text-[11px] font-bold">AICTE Central Registry</span>
                  </div>
                </div>

                <div className="mt-5 p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 leading-normal">
                  <span className="text-emerald-400 font-bold">Zero-Simulation Policy:</span> Real SQLite central repository, active scikit-learn models, live quota arithmetic, and cryptographically verified public credential proofs.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core SIH Capabilities Grid */}
      <section className="py-20 px-6 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-blue-400">
            Mandate & Capabilities
          </span>
          <h2 className="text-3xl font-black text-white mt-2">
            Engineered for AICTE Regulatory Precision
          </h2>
          <p className="text-sm text-slate-400 mt-3">
            Every module addresses specific criteria from Problem Statement 2 to replace fragmented statistical reports with student-level verifiable truth.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-slate-900/70 border border-slate-800 p-6 rounded-2xl hover:border-slate-700 transition">
            <div className="h-10 w-10 rounded-lg bg-blue-900/60 border border-blue-700 flex items-center justify-center text-blue-400 mb-4">
              <Building2 className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Approved Intake vs Actual Enrolment</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Program-by-program intake caps tracked against actual student enrolment. Automatically detects excess admissions exceeding approved quotas.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-slate-900/70 border border-slate-800 p-6 rounded-2xl hover:border-slate-700 transition">
            <div className="h-10 w-10 rounded-lg bg-emerald-900/60 border border-emerald-700 flex items-center justify-center text-emerald-400 mb-4">
              <Layers className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Supernumerary & Category Tracking</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Full tracking for NRI categories, OCI status, Foreign National (FN) candidates, and approved Supernumerary quotas without mixing with regular intake.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-slate-900/70 border border-slate-800 p-6 rounded-2xl hover:border-slate-700 transition">
            <div className="h-10 w-10 rounded-lg bg-amber-900/60 border border-amber-700 flex items-center justify-center text-amber-400 mb-4">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Cross-Institution Duplicates</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Multi-identifier matching checks for duplicate enrolment across institutions. Flags records for committee review without destructive deletion.
            </p>
          </div>

          {/* Card 4 */}
          <div className="bg-slate-900/70 border border-slate-800 p-6 rounded-2xl hover:border-slate-700 transition">
            <div className="h-10 w-10 rounded-lg bg-purple-900/60 border border-purple-700 flex items-center justify-center text-purple-400 mb-4">
              <Cpu className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Ethical ML Anomaly Detection</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Trained scikit-learn Isolation Forest identifies statistical outliers without accusing fraud or making automated destructive data edits.
            </p>
          </div>

          {/* Card 5 */}
          <div className="bg-slate-900/70 border border-slate-800 p-6 rounded-2xl hover:border-slate-700 transition">
            <div className="h-10 w-10 rounded-lg bg-rose-900/60 border border-rose-700 flex items-center justify-center text-rose-400 mb-4">
              <Award className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Verifiable Credential Records</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Generates official credentials pairing the 12-digit APAAR ID with institutional Student ID, certificate numbers, verification hashes, and QR codes.
            </p>
          </div>

          {/* Card 6 */}
          <div className="bg-slate-900/70 border border-slate-800 p-6 rounded-2xl hover:border-slate-700 transition">
            <div className="h-10 w-10 rounded-lg bg-cyan-900/60 border border-cyan-700 flex items-center justify-center text-cyan-400 mb-4">
              <Database className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Unified Ingestion Pipeline</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Direct API integrations, CSV batch uploads, and manual institutional entries pass through the identical central verification engine.
            </p>
          </div>
        </div>
      </section>

      {/* Stakeholder Call to Action */}
      <section className="bg-slate-900 py-16 px-6 border-t border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h3 className="text-2xl font-black text-white">Ready to proceed to your authorized role?</h3>
            <p className="text-sm text-slate-400 mt-1">
              Select your organization node or verify an existing student credential.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/verify"
              className="px-5 py-3 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              Public Verification
            </Link>
            <Link
              to="/access-portal"
              className="px-6 py-3 text-xs font-extrabold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/40 transition"
            >
              Access Portal
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 px-6 bg-slate-950 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            © 2026 AICTE National APAAR Registry Platform. All rights reserved. Built for Smart India Hackathon PS2.
          </div>
          <div className="flex items-center gap-4">
            <Link to="/verify" className="hover:text-slate-300">Public Verification</Link>
            <span>•</span>
            <Link to="/access-portal" className="hover:text-slate-300">Portal Gateways</Link>
            <span>•</span>
            <Link to="/login" className="hover:text-slate-300">Institutional Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
