import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  UserPlus,
  Database,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Activity,
  RefreshCw,
  Server,
  Zap,
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

  // Telemetry signals
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

  // MongoDB status
  const [mongoStatus, setMongoStatus] = useState<any>(null);
  const [isCheckingMongo, setIsCheckingMongo] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  useEffect(() => {
    if (isOpen) {
      checkMongo();
    }
  }, [isOpen]);

  const checkMongo = async () => {
    setIsCheckingMongo(true);
    try {
      const res = await studentsApi.getMongoStatus();
      setMongoStatus(res);
    } catch (e: any) {
      setMongoStatus({
        connected: false,
        uri: 'mongodb://localhost:27017',
        database: 'agent69_db',
        error: e?.message || 'Connection failed',
      });
    } finally {
      setIsCheckingMongo(false);
    }
  };

  const handleSyncAllToMongo = async () => {
    setIsSyncingAll(true);
    setError(null);
    try {
      const res = await studentsApi.syncAllToMongo();
      setSuccessMsg(res.message || 'All collections synced to MongoDB Compass!');
      checkMongo();
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to sync database to MongoDB');
    } finally {
      setIsSyncingAll(false);
    }
  };

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
      setSuccessMsg(`Student ${cleanCode} enrolled & saved into MongoDB Compass (agent69_db.students)!`);
      onStudentAdded(newStudent);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save student data. Please check your inputs.');
    } finally {
      setIsLoading(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto animate-modal-pop"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-start justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-400/30">
                <UserPlus className="w-5 h-5 text-blue-300" />
              </div>
              <h3 className="text-lg font-extrabold tracking-tight text-white">
                Input Student Data & Store in MongoDB Compass
              </h3>
            </div>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              Enrolls student into the early-warning radar and immediately syncs directly to local MongoDB Compass.
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
        <div className="px-6 py-2.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between text-xs font-semibold text-white gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>MongoDB Compass:</span>
            <code className="px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300 font-mono text-[11px]">
              mongodb://localhost:27017
            </code>
            <span className="text-slate-400">•</span>
            <span className="text-indigo-300">DB: <strong className="text-white">agent69_db</strong></span>
          </div>

          <div className="flex items-center gap-2">
            {mongoStatus?.connected ? (
              <span className="flex items-center gap-1.5 text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Connected ({mongoStatus.students_count} students)
              </span>
            ) : (
              <button
                type="button"
                onClick={checkMongo}
                disabled={isCheckingMongo}
                className="flex items-center gap-1 text-[11px] font-bold text-amber-300 hover:text-white cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isCheckingMongo ? 'animate-spin' : ''}`} />
                Test Connection
              </button>
            )}

            <button
              type="button"
              onClick={handleSyncAllToMongo}
              disabled={isSyncingAll}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold cursor-pointer transition shadow-xs disabled:opacity-50"
              title="Sync all tables to MongoDB Compass"
            >
              {isSyncingAll ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <Zap className="w-3 h-3 text-amber-300" />
              )}
              Sync All to Compass
            </button>
          </div>
        </div>

        {/* Error / Success Messages */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-2 shrink-0 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Body - Fully Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Section 1: Academic Identity */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-blue-600" />
              <span>1. Student Identity & Program</span>
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
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
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
                  <option value="D">Section D</option>
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
          <div className="pt-3 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>2. Academic & Engagement Signals (Stored in MongoDB)</span>
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
                  Assignments Completed / Due
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
                  Fee Payment Status
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
                Clinical / Staff Notes (Optional)
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

          {/* Compass Direct Instructions Hint */}
          <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-[11px] text-blue-900 flex items-start gap-2">
            <Server className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Where to see in MongoDB Compass:</span> Open Compass → connect to{' '}
              <code className="font-mono bg-white px-1 py-0.5 rounded border border-blue-200">mongodb://localhost:27017</code> → click database{' '}
              <code className="font-mono bg-white px-1 py-0.5 rounded border border-blue-200">agent69_db</code> → open collection{' '}
              <code className="font-mono bg-white px-1 py-0.5 rounded border border-blue-200 font-bold">students</code>.
            </div>
          </div>
        </form>

        {/* Modal Footer Actions - Pinned at Bottom */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 hidden sm:block">
            Target: <code className="font-mono text-emerald-700 font-bold">agent69_db.students</code>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-600 text-white text-xs font-extrabold shadow-md shadow-blue-500/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
            >
              {isLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving & Storing in Mongo...</span>
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 text-emerald-300" />
                  <span>Enroll Student & Store to MongoDB</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
