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
} from 'lucide-react';

interface HeaderProps {
  currentTab: 'faculty' | 'student';
  onSelectTab: (tab: 'faculty' | 'student') => void;
  currentUser: User;
  onOpenLogin: () => void;
  onOpenManual?: () => void;
  settings: SystemSettings;
  activeViolationsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  onOpenLogin,
  onOpenManual,
  settings,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);

  const copyStudentLink = () => {
    const origin = window.location.origin;
    const path = window.location.pathname.replace(/\/(faculty|student)\/?$/, '');
    const studentUrl = `${origin}${path}#/student`;
    navigator.clipboard.writeText(studentUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-orange-500 to-rose-600 flex items-center justify-center shadow-md shadow-orange-500/20 text-white font-black tracking-tight">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">
                  JavaLab<span className="text-orange-500">Pro</span>
                </span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  JDK 17
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block font-medium">BCB52003 - Object Oriented Programming Lab</p>
            </div>
          </div>

          {/* Role-Specific Portal Indicator & Navigation */}
          <div className="flex items-center gap-2">
            {currentTab === 'student' ? (
              /* Student Portal - Strictly shows Student Badge; Faculty controls hidden */
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700 shadow-xs">
                  <Terminal className="w-4 h-4 text-emerald-600" />
                  <span>JAVA LAB Workspace</span>
                </div>
                {currentUser.role === 'FACULTY' && (
                  <button
                    onClick={() => onSelectTab('faculty')}
                    className="text-xs text-indigo-700 hover:text-indigo-800 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 font-semibold transition flex items-center gap-1.5 shadow-xs"
                    title="Return to Faculty Portal"
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Return to Faculty</span>
                  </button>
                )}
              </div>
            ) : (
              /* Faculty Portal - Shows Faculty Badge and Student Link share */
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-700 shadow-xs">
                  <GraduationCap className="w-4 h-4 text-indigo-600" />
                  <span>Faculty Management Portal</span>
                </div>
                <button
                  onClick={() => onSelectTab('student')}
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold border border-slate-200 transition"
                  title="Preview what students see in their exam workspace"
                >
                  <Eye className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Preview Student IDE</span>
                </button>
                <button
                  onClick={copyStudentLink}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold border border-slate-200 transition"
                  title="Copy Student Exam URL (/#/student) to share with your students"
                >
                  {copiedLink ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Share2 className="w-3.5 h-3.5 text-amber-600" />
                  )}
                  <span>{copiedLink ? 'Copied Student Link!' : 'Share Student URL'}</span>
                </button>
              </div>
            )}
          </div>

          {/* User Status & Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onOpenLogin}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-left transition shadow-xs group"
              title="Manage user session"
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentUser.role === 'FACULTY'
                    ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                    : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                }`}
              >
                {currentUser.role === 'FACULTY' ? 'F' : 'S'}
              </div>
              <div className="hidden md:block">
                <div className="text-xs font-semibold text-slate-800 group-hover:text-slate-900 leading-tight">
                  {currentUser.name}
                </div>
                <div className="text-[10px] text-slate-500 flex items-center gap-1">
                  <span>{currentUser.role === 'FACULTY' ? 'Faculty' : currentUser.regNo || 'Student'}</span>
                </div>
              </div>
              <Users className="w-3.5 h-3.5 text-slate-400 ml-1 group-hover:text-slate-600" />
            </button>

            {onOpenManual && (
              <button
                onClick={onOpenManual}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold transition shadow-xs"
                title={
                  currentTab === 'faculty'
                    ? 'Open Faculty Examination & Administration Manual'
                    : 'Open Student Examination & Practical Record Manual'
                }
              >
                <BookOpen
                  className={`w-3.5 h-3.5 ${
                    currentTab === 'faculty' ? 'text-indigo-600' : 'text-emerald-600'
                  }`}
                />
                <span className="hidden sm:inline">
                  {currentTab === 'faculty' ? 'Faculty Manual' : 'Student Manual'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
