import React, { useState, useEffect, useRef } from 'react';
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
  Save,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { JavaRunnerService } from '../../services/javaRunner';
import { getOrCreateDeviceId, getSavedPersonalEmail } from '../../utils/deviceAudit';

interface StudentIDEProps {
  currentUser: User;
  exercises: Exercise[];
  onSubmitCode: (submission: Submission, localViolations: Violation[]) => void;
  settings: SystemSettings;
  preselectedExerciseId?: string | null;
}

interface CachedExerciseResults {
  publicTestResult: ExecutionResult | null;
  privateTestResult: ExecutionResult | null;
  officialStatus: string | null;
  consoleOutput?: string;
  consoleIsError?: boolean;
}

const DEFAULT_STARTER_CODE = `import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        \n    }\n}`;

const getStarterCode = (ex?: Exercise): string =>
  ex?.starterCode && ex.starterCode.trim().length > 0 ? ex.starterCode : DEFAULT_STARTER_CODE;

export const StudentIDE: React.FC<StudentIDEProps> = ({
  currentUser,
  exercises,
  onSubmitCode,
  settings,
  preselectedExerciseId,
}) => {
  const now = Date.now();
  const activeExercises = exercises.filter((ex) => {
    const open = new Date(ex.openTime).getTime();
    const close = new Date(ex.closeTime).getTime();
    return now >= open && now <= close;
  });

  const studentDraftPrefix = (currentUser.regNo || currentUser.email || 'guest')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_');

  const getDraftStorageKey = (exId: string) => `javalab_draft_${studentDraftPrefix}_${exId}`;

  const readStoredDraft = (exId: string): { code: string; savedAt: string } | null => {
    try {
      const raw = localStorage.getItem(getDraftStorageKey(exId));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.code === 'string') {
        return { code: parsed.code, savedAt: parsed.savedAt || '' };
      }
    } catch {
      // Ignore storage read errors
    }
    return null;
  };

  const writeStoredDraft = (exId: string, draftCode: string): string => {
    const savedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    try {
      localStorage.setItem(
        getDraftStorageKey(exId),
        JSON.stringify({ code: draftCode, savedAt })
      );
    } catch {
      // Ignore storage quota errors
    }
    return savedAt;
  };

  const removeStoredDraft = (exId: string) => {
    try {
      localStorage.removeItem(getDraftStorageKey(exId));
    } catch {
      // Ignore storage errors
    }
  };

  const initialEx =
    (preselectedExerciseId && exercises.find((e) => e.id === preselectedExerciseId)) ||
    activeExercises[0] ||
    exercises[0];

  const [selectedEx, setSelectedEx] = useState<Exercise | undefined>(initialEx);

  const [draftsByEx, setDraftsByEx] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    exercises.forEach((ex) => {
      const stored = readStoredDraft(ex.id);
      if (stored) {
        map[ex.id] = stored.code;
      }
    });
    return map;
  });

  const [savedTimeByEx, setSavedTimeByEx] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    exercises.forEach((ex) => {
      const stored = readStoredDraft(ex.id);
      if (stored?.savedAt) {
        map[ex.id] = stored.savedAt;
      }
    });
    return map;
  });

  const [resultsByEx, setResultsByEx] = useState<Record<string, CachedExerciseResults>>({});

  const [code, setCode] = useState<string>(() => {
    if (!initialEx) return DEFAULT_STARTER_CODE;
    const stored = readStoredDraft(initialEx.id);
    return stored ? stored.code : getStarterCode(initialEx);
  });

  const [isRunningPublic, setIsRunningPublic] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publicTestResult, setPublicTestResult] = useState<ExecutionResult | null>(null);
  const [privateTestResult, setPrivateTestResult] = useState<ExecutionResult | null>(null);
  const [officialStatus, setOfficialStatus] = useState<string | null>(null);
  const [activeConsoleTab, setActiveConsoleTab] = useState<'tests' | 'output' | 'violations'>('tests');

  const [useCustomInput, setUseCustomInput] = useState(false);
  const [customInputText, setCustomInputText] = useState('');
  const [customOutputText, setCustomOutputText] = useState('');
  const [consoleIsError, setConsoleIsError] = useState(false);

  const [justSaved, setJustSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const [localViolations, setLocalViolations] = useState<Violation[]>([]);
  const [recentViolationWarning, setRecentViolationWarning] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const latestCodeRef = useRef(code);
  latestCodeRef.current = code;
  const selectedExRef = useRef(selectedEx);
  selectedExRef.current = selectedEx;

  // Hydrate drafts when exercises list changes and keep selectedEx valid
  useEffect(() => {
    if (exercises.length === 0) return;

    setDraftsByEx((prev) => {
      const next = { ...prev };
      let changed = false;
      exercises.forEach((ex) => {
        if (next[ex.id] === undefined) {
          const stored = readStoredDraft(ex.id);
          if (stored) {
            next[ex.id] = stored.code;
            changed = true;
          }
        }
      });
      return changed ? next : prev;
    });

    setSavedTimeByEx((prev) => {
      const next = { ...prev };
      let changed = false;
      exercises.forEach((ex) => {
        if (!next[ex.id]) {
          const stored = readStoredDraft(ex.id);
          if (stored?.savedAt) {
            next[ex.id] = stored.savedAt;
            changed = true;
          }
        }
      });
      return changed ? next : prev;
    });

    if (selectedEx) {
      const fresh = exercises.find((e) => e.id === selectedEx.id);
      if (fresh) {
        if (fresh !== selectedEx) {
          setSelectedEx(fresh);
        }
      } else {
        const fallback = activeExercises[0] || exercises[0];
        if (fallback) handleSelectExercise(fallback);
      }
    } else {
      const fallback = activeExercises[0] || exercises[0];
      if (fallback) handleSelectExercise(fallback);
    }
  }, [exercises]);

  // Switch exercise when parent preselects one
  useEffect(() => {
    if (preselectedExerciseId) {
      const found = exercises.find((e) => e.id === preselectedExerciseId);
      if (found && found.id !== selectedEx?.id) {
        handleSelectExercise(found);
      }
    }
  }, [preselectedExerciseId, exercises]);

  // Debounced auto-save whenever code changes for the current exercise
  useEffect(() => {
    if (!selectedEx) return;
    const exId = selectedEx.id;
    const starter = getStarterCode(selectedEx);
    const hasExistingDraft = Boolean(savedTimeByEx[exId] || readStoredDraft(exId));

    if (code === starter && !hasExistingDraft) return;

    const timer = setTimeout(() => {
      const savedAt = writeStoredDraft(exId, code);
      setSavedTimeByEx((prev) => ({ ...prev, [exId]: savedAt }));
    }, 300);

    return () => clearTimeout(timer);
  }, [code, selectedEx?.id]);

  // Helper to switch between programs cleanly without losing unsaved code or results
  const handleSelectExercise = (targetEx: Exercise) => {
    const current = selectedExRef.current;
    if (current && current.id !== targetEx.id) {
      const currentCode = latestCodeRef.current;
      const starter = getStarterCode(current);
      const hadDraft = Boolean(savedTimeByEx[current.id] || readStoredDraft(current.id));

      setDraftsByEx((prev) => ({ ...prev, [current.id]: currentCode }));
      if (currentCode !== starter || hadDraft) {
        const savedAt = writeStoredDraft(current.id, currentCode);
        setSavedTimeByEx((prev) => ({ ...prev, [current.id]: savedAt }));
      }
    }

    const stored = readStoredDraft(targetEx.id);
    const nextCode = draftsByEx[targetEx.id] ?? stored?.code ?? getStarterCode(targetEx);
    const cachedResults = resultsByEx[targetEx.id];

    setSelectedEx(targetEx);
    setCode(nextCode);
    setPublicTestResult(cachedResults?.publicTestResult ?? null);
    setPrivateTestResult(cachedResults?.privateTestResult ?? null);
    setOfficialStatus(cachedResults?.officialStatus ?? null);
    setCustomOutputText(cachedResults?.consoleOutput ?? '');
    setConsoleIsError(Boolean(cachedResults?.consoleIsError));
    setConfirmReset(false);
  };

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    if (selectedEx) {
      setDraftsByEx((prev) => ({ ...prev, [selectedEx.id]: newCode }));
    }
  };

  const handleManualSaveDraft = () => {
    if (!selectedEx) return;
    const exId = selectedEx.id;
    const savedAt = writeStoredDraft(exId, code);
    setDraftsByEx((prev) => ({ ...prev, [exId]: code }));
    setSavedTimeByEx((prev) => ({ ...prev, [exId]: savedAt }));
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1800);
  };

  useEffect(() => {
    const recordViolation = (type: Violation['type'], details: string, severity: 'low' | 'medium' | 'high' = 'medium') => {
      const newVio: Violation = {
        id: 'VIO_LOC_' + Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        studentEmail: currentUser.email,
        personalEmail: currentUser.personalEmail || getSavedPersonalEmail() || '',
        deviceId: currentUser.deviceId || getOrCreateDeviceId(),
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

    const handleFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);
      if (!active && settings.enforceFullscreen) {
        recordViolation('FULLSCREEN_EXIT', 'Exited mandatory exam fullscreen mode', 'medium');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
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
        personalEmail: currentUser.personalEmail || getSavedPersonalEmail() || '',
        deviceId: currentUser.deviceId || getOrCreateDeviceId(),
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
    if (selectedEx) {
      const savedAt = writeStoredDraft(selectedEx.id, code);
      setSavedTimeByEx((prev) => ({ ...prev, [selectedEx.id]: savedAt }));
    }

    if (useCustomInput) {
      setIsRunningPublic(true);
      setActiveConsoleTab('output');
      const res = await JavaRunnerService.execute(code, customInputText, '', {
        remoteUrl: settings.useBuiltinRunner ? undefined : settings.renderServiceUrl,
        apiSecret: settings.apiSecret,
        forceBuiltin: settings.useBuiltinRunner,
      });
      const outputMsg = res.isError ? res.log : res.actualOutput || res.log;
      setCustomOutputText(outputMsg);
      setConsoleIsError(Boolean(res.isError));
      if (selectedEx) {
        setResultsByEx((prev) => ({
          ...prev,
          [selectedEx.id]: {
            publicTestResult: prev[selectedEx.id]?.publicTestResult ?? publicTestResult,
            privateTestResult: prev[selectedEx.id]?.privateTestResult ?? privateTestResult,
            officialStatus: prev[selectedEx.id]?.officialStatus ?? officialStatus,
            consoleOutput: outputMsg,
            consoleIsError: Boolean(res.isError),
          },
        }));
      }
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
    const consoleMsg = result.isError ? result.log : result.actualOutput || result.log;
    setPublicTestResult(result);
    setCustomOutputText(consoleMsg);
    setConsoleIsError(Boolean(result.isError));
    setResultsByEx((prev) => ({
      ...prev,
      [selectedEx.id]: {
        publicTestResult: result,
        privateTestResult: prev[selectedEx.id]?.privateTestResult ?? null,
        officialStatus: prev[selectedEx.id]?.officialStatus ?? null,
        consoleOutput: consoleMsg,
        consoleIsError: Boolean(result.isError),
      },
    }));
    setIsRunningPublic(false);
  };

  const handleSubmitCode = async () => {
    if (!selectedEx) return;

    const savedAt = writeStoredDraft(selectedEx.id, code);
    setSavedTimeByEx((prev) => ({ ...prev, [selectedEx.id]: savedAt }));

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
    } else if (pubRes.isTimeout || privRes.isTimeout) {
      status = 'TIME LIMIT EXCEEDED';
      score = 0;
    } else if (pubRes.isError || privRes.isError) {
      status = 'COMPILATION ERROR';
      score = 0;
    }

    const consoleMsg = pubRes.isError ? pubRes.log : pubRes.actualOutput || pubRes.log;
    setOfficialStatus(status);
    setCustomOutputText(consoleMsg);
    setConsoleIsError(Boolean(pubRes.isError || privRes.isError));

    setResultsByEx((prev) => ({
      ...prev,
      [selectedEx.id]: {
        publicTestResult: pubRes,
        privateTestResult: privRes,
        officialStatus: status,
        consoleOutput: consoleMsg,
        consoleIsError: Boolean(pubRes.isError || privRes.isError),
      },
    }));

    const submissionPayload: Submission = {
      id: 'SUB_' + Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      studentEmail: currentUser.email,
      personalEmail: currentUser.personalEmail || getSavedPersonalEmail() || '',
      deviceId: currentUser.deviceId || getOrCreateDeviceId(),
      multiStudentAlert: currentUser.multiStudentAlert || '',
      regNo: currentUser.regNo || '',
      studentName: currentUser.name,
      exerciseId: selectedEx.id,
      exerciseTitle: selectedEx.title,
      assessmentType: selectedEx.assessmentType || 'LAB',
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
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 3000);
      return;
    }
    const starter = getStarterCode(selectedEx);
    setCode(starter);
    setConfirmReset(false);
    if (selectedEx) {
      removeStoredDraft(selectedEx.id);
      setDraftsByEx((prev) => ({ ...prev, [selectedEx.id]: starter }));
      setSavedTimeByEx((prev) => {
        const copy = { ...prev };
        delete copy[selectedEx.id];
        return copy;
      });
      setResultsByEx((prev) => {
        const copy = { ...prev };
        delete copy[selectedEx.id];
        return copy;
      });
      setPublicTestResult(null);
      setPrivateTestResult(null);
      setOfficialStatus(null);
      setCustomOutputText('');
      setConsoleIsError(false);
    }
  };

  const currentIndex = selectedEx ? exercises.findIndex((e) => e.id === selectedEx.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < exercises.length - 1;

  const handlePrevExercise = () => {
    if (hasPrev) {
      handleSelectExercise(exercises[currentIndex - 1]);
    }
  };

  const handleNextExercise = () => {
    if (hasNext) {
      handleSelectExercise(exercises[currentIndex + 1]);
    }
  };

  const currentSavedTime = selectedEx ? savedTimeByEx[selectedEx.id] : undefined;

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
                Scheduled Questions ({exercises.length})
              </h3>
              <span className="text-[10px] text-slate-400">Drafts auto-saved</span>
            </div>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {exercises.length === 0 ? (
                <div className="text-center py-5 text-slate-400 text-xs">
                  No questions scheduled yet.
                </div>
              ) : (
                exercises.map((ex, idx) => {
                  const isSelected = selectedEx?.id === ex.id;
                  const exResult = resultsByEx[ex.id];
                  const hasDraft = Boolean(savedTimeByEx[ex.id]);
                  const isPassed = exResult?.officialStatus === 'ALL TEST CASES PASSED' || exResult?.publicTestResult?.passed;
                  return (
                    <button
                      key={ex.id}
                      onClick={() => handleSelectExercise(ex)}
                      className={`w-full text-left p-2.5 rounded-xl border transition flex items-center justify-between ${
                        isSelected
                          ? 'bg-indigo-50 border-indigo-400 text-indigo-950 font-bold shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      <div className="truncate mr-2">
                        <div className="text-xs font-bold truncate flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-indigo-600">Q{idx + 1}.</span>
                          <span className="truncate">{ex.title}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
                          <span>{ex.id} · {ex.category}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isPassed ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                            PASS
                          </span>
                        ) : hasDraft ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200">
                            SAVED
                          </span>
                        ) : null}
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
                      </div>
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
                  <span className="text-slate-400">·</span>
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
            {/* Program Toggle & Switcher Bar */}
            {exercises.length > 0 && (
              <div className="bg-slate-100/80 px-4 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                    Program:
                  </span>
                  <select
                    value={selectedEx?.id || ''}
                    onChange={(e) => {
                      const next = exercises.find((ex) => ex.id === e.target.value);
                      if (next) handleSelectExercise(next);
                    }}
                    className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 max-w-xs truncate"
                  >
                    {exercises.map((ex, idx) => (
                      <option key={ex.id} value={ex.id}>
                        Q{idx + 1}: {ex.title} ({ex.id}){savedTimeByEx[ex.id] ? ' [Saved]' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePrevExercise}
                    disabled={!hasPrev}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Prev</span>
                  </button>
                  <span className="text-[11px] font-mono font-semibold text-slate-600 px-2">
                    {currentIndex >= 0 ? `${currentIndex + 1} / ${exercises.length}` : `0 / ${exercises.length}`}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextExercise}
                    disabled={!hasNext}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Editor Toolbar */}
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-mono font-semibold text-slate-800 flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-orange-500" />
                  Main.java
                </span>
                <span className="text-[10px] text-slate-500 font-mono">JDK 17 Compatible</span>
                {currentSavedTime && (
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-medium">
                    Saved {currentSavedTime}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleManualSaveDraft}
                  disabled={!selectedEx}
                  className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition border flex items-center gap-1 ${
                    justSaved
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                  title="Save current code draft for this program"
                >
                  {justSaved ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Save className="w-3.5 h-3.5 text-indigo-600" />}
                  <span>{justSaved ? 'Saved!' : 'Save Draft'}</span>
                </button>
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
                  className={`px-2.5 py-1 text-xs rounded-lg transition flex items-center gap-1 border ${
                    confirmReset
                      ? 'bg-rose-50 text-rose-700 border-rose-300 font-semibold'
                      : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                  title="Reset code to starter boilerplate"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{confirmReset ? 'Confirm Reset?' : 'Reset'}</span>
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
                onChange={(e) => handleCodeChange(e.target.value)}
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
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
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
                            {publicTestResult.passed
                              ? 'PASSED'
                              : publicTestResult.isTimeout
                              ? 'TIMEOUT'
                              : publicTestResult.isError
                              ? 'ERROR'
                              : 'FAILED'}
                          </span>
                        </div>
                        <div className="space-y-2 text-[11px] font-mono">
                          {(publicTestResult.isError || (!publicTestResult.passed && !publicTestResult.actualOutput && publicTestResult.log)) && (
                            <div className="bg-slate-900 text-rose-300 rounded-lg p-2.5 border border-rose-300 overflow-x-auto">
                              <div className="text-[10px] uppercase tracking-wider text-rose-400 font-sans font-bold mb-1">
                                Compilation / Runtime Error Details:
                              </div>
                              <pre className="whitespace-pre-wrap break-words leading-relaxed">{publicTestResult.log}</pre>
                            </div>
                          )}
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase font-sans block mb-0.5">Expected Output:</span>
                            <pre className="bg-white/80 border border-slate-200 rounded-lg p-2 text-slate-900 font-semibold whitespace-pre-wrap break-words">
                              {publicTestResult.expectedOutput || '(Empty)'}
                            </pre>
                          </div>
                          {(!publicTestResult.isError || publicTestResult.actualOutput) && (
                            <div>
                              <span className="text-[10px] text-slate-500 uppercase font-sans block mb-0.5">Your Output:</span>
                              <pre
                                className={`bg-white/80 border rounded-lg p-2 font-semibold whitespace-pre-wrap break-words ${
                                  publicTestResult.passed
                                    ? 'border-emerald-200 text-emerald-700'
                                    : 'border-rose-200 text-rose-700'
                                }`}
                              >
                                {publicTestResult.actualOutput ? publicTestResult.actualOutput : '(No output printed)'}
                              </pre>
                            </div>
                          )}
                          {publicTestResult.executionTimeMs !== undefined && (
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
                            {privateTestResult.passed
                              ? 'PASSED'
                              : privateTestResult.isTimeout
                              ? 'TIMEOUT'
                              : privateTestResult.isError
                              ? 'ERROR'
                              : 'FAILED'}
                          </span>
                        </div>
                        <div className="space-y-2 text-[11px] font-mono">
                          <div className="text-slate-600">
                            Hidden Evaluation Result:{' '}
                            <span className={privateTestResult.passed ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold'}>
                              {privateTestResult.passed
                                ? 'All constraints satisfied'
                                : privateTestResult.isTimeout
                                ? 'Time limit exceeded'
                                : privateTestResult.isError
                                ? 'Compilation / Runtime Error'
                                : 'Output mismatch'}
                            </span>
                          </div>
                          {privateTestResult.isError && privateTestResult.log && (
                            <div className="bg-slate-900 text-rose-300 rounded-lg p-2.5 border border-rose-300 overflow-x-auto">
                              <pre className="whitespace-pre-wrap break-words leading-relaxed">{privateTestResult.log}</pre>
                            </div>
                          )}
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
              <div className={`p-4 bg-slate-900 font-mono text-xs min-h-28 ${consoleIsError ? 'text-rose-300' : 'text-emerald-400'}`}>
                {customOutputText ? (
                  <pre className="whitespace-pre-wrap break-words">{customOutputText}</pre>
                ) : (
                  <div className="text-slate-500">
                    Console output or compiler errors will appear here after running your code.
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
                    <span>Clean session! No clipboard paste or fullscreen exits recorded.</span>
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

