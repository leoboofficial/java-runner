import React, { useState } from 'react';
import { Exercise } from '../../types';
import {
  Plus,
  Calendar,
  Clock,
  Play,
  CheckCircle,
  FileCode,
  Eye,
  EyeOff,
  Code2,
  X,
} from 'lucide-react';
import { JavaRunnerService } from '../../services/javaRunner';

interface ExerciseManagerProps {
  exercises: Exercise[];
  onSaveExercise: (exercise: Exercise) => void;
  onDeleteExercise?: (id: string) => void;
}

export const ExerciseManager: React.FC<ExerciseManagerProps> = ({
  exercises,
  onSaveExercise,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingEx, setEditingEx] = useState<Exercise | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Arrays & Algorithms');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Easy');
  const [openTime, setOpenTime] = useState('');
  const [closeTime, setCloseTime] = useState('');
  const [publicInput, setPublicInput] = useState('');
  const [publicOutput, setPublicOutput] = useState('');
  const [privateInput, setPrivateInput] = useState('');
  const [privateOutput, setPrivateOutput] = useState('');
  const [starterCode, setStarterCode] = useState('');

  const [verifying, setVerifying] = useState(false);
  const [verifyLog, setVerifyLog] = useState<{ public: string; private: string } | null>(null);

  const openNewModal = () => {
    setEditingEx(null);
    setTitle('');
    setDescription('');
    setCategory('Arrays & Algorithms');
    setDifficulty('Easy');
    const now = new Date();
    const close = new Date(Date.now() + 3600000 * 24 * 30);
    setOpenTime(now.toISOString().slice(0, 16));
    setCloseTime(close.toISOString().slice(0, 16));
    setPublicInput('5\n10 20 30 40 50');
    setPublicOutput('150');
    setPrivateInput('4\n1 2 3 4');
    setPrivateOutput('10');
    setStarterCode(`import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int sum = 0;
        for (int i = 0; i < n; i++) {
            sum += sc.nextInt();
        }
        System.out.println(sum);
    }
}`);
    setVerifyLog(null);
    setShowModal(true);
  };

  const handleEdit = (ex: Exercise) => {
    setEditingEx(ex);
    setTitle(ex.title);
    setDescription(ex.description);
    setCategory(ex.category || 'Algorithms');
    setDifficulty(ex.difficulty || 'Easy');
    setOpenTime(ex.openTime);
    setCloseTime(ex.closeTime);
    setPublicInput(ex.publicInput);
    setPublicOutput(ex.publicOutput);
    setPrivateInput(ex.privateInput);
    setPrivateOutput(ex.privateOutput);
    setStarterCode(ex.starterCode || '');
    setVerifyLog(null);
    setShowModal(true);
  };

  const handleVerifySolution = async () => {
    setVerifying(true);
    setVerifyLog(null);
    const pubRes = await JavaRunnerService.execute(starterCode, publicInput, publicOutput);
    const privRes = await JavaRunnerService.execute(starterCode, privateInput, privateOutput);
    setVerifyLog({
      public: pubRes.passed ? 'PASSED (100%)' : `FAILED (${pubRes.log || 'Wrong output'})`,
      private: privRes.passed ? 'PASSED (100%)' : `FAILED (${privRes.log || 'Wrong output'})`,
    });
    setVerifying(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !openTime || !closeTime) return;
    const exerciseToSave: Exercise = {
      id: editingEx ? editingEx.id : `EX_${Date.now().toString().slice(-5)}`,
      title,
      description,
      category,
      difficulty,
      openTime,
      closeTime,
      publicInput,
      publicOutput,
      privateInput,
      privateOutput,
      starterCode,
    };
    onSaveExercise(exerciseToSave);
    setShowModal(false);
  };

  const getStatusBadge = (openTimeStr: string, closeTimeStr: string) => {
    const now = Date.now();
    const open = new Date(openTimeStr).getTime();
    const close = new Date(closeTimeStr).getTime();
    if (now < open) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          Scheduled
        </span>
      );
    }
    if (now > close) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
          Closed
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        Active Lab
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Lab Exercises & Schedule</h2>
          <p className="text-xs text-slate-500">
            Define problems, test cases, and time-gated access windows for student evaluations.
          </p>
        </div>
        <button
          onClick={openNewModal}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          Schedule New Exercise
        </button>
      </div>

      {/* Exercises List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {exercises.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center col-span-full shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <FileCode className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">No Exercises Scheduled Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              Click below to schedule your first Java exercise and test cases.
            </p>
            <button
              onClick={openNewModal}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition shadow-xs"
            >
              <Plus className="w-4 h-4" /> Schedule First Exercise
            </button>
          </div>
        ) : (
          exercises.map((ex) => (
            <div
              key={ex.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-300 hover:shadow-md transition flex flex-col justify-between shadow-xs"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        {ex.id}
                      </span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {ex.category}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                          ex.difficulty === 'Easy'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : ex.difficulty === 'Medium'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {ex.difficulty}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-slate-900">{ex.title}</h3>
                  </div>
                  <div>{getStatusBadge(ex.openTime, ex.closeTime)}</div>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2 mb-4">{ex.description}</p>
                {/* Time window details */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="truncate">
                      Open: {new Date(ex.openTime).toLocaleDateString()} {new Date(ex.openTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <Clock className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span className="truncate">
                      Close: {new Date(ex.closeTime).toLocaleDateString()} {new Date(ex.closeTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                {/* Test Cases preview */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-1.5 font-semibold text-emerald-700 mb-1">
                      <Eye className="w-3.5 h-3.5" /> Public Case
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono truncate">
                      In: {ex.publicInput.replace(/\n/g, ' ')}
                    </div>
                    <div className="text-[11px] text-slate-800 font-mono truncate">
                      Exp: {ex.publicOutput.replace(/\n/g, ' ')}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-1.5 font-semibold text-amber-700 mb-1">
                      <EyeOff className="w-3.5 h-3.5" /> Hidden Test Case
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono truncate">
                      In: {ex.privateInput.replace(/\n/g, ' ')}
                    </div>
                    <div className="text-[11px] text-slate-800 font-mono truncate">
                      Exp: {ex.privateOutput.replace(/\n/g, ' ')}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => handleEdit(ex)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition"
                >
                  Edit & Test Cases
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Exercise Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl text-slate-900">
            <div className="sticky top-0 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-slate-200 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {editingEx ? `Edit Exercise: ${editingEx.id}` : 'Schedule New Lab Exercise'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Problem Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Find Kth Largest Element in Array"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Category</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Arrays, Strings, OOP"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Open Window (Start)</label>
                  <input
                    type="datetime-local"
                    required
                    value={openTime}
                    onChange={(e) => setOpenTime(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Close Window (End)</label>
                  <input
                    type="datetime-local"
                    required
                    value={closeTime}
                    onChange={(e) => setCloseTime(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Problem Description & Constraints</label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain input format, constraints, and required output..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {/* Test Cases grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                {/* Public */}
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 uppercase tracking-wide">
                    <Eye className="w-3.5 h-3.5" /> Public Test Case (Visible to Student)
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Standard Input</label>
                    <textarea
                      rows={2}
                      value={publicInput}
                      onChange={(e) => setPublicInput(e.target.value)}
                      className="w-full font-mono text-xs bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Expected Standard Output</label>
                    <textarea
                      rows={2}
                      value={publicOutput}
                      onChange={(e) => setPublicOutput(e.target.value)}
                      className="w-full font-mono text-xs bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                {/* Private */}
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 uppercase tracking-wide">
                    <EyeOff className="w-3.5 h-3.5" /> Hidden Test Case (For Evaluation Only)
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Hidden Input</label>
                    <textarea
                      rows={2}
                      value={privateInput}
                      onChange={(e) => setPrivateInput(e.target.value)}
                      className="w-full font-mono text-xs bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Expected Hidden Output</label>
                    <textarea
                      rows={2}
                      value={privateOutput}
                      onChange={(e) => setPrivateOutput(e.target.value)}
                      className="w-full font-mono text-xs bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
              {/* Starter / Reference Code */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    Starter Code / Reference Java Solution
                  </label>
                  <button
                    type="button"
                    onClick={handleVerifySolution}
                    disabled={verifying}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                  >
                    <Play className="w-3 h-3" />
                    {verifying ? 'Verifying...' : 'Test Solution on Both Cases'}
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={starterCode}
                  onChange={(e) => setStarterCode(e.target.value)}
                  className="w-full font-mono text-xs bg-slate-50 border border-slate-300 rounded-lg p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {verifyLog && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="text-emerald-700 font-semibold">Public Test: {verifyLog.public}</div>
                  <div className="text-amber-700 font-semibold">Private Test: {verifyLog.private}</div>
                </div>
              )}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition"
                >
                  Save & Post to Google Sheet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
