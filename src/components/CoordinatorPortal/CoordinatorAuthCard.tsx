import React, { useState } from 'react';
import { User } from '../../types';
import { SheetService } from '../../services/sheetService';
import {
  ShieldCheck,
  KeyRound,
  Mail,
  Lock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Eye,
  EyeOff,
  UserCog,
} from 'lucide-react';

interface CoordinatorAuthCardProps {
  googleSheetsUrl: string;
  onLoginSuccess: (user: User) => void;
}

export const CoordinatorAuthCard: React.FC<CoordinatorAuthCardProps> = ({
  googleSheetsUrl,
  onLoginSuccess,
}) => {
  const [view, setView] = useState<'login' | 'forgot-email' | 'forgot-otp' | 'forgot-reset'>('login');

  // Login fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password + OTP fields
  const [resetEmail, setResetEmail] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const clearFeedback = () => {
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();

    if (!username.trim() || !password) {
      setErrorMsg('Please enter both username and password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await SheetService.coordinatorLogin(googleSheetsUrl, username.trim(), password);
      if (res.success && res.user) {
        setSuccessMsg('Signed in to Course Coordinator Portal.');
        setTimeout(() => {
          onLoginSuccess(res.user!);
        }, 400);
        return;
      }
      setErrorMsg(res.error || 'Access Denied: Invalid Coordinator credentials.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to verify Coordinator login.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();

    const cleanEmail = resetEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter a valid official email address.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await SheetService.coordinatorSendOtp(googleSheetsUrl, cleanEmail);
      if (res.success) {
        setSuccessMsg(res.message || `OTP sent to ${cleanEmail}. Check your inbox.`);
        setView('forgot-otp');
      } else {
        setErrorMsg(res.error || 'Could not send OTP to this email address.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to request OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();

    if (!otpInput.trim()) {
      setErrorMsg('Please enter the 6-digit OTP sent to your official email.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await SheetService.coordinatorVerifyOtp(googleSheetsUrl, resetEmail.trim(), otpInput.trim());
      if (res.success) {
        setSuccessMsg(res.message || 'OTP verified! Set your new password below.');
        setView('forgot-reset');
      } else {
        setErrorMsg(res.error || 'Invalid or expired OTP.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to verify OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();

    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirmation password do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await SheetService.coordinatorResetPassword(
        googleSheetsUrl,
        resetEmail.trim(),
        otpInput.trim(),
        newPassword
      );
      if (res.success) {
        setPassword('');
        setOtpInput('');
        setNewPassword('');
        setConfirmPassword('');
        setView('login');
        setSuccessMsg(res.message || 'Password updated successfully! Please sign in with your new password.');
      } else {
        setErrorMsg(res.error || 'Failed to reset password.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[65vh] flex items-center justify-center py-8 px-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden text-slate-900">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <UserCog className="w-5 h-5 text-violet-600" />
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                {view === 'login' ? 'Course Coordinator Sign In' : 'Reset Coordinator Password'}
              </h3>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md border bg-violet-50 text-violet-700 border-violet-200">
                Coordinator Portal
              </span>
            </div>
          </div>
          {view !== 'login' && (
            <button
              type="button"
              onClick={() => {
                clearFeedback();
                setView('login');
              }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-100 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </button>
          )}
        </div>

        <div className="p-6 space-y-4">
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

          {/* VIEW 1: LOGIN */}
          {view === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      clearFeedback();
                      setView('forgot-email');
                    }}
                    className="text-xs font-semibold text-violet-600 hover:text-violet-700 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full bg-white border border-slate-300 rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Sign In to Coordinator Portal</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* VIEW 2: FORGOT PASSWORD - STEP 1 (OFFICIAL EMAIL -> SEND OTP) */}
          {view === 'forgot-email' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="text-xs text-slate-600 bg-violet-50/70 border border-violet-200 rounded-xl p-3">
                Enter your official email ID to receive a 6-digit One-Time Password (OTP) to reset your password.
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Official Email ID</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Enter your official email ID"
                    className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending OTP...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    <span>Send OTP to Official Email</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* VIEW 3: FORGOT PASSWORD - STEP 2 (VERIFY OTP) */}
          {view === 'forgot-otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-xs text-slate-600 bg-violet-50/70 border border-violet-200 rounded-xl p-3">
                Enter the 6-digit OTP sent to <span className="font-semibold text-slate-900">{resetEmail}</span>.
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">6-Digit OTP</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit OTP"
                    className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-sm font-mono tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isLoading}
                  className="text-xs font-semibold text-violet-600 hover:underline disabled:opacity-50"
                >
                  Resend OTP
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearFeedback();
                    setView('forgot-email');
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Change Email
                </button>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying OTP...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify OTP</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* VIEW 4: FORGOT PASSWORD - STEP 3 (SET NEW PASSWORD AFTER OTP VERIFICATION) */}
          {view === 'forgot-reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Confirm New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save New Password</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
