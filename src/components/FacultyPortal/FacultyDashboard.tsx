import React, { useState } from 'react';
import {
  AssessmentType,
  DynamicRubricConfig,
  ExamModeConfig,
  Exercise,
  Submission,
  Violation,
  StudentRecord,
  User,
  StudentLabRecordSubmission,
  LoginAuditRecord,
} from '../../types';
import { ExerciseManager } from './ExerciseManager';
import { AntiCheatingCenter } from './AntiCheatingCenter';
import { SubmissionsHub } from './SubmissionsHub';
import { StudentRoster } from './StudentRoster';
import { LabRecordEvaluations } from './LabRecordEvaluations';
import {
  Calendar,
  ShieldAlert,
  FileCheck2,
  Users,
  Download,
  RefreshCw,
  Award,
  FileText,
  GraduationCap,
} from 'lucide-react';
import { ExportResultsModal } from './ExportResultsModal';

interface FacultyDashboardProps {
  currentUser: User;
  exercises: Exercise[];
  submissions: Submission[];
  violations: Violation[];
  students: StudentRecord[];
  evaluations: StudentLabRecordSubmission[];
  loginAudit?: LoginAuditRecord[];
  examConfig: ExamModeConfig;
  rubricConfig: DynamicRubricConfig;
  onSaveExamConfig: (config: ExamModeConfig) => Promise<void> | void;
  onSaveRubricConfig: (config: DynamicRubricConfig) => Promise<void> | void;
  onSaveExercise: (exercise: Exercise) => void;
  onAddStudent: (student: StudentRecord) => void;
  onSaveEvaluation: (evaluation: StudentLabRecordSubmission) => void;
  onAutoEvaluateAll: (assessmentType: AssessmentType) => void;
  onRefreshExercises?: () => void;
}

