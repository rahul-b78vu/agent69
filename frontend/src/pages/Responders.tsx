import React, { useEffect, useState } from 'react';
import { UserCheck, Shield, Clock, Users, ArrowRight, AlertTriangle, User as UserIcon, CheckCircle2, Database, Mail, Award } from 'lucide-react';
import { alertsApi, authApi } from '../services/api';
import { Alert, User } from '../types';

export const Responders: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [alertList, usersList] = await Promise.all([
        alertsApi.list(),
        authApi.listUsers().catch(() => []),
      ]);
      setAlerts(alertList);
      setRegisteredUsers(usersList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const responderTeams = [
    {
      role: 'MENTOR',
      title: 'Academic Mentors',
      lead: 'Prof. Alan Turing (CSE)',
      scope: 'Routine & medium academic check-ins, early disengagement, attendance decline.',
      sla: '72 hours',
      color: 'border-blue-200 bg-blue-50/80 text-blue-700',
    },
    {
      role: 'HOD',
      title: 'Heads of Department (HoD)',
      lead: 'Dr. Grace Hopper (CSE)',
      scope: 'High severity academic alerts, multi-signal sustained declines, escalation tier 1.',
      sla: '24 hours',
      color: 'border-indigo-200 bg-indigo-50/80 text-indigo-700',
    },
    {
      role: 'COUNSELLOR',
      title: 'Student Support & Counselling',
      lead: 'Dr. Carl Rogers',
      scope: 'Confidential personal check-ins, sudden withdrawal without academic cause.',
      sla: '24 hours (Confidential)',
      color: 'border-rose-200 bg-rose-50/80 text-rose-700',
    },
    {
      role: 'FINANCE_SUPPORT',
      title: 'Student Accounts & Finance Office',
      lead: 'Sarah Jenkins',
      scope: 'Tuition arrears, payment deferrals, financial hardship assistance routing.',
      sla: '48 hours',
      color: 'border-emerald-200 bg-emerald-50/80 text-emerald-700',
    },
    {
      role: 'DEAN',
      title: 'Dean of Academic Affairs',
      lead: 'Dean John von Neumann',
      scope: 'Institutional patterns, high concentration courses, escalation tier 2.',
      sla: '24 hours',
      color: 'border-sky-200 bg-sky-50/80 text-sky-700',
    },
    {
      role: 'PRINCIPAL',
      title: 'Principal / Provost Executive',
      lead: 'Dr. Ada Lovelace',
      scope: 'University-wide policy calibration, critical escalation tier 3.',
      sla: 'Immediate',
      color: 'border-amber-200 bg-amber-50/80 text-amber-700',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
          Responder Routing & Support Teams
        </h1>
        <p className="text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
          Role-based routing ensures alerts reach qualified university professionals with defined SLA response windows.
        </p>
      </div>

      {/* Grid of Teams */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {responderTeams.map((team) => {
          const teamAlerts = alerts.filter((a) => a.suggested_responder_role === team.role);
          const pendingCount = teamAlerts.filter((a) => a.status === 'NEW' || a.status === 'ACKNOWLEDGED').length;

          return (
            <div
              key={team.role}
              className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs flex flex-col justify-between interactive-card hover:-translate-y-1 hover:shadow-md hover:border-blue-300 transition-all duration-200"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${team.color}`}>
                    {team.role}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>SLA: {team.sla}</span>
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-base mt-4">{team.title}</h3>
                <p className="text-xs text-blue-600 font-semibold mt-1">Lead: {team.lead}</p>
                <p className="text-xs text-slate-500 mt-2.5 leading-relaxed">{team.scope}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">TOTAL ROUTED</span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block">{teamAlerts.length} alerts</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">AWAITING ACTION</span>
                  <span className={`font-bold inline-flex items-center gap-1.5 text-sm mt-0.5 ${pendingCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {pendingCount > 0 ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                        <span>{pendingCount} pending</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>All Clear</span>
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* --- Registered Institutional Accounts (Live Database Table) --- */}
      <div className="mt-12 bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-slate-900">Registered Institutional Accounts</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                {registeredUsers.length} in database
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Live accounts stored in SQLite (<code className="text-[11px] font-mono bg-slate-100 px-1 py-0.5 rounded">backend/agent69.db</code>) via Signup / System Seeding.
            </p>
          </div>
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Database Synced
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-100/50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">User ID</th>
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">Username</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Assigned Role(s)</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {registeredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-500">#{u.id}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{u.full_name}</td>
                  <td className="py-3 px-4 font-medium text-blue-600">@{u.username}</td>
                  <td className="py-3 px-4 text-slate-600">{u.email}</td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {u.roles?.map((r) => (
                        <span
                          key={r.id || r.name}
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200"
                        >
                          {r.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Active in DB
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
