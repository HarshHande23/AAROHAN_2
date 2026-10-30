import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Building, 
  School, 
  ShieldCheck, 
  Search, 
  ArrowRight, 
  CheckCircle, 
  ChevronLeft 
} from 'lucide-react';

export const AccessPortalPage: React.FC = () => {
  const navigate = useNavigate();

  const portals = [
    {
      id: 'aicte',
      title: 'AICTE Administration Portal',
      badge: 'Apex Regulatory Gateway',
      description: 'National overview, institutional intake audits, cross-institution duplicate review, and statutory compliance generation.',
      icon: Building,
      presetEmail: 'admin@aicte.gov.in',
      presetRole: 'AICTE Central Officer',
      color: 'blue',
      features: [
        'National intake utilization monitoring',
        'Excess admission threshold alerts',
        'Cross-institution duplicate review',
        'Statutory AICTE CSV & PDF reporting'
      ]
    },
    {
      id: 'institution',
      title: 'Approved Institution Portal',
      badge: 'Institution Admission Node',
      description: 'Submit post-admission student records via CSV, manual entry or REST API, track program quotas, and manage credentials.',
      icon: School,
      presetEmail: 'dean@coep.ac.in',
      presetRole: 'COEP Technological University',
      color: 'emerald',
      features: [
        '3-in-1 data submission channels (CSV/Manual/API)',
        'Approved vs enrolled intake validation',
        'Supernumerary, NRI, OCI, and FN categorisation',
        'Batch validation & safe auto-correction review'
      ]
    },
    {
      id: 'verifier',
      title: 'Authorized Verification Agency',
      badge: 'Accreditation & Employer Node',
      description: 'Audit institution records, verify student credentials, and log cryptographically attested verification findings.',
      icon: ShieldCheck,
      presetEmail: 'audit@verif.org',
      presetRole: 'Independent Regulatory Auditor',
      color: 'purple',
      features: [
        'Dedicated student verification queue',
        'Direct APAAR ID & Certificate validation',
        'Cryptographic verification hash logging',
        'Read-only compliance and audit access'
      ]
    },
    {
      id: 'public',
      title: 'Public Credential Verification',
      badge: 'Zero-Login Public Search',
      description: 'Instant verification for employers and public stakeholders searching by APAAR ID, Student ID, or Certificate Number.',
      icon: Search,
      isPublic: true,
      path: '/verify',
      color: 'cyan',
      features: [
        'No credentials or authentication required',
        'Masked personal identifiable information',
        'Real-time AICTE central database lookup',
        'Verifiable certificate status confirmation'
      ]
    }
  ];

  const handleSelectPortal = (portal: typeof portals[0]) => {
    if (portal.isPublic && portal.path) {
      navigate(portal.path);
    } else {
      navigate('/login', { state: { presetEmail: portal.presetEmail } });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-slate-900 border-b border-slate-800 py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-slate-300 hover:text-white text-xs font-semibold">
            <ChevronLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-blue-700 flex items-center justify-center text-white font-bold text-xs">
              AP
            </div>
            <span className="font-extrabold text-sm text-white tracking-wide">
              APAAR-AICTE Portal Selection
            </span>
          </div>
          <Link to="/verify" className="text-xs text-blue-400 hover:text-blue-300 font-medium">
            Direct Verification →
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-16 flex-1 w-full">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
            Access Management Gateway
          </span>
          <h1 className="text-3xl font-black text-white mt-2">
            Select Your Designated Access Portal
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Choose your authorized organizational portal below to proceed with data submission, statutory monitoring, or credential verification.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {portals.map((portal) => {
            const Icon = portal.icon;
            return (
              <div
                key={portal.id}
                onClick={() => handleSelectPortal(portal)}
                className="bg-slate-900/80 border border-slate-800 hover:border-blue-600/60 p-7 rounded-2xl flex flex-col justify-between cursor-pointer transition group hover:shadow-xl hover:shadow-blue-900/10"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-blue-400 group-hover:text-blue-300 group-hover:bg-blue-900/30 transition">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                      {portal.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-blue-300 transition">
                    {portal.title}
                  </h3>
                  
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    {portal.description}
                  </p>

                  <div className="mt-6 pt-5 border-t border-slate-800/80 space-y-2">
                    {portal.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-4 flex items-center justify-between text-xs font-bold text-blue-400 group-hover:text-blue-300">
                  <span>
                    {portal.isPublic ? 'Open Public Verification' : 'Proceed to Authenticated Login'}
                  </span>
                  <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition" />
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-6 bg-slate-950 border-t border-slate-900 text-center text-xs text-slate-500">
        AICTE National Student Registry • Secured with Role-Based Access Control & Audit Trails
      </footer>
    </div>
  );
};
