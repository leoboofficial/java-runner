import React, { useState, useEffect } from 'react';
import {
  StudentLabRecordSubmission,
  RubricBreakdown,
  Exercise,
  Submission,
  Violation,
  User,
  StudentRecord,
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
  FileCode2,
  Check,
  Calculator,
} from 'lucide-react';

interface RubricEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: StudentLabRecordSubmission;
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
  facultyUser,
  exercises,
  studentSubmissions,
  studentViolations,
  rosterStudent,
  onSaveEvaluation,
}) => {
  // Auto-calculate initial scores based on actual code execution & rules
  const allTestsPassed =
    exercises.length > 0 &&
    exercises.every((ex) => {
      const sub = studentSubmissions.find((s) => s.exerciseId === ex.id && s.score === 100);
      return !!sub;
    });

  const hasHighViolations = studentViolations.some((v) => v.severity === 'high');

  // Rubric state (Total 10 Marks)
  const [concept, setConcept] = useState<number>(
    submission.rubrics?.conceptImplemented ?? (allTestsPassed ? 5 : 4)
  );
  const [naming, setNaming] = useState<number>(
    submission.rubrics?.namingConventions ?? 1
  );
  const [documentation, setDocumentation] = useState<number>(
    submission.rubrics?.documentation ?? 1
  );
  const [output, setOutput] = useState<number>(
    submission.rubrics?.output ?? (allTestsPassed ? 3 : 2)
  );

  const [remarks, setRemarks] = useState<string>(
    submission.facultyRemarks && !submission.facultyRemarks.includes('Awaiting faculty')
      ? submission.facultyRemarks
      : allTestsPassed && studentViolations.length === 0
      ? 'All test cases passed. Excellent Java implementation and clean documentation. Approved for final record download & print.'
      : 'Good effort. Verified logic and output. Approved for final record download & print.'
  );

  const [isApproved, setIsApproved] = useState<boolean>(true);

  // Sync when submission changes
  useEffect(() => {
    if (submission.rubrics) {
      setConcept(submission.rubrics.conceptImplemented);
      setNaming(submission.rubrics.namingConventions);
      setDocumentation(submission.rubrics.documentation);
      setOutput(submission.rubrics.output);
    }
    if (submission.facultyRemarks) {
      setRemarks(submission.facultyRemarks);
    }
  }, [submission]);

  if (!isOpen) return null;

  const totalScore = Math.min(10, Math.max(0, Number((concept + naming + documentation + output).toFixed(1))));

  // Impersonation / Gmail mismatch / Multi-student proxy detection
  const registeredEmail = rosterStudent?.email?.trim().toLowerCase();
  const officialEmail = submission.studentEmail?.trim().toLowerCase();
  const recordedPersonalMail = (submission.personalEmail || submission.loggedGmail || submission.studentEmail || '').trim().toLowerCase();
  const isGmailMismatch =
    registeredEmail &&
    officialEmail &&
    registeredEmail !== officialEmail &&
    !registeredEmail.includes(officialEmail.split('@')[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const rubrics: RubricBreakdown = {
      conceptImplemented: concept,
      namingConventions: naming,
      documentation,
      output,
      total: totalScore,
    };

    const updated: StudentLabRecordSubmission = {
      ...submission,
      personalEmail: recordedPersonalMail,
      loggedGmail: recordedPersonalMail,
      deviceId: submission.deviceId || '',
      multiStudentAlert: submission.multiStudentAlert || '',
      status: isApproved ? 'EVALUATED_APPROVED' : 'PENDING_EVALUATION',
      rubrics,
      facultyRemarks: remarks,
      evaluatedBy: facultyUser.name || 'Dr. Sathish Kumar M, Faculty Admin',
      evaluatedAt: new Date().toISOString(),
      isVerifiedAndApproved: isApproved,
      antiCheatingViolationsCount: studentViolations.length,
      isGmailSuspicious: Boolean(isGmailMismatch || submission.multiStudentAlert),
    };

    onSaveEvaluation(updated);
    onClose();
  };

  const getGradeBadge = (score: number) => {
    if (score >= 9.5) return { label: 'Outstanding (O)', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    if (score >= 8.5) return { label: 'Excellent (A+)', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' };
    if (score >= 7.5) return { label: 'Very Good (A)', color: 'bg-blue-100 text-blue-800 border-blue-300' };
    if (score >= 6.0) return { label: 'Good (B+)', color: 'bg-amber-100 text-amber-800 border-amber-300' };
    return { label: 'Satisfactory (B)', color: 'bg-slate-100 text-slate-800 border-slate-300' };
  };

  const grade = getGradeBadge(totalScore);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-900">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-50/90 via-white to-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Lab Record Rubric Evaluation</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 uppercase">
                  10-Mark Rubric
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Official HITS Evaluation Criteria • Concept (5) + Naming (1) + Documentation (1) + Output (3)
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
                  Department of Computer Applications • BCB52003 Object Oriented Programming Lab
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${grade.color}`}>
                  Grade: {grade.label}
                </span>
                <span className="text-lg font-black text-indigo-700 bg-white px-3 py-1 rounded-lg border border-indigo-200 shadow-2xs font-mono">
                  {totalScore} / 10
                </span>
              </div>
            </div>

            {/* Mail ID & Device Audit Alert - Solves multi-student impersonation verification */}
            <div className="flex items-start gap-2.5 text-xs">
              <div className="p-1.5 rounded-lg bg-white border border-slate-200 shrink-0 mt-0.5">
                <Mail className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-700">Recorded Mail ID:</span>
                  <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-300">
                    {recordedPersonalMail}
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
                  Official Email: <strong className="font-mono">{submission.studentEmail}</strong> &bull; Logged to detect if one student logs in or submits for multiple Registration Numbers.
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
                    {studentViolations.length} Proctoring Incident(s) Logged during Exam
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                {exercises.length} Exercises Submitted
              </span>
            </div>
          </div>

          {/* Interactive Rubrics Breakdown (Exact 4 Criteria from Syllabus) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-indigo-600" />
                <span>Rubric Criteria Scoring (Total: 10 Marks)</span>
              </h4>
              <span className="text-xs text-slate-500">Adjust scores or click presets</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* 1. Concept Implemented (5 Marks) */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      1. Concept Implemented
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Correct Java OOP logic, Scanner, control structures
                    </span>
                  </div>
                  <span className="text-sm font-black text-indigo-700 font-mono bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    {concept} / 5
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={concept}
                  onChange={(e) => setConcept(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>0 (Incomplete)</span>
                  <span>2.5 (Partial Logic)</span>
                  <span>5 (Sound Architecture)</span>
                </div>
              </div>

              {/* 2. Output (3 Marks) */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      2. Output Accuracy
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Standard public & hidden test execution passes
                    </span>
                  </div>
                  <span className="text-sm font-black text-indigo-700 font-mono bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    {output} / 3
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="3"
                  step="0.5"
                  value={output}
                  onChange={(e) => setOutput(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>0 (Compile/Runtime Error)</span>
                  <span>1.5 (Partial Tests)</span>
                  <span>3 (100% Tests Passed)</span>
                </div>
              </div>

              {/* 3. Naming Conventions (1 Mark) */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      3. Naming Conventions
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Standard camelCase variables, PascalCase classes
                    </span>
                  </div>
                  <span className="text-sm font-black text-indigo-700 font-mono bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    {naming} / 1
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.25"
                  value={naming}
                  onChange={(e) => setNaming(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>0 (Violated)</span>
                  <span>0.5 (Minor flaws)</span>
                  <span>1 (Standard Java Style)</span>
                </div>
              </div>

              {/* 4. Documentation (1 Mark) */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      4. Documentation
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Comments, Aim, written algorithm / procedure
                    </span>
                  </div>
                  <span className="text-sm font-black text-indigo-700 font-mono bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    {documentation} / 1
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.25"
                  value={documentation}
                  onChange={(e) => setDocumentation(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>0 (No comments)</span>
                  <span>0.5 (Brief comments)</span>
                  <span>1 (Detailed Procedure)</span>
                </div>
              </div>

            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-slate-500 font-semibold mr-1">Quick Presets:</span>
            <button
              type="button"
              onClick={() => { setConcept(5); setNaming(1); setDocumentation(1); setOutput(3); }}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
            >
              Full Marks (10/10)
            </button>
            <button
              type="button"
              onClick={() => { setConcept(4.5); setNaming(1); setDocumentation(1); setOutput(2.5); }}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition"
            >
              Grade A+ (9/10)
            </button>
            <button
              type="button"
              onClick={() => { setConcept(4); setNaming(0.75); setDocumentation(0.75); setOutput(2.5); }}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition"
            >
              Grade A (8/10)
            </button>
            {hasHighViolations && (
              <button
                type="button"
                onClick={() => { setConcept(3.5); setNaming(1); setDocumentation(1); setOutput(2.5); }}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition"
              >
                Integrity Penalty (8/10)
              </button>
            )}
          </div>

          {/* Faculty Remarks */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Faculty Remarks & Assessment Feedback</span>
              <span className="text-[11px] font-normal text-slate-500">Printed on the student's official PDF record</span>
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter remarks on student's Java code, algorithm, and test performance..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Faculty Approval Toggle */}
          <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
            isApproved
              ? 'border-emerald-200 bg-emerald-50/70'
              : 'border-amber-200 bg-amber-50/70'
          }`}>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className={`w-5 h-5 shrink-0 ${isApproved ? 'text-emerald-600' : 'text-amber-600'}`} />
              <div>
                <span className={`text-xs font-bold block ${isApproved ? 'text-emerald-950' : 'text-amber-950'}`}>
                  Approve Record &amp; Unlock Student PDF Download
                </span>
                <span className={`text-[11px] ${isApproved ? 'text-emerald-800' : 'text-amber-800'}`}>
                  {isApproved
                    ? 'Once saved, the student can immediately download and print their approved Lab Record PDF.'
                    : 'Marks will be saved, but PDF download & print remain locked until you approve this record.'}
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
              <span>{isApproved ? 'Evaluate & Approve Record' : 'Save Marks (Hold Approval)'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
