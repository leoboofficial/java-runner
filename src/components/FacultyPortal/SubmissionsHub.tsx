import React, { useState, useMemo } from 'react';
import {
  AssessmentType,
  DEFAULT_RUBRIC_CONFIG,
  DynamicRubricConfig,
  Exercise,
  LoginAuditRecord,
  RubricCriterion,
  StudentLabRecordSubmission,
  StudentRecord,
  Submission,
  User,
  Violation,
} from '../../types';
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
  Mail,
  Laptop,
  Award,
  Clock,
} from 'lucide-react';
import { JavaRunnerService } from '../../services/javaRunner';
import { ExportResultsModal } from './ExportResultsModal';
import { exportConsolidatedMarksheetCSV } from '../../utils/exportUtils';
import { RubricEvaluationModal } from './RubricEvaluationModal';
import {
  buildLegacyRubricBreakdown,
  computeAutoDynamicScores,
  getEvaluationDisplayTotals,
} from '../../utils/rubricScoring';

interface SubmissionsHubProps {
  submissions: Submission[];
  exercises: Exercise[];
  students?: StudentRecord[];
  violations?: Violation[];
  loginAudit?: LoginAuditRecord[];
  evaluations?: StudentLabRecordSubmission[];
  rubricConfig?: DynamicRubricConfig;
  currentUser?: User;
  onSaveEvaluation?: (evaluation: StudentLabRecordSubmission) => void;
}

