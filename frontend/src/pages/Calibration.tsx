import React, { useEffect, useState } from 'react';
import {
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Play,
  ShieldCheck,
  Clock,
  ArrowRight,
  TrendingUp,
  XCircle,
  Sparkles,
  Award,
} from 'lucide-react';
import { calibrationApi } from '../services/api';
import { CalibrationRun } from '../types';
import { useAuth } from '../contexts/AuthContext';

export const Calibration: React.FC = () => {
  const { hasRole } = useAuth();
  const [runs, setRuns] = useState<CalibrationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const isAdmin = hasRole('ADMIN');

  useEffect(() => {
    loadCalibrationRuns();
  }, []);

  const loadCalibrationRuns = async () => {
    setLoading(true);
    try {
      const data = await calibrationApi.list();
      setRuns(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerRun = async () => {
    setIsRunning(true);
    setFeedback(null);
    try {
      const newRun = await calibrationApi.run();
      setRuns([newRun, ...runs]);
      setFeedback({ type: 'success', msg: 'Semester calibration analysis successfully executed.' });
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.response?.data?.detail || 'Failed to run calibration' });
    } finally {
      setIsRunning(false);
    }
  };

  const handleApproval = async (runId: number, approved: boolean) => {
    setFeedback(null);
    try {
      const updated = await calibrationApi.approve(runId, approved);
      setRuns(runs.map((r) => (r.id === runId ? updated : r)));
      setFeedback({
        type: 'success',
        msg: approved
          ? 'Recommended threshold changes approved and applied to production.'
          : 'Calibration recommendations rejected.',
      });
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.response?.data?.detail || 'Failed to decide calibration' });
    }
  };

  const latestRun = runs[0];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            Semester Threshold Calibration
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
            Empirically refines detection thresholds based on human-recorded outcomes. Recommended adjustments never apply automatically without administrator sign-off.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleTriggerRun}
            disabled={isRunning}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-600 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all btn-press cursor-pointer disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'Analyzing Outcomes...' : 'Run Semester Calibration'}</span>
          </button>
        )}
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center gap-2.5 animate-slide-down ${
            feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* Latest Run Overview */}
      {latestRun && (
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200/90 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">Latest Evaluation</span>
              <h3 className="text-lg font-bold text-slate-900 mt-0.5">Calibration Run #{latestRun.id}</h3>
              <p className="text-xs text-slate-400">Completed on {new Date(latestRun.run_at).toLocaleString()}</p>
            </div>
            <div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  latestRun.status === 'APPLIED'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : latestRun.status === 'RECOMMENDATIONS_PENDING'
                    ? 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {latestRun.status.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Total Alerts Evaluated</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">{latestRun.total_alerts}</span>
            </div>
            <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Confirmed Concerns</span>
              <span className="text-2xl font-black text-emerald-600 mt-1 block">{latestRun.confirmed_concerns}</span>
            </div>
            <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">False Positive Rate</span>
              <span className="text-2xl font-black text-amber-600 mt-1 block">{latestRun.false_positive_rate}%</span>
            </div>
            <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Avg Response Time</span>
              <span className="text-2xl font-black text-blue-600 mt-1 block">{latestRun.avg_response_time_hours} hrs</span>
            </div>
          </div>

          {/* Recommended Calibration Card */}
          <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs text-blue-950 uppercase tracking-wide">
                <Sliders className="w-4 h-4 text-blue-600" />
                <span>Recommended Calibration & Threshold Proposals</span>
              </div>
              <span className="text-[10px] font-bold text-blue-700 bg-white px-2.5 py-1 rounded-md border border-blue-200 shadow-2xs">
                Requires Administrator Approval
              </span>
            </div>

            {latestRun.recommendations && latestRun.recommendations.length > 0 ? (
              <div className="space-y-3">
                {latestRun.recommendations.map((rec: any, idx: number) => (
                  <div key={idx} className="bg-white p-4 rounded-xl border border-blue-100 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs shadow-2xs">
                    <div className="space-y-1">
                      <span className="font-bold text-slate-900 text-sm">{rec.key}</span>
                      <p className="text-slate-600 text-xs">{rec.reason}</p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <span className="text-slate-400 block text-[10px] font-bold uppercase">CURRENT</span>
                        <span className="font-semibold text-slate-700 text-sm">{rec.current_value}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                      <div className="text-left">
                        <span className="text-blue-600 block text-[10px] font-bold uppercase">PROPOSED</span>
                        <span className="font-black text-blue-700 text-sm">{rec.recommended_value}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Administrator Approval Buttons */}
                {isAdmin && latestRun.status === 'RECOMMENDATIONS_PENDING' && (
                  <div className="pt-3 flex items-center justify-end gap-3">
                    <button
                      onClick={() => handleApproval(latestRun.id, false)}
                      className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Reject Recommendations
                    </button>
                    <button
                      onClick={() => handleApproval(latestRun.id, true)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                    >
                      Approve & Apply to Production
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-blue-700 font-medium">No threshold adjustments needed; current precision is optimal.</p>
            )}
          </div>
        </div>
      )}

      {/* Historical Calibration Runs Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Calibration Run History</h3>
        </div>
        {runs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">No calibration runs recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-4 px-6 border-r border-slate-100">Run ID</th>
                  <th className="py-4 px-6 border-r border-slate-100">Date</th>
                  <th className="py-4 px-6 text-center border-r border-slate-100">Total Alerts</th>
                  <th className="py-4 px-6 text-center border-r border-slate-100">Confirmed Concerns</th>
                  <th className="py-4 px-6 text-center border-r border-slate-100">FP Rate %</th>
                  <th className="py-4 px-6 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {runs.map((r) => (
                  <tr key={r.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-900 border-r border-slate-100">#{r.id}</td>
                    <td className="py-4 px-6 text-slate-500 border-r border-slate-100">{new Date(r.run_at).toLocaleDateString()}</td>
                    <td className="py-4 px-6 text-center font-semibold text-slate-800 border-r border-slate-100">{r.total_alerts}</td>
                    <td className="py-4 px-6 text-center font-bold text-emerald-600 border-r border-slate-100">{r.confirmed_concerns}</td>
                    <td className="py-4 px-6 text-center font-bold text-amber-600 border-r border-slate-100">{r.false_positive_rate}%</td>
                    <td className="py-4 px-6 text-right">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {r.status}
                      </span>
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
