import React from 'react';
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
  Clock,
  Code2,
} from 'lucide-react';

interface UserManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: 'FACULTY' | 'STUDENT';
}

export const UserManualModal: React.FC<UserManualModalProps> = ({
  isOpen,
  onClose,
  role,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const isFaculty = role === 'FACULTY';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-2 sm:p-4 print:p-0 print:bg-white print:static">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden print:w-full print:h-auto print:border-none print:shadow-none print:rounded-none text-slate-900">
        
        {/* Modal Top Control Bar (Hidden when printing) */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 print:hidden shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs ${
                isFaculty ? 'bg-indigo-600' : 'bg-emerald-600'
              }`}
            >
              {isFaculty ? <Users className="w-5 h-5" /> : <GraduationCap className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  {isFaculty
                    ? 'Faculty Examination & Administration Manual'
                    : 'Student Examination Manual & SOP Guide'}
                </h2>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    isFaculty
                      ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {isFaculty ? 'Faculty Portal Guide' : 'Student Portal Guide'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {isFaculty
                  ? 'Standard operating procedures for scheduling, roster management, marksheet exports, and proctoring review.'
                  : 'Operational guidelines for coding, testing, anti-cheating compliance, and practical record generation.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className={`px-3.5 py-1.5 rounded-xl text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition ${
                isFaculty ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
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
          {isFaculty ? (
            /* ======================================================== */
            /*                FACULTY USER MANUAL ONLY                  */
            /* ======================================================== */
            <>
              {/* Cover Header */}
              <div className="border-b-2 border-indigo-500/40 pb-6 print:border-black">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 print:text-black">
                      Faculty &amp; Administrator Guide
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 print:text-black print:text-xl">
                      JavaLabPro: Faculty Examination &amp; Course Management Manual
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

              {/* Section 1: Configuration */}
              <section className="space-y-3">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-1 print:text-black print:border-black">
                  <span className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold print:border print:border-black">1</span>
                  Configuration Security (.env Architecture)
                </h2>
                <p className="text-xs text-slate-700 print:text-black">
                  To protect the backend from tampering by students and prevent application crashes, all endpoints are read securely from your build environment variables:
                </p>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-800 leading-relaxed">
                  VITE_APPS_SCRIPT_URL="https://script.google.com/macros/s/AKfycbx.../exec"<br />
                  VITE_RENDER_SERVICE_URL="https://java-runner-xxxx.onrender.com/execute"<br />
                  VITE_API_SECRET="MY_SECURE_LAB_KEY_123"
                </div>
              </section>

              {/* Section 2: Faculty Dashboard Tabs */}
              <section className="space-y-4">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-1 print:text-black print:border-black">
                  <span className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold print:border print:border-black">2</span>
                  Faculty Dashboard Capabilities &amp; Workflows
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="font-bold text-indigo-700 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-indigo-600" />
                      <span>1. Lab Exercises &amp; Schedules</span>
                    </div>
                    <ul className="text-xs list-disc list-inside space-y-1 text-slate-700">
                      <li><strong>Problem Specification:</strong> Set Title, Description, Category, and Difficulty.</li>
                      <li><strong>Access Windows:</strong> Gated by start and end datetime-local timestamps.</li>
                      <li><strong>Public Test Case:</strong> Sample input &amp; expected output available to students for sandbox debugging.</li>
                      <li><strong>Hidden Private Test Case:</strong> Evaluated only on final submission to prevent hardcoded answers.</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="font-bold text-emerald-700 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>2. Submissions Hub &amp; Code Audit</span>
                    </div>
                    <ul className="text-xs list-disc list-inside space-y-1 text-slate-700">
                      <li><strong>Code Viewer:</strong> Inspect exact student Java source files and console execution logs.</li>
                      <li><strong>Re-Run Sandbox Test:</strong> Re-evaluate student submissions on-demand.</li>
                      <li><strong>Automated Grading:</strong> 100/100 (All Pass), 50/100 (Partial Pass), or 0/100 (Failed).</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="font-bold text-rose-700 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-rose-600" />
                      <span>3. Anti-Cheating &amp; Proctoring Monitor</span>
                    </div>
                    <ul className="text-xs list-disc list-inside space-y-1 text-slate-700">
                      <li><strong>Fullscreen Exits:</strong> Logs every time a student escapes fullscreen mode.</li>
                      <li><strong>Tab Switches / Blur:</strong> Timestamped when student switches browser tabs.</li>
                      <li><strong>Paste Interceptions:</strong> Intercepts and logs clipboard pasting into the editor.</li>
                      <li><strong>Automated Audit Flags:</strong> Highlights candidates with 2 or more infractions.</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="font-bold text-amber-700 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-amber-600" />
                      <span>4. Student Enrollment Roster</span>
                    </div>
                    <ul className="text-xs list-disc list-inside space-y-1 text-slate-700">
                      <li>Enroll candidates with Institutional Email (<code>@student.hindustanuniv.ac.in</code>) and Reg No.</li>
                      <li>Real-time counter of total submissions and accumulated proctoring flags.</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Section 3: Marksheet & Assessment Exports */}
              <section className="space-y-3">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-1 print:text-black print:border-black">
                  <span className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold print:border print:border-black">3</span>
                  Official Assessment Results Exports
                </h2>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-700">
                  <p>Click <strong>Export Results</strong> in the dashboard banner or Submissions Hub to download:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Consolidated Student Marksheet (CSV):</strong> Aggregated per student with Reg No, Name, per-exercise best scores, total marks, percentage, and integrity remarks (formatted with UTF-8 BOM for Microsoft Excel).</li>
                    <li><strong>Detailed Submissions Log (CSV):</strong> Complete audit trail of all test executions.</li>
                    <li><strong>Proctoring Violations Audit (CSV):</strong> Chronological log of fullscreen exits, blurs, and paste attempts.</li>
                    <li><strong>Complete Assessment Archive (JSON):</strong> Full programmatic backup.</li>
                  </ul>
                </div>
              </section>
            </>
          ) : (
            /* ======================================================== */
            /*                STUDENT USER MANUAL ONLY                  */
            /* ======================================================== */
            <>
              {/* Cover Header */}
              <div className="border-b-2 border-emerald-500/40 pb-6 print:border-black">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 print:text-black">
                      Student Candidate Guide
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 print:text-black print:text-xl">
                      JavaLabPro: Student Examination &amp; Online IDE Manual
                    </h1>
                    <p className="text-slate-500 text-xs mt-1 print:text-gray-700">
                      Standard Guidelines for Coding, Testing, Anti-Cheating Compliance, and Practical Lab Records
                    </p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <div className="text-xs font-bold text-emerald-600 print:text-black">Portal: /#/student</div>
                    <div className="text-[11px] text-slate-500 print:text-gray-600">Runtime: Eclipse Temurin OpenJDK 17</div>
                    <div className="text-[11px] text-amber-700 print:text-black font-semibold mt-0.5">Integrity: Active Proctoring Guard</div>
                  </div>
                </div>
              </div>

              {/* Section 1: Step-by-Step Workflow */}
              <section className="space-y-4">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-1 print:text-black print:border-black">
                  <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold print:border print:border-black">1</span>
                  Examination Workflow: Step-by-Step
                </h2>
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="font-bold text-slate-900 text-xs">Step 1: Access Your Student Workspace</div>
                    <p className="text-xs text-slate-700 mt-1">
                      Navigate to the direct student URL provided by your faculty (<code className="text-emerald-700 bg-slate-100 px-1 py-0.5 rounded">/#/student</code>).
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="font-bold text-slate-900 text-xs">Step 2: Verify Your Details</div>
                    <p className="text-xs text-slate-700 mt-1">
                      Click the profile badge in the top right corner. Enter your institutional email (<code>@student.hindustanuniv.ac.in</code>) and your Registration Number (e.g. <code>21BCE0450</code>). Click <strong>Verify Details</strong> to authenticate your session.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="font-bold text-slate-900 text-xs">Step 3: Select Scheduled Exercise</div>
                    <p className="text-xs text-slate-700 mt-1">
                      Select the scheduled exercise from the left sidebar. Read the problem specification, time constraints, and sample public test case.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="font-bold text-slate-900 text-xs">Step 4: Write Java 17 Code</div>
                    <p className="text-xs text-slate-700 mt-1">
                      Implement your solution in <code>Main.java</code> using standard Java structures:
                    </p>
                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-emerald-400 my-1">
                      import java.util.Scanner;<br /><br />
                      public class Main &#123;<br />
                      &nbsp;&nbsp;public static void main(String[] args) &#123;<br />
                      &nbsp;&nbsp;&nbsp;&nbsp;Scanner sc = new Scanner(System.in);<br />
                      &nbsp;&nbsp;&nbsp;&nbsp;// Write logic here<br />
                      &nbsp;&nbsp;&#125;<br />
                      &#125;
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="font-bold text-slate-900 text-xs">Step 5: Run Public Tests &amp; Custom Input</div>
                    <p className="text-xs text-slate-700 mt-1">
                      Click <strong>Run Public Tests</strong> to check against the sample test case. Toggle <strong>Custom Input: ON</strong> to test with your own input values.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="font-bold text-slate-900 text-xs">Step 6: Official Submit for Evaluation</div>
                    <p className="text-xs text-slate-700 mt-1">
                      Click <strong>Submit Code</strong>. Your code is evaluated against both the Public test case and the Hidden test case. A grade is computed and logged to the official database.
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 2: Anti-Cheating Policies */}
              <section className="space-y-3">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-1 print:text-black print:border-black">
                  <span className="w-6 h-6 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center text-xs font-bold print:border print:border-black">2</span>
                  Anti-Cheating Rules &amp; Proctoring Policies
                </h2>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-700">
                  <p className="font-semibold text-slate-900">
                    Automated proctoring guards monitor your examination session:
                  </p>
                  <ul className="list-disc list-inside space-y-1.5">
                    <li><strong className="text-slate-900">Fullscreen Lock:</strong> Maintain fullscreen mode throughout the test. Minimizing or escaping triggers a violation flag.</li>
                    <li><strong className="text-slate-900">Tab-Switching Prohibition:</strong> Leaving the exam window, opening new tabs, or switching applications is logged with exact timestamps.</li>
                    <li><strong className="text-slate-900">Clipboard Paste Block:</strong> Copy-pasting code into the editor is strictly blocked. All code must be typed directly.</li>
                  </ul>
                </div>
              </section>

              {/* Section 3: Lab Record Generator */}
              <section className="space-y-3">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-1 print:text-black print:border-black">
                  <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold print:border print:border-black">3</span>
                  Printing Your Practical Lab Record (PDF)
                </h2>
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2 text-xs text-emerald-950">
                  <p className="font-semibold">
                    Click <strong>Generate Lab Record (PDF)</strong> in the top action bar anytime to generate your complete laboratory practical record book:
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Page 1: Title Page:</strong> Formal typography for HINDUSTAN INSTITUTE OF TECHNOLOGY &amp; SCIENCE, Subject Code (BCB52003), your Name, Reg No, and an empty space where you can add/paste your logo.</li>
                    <li><strong>Page 2: Bonafide Certificate:</strong> Official certificate of completion for MCA Computer Applications degree with examiner signature lines.</li>
                    <li><strong>Page 3: Formatted Index:</strong> Full table of contents with S.No, Date, Program Title, and clean empty Rubrics columns for faculty marking.</li>
                    <li><strong>Pages 4+: Experiment Sheets:</strong> Formatted aim, interactive editable procedure textarea for your program, Java code, execution test output, and staff signature block.</li>
                    <li><strong>Print &amp; Save as PDF:</strong> Formatted for standard A4 portrait pages with clean page breaks.</li>
                  </ul>
                </div>
              </section>
            </>
          )}

          {/* Footer sign-off */}
          <div className="border-t border-slate-200 pt-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 print:text-black print:border-black">
            <div>JavaLabPro — BCB52003 Object Oriented Programming Lab</div>
            <div>{isFaculty ? 'Faculty Management Portal' : 'Student Examination Portal'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
