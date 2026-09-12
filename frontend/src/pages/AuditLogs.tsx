import React, { useEffect, useState } from 'react';
import { History, Shield, Search, Filter, Clock, User, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { auditApi } from '../services/api';
import { AuditLog } from '../types';

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const data = await auditApi.list(200);
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.action.toLowerCase().includes(q) ||
      l.object_type.toLowerCase().includes(q) ||
      (l.user_name && l.user_name.toLowerCase().includes(q)) ||
      (l.object_id && l.object_id.toString().includes(q))
    );
  });

  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('ACKNOWLEDGE')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          Acknowledged
        </span>
      );
    }
    if (act.includes('RESOLVE') || act.includes('CLOSE')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          Resolved
        </span>
      );
    }
    if (act.includes('NOTE') || act.includes('COMMENT')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200/80">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          Review Note Added
        </span>
      );
    }
    if (act.includes('CALIBRAT') || act.includes('APPROVE')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200/80">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
          Policy Calibrated
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
        {action.replace(/_/g, ' ')}
      </span>
    );
  };

  const formatObjectType = (type: string, id?: string | number | null) => {
    const t = type.toLowerCase();
    let label = type;
    if (t.includes('alert')) label = 'Early Warning Alert';
    else if (t.includes('student')) label = 'Student Profile';
    else if (t.includes('calibration')) label = 'Calibration Run';
    else if (t.includes('setting') || t.includes('threshold')) label = 'Threshold Policy';

    return (
      <div className="flex items-center gap-1.5">
        <span className="font-semibold text-slate-800 text-xs">{label}</span>
        {id && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
            #{id}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600 text-xs font-bold uppercase tracking-wider mb-1">
            <Shield className="w-3.5 h-3.5" />
            <span>Governance & Accountability</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            System Audit Trail
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
            Transparent, tamper-evident log of all staff interactions, student check-in outcomes, threshold updates, and governance decisions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs font-bold text-slate-700 bg-white px-4 py-2 rounded-xl border border-slate-200/90 shadow-2xs">
            {filteredLogs.length} Events Recorded
          </div>
        </div>
      </div>

      {/* Filter / Search Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by staff member, action, or ID..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50/80 border border-slate-200/90 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-xs font-medium text-slate-400">Loading audit records...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-16 text-center text-xs font-medium text-slate-500">
            No audit events matched your search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-4 px-6 border-r border-slate-100">Date & Time</th>
                  <th className="py-4 px-6 border-r border-slate-100">Staff Member</th>
                  <th className="py-4 px-6 border-r border-slate-100">Action Taken</th>
                  <th className="py-4 px-6 border-r border-slate-100">Item Modified</th>
                  <th className="py-4 px-6 border-r border-slate-100">Previous State</th>
                  <th className="py-4 px-6">Updated State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-4 px-6 text-slate-500 font-mono text-[11px] border-r border-slate-100 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-bold text-slate-900 border-r border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {log.user_name ? log.user_name.slice(0, 2).toUpperCase() : 'SY'}
                        </div>
                        <span>{log.user_name || 'System Engine'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 border-r border-slate-100">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="py-4 px-6 border-r border-slate-100">
                      {formatObjectType(log.object_type, log.object_id)}
                    </td>
                    <td className="py-4 px-6 text-slate-500 font-mono text-[11px] border-r border-slate-100 max-w-[200px] truncate">
                      {log.previous_value ? (
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          {log.previous_value}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-4 px-6 font-semibold text-blue-700 font-mono text-[11px] max-w-[200px] truncate">
                      {log.new_value ? (
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                          {log.new_value}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

