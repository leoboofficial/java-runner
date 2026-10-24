import React, { useState } from 'react';
import { Submission, Exercise, StudentRecord, Violation } from '../../types';
import {
  FileCode,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Download,
  Terminal,
  Eye,
  Check,
  RotateCcw,
  FileSpreadsheet,
  X,
} from 'lucide-react';
import { JavaRunnerService } from '../../services/javaRunner';
import { ExportResultsModal } from './ExportResultsModal';
import { exportConsolidatedMarksheetCSV } from '../../utils/exportUtils';

interface SubmissionsHubProps {
  submissions: Submission[];
  exercises: Exercise[];
  students?: StudentRecord[];
  violations?: Violation[];
}

export const SubmissionsHub: React.FC<SubmissionsHubProps> = ({
  submissions,
  exercises,
  students = [],
  violations = [],
}) => {
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [filterExercise, setFilterExercise] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [reTesting, setReTesting] = useState(false);
  const [reTestFeedback, setReTestFeedback] = useState<string | null>(null);

  const filtered = submissions.filter((s) => {
    const matchesEx = filterExercise === 'ALL' || s.exerciseId === filterExercise;
    const matchesStat = filterStatus === 'ALL' || s.status === filterStatus;
    const matchesSearch =
      s.studentEmail.toLowerCase().includes(search.toLowerCase()) ||
      s.regNo.toLowerCase().includes(search.toLowerCase()) ||
      (s.studentName && s.studentName.toLowerCase().includes(search.toLowerCase()));
    return matchesEx && matchesStat && matchesSearch;
  });

  const handleReTest = async () => {
    if (!selectedSub) return;
    const ex = exercises.find((e) => e.id === selectedSub.exerciseId);
    if (!ex) return;
    setReTesting(true);
    setReTestFeedback(null);
    const pubRes = await JavaRunnerService.execute(selectedSub.code, ex.publicInput, ex.publicOutput);
    const privRes = await JavaRunnerService.execute(selectedSub.code, ex.privateInput, ex.privateOutput);
    setReTesting(false);
    setReTestFeedback(
      `Re-Evaluation Result: Public=${pubRes.passed ? 'PASS' : 'FAIL'}, Private=${
        privRes.passed ? 'PASS' : 'FAIL'
      }`
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ALL TEST CASES PASSED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 100/100 Passed
          </span>
        );
      case 'PARTIAL PASS':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 w-fit">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> 50/100 Partial
          </span>
        );
      case 'COMPILATION ERROR':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1 w-fit">
            <Terminal className="w-3.5 h-3.5 text-purple-600" /> Compile Error
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 w-fit">
            <XCircle className="w-3.5 h-3.5 text-rose-600" /> 0/100 Failed
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Student Submissions & Evaluation</h2>
          <p className="text-xs text-slate-500">
            Official records from the Google Sheet Submissions tab with code inspection & automated grading.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportConsolidatedMarksheetCSV(students, submissions, exercises, violations)}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 shadow-xs transition"
            title="Download consolidated student marksheet CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Marksheet (CSV)</span>
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition"
          >
            <Download className="w-4 h-4 text-white" />
            <span>Export Results...</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name, registration number, or email..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterExercise}
            onChange={(e) => setFilterExercise(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Exercises</option>
            {exercises.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.id} - {ex.title}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="ALL TEST CASES PASSED">All Passed</option>
            <option value="PARTIAL PASS">Partial Pass</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Timestamp & ID</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Exercise</th>
                <th className="py-3 px-4">Evaluation Status</th>
                <th className="py-3 px-4">Score</th>
                <th className="py-3 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No submissions found matching criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      <div>{s.timestamp}</div>
                      <span className="text-[10px] text-slate-400">{s.id}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{s.studentName || s.studentEmail}</div>
                      <div className="font-mono text-[11px] text-indigo-600">{s.regNo}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{s.exerciseTitle || s.exerciseId}</div>
                      <div className="text-[10px] font-mono text-slate-400">{s.exerciseId}</div>
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(s.status)}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 text-sm">
                      <span className={s.score === 100 ? 'text-emerald-600' : s.score > 0 ? 'text-amber-600' : 'text-rose-600'}>
                        {s.score}
                      </span>
                      <span className="text-slate-400 font-normal text-xs">/100</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedSub(s);
                          setReTestFeedback(null);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold inline-flex items-center gap-1.5 transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View Code
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Code Inspection & Test Details Modal */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl text-slate-900">
            <div className="sticky top-0 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-slate-200 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <FileCode className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Submission Inspection: {selectedSub.studentName || selectedSub.regNo}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedSub.exerciseTitle}   Submitted on {selectedSub.timestamp}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSub(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Submission Summary Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <div className="text-[11px] text-slate-500">Student Info</div>
                  <div className="text-sm font-semibold text-slate-900">{selectedSub.studentName}</div>
                  <div className="text-xs font-mono text-indigo-600">{selectedSub.regNo}</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">Evaluation Status</div>
                  <div className="mt-1">{getStatusBadge(selectedSub.status)}</div>
                </div>
                <div className="flex items-center sm:justify-end gap-2">
                  <button
                    onClick={handleReTest}
                    disabled={reTesting}
                    className="px-3.5 py-2 rounded-lg bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 border border-slate-200 flex items-center gap-1.5 transition shadow-xs"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${reTesting ? 'animate-spin text-indigo-600' : ''}`} />
                    {reTesting ? 'Re-evaluating...' : 'Re-Run Test'}
                  </button>
                </div>
              </div>

              {reTestFeedback && (
                <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200 text-xs text-indigo-800 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{reTestFeedback}</span>
                </div>
              )}

              {/* Submitted Java Code Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-mono">Submitted Source File: Main.java</span>
                  <span>{selectedSub.code.split('\n').length} lines</span>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 font-mono text-xs text-slate-900 border border-slate-200 overflow-x-auto max-h-80 leading-relaxed">
                  <pre>{selectedSub.code}</pre>
                </div>
              </div>

              {/* Test Case Execution Output Logs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-emerald-700">Public Test Case Log</span>
                    <span className="text-[10px] font-mono text-slate-500">Standard Test</span>
                  </div>
                  <pre className="text-[11px] font-mono text-slate-800 bg-white border border-slate-200 p-2.5 rounded-lg whitespace-pre-wrap">
                    {selectedSub.publicLog}
                  </pre>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-amber-700">Hidden / Private Test Case Log</span>
                    <span className="text-[10px] font-mono text-slate-500">Grading Test</span>
                  </div>
                  <pre className="text-[11px] font-mono text-slate-800 bg-white border border-slate-200 p-2.5 rounded-lg whitespace-pre-wrap">
                    {selectedSub.privateLog}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Results Modal */}
      <ExportResultsModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        exercises={exercises}
        submissions={submissions}
        students={students}
        violations={violations}
      />
    </div>
  );
};
