import React, { useState, useMemo } from 'react';
import { Violation, ViolationType, LoginAuditRecord } from '../../types';
import {
  ShieldAlert,
  AlertTriangle,
  Download,
  Search,
  Copy,
  Maximize2,
  AlertOctagon,
  Mail,
  Laptop,
  Users,
  CheckCircle2,
} from 'lucide-react';

interface AntiCheatingCenterProps {
  violations: Violation[];
  loginAudit?: LoginAuditRecord[];
  onClearViolations?: () => void;
}

export const AntiCheatingCenter: React.FC<AntiCheatingCenterProps> = ({
  violations,
  loginAudit = [],
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');

  // Recompute cross-RegNo proxy relationships across all loginAudit rows
  const enrichedAudit = useMemo(() => {
    const mailToRegs = new Map<string, Set<string>>();
    const devToRegs = new Map<string, Set<string>>();

    loginAudit.forEach((entry) => {
      const reg = (entry.regNo || '').trim().toUpperCase();
      if (!reg) return;
      const mail = (entry.personalEmail || '').trim().toLowerCase();
      const dev = (entry.deviceId || '').trim();
      if (mail) {
        if (!mailToRegs.has(mail)) mailToRegs.set(mail, new Set());
        mailToRegs.get(mail)!.add(reg);
      }
      if (dev && dev !== 'UNKNOWN') {
        if (!devToRegs.has(dev)) devToRegs.set(dev, new Set());
        devToRegs.get(dev)!.add(reg);
      }
    });

    return loginAudit.map((entry) => {
      const reg = (entry.regNo || '').trim().toUpperCase();
      const mail = (entry.personalEmail || '').trim().toLowerCase();
      const dev = (entry.deviceId || '').trim();
      const shared = new Set<string>();

      if (mail && mailToRegs.has(mail)) {
        mailToRegs.get(mail)!.forEach((r) => {
          if (r !== reg) shared.add(r);
        });
      }
      if (dev && devToRegs.has(dev)) {
        devToRegs.get(dev)!.forEach((r) => {
          if (r !== reg) shared.add(r);
        });
      }
      if (entry.otherRegNos) {
        entry.otherRegNos.split(',').forEach((r) => {
          const clean = r.trim().toUpperCase();
          if (clean && clean !== reg) shared.add(clean);
        });
      }

      const otherRegsArr = Array.from(shared);
      const isProxyFlagged = otherRegsArr.length > 0 || (entry.status || '').startsWith('FLAGGED');
      return {
        ...entry,
        otherRegNos: otherRegsArr.join(', '),
        status: isProxyFlagged ? 'FLAGGED: MULTI-STUDENT PROXY' : 'CLEAR',
        isProxyFlagged,
      };
    });
  }, [loginAudit]);

  const filteredViolations = violations.filter((v) => {
    const matchesSearch =
      v.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.regNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.exerciseTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.details.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'ALL' || v.type === selectedType;
    const matchesSev = selectedSeverity === 'ALL' || v.severity === selectedSeverity;
    return matchesSearch && matchesType && matchesSev;
  });

  const filteredAudit = enrichedAudit.filter((a) => {
    const q = searchTerm.toLowerCase();
    return (
      a.studentName?.toLowerCase().includes(q) ||
      a.regNo.toLowerCase().includes(q) ||
      a.officialEmail.toLowerCase().includes(q) ||
      a.personalEmail.toLowerCase().includes(q) ||
      a.deviceId.toLowerCase().includes(q)
    );
  });

  const proxyFlaggedCount = enrichedAudit.filter((a) => a.isProxyFlagged).length;
  const pasteAttempts = violations.filter((v) => v.type === 'PASTE').length;
  const fullscreenExits = violations.filter((v) => v.type === 'FULLSCREEN_EXIT').length;

  const studentViolationsCount: Record<string, { count: number; name: string; regNo: string }> = {};
  violations.forEach((v) => {
    if (!studentViolationsCount[v.regNo]) {
      studentViolationsCount[v.regNo] = { count: 0, name: v.studentName || v.studentEmail, regNo: v.regNo };
    }
    studentViolationsCount[v.regNo].count++;
  });

  const flaggedStudents = Object.values(studentViolationsCount)
    .filter((s) => s.count >= 2)
    .sort((a, b) => b.count - a.count);

  const exportCSV = () => {
    const headers = ['Timestamp', 'OfficialEmail', 'RecordedMailID', 'RegNo', 'DeviceID', 'ExerciseID', 'ViolationType', 'Details'];
    const rows = violations.map((v) => [
      `"${v.timestamp}"`,
      `"${v.studentEmail}"`,
      `"${v.personalEmail || v.studentEmail}"`,
      `"${v.regNo}"`,
      `"${v.deviceId || ''}"`,
      `"${v.exerciseId}"`,
      `"${v.type}"`,
      `"${v.details.replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `JavaLab_Violations_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportLoginAuditCSV = () => {
    const headers = ['Timestamp', 'OfficialEmail', 'RegNo', 'StudentName', 'RecordedMailID', 'DeviceID', 'OtherRegNosUsed', 'MultiStudentStatus'];
    const rows = enrichedAudit.map((a) => [
      `"${a.timestamp}"`,
      `"${a.officialEmail}"`,
      `"${a.regNo}"`,
      `"${a.studentName}"`,
      `"${a.personalEmail}"`,
      `"${a.deviceId}"`,
      `"${a.otherRegNos}"`,
      `"${a.status}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `JavaLab_LoginAudit_Proxy_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTypeIcon = (type: ViolationType) => {
    switch (type) {
      case 'TAB_SWITCH':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'PASTE':
        return <Copy className="w-4 h-4 text-rose-600" />;
      case 'FULLSCREEN_EXIT':
        return <Maximize2 className="w-4 h-4 text-purple-600" />;
      default:
        return <ShieldAlert className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Export */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Anti-Cheating, Mail ID & Proxy Monitor</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200">
              Live Tracker
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Monitors clipboard paste interceptions, fullscreen exits, and shared Mail IDs / Devices across multiple Registration Numbers.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportLoginAuditCSV}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2 border border-slate-200 shadow-xs transition"
          >
            <Mail className="w-4 h-4 text-indigo-600" />
            Export Login Audit (CSV)
          </button>
          <button
            onClick={exportCSV}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2 border border-slate-200 shadow-xs transition"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Export Violations Sheet (CSV)
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mb-1">
            <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
            Total Incidents
          </div>
          <div className="text-2xl font-black text-slate-900">{violations.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Logged from test sessions</div>
        </div>
        <div className="bg-white border border-rose-200 p-4 rounded-xl shadow-xs">
          <div className="text-xs font-semibold text-rose-700 flex items-center gap-1.5 mb-1">
            <Users className="w-3.5 h-3.5 text-rose-600" />
            Multi-Student Proxy Flags
          </div>
          <div className="text-2xl font-black text-rose-600">{proxyFlaggedCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Shared Mail ID or Device ID</div>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mb-1">
            <Copy className="w-3.5 h-3.5 text-rose-600" />
            Paste Attempts
          </div>
          <div className="text-2xl font-black text-rose-600">{pasteAttempts}</div>
          <div className="text-[11px] text-slate-500 mt-1">External code paste blocks</div>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mb-1">
            <Maximize2 className="w-3.5 h-3.5 text-purple-600" />
            Fullscreen Exits
          </div>
          <div className="text-2xl font-black text-purple-600">{fullscreenExits}</div>
          <div className="text-[11px] text-slate-500 mt-1">Exam window minimizations</div>
        </div>
      </div>

      {/* High-risk Alert Banner */}
      {flaggedStudents.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-rose-900">
                High Proctoring Risk Flagged ({flaggedStudents.length} Students)
              </div>
              <div className="text-xs text-rose-700">
                {flaggedStudents.map((s) => `${s.name} (${s.regNo}: ${s.count} flags)`).join(', ')}
              </div>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-rose-800 bg-rose-100 px-3 py-1 rounded-lg border border-rose-200">
            Audit Required
          </span>
        </div>
      )}

      {/* Filters and search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by student name, registration number, Mail ID, device ID, or exercise..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Violation Types</option>
            <option value="PASTE">Paste Interceptions</option>
            <option value="FULLSCREEN_EXIT">Fullscreen Exits</option>
          </select>
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Severities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Student Mail ID & Device Login Audit Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Student Mail ID &amp; Device Login Audit ({filteredAudit.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">
            Flags any Mail ID or Device used for &gt;1 Registration Number
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 text-slate-500 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Student &amp; Reg No</th>
                <th className="py-2.5 px-4">Official Email</th>
                <th className="py-2.5 px-4">Recorded Mail ID</th>
                <th className="py-2.5 px-4">Device ID</th>
                <th className="py-2.5 px-4">Multi-Student Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredAudit.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    No student login audit records yet. Logins will appear here automatically.
                  </td>
                </tr>
              ) : (
                filteredAudit.map((a) => (
                  <tr key={a.id} className={a.isProxyFlagged ? 'bg-rose-50/50 hover:bg-rose-50 transition' : 'hover:bg-slate-50/80 transition'}>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">
                      {new Date(a.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-slate-900">{a.studentName || 'Student'}</div>
                      <div className="font-mono text-[11px] text-indigo-600">{a.regNo}</div>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-600">{a.officialEmail}</td>
                    <td className="py-2.5 px-4 font-mono text-[11px] font-semibold text-slate-900">{a.personalEmail}</td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Laptop className="w-3 h-3 text-slate-400" />
                        {a.deviceId}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      {a.isProxyFlagged ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-bold">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            MULTI-STUDENT PROXY
                          </span>
                          {a.otherRegNos && (
                            <div className="text-[10px] text-rose-700 font-mono">
                              Also used for: {a.otherRegNos}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          CLEAR
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Violations Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Time & ID</th>
                <th className="py-3 px-4">Student &amp; Mail ID</th>
                <th className="py-3 px-4">Violation Type</th>
                <th className="py-3 px-4">Incident Details</th>
                <th className="py-3 px-4">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredViolations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No violations found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredViolations.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      <div>{v.timestamp}</div>
                      <span className="text-[10px] text-slate-400">{v.id}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{v.studentName || 'Student'}</div>
                      <div className="font-mono text-[11px] text-indigo-600">{v.regNo}</div>
                      {v.personalEmail && (
                        <div className="font-mono text-[10px] text-slate-500">{v.personalEmail}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                        {getTypeIcon(v.type)}
                        <span>{v.type.replace('_', ' ')}</span>
                      </div>
                      <div className="text-[10px] text-slate-500">{v.exerciseTitle || v.exerciseId}</div>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <span className="text-slate-700">{v.details}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          v.severity === 'high'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : v.severity === 'medium'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {v.severity}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
