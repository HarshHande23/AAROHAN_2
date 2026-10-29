import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  UploadCloud, 
  CheckCircle, 
  AlertTriangle, 
  FileText, 
  History, 
  Cpu, 
  ShieldCheck,
  Building2
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();

  const navItems = [
    {
      to: '/',
      label: 'Dashboard',
      icon: LayoutDashboard,
      description: 'System overview & live metrics',
      roles: ['AICTE_ADMIN', 'COLLEGE_ADMIN', 'ADMISSION_STAFF', 'AUTHORIZED_VERIFIER'],
    },
    {
      to: '/students',
      label: 'Student Enrolments',
      icon: Users,
      description: 'Enrolment registry & records',
      roles: ['AICTE_ADMIN', 'COLLEGE_ADMIN', 'ADMISSION_STAFF', 'AUTHORIZED_VERIFIER'],
    },
    {
      to: '/bulk-import',
      label: 'Bulk Import',
      icon: UploadCloud,
      description: 'Batch CSV/Excel ingestion',
      roles: ['AICTE_ADMIN', 'COLLEGE_ADMIN', 'ADMISSION_STAFF'],
    },
    {
      to: '/validation-duplicates',
      label: 'Validation & Duplicates',
      icon: CheckCircle,
      description: 'Deterministic rules & duplicates',
      roles: ['AICTE_ADMIN', 'COLLEGE_ADMIN', 'ADMISSION_STAFF'],
    },
    {
      to: '/alerts-anomalies',
      label: 'Alerts & Anomalies',
      icon: AlertTriangle,
      description: 'Isolation Forest & ML flags',
      roles: ['AICTE_ADMIN', 'COLLEGE_ADMIN', 'ADMISSION_STAFF', 'AUTHORIZED_VERIFIER'],
    },
    {
      to: '/reports',
      label: 'Compliance Reports',
      icon: FileText,
      description: 'Real audit & statutory reports',
      roles: ['AICTE_ADMIN', 'COLLEGE_ADMIN', 'AUTHORIZED_VERIFIER'],
    },
    {
      to: '/audit-logs',
      label: 'Audit Trail',
      icon: History,
      description: 'Immutable system action logs',
      roles: ['AICTE_ADMIN', 'COLLEGE_ADMIN'],
    },
    {
      to: '/ml-status',
      label: 'ML Models & Status',
      icon: Cpu,
      description: 'Artifacts, metrics & retraining',
      roles: ['AICTE_ADMIN'],
    },
  ];

  const currentRole = user?.role || 'AICTE_ADMIN';

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col shrink-0 min-h-screen border-r border-slate-800">
      {/* Brand & Crest Header */}
      <div className="p-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-700 flex items-center justify-center text-white shadow-md font-extrabold text-lg tracking-wider border border-blue-500/30">
            AP
          </div>
          <div>
            <h1 className="font-extrabold text-sm text-white tracking-wide flex items-center gap-1.5">
              APAAR PS2
              <span className="text-[10px] bg-blue-900 text-blue-300 font-semibold px-1.5 py-0.5 rounded border border-blue-700">
                AICTE
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 font-medium leading-tight">
              Academic Verification Platform
            </p>
          </div>
        </div>
      </div>

      {/* Role Context Chip */}
      <div className="px-4 py-3 mx-3 my-3 bg-slate-800/60 rounded-lg border border-slate-700/50 flex items-center gap-2.5">
        <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
        <div className="overflow-hidden">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Role</p>
          <p className="text-xs font-semibold text-white truncate">
            {currentRole.replace(/_/g, ' ')}
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isAllowed = item.roles.includes(currentRole);
          if (!isAllowed) return null;

          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition group ${
                  isActive
                    ? 'bg-blue-700 text-white font-semibold shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0 transition" />
              <div className="flex flex-col">
                <span>{item.label}</span>
              </div>
            </NavLink>
          );
        })}
      </nav>

      {/* Institutional Footer Info */}
      <div className="p-4 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-2">
        <Building2 className="h-4 w-4 text-slate-500 shrink-0" />
        <div className="truncate">
          <p className="font-semibold text-slate-300 truncate">
            {user?.institution_code ? `Node: ${user.institution_code}` : 'Central Node: AICTE-HQ'}
          </p>
          <p className="text-[10px] text-slate-500">Security Standard: PS2-Gov</p>
        </div>
      </div>
    </aside>
  );
};

