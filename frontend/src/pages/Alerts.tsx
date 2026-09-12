import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Filter, Search, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react';
import { alertsApi } from '../services/api';
import { Alert } from '../types';
import { SeverityBadge, StatusBadge, CategoryBadge, UrgencyBadge } from '../components/Badges';

export const Alerts: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>(searchParams.get('status') || 'ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('category') || 'ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>(searchParams.get('severity') || 'ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const statusParam = searchParams.get('status');
    const categoryParam = searchParams.get('category');
    const severityParam = searchParams.get('severity');
    if (statusParam) setSelectedStatus(statusParam);
    if (categoryParam) setSelectedCategory(categoryParam);
    if (severityParam) setSelectedSeverity(severityParam);
  }, [searchParams]);

  useEffect(() => {
    loadAlerts();
  }, [selectedStatus, selectedCategory, selectedSeverity]);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedStatus !== 'ALL') params.status = selectedStatus;
      if (selectedCategory !== 'ALL') params.category = selectedCategory;
      if (selectedSeverity !== 'ALL') params.severity = selectedSeverity;

      const res = await alertsApi.list(params);
      setAlerts(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.student_code?.toLowerCase().includes(q) ||
      a.department_name?.toLowerCase().includes(q) ||
      a.category?.toLowerCase().includes(q) ||
      a.narrative_summary?.toLowerCase().includes(q) ||
      String(a.id).includes(q)
    );
  });

  // Human-friendly role assignment translation
  const formatAssignedRole = (role?: string) => {
    if (!role) return 'Unassigned';
    const upper = role.toUpperCase().trim();
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
      FINANCE_SUPPORT: 'Finance Support',
      FINANCE: 'Finance Support',
      PRINCIPAL: 'Principal',
    };
    if (mapping[upper]) return mapping[upper];
    return role
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Early Warning Alerts Queue
          </h1>
          <p className="text-sm font-medium text-slate-600 mt-1 max-w-3xl leading-relaxed">
            Review students who may need support based on changes in academic performance, engagement, financial situation, or other signals.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 text-xs font-extrabold text-blue-800 bg-blue-50 px-4 py-2 rounded-xl border border-blue-200 shadow-2xs self-start md:self-auto">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          <span>{filteredAlerts.length} alerts found</span>
        </div>
      </div>

      {/* Spacious Filter Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
          {/* Search Section */}
          <div className="relative flex-1 min-w-[280px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student ID, name, department, or alert ID…"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
            />
          </div>

          {/* Filter Dropdowns with Large Gaps */}
          <div className="flex flex-wrap items-center gap-6">
            {/* Status Filter */}
            <div className="flex items-center gap-2.5">
              <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 whitespace-nowrap">
                <Filter className="w-3.5 h-3.5 text-blue-600" />
                Status:
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer transition-all"
              >
                <option value="ALL">All Statuses</option>
                <option value="NEW">New Only</option>
                <option value="ACKNOWLEDGED">Acknowledged</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="ACTION_TAKEN">Action Taken</option>
                <option value="RESOLVED">Resolved</option>
                <option value="FALSE_POSITIVE">False Positive</option>
                <option value="ESCALATED">Escalated</option>
              </select>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2.5">
              <label className="text-xs font-extrabold text-slate-800 whitespace-nowrap">
                Category:
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer transition-all"
              >
                <option value="ALL">All Categories</option>
                <option value="ACADEMIC_DIFFICULTY">Academic Difficulty</option>
                <option value="DISENGAGEMENT">Disengagement</option>
                <option value="FINANCIAL_DIFFICULTY">Financial Difficulty</option>
                <option value="HEALTH_PERSONAL">Health / Personal</option>
                <option value="GENERAL_EARLY_WARNING">General Early Warning</option>
              </select>
            </div>

            {/* Severity Filter */}
            <div className="flex items-center gap-2.5">
              <label className="text-xs font-extrabold text-slate-800 whitespace-nowrap">
                Severity:
              </label>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer transition-all"
              >
                <option value="ALL">All Severities</option>
                <option value="HIGH">High Severity</option>
                <option value="MEDIUM">Medium Severity</option>
                <option value="LOW">Low Severity</option>
              </select>
            </div>
          </div>

        </div>
      </div>

      {/* Spacious Alerts Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-400">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="font-medium text-slate-500">Loading alerts queue...</p>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="py-20 text-center text-slate-500">
            <AlertTriangle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No alerts found</p>
            <p className="text-xs text-slate-400 mt-1">Try resetting your filters or search terms.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-800 font-extrabold uppercase tracking-wider text-[11px]">
                  <th className="py-4 px-6 border-r border-slate-200/80">Alert ID</th>
                  <th className="py-4 px-6 border-r border-slate-200/80">Student Details</th>
                  <th className="py-4 px-6 border-r border-slate-200/80">Warning Type</th>
                  <th className="py-4 px-6 border-r border-slate-200/80">Severity & Urgency</th>
                  <th className="py-4 px-6 border-r border-slate-200/80">
                    <div className="flex items-center gap-1">
                      <span>Risk Score / Confidence</span>
                      <span title="Shows how strongly the system detected a warning and how confident the AI is." className="cursor-help text-slate-500">
                        <HelpCircle className="w-3 h-3" />
                      </span>
                    </div>
                  </th>
                  <th className="py-4 px-6 border-r border-slate-200/80">Assigned To</th>
                  <th className="py-4 px-6 border-r border-slate-200/80">Status</th>
                  <th className="py-4 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredAlerts.map((alert) => (
                  <tr
                    key={alert.id}
                    className="hover:bg-blue-50/40 transition-colors duration-150 group"
                  >
                    {/* Alert ID */}
                    <td className="py-4.5 px-6 font-extrabold text-slate-900 border-r border-slate-100">
                      <Link
                        to={`/alerts/${alert.id}`}
                        className="text-blue-700 hover:text-blue-900 font-extrabold hover:underline"
                      >
                        #{alert.id}
                      </Link>
                    </td>

                    {/* Student Details */}
                    <td className="py-4.5 px-6 border-r border-slate-100">
                      <Link
                        to={`/students/${alert.student_id}`}
                        className="font-extrabold text-slate-900 hover:text-blue-700 transition-colors block text-sm"
                      >
                        {alert.student_code || `Student #${alert.student_id}`}
                      </Link>
                      <div className="text-[11px] text-slate-600 mt-0.5 font-semibold">
                        {alert.department_name || 'General Faculty'}
                      </div>
                    </td>

                    {/* Warning Type */}
                    <td className="py-4.5 px-6 border-r border-slate-100">
                      <CategoryBadge category={alert.category} />
                    </td>

                    {/* Severity & Urgency */}
                    <td className="py-4.5 px-6 border-r border-slate-100">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <SeverityBadge severity={alert.severity} />
                        <UrgencyBadge urgency={alert.urgency} />
                      </div>
                    </td>

                    {/* Risk Score / Confidence */}
                    <td className="py-4.5 px-6 border-r border-slate-100">
                      <div className="text-sm font-extrabold text-slate-900">{alert.warning_score} pts</div>
                      <div className="text-[11px] text-slate-600 font-semibold">
                        {Math.round(alert.confidence * 100)}% confidence
                      </div>
                    </td>

                    {/* Assigned To (Human Friendly Role) */}
                    <td className="py-4.5 px-6 text-slate-900 border-r border-slate-100">
                      <span className="font-bold text-slate-900 text-xs">
                        {formatAssignedRole(alert.suggested_responder_role)}
                      </span>
                    </td>

                    {/* Status with Colored Status Dots */}
                    <td className="py-4.5 px-6 border-r border-slate-100">
                      <StatusBadge status={alert.status} />
                    </td>

                    {/* Action */}
                    <td className="py-4.5 px-6 text-right">
                      <Link
                        to={`/alerts/${alert.id}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 font-extrabold rounded-xl text-xs border border-blue-300 transition-all duration-150 btn-press group-hover:shadow-xs"
                      >
                        <span>Review</span>
                        <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        )}

        {/* Table Footer with Summary */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {filteredAlerts.length} of {alerts.length} total alerts</span>
          <span className="text-[11px] text-slate-400 font-medium">Access is based on your role</span>
        </div>
      </div>
    </div>
  );
};
