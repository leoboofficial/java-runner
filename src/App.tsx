import React, { useState } from 'react';
import {
  INITIAL_EXERCISES,
  INITIAL_FACULTY,
  INITIAL_STUDENTS,
  INITIAL_SUBMISSIONS,
  INITIAL_VIOLATIONS,
} from './data/mockData';
import {
  Exercise,
  FacultyRecord,
  StudentRecord,
  Submission,
  SystemSettings,
  User,
  Violation,
  StudentLabRecordSubmission,
  LoginAuditRecord,
} from './types';
import { Header } from './components/Header';
import { FacultyDashboard } from './components/FacultyPortal/FacultyDashboard';
import { StudentDashboard } from './components/StudentPortal/StudentDashboard';
import { AuthModal } from './components/AuthModal';
import { UserManualModal } from './components/UserManualModal';
import { CheckCircle2, ShieldAlert } from 'lucide-react';
import { SheetService } from './services/sheetService';
import { getOrCreateDeviceId, getSavedPersonalEmail } from './utils/deviceAudit';

function detectPortalFromUrl(): 'faculty' | 'student' {
  if (typeof window === 'undefined') return 'student';
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  const search = window.location.search.toLowerCase();

  if (path.includes('/faculty') || hash.includes('faculty') || search.includes('faculty')) {
    return 'faculty';
  }
  if (path.includes('/student') || hash.includes('student') || search.includes('student')) {
    return 'student';
  }
  return 'student';
}

const FACULTY_STORAGE_KEY = 'javalab_pro_user_faculty';
const STUDENT_STORAGE_KEY = 'javalab_pro_user_student';

