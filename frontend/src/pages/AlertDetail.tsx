import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  UserCheck,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  FileText,
  Send,
  HelpCircle,
  TrendingUp,
  XCircle,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';
import { alertsApi } from '../services/api';
import { Alert, OutcomeChoice } from '../types';
import { SeverityBadge, StatusBadge, CategoryBadge, UrgencyBadge } from '../components/Badges';
import { ExplainabilityAudit } from '../components/ExplainabilityAudit';
import { useAuth } from '../contexts/AuthContext';

export const AlertDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [alert, setAlert] = useState<Alert | null>(null);
  const [loading, setLoading] = useState(true);

  // Workflow form states
  const [noteText, setNoteText] = useState('');
  const [actionText, setActionText] = useState('');
  const [selectedOutcome, setSelectedOutcome] = useState<OutcomeChoice>('CONCERN_CONFIRMED');
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [fpReason, setFpReason] = useState('');
  const [escalateReason, setEscalateReason] = useState('');

  const [activeTab, setActiveTab] = useState<'ACTIONS' | 'RESOLVE' | 'ESCALATE' | 'FALSE_POSITIVE'>('ACTIONS');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    if (id) {
      loadAlert(Number(id));
    }
  }, [id]);

  const loadAlert = async (alertId: number) => {
    setLoading(true);
    try {
      const data = await alertsApi.getDetail(alertId);
      setAlert(data);
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

  const handleAcknowledge = async () => {
    if (!alert) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const updated = await alertsApi.acknowledge(alert.id, 'Alert acknowledged by responder.');
      setAlert(updated);
      setFeedback({ type: 'success', msg: 'Alert acknowledged. Status updated to ACKNOWLEDGED.' });
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.response?.data?.detail || 'Failed to acknowledge alert' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alert || !noteText.trim()) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      await alertsApi.addResponse(alert.id, noteText);
      setNoteText('');
      await loadAlert(alert.id);
      setFeedback({ type: 'success', msg: 'Observation note appended to alert record.' });
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.response?.data?.detail || 'Failed to add note' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alert || !actionText.trim()) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const updated = await alertsApi.recordAction(alert.id, actionText);
      setActionText('');
      setAlert(updated);
      setFeedback({ type: 'success', msg: 'Intervention action recorded. Status updated to ACTION_TAKEN.' });
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.response?.data?.detail || 'Failed to record action' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveOutcome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alert) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      await alertsApi.resolve(alert.id, {
        outcome: selectedOutcome,
        action_taken: 'Human intervention finalized',
        concern_was_real: selectedOutcome !== 'NO_CONCERN_FOUND' && selectedOutcome !== 'FALSE_POSITIVE',
        intervention_useful: true,
        notes: outcomeNotes,
      });
      await loadAlert(alert.id);
      setFeedback({ type: 'success', msg: `Alert resolved with outcome: ${selectedOutcome}.` });
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.response?.data?.detail || 'Failed to resolve alert' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkFalsePositive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alert || !fpReason.trim()) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      await alertsApi.markFalsePositive(alert.id, fpReason);
      setFpReason('');
      await loadAlert(alert.id);
      setFeedback({ type: 'success', msg: 'Alert marked as FALSE_POSITIVE. Calibration statistics updated.' });
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.response?.data?.detail || 'Failed to record false positive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEscalate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alert || !escalateReason.trim()) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      await alertsApi.escalate(alert.id, { reason: escalateReason });
      setEscalateReason('');
      await loadAlert(alert.id);
      setFeedback({ type: 'success', msg: 'Alert escalated to higher leadership tier.' });
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.response?.data?.detail || 'Failed to escalate alert' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !alert) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] py-20">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
        <div className="text-xs font-semibold text-slate-500">Loading alert explainability and evidence...</div>
      </div>
    );
  }

  const isResolved = alert.status === 'RESOLVED' || alert.status === 'FALSE_POSITIVE';

  return (
    <div className="space-y-8">
      {/* Back Link & Header */}
      <div className="space-y-4">
        <Link
          to="/alerts"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Alerts Queue</span>
        </Link>

        {/* Alert Overview Card */}
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-2">
              <span className="font-bold text-xl text-slate-900">Alert #{alert.id}</span>
              <CategoryBadge category={alert.category} />
              <SeverityBadge severity={alert.severity} />
              <UrgencyBadge urgency={alert.urgency} />
              <StatusBadge status={alert.status} />
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Student:{' '}
              <Link to={`/students/${alert.student_id}`} className="font-bold text-blue-600 hover:text-blue-800 hover:underline">
                {alert.student_code}
              </Link>{' '}
              &bull; {alert.department_name} &bull; Generated: {new Date(alert.created_at).toLocaleString()}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="bg-slate-50/80 px-4 py-3 rounded-xl border border-slate-200/80 text-center min-w-[110px]">
              <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">RISK SCORE</span>
              <span className="font-black text-blue-700 text-base mt-0.5 block">{alert.warning_score} pts</span>
              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden mt-1.5">
                <div
                  className="h-1.5 rounded-full transition-all duration-1000 ease-out bg-gradient-to-r from-amber-500 to-rose-600"
                  style={{ width: `${Math.min(100, (alert.warning_score / 120) * 100)}%` }}
                />
              </div>
            </div>

            <div className="bg-slate-50/80 px-4 py-3 rounded-xl border border-slate-200/80 text-center min-w-[100px]">
              <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">CONFIDENCE</span>
              <span className="font-bold text-slate-900 text-sm mt-0.5 block">{Math.round(alert.confidence * 100)}%</span>
            </div>

            <div className="bg-slate-50/80 px-4 py-3 rounded-xl border border-slate-200/80 text-center min-w-[120px]">
              <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">ASSIGNED TO</span>
              <span className="font-bold text-slate-900 text-sm mt-0.5 block">{formatAssignedRole(alert.suggested_responder_role)}</span>
            </div>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center gap-2.5 animate-slide-down ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* Main 2-Column Layout */}
      <div className="grid md:grid-cols-5 gap-8">
        {/* Left 3 cols: Explainability Audit & Contributing Signals */}
        <div className="md:col-span-3 space-y-6">
          <ExplainabilityAudit alert={alert} />
        </div>

        {/* Right 2 cols: Human Response Workflow Toolbar */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-5 sticky top-24">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <span>Human Response Console</span>
              </h3>
              <span className="text-[11px] text-slate-400">Responder: {user?.full_name}</span>
            </div>

            {/* Acknowledge Button if NEW */}
            {alert.status === 'NEW' && (
              <button
                onClick={handleAcknowledge}
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Acknowledge Alert (Start Review)</span>
              </button>
            )}

            {/* Workflow Action Tabs */}
            <div className="flex bg-slate-100/90 p-1 rounded-xl border border-slate-200/90 text-xs shadow-inner">
              <button
                onClick={() => setActiveTab('ACTIONS')}
                className={`flex-1 py-1.5 rounded-lg font-bold text-center transition-all ${
                  activeTab === 'ACTIONS' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-blue-600'
                }`}
              >
                Notes
              </button>
              <button
                onClick={() => setActiveTab('RESOLVE')}
                className={`flex-1 py-1.5 rounded-lg font-bold text-center transition-all ${
                  activeTab === 'RESOLVE' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-blue-600'
                }`}
              >
                Resolve
              </button>
              <button
                onClick={() => setActiveTab('ESCALATE')}
                className={`flex-1 py-1.5 rounded-lg font-bold text-center transition-all ${
                  activeTab === 'ESCALATE' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600 hover:text-rose-600'
                }`}
              >
                Escalate
              </button>
              <button
                onClick={() => setActiveTab('FALSE_POSITIVE')}
                className={`flex-1 py-1.5 rounded-lg font-bold text-center transition-all ${
                  activeTab === 'FALSE_POSITIVE' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                False +
              </button>
            </div>

            {/* Tab 1: Notes & Actions */}
            {activeTab === 'ACTIONS' && (
              <div className="space-y-4 pt-1">
                <form onSubmit={handleAddNote} className="space-y-2.5">
                  <label className="block text-xs font-bold text-slate-700">Add Staff Observation Note</label>
                  <textarea
                    rows={2}
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Log student interaction or meeting details..."
                    className="w-full p-3 bg-slate-50/80 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    required
                  />
                  <button
                    type="submit"
                    disabled={submitting || isResolved}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                  >
                    Add Note
                  </button>
                </form>

                <form onSubmit={handleRecordAction} className="space-y-2.5 pt-4 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-700">Record Intervention Action</label>
                  <input
                    type="text"
                    value={actionText}
                    onChange={(e) => setActionText(e.target.value)}
                    placeholder="e.g. Scheduled mentor tutoring check-in"
                    className="w-full p-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    required
                  />
                  <button
                    type="submit"
                    disabled={submitting || isResolved}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                  >
                    Record Action (Mark Action Taken)
                  </button>
                </form>
              </div>
            )}

            {/* Tab 2: Resolve with Human Outcome */}
            {activeTab === 'RESOLVE' && (
              <form onSubmit={handleResolveOutcome} className="space-y-3.5 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Human Outcome Choice</label>
                  <select
                    value={selectedOutcome}
                    onChange={(e) => setSelectedOutcome(e.target.value as OutcomeChoice)}
                    className="w-full p-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="CONCERN_CONFIRMED">Concern Confirmed</option>
                    <option value="STUDENT_REQUESTED_SUPPORT">Student Requested Support</option>
                    <option value="ACADEMIC_SUPPORT_PROVIDED">Academic Support Provided</option>
                    <option value="FINANCIAL_SUPPORT_PROVIDED">Financial Support Provided</option>
                    <option value="COUNSELLING_REFERRAL">Counselling / Support Referral</option>
                    <option value="NO_CONCERN_FOUND">No Concern Found</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Resolution Summary Notes</label>
                  <textarea
                    rows={3}
                    value={outcomeNotes}
                    onChange={(e) => setOutcomeNotes(e.target.value)}
                    placeholder="Summarize the human evaluation and support provided..."
                    className="w-full p-3 bg-slate-50/80 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || isResolved}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  Finalize & Resolve Alert
                </button>
              </form>
            )}

            {/* Tab 3: Escalate */}
            {activeTab === 'ESCALATE' && (
              <form onSubmit={handleEscalate} className="space-y-3.5 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Escalation Justification</label>
                  <textarea
                    rows={3}
                    value={escalateReason}
                    onChange={(e) => setEscalateReason(e.target.value)}
                    placeholder="Provide reason for escalating to Department Head or Dean..."
                    className="w-full p-3 bg-slate-50/80 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting || isResolved}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  Escalate to Next Role Tier
                </button>
              </form>
            )}

            {/* Tab 4: Mark False Positive */}
            {activeTab === 'FALSE_POSITIVE' && (
              <form onSubmit={handleMarkFalsePositive} className="space-y-3.5 pt-1">
                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 text-xs text-slate-600 leading-relaxed">
                  Marking an alert as a false positive records that the observation was anomalous or non-actionable, feeding into the calibration engine to refine future thresholds.
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Reason for False Positive</label>
                  <textarea
                    rows={3}
                    value={fpReason}
                    onChange={(e) => setFpReason(e.target.value)}
                    placeholder="e.g. Student was on university-approved sports leave..."
                    className="w-full p-3 bg-slate-50/80 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting || isResolved}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  Record as False Positive
                </button>
              </form>
            )}

            {/* Outcome Display if Resolved */}
            {alert.outcome && (
              <div className="mt-4 p-4 rounded-xl bg-emerald-50/90 border border-emerald-200 text-xs space-y-1">
                <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Recorded Outcome: {alert.outcome.outcome}</span>
                </div>
                <p className="text-emerald-800">{alert.outcome.notes}</p>
                <div className="text-[10px] text-emerald-600 pt-1 font-medium">
                  Recorded at: {new Date(alert.outcome.recorded_at).toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
