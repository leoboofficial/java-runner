import React, { useState } from 'react';
import { StudentRecord } from '../../types';
import { Users, Plus, Search, Mail, Hash, Building2, AlertTriangle, CheckCircle, X } from 'lucide-react';

interface StudentRosterProps {
  students: StudentRecord[];
  onAddStudent: (student: StudentRecord) => void;
}

export const StudentRoster: React.FC<StudentRosterProps> = ({ students, onAddStudent }) => {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [regNo, setRegNo] = useState('');
  const [department, setDepartment] = useState('Department of Computer Applications');

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.regNo.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !regNo) return;
    onAddStudent({
      name,
      email: email.trim().toLowerCase(),
      regNo: regNo.trim().toUpperCase(),
      department,
      submissionsCount: 0,
      violationsCount: 0,
    });
    setName('');
    setEmail('');
    setRegNo('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Student Enrollment Roster</h2>
          <p className="text-xs text-slate-500">
            Registered students authorized to access scheduled lab exercises through verification.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          Enroll New Student
        </button>
      </div>

      {/* Search */}
      <div className="relative bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <Search className="w-4 h-4 text-slate-400 absolute left-6 top-5.5" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by student name, registration number (e.g. 21BCE0450), or email..."
          className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
        />
      </div>

      {/* Roster Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Registration Number</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Institutional Email</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4 text-center">Submissions</th>
                <th className="py-3 px-4 text-center">Proctoring Flags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No students currently enrolled. Click "Enroll New Student" to add candidates.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.regNo} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600">{s.regNo}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{s.name}</td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{s.email}</td>
                    <td className="py-3 px-4 text-slate-700">{s.department}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[11px] border border-slate-200">
                        {s.submissionsCount || 0}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {(s.violationsCount ?? 0) > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[11px] border border-rose-200">
                          {s.violationsCount} Flags
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium text-[11px] border border-emerald-200">
                          Clean Record
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

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-slate-900">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <h3 className="text-base font-bold text-slate-900">Enroll Student</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Student Name"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Registration Number</label>
                <input
                  type="text"
                  required
                  value={regNo}
                  onChange={(e) => setRegNo(e.target.value)}
                  placeholder="e.g. 21BCE0450"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Student Institutional Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. 21bce0450@student.hindustanuniv.ac.in"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Department</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-xs"
                >
                  Add Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
