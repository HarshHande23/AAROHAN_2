import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { Bell, Shield, LogOut, ChevronDown, CheckCircle2 } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, switchRole, logout } = useAuth();

  const roleOptions: { role: UserRole; label: string; badge: string }[] = [
    { role: 'AICTE_ADMIN', label: 'AICTE Admin', badge: 'Apex National Admin' },
    { role: 'COLLEGE_ADMIN', label: 'College Admin', badge: 'Institution Lead' },
    { role: 'ADMISSION_STAFF', label: 'Admission Staff', badge: 'Enrolment Officer' },
    { role: 'AUTHORIZED_VERIFIER', label: 'Authorized Verifier', badge: 'Credential Auditor' },
  ];

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    switchRole(e.target.value as UserRole);
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
      {/* Top Gov Tricolor Accent Bar */}
      <div className="h-1 bg-gradient-to-r from-orange-500 via-white to-emerald-600" />
      
      <div className="px-6 py-2.5 flex items-center justify-between">
        {/* Portal Breadcrumb / Scope */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Official Portal • Ministry of Education & AICTE
            </span>
          </div>
          <span className="text-slate-300">|</span>
          <span className="text-xs text-slate-600 font-medium hidden sm:inline">
            Automated Permanent Academic Account Registry (APAAR) • PS2
          </span>
        </div>

        {/* User Controls & Interactive Role Switcher */}
        <div className="flex items-center gap-4">
          {/* Interactive Role Switcher for instant evaluator testing */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
            <Shield className="h-3.5 w-3.5 text-blue-700" />
            <span className="text-slate-500 font-medium">Role:</span>
            <select
              value={user?.role || 'AICTE_ADMIN'}
              onChange={handleRoleChange}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer text-xs pr-1"
              title="Switch role to test access boundaries"
            >
              {roleOptions.map((opt) => (
                <option key={opt.role} value={opt.role}>
                  {opt.label} ({opt.badge})
                </option>
              ))}
            </select>
          </div>

          {/* User Badge */}
          <div className="flex items-center gap-2.5 border-l border-slate-200 pl-3">
            <div className="h-8 w-8 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
              {user?.full_name ? user.full_name.charAt(0) : 'U'}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-900 leading-tight">
                {user?.full_name || 'System User'}
              </span>
              <span className="text-[10px] text-slate-500">
                {user?.institution_name || 'AICTE National Directorate'}
              </span>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={logout}
            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
            title="Log Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

