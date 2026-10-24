import React, { useState, useEffect } from 'react';
import { Exercise, Submission, Violation, User, SystemSettings, ExecutionResult } from '../../types';
import {
  Play,
  Send,
  RotateCcw,
  Maximize2,
  Minimize2,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
  FileCode,
  Eye,
  Trophy,
} from 'lucide-react';
import { JavaRunnerService } from '../../services/javaRunner';

interface StudentIDEProps {
  currentUser: User;
  exercises: Exercise[];
  onSubmitCode: (submission: Submission, localViolations: Violation[]) => void;
  settings: SystemSettings;
  preselectedExerciseId?: string | null;
  onOpenLeaderboard?: () => void;
  studentRank?: number;
}

export const StudentIDE: React.FC<StudentIDEProps> = ({
  currentUser,
  exercises,
  onSubmitCode,
  settings,
  preselectedExerciseId,
  onOpenLeaderboard,
  studentRank,
}) => {
  const now = Date.now();
  const activeExercises = exercises.filter((ex) => {
    const open = new Date(ex.openTime).getTime();
    const close = new Date(ex.closeTime).getTime();
    return now >= open && now <= close;
  });

  const [selectedEx, setSelectedEx] = useState<Exercise | undefined>(
    activeExercises[0] || exercises[0]
  );

  const [code, setCode] = useState<string>(
    selectedEx?.starterCode ||
      `import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Write your solution here\n        \n    }\n}`
  );

  const [isRunningPublic, setIsRunningPublic] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publicTestResult, setPublicTestResult] = useState<ExecutionResult | null>(null);
  const [privateTestResult, setPrivateTestResult] = useState<ExecutionResult | null>(null);
  const [officialStatus, setOfficialStatus] = useState<string | null>(null);
  const [activeConsoleTab, setActiveConsoleTab] = useState<'tests' | 'output' | 'violations'>('tests');

  const [useCustomInput, setUseCustomInput] = useState(false);
  const [customInputText, setCustomInputText] = useState('');
  const [customOutputText, setCustomOutputText] = useState('');

  const [localViolations, setLocalViolations] = useState<Violation[]>([]);
  const [recentViolationWarning, setRecentViolationWarning] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (selectedEx) {
      setCode(
        selectedEx.starterCode ||
          `import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        \n    }\n}`
      );
      setPublicTestResult(null);
      setPrivateTestResult(null);
      setOfficialStatus(null);
    } else if (exercises.length > 0) {
      setSelectedEx(activeExercises[0] || exercises[0]);
    }
  }, [selectedEx?.id, exercises.length]);

  useEffect(() => {
    if (preselectedExerciseId) {
      const found = exercises.find((e) => e.id === preselectedExerciseId);
      if (found) {
        setSelectedEx(found);
      }
    }
  }, [preselectedExerciseId, exercises]);

  useEffect(() => {
    const recordViolation = (type: Violation['type'], details: string, severity: 'low' | 'medium' | 'high' = 'medium') => {
      const newVio: Violation = {
        id: 'VIO_LOC_' + Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        studentEmail: currentUser.email,
        regNo: currentUser.regNo || 'STUDENT',
        studentName: currentUser.name,
        exerciseId: selectedEx?.id || 'EX_GENERAL',
        exerciseTitle: selectedEx?.title || 'General Exam',
        type,
        details,
        severity,
      };
      setLocalViolations((prev) => [newVio, ...prev]);
      setRecentViolationWarning(`Anti-Cheating Triggered: ${type} - ${details}`);
      setActiveConsoleTab('violations');
      setTimeout(() => {
        setRecentViolationWarning(null);
      }, 5000);
    };

    const handleBlur = () => {
      if (settings.trackTabSwitches) {
        recordViolation('TAB_SWITCH', 'Switched focus / left browser tab during examination', 'high');
      }
    };

    const handleFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);
      if (!active && settings.enforceFullscreen) {
        recordViolation('FULLSCREEN_EXIT', 'Exited mandatory exam fullscreen mode', 'medium');
      }
    };

    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [selectedEx, currentUser, settings]);

  const handleCodePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (settings.blockCopyPaste) {
      e.preventDefault();
      const pastedData = e.clipboardData.getData('text');
      const snippet = pastedData.slice(0, 30).replace(/\n/g, ' ');
      const newVio: Violation = {
        id: 'VIO_LOC_' + Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        studentEmail: currentUser.email,
        regNo: currentUser.regNo || 'STUDENT',
        studentName: currentUser.name,
        exerciseId: selectedEx?.id || 'EX_GENERAL',
        exerciseTitle: selectedEx?.title || 'General Exam',
        type: 'PASTE',
        details: `Clipboard paste intercepted (${pastedData.length} chars: "${snippet}...")`,
        severity: 'high',
      };
      setLocalViolations((prev) => [newVio, ...prev]);
      setRecentViolationWarning('Paste Action Blocked: Direct code pasting is restricted during this lab assessment!');
      setActiveConsoleTab('violations');
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const handleRunPublic = async () => {
    if (useCustomInput) {
      setIsRunningPublic(true);
      setActiveConsoleTab('output');
      const res = await JavaRunnerService.execute(code, customInputText, '', {
        remoteUrl: settings.useBuiltinRunner ? undefined : settings.renderServiceUrl,
        apiSecret: settings.apiSecret,
        forceBuiltin: settings.useBuiltinRunner,
      });
      setCustomOutputText(res.actualOutput || res.log);
      setIsRunningPublic(false);
      return;
    }

    setIsRunningPublic(true);
    setActiveConsoleTab('tests');
    if (!selectedEx) {
      setIsRunningPublic(false);
      return;
    }

    const result = await JavaRunnerService.execute(code, selectedEx.publicInput, selectedEx.publicOutput, {
      remoteUrl: settings.useBuiltinRunner ? undefined : settings.renderServiceUrl,
      apiSecret: settings.apiSecret,
      forceBuiltin: settings.useBuiltinRunner,
    });
    setPublicTestResult(result);
    setIsRunningPublic(false);
  };

  const handleSubmitCode = async () => {
    if (!selectedEx) return;

    setIsSubmitting(true);
    setActiveConsoleTab('tests');

    const pubRes = await JavaRunnerService.execute(code, selectedEx.publicInput, selectedEx.publicOutput, {
      remoteUrl: settings.useBuiltinRunner ? undefined : settings.renderServiceUrl,
      apiSecret: settings.apiSecret,
      forceBuiltin: settings.useBuiltinRunner,
    });

    const privRes = await JavaRunnerService.execute(code, selectedEx.privateInput, selectedEx.privateOutput, {
      remoteUrl: settings.useBuiltinRunner ? undefined : settings.renderServiceUrl,
      apiSecret: settings.apiSecret,
      forceBuiltin: settings.useBuiltinRunner,
    });

    setPublicTestResult(pubRes);
    setPrivateTestResult(privRes);

    let status: Submission['status'] = 'FAILED';
    let score = 0;
    if (pubRes.passed && privRes.passed) {
      status = 'ALL TEST CASES PASSED';
      score = 100;
    } else if (pubRes.passed || privRes.passed) {
      status = 'PARTIAL PASS';
      score = 50;
    } else if (pubRes.isError || privRes.isError) {
      status = 'COMPILATION ERROR';
      score = 0;
    }

    setOfficialStatus(status);

    const submissionPayload: Submission = {
      id: 'SUB_' + Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      studentEmail: currentUser.email,
      regNo: currentUser.regNo || '',
      studentName: currentUser.name,
      exerciseId: selectedEx.id,
      exerciseTitle: selectedEx.title,
      code,
      status,
      publicPassed: pubRes.passed,
      privatePassed: privRes.passed,
      publicLog: pubRes.log,
      privateLog: privRes.log,
      score,
    };

    onSubmitCode(submissionPayload, localViolations);
    setIsSubmitting(false);
  };

  const handleResetBoilerplate = () => {
    if (confirm('Reset code editor to starter boilerplate?')) {
      setCode(selectedEx?.starterCode || `public class Main {\n    public static void main(String[] args) {\n        \n    }\n}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Proctoring HUD Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Proctoring Guard Active
          </div>
          <div className="text-xs text-slate-600 hidden sm:flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="text-slate-400 font-mono">Candidate:</span>
              <span className="font-semibold text-slate-900">{currentUser.name}</span>
              {currentUser.regNo && <span className="text-indigo-600 font-mono text-[11px]">({currentUser.regNo})</span>}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenLeaderboard && (
            <button
              type="button"
              onClick={onOpenLeaderboard}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition shadow-xs"
              title="Open Leaderboard and peer rankings"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span>Leaderboard {studentRank ? `(#${studentRank})` : ''}</span>
            </button>
          )}

          <div
            onClick={() => setActiveConsoleTab('violations')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition ${
              localViolations.length > 0
                ? 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse'
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Violations Logged: {localViolations.length}</span>
          </div>

          <button
            onClick={toggleFullscreen}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition border ${
              isFullscreen
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isFullscreen ? 'Exit Fullscreen' : 'Lock Fullscreen Exam'}</span>
          </button>
        </div>
      </div>

      {recentViolationWarning && (
        <div className="bg-rose-50 border border-rose-300 text-rose-800 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between shadow-lg animate-bounce">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{recentViolationWarning}</span>
          </div>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-rose-100 border border-rose-200 text-rose-800">
            Recorded in Violations Sheet
          </span>
        </div>
      )}

      {/* Main Grid: Left Exercise Selector & Description, Right IDE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Exercises & Spec */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-indigo-600" />
                Scheduled Exercises ({exercises.length})
              </h3>
            </div>
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {exercises.length === 0 ? (
                <div className="text-center py-5 text-slate-400 text-xs">
                  No exercises scheduled yet.
                </div>
              ) : (
                exercises.map((ex) => {
                  const isSelected = selectedEx?.id === ex.id;
                  return (
                    <button
                      key={ex.id}
                      onClick={() => setSelectedEx(ex)}
                      className={`w-full text-left p-2.5 rounded-xl border transition flex items-center justify-between ${
                        isSelected
                          ? 'bg-indigo-50 border-indigo-400 text-indigo-950 font-bold shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      <div className="truncate mr-2">
                        <div className="text-xs font-bold truncate">{ex.title}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{ex.id}   {ex.category}</div>
                      </div>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                          ex.difficulty === 'Easy'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : ex.difficulty === 'Medium'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {ex.difficulty}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {!selectedEx ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-2 shadow-xs">
              <FileCode className="w-8 h-8 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-900">No Exercise Selected</h4>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-indigo-600 font-bold">{selectedEx.id}</span>
                  <span className="text-slate-400"> </span>
                  <span className="text-xs text-slate-500">{selectedEx.category}</span>
                </div>
                <h2 className="text-lg font-bold text-slate-900">{selectedEx.title}</h2>
              </div>
              <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                {selectedEx.description}
              </div>
              {/* Sample Public Test Case */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5 text-emerald-700">
                    <Eye className="w-3.5 h-3.5" /> Sample Test Case (Public)
                  </span>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 font-mono text-xs space-y-2">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block font-sans">Input:</span>
                    <pre className="text-slate-800 text-[11px] whitespace-pre-wrap">{selectedEx.publicInput}</pre>
                  </div>
                  <div className="border-t border-slate-200 pt-2">
                    <span className="text-[10px] text-slate-500 uppercase block font-sans">Expected Output:</span>
                    <pre className="text-emerald-700 font-bold text-[11px] whitespace-pre-wrap">{selectedEx.publicOutput}</pre>
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" /> Closes:
                </span>
                <span className="font-mono text-slate-700">
                  {new Date(selectedEx.closeTime).toLocaleDateString()} {new Date(selectedEx.closeTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Code Editor & Console */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs flex flex-col">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold text-slate-800 flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-orange-500" />
                  Main.java
                </span>
                <span className="text-[10px] text-slate-500 font-mono">JDK 17 Compatible</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setUseCustomInput(!useCustomInput)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition border ${
                    useCustomInput
                      ? 'bg-amber-50 text-amber-800 border-amber-300 font-semibold'
                      : 'bg-white text-slate-600 border-slate-300 hover:text-slate-900'
                  }`}
                >
                  Custom Input: {useCustomInput ? 'ON' : 'OFF'}
                </button>
                <button
                  type="button"
                  onClick={handleResetBoilerplate}
                  className="px-2.5 py-1 text-xs rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition flex items-center gap-1"
                  title="Reset code"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
                <button
                  type="button"
                  onClick={handleRunPublic}
                  disabled={isRunningPublic || isSubmitting}
                  className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold flex items-center gap-1.5 border border-slate-300 transition shadow-xs disabled:opacity-50"
                >
                  <Play className={`w-3.5 h-3.5 text-emerald-600 ${isRunningPublic ? 'animate-spin' : ''}`} />
                  <span>{isRunningPublic ? 'Running...' : 'Run Public Tests'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleSubmitCode}
                  disabled={isSubmitting || isRunningPublic}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition disabled:opacity-50"
                >
                  <Send className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-pulse' : ''}`} />
                  <span>{isSubmitting ? 'Evaluating...' : 'Submit Code'}</span>
                </button>
              </div>
            </div>

            <div className="relative bg-slate-50/50 font-mono text-xs">
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onPaste={handleCodePaste}
                rows={16}
                spellCheck={false}
                placeholder="public class Main { public static void main(String[] args) { ... } }"
                className="w-full bg-slate-50/30 focus:bg-white text-slate-900 p-4 font-mono text-xs leading-relaxed focus:outline-none resize-y selection:bg-indigo-600 selection:text-white border-none transition"
                style={{ tabSize: 4 }}
              />
            </div>

            {useCustomInput && (
              <div className="border-t border-slate-200 bg-amber-50/40 p-3 space-y-2">
                <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                  Custom Standard Input (System.in):
                </div>
                <textarea
                  rows={2}
                  value={customInputText}
                  onChange={(e) => setCustomInputText(e.target.value)}
                  placeholder="Enter custom input values to feed into Scanner..."
                  className="w-full bg-white border border-amber-200 rounded-lg p-2 font-mono text-xs text-slate-900 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Test Execution & Output Results Console */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveConsoleTab('tests')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    activeConsoleTab === 'tests'
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Test Cases Evaluation</span>
                </button>
                <button
                  onClick={() => setActiveConsoleTab('output')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    activeConsoleTab === 'output'
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Execution Console</span>
                </button>
                <button
                  onClick={() => setActiveConsoleTab('violations')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    activeConsoleTab === 'violations'
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  <span>Proctoring Audit ({localViolations.length})</span>
                </button>
              </div>
              {officialStatus && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500">Official Result:</span>
                  <span
                    className={`text-xs font-black px-2.5 py-0.5 rounded-md ${
                      officialStatus === 'ALL TEST CASES PASSED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : officialStatus === 'PARTIAL PASS'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {officialStatus}
                  </span>
                </div>
              )}
            </div>

            {/* Tab 1: Test Cases */}
            {activeConsoleTab === 'tests' && (
              <div className="p-4 space-y-3">
                {!publicTestResult && !privateTestResult ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    Click <strong className="text-slate-700">"Run Public Tests"</strong> to test sample cases, or <strong className="text-slate-700">"Submit Code"</strong> to evaluate all test cases.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {publicTestResult && (
                      <div
                        className={`p-3.5 rounded-xl border ${
                          publicTestResult.passed
                            ? 'bg-emerald-50/70 border-emerald-200'
                            : 'bg-rose-50/70 border-rose-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            {publicTestResult.passed ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-600" />
                            )}
                            Public Test Case #1
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                              publicTestResult.passed
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {publicTestResult.passed ? 'PASSED' : 'FAILED'}
                          </span>
                        </div>
                        <div className="space-y-1.5 text-[11px] font-mono">
                          <div className="text-slate-600">
                            Expected:{' '}
                            <span className="text-slate-900 font-semibold">{publicTestResult.expectedOutput}</span>
                          </div>
                          <div className="text-slate-600">
                            Your Output:{' '}
                            <span className={publicTestResult.passed ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold'}>
                              {publicTestResult.actualOutput || '(Empty or error)'}
                            </span>
                          </div>
                          {publicTestResult.executionTimeMs && (
                            <div className="text-[10px] text-slate-500 font-sans">
                              Execution time: {publicTestResult.executionTimeMs} ms
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {privateTestResult && (
                      <div
                        className={`p-3.5 rounded-xl border ${
                          privateTestResult.passed
                            ? 'bg-emerald-50/70 border-emerald-200'
                            : 'bg-rose-50/70 border-rose-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            {privateTestResult.passed ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-600" />
                            )}
                            Hidden Grading Test Case #2
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                              privateTestResult.passed
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {privateTestResult.passed ? 'PASSED' : 'FAILED'}
                          </span>
                        </div>
                        <div className="space-y-1.5 text-[11px] font-mono">
                          <div className="text-slate-600">
                            Hidden Evaluation Result:{' '}
                            <span className={privateTestResult.passed ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold'}>
                              {privateTestResult.passed ? 'All constraints satisfied' : 'Output mismatch'}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-sans">
                            Private inputs remain hidden to ensure grading integrity.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Console Output */}
            {activeConsoleTab === 'output' && (
              <div className="p-4 bg-slate-900 font-mono text-xs text-emerald-400 min-h-28">
                {customOutputText ? (
                  <pre className="whitespace-pre-wrap">{customOutputText}</pre>
                ) : (
                  <div className="text-slate-500">
                    Console output will appear here after running your code.
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Local Proctoring Violations */}
            {activeConsoleTab === 'violations' && (
              <div className="p-4 space-y-2">
                <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Proctoring Incidents Logged This Session:</span>
                  <span className="text-[11px] text-slate-500">
                    Will be synced to Google Sheet upon submission
                  </span>
                </div>
                {localViolations.length === 0 ? (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>Clean session! No tab switches, clipboard paste, or fullscreen exits recorded.</span>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {localViolations.map((v) => (
                      <div
                        key={v.id}
                        className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span className="font-semibold text-rose-700 font-mono">[{v.type}]</span>
                          <span className="text-slate-700">{v.details}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">{v.timestamp}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
