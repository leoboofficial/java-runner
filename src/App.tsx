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
} from './types';
import { Header } from './components/Header';
import { FacultyDashboard } from './components/FacultyPortal/FacultyDashboard';
import { StudentDashboard } from './components/StudentPortal/StudentDashboard';
import { AuthModal } from './components/AuthModal';
import { UserManualModal } from './components/UserManualModal';
import { CheckCircle2, ShieldAlert } from 'lucide-react';
import { SheetService } from './services/sheetService';

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
      if (saved) return JSON.parse(saved);
    } catch (e) {}

    if (portal === 'faculty') {
      return {
        role: 'FACULTY',
        email: 'faculty@hindustanuniv.ac.in',
        name: 'Faculty',
        department: 'Department of Computer Applications',
      };
    }
    return {
      role: 'STUDENT',
      email: '',
      name: 'Student',
      regNo: '',
      department: 'Department of Computer Applications',
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
    setCurrentUser(getStoredUser(tab));
  };

  // Database Data States
  const [exercises, setExercises] = useState<Exercise[]>(INITIAL_EXERCISES);
  const [submissions, setSubmissions] = useState<Submission[]>(INITIAL_SUBMISSIONS);
  const [violations, setViolations] = useState<Violation[]>(INITIAL_VIOLATIONS);
  const [students, setStudents] = useState<StudentRecord[]>(INITIAL_STUDENTS);
  const [faculty] = useState<FacultyRecord[]>(INITIAL_FACULTY);

  // Method B: System Settings read directly from .env variables (No UI settings tampering)
  const [settings] = useState<SystemSettings>(() => {
    const rawUrl = (import.meta as any).env.VITE_RENDER_SERVICE_URL || 'https://java-runner-uwue.onrender.com/execute';
    const cleanUrl = typeof rawUrl === 'string' ? rawUrl.trim().replace(/\/+$/, '') : '';
    const normalizedUrl = cleanUrl && !cleanUrl.endsWith('/execute') && cleanUrl.startsWith('http')
      ? `${cleanUrl}/execute`
      : cleanUrl;

    return {
      renderServiceUrl: normalizedUrl || 'https://java-runner-uwue.onrender.com/execute',
      apiSecret: (import.meta as any).env.VITE_API_SECRET || 'MY_SECURE_LAB_KEY_123',
      googleSheetsUrl: (import.meta as any).env.VITE_APPS_SCRIPT_URL || '',
      enforceFullscreen: true,
      blockCopyPaste: true,
      trackTabSwitches: true,
      useBuiltinRunner: false,
    };
  });

  // Sync exercises from Google Sheets if configured in .env
  React.useEffect(() => {
    if (settings.googleSheetsUrl && settings.googleSheetsUrl.startsWith('http')) {
      SheetService.fetchActiveExercises(settings.googleSheetsUrl).then((fetched) => {
        if (fetched && fetched.length > 0) {
          setExercises(fetched);
        }
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
    setExercises((prev) => {
      const idx = prev.findIndex((e) => e.id === newEx.id);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = newEx;
        return copy;
      }
      return [newEx, ...prev];
    });
    showToast(`Exercise "${newEx.title}" scheduled!`);

    // Sync to live Google Sheet if URL is configured in .env
    if (settings.googleSheetsUrl) {
      const synced = await SheetService.saveExercise(settings.googleSheetsUrl, newEx);
      if (synced) {
        showToast(`Synced "${newEx.title}" to Google Sheet Exercises tab!`);
      }
    }
  };

  // Faculty: Add student to roster
  const handleAddStudent = (newStu: StudentRecord) => {
    setStudents((prev) => [newStu, ...prev]);
    showToast(`Student ${newStu.name} (${newStu.regNo}) enrolled in roster!`);
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
    setCurrentUser(user);
    try {
      const key = user.role === 'FACULTY' ? FACULTY_STORAGE_KEY : STUDENT_STORAGE_KEY;
      localStorage.setItem(key, JSON.stringify(user));
    } catch (e) {}

    if (user.role === 'FACULTY') {
      setCurrentTab('faculty');
      showToast(`Logged in as Faculty Admin: ${user.name}`);
    } else {
      setCurrentTab('student');
      showToast(`Logged in as Student: ${user.name} (${user.regNo})`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-indigo-600 selection:text-white">
      {/* Top Header with Portal Switcher - No Settings Modal trigger */}
      <Header
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        currentUser={currentUser}
        onOpenLogin={() => setIsAuthOpen(true)}
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
        {currentTab === 'faculty' && (
          <FacultyDashboard
            currentUser={currentUser}
            exercises={exercises}
            submissions={submissions}
            violations={violations}
            students={students}
            onSaveExercise={handleSaveExercise}
            onAddStudent={handleAddStudent}
          />
        )}

        {currentTab === 'student' && (
          <StudentDashboard
            currentUser={currentUser}
            exercises={exercises}
            submissions={submissions}
            students={students}
            onSubmitCode={handleSubmitCode}
            settings={settings}
          />
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
