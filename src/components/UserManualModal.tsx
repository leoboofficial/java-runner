import React, { useState } from 'react';
import {
  X,
  Printer,
  FileText,
  GraduationCap,
  Users,
  ShieldCheck,
  Terminal,
  BookOpen,
  CheckCircle2,
  Database,
  Lock,
  ShieldAlert,
} from 'lucide-react';

interface UserManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRole?: 'FACULTY' | 'STUDENT';
  currentRole?: 'FACULTY' | 'STUDENT';
}

export const UserManualModal: React.FC<UserManualModalProps> = ({
  isOpen,
  onClose,
  defaultRole = 'FACULTY',
  currentRole,
}) => {
  const [activeTab, setActiveTab] = useState<'FACULTY' | 'STUDENT'>(currentRole || defaultRole);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-2 sm:p-4 print:p-0 print:bg-white print:static">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden print:w-full print:h-auto print:border-none print:shadow-none print:rounded-none text-slate-900">
        
        {/* Modal Top Control Bar (Hidden when printing) */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 print:hidden shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                User Operational Manual & SOP Guide
              </h2>
              <p className="text-xs text-slate-500">
                Detailed documentation for Faculty Administrators and Students
              </p>
            </div>
          </div>

          {/* Role Switcher Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('FACULTY')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'FACULTY'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Faculty Manual</span>
            </button>
            <button
              onClick={() => setActiveTab('STUDENT')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'STUDENT'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Student Manual</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
              title="Print to PDF or physical printer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Content Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8 text-slate-800 text-sm leading-relaxed print:overflow-visible print:p-0 print:text-black print:text-xs">
          {activeTab === 'FACULTY' ? (
            <>
              {/* Faculty Manual */}
              <div className="border-b-2 border-indigo-500/40 pb-6 print:border-black">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 print:text-black">
                      Faculty & Administrator Guide
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 print:text-black print:text-xl">
                      Java Lab Pro: Faculty Examination & Roster Management
                    </h1>
                    <p className="text-slate-500 text-xs mt-1 print:text-gray-700">
                      Standard Operating Procedures for Scheduling Exercises, Marksheet Export, and Proctoring Audit
                    </p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <div className="text-xs font-bold text-indigo-600 print:text-black">Portal: /#/faculty</div>
                    <div className="text-[11px] text-slate-500 print:text-gray-600">Configuration: Method B (.env file)</div>
                    <div className="text-[11px] text-emerald-600 print:text-black font-semibold mt-0.5">Execution: Eclipse Temurin JDK 17</div>
                  </div>
                </div>
              </div>

              {/* Section 1 */}
              <section className="space-y-3">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-1 print:text-black print:border-black">
                  <span className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold print:border print:border-black">1</span>
                  Configuration Security (.env Architecture)
                </h2>
                <p className="text-xs text-slate-700 print:text-black">
                  To prevent unauthorized changes or app crashes from student tampering, in-app URL settings have been removed from the UI. Configuration is read securely from your <code>.env</code> file:
                </p>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-800">
                  VITE_APPS_SCRIPT_URL="https://script.google.com/macros/s/AKfycbx.../exec"<br />
                  VITE_RENDER_SERVICE_URL="https://java-runner-xxxx.onrender.com/execute"<br />
                  VITE_API_SECRET="MY_SECURE_LAB_KEY_123"
                </div>
              </section>

              {/* Section 2 */}
              <section className="space-y-4">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-1 print:text-black print:border-black">
                  <span className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold print:border print:border-black">2</span>
                  Faculty Dashboard Capabilities
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="font-bold text-indigo-700 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-indigo-600" />
                      <span>1. Lab Exercises & Schedules</span>
                    </div>
                    <ul className="text-xs list-disc list-inside space-y-1 text-slate-700">
                      <li>Create problems with time windows (start/end).</li>
                      <li>Public test case for students to test in the IDE.</li>
                      <li>Hidden private test case evaluated upon submission.</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="font-bold text-emerald-700 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>2. Submissions Hub & Marksheet Export</span>
                    </div>
                    <ul className="text-xs list-disc list-inside space-y-1 text-slate-700">
                      <li>Audit student code and execution logs.</li>
                      <li>Export consolidated student marksheet (CSV).</li>
                      <li>Export detailed test submission logs for university filing.</li>
                    </ul>
                  </div>
                </div>
              </section>
            </>
          ) : (
            <>
              {/* Student Manual */}
              <div className="border-b-2 border-emerald-500/40 pb-6 print:border-black">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 print:text-black">
                      Student Candidate Guide
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 print:text-black print:text-xl">
                      Java Lab Pro: Practical Examination & Lab Record Generation
                    </h1>
                    <p className="text-slate-500 text-xs mt-1 print:text-gray-700">
                      Guide for Solving Lab Exercises and Printing Official Practical Records
                    </p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <div className="text-xs font-bold text-emerald-600 print:text-black">Portal: /#/student</div>
                    <div className="text-[11px] text-slate-500 print:text-gray-600">Runtime: OpenJDK 17</div>
                  </div>
                </div>
              </div>

              {/* Section 1 */}
              <section className="space-y-4">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-1 print:text-black print:border-black">
                  <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold print:border print:border-black">1</span>
                  Printing Your Official Practical Lab Record
                </h2>
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2 text-xs">
                  <p className="text-emerald-950 font-semibold">
                    You can generate your formatted lab record book anytime using the "Generate Lab Record (PDF)" button!
                  </p>
                  <ul className="list-disc list-inside space-y-1.5 text-emerald-900">
                    <li><strong>Page 1: Title Page:</strong> Contains institution header, course code (BCB52003), subject, your Name, Reg No, and Month/Year.</li>
                    <li><strong>Page 2: Bonafide Certificate:</strong> Official certificate of completion with your details and examiner signature lines.</li>
                    <li><strong>Page 3: Index Table:</strong> Full table of contents with S.No, Dates, Program Titles, Page numbers, and Rubrics marks.</li>
                    <li><strong>Pages 4+: Experiment Sheets:</strong> Formatted aim, procedure, Java code, execution test output result, and staff signature block.</li>
                    <li><strong>Rubric Options:</strong> Can be set to auto-allot marks from your test scores, or left blank for physical faculty marking.</li>
                  </ul>
                </div>
              </section>

              {/* Section 2 */}
              <section className="space-y-3">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-1 print:text-black print:border-black">
                  <span className="w-6 h-6 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center text-xs font-bold print:border print:border-black">2</span>
                  Anti-Cheating Rules
                </h2>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-700">
                  <p>During the exam, automated proctoring guards monitor compliance:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Maintain fullscreen mode.</li>
                    <li>Do not switch browser tabs or minimize the window.</li>
                    <li>Code pasting from external sources is blocked to ensure original implementation.</li>
                  </ul>
                </div>
              </section>
            </>
          )}

          <div className="border-t border-slate-200 pt-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 print:text-black print:border-black">
            <div>Java Lab Pro   Technical Examination System Documentation</div>
            <div>Generated for {activeTab === 'FACULTY' ? 'Faculty Course Instructor' : 'Student Candidate'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
