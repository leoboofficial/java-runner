import React, { useState, useEffect } from 'react';
import {
  AssessmentType,
  DEFAULT_RUBRIC_CONFIG,
  DynamicRubricConfig,
  ExamModeConfig,
  Exercise,
  LoginAuditRecord,
  RubricAutoRule,
  RubricCriterion,
  StudentLabRecordSubmission,
  StudentRecord,
  Submission,
  User,
  Violation,
} from '../../types';
import {
  Award,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Mail,
  ShieldAlert,
  ShieldCheck,
  Download,
  RefreshCw,
  Sparkles,
  Printer,
  Laptop,
  Check,
  SlidersHorizontal,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  FlaskConical,
  GraduationCap,
} from 'lucide-react';
import { RubricEvaluationModal } from './RubricEvaluationModal';
import { LabRecordModal } from '../StudentPortal/LabRecordModal';
import {
  buildLegacyRubricBreakdown,
  computeAutoDynamicScores,
  extractDynamicScores,
  getCriteriaMaxTotal,
  getEvaluationDisplayTotals,
} from '../../utils/rubricScoring';

interface LabRecordEvaluationsProps {
  evaluations: StudentLabRecordSubmission[];
  exercises: Exercise[];
  submissions: Submission[];
  violations: Violation[];
  students: StudentRecord[];
  loginAudit?: LoginAuditRecord[];
  currentUser: User;
  rubricConfig: DynamicRubricConfig;
  examConfig?: ExamModeConfig;
  onSaveRubricConfig: (config: DynamicRubricConfig) => Promise<void> | void;
  onSaveEvaluation: (evaluation: StudentLabRecordSubmission) => void;
  onAutoEvaluateAll: (assessmentType: AssessmentType) => void;
  onRefreshFromSheet?: () => void;
}