export const FacultyDashboard: React.FC<FacultyDashboardProps> = ({
  currentUser,
  exercises,
  submissions,
  violations,
  students,
  evaluations,
  loginAudit = [],
  examConfig,
  rubricConfig,
  onSaveExamConfig,
  onSaveRubricConfig,
  onSaveExercise,
  onAddStudent,
  onSaveEvaluation,
  onAutoEvaluateAll,
  onRefreshExercises,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'evaluations' | 'exercises' | 'submissions' | 'violations' | 'roster'>('evaluations');
  const [showExportModal, setShowExportModal] = useState(false);
  const [eseTitleDraft, setEseTitleDraft] = useState(examConfig.eseTitle || 'End Semester Practical Examination');
  const [togglingEse, setTogglingEse] = useState(false);

  React.useEffect(() => {
    setEseTitleDraft(examConfig.eseTitle || 'End Semester Practical Examination');
  }, [examConfig.eseTitle]);

  const handleToggleEseMode = async () => {
    setTogglingEse(true);
    try {
      await onSaveExamConfig({
        eseEnabled: !examConfig.eseEnabled,
        eseTitle: eseTitleDraft.trim() || 'End Semester Practical Examination',
        updatedBy: currentUser.name || currentUser.email,
      });
    } finally {
      setTogglingEse(false);
    }
  };

  const handleUpdateEseTitleOnly = async () => {
    setTogglingEse(true);
    try {
      await onSaveExamConfig({
        eseEnabled: examConfig.eseEnabled,
        eseTitle: eseTitleDraft.trim() || 'End Semester Practical Examination',
        updatedBy: currentUser.name || currentUser.email,
      });
    } finally {
      setTogglingEse(false);
    }
  };

  const passedCount = submissions.filter((s) => s.status === 'ALL TEST CASES PASSED').length;
  const passRate = submissions.length > 0 ? Math.round((passedCount / submissions.length) * 100) : 0;
  const highRiskViolations = violations.filter((v) => v.severity === 'high').length;

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
              onClick={() => {
                setActiveSubTab('evaluations');
                setTimeout(() => {
                  document
                    .getElementById('submitted-lab-records-section')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 50);
              }}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white flex items-center gap-1.5 transition shadow-xs"
              title="View the list of students who submitted their Lab Records for rubric evaluation and approval"
            >
              <FileText className="w-4 h-4 text-white" />
              <span>Submitted Lab Records ({evaluations.length})</span>
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white flex items-center gap-1.5 transition shadow-xs"
              title="Download consolidated student marksheet, submissions audit, and integrity reports"
            >
              <Download className="w-4 h-4 text-white" />
              <span>Export Results</span>
            </button>
            {onRefreshExercises && (
              <button
                onClick={onRefreshExercises}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-xs font-semibold text-white flex items-center gap-1.5 transition shadow-xs"
                title="Fetch latest exercises and starter code from Google Sheet Exercises tab"
              >
                <RefreshCw className="w-3.5 h-3.5 text-indigo-300" />
                <span>Sync from Sheet</span>
              </button>
            )}
            <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-right shadow-xs">
              <div className="text-[11px] text-slate-500">Class Pass Rate</div>
              <div className="text-lg font-black text-emerald-600">{passRate}%</div>
            </div>
          </div>
        </div>

        {/* ESE Practical Mode Live Control Bar */}
        <div
          className={`mt-5 rounded-xl border p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 transition ${
            examConfig.eseEnabled
              ? 'bg-rose-50/90 border-rose-300'
              : 'bg-white/90 border-slate-200'
          }`}
        >
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                examConfig.eseEnabled ? 'bg-rose-600 text-white' : 'bg-indigo-100 text-indigo-700'
              }`}
            >
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-slate-900">
                  Student Exam Visibility Mode:
                </span>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full border uppercase ${
                    examConfig.eseEnabled
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  }`}
                >
                  {examConfig.eseEnabled ? 'LIVE ESE PRACTICAL EXAM ON' : 'REGULAR LAB EXERCISES MODE'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {examConfig.eseEnabled
                  ? 'Students see ONLY ESE Practical questions in the IDE (Lab Record PDF is hidden during exam).'
                  : 'Students see regular Lab Exercises and their Lab Record PDF workflow.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={eseTitleDraft}
              onChange={(e) => setEseTitleDraft(e.target.value)}
              placeholder="ESE Exam Title (e.g. BCB52003 ESE Practical)"
              className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 w-60 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {eseTitleDraft.trim() !== (examConfig.eseTitle || '').trim() && (
              <button
                type="button"
                disabled={togglingEse}
                onClick={handleUpdateEseTitleOnly}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition disabled:opacity-60"
              >
                Save Title
              </button>
            )}
            <button
              type="button"
              disabled={togglingEse}
              onClick={handleToggleEseMode}
              className={`px-4 py-1.5 rounded-xl text-xs font-black text-white shadow-xs transition disabled:opacity-60 ${
                examConfig.eseEnabled
                  ? 'bg-slate-800 hover:bg-slate-900'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {togglingEse
                ? 'Updating...'
                : examConfig.eseEnabled
                ? 'Disable ESE (Return to Lab Mode)'
                : 'Enable ESE Exam Mode'}
            </button>
          </div>
        </div>

        {/* Top 5 KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6">
          <div
            onClick={() => setActiveSubTab('evaluations')}
            className={`p-3.5 rounded-xl border cursor-pointer transition ${
              activeSubTab === 'evaluations'
                ? 'bg-amber-50/90 border-amber-400 shadow-xs ring-1 ring-amber-300'
                : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
              <span>Rubric Evaluations</span>
              <Award className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{evaluations.length}</div>
            <div className="text-[10px] text-amber-700 font-semibold mt-0.5">
              {evaluations.filter((e) => e.status === 'APPROVED' || e.status === 'EVALUATED_APPROVED').length} Approved &bull; {evaluations.filter((e) => e.status === 'PENDING' || e.status === 'PENDING_EVALUATION').length} Pending &rarr;
            </div>
          </div>

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
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('evaluations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
            activeSubTab === 'evaluations'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Award className="w-4 h-4" />
          Rubric Evaluations & Records ({evaluations.length})
        </button>
        <button
          onClick={() => setActiveSubTab('exercises')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
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
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
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
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
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
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
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
        {activeSubTab === 'evaluations' && (
          <LabRecordEvaluations
            students={students}
            submissions={submissions}
            violations={violations}
            exercises={exercises}
            evaluations={evaluations}
            loginAudit={loginAudit}
            currentUser={currentUser}
            rubricConfig={rubricConfig}
            examConfig={examConfig}
            onSaveRubricConfig={onSaveRubricConfig}
            onSaveEvaluation={onSaveEvaluation}
            onAutoEvaluateAll={onAutoEvaluateAll}
            onRefreshFromSheet={onRefreshExercises}
          />
        )}
        {activeSubTab === 'exercises' && (
          <ExerciseManager exercises={exercises} onSaveExercise={onSaveExercise} />
        )}
        {activeSubTab === 'submissions' && (
          <SubmissionsHub
            submissions={submissions}
            exercises={exercises}
            students={students}
            violations={violations}
            loginAudit={loginAudit}
          />
        )}
        {activeSubTab === 'violations' && (
          <AntiCheatingCenter violations={violations} loginAudit={loginAudit} />
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
    </div>
  );
};
