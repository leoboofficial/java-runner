import React, { useState, useMemo } from 'react';
import { Exercise, StudentRecord, Submission, SystemSettings, User, Violation } from '../../types';
import { StudentIDE } from './StudentIDE';
import { StudentLeaderboard } from './StudentLeaderboard';
import {
  Terminal,
  Trophy,
  Printer,
  FileText,
  Sparkles,
} from 'lucide-react';
import { LabRecordModal } from './LabRecordModal';

interface StudentDashboardProps {
  currentUser: User;
  exercises: Exercise[];
  submissions: Submission[];
  students: StudentRecord[];
  onSubmitCode: (submission: Submission, localViolations: Violation[]) => void;
  settings: SystemSettings;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  currentUser,
  exercises,
  submissions,
  students,
  onSubmitCode,
  settings,
}) => {
  const [activeTab, setActiveTab] = useState<'ide' | 'leaderboard'>('ide');
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [showRecordModal, setShowRecordModal] = useState(false);

  // Calculate current student's statistics
  const currentStudentStats = useMemo(() => {
    const reg = (currentUser.regNo || '').trim().toUpperCase();
    const studentSubs = submissions.filter(
      (s) => s.regNo.trim().toUpperCase() === reg || s.studentEmail.toLowerCase() === currentUser.email.toLowerCase()
    );

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

    const studentTotals = new Map<string, number>();
    submissions.forEach((sub) => {
      const sReg = sub.regNo.trim().toUpperCase();
      const existingBest = studentTotals.get(sReg + '_' + sub.exerciseId) || 0;
      if (sub.score > existingBest) {
        studentTotals.set(sReg + '_' + sub.exerciseId, sub.score);
      }
    });

    const studentAggregate = new Map<string, number>();
    students.forEach((s) => {
      const sReg = s.regNo.trim().toUpperCase();
      let sum = 0;
      exercises.forEach((ex) => {
        sum += studentTotals.get(sReg + '_' + ex.id) || 0;
      });
      studentAggregate.set(sReg, sum);
    });

    const sorted = Array.from(studentAggregate.entries()).sort((a, b) => b[1] - a[1]);
    const rankIndex = sorted.findIndex(([r]) => r === reg);
    const rank = rankIndex !== -1 ? rankIndex + 1 : sorted.length + 1;

    return {
      totalScore,
      completedCount,
      totalExercises: exercises.length,
      rank,
      submissionsCount: studentSubs.length,
    };
  }, [currentUser, submissions, exercises, students]);

  const handleSelectExerciseFromLeaderboard = (exerciseId: string) => {
    setSelectedExerciseId(exerciseId);
    setActiveTab('ide');
  };

  return (
    <div className="space-y-6">
      {/* Student Overview Strip */}
      <div className="bg-gradient-to-r from-emerald-50/90 via-white to-slate-50 border border-emerald-100 p-5 rounded-2xl shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Student Examination Portal
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {currentUser.regNo ? `${currentUser.regNo} • ` : ''}{currentUser.email || 'student@student.hindustanuniv.ac.in'}
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Welcome, {currentUser.name}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Solve Java lab exercises, test your code against sandbox test cases, and climb the class leaderboard.
            </p>
          </div>

          {/* Quick Metrics & Generate Record Action */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowRecordModal(true)}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 transition shadow-sm"
              title="Generate and print your official HITS Laboratory Practical Report & Record based on the university template"
            >
              <Printer className="w-4 h-4" />
              <span>Generate Lab Record (PDF)</span>
            </button>

            <div
              onClick={() => setActiveTab('leaderboard')}
              className="bg-white border border-amber-200 hover:border-amber-300 px-3.5 py-2 rounded-xl text-center cursor-pointer transition shadow-xs"
              title="Click to view full Leaderboard"
            >
              <div className="text-[10px] text-amber-700 font-bold uppercase flex items-center justify-center gap-1">
                <Trophy className="w-3 h-3 text-amber-500" /> Current Rank
              </div>
              <div className="text-lg font-black text-amber-600">#{currentStudentStats.rank}</div>
            </div>

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

      {/* Tab Switcher: Lab IDE vs Leaderboard */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('ide')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'ide'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Lab IDE & Examination Mode</span>
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'leaderboard'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-200" />
            <span>Class Leaderboard & Rankings</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-[10px] text-amber-100 font-bold">
              Rank #{currentStudentStats.rank}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRecordModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition shadow-xs"
            title="Generate and print your official HITS Laboratory Practical Report & Record"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-600" />
            <span>Print Practical Record</span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'ide' && (
          <StudentIDE
            currentUser={currentUser}
            exercises={exercises}
            onSubmitCode={onSubmitCode}
            settings={settings}
            preselectedExerciseId={selectedExerciseId}
            onOpenLeaderboard={() => setActiveTab('leaderboard')}
            studentRank={currentStudentStats.rank}
          />
        )}
        {activeTab === 'leaderboard' && (
          <StudentLeaderboard
            students={students}
            submissions={submissions}
            exercises={exercises}
            currentUser={currentUser}
            onSelectExercise={handleSelectExerciseFromLeaderboard}
          />
        )}
      </div>

      {/* Official Lab Record Generator Modal */}
      <LabRecordModal
        isOpen={showRecordModal}
        onClose={() => setShowRecordModal(false)}
        currentUser={currentUser}
        exercises={exercises}
        submissions={submissions}
      />
    </div>
  );
};
