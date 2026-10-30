import React, { useState, useEffect } from 'react';
import { 
  Award, 
  Search, 
  Printer, 
  Download, 
  QrCode, 
  ShieldCheck, 
  CheckCircle2, 
  ExternalLink,
  Building2,
  Calendar,
  Hash,
  UserCheck
} from 'lucide-react';
import { credentialsApi, studentsApi } from '../api';
import { Credential, Student } from '../types';

export const CredentialsPage: React.FC = () => {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCredential, setSelectedCredential] = useState<Credential | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [credsData, studentsData] = await Promise.all([
          credentialsApi.getCredentials(),
          studentsApi.getStudents({ page_size: 100 })
        ]);
        setCredentials(credsData);
        setStudents(studentsData.items);
        if (credsData.length > 0) {
          setSelectedCredential(credsData[0]);
        }
      } catch (err) {
        console.error('Failed to load credentials', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const filteredCredentials = credentials.filter((c) =>
    (c.student_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.apaar_id || '').includes(searchQuery) ||
    String(c.student_id).toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.certificate_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.institution_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Award className="h-6 w-6 text-blue-400" />
            Verifiable Academic Credentials & Certificates
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Display and print APAAR ID paired with institutional Student ID on degree certificates as mandated by AICTE.
          </p>
        </div>

        {selectedCredential && (
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow flex items-center gap-2 transition"
          >
            <Printer className="h-4 w-4" />
            Print / Save Certificate
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Selector List */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="relative mb-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search credential by name, APAAR..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 pl-9 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            </div>

            <div className="max-h-[600px] overflow-y-auto space-y-2 pr-1">
              {filteredCredentials.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">
                  {isLoading ? 'Loading credentials...' : 'No credentials issued yet. Ingest and verify student records to generate verifiable certificates.'}
                </div>
              ) : (
                filteredCredentials.map((cred) => {
                  const isSelected = selectedCredential?.credential_id === cred.credential_id;
                  return (
                    <div
                      key={cred.credential_id}
                      onClick={() => setSelectedCredential(cred)}
                      className={`p-3 rounded-lg border text-xs cursor-pointer transition ${
                        isSelected
                          ? 'bg-blue-900/30 border-blue-500 text-white'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{cred.student_name}</span>
                        <span className="text-[10px] font-mono bg-blue-950 text-blue-300 px-1.5 py-0.5 rounded border border-blue-800">
                          {cred.apaar_id}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                        <span>Cert: {cred.certificate_number}</span>
                        <span>ID: #{cred.student_id}</span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500 truncate">
                        {cred.institution_name}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Certificate Preview */}
        <div className="lg:col-span-7">
          {selectedCredential ? (
            <div className="bg-white text-slate-900 rounded-2xl shadow-2xl p-8 border-4 border-double border-slate-300 relative overflow-hidden print:p-0 print:border-none print:shadow-none">
              {/* Certificate Border Watermark */}
              <div className="absolute top-4 right-4 text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                AICTE Academic Registry • NEP-2020
              </div>

              {/* Certificate Header */}
              <div className="text-center pb-6 border-b-2 border-slate-200">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <div className="h-12 w-12 rounded-xl bg-blue-900 flex items-center justify-center text-white font-black text-xl shadow">
                    AICTE
                  </div>
                </div>
                <h2 className="text-xs font-bold text-slate-500 tracking-widest uppercase">
                  All India Council for Technical Education
                </h2>
                <h1 className="text-xl font-extrabold text-blue-950 mt-1 uppercase tracking-tight">
                  National Academic Credential Record
                </h1>
                <p className="text-xs text-slate-600 mt-1">
                  Issued under the National Educational Policy (NEP 2020) APAAR ID Academic Framework
                </p>
              </div>

              {/* Certificate Body */}
              <div className="py-6 space-y-5 text-center">
                <p className="text-xs text-slate-600 italic">
                  This is to certify that the student detailed below is officially enrolled and verified in the AICTE National Academic Registry:
                </p>

                <div className="py-2">
                  <span className="text-2xl font-black text-blue-900 tracking-wide block">
                    {selectedCredential.student_name}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 mt-1 block">
                    Candidate for {selectedCredential.degree_program}
                  </span>
                </div>

                {/* Mandated AICTE Dual Identification Box */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 border-2 border-blue-200 rounded-xl p-4 my-4">
                  <div className="border-r border-slate-200 pr-2">
                    <span className="text-[10px] uppercase font-bold text-blue-800 tracking-wider block">
                      Mandated APAAR ID
                    </span>
                    <span className="text-base font-black text-blue-950 font-mono tracking-wider">
                      {selectedCredential.apaar_id}
                    </span>
                    <span className="text-[9px] text-slate-500 block">National 12-Digit Academic Identity</span>
                  </div>
                  <div className="pl-2">
                    <span className="text-[10px] uppercase font-bold text-slate-700 tracking-wider block">
                      Institutional Student ID
                    </span>
                    <span className="text-base font-black text-slate-900 font-mono tracking-wider">
                      #{selectedCredential.student_id}
                    </span>
                    <span className="text-[9px] text-slate-500 block">College Internal Enrolment Roll</span>
                  </div>
                </div>

                {/* Additional Record Meta */}
                <div className="grid grid-cols-2 text-left text-xs gap-3 px-4 text-slate-700">
                  <div>
                    <span className="font-semibold text-slate-500 text-[11px] block">Awarding / Enrolled Institution:</span>
                    <span className="font-bold text-slate-900">{selectedCredential.institution_name}</span>
                    <span className="text-[10px] text-slate-500 block">AICTE Permanent ID: {selectedCredential.institution_code}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500 text-[11px] block">Certificate Serial Number:</span>
                    <span className="font-mono font-bold text-blue-900">{selectedCredential.certificate_number}</span>
                    <span className="text-[10px] text-slate-500 block">Academic Year: {selectedCredential.academic_year}</span>
                  </div>
                </div>
              </div>

              {/* Certificate Security Footer */}
              <div className="pt-6 border-t-2 border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 border border-slate-300 rounded bg-white">
                    <QrCode className="h-14 w-14 text-slate-900" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-1 font-bold text-emerald-700 text-xs">
                      <ShieldCheck className="h-4 w-4" />
                      Tamper-Evident Cryptographic Seal
                    </div>
                    <div className="font-mono text-[9px] text-slate-500 break-all max-w-[220px]">
                      {selectedCredential.verification_code}
                    </div>
                    <div className="text-[9px] text-slate-400 mt-1">
                      Issue Date: {new Date(selectedCredential.issued_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="h-10 border-b border-slate-400 mb-1 w-32 ml-auto"></div>
                  <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                    Registrar / Controller
                  </span>
                  <span className="text-[9px] text-slate-500 block">
                    Approved Degree Awarding Body
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
              <Award className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-white font-bold text-sm">Select a Student Credential</h3>
              <p className="text-xs text-slate-400 mt-1">
                Choose a credential record from the left list to inspect and print its AICTE-compliant certificate.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
