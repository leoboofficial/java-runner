import React, { useState } from 'react';
import {
  StudentLabRecordSubmission,
  Exercise,
  Submission,
  Violation,
  StudentRecord,
  User,
  LoginAuditRecord,
} from '../../types';
import {
  Award,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Mail,
  ShieldAlert,
  ShieldCheck,
  Download,
  RefreshCw,
  Sparkles,
  Printer,
  Laptop,
  Check,
} from 'lucide-react';
import { RubricEvaluationModal } from './RubricEvaluationModal';
import { LabRecordModal } from '../StudentPortal/LabRecordModal';

interface LabRecordEvaluationsProps {
  evaluations: StudentLabRecordSubmission[];
  exercises: Exercise[];
  submissions: Submission[];
  violations: Violation[];
  students: StudentRecord[];
  loginAudit?: LoginAuditRecord[];
  currentUser: User;
  onSaveEvaluation: (evaluation: StudentLabRecordSubmission) => void;
  onAutoEvaluateAll: () => void;
  onRefreshFromSheet?: () => void;
}

export const LabRecordEvaluations: React.FC<LabRecordEvaluationsProps> = ({
  evaluations,
  exercises,
  submissions,
  violations,
  students,
  loginAudit = [],
  currentUser,
  onSaveEvaluation,
  onAutoEvaluateAll,
  onRefreshFromSheet,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'SUSPICIOUS'>('ALL');
  const [selectedForEval, setSelectedForEval] = useState<StudentLabRecordSubmission | null>(null);
  const [previewStudent, setPreviewStudent] = useState<User | null>(null);

  // Build unified list of students who submitted or who are in the roster
  const unifiedRecords: StudentLabRecordSubmission[] = React.useMemo(() => {
    const mailToRegs = new Map<string, Set<string>>();
    const devToRegs = new Map<string, Set<string>>();
    const latestAuditByReg = new Map<string, LoginAuditRecord>();

    const registerIdentity = (reg: string, mail?: string, dev?: string) => {
      const cleanReg = (reg || '').trim().toUpperCase();
      if (!cleanReg) return;
      const cleanMail = (mail || '').trim().toLowerCase();
      const cleanDev = (dev || '').trim();
      if (cleanMail) {
        if (!mailToRegs.has(cleanMail)) mailToRegs.set(cleanMail, new Set());
        mailToRegs.get(cleanMail)!.add(cleanReg);
      }
      if (cleanDev && cleanDev !== 'UNKNOWN') {
        if (!devToRegs.has(cleanDev)) devToRegs.set(cleanDev, new Set());
        devToRegs.get(cleanDev)!.add(cleanReg);
      }
    };

    loginAudit.forEach((a) => {
      const reg = (a.regNo || '').trim().toUpperCase();
      if (reg && !latestAuditByReg.has(reg)) {
        latestAuditByReg.set(reg, a);
      }
      registerIdentity(reg, a.personalEmail, a.deviceId);
    });

    submissions.forEach((s) => registerIdentity(s.regNo, s.personalEmail, s.deviceId));
    evaluations.forEach((e) => registerIdentity(e.regNo, e.personalEmail || e.loggedGmail, e.deviceId));

    const buildProxyAlert = (reg: string, mail?: string, dev?: string, existing?: string): string => {
      const cleanReg = (reg || '').trim().toUpperCase();
      const cleanMail = (mail || '').trim().toLowerCase();
      const cleanDev = (dev || '').trim();
      const sharedRegs = new Set<string>();

      if (cleanMail && mailToRegs.has(cleanMail)) {
        mailToRegs.get(cleanMail)!.forEach((r) => {
          if (r !== cleanReg) sharedRegs.add(r);
        });
      }
      if (cleanDev && devToRegs.has(cleanDev)) {
        devToRegs.get(cleanDev)!.forEach((r) => {
          if (r !== cleanReg) sharedRegs.add(r);
        });
      }

      if (sharedRegs.size > 0) {
        return `FLAGGED: Shared Mail ID / Device also used for RegNo(s): ${Array.from(sharedRegs).join(', ')}`;
      }
      return existing && existing !== 'CLEAR' ? existing : '';
    };

    const list: StudentLabRecordSubmission[] = [];
    const processedRegs = new Set<string>();

    // 1. First add all explicit evaluation records (students who submitted their Lab Record)
    evaluations.forEach((ev) => {
      const reg = ev.regNo.trim().toUpperCase();
      processedRegs.add(reg);
      const rosterStu = students.find((s) => s.regNo.trim().toUpperCase() === reg);
      const audit = latestAuditByReg.get(reg);
      const recordedMail = (ev.personalEmail || ev.loggedGmail || audit?.personalEmail || '').trim().toLowerCase();
      const devId = ev.deviceId || audit?.deviceId || '';
      const proxyAlert = buildProxyAlert(reg, recordedMail, devId, ev.multiStudentAlert);

      const isMismatch = Boolean(
        rosterStu &&
        ev.studentEmail &&
        rosterStu.email.trim().toLowerCase() !== ev.studentEmail.trim().toLowerCase() &&
        !rosterStu.email.toLowerCase().includes(ev.studentEmail.split('@')[0].toLowerCase())
      );

      list.push({
        ...ev,
        personalEmail: recordedMail,
        deviceId: devId,
        multiStudentAlert: proxyAlert,
        isGmailSuspicious: Boolean(isMismatch || proxyAlert),
      });
    });

    // 2. Also populate any student from code submissions who haven't submitted a Lab Record yet
    submissions.forEach((sub) => {
      const reg = sub.regNo.trim().toUpperCase();
      if (!processedRegs.has(reg)) {
        processedRegs.add(reg);
        const stuViolations = violations.filter((v) => v.regNo.trim().toUpperCase() === reg);
        const rosterStu = students.find((s) => s.regNo.trim().toUpperCase() === reg);
        const audit = latestAuditByReg.get(reg);
        const recordedMail = (sub.personalEmail || audit?.personalEmail || '').trim().toLowerCase();
        const devId = sub.deviceId || audit?.deviceId || '';
        const proxyAlert = buildProxyAlert(reg, recordedMail, devId, sub.multiStudentAlert);

        const isMismatch = Boolean(
          rosterStu &&
          sub.studentEmail &&
          rosterStu.email.trim().toLowerCase() !== sub.studentEmail.trim().toLowerCase() &&
          !rosterStu.email.toLowerCase().includes(sub.studentEmail.split('@')[0].toLowerCase())
        );

        list.push({
          id: `REC_AUTO_${reg}`,
          timestamp: sub.timestamp,
          studentEmail: sub.studentEmail,
          personalEmail: recordedMail,
          deviceId: devId,
          multiStudentAlert: proxyAlert,
          regNo: reg,
          studentName: sub.studentName || rosterStu?.name || `Student ${reg}`,
          completedExercisesCount: exercises.filter((ex) =>
            submissions.some((s) => s.regNo.trim().toUpperCase() === reg && s.exerciseId === ex.id && s.score === 100)
          ).length,
          totalExercisesCount: exercises.length,
          antiCheatingViolationsCount: stuViolations.length,
          status: 'PENDING_EVALUATION',
          isVerifiedAndApproved: false,
          isGmailSuspicious: Boolean(isMismatch || proxyAlert),
        });
      }
    });

    return list;
  }, [evaluations, submissions, violations, students, exercises, loginAudit]);

  // Filtered list
  const filtered = unifiedRecords.filter((rec) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      rec.studentName.toLowerCase().includes(term) ||
      rec.regNo.toLowerCase().includes(term) ||
      rec.studentEmail.toLowerCase().includes(term) ||
      (rec.personalEmail && rec.personalEmail.toLowerCase().includes(term)) ||
      (rec.deviceId && rec.deviceId.toLowerCase().includes(term));

    if (!matchesSearch) return false;

    if (statusFilter === 'PENDING') return rec.status === 'PENDING_EVALUATION' || !rec.isVerifiedAndApproved;
    if (statusFilter === 'APPROVED') return rec.isVerifiedAndApproved;
    if (statusFilter === 'SUSPICIOUS') return rec.isGmailSuspicious || Boolean(rec.multiStudentAlert) || rec.antiCheatingViolationsCount > 0;
    return true;
  });

  // KPI Calculations
  const totalSubmissions = unifiedRecords.length;
  const approvedCount = unifiedRecords.filter((r) => r.isVerifiedAndApproved).length;
  const pendingCount = totalSubmissions - approvedCount;
  const suspiciousGmailCount = unifiedRecords.filter((r) => r.isGmailSuspicious || Boolean(r.multiStudentAlert)).length;

  const avgScore =
    approvedCount > 0
      ? (
          unifiedRecords
            .filter((r) => r.isVerifiedAndApproved && r.rubrics)
            .reduce((sum, r) => sum + (r.rubrics?.total || 0), 0) / approvedCount
        ).toFixed(1)
      : '0.0';

  const handleAutoEvaluateSingle = (item: StudentLabRecordSubmission) => {
    const cleanReg = item.regNo.trim().toUpperCase();
    const stuSubmissions = submissions.filter((s) => s.regNo.trim().toUpperCase() === cleanReg);
    const stuViolations = violations.filter((v) => v.regNo.trim().toUpperCase() === cleanReg);
    const passedCount = new Set(
      stuSubmissions.filter((s) => s.score === 100).map((s) => s.exerciseId)
    ).size;
    const totalEx = Math.max(1, exercises.length);
    const allPassed = passedCount >= exercises.length && exercises.length > 0;

    let concept = allPassed ? 5 : Math.min(5, Math.max(2, Math.round((passedCount / totalEx) * 5)));
    const naming = passedCount > 0 || !item.id.startsWith('REC_AUTO_') ? 1 : 0.5;
    const doc = passedCount > 0 || !item.id.startsWith('REC_AUTO_') ? 1 : 0.5;
    const output = allPassed ? 3 : Math.min(3, Math.max(1, Math.round((passedCount / totalEx) * 3)));

    if (stuViolations.some((v) => v.severity === 'high')) {
      concept = Math.max(1, concept - 1);
    }
    const total = Number((concept + naming + doc + output).toFixed(1));

    const rosterStu = students.find((s) => s.regNo.trim().toUpperCase() === cleanReg);
    const rubricData = {
      conceptImplemented: concept,
      namingConventions: naming,
      documentation: doc,
      output: output,
      total: total,
      totalMarks: total,
    };

    onSaveEvaluation({
      ...item,
      id: item.id.startsWith('REC_AUTO_') ? `eval_${Date.now()}_${cleanReg}` : item.id,
      timestamp: new Date().toISOString(),
      regNo: cleanReg,
      department: item.department || rosterStu?.department || 'Department of Computer Applications',
      submissionDate: item.submissionDate || new Date().toISOString().split('T')[0],
      completedExercisesCount: passedCount,
      totalExercisesCount: exercises.length,
      antiCheatingViolationsCount: stuViolations.length,
      violationsCount: stuViolations.length,
      status: 'EVALUATED_APPROVED',
      isVerifiedAndApproved: true,
      rubric: rubricData,
      rubrics: rubricData,
      facultyRemarks:
        item.facultyRemarks && !item.facultyRemarks.includes('Awaiting faculty')
          ? item.facultyRemarks
          : 'Auto-evaluated on criteria: Concept (5), Naming (1), Doc (1), Output (3). Approved for final PDF download & print.',
      evaluatedBy: currentUser.name || 'Faculty Evaluator',
      evaluatedAt: new Date().toISOString(),
    });
  };

  // Export Marksheet CSV
  const handleExportCSV = () => {
    const headers = [
      'Registration Number',
      'Student Name',
      'Official University Email',
      'Recorded Personal Mail ID',
      'Device ID',
      'Multi-Student Proxy Alert',
      'Roster Registered Email',
      'Identity Status',
      'Status',
      'Concept Implemented (5)',
      'Naming Conventions (1)',
      'Documentation (1)',
      'Output (3)',
      'Total Marks (10)',
      'Anti-Cheating Violations Count',
      'Faculty Remarks',
      'Evaluated By',
      'Evaluated At',
    ];

    const rows = unifiedRecords.map((r) => {
      const rosterStu = students.find((s) => s.regNo.trim().toUpperCase() === r.regNo.trim().toUpperCase());
      return [
        `"${r.regNo}"`,
        `"${r.studentName}"`,
        `"${r.studentEmail}"`,
        `"${r.personalEmail || r.loggedGmail || ''}"`,
        `"${r.deviceId || ''}"`,
        `"${(r.multiStudentAlert || 'CLEAR').replace(/"/g, '""')}"`,
        `"${rosterStu?.email || ''}"`,
        r.isGmailSuspicious ? '"FLAGGED_REVIEW"' : '"VERIFIED"',
        `"${r.status}"`,
        r.rubrics?.conceptImplemented ?? '',
        r.rubrics?.namingConventions ?? '',
        r.rubrics?.documentation ?? '',
        r.rubrics?.output ?? '',
        r.rubrics?.total ?? '',
        r.antiCheatingViolationsCount,
        `"${(r.facultyRemarks || '').replace(/"/g, '""')}"`,
        `"${r.evaluatedBy || ''}"`,
        `"${r.evaluatedAt || ''}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HITS_Lab_Record_Rubrics_Marksheet_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-50/90 via-white to-slate-50 border border-indigo-200/80 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Lab Record Rubric Evaluation & Anti-Cheating Portal
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 uppercase">
                  HITS 10-Mark Rubric
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluates: <strong>Concept (5)</strong> + <strong>Naming Conventions (1)</strong> + <strong>Documentation (1)</strong> + <strong>Output (3)</strong> &bull; Tracks Recorded Mail ID &amp; Device ID to flag multi-student proxy logins.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onRefreshFromSheet && (
              <button
                onClick={onRefreshFromSheet}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition shadow-xs"
                title="Pull latest evaluations and login audit from Google Sheet"
              >
                <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
                <span>Sync from Sheet</span>
              </button>
            )}

            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition shadow-xs"
              title="Download official marksheet with rubric breakdown & Mail ID proxy audit logs"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span>Export Marksheet (CSV)</span>
            </button>
          </div>
        </div>

        {/* 4 Summary Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] text-slate-500 font-semibold flex items-center justify-between">
              <span>Total Submissions</span>
              <Award className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">{totalSubmissions}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{pendingCount} awaiting evaluation</div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
            <div className="text-[11px] text-emerald-700 font-semibold flex items-center justify-between">
              <span>Verified & Approved</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-600 mt-1">{approvedCount}</div>
            <div className="text-[10px] text-emerald-700 mt-0.5">Unlocked for Final Print</div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-indigo-200 shadow-2xs">
            <div className="text-[11px] text-indigo-700 font-semibold flex items-center justify-between">
              <span>Class Average</span>
              <Award className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-indigo-700 mt-1">{avgScore} / 10</div>
            <div className="text-[10px] text-indigo-600 mt-0.5">HITS 10-Mark Rubric</div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-rose-200 shadow-2xs">
            <div className="text-[11px] text-rose-700 font-semibold flex items-center justify-between">
              <span>Proxy / Mail Alerts</span>
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-rose-600 mt-1">{suspiciousGmailCount}</div>
            <div className="text-[10px] text-rose-600 mt-0.5">Shared Mail ID or Device</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by student, reg no, Mail ID, or device ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto flex-wrap">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-500 font-medium mr-1">Filter:</span>
          {(['ALL', 'PENDING', 'APPROVED', 'SUSPICIOUS'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setStatusFilter(mode)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                statusFilter === mode
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {mode === 'ALL' && 'All Students'}
              {mode === 'PENDING' && `Pending (${pendingCount})`}
              {mode === 'APPROVED' && `Approved (${approvedCount})`}
              {mode === 'SUSPICIOUS' && `Proxy / Mail Alerts (${suspiciousGmailCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* Submitted Lab Records Section & Evaluations Table */}
      <div
        id="submitted-lab-records-section"
        className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs"
      >
        <div className="px-5 py-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-black text-slate-900 tracking-tight">
                Submitted Lab Records
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                {filtered.length} Student{filtered.length === 1 ? '' : 's'}
              </span>
              {pendingCount > 0 ? (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  {pendingCount} Pending Evaluation
                </span>
              ) : (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  All Records Evaluated
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Review individual student records, grade manually or auto-evaluate pending submissions, and approve PDF downloads.
            </p>
          </div>

          {pendingCount > 0 && (
            <button
              onClick={onAutoEvaluateAll}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition shrink-0 self-start sm:self-auto"
              title="Auto-evaluate and approve all pending student records in Submitted Lab Records"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auto-Evaluate Pending ({pendingCount})</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[11px] border-b border-slate-200 tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Student / Reg No</th>
                <th className="px-4 py-3.5">Official & Recorded Mail ID</th>
                <th className="px-4 py-3.5 text-center">Programs</th>
                <th className="px-4 py-3.5 text-center">Anti-Cheating</th>
                <th className="px-4 py-3.5 text-center">Rubric Marks (10)</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <Award className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    No students match the current search or filter.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const rosterStu = students.find((s) => s.regNo.trim().toUpperCase() === item.regNo.trim().toUpperCase());
                  const recordedMail = item.personalEmail || item.loggedGmail || '';
                  const isRecordSubmitted = !item.id.startsWith('REC_AUTO_');

                  return (
                    <tr key={item.regNo} className="hover:bg-slate-50/80 transition">
                      
                      {/* Student Info */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{item.studentName}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[11px] text-slate-500">{item.regNo}</span>
                          {isRecordSubmitted ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
                              Record Submitted
                            </span>
                          ) : (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 uppercase">
                              Code Only
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Official Email, Recorded Mail ID & Device Audit */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-900">
                            <Mail className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span className="font-semibold" title="Official University Email">{item.studentEmail || '—'}</span>
                          </div>
                          {recordedMail && (
                            <div className="text-[10px] font-mono text-indigo-700">
                              Device Gmail: {recordedMail}
                            </div>
                          )}
                          {item.deviceId && (
                            <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                              <Laptop className="w-3 h-3" /> {item.deviceId}
                            </div>
                          )}
                          {item.multiStudentAlert ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 w-fit">
                              <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                              {item.multiStudentAlert}
                            </span>
                          ) : item.isGmailSuspicious ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 w-fit">
                              <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                              Mismatch: Roster is {rosterStu?.email}
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-700 font-medium">
                              Unique Mail ID &amp; Device verified
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Programs Completed */}
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-1 rounded-md bg-slate-100 font-bold font-mono text-[11px] text-slate-800">
                          {item.completedExercisesCount} / {exercises.length} Done
                        </span>
                      </td>

                      {/* Anti-Cheating Signals */}
                      <td className="px-4 py-3 text-center">
                        {item.antiCheatingViolationsCount === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" /> Clean
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <ShieldAlert className="w-3 h-3 text-rose-600" />
                            {item.antiCheatingViolationsCount} Flags
                          </span>
                        )}
                      </td>

                      {/* Rubric Breakdown Marks */}
                      <td className="px-4 py-3 text-center">
                        {item.rubrics ? (
                          <div>
                            <div className="font-mono text-sm font-black text-indigo-700">
                              {item.rubrics.total} / 10
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              C:{item.rubrics.conceptImplemented} | N:{item.rubrics.namingConventions} | D:{item.rubrics.documentation} | O:{item.rubrics.output}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px] italic">Not Evaluated</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        {item.isVerifiedAndApproved ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Pending Review
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!item.isVerifiedAndApproved && (
                            <button
                              onClick={() => handleAutoEvaluateSingle(item)}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition"
                              title="Auto-evaluate and approve this student's record based on code submissions and integrity logs"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Auto-Eval</span>
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedForEval(item)}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition"
                            title="Open 10-Mark Rubric Evaluation Modal"
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>{item.isVerifiedAndApproved ? 'Re-Grade' : 'Evaluate'}</span>
                          </button>

                          {!item.isVerifiedAndApproved && item.rubrics && (
                            <button
                              onClick={() =>
                                onSaveEvaluation({
                                  ...item,
                                  status: 'EVALUATED_APPROVED',
                                  isVerifiedAndApproved: true,
                                  evaluatedBy: currentUser.name || 'Faculty Admin',
                                  evaluatedAt: new Date().toISOString(),
                                })
                              }
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition"
                              title="Approve this evaluated record so student can download & print their PDF"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                          )}

                          <button
                            onClick={() =>
                              setPreviewStudent({
                                role: 'STUDENT',
                                email: item.studentEmail,
                                personalEmail: item.personalEmail,
                                deviceId: item.deviceId,
                                name: item.studentName,
                                regNo: item.regNo,
                              })
                            }
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1 border border-slate-300 transition"
                            title="Inspect student's formatted PDF Lab Record"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-600" />
                            <span>PDF</span>
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rubric Evaluation Modal */}
      {selectedForEval && (
        <RubricEvaluationModal
          isOpen={!!selectedForEval}
          onClose={() => setSelectedForEval(null)}
          submission={selectedForEval}
          facultyUser={currentUser}
          exercises={exercises}
          studentSubmissions={submissions.filter(
            (s) => s.regNo.trim().toUpperCase() === selectedForEval.regNo.trim().toUpperCase()
          )}
          studentViolations={violations.filter(
            (v) => v.regNo.trim().toUpperCase() === selectedForEval.regNo.trim().toUpperCase()
          )}
          rosterStudent={students.find(
            (s) => s.regNo.trim().toUpperCase() === selectedForEval.regNo.trim().toUpperCase()
          )}
          onSaveEvaluation={onSaveEvaluation}
        />
      )}

      {/* Lab Record PDF Preview Modal */}
      {previewStudent && (
        <LabRecordModal
          isOpen={!!previewStudent}
          onClose={() => setPreviewStudent(null)}
          currentUser={previewStudent}
          exercises={exercises}
          submissions={submissions}
          evaluation={evaluations.find((e) => e.regNo.trim().toUpperCase() === previewStudent.regNo?.trim().toUpperCase())}
          isFacultyPreview={true}
        />
      )}

    </div>
  );
};
