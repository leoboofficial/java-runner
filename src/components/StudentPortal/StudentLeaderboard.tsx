import React, { useState, useMemo } from 'react';
import { Exercise, StudentRecord, Submission, User } from '../../types';
import {
  Trophy,
  Search,
  Filter,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  X,
} from 'lucide-react';

export interface RankedStudent {
  rank: number;
  regNo: string;
  name: string;
  email: string;
  department: string;
  totalScore: number;
  completedExercisesCount: number;
  attemptedExercisesCount: number;
  totalSubmissions: number;
  violationsCount: number;
  solvedExercises: {
    exerciseId: string;
    exerciseTitle: string;
    score: number;
    status: string;
  }[];
  isCurrentUser: boolean;
}

interface StudentLeaderboardProps {
  students: StudentRecord[];
  submissions: Submission[];
  exercises: Exercise[];
  currentUser: User;
  onSelectExercise?: (exerciseId: string) => void;
}

export const StudentLeaderboard: React.FC<StudentLeaderboardProps> = ({
  students,
  submissions,
  exercises,
  currentUser,
  onSelectExercise,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<RankedStudent | null>(null);

  const departments = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.department) set.add(s.department);
    });
    return Array.from(set);
  }, [students]);

  const rankedStudents: RankedStudent[] = useMemo(() => {
    const exMap = new Map<string, string>();
    exercises.forEach((ex) => exMap.set(ex.id, ex.title));

    const subByStudent = new Map<string, Submission[]>();
    submissions.forEach((sub) => {
      const reg = sub.regNo.trim().toUpperCase();
      const existing = subByStudent.get(reg) || [];
      existing.push(sub);
      subByStudent.set(reg, existing);
    });

    const list: RankedStudent[] = students.map((stu) => {
      const reg = stu.regNo.trim().toUpperCase();
      const studentSubs = subByStudent.get(reg) || [];

      const bestScorePerEx = new Map<string, { score: number; status: string }>();
      studentSubs.forEach((sub) => {
        const cur = bestScorePerEx.get(sub.exerciseId);
        if (!cur || sub.score > cur.score) {
          bestScorePerEx.set(sub.exerciseId, {
            score: sub.score,
            status: sub.status,
          });
        }
      });

      let totalScore = 0;
      let completedExercisesCount = 0;
      let attemptedExercisesCount = 0;
      const solvedExercises: {
        exerciseId: string;
        exerciseTitle: string;
        score: number;
        status: string;
      }[] = [];

      bestScorePerEx.forEach((val, exId) => {
        totalScore += val.score;
        if (val.score > 0) attemptedExercisesCount++;
        if (val.score === 100) completedExercisesCount++;
        solvedExercises.push({
          exerciseId: exId,
          exerciseTitle: exMap.get(exId) || exId,
          score: val.score,
          status: val.status,
        });
      });

      const isCurrentUser =
        Boolean(currentUser.regNo && currentUser.regNo.trim().toUpperCase() === reg) ||
        (Boolean(currentUser.email) && currentUser.email.toLowerCase() === stu.email.toLowerCase());

      return {
        rank: 0,
        regNo: stu.regNo,
        name: stu.name,
        email: stu.email,
        department: stu.department || 'Department of Computer Applications',
        totalScore,
        completedExercisesCount,
        attemptedExercisesCount,
        totalSubmissions: studentSubs.length,
        violationsCount: stu.violationsCount || 0,
        solvedExercises,
        isCurrentUser,
      };
    });

    list.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (b.completedExercisesCount !== a.completedExercisesCount) {
        return b.completedExercisesCount - a.completedExercisesCount;
      }
      if (a.violationsCount !== b.violationsCount) {
        return a.violationsCount - b.violationsCount;
      }
      return a.name.localeCompare(b.name);
    });

    let currentRank = 1;
    for (let i = 0; i < list.length; i++) {
      if (i > 0 && list[i].totalScore === list[i - 1].totalScore && list[i].completedExercisesCount === list[i - 1].completedExercisesCount) {
        list[i].rank = list[i - 1].rank;
      } else {
        list[i].rank = currentRank;
      }
      currentRank++;
    }

    return list;
  }, [students, submissions, exercises, currentUser]);

  const filteredStudents = useMemo(() => {
    return rankedStudents.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.regNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDept = departmentFilter === 'ALL' || s.department === departmentFilter;
      return matchSearch && matchDept;
    });
  }, [rankedStudents, searchTerm, departmentFilter]);

  const maxPossibleScore = exercises.length * 100;
  const top3 = rankedStudents.slice(0, 3);
  const currentStudentRank = rankedStudents.find((s) => s.isCurrentUser);

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-amber-50 via-white to-indigo-50 border border-amber-200 p-6 rounded-2xl shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-600" />
                Lab Leaderboard & Rankings
              </span>
              <span className="text-xs text-slate-500">
                Live evaluation points across {exercises.length} exercises
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Hall of Fame & Scoreboard
            </h1>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl">
              Rankings update automatically with every submitted test pass. Solved problems grant up to 100 points each.
            </p>
          </div>

          {currentStudentRank && (
            <div className="bg-white border border-amber-300 p-3.5 rounded-xl shadow-xs flex items-center gap-4 shrink-0">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex flex-col items-center justify-center text-white shadow-xs">
                <span className="text-[10px] font-bold uppercase leading-none text-amber-100">Rank</span>
                <span className="text-lg font-black leading-none mt-0.5">#{currentStudentRank.rank}</span>
              </div>
              <div>
                <div className="text-[11px] text-amber-700 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Your Standing
                </div>
                <div className="text-sm font-bold text-slate-900">{currentStudentRank.name}</div>
                <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                  <span className="text-emerald-600 font-semibold">{currentStudentRank.totalScore} pts</span>
                  <span>•</span>
                  <span>{currentStudentRank.completedExercisesCount}/{exercises.length} Solved</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top 3 Podium Cards */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {top3[1] && (
            <div
              onClick={() => setSelectedStudentForDetails(top3[1])}
              className="bg-white hover:bg-slate-50/80 border border-slate-200 hover:border-slate-300 p-5 rounded-2xl transition cursor-pointer relative overflow-hidden group flex flex-col justify-between order-2 md:order-1 shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-300 text-slate-700 flex items-center justify-center font-black text-base shadow-xs">
                    🥈
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    Silver Medalist
                  </span>
                </div>
                <h3 className="font-bold text-base text-slate-900 group-hover:text-indigo-600 transition flex items-center gap-1.5">
                  {top3[1].name}
                  {top3[1].isCurrentUser && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">You</span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 font-mono">{top3[1].regNo} • {top3[1].department}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px] block">Total Points</span>
                  <span className="text-base font-extrabold text-slate-900">{top3[1].totalScore} pts</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Exercises Solved</span>
                  <span className="text-base font-extrabold text-emerald-600">
                    {top3[1].completedExercisesCount} / {exercises.length}
                  </span>
                </div>
              </div>
            </div>
          )}

          {top3[0] && (
            <div
              onClick={() => setSelectedStudentForDetails(top3[0])}
              className="bg-gradient-to-b from-amber-50/60 via-white to-white border-2 border-amber-400 hover:border-amber-500 p-5 rounded-2xl transition cursor-pointer relative overflow-hidden group shadow-md flex flex-col justify-between order-1 md:order-2 md:-translate-y-2"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center font-black text-lg shadow-xs">
                    🏆
                  </div>
                  <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5" /> Class Leader
                  </span>
                </div>
                <h3 className="font-extrabold text-lg text-slate-900 group-hover:text-amber-700 transition flex items-center gap-2">
                  {top3[0].name}
                  {top3[0].isCurrentUser && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 font-bold">You</span>
                  )}
                </h3>
                <p className="text-xs text-amber-800 font-mono">{top3[0].regNo} • {top3[0].department}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-amber-200 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-amber-800 text-[11px] block">Points</span>
                  <span className="text-xl font-black text-amber-700">{top3[0].totalScore} pts</span>
                </div>
                <div>
                  <span className="text-amber-800 text-[11px] block">Solved</span>
                  <span className="text-xl font-black text-emerald-600">
                    {top3[0].completedExercisesCount} / {exercises.length}
                  </span>
                </div>
              </div>
            </div>
          )}

          {top3[2] && (
            <div
              onClick={() => setSelectedStudentForDetails(top3[2])}
              className="bg-white hover:bg-slate-50/80 border border-slate-200 hover:border-slate-300 p-5 rounded-2xl transition cursor-pointer relative overflow-hidden group flex flex-col justify-between order-3 shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 flex items-center justify-center font-black text-base shadow-xs">
                    🥉
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                    Bronze Medalist
                  </span>
                </div>
                <h3 className="font-bold text-base text-slate-900 group-hover:text-indigo-600 transition flex items-center gap-1.5">
                  {top3[2].name}
                  {top3[2].isCurrentUser && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">You</span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 font-mono">{top3[2].regNo} • {top3[2].department}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px] block">Total Points</span>
                  <span className="text-base font-extrabold text-amber-700">{top3[2].totalScore} pts</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Exercises Solved</span>
                  <span className="text-base font-extrabold text-emerald-600">
                    {top3[2].completedExercisesCount} / {exercises.length}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search students by name, registration number, or email..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-slate-500 pl-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Dept:</span>
          </div>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
          >
            <option value="ALL">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Rankings Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4 text-center w-16">Rank</th>
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4 text-center">Solved Labs</th>
                <th className="py-3.5 px-4 text-center">Score Progress</th>
                <th className="py-3.5 px-4 text-center">Total Points</th>
                <th className="py-3.5 px-4 text-center">Proctoring Status</th>
                <th className="py-3.5 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    No students found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => {
                  const percentOfMax = maxPossibleScore > 0 ? Math.round((s.totalScore / maxPossibleScore) * 100) : 0;
                  return (
                    <tr
                      key={s.regNo}
                      className={`hover:bg-slate-50/80 transition ${
                        s.isCurrentUser ? 'bg-amber-50/60 hover:bg-amber-50' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center">
                        {s.rank === 1 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100 text-amber-800 font-black text-sm border border-amber-300">
                            🥇
                          </span>
                        ) : s.rank === 2 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-black text-sm border border-slate-300">
                            🥈
                          </span>
                        ) : s.rank === 3 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-50 text-amber-800 font-black text-sm border border-amber-200">
                            🥉
                          </span>
                        ) : (
                          <span className="font-mono font-bold text-slate-400 text-xs">
                            #{s.rank}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                            {s.name}
                            {s.isCurrentUser && (
                              <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200">
                                You
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="font-mono text-[11px] text-indigo-600">{s.regNo}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{s.department}</td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1 font-bold text-slate-800">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>
                            {s.completedExercisesCount}{' '}
                            <span className="text-slate-400 font-normal">/ {exercises.length}</span>
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">{s.totalSubmissions} submissions</div>
                      </td>
                      <td className="py-3.5 px-4 text-center w-40">
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              percentOfMax >= 80
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                                : percentOfMax >= 40
                                ? 'bg-gradient-to-r from-amber-500 to-yellow-500'
                                : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(5, percentOfMax))}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                          {percentOfMax}% completed
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="text-sm font-black text-amber-700 font-mono">
                          {s.totalScore}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block">pts</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {s.violationsCount === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200">
                            <ShieldCheck className="w-3 h-3" /> Clean Record
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-semibold border border-rose-200">
                            <AlertTriangle className="w-3 h-3" /> {s.violationsCount} Flags
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedStudentForDetails(s)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-medium transition"
                        >
                          Breakdown
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scorecard Modal */}
      {selectedStudentForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-900">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900">
                  Student Scorecard: {selectedStudentForDetails.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedStudentForDetails(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Rank</span>
                  <span className="text-lg font-black text-slate-900">#{selectedStudentForDetails.rank}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Score</span>
                  <span className="text-lg font-black text-amber-600">{selectedStudentForDetails.totalScore} pts</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Solved Labs</span>
                  <span className="text-lg font-black text-emerald-600">
                    {selectedStudentForDetails.completedExercisesCount} / {exercises.length}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Exercise Completion Breakdown
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {exercises.map((ex) => {
                    const record = selectedStudentForDetails.solvedExercises.find(
                      (s) => s.exerciseId === ex.id
                    );
                    const isSolved = record && record.score === 100;
                    const isPartial = record && record.score > 0 && record.score < 100;
                    return (
                      <div
                        key={ex.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-semibold text-slate-900">{ex.title}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {ex.id} • {ex.category} ({ex.difficulty})
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isSolved ? (
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> 100 pts
                            </span>
                          ) : isPartial ? (
                            <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-[11px] font-bold border border-amber-200">
                              {record.score} pts
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 text-[11px] font-medium border border-slate-200">
                              0 pts
                            </span>
                          )}
                          {onSelectExercise && (
                            <button
                              onClick={() => {
                                onSelectExercise(ex.id);
                                setSelectedStudentForDetails(null);
                              }}
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
                              title="Go to exercise in IDE"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedStudentForDetails(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
