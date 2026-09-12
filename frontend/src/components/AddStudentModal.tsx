import React, { useState } from 'react';
import {
  X,
  UserPlus,
  Database,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Building2,
  BookOpen,
  Calendar,
  Activity,
  FileText,
  DollarSign,
  Layers,
} from 'lucide-react';
import { studentsApi } from '../services/api';
import { Student } from '../types';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStudentAdded: (student: Student) => void;
}

export const AddStudentModal: React.FC<AddStudentModalProps> = ({
  isOpen,
  onClose,
  onStudentAdded,
}) => {
  const [studentCode, setStudentCode] = useState('');
  const [year, setYear] = useState<number>(2);
  const [section, setSection] = useState('A');
  const [departmentCode, setDepartmentCode] = useState('CSE');
  const [courseCode, setCourseCode] = useState('CSE-CORE');

  // Telemetry
  const [attendancePct, setAttendancePct] = useState<number>(85.0);
  const [marksPct, setMarksPct] = useState<number>(78.0);
  const [assignmentsSubmitted, setAssignmentsSubmitted] = useState<number>(5);
  const [assignmentsTotal, setAssignmentsTotal] = useState<number>(5);
  const [portalLogins, setPortalLogins] = useState<number>(14);
  const [feeOverdue, setFeeOverdue] = useState<boolean>(false);
  const [backlogCount, setBacklogCount] = useState<number>(0);
  const [staffObservation, setStaffObservation] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanCode = studentCode.trim().toUpperCase();
    if (!cleanCode) {
      setError('Please provide a valid student code (e.g. STU125 or 241FA04099)');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        student_code: cleanCode,
        year,
        section,
        department_code: departmentCode,
        course_code: courseCode,
        attendance_pct: Number(attendancePct),
        marks_pct: Number(marksPct),
        assignments_submitted: Number(assignmentsSubmitted),
        assignments_total: Number(assignmentsTotal),
        portal_logins: Number(portalLogins),
        fee_overdue: feeOverdue,
        backlog_count: Number(backlogCount),
        staff_observation: staffObservation.trim() || undefined,
      };

      const newStudent = await studentsApi.create(payload);
      setSuccessMsg(`Student ${cleanCode} enrolled & synced directly to MongoDB Compass!`);
      onStudentAdded(newStudent);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save student data. Please check your inputs.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-400/30">
                <UserPlus className="w-5 h-5 text-blue-300" />
              </div>
              <h3 className="text-lg font-extrabold tracking-tight text-white">
                Input Student Data & Telemetry
              </h3>
            </div>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              Enrolls student into the early-warning radar and immediately syncs to local MongoDB Compass (<code className="text-emerald-400 font-mono">agent69_db.students</code>).
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Database Status Banner */}
        <div className="px-6 py-2.5 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between text-xs font-semibold text-emerald-800">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Target: Local MongoDB Compass (<code className="font-mono">localhost:27017 / agent69_db</code>)</span>
          </div>
          <span className="flex items-center gap-1 text-[11px] font-bold bg-emerald-100/80 px-2 py-0.5 rounded text-emerald-900">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Sync Active
          </span>
        </div>

        {/* Error / Success Messages */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Section 1: Academic Identity */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-blue-600" />
              <span>1. Institutional Identity</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Student Code / Roll No. *
                </label>
                <input
                  type="text"
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
                  placeholder="e.g. STU125 or 241FA04099"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Academic Year
                </label>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer"
                >
                  <option value={1}>1st Year (Freshman)</option>
                  <option value={2}>2nd Year (Sophomore)</option>
                  <option value={3}>3rd Year (Junior)</option>
                  <option value={4}>4th Year (Senior)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Section
                </label>
                <select
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer"
                >
                  <option value="A">Section A</option>
                  <option value="B">Section B</option>
                  <option value="C">Section C</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Department
                </label>
                <select
                  value={departmentCode}
                  onChange={(e) => {
                    setDepartmentCode(e.target.value);
                    if (e.target.value === 'CSE') setCourseCode('CSE-CORE');
                    else if (e.target.value === 'ECE') setCourseCode('ECE-CORE');
                    else setCourseCode('MECH-CORE');
                  }}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer"
                >
                  <option value="CSE">Computer Science & Engineering (CSE)</option>
                  <option value="ECE">Electronics & Communication (ECE)</option>
                  <option value="MECH">Mechanical Engineering (MECH)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Course / Program
                </label>
                <select
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer"
                >
                  {departmentCode === 'CSE' && (
                    <>
                      <option value="CSE-CORE">B.Tech CSE - Core</option>
                      <option value="CSE-AIML">B.Tech CSE - AI/ML</option>
                    </>
                  )}
                  {departmentCode === 'ECE' && (
                    <>
                      <option value="ECE-CORE">B.Tech ECE - Core</option>
                      <option value="ECE-VLSI">B.Tech ECE - VLSI</option>
                    </>
                  )}
                  {departmentCode === 'MECH' && (
                    <option value="MECH-CORE">B.Tech Mechanical</option>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Telemetry Signals */}
          <div className="pt-2 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>2. Telemetry & Baseline Signals</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Attendance % (0–100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={attendancePct}
                  onChange={(e) => setAttendancePct(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Marks Score % (0–100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={marksPct}
                  onChange={(e) => setMarksPct(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  LMS Portal Logins
                </label>
                <input
                  type="number"
                  min="0"
                  value={portalLogins}
                  onChange={(e) => setPortalLogins(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Assignments Completed
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    value={assignmentsSubmitted}
                    onChange={(e) => setAssignmentsSubmitted(Number(e.target.value))}
                    className="w-full px-2 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 text-center"
                  />
                  <span className="text-slate-400 font-bold">/</span>
                  <input
                    type="number"
                    min="1"
                    value={assignmentsTotal}
                    onChange={(e) => setAssignmentsTotal(Number(e.target.value))}
                    className="w-full px-2 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Fee Status
                </label>
                <select
                  value={feeOverdue ? 'OVERDUE' : 'PAID'}
                  onChange={(e) => setFeeOverdue(e.target.value === 'OVERDUE')}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-bold border cursor-pointer ${
                    feeOverdue
                      ? 'bg-rose-50 border-rose-300 text-rose-800'
                      : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  }`}
                >
                  <option value="PAID">✓ Paid / Cleared</option>
                  <option value="OVERDUE">⚠ Overdue Dues</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Backlog Subjects
                </label>
                <input
                  type="number"
                  min="0"
                  value={backlogCount}
                  onChange={(e) => setBacklogCount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Authorized Mentor / Staff Observation (Optional)
              </label>
              <input
                type="text"
                value={staffObservation}
                onChange={(e) => setStaffObservation(e.target.value)}
                placeholder="e.g. Student requests remedial tutoring in discrete mathematics"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-600 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving & Syncing to Mongo...</span>
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 text-emerald-300" />
                  <span>Save & Store in MongoDB Compass</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
