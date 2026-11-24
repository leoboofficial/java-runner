import React, { useState } from 'react';
import { User, SystemSettings } from '../types';
import {
  Code2,
  GraduationCap,
  Terminal,
  Users,
  Share2,
  Check,
  Eye,
  BookOpen,
  LogOut,
  UserCog,
} from 'lucide-react';

interface HeaderProps {
  currentTab: 'faculty' | 'student' | 'coordinator';
  onSelectTab: (tab: 'faculty' | 'student' | 'coordinator') => void;
  currentUser: User;
  onOpenLogin: () => void;
  onLogout?: () => void;
  onOpenManual?: () => void;
  settings: SystemSettings;
  activeViolationsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  onOpenLogin,
  onLogout,
  onOpenManual,
}) => {
  const isVerified = Boolean(currentUser.email && currentUser.verifiedViaSheet);
  const [copiedLink, setCopiedLink] = useState(false);

  const copyStudentLink = () => {
    const origin = window.location.origin;
    const path = window.location.pathname.replace(/\/(faculty|student|coordinator)\/?$/, '');
    const studentUrl = `${origin}${path}#/student`;
    navigator.clipboard.writeText(studentUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-16 py-2 gap-3">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-orange-500 to-rose-600 flex items-center justify-center shadow-md shadow-orange-500/20 text-white font-black tracking-tight shrink-0">
              <Code2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-xs sm:text-sm lg:text-[15px] text-slate-900 tracking-tight leading-tight">
                OBJECT ORIENTED PROGRAMMING APPROACH Lab{' '}
                <span className="text-orange-500 font-black">BCB52003</span>
              </div>
            </div>
          </div>

          {/* Role-Specific Portal Indicator & Navigation */}
          <div className="flex items-center gap-2 shrink-0">
            {currentTab === 'student' ? (
              /* Student Portal - Strictly shows Student Badge; Faculty & Coordinator controls hidden */
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700 shadow-xs whitespace-nowrap">
                  <Terminal className="w-4 h-4 text-emerald-600" />
                  <span>JAVA LAB Workspace</span>
                </div>
                {isVerified && currentUser.role === 'FACULTY' && (
                  <button
                    onClick={() => onSelectTab('faculty')}
                    className="text-xs text-indigo-700 hover:text-indigo-800 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 font-semibold transition flex items-center gap-1.5 shadow-xs whitespace-nowrap"
                    title="Return to Faculty Portal"
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Return to Faculty</span>
                  </button>
                )}
              </div>
            ) : currentTab === 'coordinator' ? (
              /* Coordinator Portal - Shows Coordinator Badge and Faculty Portal quick switch when authenticated */
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-violet-50 border border-violet-200 text-xs font-bold text-violet-700 shadow-xs whitespace-nowrap">
                  <UserCog className="w-4 h-4 text-violet-600" />
                  <span>Course Coordinator Portal</span>
                </div>
                {isVerified && (
                  <button
                    onClick={() => onSelectTab('faculty')}
                    className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold border border-slate-200 transition whitespace-nowrap"
                    title="Open Faculty Management Portal (/#/faculty)"
                  >
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Faculty Portal</span>
                  </button>
                )}
              </div>
            ) : (
              /* Faculty Portal - Shows Faculty Badge and Student Link share */
              <div className="flex items-center gap-1.5">
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-700 shadow-xs whitespace-nowrap">
                  <GraduationCap className="w-4 h-4 text-indigo-600" />
                  <span>Faculty Portal</span>
                </div>
                {isVerified && (
                  <>
                    <button
                      onClick={() => onSelectTab('student')}
                      className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold border border-slate-200 transition whitespace-nowrap"
                      title="Preview what students see in their exam workspace"
                    >
                      <Eye className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Preview Student IDE</span>
                    </button>
                    <button
                      onClick={copyStudentLink}
                      className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold border border-slate-200 transition whitespace-nowrap"
                      title="Copy Student Exam URL (/#/student) to share with your students"
                    >
                      {copiedLink ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Share2 className="w-3.5 h-3.5 text-amber-600" />
                      )}
                      <span>{copiedLink ? 'Copied!' : 'Share Student URL'}</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* User Status & Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onOpenLogin}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-left transition shadow-xs group"
              title={isVerified ? 'Switch authenticated account' : 'Sign in to your account'}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentTab === 'coordinator'
                    ? 'bg-violet-100 text-violet-700 border border-violet-200'
                    : currentTab === 'faculty'
                    ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                    : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                }`}
              >
                {currentTab === 'coordinator' ? 'C' : currentTab === 'faculty' ? 'F' : 'S'}
              </div>
              <div className="hidden md:block">
                <div className="text-xs font-semibold text-slate-800 group-hover:text-slate-900 leading-tight">
                  {isVerified ? currentUser.name : 'Sign In'}
                </div>
                {isVerified && (
                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                    <span>
                      {currentUser.role === 'COORDINATOR'
                        ? currentUser.email || currentUser.username || 'Coordinator'
                        : currentUser.role === 'FACULTY'
                        ? currentUser.email
                        : currentUser.regNo || currentUser.email}
                    </span>
                  </div>
                )}
              </div>
              <Users className="w-3.5 h-3.5 text-slate-400 ml-1 group-hover:text-slate-600" />
            </button>

            {isVerified && onLogout && (
              <button
                onClick={onLogout}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-700 text-xs font-semibold transition shadow-xs"
                title="Sign out of current session"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            )}

            {onOpenManual && (
              <button
                onClick={onOpenManual}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold transition shadow-xs"
                title={
                  currentTab === 'coordinator'
                    ? 'Open Course Coordinator Manual'
                    : currentTab === 'faculty'
                    ? 'Open Faculty Examination & Administration Manual'
                    : 'Open Student Examination & Practical Record Manual'
                }
              >
                <BookOpen
                  className={`w-3.5 h-3.5 ${
                    currentTab === 'coordinator'
                      ? 'text-violet-600'
                      : currentTab === 'faculty'
                      ? 'text-indigo-600'
                      : 'text-emerald-600'
                  }`}
                />
                <span className="hidden sm:inline">
                  {currentTab === 'coordinator'
                    ? 'Coordinator Manual'
                    : currentTab === 'faculty'
                    ? 'Faculty Manual'
                    : 'Student Manual'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
