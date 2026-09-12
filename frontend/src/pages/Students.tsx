import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Filter, ArrowRight, UserCheck, AlertCircle, ShieldAlert, UserPlus, Database } from 'lucide-react';
import { studentsApi } from '../services/api';
import { Student } from '../types';
import { SeverityBadge } from '../components/Badges';
import { AddStudentModal } from '../components/AddStudentModal';

export const Students: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState<number | undefined>(undefined);
  const [selectedSeverity, setSelectedSeverity] = useState<string>(searchParams.get('risk') || 'ALL');
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    const riskParam = searchParams.get('risk');
    if (riskParam) setSelectedSeverity(riskParam);
  }, [searchParams]);

  useEffect(() => {
    loadStudents();
  }, [selectedDept]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const list = await studentsApi.list({ department_id: selectedDept, search });
      setStudents(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadStudents();
  };

  const filteredStudents = students.filter((s) => {
    if (selectedSeverity === 'ALL') return true;
    if (selectedSeverity === 'HIGH') return s.max_severity === 'HIGH';
    if (selectedSeverity === 'MEDIUM') return s.max_severity === 'MEDIUM';
    if (selectedSeverity === 'LOW') return s.max_severity === 'LOW';
    if (selectedSeverity === 'NO_ALERT') return !s.max_severity;
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Student Directory & Profiles
          </h1>
          <p className="text-sm font-medium text-slate-600 mt-1 max-w-3xl leading-relaxed">
            View student information and monitor changes against their personal academic and engagement baseline.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          <button
            id="btn-add-student-mongo"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white text-xs font-black shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95 border border-blue-400/30"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Input Student Data</span>
            <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 px-2 py-0.5 rounded-md text-[10px] font-bold">
              <Database className="w-3 h-3 text-emerald-400" />
              Mongo
            </span>
          </button>
          <div className="inline-flex items-center gap-2 text-xs font-extrabold text-blue-800 bg-blue-50 px-4 py-2 rounded-xl border border-blue-200 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span>{filteredStudents.length} students</span>
          </div>
        </div>
      </div>

      {/* Spacious Filter Toolbar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
          {/* Search Field */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[280px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student ID or name…"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
            />
          </form>

          {/* Filters with Large Gaps */}
          <div className="flex flex-wrap items-center gap-6">
            {/* Department Filter */}
            <div className="flex items-center gap-2.5">
              <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 whitespace-nowrap">
                <Filter className="w-3.5 h-3.5 text-blue-600" />
                Department:
              </label>
              <select
                value={selectedDept || ''}
                onChange={(e) => setSelectedDept(e.target.value ? Number(e.target.value) : undefined)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer transition-all"
              >
                <option value="">All Departments</option>
                <option value={1}>Computer Science (CSE)</option>
                <option value={2}>Electronics & Comm (ECE)</option>
                <option value={3}>Mechanical Engg (MECH)</option>
              </select>
            </div>

            {/* Risk Level Filter */}
            <div className="flex items-center gap-2.5">
              <label className="text-xs font-extrabold text-slate-800 whitespace-nowrap">
                Risk Level:
              </label>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer transition-all"
              >
                <option value="ALL">All Risk Levels</option>
                <option value="HIGH">High Severity Only</option>
                <option value="MEDIUM">Medium Severity Only</option>
                <option value="LOW">Low Severity Only</option>
                <option value="NO_ALERT">No Active Alerts</option>
              </select>
            </div>
          </div>
        </div>
      </div>


      {/* Spacious Student Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-400">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="font-medium text-slate-500">Loading student directory...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-20 text-center text-slate-500">
            <p className="text-sm font-semibold text-slate-700">No students found</p>
            <p className="text-xs text-slate-400 mt-1">Try resetting search or filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-800 font-extrabold uppercase tracking-wider text-[11px]">
                  <th className="py-4 px-6 border-r border-slate-200/80">Student Code</th>
                  <th className="py-4 px-6 border-r border-slate-200/80">Department</th>
                  <th className="py-4 px-6 border-r border-slate-200/80">Program / Course</th>
                  <th className="py-4 px-6 border-r border-slate-200/80">Year & Section</th>
                  <th className="py-4 px-6 border-r border-slate-200/80">Active Alerts</th>
                  <th className="py-4 px-6 border-r border-slate-200/80">Current Risk</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredStudents.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-blue-50/40 transition-colors duration-150 group"
                  >
                    {/* Student Code */}
                    <td className="py-4.5 px-6 font-extrabold text-slate-900 border-r border-slate-100">
                      <Link
                        to={`/students/${s.id}`}
                        className="text-blue-700 hover:text-blue-900 font-extrabold text-sm hover:underline"
                      >
                        {s.student_code}
                      </Link>
                    </td>

                    {/* Department */}
                    <td className="py-4.5 px-6 font-bold text-slate-900 border-r border-slate-100">
                      {s.department_name || 'General Faculty'}
                    </td>

                    {/* Program / Course */}
                    <td className="py-4.5 px-6 font-semibold text-slate-800 border-r border-slate-100">
                      {s.course_name || 'Undergraduate Degree'}
                    </td>

                    {/* Year & Section */}
                    <td className="py-4.5 px-6 font-semibold text-slate-800 border-r border-slate-100">
                      Year {s.year} &bull; Sec {s.section || 'A'}
                    </td>

                    {/* Active Alerts */}
                    <td className="py-4.5 px-6 border-r border-slate-100">
                      {s.active_alert_count > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 text-rose-800 font-extrabold text-xs border border-rose-300">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                          <span>{s.active_alert_count} active alert{s.active_alert_count > 1 ? 's' : ''}</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 font-semibold text-xs">No active alerts</span>
                      )}
                    </td>

                    {/* Current Risk Badge */}
                    <td className="py-4.5 px-6 border-r border-slate-100">
                      {s.max_severity ? (
                        <SeverityBadge severity={s.max_severity as any} />
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-extrabold bg-slate-100 text-slate-800 border border-slate-300">
                          NORMAL
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4.5 px-6 text-right">
                      <Link
                        to={`/students/${s.id}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 font-extrabold rounded-xl text-xs border border-blue-300 transition-all duration-150 btn-press group-hover:shadow-xs"
                      >
                        <span>View Profile</span>
                        <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

          </div>
        )}

        {/* Table Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {filteredStudents.length} of {students.length} students</span>
          <span className="text-[11px] text-slate-400 font-medium">Personal baseline monitoring active</span>
        </div>
      </div>

      {/* Add Student Modal with Local MongoDB Compass Sync */}
      <AddStudentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onStudentAdded={(newStudent) => {
          setStudents((prev) => [newStudent, ...prev]);
        }}
      />
    </div>
  );
};
