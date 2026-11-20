import React, { useState } from 'react';
import { FacultyRecord, User } from '../../types';
import { SheetService } from '../../services/sheetService';
import {
  UserPlus,
  Edit3,
  RefreshCw,
  Search,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Users,
  Mail,
  Building2,
  X,
  Lock,
  Loader2,
  ShieldAlert,
} from 'lucide-react';

interface CoordinatorDashboardProps {
  currentUser: User;
  facultyList: FacultyRecord[];
  googleSheetsUrl: string;
  onSaveFaculty: (handler: FacultyRecord, originalEmail?: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  onRefreshFaculty: () => Promise<void>;
  onUpdateCoordinatorUser: (updated: User) => void;
}

export const CoordinatorDashboard: React.FC<CoordinatorDashboardProps> = ({
  currentUser,
  facultyList,
  googleSheetsUrl,
  onSaveFaculty,
  onRefreshFaculty,
  onUpdateCoordinatorUser,
}) => {
  // Course Handler Add / Edit Form State
  const [editingOriginalEmail, setEditingOriginalEmail] = useState<string | null>(null);
  const [handlerEmail, setHandlerEmail] = useState('');
  const [handlerName, setHandlerName] = useState('');
  const [handlerDept, setHandlerDept] = useState('Department of Computer Applications');
  const [isSavingHandler, setIsSavingHandler] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formFeedback, setFormFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Change Password State (also opens automatically after first login with default Admin@123)
  const [showChangePassword, setShowChangePassword] = useState(Boolean(currentUser.mustChangePassword));
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [officialEmailInput, setOfficialEmailInput] = useState(
    currentUser.email && !currentUser.email.startsWith('coordinator@') ? currentUser.email : ''
  );
  const [isUpdatingPwd, setIsUpdatingPwd] = useState(false);
  const [pwdFeedback, setPwdFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleStartEdit = (teacher: FacultyRecord) => {
    setEditingOriginalEmail(teacher.email);
    setHandlerEmail(teacher.email);
    setHandlerName(teacher.name);
    setHandlerDept(teacher.department || 'Department of Computer Applications');
    setFormFeedback(null);
    setTimeout(() => {
      document.getElementById('coordinator-handler-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 40);
  };

  const handleCancelEdit = () => {
    setEditingOriginalEmail(null);
    setHandlerEmail('');
    setHandlerName('');
    setHandlerDept('Department of Computer Applications');
    setFormFeedback(null);
  };

  const handleSubmitHandler = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormFeedback(null);

    const cleanEmail = handlerEmail.trim().toLowerCase();
    const cleanName = handlerName.trim();
    const cleanDept = handlerDept.trim();

    if (!cleanEmail || !cleanName || !cleanDept) {
      setFormFeedback({ type: 'error', text: 'Email, Name, and Department are all required.' });
      return;
    }

    setIsSavingHandler(true);
    try {
      const res = await onSaveFaculty(
        { email: cleanEmail, name: cleanName, department: cleanDept },
        editingOriginalEmail || undefined
      );
      if (res.success) {
        setFormFeedback({
          type: 'success',
          text:
            res.message ||
            (editingOriginalEmail
              ? `Updated "${cleanName}" in the Faculty sheet.`
              : `Added "${cleanName}" to the Faculty sheet.`),
        });
        setEditingOriginalEmail(null);
        setHandlerEmail('');
        setHandlerName('');
        setHandlerDept('Department of Computer Applications');
      } else {
        setFormFeedback({ type: 'error', text: res.error || 'Could not save course handler to Google Sheet.' });
      }
    } catch (err: any) {
      setFormFeedback({ type: 'error', text: err.message || 'Error saving course handler.' });
    } finally {
      setIsSavingHandler(false);
    }
  };

  const handleSyncClick = async () => {
    setIsSyncing(true);
    try {
      await onRefreshFaculty();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdFeedback(null);

    if (!currentPwd || !newPwd) {
      setPwdFeedback({ type: 'error', text: 'Current password and new password are required.' });
      return;
    }
    if (newPwd.length < 6) {
      setPwdFeedback({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdFeedback({ type: 'error', text: 'New password and confirm password do not match.' });
      return;
    }

    setIsUpdatingPwd(true);
    try {
      const res = await SheetService.coordinatorChangePassword(
        googleSheetsUrl,
        currentPwd,
        newPwd,
        officialEmailInput.trim()
      );
      if (res.success) {
        setPwdFeedback({ type: 'success', text: res.message || 'Password updated successfully!' });
        setCurrentPwd('');
        setNewPwd('');
        setConfirmPwd('');
        onUpdateCoordinatorUser({
          ...currentUser,
          email: res.officialEmail || officialEmailInput.trim() || currentUser.email,
          mustChangePassword: false,
        });
        setTimeout(() => {
          setShowChangePassword(false);
          setPwdFeedback(null);
        }, 1200);
      } else {
        setPwdFeedback({ type: 'error', text: res.error || 'Could not update password.' });
      }
    } catch (err: any) {
      setPwdFeedback({ type: 'error', text: err.message || 'Failed to update password.' });
    } finally {
      setIsUpdatingPwd(false);
    }
  };

  const filteredHandlers = facultyList.filter((f) => {
    const q = searchTerm.toLowerCase();
    return (
      f.name.toLowerCase().includes(q) ||
      f.email.toLowerCase().includes(q) ||
      f.department.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Coordinator Hero Banner */}
      <div className="bg-gradient-to-r from-violet-50/90 via-white to-slate-50 border border-violet-200/80 p-6 rounded-2xl shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800 border border-violet-200">
                Course Coordinator Portal
              </span>
              {currentUser.email && (
                <span className="text-xs font-mono text-slate-500">{currentUser.email}</span>
              )}
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Course Handlers Directory Management
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Add authorized course teachers or edit existing handler details directly in the connected Google Sheet.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                setPwdFeedback(null);
                setShowChangePassword((v) => !v);
              }}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-violet-50 text-violet-700 text-xs font-bold flex items-center gap-1.5 border border-violet-200 transition shadow-xs"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Change Password</span>
            </button>

            <button
              onClick={handleSyncClick}
              disabled={isSyncing}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-violet-300 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sync from Sheet</span>
            </button>

            <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-right shadow-xs">
              <div className="text-[11px] text-slate-500">Course Handlers</div>
              <div className="text-lg font-black text-violet-700">{facultyList.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* First-login Default Password Security Prompt or Change Password Panel */}
      {(currentUser.mustChangePassword || showChangePassword) && (
        <div className="bg-white border-2 border-amber-300 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-sm font-black text-slate-900">
                  {currentUser.mustChangePassword
                    ? 'Change Default Password (First-Time Login)'
                    : 'Update Coordinator Password & Official Email'}
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Set a new password and register your official email ID for Forgot Password OTP recovery.
                </p>
              </div>
            </div>
            {!currentUser.mustChangePassword && (
              <button
                onClick={() => setShowChangePassword(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {pwdFeedback && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                pwdFeedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}
            >
              {pwdFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{pwdFeedback.text}</span>
            </div>
          )}

          <form onSubmit={handleChangePasswordSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Current Password</label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  placeholder="Current password"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Official Email ID (for OTP)</label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={officialEmailInput}
                  onChange={(e) => setOfficialEmailInput(e.target.value)}
                  placeholder="coordinator@hindustanuniv.ac.in"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">New Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Confirm New Password</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <button
                  type="submit"
                  disabled={isUpdatingPwd}
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shrink-0 flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {isUpdatingPwd ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Save</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Add / Edit Course Handler Form */}
      <div
        id="coordinator-handler-form"
        className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4"
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            {editingOriginalEmail ? (
              <Edit3 className="w-5 h-5 text-amber-600" />
            ) : (
              <UserPlus className="w-5 h-5 text-violet-600" />
            )}
            <div>
              <h2 className="text-sm font-black text-slate-900">
                {editingOriginalEmail
                  ? `Edit Course Teacher (${editingOriginalEmail})`
                  : 'Add New Course Handler'}
              </h2>
              <p className="text-[11px] text-slate-500">
                Saves Email, Name, and Department directly to the <code className="font-mono">Faculty</code> tab in the Google Sheet.
              </p>
            </div>
          </div>

          {editingOriginalEmail && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel Edit</span>
            </button>
          )}
        </div>

        {formFeedback && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
              formFeedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
          >
            {formFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{formFeedback.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmitHandler} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={handlerEmail}
                onChange={(e) => setHandlerEmail(e.target.value)}
                placeholder="teacher@hindustanuniv.ac.in"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Name</label>
            <input
              type="text"
              required
              value={handlerName}
              onChange={(e) => setHandlerName(e.target.value)}
              placeholder="e.g. Dr. Sathish Kumar M"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Department</label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={handlerDept}
                onChange={(e) => setHandlerDept(e.target.value)}
                placeholder="Department of Computer Applications"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSavingHandler}
            className={`py-2 px-4 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-xs transition disabled:opacity-50 ${
              editingOriginalEmail
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-violet-600 hover:bg-violet-700'
            }`}
          >
            {isSavingHandler ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : editingOriginalEmail ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Add Course Handler</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Existing Course Handlers List */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-600" />
            <h3 className="text-sm font-black text-slate-900">
              Existing Course Teachers ({facultyList.length})
            </h3>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2" />
            <input
              type="text"
              placeholder="Search by email, name, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[11px] border-b border-slate-200 tracking-wider">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {filteredHandlers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    {facultyList.length === 0
                      ? 'No course teachers added yet. Add a course handler above.'
                      : 'No course teachers match your search.'}
                  </td>
                </tr>
              ) : (
                filteredHandlers.map((teacher) => {
                  const isEditingThis =
                    editingOriginalEmail?.toLowerCase() === teacher.email.toLowerCase();
                  return (
                    <tr
                      key={teacher.email}
                      className={`transition ${
                        isEditingThis ? 'bg-amber-50/70' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="px-4 py-3 font-mono text-slate-900">{teacher.email}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{teacher.name}</td>
                      <td className="px-4 py-3 text-slate-600">{teacher.department}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleStartEdit(teacher)}
                          className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs inline-flex items-center gap-1 shadow-2xs transition"
                          title={`Edit ${teacher.name}`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit User</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
