import React, { useState } from 'react';
import { User, FacultyRecord, StudentRecord } from '../types';
import { SheetService } from '../services/sheetService';
import {
  getOrCreateDeviceId,
  getSavedPersonalEmail,
  recordSessionOnDevice,
} from '../utils/deviceAudit';
import { fetchDeviceGoogleEmail, isGoogleAuthConfigured } from '../utils/googleAuth';
import {
  X,
  ShieldCheck,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  Loader2,
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
  inline?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogin,
  googleSheetsUrl,
  portalRole,
  inline = false,
}) => {
  const isFacultyPortal = portalRole === 'faculty' || (!portalRole && currentUser.role === 'FACULTY');

  const [emailInput, setEmailInput] = useState(currentUser.verifiedViaSheet ? currentUser.email : '');
  const [regNoInput, setRegNoInput] = useState(currentUser.verifiedViaSheet ? currentUser.regNo || '' : '');
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const deviceId = React.useMemo(() => getOrCreateDeviceId(), []);

  React.useEffect(() => {
    if (isOpen || inline) {
      setEmailInput(currentUser.verifiedViaSheet ? currentUser.email || '' : '');
      setRegNoInput(currentUser.verifiedViaSheet ? currentUser.regNo || '' : '');
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, inline, currentUser, isFacultyPortal]);

  if (!isOpen && !inline) return null;

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
          : 'Please enter your official university email address.'
      );
      return;
    }

    if (!isFacultyPortal && !cleanRegNo) {
      setErrorMsg('Please enter your registration number.');
      return;
    }

    if (!googleSheetsUrl || !googleSheetsUrl.startsWith('http')) {
      setErrorMsg(
        'Google Apps Script URL (VITE_APPS_SCRIPT_URL) is not configured. Configure it in .env or GitHub Actions Variables.'
      );
      return;
    }

    setIsVerifying(true);
    try {
      const isSameStudentReverifying =
        (currentUser.email || '').trim().toLowerCase() === cleanEmail &&
        Boolean(currentUser.personalEmail);
      let capturedDeviceMail = isFacultyPortal
        ? ''
        : isSameStudentReverifying
        ? (currentUser.personalEmail || '').trim().toLowerCase()
        : '';

      if (!isFacultyPortal && !capturedDeviceMail && isGoogleAuthConfigured()) {
        capturedDeviceMail = await fetchDeviceGoogleEmail();
      } else if (!isFacultyPortal && !capturedDeviceMail) {
        capturedDeviceMail = (getSavedPersonalEmail() || '').trim().toLowerCase();
      }

      const result = await SheetService.login(
        cleanEmail,
        cleanRegNo,
        googleSheetsUrl,
        capturedDeviceMail,
        deviceId,
        isFacultyPortal ? 'FACULTY' : 'STUDENT'
      );

      if (result && result.success && result.user) {
        const verifiedRole = result.user.role === 'FACULTY' ? 'FACULTY' : 'STUDENT';
        const verifiedRegNo = verifiedRole === 'STUDENT' ? result.user.regNo : undefined;

        let combinedAlert = result.user.multiStudentAlert || '';
        if (verifiedRole === 'STUDENT' && verifiedRegNo) {
          const devAudit = recordSessionOnDevice(verifiedRegNo, capturedDeviceMail);
          if (!combinedAlert && devAudit.otherRegNosOnDevice.length > 0) {
            combinedAlert = `FLAGGED: Shared Device (${devAudit.deviceId}) also used for RegNo(s): ${devAudit.otherRegNosOnDevice.join(', ')}`;
          }
        }

        const verifiedUser: User = {
          role: verifiedRole,
          email: result.user.email,
          personalEmail: verifiedRole === 'STUDENT' ? (result.user.personalEmail || capturedDeviceMail) : undefined,
          deviceId: verifiedRole === 'STUDENT' ? deviceId : undefined,
          multiStudentAlert: verifiedRole === 'STUDENT' ? combinedAlert : undefined,
          name: result.user.name,
          regNo: verifiedRegNo,
          department: result.user.department || 'Department of Computer Applications',
          verifiedViaSheet: true,
        };

        setSuccessMsg(
          `Signed in as ${verifiedUser.name} (${verifiedUser.role}).`
        );
        setTimeout(() => {
          onLogin(verifiedUser);
          if (!inline) onClose();
        }, 500);
        return;
      }

      setErrorMsg(
        result?.error ||
          (isFacultyPortal
            ? `Access Denied: "${cleanEmail}" was not found in the Faculty Google Sheet tab.`
            : `Access Denied: "${cleanEmail}" and "${cleanRegNo}" did not match any record in the Students Google Sheet tab.`)
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred while verifying with Google Sheets.');
    } finally {
      setIsVerifying(false);
    }
  };

  const cardContent = (
    <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden text-slate-900">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
        <div className="flex items-center gap-2.5">
          <UserCheck className={`w-5 h-5 ${isFacultyPortal ? 'text-indigo-600' : 'text-emerald-600'}`} />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                {isFacultyPortal ? 'Faculty Authentication' : 'Student Authentication'}
              </h3>
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
        {!inline && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="p-6 space-y-4">
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

        <form onSubmit={handleVerifyWithSheet} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              {isFacultyPortal ? 'Faculty Email Address' : 'Official University Email Address'}
            </label>
            <input
              type="email"
              required
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder={
                isFacultyPortal
                  ? 'Enter authorized faculty email (@hindustanuniv.ac.in)'
                  : 'Enter university student email (@student.hindustanuniv.ac.in)'
              }
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {!isFacultyPortal && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Registration Number
              </label>
              <input
                type="text"
                required
                value={regNoInput}
                onChange={(e) => setRegNoInput(e.target.value)}
                placeholder="Enter your university registration number"
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
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>{isFacultyPortal ? 'Verify Faculty Access' : 'Verify Student Access'}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );

  if (inline) {
    return (
      <div className="min-h-[65vh] flex items-center justify-center py-8 px-4">
        {cardContent}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      {cardContent}
    </div>
  );
};
