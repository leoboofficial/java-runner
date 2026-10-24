import React, { useState } from 'react';
import { Exercise, Submission, Violation, StudentRecord, User } from '../../types';
import { ExerciseManager } from './ExerciseManager';
import { AntiCheatingCenter } from './AntiCheatingCenter';
import { SubmissionsHub } from './SubmissionsHub';
import { StudentRoster } from './StudentRoster';
import {
  Calendar,
  ShieldAlert,
  FileCheck2,
  Users,
  Printer,
  Download,
} from 'lucide-react';
import { ExportResultsModal } from './ExportResultsModal';
import { LabRecordModal } from '../StudentPortal/LabRecordModal';

interface FacultyDashboardProps {
  currentUser: User;
  exercises: Exercise[];
  submissions: Submission[];
  violations: Violation[];
  students: StudentRecord[];
  onSaveExercise: (exercise: Exercise) => void;
  onAddStudent: (student: StudentRecord) => void;
}

export const FacultyDashboard: React.FC<FacultyDashboardProps> = ({
  currentUser,
  exercises,
  submissions,
  violations,
  students,
  onSaveExercise,
  onAddStudent,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'exercises' | 'submissions' | 'violations' | 'roster'>('exercises');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showRecordPreview, setShowRecordPreview] = useState(false);
  const [copiedStudentLink, setCopiedStudentLink] = useState(false);

  const passedCount = submissions.filter((s) => s.status === 'ALL TEST CASES PASSED').length;
  const passRate = submissions.length > 0 ? Math.round((passedCount / submissions.length) * 100) : 0;
  const highRiskViolations = violations.filter((v) => v.severity === 'high').length;

  const copyStudentUrl = () => {
    const origin = window.location.origin;
    const path = window.location.pathname.replace(/\/faculty\/?$/, '');
    const studentUrl = `${origin}${path}#/student`;
    navigator.clipboard.writeText(studentUrl);
    setCopiedStudentLink(true);
    setTimeout(() => setCopiedStudentLink(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Faculty Hero Banner */}
      <div className="bg-gradient-to-r from-indigo-50/90 via-white to-slate-50 border border-indigo-100 p-6 rounded-2xl shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Welcome, {currentUser.name}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Schedule lab assessments, monitor live anti-cheating signals, and audit student Java code executions.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowRecordPreview(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white flex items-center gap-1.5 transition shadow-xs"
              title="Preview and generate the official Practical Lab Record (PDF) template"
            >
              <Printer className="w-4 h-4 text-white" />
              <span>Preview Lab Record (PDF)</span>
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white flex items-center gap-1.5 transition shadow-xs"
              title="Download consolidated student marksheet, submissions audit, and integrity reports"
            >
              <Download className="w-4 h-4 text-white" />
              <span>Export Results</span>
            </button>
            <button
              onClick={copyStudentUrl}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 border border-slate-200 flex items-center gap-2 transition shadow-xs"
              title="Copy the direct Student Exam URL to share with your students"
            >
              <span>{copiedStudentLink ? 'Copied Student Link!' : 'Copy Student Exam URL'}</span>
            </button>
            <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-right shadow-xs">
              <div className="text-[11px] text-slate-500">Class Pass Rate</div>
              <div className="text-lg font-black text-emerald-600">{passRate}%</div>
            </div>
          </div>
        </div>

        {/* Top 4 KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <div
            onClick={() => setActiveSubTab('exercises')}
            className={`p-3.5 rounded-xl border cursor-pointer transition ${
              activeSubTab === 'exercises'
                ? 'bg-indigo-50/90 border-indigo-400 shadow-xs'
                : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
              <span>Scheduled Labs</span>
              <Calendar className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{exercises.length}</div>
            <div className="text-[10px] text-indigo-600 font-semibold mt-0.5">Manage & Schedule &rarr;</div>
          </div>

          <div
            onClick={() => setActiveSubTab('submissions')}
            className={`p-3.5 rounded-xl border cursor-pointer transition ${
              activeSubTab === 'submissions'
                ? 'bg-emerald-50/90 border-emerald-400 shadow-xs'
                : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
              <span>Submissions</span>
              <FileCheck2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{submissions.length}</div>
            <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Audit Code & Logs &rarr;</div>
          </div>

          <div
            onClick={() => setActiveSubTab('violations')}
            className={`p-3.5 rounded-xl border cursor-pointer transition ${
              activeSubTab === 'violations'
                ? 'bg-rose-50/90 border-rose-400 shadow-xs'
                : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
              <span>Cheating Flags</span>
              <ShieldAlert className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-rose-600">{violations.length}</div>
            <div className="text-[10px] text-rose-600 font-semibold mt-0.5">
              {highRiskViolations > 0 ? `${highRiskViolations} High Severity` : 'Review Incidents &rarr;'}
            </div>
          </div>

          <div
            onClick={() => setActiveSubTab('roster')}
            className={`p-3.5 rounded-xl border cursor-pointer transition ${
              activeSubTab === 'roster'
                ? 'bg-amber-50/90 border-amber-400 shadow-xs'
                : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
              <span>Enrolled Students</span>
              <Users className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{students.length}</div>
            <div className="text-[10px] text-amber-600 font-semibold mt-0.5">Registration Roster &rarr;</div>
          </div>
        </div>
      </div>

      {/* Sub Tabs Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveSubTab('exercises')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeSubTab === 'exercises'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Exercises & Test Cases ({exercises.length})
        </button>
        <button
          onClick={() => setActiveSubTab('submissions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeSubTab === 'submissions'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          Submissions Hub ({submissions.length})
        </button>
        <button
          onClick={() => setActiveSubTab('violations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeSubTab === 'violations'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          Anti-Cheating Monitor ({violations.length})
        </button>
        <button
          onClick={() => setActiveSubTab('roster')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeSubTab === 'roster'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          Student Roster ({students.length})
        </button>
      </div>

      {/* Tab Panels */}
      <div>
        {activeSubTab === 'exercises' && (
          <ExerciseManager exercises={exercises} onSaveExercise={onSaveExercise} />
        )}
        {activeSubTab === 'submissions' && (
          <SubmissionsHub
            submissions={submissions}
            exercises={exercises}
            students={students}
            violations={violations}
          />
        )}
        {activeSubTab === 'violations' && (
          <AntiCheatingCenter violations={violations} />
        )}
        {activeSubTab === 'roster' && (
          <StudentRoster students={students} onAddStudent={onAddStudent} />
        )}
      </div>

      {/* Export Results Modal */}
      <ExportResultsModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        exercises={exercises}
        submissions={submissions}
        students={students}
        violations={violations}
      />

      {/* Lab Record Preview Modal */}
      <LabRecordModal
        isOpen={showRecordPreview}
        onClose={() => setShowRecordPreview(false)}
        currentUser={currentUser}
        exercises={exercises}
        submissions={submissions}
      />
    </div>
  );
};
