import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  GraduationCap, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  Plus, 
  Layers, 
  Search,
  ExternalLink
} from 'lucide-react';
import { intakesApi } from '../api';
import { ProgramIntake } from '../types';

export const InstitutionsPage: React.FC = () => {
  const [intakes, setIntakes] = useState<ProgramIntake[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchIntakes = async () => {
      setIsLoading(true);
      try {
        const data = await intakesApi.getIntakes();
        setIntakes(data);
      } catch (err) {
        console.error('Failed to load institution intakes', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchIntakes();
  }, []);

  const totalApproved = intakes.reduce((sum, item) => sum + item.approved_intake, 0);
  const totalEnrolled = intakes.reduce((sum, item) => sum + item.actual_enrolment, 0);
  const totalExcess = intakes.reduce((sum, item) => sum + item.excess_enrolment, 0);
  const totalSupernumerary = intakes.reduce((sum, item) => sum + item.supernumerary_seats, 0);

  const filteredIntakes = intakes.filter((i) =>
    (i.institution_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (i.institution_code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (i.program_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Building2 className="h-6 w-6 text-blue-400" />
            Approved Institutions & Program Intake Capacities
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Official AICTE-sanctioned intake quotas vs real-time student enrolments across participating colleges.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Approved Total Intake</span>
            <GraduationCap className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2 font-mono">{totalApproved}</div>
          <div className="text-[11px] text-slate-500 mt-1">Sanctioned seats across programs</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Actual Enrolment</span>
            <Users className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-2 font-mono">{totalEnrolled}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {totalApproved > 0 ? `${((totalEnrolled / totalApproved) * 100).toFixed(1)}% Capacity Used` : '0%'}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Excess Admissions</span>
            <AlertTriangle className="h-4 w-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400 mt-2 font-mono">{totalExcess}</div>
          <div className="text-[11px] text-rose-400/80 mt-1">
            {totalExcess > 0 ? 'Exceeding approved quota' : 'Zero quota violations'}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Supernumerary Seats</span>
            <Layers className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 mt-2 font-mono">{totalSupernumerary}</div>
          <div className="text-[11px] text-slate-500 mt-1">Approved NRI / TFW / Foreign quota</div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by college name, code, or program..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 pl-9 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
        </div>
        <div className="text-xs text-slate-400 font-mono">
          Showing {filteredIntakes.length} program intakes
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Institution Name & Code</th>
                <th className="py-3 px-4">Degree Program</th>
                <th className="py-3 px-4 text-right">Sanctioned Intake</th>
                <th className="py-3 px-4 text-right">Actual Enrolment</th>
                <th className="py-3 px-4 text-right">Supernumerary</th>
                <th className="py-3 px-4">Intake Utilization</th>
                <th className="py-3 px-4 text-center">Regulatory Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredIntakes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No approved institution intakes found.
                  </td>
                </tr>
              ) : (
                filteredIntakes.map((intake) => {
                  const utilization = intake.approved_intake > 0 
                    ? Math.round((intake.actual_enrolment / intake.approved_intake) * 100) 
                    : 0;
                  const isExcess = intake.actual_enrolment > intake.approved_intake;

                  return (
                    <tr key={intake.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{intake.institution_name}</div>
                        <div className="text-[10px] font-mono text-slate-400">Code: {intake.institution_code}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-200">{intake.program_name}</div>
                        <div className="text-[10px] text-slate-500">AY: {intake.academic_year}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-white">
                        {intake.approved_intake}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                        {intake.actual_enrolment}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-amber-400">
                        {intake.supernumerary_seats}
                      </td>
                      <td className="py-3 px-4">
                        <div className="w-full bg-slate-800 rounded-full h-2 mb-1 overflow-hidden">
                          <div
                            className={`h-2 rounded-full ${
                              isExcess
                                ? 'bg-rose-500'
                                : utilization > 90
                                ? 'bg-amber-400'
                                : 'bg-blue-500'
                            }`}
                            style={{ width: `${Math.min(utilization, 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          {utilization}% Filled
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isExcess ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                            <AlertTriangle className="h-3 w-3" />
                            Excess (+{intake.excess_enrolment})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                            <CheckCircle className="h-3 w-3" />
                            Compliant
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