export const SubmissionsHub: React.FC<SubmissionsHubProps> = ({
  submissions,
  exercises,
  students = [],
  violations = [],
  loginAudit = [],
  evaluations = [],
  rubricConfig = DEFAULT_RUBRIC_CONFIG,
  currentUser,
  onSaveEvaluation,
}) => {
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [selectedEvalTarget, setSelectedEvalTarget] = useState<{
    record: StudentLabRecordSubmission;
    mode: AssessmentType;
  } | null>(null);
  const [filterExercise, setFilterExercise] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [reTesting, setReTesting] = useState(false);
  const [reTestFeedback, setReTestFeedback] = useState<string | null>(null);

  const proxyLookup = useMemo(() => {
    const mailToRegs = new Map<string, Set<string>>();
    const devToRegs = new Map<string, Set<string>>();
    const track = (reg?: string, mail?: string, dev?: string) => {
      const r = (reg || '').trim().toUpperCase();
      if (!r) return;
      const m = (mail || '').trim().toLowerCase();
      const d = (dev || '').trim();
      if (m) {
        if (!mailToRegs.has(m)) mailToRegs.set(m, new Set());
        mailToRegs.get(m)!.add(r);
      }
      if (d && d !== 'UNKNOWN') {
        if (!devToRegs.has(d)) devToRegs.set(d, new Set());
        devToRegs.get(d)!.add(r);
      }
    };
    loginAudit.forEach((a) => track(a.regNo, a.personalEmail, a.deviceId));
    submissions.forEach((s) => track(s.regNo, s.personalEmail, s.deviceId));
    return { mailToRegs, devToRegs };
  }, [loginAudit, submissions]);

  const getProxyWarning = (s: Submission): string => {
    const r = (s.regNo || '').trim().toUpperCase();
    const shared = new Set<string>();
    const m = (s.personalEmail || '').trim().toLowerCase();
    const d = (s.deviceId || '').trim();
    if (m && proxyLookup.mailToRegs.has(m)) {
      proxyLookup.mailToRegs.get(m)!.forEach((reg) => {
        if (reg !== r) shared.add(reg);
      });
    }
    if (d && proxyLookup.devToRegs.has(d)) {
      proxyLookup.devToRegs.get(d)!.forEach((reg) => {
        if (reg !== r) shared.add(reg);
      });
    }
    if (shared.size > 0) {
      return `Shared with RegNo(s): ${Array.from(shared).join(', ')}`;
    }
    return s.multiStudentAlert || '';
  };

  const getSubmissionMode = (s: Submission): AssessmentType => {
    if (s.assessmentType === 'ESE' || s.assessmentType === 'LAB') {
      return s.assessmentType;
    }
    const matchedEx = exercises.find((e) => e.id === s.exerciseId);
    return matchedEx?.assessmentType === 'ESE' ? 'ESE' : 'LAB';
  };

  const getCriteriaForMode = (mode: AssessmentType): RubricCriterion[] => {
    const list = rubricConfig?.[mode];
    return list && list.length > 0 ? list : DEFAULT_RUBRIC_CONFIG[mode];
  };

  const getEvaluationContext = (s: Submission) => {
    const mode = getSubmissionMode(s);
    const cleanReg = (s.regNo || '').trim().toUpperCase();
    const criteria = getCriteriaForMode(mode);
    const modeExercises = exercises.filter(
      (ex) => (ex.assessmentType === 'ESE' ? 'ESE' : 'LAB') === mode
    );
    const modeExerciseIds = new Set(modeExercises.map((ex) => ex.id));
    const modeSubmissions = submissions.filter((sub) => {
      if (sub.assessmentType === 'ESE' || sub.assessmentType === 'LAB') {
        return sub.assessmentType === mode;
      }
      if (modeExerciseIds.has(sub.exerciseId)) return true;
      return mode === 'LAB';
    });
    const stuViolations = violations.filter((v) => v.regNo.trim().toUpperCase() === cleanReg);
    const rosterStu = students.find((st) => st.regNo.trim().toUpperCase() === cleanReg);
    const existing = evaluations.find(
      (ev) =>
        ev.regNo.trim().toUpperCase() === cleanReg &&
        (ev.assessmentType === 'ESE' ? 'ESE' : 'LAB') === mode
    );

    const record: StudentLabRecordSubmission = existing
      ? {
          ...existing,
          assessmentType: mode,
        }
      : {
          id: `REC_AUTO_${mode}_${cleanReg}`,
          timestamp: s.timestamp,
          assessmentType: mode,
          studentEmail: s.studentEmail,
          personalEmail: s.personalEmail || '',
          deviceId: s.deviceId || '',
          multiStudentAlert: getProxyWarning(s),
          regNo: cleanReg,
          studentName: s.studentName || rosterStu?.name || `Student ${cleanReg}`,
          department: rosterStu?.department || 'Department of Computer Applications',
          completedExercisesCount: modeExercises.filter((ex) =>
            modeSubmissions.some(
              (sub) =>
                sub.regNo.trim().toUpperCase() === cleanReg &&
                sub.exerciseId === ex.id &&
                sub.score === 100
            )
          ).length,
          totalExercisesCount: modeExercises.length,
          antiCheatingViolationsCount: stuViolations.length,
          status: 'PENDING_EVALUATION',
          isVerifiedAndApproved: false,
        };

    const isApproved = Boolean(
      record.isVerifiedAndApproved ||
        record.status === 'EVALUATED_APPROVED' ||
        record.status === 'APPROVED'
    );
    const isPendingFormal =
      !isApproved &&
      !record.id.startsWith('REC_AUTO_') &&
      (record.status === 'PENDING_EVALUATION' || record.status === 'PENDING');
    const totals = getEvaluationDisplayTotals(record, criteria);

    return {
      mode,
      criteria,
      modeExercises,
      modeSubmissions,
      stuViolations,
      rosterStu,
      record,
      isApproved,
      isPendingFormal,
      totals,
    };
  };

  const handleQuickApprove = (s: Submission) => {
    if (!onSaveEvaluation) return;
    const {
      mode,
      criteria,
      modeExercises,
      modeSubmissions,
      stuViolations,
      rosterStu,
      record,
      totals,
    } = getEvaluationContext(s);
    const cleanReg = (s.regNo || '').trim().toUpperCase();
    const stuSubs = modeSubmissions.filter((sub) => sub.regNo.trim().toUpperCase() === cleanReg);

    let nextDynamicScores = record.dynamicScores;
    let nextRubric = record.rubrics || record.rubric;
    let nextMaxTotal = record.maxTotalMarks || totals.maxTotal;
    let passedCount = record.completedExercisesCount;

    if (!totals.hasMarks || !nextDynamicScores) {
      const hasFormalSubmission = !record.id.startsWith('REC_AUTO_');
      const auto = computeAutoDynamicScores(
        criteria,
        modeExercises,
        stuSubs,
        stuViolations,
        hasFormalSubmission
      );
      nextDynamicScores = auto.scores;
      nextMaxTotal = auto.maxTotal;
      passedCount = auto.passedCount;
      nextRubric = buildLegacyRubricBreakdown(auto.scores, auto.total, mode);
    }

    onSaveEvaluation({
      ...record,
      id: record.id.startsWith('REC_AUTO_')
        ? `eval_${mode}_${Date.now()}_${cleanReg}`
        : record.id,
      timestamp: new Date().toISOString(),
      assessmentType: mode,
      regNo: cleanReg,
      department: record.department || rosterStu?.department || 'Department of Computer Applications',
      submissionDate: record.submissionDate || new Date().toISOString().split('T')[0],
      completedExercisesCount: passedCount,
      totalExercisesCount: modeExercises.length,
      antiCheatingViolationsCount: stuViolations.length,
      violationsCount: stuViolations.length,
      status: 'EVALUATED_APPROVED',
      isVerifiedAndApproved: true,
      rubric: nextRubric,
      rubrics: nextRubric,
      dynamicScores: nextDynamicScores,
      maxTotalMarks: nextMaxTotal,
      facultyRemarks:
        record.facultyRemarks && !record.facultyRemarks.includes('Awaiting faculty')
          ? record.facultyRemarks
          : `Verified and approved by faculty (${mode} rubric).`,
      evaluatedBy: currentUser?.name || 'Faculty Evaluator',
      evaluatedAt: new Date().toISOString(),
    });
  };

  const filtered = submissions.filter((s) => {
    const matchesEx = filterExercise === 'ALL' || s.exerciseId === filterExercise;
    const matchesStat = filterStatus === 'ALL' || s.status === filterStatus;
    const matchesSearch =
      s.studentEmail.toLowerCase().includes(search.toLowerCase()) ||
      (s.personalEmail && s.personalEmail.toLowerCase().includes(search.toLowerCase())) ||
      (s.deviceId && s.deviceId.toLowerCase().includes(search.toLowerCase())) ||
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

  const selectedEvalCtx = selectedSub ? getEvaluationContext(selectedSub) : null;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Student Submissions &amp; Evaluation</h2>
          <p className="text-xs text-slate-500">
            Official records from the Google Sheet Submissions tab with code inspection, rubric grading &amp; lab approval.
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
                <th className="py-3 px-4">Timestamp &amp; ID</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Exercise</th>
                <th className="py-3 px-4">Evaluation Status</th>
                <th className="py-3 px-4">Score</th>
                <th className="py-3 px-4">Faculty Approval</th>
                <th className="py-3 px-4 text-right">Inspect &amp; Evaluate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No submissions found matching criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => {
                  const proxyWarn = getProxyWarning(s);
                  const evalCtx = getEvaluationContext(s);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        <div>{s.timestamp}</div>
                        <span className="text-[10px] text-slate-400">{s.id}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{s.studentName || s.studentEmail}</div>
                        <div className="font-mono text-[11px] text-indigo-600">{s.regNo}</div>
                        {s.personalEmail && (
                          <div className="font-mono text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Mail className="w-2.5 h-2.5 text-slate-400" /> {s.personalEmail}
                          </div>
                        )}
                        {proxyWarn && (
                          <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-bold">
                            <AlertTriangle className="w-2.5 h-2.5 text-rose-600" /> {proxyWarn}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{s.exerciseTitle || s.exerciseId}</div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {s.exerciseId} • {evalCtx.mode}
                        </div>
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(s.status)}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 text-sm">
                        <span className={s.score === 100 ? 'text-emerald-600' : s.score > 0 ? 'text-amber-600' : 'text-rose-600'}>
                          {s.score}
                        </span>
                        <span className="text-slate-400 font-normal text-xs">/100</span>
                      </td>
                      <td className="py-3 px-4">
                        {evalCtx.isApproved ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Approved ({evalCtx.totals.total}/{evalCtx.totals.maxTotal})
                            </span>
                          </div>
                        ) : evalCtx.isPendingFormal ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Pending Approval
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {evalCtx.totals.hasMarks
                              ? `Graded (${evalCtx.totals.total}/${evalCtx.totals.maxTotal}) • Hold`
                              : 'Awaiting Eval'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5 flex-wrap">
                          {onSaveEvaluation && (
                            <>
                              <button
                                onClick={() =>
                                  setSelectedEvalTarget({ record: evalCtx.record, mode: evalCtx.mode })
                                }
                                className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center gap-1 shadow-2xs transition"
                                title={`Open ${evalCtx.mode} Rubric Evaluation for ${evalCtx.record.studentName}`}
                              >
                                <Award className="w-3.5 h-3.5" />
                                <span>{evalCtx.isApproved ? 'Re-Grade' : 'Evaluate'}</span>
                              </button>
                              {!evalCtx.isApproved && (
                                <button
                                  onClick={() => handleQuickApprove(s)}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1 shadow-2xs transition"
                                  title={`Approve ${evalCtx.mode} submission & unlock student Lab Record PDF`}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Approve</span>
                                </button>
                              )}
                            </>
                          )}
                          <button
                            onClick={() => {
                              setSelectedSub(s);
                              setReTestFeedback(null);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold inline-flex items-center gap-1 transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View Code
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
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
                    {selectedSub.exerciseTitle} • Submitted on {selectedSub.timestamp}
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
                  <div className="text-[11px] text-slate-500">Student Info &amp; Identity</div>
                  <div className="text-sm font-semibold text-slate-900">{selectedSub.studentName}</div>
                  <div className="text-xs font-mono text-indigo-600">{selectedSub.regNo}</div>
                  {selectedSub.personalEmail && (
                    <div className="text-[11px] font-mono text-slate-600 mt-0.5 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" /> {selectedSub.personalEmail}
                    </div>
                  )}
                  {selectedSub.deviceId && (
                    <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                      <Laptop className="w-3 h-3 text-slate-400" /> {selectedSub.deviceId}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">Evaluation &amp; Approval Status</div>
                  <div className="mt-1 space-y-1.5">
                    {getStatusBadge(selectedSub.status)}
                    {selectedEvalCtx && (
                      <div>
                        {selectedEvalCtx.isApproved ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Faculty Approved ({selectedEvalCtx.totals.total}/{selectedEvalCtx.totals.maxTotal})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Pending Faculty Approval
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center sm:justify-end gap-2">
                  {onSaveEvaluation && selectedEvalCtx && (
                    <>
                      <button
                        onClick={() =>
                          setSelectedEvalTarget({
                            record: selectedEvalCtx.record,
                            mode: selectedEvalCtx.mode,
                          })
                        }
                        className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white flex items-center gap-1.5 transition shadow-xs"
                      >
                        <Award className="w-3.5 h-3.5" />
                        {selectedEvalCtx.isApproved ? 'Re-Grade Rubric' : 'Evaluate Rubric'}
                      </button>
                      {!selectedEvalCtx.isApproved && (
                        <button
                          onClick={() => handleQuickApprove(selectedSub)}
                          className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white flex items-center gap-1.5 transition shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve
                        </button>
                      )}
                    </>
                  )}
                  <button
                    onClick={handleReTest}
                    disabled={reTesting}
                    className="px-3 py-2 rounded-lg bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 border border-slate-200 flex items-center gap-1.5 transition shadow-xs"
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
                    {selectedSub.publicLog || 'No execution log stored for this entry. Click "Re-Run Test" above to verify live output.'}
                  </pre>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-amber-700">Hidden / Private Test Case Log</span>
                    <span className="text-[10px] font-mono text-slate-500">Grading Test</span>
                  </div>
                  <pre className="text-[11px] font-mono text-slate-800 bg-white border border-slate-200 p-2.5 rounded-lg whitespace-pre-wrap">
                    {selectedSub.privateLog || 'No hidden test log stored for this entry. Click "Re-Run Test" above to verify live output.'}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rubric Evaluation Modal triggered directly from Submissions Hub */}
      {selectedEvalTarget && currentUser && onSaveEvaluation && (
        <RubricEvaluationModal
          isOpen={!!selectedEvalTarget}
          onClose={() => setSelectedEvalTarget(null)}
          submission={selectedEvalTarget.record}
          assessmentType={selectedEvalTarget.mode}
          rubricCriteria={getCriteriaForMode(selectedEvalTarget.mode)}
          facultyUser={currentUser}
          exercises={exercises}
          studentSubmissions={submissions.filter(
            (sub) =>
              sub.regNo.trim().toUpperCase() ===
                selectedEvalTarget.record.regNo.trim().toUpperCase() &&
              getSubmissionMode(sub) === selectedEvalTarget.mode
          )}
          studentViolations={violations.filter(
            (v) =>
              v.regNo.trim().toUpperCase() ===
              selectedEvalTarget.record.regNo.trim().toUpperCase()
          )}
          rosterStudent={students.find(
            (st) =>
              st.regNo.trim().toUpperCase() ===
              selectedEvalTarget.record.regNo.trim().toUpperCase()
          )}
          onSaveEvaluation={onSaveEvaluation}
        />
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
