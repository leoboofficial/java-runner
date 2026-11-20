import React, { useState, useEffect, useMemo } from 'react';
import {
  AssessmentType,
  DEFAULT_RUBRIC_CONFIG,
  Exercise,
  RubricCriterion,
  StudentLabRecordSubmission,
  StudentRecord,
  Submission,
  User,
  Violation,
} from '../../types';
import {
  X,
  Award,
  ShieldCheck,
  ShieldAlert,
  Mail,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  Check,
  Calculator,
} from 'lucide-react';
import {
  buildLegacyRubricBreakdown,
  clampScore,
  computeAutoDynamicScores,
  extractDynamicScores,
  getCriteriaMaxTotal,
  roundHalf,
} from '../../utils/rubricScoring';

interface RubricEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: StudentLabRecordSubmission;
  assessmentType?: AssessmentType;
  rubricCriteria?: RubricCriterion[];
  facultyUser: User;
  exercises: Exercise[];
  studentSubmissions: Submission[];
  studentViolations: Violation[];
  rosterStudent?: StudentRecord;
  onSaveEvaluation: (evaluation: StudentLabRecordSubmission) => void;
}

export const RubricEvaluationModal: React.FC<RubricEvaluationModalProps> = ({
  isOpen,
  onClose,
  submission,
  assessmentType = 'LAB',
  rubricCriteria,
  facultyUser,
  exercises,
  studentSubmissions,
  studentViolations,
  rosterStudent,
  onSaveEvaluation,
}) => {
  const criteria = useMemo(
    () =>
      rubricCriteria && rubricCriteria.length > 0
        ? rubricCriteria
        : DEFAULT_RUBRIC_CONFIG[assessmentType],
    [rubricCriteria, assessmentType]
  );

  const maxTotal = useMemo(() => Math.max(1, getCriteriaMaxTotal(criteria)), [criteria]);

  const assessmentExercises = useMemo(
    () => exercises.filter((e) => (e.assessmentType === 'ESE' ? 'ESE' : 'LAB') === assessmentType),
    [exercises, assessmentType]
  );

  const hasHighViolations = studentViolations.some((v) => v.severity === 'high');

  const computeInitialScores = (): Record<string, number> => {
    const existing = extractDynamicScores(submission, criteria);
    if (existing) {
      const merged: Record<string, number> = {};
      criteria.forEach((c) => {
        merged[c.id] = existing[c.id] !== undefined ? existing[c.id] : 0;
      });
      return merged;
    }

    const hasFormalSubmission = !submission.id.startsWith('REC_AUTO_');
    const auto = computeAutoDynamicScores(
      criteria,
      assessmentExercises,
      studentSubmissions,
      studentViolations,
      hasFormalSubmission
    );
    return auto.scores;
  };

  const [scores, setScores] = useState<Record<string, number>>(computeInitialScores);

  const buildDefaultRemark = (): string => {
    if (submission.facultyRemarks && !submission.facultyRemarks.includes('Awaiting faculty')) {
      return submission.facultyRemarks;
    }
    const label = assessmentType === 'ESE' ? 'ESE Practical Exam' : 'Lab Record';
    if (studentViolations.length === 0) {
      return `Verified Java implementation, test execution, and rubric performance for ${label}.`;
    }
    return `Evaluated ${label} with proctoring audit (${studentViolations.length} flag(s) noted).`;
  };

  const [remarks, setRemarks] = useState<string>(buildDefaultRemark);
  const [isApproved, setIsApproved] = useState<boolean>(
    submission.status === 'PENDING_EVALUATION' && submission.isVerifiedAndApproved === false
      ? true
      : submission.isVerifiedAndApproved ?? true
  );

  useEffect(() => {
    setScores(computeInitialScores());
    setRemarks(buildDefaultRemark());
    setIsApproved(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submission.id, submission.regNo, assessmentType, criteria]);

  if (!isOpen) return null;

  const totalScore = Number(
    criteria
      .reduce((sum, c) => sum + clampScore(scores[c.id] ?? 0, c.maxMarks), 0)
      .toFixed(1)
  );

  const applyPresetRatio = (ratio: number) => {
    const next: Record<string, number> = {};
    criteria.forEach((c) => {
      next[c.id] = clampScore(roundHalf(c.maxMarks * ratio), c.maxMarks);
    });
    setScores(next);
  };

  // Impersonation / Gmail mismatch / Multi-student proxy detection
  const registeredEmail = rosterStudent?.email?.trim().toLowerCase();
  const officialEmail = submission.studentEmail?.trim().toLowerCase();
  const recordedPersonalMail = (
    submission.personalEmail ||
    submission.loggedGmail ||
    submission.studentEmail ||
    ''
  )
    .trim()
    .toLowerCase();
  const isGmailMismatch =
    registeredEmail &&
    officialEmail &&
    registeredEmail !== officialEmail &&
    !registeredEmail.includes(officialEmail.split('@')[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanScores: Record<string, number> = {};
    criteria.forEach((c) => {
      cleanScores[c.id] = clampScore(scores[c.id] ?? 0, c.maxMarks);
    });

    const rubrics = buildLegacyRubricBreakdown(cleanScores, totalScore, assessmentType);

    const updated: StudentLabRecordSubmission = {
      ...submission,
      assessmentType,
      personalEmail: recordedPersonalMail,
      loggedGmail: recordedPersonalMail,
      deviceId: submission.deviceId || '',
      multiStudentAlert: submission.multiStudentAlert || '',
      status: isApproved ? 'EVALUATED_APPROVED' : 'PENDING_EVALUATION',
      rubrics,
      rubric: rubrics,
      dynamicScores: cleanScores,
      maxTotalMarks: maxTotal,
      facultyRemarks: remarks,
      evaluatedBy: facultyUser.name || 'Faculty Admin',
      evaluatedAt: new Date().toISOString(),
      isVerifiedAndApproved: isApproved,
      antiCheatingViolationsCount: studentViolations.length,
      isGmailSuspicious: Boolean(isGmailMismatch || submission.multiStudentAlert),
    };

    onSaveEvaluation(updated);
    onClose();
  };

  const getGradeBadge = (score: number) => {
    const pct = (score / maxTotal) * 100;
    if (pct >= 95) return { label: 'Outstanding (O)', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    if (pct >= 85) return { label: 'Excellent (A+)', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' };
    if (pct >= 75) return { label: 'Very Good (A)', color: 'bg-blue-100 text-blue-800 border-blue-300' };
    if (pct >= 60) return { label: 'Good (B+)', color: 'bg-amber-100 text-amber-800 border-amber-300' };
    return { label: 'Satisfactory (B)', color: 'bg-slate-100 text-slate-800 border-slate-300' };
  };

  const grade = getGradeBadge(totalScore);
  const isEse = assessmentType === 'ESE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-900">
        {/* Header */}
        <div
          className={`px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 ${
            isEse
              ? 'bg-gradient-to-r from-rose-50/90 via-white to-slate-50'
              : 'bg-gradient-to-r from-indigo-50/90 via-white to-slate-50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl text-white flex items-center justify-center shadow-xs ${
                isEse ? 'bg-rose-600' : 'bg-indigo-600'
              }`}
            >
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  {isEse ? 'ESE Practical Evaluation' : 'Lab Record Rubric Evaluation'}
                </h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                    isEse
                      ? 'bg-rose-100 text-rose-800 border-rose-200'
                      : 'bg-indigo-100 text-indigo-800 border-indigo-200'
                  }`}
                >
                  {maxTotal}-Mark Rubric
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {criteria.map((c) => `${c.label} (${c.maxMarks})`).join(' + ')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Student & Mail ID Verification Strip */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-indigo-600" />
                  <span>{submission.studentName || 'Student Name'}</span>
                  <span className="font-mono text-xs text-slate-500">({submission.regNo})</span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {submission.department || 'Department of Computer Applications'} •{' '}
                  {isEse ? 'End Semester Practical Exam' : 'Lab Exercise Assessment'}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${grade.color}`}>
                  Grade: {grade.label}
                </span>
                <span
                  className={`text-lg font-black bg-white px-3 py-1 rounded-lg border shadow-2xs font-mono ${
                    isEse ? 'text-rose-700 border-rose-200' : 'text-indigo-700 border-indigo-200'
                  }`}
                >
                  {totalScore} / {maxTotal}
                </span>
              </div>
            </div>

            {/* Mail ID & Device Audit Alert */}
            <div className="flex items-start gap-2.5 text-xs">
              <div className="p-1.5 rounded-lg bg-white border border-slate-200 shrink-0 mt-0.5">
                <Mail className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-700">Recorded Mail ID:</span>
                  <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-300">
                    {recordedPersonalMail || '—'}
                  </span>
                  {submission.deviceId && (
                    <span className="font-mono text-[11px] text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                      Device: {submission.deviceId}
                    </span>
                  )}
                  {submission.multiStudentAlert ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300">
                      <AlertTriangle className="w-3 h-3 text-rose-600" />
                      {submission.multiStudentAlert}
                    </span>
                  ) : isGmailMismatch ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300">
                      <AlertTriangle className="w-3 h-3 text-rose-600" />
                      Impersonation Alert: Differs from Roster Email ({registeredEmail})
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <Check className="w-3 h-3 text-emerald-600" />
                      Verified Mail ID &amp; Device Unique
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Official Email: <strong className="font-mono">{submission.studentEmail || '—'}</strong>
                </p>
              </div>
            </div>

            {/* Anti-Cheating Signals Badge */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
              <div className="flex items-center gap-1.5">
                {studentViolations.length === 0 ? (
                  <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Proctoring Clean Record: 0 Cheating Flags Logged
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-rose-700 font-semibold">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                    {studentViolations.length} Proctoring Incident(s) Logged
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                {assessmentExercises.length} {assessmentType} Question(s)
              </span>
            </div>
          </div>

          {/* Dynamic Rubrics Breakdown */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-indigo-600" />
                <span>
                  {isEse ? 'ESE' : 'Lab'} Rubric Criteria Scoring (Total: {maxTotal} Marks)
                </span>
              </h4>
              <span className="text-xs text-slate-500">Adjust sliders, type exact marks, or click presets</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {criteria.map((c, index) => {
                const currentVal = clampScore(scores[c.id] ?? 0, c.maxMarks);
                const step = c.maxMarks <= 2 ? 0.25 : 0.5;
                return (
                  <div
                    key={c.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">
                          {index + 1}. {c.label}
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          {c.description || 'Rubric criterion'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <input
                          type="number"
                          min={0}
                          max={c.maxMarks}
                          step={step}
                          value={currentVal}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setScores((prev) => ({
                              ...prev,
                              [c.id]: clampScore(Number.isNaN(val) ? 0 : val, c.maxMarks),
                            }));
                          }}
                          className="w-16 text-right font-mono text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <span className="text-xs font-bold text-slate-500 font-mono">/ {c.maxMarks}</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={c.maxMarks}
                      step={step}
                      value={currentVal}
                      onChange={(e) =>
                        setScores((prev) => ({
                          ...prev,
                          [c.id]: clampScore(parseFloat(e.target.value), c.maxMarks),
                        }))
                      }
                      className={`w-full cursor-pointer ${isEse ? 'accent-rose-600' : 'accent-indigo-600'}`}
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>0</span>
                      <span>{roundHalf(c.maxMarks / 2)}</span>
                      <span>{c.maxMarks}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-slate-500 font-semibold mr-1">Quick Presets:</span>
            <button
              type="button"
              onClick={() => applyPresetRatio(1)}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
            >
              Full Marks ({maxTotal}/{maxTotal})
            </button>
            <button
              type="button"
              onClick={() => applyPresetRatio(0.9)}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition"
            >
              Grade A+ (~{roundHalf(maxTotal * 0.9)}/{maxTotal})
            </button>
            <button
              type="button"
              onClick={() => applyPresetRatio(0.8)}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition"
            >
              Grade A (~{roundHalf(maxTotal * 0.8)}/{maxTotal})
            </button>
            {hasHighViolations && (
              <button
                type="button"
                onClick={() => applyPresetRatio(0.75)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition"
              >
                Integrity Penalty (~{roundHalf(maxTotal * 0.75)}/{maxTotal})
              </button>
            )}
          </div>

          {/* Faculty Remarks */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Faculty Remarks &amp; Assessment Feedback</span>
              <span className="text-[11px] font-normal text-slate-500">
                {isEse ? 'Saved to Google Sheet Evaluations (ESE)' : 'Printed on official PDF record'}
              </span>
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter remarks on student's Java code, viva/algorithm, and test performance..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Faculty Approval Toggle */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
              isApproved ? 'border-emerald-200 bg-emerald-50/70' : 'border-amber-200 bg-amber-50/70'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2
                className={`w-5 h-5 shrink-0 ${isApproved ? 'text-emerald-600' : 'text-amber-600'}`}
              />
              <div>
                <span
                  className={`text-xs font-bold block ${
                    isApproved ? 'text-emerald-950' : 'text-amber-950'
                  }`}
                >
                  {isEse
                    ? 'Finalize & Approve ESE Practical Evaluation'
                    : 'Approve Record & Unlock Student PDF Download'}
                </span>
                <span className={`text-[11px] ${isApproved ? 'text-emerald-800' : 'text-amber-800'}`}>
                  {isApproved
                    ? isEse
                      ? 'Marks will be finalized and exported with official ESE assessment marks.'
                      : 'Once saved, the student can immediately download and print their approved Lab Record PDF.'
                    : 'Marks will be saved as pending review until approved.'}
                </span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isApproved}
                onChange={(e) => setIsApproved(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 font-mono">
            Evaluated by: <strong>{facultyUser.name}</strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition flex items-center gap-1.5 ${
                isApproved ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{isApproved ? 'Evaluate & Approve' : 'Save Marks (Hold Approval)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
