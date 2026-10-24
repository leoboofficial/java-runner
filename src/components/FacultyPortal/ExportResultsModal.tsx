import React from 'react';
import { Exercise, StudentRecord, Submission, Violation } from '../../types';
import {
  X,
  Download,
  FileSpreadsheet,
  Table,
  ShieldAlert,
  Database,
} from 'lucide-react';
import {
  exportConsolidatedMarksheetCSV,
  exportDetailedSubmissionsCSV,
  exportViolationsAuditCSV,
  exportCompleteAssessmentJSON,
} from '../../utils/exportUtils';

interface ExportResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercises: Exercise[];
  submissions: Submission[];
  students: StudentRecord[];
  violations: Violation[];
}

export const ExportResultsModal: React.FC<ExportResultsModalProps> = ({
  isOpen,
  onClose,
  exercises,
  submissions,
  students,
  violations,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-900">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Export Examination & Lab Results
              </h3>
              <p className="text-xs text-slate-500">
                Download consolidated marksheets, submissions audit, and integrity reports
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Option 1: Consolidated Marksheet */}
            <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50/70 transition flex flex-col justify-between space-y-3 group">
              <div>
                <div className="flex items-center justify-between">
                  <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                    <FileSpreadsheet className="w-4 h-4" />
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                    Recommended
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 mt-2.5">
                  Consolidated Student Marksheet (CSV)
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Aggregated by student with Reg No, Name, Institutional Email, each problem's score, total marks, percentage, and proctoring flag count.
                </p>
              </div>
              <button
                onClick={() => exportConsolidatedMarksheetCSV(students, submissions, exercises, violations)}
                className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Marksheet CSV</span>
              </button>
            </div>

            {/* Option 2: Detailed Submissions Log */}
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50/70 transition flex flex-col justify-between space-y-3 group">
              <div>
                <div className="flex items-center justify-between">
                  <span className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                    <Table className="w-4 h-4" />
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {submissions.length} Records
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 mt-2.5">
                  Detailed Submissions Log (CSV)
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Every submission attempt including timestamp, public/private test outcomes, scores, and execution log outputs.
                </p>
              </div>
              <button
                onClick={() => exportDetailedSubmissionsCSV(submissions, exercises)}
                className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Submissions CSV</span>
              </button>
            </div>

            {/* Option 3: Proctoring Violations */}
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 hover:bg-rose-50/70 transition flex flex-col justify-between space-y-3 group">
              <div>
                <div className="flex items-center justify-between">
                  <span className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center">
                    <ShieldAlert className="w-4 h-4" />
                  </span>
                  <span className="text-[10px] text-rose-700 font-bold font-mono">
                    {violations.length} Flags
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 mt-2.5">
                  Proctoring Audit Report (CSV)
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  List of integrity flags: fullscreen exits, tab switches/blurs, and blocked clipboard paste attempts.
                </p>
              </div>
              <button
                onClick={() => exportViolationsAuditCSV(violations)}
                className="w-full py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Violations CSV</span>
              </button>
            </div>

            {/* Option 4: Full JSON Archive */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition flex flex-col justify-between space-y-3 group">
              <div>
                <div className="flex items-center justify-between">
                  <span className="w-8 h-8 rounded-lg bg-slate-700 text-white flex items-center justify-center">
                    <Database className="w-4 h-4" />
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Complete DB Backup
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 mt-2.5">
                  Complete Assessment Archive (JSON)
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Full programmatic backup containing all exercises, enrolled students, submissions, and proctoring logs.
                </p>
              </div>
              <button
                onClick={() => exportCompleteAssessmentJSON(exercises, submissions, students, violations)}
                className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download JSON Archive</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Files are generated client-side and open cleanly in Microsoft Excel and Google Sheets.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
