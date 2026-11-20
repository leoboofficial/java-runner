import React, { useState, useMemo } from 'react';
import {
  ExamModeConfig,
  Exercise,
  StudentRecord,
  Submission,
  SystemSettings,
  User,
  Violation,
  StudentLabRecordSubmission,
} from '../../types';
import { StudentIDE } from './StudentIDE';
import { Printer, Award } from 'lucide-react';
import { LabRecordModal } from './LabRecordModal';

interface StudentDashboardProps {
  currentUser: User;
  exercises: Exercise[];
  submissions: Submission[];
  students: StudentRecord[];
  violations?: Violation[];
  evaluations?: StudentLabRecordSubmission[];
  examConfig?: ExamModeConfig;
  onSubmitCode: (submission: Submission, localViolations: Violation[]) => void;
  onSubmitLabRecord?: (record: StudentLabRecordSubmission) => void;
  settings: SystemSettings;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  currentUser,
  exercises,
  submissions,
  violations = [],
  evaluations = [],
  examConfig,
  onSubmitCode,
  onSubmitLabRecord,
  settings,
}) => {
  const [selectedExerciseId] = useState<string | null>(null);
  const [showRecordModal, setShowRecordModal] = useState(false);

  const isEseMode = Boolean(examConfig?.eseEnabled);

  // When ESE Mode is ON, students see ONLY ESE Practical questions; otherwise only LAB exercises
  const visibleExercises = useMemo(() => {
    return exercises.filter((ex) => {
      const exType = ex.assessmentType === 'ESE' ? 'ESE' : 'LAB';
      return isEseMode ? exType === 'ESE' : exType === 'LAB';
    });
  }, [exercises, isEseMode]);

  const visibleExerciseIds = useMemo(
    () => new Set(visibleExercises.map((e) => e.id)),
    [visibleExercises]
  );

  // Find active student evaluation (scoped to LAB for Lab Record status)
  const currentStudentEvaluation = useMemo(() => {
    const reg = (currentUser.regNo || '').trim().toUpperCase();
    const email = (currentUser.email || '').trim().toLowerCase();
    return evaluations.find(
      (e) =>
        (e.assessmentType || 'LAB') === 'LAB' &&
        ((reg && e.regNo.trim().toUpperCase() === reg) ||
          (email && e.studentEmail.toLowerCase() === email))
    );
  }, [evaluations, currentUser]);

  // Calculate current student's statistics scoped to active mode (ESE vs LAB)
  const currentStudentStats = useMemo(() => {
    const reg = (currentUser.regNo || '').trim().toUpperCase();
    const studentSubs = submissions.filter((s) => {
      const matchesUser =
        s.regNo.trim().toUpperCase() === reg ||
        s.studentEmail.toLowerCase() === currentUser.email.toLowerCase();
      if (!matchesUser) return false;
      const subType = s.assessmentType === 'ESE' ? 'ESE' : 'LAB';
      if (isEseMode) {
        return subType === 'ESE' || visibleExerciseIds.has(s.exerciseId);
      }
      return subType === 'LAB';
    });

    const bestScores = new Map<string, number>();
    studentSubs.forEach((sub) => {
      const cur = bestScores.get(sub.exerciseId) || 0;
      if (sub.score > cur) bestScores.set(sub.exerciseId, sub.score);
    });

    let totalScore = 0;
    let completedCount = 0;
    bestScores.forEach((score) => {
      totalScore += score;
      if (score === 100) completedCount++;
    });

    return {
      totalScore,
      completedCount,
      totalExercises: visibleExercises.length,
      submissionsCount: studentSubs.length,
    };
  }, [currentUser, submissions, visibleExercises, visibleExerciseIds, isEseMode]);

  const labExercises = useMemo(
    () => exercises.filter((ex) => (ex.assessmentType || 'LAB') !== 'ESE'),
    [exercises]
  );

  const labSubmissions = useMemo(
    () => submissions.filter((s) => (s.assessmentType || 'LAB') !== 'ESE'),
    [submissions]
  );

  return (
    <div className="space-y-6">
      {/* Student Overview Strip */}
      <div
        className={`border p-5 rounded-2xl shadow-xs ${
          isEseMode
            ? 'bg-gradient-to-r from-rose-50/90 via-white to-slate-50 border-rose-200'
            : 'bg-gradient-to-r from-emerald-50/90 via-white to-slate-50 border-emerald-100'
        }`}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-xs uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border ${
                  isEseMode
                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                }`}
              >
                {isEseMode ? 'ESE PRACTICAL EXAM' : 'JAVA LAB Portal'}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {currentUser.regNo ? `${currentUser.regNo} • ` : ''}
                {currentUser.email}
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Welcome, {currentUser.name}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {isEseMode
                ? `${examConfig?.eseTitle || 'End Semester Practical Examination'} — Solve and submit your assigned ESE practical question(s).`
                : 'Solve Java lab exercises, test your code against sandbox test cases, and generate official lab records.'}
            </p>
          </div>

          {/* Quick Metrics & Generate Record Action */}
          <div className="flex flex-wrap items-center gap-3">
            {!isEseMode && (
              <>
                <button
                  onClick={() => setShowRecordModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 transition shadow-sm"
                  title="Generate and print your official HITS Laboratory Practical Report & Record based on the university template"
                >
                  <Printer className="w-4 h-4" />
                  <span>Generate Lab Record (PDF)</span>
                </button>

                {/* Rubric Evaluation Status Badge */}
                <div
                  onClick={() => setShowRecordModal(true)}
                  className={`px-3.5 py-2 rounded-xl text-center cursor-pointer transition shadow-xs border ${
                    currentStudentEvaluation?.isVerifiedAndApproved ||
                    currentStudentEvaluation?.status === 'APPROVED' ||
                    currentStudentEvaluation?.status === 'EVALUATED_APPROVED'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : currentStudentEvaluation?.status === 'PENDING' ||
                        currentStudentEvaluation?.status === 'PENDING_EVALUATION'
                      ? 'bg-amber-50 border-amber-300 text-amber-800'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                  title="Open Section-Wise Lab Record Workflow"
                >
                  <div className="text-[10px] font-bold uppercase flex items-center justify-center gap-1">
                    <Award className="w-3 h-3 text-amber-500" /> Lab Record Status
                  </div>
                  <div className="text-lg font-black">
                    {currentStudentEvaluation?.isVerifiedAndApproved ||
                    currentStudentEvaluation?.status === 'APPROVED' ||
                    currentStudentEvaluation?.status === 'EVALUATED_APPROVED' ? (
                      <span className="text-emerald-700 text-sm font-black">
                        {currentStudentEvaluation.rubric?.totalMarks ??
                          currentStudentEvaluation.rubrics?.total ??
                          10}
                        /{currentStudentEvaluation.maxTotalMarks || 10} • PDF Ready
                      </span>
                    ) : currentStudentEvaluation?.status === 'PENDING' ||
                      currentStudentEvaluation?.status === 'PENDING_EVALUATION' ? (
                      <span className="text-amber-700 text-xs font-bold">Pending Approval</span>
                    ) : (
                      <span className="text-slate-500 text-xs font-semibold">Not Submitted</span>
                    )}
                  </div>
                </div>
              </>
            )}

            <div className="bg-white border border-slate-200 px-3.5 py-2 rounded-xl text-center shadow-xs">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Total Score</div>
              <div className="text-lg font-black text-emerald-600">{currentStudentStats.totalScore} pts</div>
            </div>

            <div className="bg-white border border-slate-200 px-3.5 py-2 rounded-xl text-center shadow-xs">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Completed</div>
              <div className="text-lg font-black text-slate-900">
                {currentStudentStats.completedCount}/{currentStudentStats.totalExercises}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main IDE Workspace (Same familiar IDE for both Lab & ESE) */}
      <div>
        <StudentIDE
          currentUser={currentUser}
          exercises={visibleExercises}
          onSubmitCode={onSubmitCode}
          settings={settings}
          preselectedExerciseId={selectedExerciseId}
        />
      </div>

      {/* Official Lab Record Generator Modal (Only in regular Lab mode) */}
      {!isEseMode && (
        <LabRecordModal
          isOpen={showRecordModal}
          onClose={() => setShowRecordModal(false)}
          currentUser={currentUser}
          exercises={labExercises}
          submissions={labSubmissions}
          violations={violations}
          evaluation={currentStudentEvaluation}
          onSubmitRecordToFaculty={onSubmitLabRecord}
        />
      )}
    </div>
  );
};
