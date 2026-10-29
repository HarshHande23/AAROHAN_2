import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { ShieldCheck, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState<string>('admin@aicte.gov.in');
  const [password, setPassword] = useState<string>('Admin@1234');
  const [selectedRole, setSelectedRole] = useState<UserRole>('AICTE_ADMIN');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const presetRoles: { role: UserRole; email: string; label: string; desc: string }[] = [
    { role: 'AICTE_ADMIN', email: 'admin@aicte.gov.in', label: 'AICTE Admin', desc: 'Apex national audit access' },
    { role: 'COLLEGE_ADMIN', email: 'admin@iitd.ac.in', label: 'College Admin', desc: 'Institution management' },
    { role: 'ADMISSION_STAFF', email: 'admissions@iitd.ac.in', label: 'Admission Staff', desc: 'Student onboarding & bulk import' },
    { role: 'AUTHORIZED_VERIFIER', email: 'verifier@tcs.com', label: 'Authorized Verifier', desc: 'External verification officer' },
  ];

  const handlePresetSelect = (preset: typeof presetRoles[0]) => {
    setSelectedRole(preset.role);
    setEmail(preset.email);
    setPassword('Admin@1234');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await login(email, password, selectedRole);
      navigate('/');
    } catch (err: any) {
      console.error("Login failed:", err);
      setError(err?.response?.data?.detail || "Invalid credentials or unauthorized role.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Subtle Gradient */}
      <div className="absolute inset-0 bg-radial from-blue-900/30 via-slate-900 to-slate-950 pointer-events-none" />

      {/* Top Gov Banner Accent */}
      <div className="fixed top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-500 via-white to-emerald-600" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Emblem & Portal Title */}
        <div className="text-center">
          <div className="inline-flex h-14 w-14 rounded-xl bg-blue-700 text-white items-center justify-center font-extrabold text-2xl shadow-lg border border-blue-500/30 mb-3">
            AP
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            APAAR • National Registry
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Automated Permanent Academic Account Registry • Problem Statement 2
          </p>
        </div>

        {/* Login Box */}
        <div className="mt-6 bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          {/* Quick-Select Demo Roles */}
          <div className="mb-6">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Select User Role Profile:
            </span>
            <div className="grid grid-cols-2 gap-2">
              {presetRoles.map((preset) => (
                <button
                  key={preset.role}
                  type="button"
                  onClick={() => handlePresetSelect(preset)}
                  className={`p-2 rounded-lg text-left border text-xs transition ${
                    selectedRole === preset.role
                      ? 'bg-blue-700/30 border-blue-500 text-white font-semibold'
                      : 'bg-slate-900/40 border-slate-700/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <p className="font-semibold text-white leading-tight">{preset.label}</p>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">{preset.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 bg-blue-700 hover:bg-blue-600 text-white rounded-lg font-semibold shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 text-xs"
            >
              <ShieldCheck className="h-4 w-4" />
              {isLoading ? 'Verifying Credentials...' : `Sign In as ${selectedRole.replace(/_/g, ' ')}`}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-700/60 text-center text-[11px] text-slate-500">
            Protected under IT Act, 2000 & Ministry of Education Cybersecurity Guidelines.
          </div>
        </div>
      </div>
    </div>
  );
};