export const LabRecordEvaluations: React.FC<LabRecordEvaluationsProps> = ({
  evaluations,
  exercises,
  submissions,
  violations,
  students,
  loginAudit = [],
  currentUser,
  rubricConfig,
  examConfig,
  onSaveRubricConfig,
  onSaveEvaluation,
  onAutoEvaluateAll,
  onRefreshFromSheet,
}) => {
  const [evalMode, setEvalMode] = useState<AssessmentType>(
    examConfig?.eseEnabled ? 'ESE' : 'LAB'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'SUSPICIOUS'>('ALL');
  const [selectedForEval, setSelectedForEval] = useState<StudentLabRecordSubmission | null>(null);
  const [previewStudent, setPreviewStudent] = useState<User | null>(null);

  // Collapsible Rubric Designer state
  const [showRubricEditor, setShowRubricEditor] = useState(false);
  const [editorTab, setEditorTab] = useState<AssessmentType>('LAB');
  const [draftRubrics, setDraftRubrics] = useState<DynamicRubricConfig>(rubricConfig);
  const [savingRubrics, setSavingRubrics] = useState(false);

  useEffect(() => {
    setDraftRubrics(rubricConfig);
  }, [rubricConfig]);

  const activeCriteria: RubricCriterion[] = React.useMemo(
    () =>
      rubricConfig[evalMode] && rubricConfig[evalMode].length > 0
        ? rubricConfig[evalMode]
        : DEFAULT_RUBRIC_CONFIG[evalMode],
    [rubricConfig, evalMode]
  );

  const activeMaxTotal = React.useMemo(
    () => Math.max(1, getCriteriaMaxTotal(activeCriteria)),
    [activeCriteria]
  );

  // Scoped exercises, submissions, and evaluations for active mode (LAB vs ESE)
  const modeExercises = React.useMemo(
    () => exercises.filter((ex) => (ex.assessmentType === 'ESE' ? 'ESE' : 'LAB') === evalMode),
    [exercises, evalMode]
  );

  const modeExerciseIds = React.useMemo(
    () => new Set(modeExercises.map((ex) => ex.id)),
    [modeExercises]
  );

  const modeSubmissions = React.useMemo(
    () =>
      submissions.filter((s) => {
        if (s.assessmentType === 'ESE' || s.assessmentType === 'LAB') {
          return s.assessmentType === evalMode;
        }
        if (modeExerciseIds.has(s.exerciseId)) return true;
        return evalMode === 'LAB';
      }),
    [submissions, evalMode, modeExerciseIds]
  );

  const modeEvaluations = React.useMemo(
    () =>
      evaluations.filter(
        (ev) => (ev.assessmentType === 'ESE' ? 'ESE' : 'LAB') === evalMode
      ),
    [evaluations, evalMode]
  );

  // Build unified list of students who submitted or were evaluated for active assessmentType
  const unifiedRecords: StudentLabRecordSubmission[] = React.useMemo(() => {
    const mailToRegs = new Map<string, Set<string>>();
    const devToRegs = new Map<string, Set<string>>();
    const latestAuditByReg = new Map<string, LoginAuditRecord>();

    const registerIdentity = (reg: string, mail?: string, dev?: string) => {
      const cleanReg = (reg || '').trim().toUpperCase();
      if (!cleanReg) return;
      const cleanMail = (mail || '').trim().toLowerCase();
      const cleanDev = (dev || '').trim();
      if (cleanMail) {
        if (!mailToRegs.has(cleanMail)) mailToRegs.set(cleanMail, new Set());
        mailToRegs.get(cleanMail)!.add(cleanReg);
      }
      if (cleanDev && cleanDev !== 'UNKNOWN') {
        if (!devToRegs.has(cleanDev)) devToRegs.set(cleanDev, new Set());
        devToRegs.get(cleanDev)!.add(cleanReg);
      }
    };

    loginAudit.forEach((a) => {
      const reg = (a.regNo || '').trim().toUpperCase();
      if (reg && !latestAuditByReg.has(reg)) {
        latestAuditByReg.set(reg, a);
      }
      registerIdentity(reg, a.personalEmail, a.deviceId);
    });

    submissions.forEach((s) => registerIdentity(s.regNo, s.personalEmail, s.deviceId));
    evaluations.forEach((e) => registerIdentity(e.regNo, e.personalEmail || e.loggedGmail, e.deviceId));

    const buildProxyAlert = (reg: string, mail?: string, dev?: string, existing?: string): string => {
      const cleanReg = (reg || '').trim().toUpperCase();
      const cleanMail = (mail || '').trim().toLowerCase();
      const cleanDev = (dev || '').trim();
      const sharedRegs = new Set<string>();

      if (cleanMail && mailToRegs.has(cleanMail)) {
        mailToRegs.get(cleanMail)!.forEach((r) => {
          if (r !== cleanReg) sharedRegs.add(r);
        });
      }
      if (cleanDev && devToRegs.has(cleanDev)) {
        devToRegs.get(cleanDev)!.forEach((r) => {
          if (r !== cleanReg) sharedRegs.add(r);
        });
      }

      if (sharedRegs.size > 0) {
        return `FLAGGED: Shared Mail ID / Device also used for RegNo(s): ${Array.from(sharedRegs).join(', ')}`;
      }
      return existing && existing !== 'CLEAR' ? existing : '';
    };

    const list: StudentLabRecordSubmission[] = [];
    const processedRegs = new Set<string>();

    // 1. Existing evaluations in this mode
    modeEvaluations.forEach((ev) => {
      const reg = ev.regNo.trim().toUpperCase();
      processedRegs.add(reg);
      const rosterStu = students.find((s) => s.regNo.trim().toUpperCase() === reg);
      const audit = latestAuditByReg.get(reg);
      const recordedMail = (ev.personalEmail || ev.loggedGmail || audit?.personalEmail || '').trim().toLowerCase();
      const devId = ev.deviceId || audit?.deviceId || '';
      const proxyAlert = buildProxyAlert(reg, recordedMail, devId, ev.multiStudentAlert);

      const isMismatch = Boolean(
        rosterStu &&
          ev.studentEmail &&
          rosterStu.email.trim().toLowerCase() !== ev.studentEmail.trim().toLowerCase() &&
          !rosterStu.email.toLowerCase().includes(ev.studentEmail.split('@')[0].toLowerCase())
      );

      list.push({
        ...ev,
        assessmentType: evalMode,
        personalEmail: recordedMail,
        deviceId: devId,
        multiStudentAlert: proxyAlert,
        isGmailSuspicious: Boolean(isMismatch || proxyAlert),
      });
    });

    // 2. Code submissions in this mode awaiting evaluation
    modeSubmissions.forEach((sub) => {
      const reg = sub.regNo.trim().toUpperCase();
      if (!processedRegs.has(reg)) {
        processedRegs.add(reg);
        const stuViolations = violations.filter((v) => v.regNo.trim().toUpperCase() === reg);
        const rosterStu = students.find((s) => s.regNo.trim().toUpperCase() === reg);
        const audit = latestAuditByReg.get(reg);
        const recordedMail = (sub.personalEmail || audit?.personalEmail || '').trim().toLowerCase();
        const devId = sub.deviceId || audit?.deviceId || '';
        const proxyAlert = buildProxyAlert(reg, recordedMail, devId, sub.multiStudentAlert);

        const isMismatch = Boolean(
          rosterStu &&
            sub.studentEmail &&
            rosterStu.email.trim().toLowerCase() !== sub.studentEmail.trim().toLowerCase() &&
            !rosterStu.email.toLowerCase().includes(sub.studentEmail.split('@')[0].toLowerCase())
        );

        list.push({
          id: `REC_AUTO_${evalMode}_${reg}`,
          timestamp: sub.timestamp,
          assessmentType: evalMode,
          studentEmail: sub.studentEmail,
          personalEmail: recordedMail,
          deviceId: devId,
          multiStudentAlert: proxyAlert,
          regNo: reg,
          studentName: sub.studentName || rosterStu?.name || `Student ${reg}`,
          completedExercisesCount: modeExercises.filter((ex) =>
            modeSubmissions.some((s) => s.regNo.trim().toUpperCase() === reg && s.exerciseId === ex.id && s.score === 100)
          ).length,
          totalExercisesCount: modeExercises.length,
          antiCheatingViolationsCount: stuViolations.length,
          status: 'PENDING_EVALUATION',
          isVerifiedAndApproved: false,
          isGmailSuspicious: Boolean(isMismatch || proxyAlert),
        });
      }
    });

    return list;
  }, [modeEvaluations, modeSubmissions, violations, students, modeExercises, loginAudit, submissions, evaluations, evalMode]);

  // Filtered list
  const filtered = unifiedRecords.filter((rec) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      rec.studentName.toLowerCase().includes(term) ||
      rec.regNo.toLowerCase().includes(term) ||
      rec.studentEmail.toLowerCase().includes(term) ||
      (rec.personalEmail && rec.personalEmail.toLowerCase().includes(term)) ||
      (rec.deviceId && rec.deviceId.toLowerCase().includes(term));

    if (!matchesSearch) return false;

    if (statusFilter === 'PENDING') return rec.status === 'PENDING_EVALUATION' || !rec.isVerifiedAndApproved;
    if (statusFilter === 'APPROVED') return rec.isVerifiedAndApproved;
    if (statusFilter === 'SUSPICIOUS')
      return rec.isGmailSuspicious || Boolean(rec.multiStudentAlert) || rec.antiCheatingViolationsCount > 0;
    return true;
  });

  // KPI Calculations
  const totalSubmissions = unifiedRecords.length;
  const approvedCount = unifiedRecords.filter((r) => r.isVerifiedAndApproved).length;
  const pendingCount = totalSubmissions - approvedCount;
  const suspiciousGmailCount = unifiedRecords.filter(
    (r) => r.isGmailSuspicious || Boolean(r.multiStudentAlert)
  ).length;

  const avgScore =
    approvedCount > 0
      ? (
          unifiedRecords
            .filter((r) => r.isVerifiedAndApproved)
            .reduce((sum, r) => sum + getEvaluationDisplayTotals(r, activeCriteria).total, 0) /
          approvedCount
        ).toFixed(1)
      : '0.0';

  const handleAutoEvaluateSingle = (item: StudentLabRecordSubmission) => {
    const cleanReg = item.regNo.trim().toUpperCase();
    const stuSubmissions = modeSubmissions.filter((s) => s.regNo.trim().toUpperCase() === cleanReg);
    const stuViolations = violations.filter((v) => v.regNo.trim().toUpperCase() === cleanReg);
    const hasFormalSubmission = !item.id.startsWith('REC_AUTO_');

    const { scores, total, maxTotal, passedCount } = computeAutoDynamicScores(
      activeCriteria,
      modeExercises,
      stuSubmissions,
      stuViolations,
      hasFormalSubmission
    );

    const rosterStu = students.find((s) => s.regNo.trim().toUpperCase() === cleanReg);
    const rubricData = buildLegacyRubricBreakdown(scores, total, evalMode);

    onSaveEvaluation({
      ...item,
      id: item.id.startsWith('REC_AUTO_') ? `eval_${evalMode}_${Date.now()}_${cleanReg}` : item.id,
      timestamp: new Date().toISOString(),
      assessmentType: evalMode,
      regNo: cleanReg,
      department: item.department || rosterStu?.department || 'Department of Computer Applications',
      submissionDate: item.submissionDate || new Date().toISOString().split('T')[0],
      completedExercisesCount: passedCount,
      totalExercisesCount: modeExercises.length,
      antiCheatingViolationsCount: stuViolations.length,
      violationsCount: stuViolations.length,
      status: 'EVALUATED_APPROVED',
      isVerifiedAndApproved: true,
      rubric: rubricData,
      rubrics: rubricData,
      dynamicScores: scores,
      maxTotalMarks: maxTotal,
      facultyRemarks:
        item.facultyRemarks && !item.facultyRemarks.includes('Awaiting faculty')
          ? item.facultyRemarks
          : `Auto-evaluated on ${evalMode} rubric (${activeCriteria
              .map((c) => `${c.label}: ${c.maxMarks}`)
              .join(', ')}).`,
      evaluatedBy: currentUser.name || 'Faculty Evaluator',
      evaluatedAt: new Date().toISOString(),
    });
  };

  // Export Marksheet CSV (Dynamic Criteria Columns)
  const handleExportCSV = () => {
    const criteriaHeaders = activeCriteria.map((c) => `${c.label} (${c.maxMarks})`);
    const headers = [
      'Assessment Type',
      'Registration Number',
      'Student Name',
      'Official University Email',
      'Recorded Personal Mail ID',
      'Device ID',
      'Multi-Student Proxy Alert',
      'Roster Registered Email',
      'Identity Status',
      'Status',
      ...criteriaHeaders,
      `Total Marks (${activeMaxTotal})`,
      'Anti-Cheating Violations Count',
      'Faculty Remarks',
      'Evaluated By',
      'Evaluated At',
    ];

    const rows = unifiedRecords.map((r) => {
      const rosterStu = students.find(
        (s) => s.regNo.trim().toUpperCase() === r.regNo.trim().toUpperCase()
      );
      const dyn = extractDynamicScores(r, activeCriteria);
      const totals = getEvaluationDisplayTotals(r, activeCriteria);
      const criteriaCols = activeCriteria.map((c) => (dyn && dyn[c.id] !== undefined ? dyn[c.id] : ''));

      return [
        `"${evalMode}"`,
        `"${r.regNo}"`,
        `"${r.studentName}"`,
        `"${r.studentEmail}"`,
        `"${r.personalEmail || r.loggedGmail || ''}"`,
        `"${r.deviceId || ''}"`,
        `"${(r.multiStudentAlert || 'CLEAR').replace(/"/g, '""')}"`,
        `"${rosterStu?.email || ''}"`,
        r.isGmailSuspicious ? '"FLAGGED_REVIEW"' : '"VERIFIED"',
        `"${r.status}"`,
        ...criteriaCols,
        totals.hasMarks ? totals.total : '',
        r.antiCheatingViolationsCount,
        `"${(r.facultyRemarks || '').replace(/"/g, '""')}"`,
        `"${r.evaluatedBy || ''}"`,
        `"${r.evaluatedAt || ''}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HITS_${evalMode}_Rubrics_Marksheet_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Rubric Designer Helpers
  const updateCriterion = (
    tab: AssessmentType,
    index: number,
    patch: Partial<RubricCriterion>
  ) => {
    setDraftRubrics((prev) => ({
      ...prev,
      [tab]: prev[tab].map((item, idx) => (idx === index ? { ...item, ...patch } : item)),
    }));
  };

  const addCriterion = (tab: AssessmentType) => {
    const newId = `${tab.toLowerCase()}_crit_${Date.now().toString().slice(-4)}`;
    setDraftRubrics((prev) => ({
      ...prev,
      [tab]: [
        ...prev[tab],
        {
          id: newId,
          label: 'New Criterion',
          description: 'Describe evaluation expectation',
          maxMarks: 5,
          autoRule: 'MANUAL',
        },
      ],
    }));
  };

  const removeCriterion = (tab: AssessmentType, index: number) => {
    if (draftRubrics[tab].length <= 1) return;
    setDraftRubrics((prev) => ({
      ...prev,
      [tab]: prev[tab].filter((_, idx) => idx !== index),
    }));
  };

  const handleSaveRubricsClick = async () => {
    setSavingRubrics(true);
    try {
      await onSaveRubricConfig(draftRubrics);
    } finally {
      setSavingRubrics(false);
    }
  };

  const isEseMode = evalMode === 'ESE';

  return (
    <div className="space-y-6">
      {/* Assessment Mode Switcher: LAB vs ESE Practical */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEvalMode('LAB');
              setEditorTab('LAB');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              evalMode === 'LAB'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <FlaskConical className="w-4 h-4" />
            <span>Lab Exercise Evaluations (LAB)</span>
          </button>
          <button
            onClick={() => {
              setEvalMode('ESE');
              setEditorTab('ESE');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              evalMode === 'ESE'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>ESE Practical Evaluations (ESE)</span>
          </button>
        </div>

        <button
          onClick={() => {
            setEditorTab(evalMode);
            setShowRubricEditor((prev) => !prev);
          }}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition ${
            showRubricEditor
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>{showRubricEditor ? 'Hide Rubric Builder' : 'Configure Rubrics (LAB & ESE)'}</span>
        </button>
      </div>

      {/* Collapsible Dynamic Rubric Builder */}
      {showRubricEditor && (
        <div className="bg-white border border-indigo-200 rounded-2xl p-5 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                Dynamic Rubric Criteria Manager (Synced to Google Sheet)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Customize evaluation criteria and max marks separately for <strong>Lab Exercises</strong> and <strong>ESE Practicals</strong>.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setEditorTab('LAB')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  editorTab === 'LAB' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                LAB ({getCriteriaMaxTotal(draftRubrics.LAB)} Marks)
              </button>
              <button
                type="button"
                onClick={() => setEditorTab('ESE')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  editorTab === 'ESE' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ESE ({getCriteriaMaxTotal(draftRubrics.ESE)} Marks)
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {draftRubrics[editorTab].map((crit, idx) => (
              <div
                key={crit.id + '_' + idx}
                className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center bg-slate-50 border border-slate-200 rounded-xl p-3"
              >
                <div className="md:col-span-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                    Criterion Label
                  </label>
                  <input
                    type="text"
                    value={crit.label}
                    onChange={(e) => updateCriterion(editorTab, idx, { label: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="md:col-span-4">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                    Description / Expectation
                  </label>
                  <input
                    type="text"
                    value={crit.description || ''}
                    onChange={(e) => updateCriterion(editorTab, idx, { description: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                    Max Marks
                  </label>
                  <input
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={crit.maxMarks}
                    onChange={(e) =>
                      updateCriterion(editorTab, idx, {
                        maxMarks: Math.max(0.5, parseFloat(e.target.value) || 1),
                      })
                    }
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-indigo-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                    Auto-Eval Rule
                  </label>
                  <select
                    value={crit.autoRule || 'MANUAL'}
                    onChange={(e) =>
                      updateCriterion(editorTab, idx, { autoRule: e.target.value as RubricAutoRule })
                    }
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="CODE_IMPLEMENTATION">Code &amp; Integrity</option>
                    <option value="OUTPUT_TESTS">Test Case Output</option>
                    <option value="DOCUMENTATION">Docs / Algorithm</option>
                    <option value="MANUAL">Manual / Viva</option>
                  </select>
                </div>
                <div className="md:col-span-1 flex justify-end pt-4 md:pt-3">
                  <button
                    type="button"
                    disabled={draftRubrics[editorTab].length <= 1}
                    onClick={() => removeCriterion(editorTab, idx)}
                    className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 disabled:opacity-30 transition"
                    title="Remove criterion"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => addCriterion(editorTab)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add {editorTab} Criterion
              </button>
              <button
                type="button"
                onClick={() =>
                  setDraftRubrics((prev) => ({
                    ...prev,
                    [editorTab]: DEFAULT_RUBRIC_CONFIG[editorTab],
                  }))
                }
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset {editorTab} Default
              </button>
            </div>

            <button
              type="button"
              onClick={handleSaveRubricsClick}
              disabled={savingRubrics}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition disabled:opacity-60"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingRubrics ? 'Saving...' : 'Save Rubrics to Sheet'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Top Banner */}
      <div
        className={`border rounded-2xl p-6 shadow-xs ${
          isEseMode
            ? 'bg-gradient-to-r from-rose-50/90 via-white to-slate-50 border-rose-200/80'
            : 'bg-gradient-to-r from-indigo-50/90 via-white to-slate-50 border-indigo-200/80'
        }`}
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md ${
                isEseMode
                  ? 'bg-gradient-to-tr from-rose-600 to-amber-600 shadow-rose-500/20'
                  : 'bg-gradient-to-tr from-indigo-600 to-violet-600 shadow-indigo-500/20'
              }`}
            >
              {isEseMode ? <GraduationCap className="w-6 h-6" /> : <Award className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  {isEseMode
                    ? 'ESE Practical Exam Evaluation & Marksheet'
                    : 'Lab Record Rubric Evaluation & Anti-Cheating Portal'}
                </h2>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                    isEseMode
                      ? 'bg-rose-100 text-rose-800 border-rose-200'
                      : 'bg-indigo-100 text-indigo-800 border-indigo-200'
                  }`}
                >
                  {activeMaxTotal}-Mark {evalMode} Rubric
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Active Criteria:{' '}
                {activeCriteria.map((c, idx) => (
                  <React.Fragment key={c.id}>
                    {idx > 0 && ' + '}
                    <strong>
                      {c.label} ({c.maxMarks})
                    </strong>
                  </React.Fragment>
                ))}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onRefreshFromSheet && (
              <button
                onClick={onRefreshFromSheet}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition shadow-xs"
                title="Pull latest evaluations, submissions, and rubrics from Google Sheet"
              >
                <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
                <span>Sync from Sheet</span>
              </button>
            )}

            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition shadow-xs"
              title={`Download ${evalMode} marksheet with dynamic rubric breakdown`}
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span>Export {evalMode} CSV</span>
            </button>
          </div>
        </div>

        {/* 4 Summary Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] text-slate-500 font-semibold flex items-center justify-between">
              <span>{evalMode} Candidates</span>
              <Award className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">{totalSubmissions}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{pendingCount} awaiting evaluation</div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
            <div className="text-[11px] text-emerald-700 font-semibold flex items-center justify-between">
              <span>Verified &amp; Approved</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-600 mt-1">{approvedCount}</div>
            <div className="text-[10px] text-emerald-700 mt-0.5">
              {isEseMode ? 'Finalized ESE Marks' : 'Unlocked for Final Print'}
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-indigo-200 shadow-2xs">
            <div className="text-[11px] text-indigo-700 font-semibold flex items-center justify-between">
              <span>Class Average</span>
              <Award className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-indigo-700 mt-1">
              {avgScore} / {activeMaxTotal}
            </div>
            <div className="text-[10px] text-indigo-600 mt-0.5">
              {evalMode} {activeMaxTotal}-Mark Rubric
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-rose-200 shadow-2xs">
            <div className="text-[11px] text-rose-700 font-semibold flex items-center justify-between">
              <span>Proxy / Mail Alerts</span>
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-rose-600 mt-1">{suspiciousGmailCount}</div>
            <div className="text-[10px] text-rose-600 mt-0.5">Shared Mail ID or Device</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by student, reg no, Mail ID, or device ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto flex-wrap">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-500 font-medium mr-1">Filter:</span>
          {(['ALL', 'PENDING', 'APPROVED', 'SUSPICIOUS'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setStatusFilter(mode)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                statusFilter === mode
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {mode === 'ALL' && 'All Students'}
              {mode === 'PENDING' && `Pending (${pendingCount})`}
              {mode === 'APPROVED' && `Approved (${approvedCount})`}
              {mode === 'SUSPICIOUS' && `Proxy / Mail Alerts (${suspiciousGmailCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* Submitted Lab Records / ESE Evaluations Table */}
      <div
        id="submitted-lab-records-section"
        className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs"
      >
        <div className="px-5 py-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-black text-slate-900 tracking-tight">
                {isEseMode ? 'ESE Practical Exam Submissions' : 'Submitted Lab Records'}
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                {filtered.length} Student{filtered.length === 1 ? '' : 's'}
              </span>
              {pendingCount > 0 ? (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  {pendingCount} Pending Evaluation
                </span>
              ) : (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  All {evalMode} Evaluations Complete
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {isEseMode
                ? 'Grade student ESE practical solutions on your configured ESE rubric (including viva marks).'
                : 'Review individual student records, grade manually or auto-evaluate pending submissions, and approve PDF downloads.'}
            </p>
          </div>

          {pendingCount > 0 && (
            <button
              onClick={() => onAutoEvaluateAll(evalMode)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition shrink-0 self-start sm:self-auto"
              title={`Auto-evaluate and approve all pending ${evalMode} records`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auto-Evaluate Pending ({pendingCount})</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[11px] border-b border-slate-200 tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Student / Reg No</th>
                <th className="px-4 py-3.5">Official &amp; Recorded Mail ID</th>
                <th className="px-4 py-3.5 text-center">{evalMode} Programs</th>
                <th className="px-4 py-3.5 text-center">Anti-Cheating</th>
                <th className="px-4 py-3.5 text-center">Rubric Marks ({activeMaxTotal})</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <Award className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    No {evalMode} student submissions match the current filter.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const rosterStu = students.find(
                    (s) => s.regNo.trim().toUpperCase() === item.regNo.trim().toUpperCase()
                  );
                  const recordedMail = item.personalEmail || item.loggedGmail || '';
                  const isRecordSubmitted = !item.id.startsWith('REC_AUTO_');
                  const dynScores = extractDynamicScores(item, activeCriteria);
                  const totals = getEvaluationDisplayTotals(item, activeCriteria);

                  return (
                    <tr key={`${evalMode}_${item.regNo}`} className="hover:bg-slate-50/80 transition">
                      {/* Student Info */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{item.studentName}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[11px] text-slate-500">{item.regNo}</span>
                          {isRecordSubmitted ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
                              {isEseMode ? 'ESE Evaluated' : 'Record Submitted'}
                            </span>
                          ) : (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 uppercase">
                              Code Submitted
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Official Email, Recorded Mail ID & Device Audit */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-900">
                            <Mail className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span className="font-semibold" title="Official University Email">
                              {item.studentEmail || '—'}
                            </span>
                          </div>
                          {recordedMail && (
                            <div className="text-[10px] font-mono text-indigo-700">
                              Device Gmail: {recordedMail}
                            </div>
                          )}
                          {item.deviceId && (
                            <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                              <Laptop className="w-3 h-3" /> {item.deviceId}
                            </div>
                          )}
                          {item.multiStudentAlert ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 w-fit">
                              <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                              {item.multiStudentAlert}
                            </span>
                          ) : item.isGmailSuspicious ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 w-fit">
                              <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                              Mismatch: Roster is {rosterStu?.email}
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-700 font-medium">
                              Unique Mail ID &amp; Device verified
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Programs Completed */}
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-1 rounded-md bg-slate-100 font-bold font-mono text-[11px] text-slate-800">
                          {item.completedExercisesCount} / {modeExercises.length} Done
                        </span>
                      </td>

                      {/* Anti-Cheating Signals */}
                      <td className="px-4 py-3 text-center">
                        {item.antiCheatingViolationsCount === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" /> Clean
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <ShieldAlert className="w-3 h-3 text-rose-600" />
                            {item.antiCheatingViolationsCount} Flags
                          </span>
                        )}
                      </td>

                      {/* Rubric Breakdown Marks */}
                      <td className="px-4 py-3 text-center">
                        {totals.hasMarks ? (
                          <div>
                            <div
                              className={`font-mono text-sm font-black ${
                                isEseMode ? 'text-rose-700' : 'text-indigo-700'
                              }`}
                            >
                              {totals.total} / {totals.maxTotal}
                            </div>
                            {dynScores && (
                              <div className="text-[10px] text-slate-400 font-mono max-w-44 mx-auto truncate">
                                {activeCriteria
                                  .map((c) => `${c.label.split(' ')[0]}:${dynScores[c.id] ?? 0}`)
                                  .join(' | ')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px] italic">
                            Not Evaluated
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        {item.isVerifiedAndApproved ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Pending Review
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!item.isVerifiedAndApproved && (
                            <button
                              onClick={() => handleAutoEvaluateSingle(item)}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition"
                              title={`Auto-evaluate on ${evalMode} rubric`}
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Auto-Eval</span>
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedForEval(item)}
                            className={`px-3 py-1.5 rounded-lg text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition ${
                              isEseMode
                                ? 'bg-rose-600 hover:bg-rose-700'
                                : 'bg-indigo-600 hover:bg-indigo-700'
                            }`}
                            title={`Open ${activeMaxTotal}-Mark ${evalMode} Rubric Evaluation Modal`}
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>{item.isVerifiedAndApproved ? 'Re-Grade' : 'Evaluate'}</span>
                          </button>

                          {!item.isVerifiedAndApproved && totals.hasMarks && (
                            <button
                              onClick={() =>
                                onSaveEvaluation({
                                  ...item,
                                  assessmentType: evalMode,
                                  status: 'EVALUATED_APPROVED',
                                  isVerifiedAndApproved: true,
                                  evaluatedBy: currentUser.name || 'Faculty Admin',
                                  evaluatedAt: new Date().toISOString(),
                                })
                              }
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition"
                              title="Approve this evaluated record"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                          )}

                          {!isEseMode && (
                            <button
                              onClick={() =>
                                setPreviewStudent({
                                  role: 'STUDENT',
                                  email: item.studentEmail,
                                  personalEmail: item.personalEmail,
                                  deviceId: item.deviceId,
                                  name: item.studentName,
                                  regNo: item.regNo,
                                })
                              }
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1 border border-slate-300 transition"
                              title="Inspect student's formatted PDF Lab Record"
                            >
                              <Printer className="w-3.5 h-3.5 text-slate-600" />
                              <span>PDF</span>
                            </button>
                          )}
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

      {/* Dynamic Rubric Evaluation Modal */}
      {selectedForEval && (
        <RubricEvaluationModal
          isOpen={!!selectedForEval}
          onClose={() => setSelectedForEval(null)}
          submission={selectedForEval}
          assessmentType={evalMode}
          rubricCriteria={activeCriteria}
          facultyUser={currentUser}
          exercises={exercises}
          studentSubmissions={modeSubmissions.filter(
            (s) => s.regNo.trim().toUpperCase() === selectedForEval.regNo.trim().toUpperCase()
          )}
          studentViolations={violations.filter(
            (v) => v.regNo.trim().toUpperCase() === selectedForEval.regNo.trim().toUpperCase()
          )}
          rosterStudent={students.find(
            (s) => s.regNo.trim().toUpperCase() === selectedForEval.regNo.trim().toUpperCase()
          )}
          onSaveEvaluation={onSaveEvaluation}
        />
      )}

      {/* Lab Record PDF Preview Modal (for LAB records) */}
      {previewStudent && (
        <LabRecordModal
          isOpen={!!previewStudent}
          onClose={() => setPreviewStudent(null)}
          currentUser={previewStudent}
          exercises={exercises.filter((e) => (e.assessmentType || 'LAB') !== 'ESE')}
          submissions={submissions.filter((s) => (s.assessmentType || 'LAB') !== 'ESE')}
          evaluation={evaluations.find(
            (e) =>
              (e.assessmentType || 'LAB') === 'LAB' &&
              e.regNo.trim().toUpperCase() === previewStudent.regNo?.trim().toUpperCase()
          )}
          isFacultyPreview={true}
        />
      )}
    </div>
  );
};
