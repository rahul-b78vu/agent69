import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Info,
  Layers,
  ArrowUpRight,
  User,
  GraduationCap,
  Shield,
  Activity,
  Sparkles,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { studentsApi } from '../services/api';
import { StudentDetail as StudentDetailType } from '../types';
import { SeverityBadge, CategoryBadge, StatusBadge } from '../components/Badges';
import { extractAlertHeadline } from '../utils/formatters';

export const StudentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<StudentDetailType | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadStudent(Number(id));
    }
  }, [id]);

  const loadStudent = async (studentId: number) => {
    setLoading(true);
    try {
      const [detail, signals] = await Promise.all([
        studentsApi.getDetail(studentId),
        studentsApi.getSignals(studentId),
      ]);
      setStudent(detail);
      setTimeline(signals);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const formatAssignedRole = (role?: string) => {
    if (!role) return 'Unassigned';
    const mapping: Record<string, string> = {
      ADMIN: 'Administrator',
      MENTOR_CSE: 'Mentor (CSE)',
      MENTOR_ECE: 'Mentor (ECE)',
      MENTOR_MECH: 'Mentor (Mech)',
      MENTOR: 'Mentor',
      HOD_CSE: 'Head of Department (CSE)',
      HOD_ECE: 'Head of Department (ECE)',
      HOD_MECH: 'Head of Department (Mech)',
      HOD: 'Head of Department',
      DEAN_ACADEMICS: 'Dean of Academics',
      DEAN: 'Dean of Academics',
      COUNSELLOR: 'Counsellor',
      FINANCE_OFFICER: 'Finance Support',
      FINANCE: 'Finance Support',
      PRINCIPAL: 'Principal',
    };
    return mapping[role] || role.replace(/_/g, ' ');
  };

  if (loading || !student) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] py-20">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
        <div className="text-xs font-semibold text-slate-500">Loading student personal baseline profile...</div>
      </div>
    );
  }

  return (
    <div className="student-profile-wrapper space-y-8">
      {/* Back Link & Profile Header */}
      <div className="space-y-4">
        <Link
          to="/students"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Student Directory</span>
        </Link>

        {/* Profile Card - Frosted Glass Transparent */}
        <div className="student-glass-card rounded-3xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          {/* Subtle top reflective glass glare */}
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-blue-400 to-transparent pointer-events-none opacity-80" />

          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 backdrop-blur-md border border-blue-400/30 flex items-center justify-center text-2xl font-black text-blue-700 shadow-inner">
              {student.student_code}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{student.student_code}</h1>
                {student.max_severity ? (
                  <SeverityBadge severity={student.max_severity as any} />
                ) : (
                  <span className="px-2.5 py-1 rounded-md text-xs bg-emerald-500/10 text-emerald-700 font-bold border border-emerald-300/60 backdrop-blur-xs">
                    Normal Baseline
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {student.department_name} ({student.department_code}) &bull; {student.course_name}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="student-glass-pill px-4 py-3 rounded-xl text-center min-w-[100px]">
              <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">ACADEMIC YEAR</span>
              <span className="font-bold text-slate-900 text-sm mt-0.5 block">Year {student.year}</span>
            </div>
            <div className="student-glass-pill px-4 py-3 rounded-xl text-center min-w-[100px]">
              <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">SECTION</span>
              <span className="font-bold text-slate-900 text-sm mt-0.5 block">Sec {student.section || 'A'}</span>
            </div>
            <div className="student-glass-pill px-4 py-3 rounded-xl text-center min-w-[100px]">
              <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">ENROLMENT STATUS</span>
              <span className="font-bold text-emerald-600 text-sm mt-0.5 block">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Signal Deviation Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <span>Signal Comparison Against Personal Baseline</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Personalized historical baseline computed from student's own stable history (never peer or class averages).
            </p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold text-blue-700 bg-blue-50/80 border border-blue-200">
            <Sparkles className="w-3 h-3 text-blue-500" />
            Transparent Glass Baseline
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {student.current_signals.map((sig) => {
            const isDecline = sig.deviation !== undefined && sig.deviation < 0;
            const strengthColor = {
              none: 'text-slate-500 bg-slate-100/70 border-slate-200/70 backdrop-blur-xs',
              weak: 'text-amber-700 bg-amber-50/80 border-amber-200/80 font-semibold backdrop-blur-xs',
              moderate: 'text-orange-700 bg-orange-50/80 border-orange-200/80 font-semibold backdrop-blur-xs',
              strong: 'text-rose-700 bg-rose-50/85 border-rose-200/90 font-bold shadow-xs shadow-rose-500/10 backdrop-blur-xs',
            }[sig.strength] || 'text-slate-500 bg-slate-100/70 border-slate-200/70 backdrop-blur-xs';

            const formatVal = (val?: number) => {
              if (val === undefined || val === null) return 'N/A';
              if (sig.signal_type.includes('ATTENDANCE') || sig.signal_type.includes('MARKS') || sig.signal_type.includes('ASSIGNMENT')) {
                return `${val.toFixed(1)}%`;
              }
              if (sig.signal_type.includes('FINANCIAL')) {
                return `₹${val.toLocaleString()}`;
              }
              return val.toFixed(1);
            };

            return (
              <div
                key={sig.signal_type}
                className="student-glass-card p-5 rounded-2xl flex flex-col justify-between interactive-card hover:-translate-y-1 relative overflow-hidden group shadow-xs"
              >
                {/* Glowing highlighted blue top edge glare */}
                <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-blue-400 to-transparent pointer-events-none opacity-80" />

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-slate-800 tracking-tight">
                      {sig.signal_type.replace(/_/g, ' ')}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] border uppercase ${strengthColor}`}>
                      {sig.strength}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Personal Baseline:</span>
                      <span className="font-semibold text-slate-800">{formatVal(sig.baseline_value)}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Current Period:</span>
                      <span className="font-bold text-slate-900">{formatVal(sig.current_value)}</span>
                    </div>
                    <div className="flex items-center justify-between border-t student-glass-divider pt-2">
                      <span className="font-medium text-slate-600">Deviation:</span>
                      <span className={`font-bold ${isDecline ? 'text-rose-600' : 'text-slate-700'}`}>
                        {sig.deviation !== undefined ? `${sig.deviation > 0 ? '+' : ''}${sig.deviation.toFixed(1)}` : '0.0'}
                      </span>
                    </div>
                  </div>
                </div>

                {sig.is_sustained && (
                  <div className="mt-3 pt-2.5 border-t student-glass-divider text-[11px] text-amber-700 font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 animate-pulse" />
                    <span>Sustained decline ({sig.sustained_periods} periods)</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Historical Trend Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="student-glass-card p-6 rounded-3xl interactive-card relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
          <h3 className="text-sm font-bold text-slate-800 mb-1">12-Week Attendance & Marks History</h3>
          <p className="text-[11px] text-slate-400 mb-4">Weeks 1–4 stable baseline period vs subsequent weeks</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeline} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.6)" />
                <XAxis dataKey="week" tickFormatter={(w) => `W${w}`} tick={{ fontSize: 10 }} />
                <YAxis domain={[30, 100]} tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.85)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Line type="monotone" name="Attendance %" dataKey="attendance_pct" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" name="Internal Marks %" dataKey="marks_pct" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="student-glass-card p-6 rounded-3xl interactive-card relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
          <h3 className="text-sm font-bold text-slate-800 mb-1">Assignment Submission & LMS Activity</h3>
          <p className="text-[11px] text-slate-400 mb-4">Tracking timely completion and portal logins</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeline} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.6)" />
                <XAxis dataKey="week" tickFormatter={(w) => `W${w}`} tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.85)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Line type="monotone" name="Assignment Pct %" dataKey="assignment_submission_pct" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" name="LMS Logins" dataKey="lms_logins_count" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Generated Alerts for this student */}
      <div className="student-glass-card p-6 rounded-3xl relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Early-Warning Alerts & Human Review History</h3>
            <p className="text-[11px] text-slate-400">Formal observations recorded for this student</p>
          </div>
        </div>

        {student.recent_alerts.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500 student-glass-pill rounded-2xl">
            No early-warning alerts generated. Student remains within personal normal boundaries.
          </div>
        ) : (
          <div className="space-y-3">
            {student.recent_alerts.map((alert) => (
              <div
                key={alert.id}
                className="p-4.5 rounded-2xl border border-white/70 hover:border-blue-300/80 hover:bg-white/70 interactive-card-sm transition-all duration-150 student-glass-pill flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">Alert #{alert.id}</span>
                    <CategoryBadge category={alert.category} />
                    <SeverityBadge severity={alert.severity} />
                    <StatusBadge status={alert.status} />
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-1 max-w-xl font-normal">
                    {extractAlertHeadline(alert.narrative_summary, alert.category)} &bull; Score: {alert.warning_score} ({Math.round(alert.confidence * 100)}% confidence)
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] text-slate-400">
                    Assigned To: <strong className="text-slate-800">{formatAssignedRole(alert.suggested_responder_role)}</strong>
                  </span>
                  <Link
                    to={`/alerts/${alert.id}`}
                    className="px-3.5 py-1.5 bg-blue-500/10 hover:bg-blue-600 hover:text-white text-blue-700 font-bold rounded-xl text-xs border border-blue-200/80 transition-all duration-150 flex items-center gap-1.5 btn-press backdrop-blur-xs"
                  >
                    <span>Review Alert</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