export default function App() {
  const initialPortal = detectPortalFromUrl();

  // Navigation & User State
  const [currentTab, setCurrentTab] = useState<'faculty' | 'student'>(initialPortal);

  const getStoredUser = (portal: 'faculty' | 'student'): User => {
    try {
      const key = portal === 'faculty' ? FACULTY_STORAGE_KEY : STUDENT_STORAGE_KEY;
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved) as User;
        if (parsed && parsed.email && parsed.verifiedViaSheet === true) {
          return parsed;
        }
      }
    } catch (e) {}

    return {
      role: portal === 'faculty' ? 'FACULTY' : 'STUDENT',
      email: '',
      name: '',
      regNo: '',
      department: 'Department of Computer Applications',
      verifiedViaSheet: false,
    };
  };

  const [currentUser, setCurrentUser] = useState<User>(() => getStoredUser(initialPortal));

  // Listen to hash / URL changes
  React.useEffect(() => {
    const handleUrlChange = () => {
      const portal = detectPortalFromUrl();
      setCurrentTab(portal);
      setCurrentUser(getStoredUser(portal));
    };

    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);
    return () => {
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);

  const handleSelectTab = (tab: 'faculty' | 'student') => {
    setCurrentTab(tab);
    window.location.hash = '#/' + tab;
    if (tab === 'student' && currentUser.role === 'FACULTY' && currentUser.verifiedViaSheet) {
      return;
    }
    setCurrentUser(getStoredUser(tab));
  };

  // Database Data States
  const [exercises, setExercises] = useState<Exercise[]>(INITIAL_EXERCISES);
  const [submissions, setSubmissions] = useState<Submission[]>(INITIAL_SUBMISSIONS);
  const [violations, setViolations] = useState<Violation[]>(INITIAL_VIOLATIONS);
  const [students, setStudents] = useState<StudentRecord[]>(INITIAL_STUDENTS);
  const [faculty] = useState<FacultyRecord[]>(INITIAL_FACULTY);

  const EVALUATIONS_STORAGE_KEY = 'javalab_pro_evaluations';
  const [evaluations, setEvaluations] = useState<StudentLabRecordSubmission[]>([]);

  const LOGIN_AUDIT_STORAGE_KEY = 'javalab_pro_login_audit';
  const [loginAudit, setLoginAudit] = useState<LoginAuditRecord[]>([]);

  // System Settings read exclusively from environment variables (.env / GitHub Actions Variables)
  const [settings] = useState<SystemSettings>(() => {
    const rawRenderUrl = ((import.meta as any).env.VITE_RENDER_SERVICE_URL || '').trim().replace(/\/+$/, '');
    const normalizedRenderUrl =
      rawRenderUrl && !rawRenderUrl.endsWith('/execute') && rawRenderUrl.startsWith('http')
        ? `${rawRenderUrl}/execute`
        : rawRenderUrl;

    const envSheetsUrl = ((import.meta as any).env.VITE_APPS_SCRIPT_URL || '').trim();
    const savedSheetsUrl = !envSheetsUrl && typeof window !== 'undefined'
      ? (localStorage.getItem('javalab_sheets_url') || '').trim()
      : '';

    return {
      renderServiceUrl: normalizedRenderUrl,
      apiSecret: ((import.meta as any).env.VITE_API_SECRET || '').trim(),
      googleSheetsUrl: envSheetsUrl || savedSheetsUrl,
      enforceFullscreen: true,
      blockCopyPaste: true,
      trackTabSwitches: true,
      useBuiltinRunner: false,
    };
  });

  // Sync exercises, students, evaluations, & loginAudit directly from Google Sheets
  React.useEffect(() => {
    if (settings.googleSheetsUrl && settings.googleSheetsUrl.startsWith('http')) {
      SheetService.fetchActiveExercises(settings.googleSheetsUrl).then((fetched) => {
        setExercises(fetched);
      });

      SheetService.fetchStudents(settings.googleSheetsUrl).then((fetchedStudents) => {
        setStudents(fetchedStudents);
      });

      SheetService.fetchEvaluations(settings.googleSheetsUrl).then((fetchedEvals) => {
        setEvaluations(fetchedEvals);
        try {
          localStorage.setItem(EVALUATIONS_STORAGE_KEY, JSON.stringify(fetchedEvals));
        } catch (e) {}
      });

      SheetService.fetchLoginAudit(settings.googleSheetsUrl).then((fetchedAudit) => {
        setLoginAudit(fetchedAudit);
        try {
          localStorage.setItem(LOGIN_AUDIT_STORAGE_KEY, JSON.stringify(fetchedAudit));
        } catch (e) {}
      });
    }
  }, [settings.googleSheetsUrl]);

  // Modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'warn' } | null>(null);

  const showToast = (text: string, type: 'success' | 'warn' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Faculty: Save / Schedule new exercise
  const handleSaveExercise = async (newEx: Exercise) => {
    // 1. Immediate local update
    setExercises((prev) => {
      const idx = prev.findIndex((e) => e.id === newEx.id);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = newEx;
        return copy;
      }
      return [newEx, ...prev];
    });

    // 2. Sync to live Google Sheet Exercises tab with Starter Code
    if (settings.googleSheetsUrl) {
      showToast(`Saving "${newEx.title}" to Google Sheet...`);
      const syncResult = await SheetService.saveExercise(settings.googleSheetsUrl, newEx);
      if (syncResult.success) {
        showToast(`Synced "${newEx.title}" to Google Sheet Exercises tab with Starter Code!`);
        const fresh = await SheetService.fetchActiveExercises(settings.googleSheetsUrl);
        setExercises(fresh);
      } else {
        showToast(`Saved locally. Warning: ${syncResult.message || 'Check Apps Script deployment.'}`, 'warn');
      }
    } else {
      showToast(`Exercise "${newEx.title}" scheduled locally (Google Sheet URL not configured).`, 'warn');
    }
  };

  // Faculty: Add student to roster & Google Sheet
  const handleAddStudent = async (newStu: StudentRecord) => {
    setStudents((prev) => [newStu, ...prev]);
    if (settings.googleSheetsUrl) {
      const res = await SheetService.saveStudent(settings.googleSheetsUrl, newStu);
      if (res.success) {
        showToast(`Student ${newStu.name} (${newStu.regNo}) synced to Students sheet!`);
        return;
      }
    }
    showToast(`Student ${newStu.name} (${newStu.regNo}) added locally.`);
  };

  // Faculty: Manually trigger re-sync from Google Sheets
  const handleRefreshFromSheets = async () => {
    if (settings.googleSheetsUrl) {
      showToast('Syncing exercises, students, evaluations & login audit from Google Sheet...');
      const [fresh, freshStudents, freshEvals, freshAudit] = await Promise.all([
        SheetService.fetchActiveExercises(settings.googleSheetsUrl),
        SheetService.fetchStudents(settings.googleSheetsUrl),
        SheetService.fetchEvaluations(settings.googleSheetsUrl),
        SheetService.fetchLoginAudit(settings.googleSheetsUrl),
      ]);
      setExercises(fresh);
      setStudents(freshStudents);
      setEvaluations(freshEvals);
      setLoginAudit(freshAudit);
      try {
        localStorage.setItem(EVALUATIONS_STORAGE_KEY, JSON.stringify(freshEvals));
        localStorage.setItem(LOGIN_AUDIT_STORAGE_KEY, JSON.stringify(freshAudit));
      } catch (e) {}

      showToast(
        `Synced ${fresh.length} exercise(s), ${freshStudents.length} student(s), ${freshEvals.length} evaluation(s), ${freshAudit.length} login audit row(s)!`
      );
    } else {
      showToast('Google Sheets URL is not configured.', 'warn');
    }
  };

  // Faculty: Save Evaluation
  const handleSaveEvaluation = async (evaluation: StudentLabRecordSubmission) => {
    setEvaluations((prev) => {
      const idx = prev.findIndex((e) => e.regNo === evaluation.regNo);
      const updated = idx !== -1
        ? prev.map((item, i) => (i === idx ? evaluation : item))
        : [evaluation, ...prev];
      try {
        localStorage.setItem(EVALUATIONS_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    showToast(`Evaluation for ${evaluation.studentName} (${evaluation.regNo}) saved!`);

    if (settings.googleSheetsUrl) {
      const res = await SheetService.saveEvaluation(settings.googleSheetsUrl, evaluation);
      if (res.success) {
        showToast(`Synced evaluation to Google Sheet Evaluations tab!`);
      } else {
        showToast(`Saved locally. ${res.message || 'Check Apps Script deployment.'}`, 'warn');
      }
    }
  };

  // Faculty: Auto-Evaluate All pending student lab records
  const handleAutoEvaluateAll = async () => {
    const evaluatedMap = new Map<string, StudentLabRecordSubmission>(
      evaluations.map((e) => [e.regNo.trim().toUpperCase(), e])
    );

    // Collect all candidate records from submitted evaluations, code submissions, and roster
    const candidateMap = new Map<
      string,
      { regNo: string; name: string; email: string; department: string }
    >();

    evaluations.forEach((ev) => {
      const reg = (ev.regNo || '').trim().toUpperCase();
      if (!reg) return;
      candidateMap.set(reg, {
        regNo: reg,
        name: ev.studentName || `Student ${reg}`,
        email: ev.studentEmail || '',
        department: ev.department || 'Department of Computer Applications',
      });
    });

    submissions.forEach((sub) => {
      const reg = (sub.regNo || '').trim().toUpperCase();
      if (!reg || candidateMap.has(reg)) return;
      candidateMap.set(reg, {
        regNo: reg,
        name: sub.studentName || `Student ${reg}`,
        email: sub.studentEmail || '',
        department: 'Department of Computer Applications',
      });
    });

    students.forEach((stu) => {
      const reg = (stu.regNo || '').trim().toUpperCase();
      if (!reg || candidateMap.has(reg)) return;
      candidateMap.set(reg, {
        regNo: reg,
        name: stu.name || `Student ${reg}`,
        email: stu.email || '',
        department: stu.department || 'Department of Computer Applications',
      });
    });

    const updatedEvals: StudentLabRecordSubmission[] = [...evaluations];
    let evaluatedCount = 0;

    for (const candidate of candidateMap.values()) {
      const current = evaluatedMap.get(candidate.regNo);
      const alreadyApproved =
        current &&
        (current.isVerifiedAndApproved ||
          current.status === 'EVALUATED_APPROVED' ||
          current.status === 'APPROVED');
      if (alreadyApproved) continue;

      const stuSubmissions = submissions.filter(
        (s) => s.regNo.trim().toUpperCase() === candidate.regNo
      );
      const stuViolations = violations.filter(
        (v) => v.regNo.trim().toUpperCase() === candidate.regNo
      );
      const passedExerciseIds = new Set(
        stuSubmissions.filter((s) => s.score === 100).map((s) => s.exerciseId)
      );
      const passedCount = passedExerciseIds.size;
      const totalEx = Math.max(1, exercises.length);
      const allPassed = passedCount >= exercises.length && exercises.length > 0;

      // Rubric: Concept (5), Naming (1), Documentation (1), Output (3)
      let concept = allPassed ? 5 : Math.min(5, Math.max(2, Math.round((passedCount / totalEx) * 5)));
      const naming = passedCount > 0 || current ? 1 : 0.5;
      const doc = passedCount > 0 || current ? 1 : 0.5;
      const output = allPassed ? 3 : Math.min(3, Math.max(1, Math.round((passedCount / totalEx) * 3)));

      if (stuViolations.some((v) => v.severity === 'high')) {
        concept = Math.max(1, concept - 1);
      }
      const total = Number((concept + naming + doc + output).toFixed(1));

      const newEval: StudentLabRecordSubmission = {
        ...(current || {}),
        id: current?.id || `eval_${Date.now()}_${candidate.regNo}`,
        timestamp: new Date().toISOString(),
        regNo: candidate.regNo,
        studentName: candidate.name,
        studentEmail: candidate.email,
        personalEmail: current?.personalEmail || current?.loggedGmail || '',
        loggedGmail: current?.loggedGmail || current?.personalEmail || '',
        deviceId: current?.deviceId || '',
        multiStudentAlert: current?.multiStudentAlert || '',
        department: candidate.department,
        submissionDate: current?.submissionDate || new Date().toISOString().split('T')[0],
        status: 'EVALUATED_APPROVED',
        completedExercisesCount: passedCount,
        totalExercisesCount: exercises.length,
        antiCheatingViolationsCount: stuViolations.length,
        violationsCount: stuViolations.length,
        isVerifiedAndApproved: true,
        rubric: {
          conceptImplemented: concept,
          namingConventions: naming,
          documentation: doc,
          output: output,
          total: total,
          totalMarks: total,
        },
        rubrics: {
          conceptImplemented: concept,
          namingConventions: naming,
          documentation: doc,
          output: output,
          total: total,
          totalMarks: total,
        },
        facultyRemarks:
          current?.facultyRemarks && !current.facultyRemarks.includes('Awaiting faculty')
            ? current.facultyRemarks
            : 'Auto-evaluated on criteria: Concept (5), Naming (1), Doc (1), Output (3). Approved for final PDF download & print.',
        evaluatedBy: currentUser.name || 'Faculty Evaluator',
        evaluatedAt: new Date().toISOString(),
      };

      const idx = updatedEvals.findIndex(
        (e) => e.regNo.trim().toUpperCase() === candidate.regNo
      );
      if (idx !== -1) {
        updatedEvals[idx] = newEval;
      } else {
        updatedEvals.unshift(newEval);
      }
      evaluatedCount++;

      if (settings.googleSheetsUrl) {
        SheetService.saveEvaluation(settings.googleSheetsUrl, newEval);
      }
    }

    if (evaluatedCount === 0) {
      showToast('No pending student lab records to auto-evaluate.', 'warn');
      return;
    }

    setEvaluations(updatedEvals);
    try {
      localStorage.setItem(EVALUATIONS_STORAGE_KEY, JSON.stringify(updatedEvals));
    } catch (e) {}

    showToast(`Auto-evaluated and approved ${evaluatedCount} pending student record(s)!`);
  };

  // Student: Submit Lab Record to Faculty
  const handleSubmitLabRecord = async (recordSubmission: StudentLabRecordSubmission) => {
    setEvaluations((prev) => {
      const idx = prev.findIndex((e) => e.regNo === recordSubmission.regNo);
      const updated = idx !== -1
        ? prev.map((item, i) => (i === idx ? recordSubmission : item))
        : [recordSubmission, ...prev];
      try {
        localStorage.setItem(EVALUATIONS_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    showToast('Lab Record submitted to Faculty!');

    if (settings.googleSheetsUrl) {
      const res = await SheetService.submitLabRecord(settings.googleSheetsUrl, recordSubmission);
      if (res.success) {
        showToast('Record submission synced to Google Sheet Evaluations tab!');
      }
    }
  };

  // Student: Submit code
  const handleSubmitCode = async (submission: Submission, sessionViolations: Violation[]) => {
    setSubmissions((prev) => [submission, ...prev]);

    if (sessionViolations.length > 0) {
      setViolations((prev) => [...sessionViolations, ...prev]);
    }

    setStudents((prev) =>
      prev.map((s) => {
        if (s.regNo === submission.regNo) {
          return {
            ...s,
            submissionsCount: (s.submissionsCount || 0) + 1,
            violationsCount: (s.violationsCount || 0) + sessionViolations.length,
          };
        }
        return s;
      })
    );

    showToast(
      `Submission recorded! Status: ${submission.status} (${submission.score}/100).`,
      submission.score === 100 ? 'success' : 'warn'
    );

    // Sync submission and proctoring violations to Google Sheet if configured in .env
    if (settings.googleSheetsUrl) {
      const synced = await SheetService.saveSubmission(
        settings.googleSheetsUrl,
        submission,
        sessionViolations
      );
      if (synced) {
        showToast('Official submission & violations synced to Google Sheet!');
      }
    }
  };

  const handleLogin = (user: User) => {
    let enrichedUser = user;

    if (user.role === 'STUDENT') {
      const cleanReg = (user.regNo || '').trim().toUpperCase();
      const cleanPersonalMail = (
        user.personalEmail ||
        getSavedPersonalEmail() ||
        ''
      )
        .trim()
        .toLowerCase();
      const cleanDev = (user.deviceId || getOrCreateDeviceId()).trim();

      const otherRegsSet = new Set<string>();
      loginAudit.forEach((a) => {
        const aReg = (a.regNo || '').trim().toUpperCase();
        if (!aReg || aReg === cleanReg) return;
        const aMail = (a.personalEmail || '').trim().toLowerCase();
        const aDev = (a.deviceId || '').trim();
        if ((cleanPersonalMail && aMail === cleanPersonalMail) || (cleanDev && cleanDev !== 'UNKNOWN' && aDev === cleanDev)) {
          otherRegsSet.add(aReg);
        }
      });
      submissions.forEach((s) => {
        const sReg = (s.regNo || '').trim().toUpperCase();
        if (!sReg || sReg === cleanReg) return;
        const sMail = (s.personalEmail || '').trim().toLowerCase();
        const sDev = (s.deviceId || '').trim();
        if ((cleanPersonalMail && sMail === cleanPersonalMail) || (cleanDev && cleanDev !== 'UNKNOWN' && sDev === cleanDev)) {
          otherRegsSet.add(sReg);
        }
      });

      const otherRegs = Array.from(otherRegsSet);
      const alertMsg =
        user.multiStudentAlert ||
        (otherRegs.length > 0
          ? `FLAGGED: Shared Mail ID / Device also used for RegNo(s): ${otherRegs.join(', ')}`
          : '');

      enrichedUser = {
        ...user,
        personalEmail: cleanPersonalMail,
        deviceId: cleanDev,
        multiStudentAlert: alertMsg,
      };

      const auditEntry: LoginAuditRecord = {
        id: 'LOGIN_LOC_' + Date.now(),
        timestamp: new Date().toISOString(),
        officialEmail: (user.email || '').trim().toLowerCase(),
        regNo: cleanReg || 'UNASSIGNED',
        studentName: user.name,
        personalEmail: cleanPersonalMail,
        deviceId: cleanDev,
        otherRegNos: otherRegs.join(', '),
        status: alertMsg ? 'FLAGGED: MULTI-STUDENT PROXY' : 'CLEAR',
      };

      setLoginAudit((prev) => {
        const updated = [auditEntry, ...prev];
        try {
          localStorage.setItem(LOGIN_AUDIT_STORAGE_KEY, JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
    }

    setCurrentUser(enrichedUser);
    try {
      const key = enrichedUser.role === 'FACULTY' ? FACULTY_STORAGE_KEY : STUDENT_STORAGE_KEY;
      localStorage.setItem(key, JSON.stringify(enrichedUser));
    } catch (e) {}

    if (enrichedUser.role === 'FACULTY') {
      setCurrentTab('faculty');
      showToast(`Logged in as Faculty Admin: ${enrichedUser.name}`);
    } else {
      setCurrentTab('student');
      showToast(`Logged in as Student: ${enrichedUser.name} (${enrichedUser.regNo})`);
    }
  };

  const handleLogout = () => {
    try {
      const key = currentTab === 'faculty' ? FACULTY_STORAGE_KEY : STUDENT_STORAGE_KEY;
      localStorage.removeItem(key);
    } catch (e) {}
    setCurrentUser({
      role: currentTab === 'faculty' ? 'FACULTY' : 'STUDENT',
      email: '',
      name: '',
      regNo: '',
      department: 'Department of Computer Applications',
      verifiedViaSheet: false,
    });
    showToast('Signed out.');
  };

  const isAuthenticated = Boolean(currentUser.email && currentUser.verifiedViaSheet);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-indigo-600 selection:text-white">
      {/* Top Header with Portal Switcher - No Settings Modal trigger */}
      <Header
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        currentUser={currentUser}
        onOpenLogin={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        onOpenManual={() => setIsManualOpen(true)}
        settings={settings}
        activeViolationsCount={violations.filter((v) => v.severity === 'high').length}
      />

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div
            className={`px-4 py-3 rounded-xl shadow-xl border text-xs font-semibold flex items-center gap-2.5 ${
              toastMessage.type === 'success'
                ? 'bg-white border-emerald-200 text-emerald-800'
                : 'bg-white border-amber-200 text-amber-800'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Main Workspace Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!isAuthenticated ? (
          <AuthModal
            isOpen={true}
            inline={true}
            onClose={() => {}}
            currentUser={currentUser}
            onLogin={handleLogin}
            facultyList={faculty}
            studentsList={students}
            googleSheetsUrl={settings.googleSheetsUrl}
            portalRole={currentTab}
          />
        ) : (
          <>
            {currentTab === 'faculty' && (
              <FacultyDashboard
                currentUser={currentUser}
                exercises={exercises}
                submissions={submissions}
                violations={violations}
                students={students}
                evaluations={evaluations}
                loginAudit={loginAudit}
                onSaveExercise={handleSaveExercise}
                onAddStudent={handleAddStudent}
                onSaveEvaluation={handleSaveEvaluation}
                onAutoEvaluateAll={handleAutoEvaluateAll}
                onRefreshExercises={handleRefreshFromSheets}
              />
            )}

            {currentTab === 'student' && (
              <StudentDashboard
                currentUser={currentUser}
                exercises={exercises}
                submissions={submissions}
                students={students}
                violations={violations}
                evaluations={evaluations}
                onSubmitCode={handleSubmitCode}
                onSubmitLabRecord={handleSubmitLabRecord}
                settings={settings}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/90 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>JavaLab Pro   Automated Grading, Anti-Cheating & Practical Lab Record System</div>
          <div className="flex items-center gap-4 text-[11px] text-slate-500">
            <span>Hindustan Institute of Technology and Science</span>
            <span>•</span>
            <span>Eclipse Temurin OpenJDK 17</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={currentUser}
        onLogin={handleLogin}
        facultyList={faculty}
        studentsList={students}
        googleSheetsUrl={settings.googleSheetsUrl}
        portalRole={currentTab}
      />

      <UserManualModal
        isOpen={isManualOpen}
        onClose={() => setIsManualOpen(false)}
        role={currentTab === 'faculty' ? 'FACULTY' : 'STUDENT'}
      />
    </div>
  );
}
