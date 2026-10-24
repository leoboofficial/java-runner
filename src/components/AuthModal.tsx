import React, { useState } from 'react';
import { User, FacultyRecord, StudentRecord } from '../types';
import { SheetService } from '../services/sheetService';
import {
  X,
  ShieldCheck,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Edit3,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onLogin: (user: User) => void;
  facultyList?: FacultyRecord[];
  studentsList?: StudentRecord[];
  googleSheetsUrl?: string;
  portalRole?: 'faculty' | 'student';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogin,
  facultyList = [],
  studentsList = [],
  googleSheetsUrl,
  portalRole,
}) => {
  const isFacultyPortal = portalRole === 'faculty' || (!portalRole && currentUser.role === 'FACULTY');

  const [activeMode, setActiveMode] = useState<'verify' | 'manual'>('verify');
  const [emailInput, setEmailInput] = useState(currentUser.email || '');
  const [regNoInput, setRegNoInput] = useState(currentUser.regNo || '');
  const [nameInput, setNameInput] = useState(currentUser.name || '');
  const [roleInput, setRoleInput] = useState<'FACULTY' | 'STUDENT'>(
    isFacultyPortal ? 'FACULTY' : currentUser.role === 'FACULTY' ? 'FACULTY' : 'STUDENT'
  );
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Re-synchronize when opened or user/mode changes
  React.useEffect(() => {
    if (isOpen) {
      setEmailInput(currentUser.email || '');
      setRegNoInput(currentUser.regNo || '');
      setNameInput(currentUser.name || '');
      setRoleInput(isFacultyPortal ? 'FACULTY' : currentUser.role === 'FACULTY' ? 'FACULTY' : 'STUDENT');
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, currentUser, isFacultyPortal]);

  if (!isOpen) return null;

  const handleVerifyWithSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    const cleanEmail = emailInput.trim().toLowerCase();
    const cleanRegNo = isFacultyPortal ? '' : regNoInput.trim().toUpperCase();

    if (!cleanEmail) {
      setErrorMsg(
        isFacultyPortal
          ? 'Please enter your faculty email address.'
          : 'Please enter your university email address.'
      );
      return;
    }

    setIsVerifying(true);
    try {
      // 1. If Google Sheets Web URL is configured in .env, make a live API call
      if (googleSheetsUrl && googleSheetsUrl.startsWith('http')) {
        const result = await SheetService.login(cleanEmail, cleanRegNo, googleSheetsUrl);
        if (result && result.success && result.user) {
          const verifiedUser: User = {
            role: isFacultyPortal ? 'FACULTY' : result.user.role === 'FACULTY' ? 'FACULTY' : 'STUDENT',
            email: result.user.email,
            name: result.user.name,
            regNo: isFacultyPortal ? undefined : result.user.regNo,
            department: result.user.department || 'Department of Computer Applications',
          };
          setSuccessMsg(
            `Authenticated successfully via Google Sheets! Logged in as ${verifiedUser.name} (${verifiedUser.role}).`
          );
          setTimeout(() => {
            onLogin(verifiedUser);
            onClose();
          }, 800);
          return;
        } else {
          setErrorMsg(
            result?.error ||
              (isFacultyPortal
                ? `No match found in Google Sheet for "${cleanEmail}". Make sure this email exists in the "Faculty" tab.`
                : `No match found in Google Sheet for "${cleanEmail}". Make sure this email exists in either the "Faculty" or "Students" tab with proper credentials.`)
          );
          setIsVerifying(false);
          return;
        }
      }

      // 2. Local fallback if sheets URL not configured
      const facMatch = facultyList.find((f) => f.email.trim().toLowerCase() === cleanEmail);
      if (facMatch) {
        const verifiedUser: User = {
          role: 'FACULTY',
          email: facMatch.email,
          name: facMatch.name,
          department: facMatch.department,
        };
        setSuccessMsg(`Welcome Faculty Admin: ${verifiedUser.name}!`);
        setTimeout(() => {
          onLogin(verifiedUser);
          onClose();
        }, 800);
        return;
      }

      if (!isFacultyPortal) {
        const stuMatch = studentsList.find(
          (s) =>
            s.email.trim().toLowerCase() === cleanEmail ||
            (cleanRegNo && s.regNo.trim().toUpperCase() === cleanRegNo)
        );

        if (stuMatch) {
          const verifiedUser: User = {
            role: 'STUDENT',
            email: stuMatch.email,
            name: stuMatch.name,
            regNo: stuMatch.regNo,
            department: stuMatch.department,
          };
          setSuccessMsg(`Welcome Student: ${verifiedUser.name} (${verifiedUser.regNo})!`);
          setTimeout(() => {
            onLogin(verifiedUser);
            onClose();
          }, 800);
          return;
        }
      }

      // If not in local pre-defined list, let user edit profile in tab 2
      setErrorMsg(
        isFacultyPortal
          ? `Could not verify faculty email "${cleanEmail}". Use the "Edit Profile Directly" tab to update your faculty profile.`
          : `Could not verify "${cleanEmail}". Use the "Edit Profile Directly" tab to update your student or faculty profile.`
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred while verifying with Google Sheets.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleManualSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      setErrorMsg('Full name is required.');
      return;
    }
    if (!emailInput.trim()) {
      setErrorMsg('Email address is required.');
      return;
    }

    const newUser: User = {
      role: isFacultyPortal ? 'FACULTY' : roleInput,
      name: nameInput.trim(),
      email: emailInput.trim().toLowerCase(),
      regNo: isFacultyPortal
        ? undefined
        : roleInput === 'STUDENT'
        ? regNoInput.trim().toUpperCase() || ''
        : undefined,
      department: currentUser.department || 'Department of Computer Applications',
    };

    onLogin(newUser);
    setSuccessMsg('Profile updated and applied successfully!');
    setTimeout(() => {
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-900">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <UserCheck className={`w-5 h-5 ${isFacultyPortal ? 'text-indigo-600' : 'text-emerald-600'}`} />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">User Authentication & Profile</h3>
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md border ${
                    isFacultyPortal
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  {isFacultyPortal ? 'Faculty Portal' : 'Student Portal'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 bg-slate-50/50 px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveMode('verify');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition ${
              activeMode === 'verify'
                ? isFacultyPortal
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Verify Details</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveMode('manual');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition ${
              activeMode === 'manual'
                ? isFacultyPortal
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit Profile Directly</span>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Status Messages */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1">{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <div className="flex-1 font-medium">{successMsg}</div>
            </div>
          )}

          {activeMode === 'verify' ? (
            <div className="space-y-4">
              <form onSubmit={handleVerifyWithSheet} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    {isFacultyPortal ? 'Faculty Email Address' : 'University Email Address'}
                  </label>
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder={
                      isFacultyPortal
                        ? 'e.g. yourname@hindustanuniv.ac.in'
                        : 'Faculty: @hindustanuniv.ac.in | Student: @student.hindustanuniv.ac.in'
                    }
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Registration Number - ONLY shown on Student side */}
                {!isFacultyPortal && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Registration Number <span className="text-slate-500 font-normal">(Required for Students)</span>
                    </label>
                    <input
                      type="text"
                      value={regNoInput}
                      onChange={(e) => setRegNoInput(e.target.value)}
                      placeholder="e.g. 21BCE0450 (leave blank for Faculty)"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isVerifying}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold text-white shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 ${
                    isFacultyPortal ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Details...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>{isFacultyPortal ? 'Verify Faculty Access' : 'Verify Details'}</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <form onSubmit={handleManualSave} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Your Full Name</label>
                <input
                  type="text"
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder={isFacultyPortal ? 'e.g. Dr. Sathish Kumar M' : 'e.g. Student Name'}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  {isFacultyPortal ? 'Your Faculty Email Address' : 'Your Email Address'}
                </label>
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder={
                    isFacultyPortal
                      ? 'faculty@hindustanuniv.ac.in'
                      : 'student@student.hindustanuniv.ac.in or faculty@hindustanuniv.ac.in'
                  }
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Role & Registration Number - ONLY shown on Student side */}
              {!isFacultyPortal && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Role</label>
                    <select
                      value={roleInput}
                      onChange={(e) => setRoleInput(e.target.value as 'FACULTY' | 'STUDENT')}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="STUDENT">Student</option>
                      <option value="FACULTY">Faculty</option>
                    </select>
                  </div>

                  {roleInput === 'STUDENT' && (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Registration Number</label>
                      <input
                        type="text"
                        value={regNoInput}
                        onChange={(e) => setRegNoInput(e.target.value)}
                        placeholder="e.g. 21BCE0450"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                className={`w-full py-2.5 rounded-xl text-sm font-semibold text-white shadow-md transition flex items-center justify-center gap-2 mt-4 ${
                  isFacultyPortal ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save & Apply Profile</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
