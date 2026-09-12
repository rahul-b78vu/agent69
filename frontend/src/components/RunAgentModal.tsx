import React, { useState } from 'react';
import { X, Play, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { agentApi } from '../services/api';

interface RunAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RunAgentModal: React.FC<RunAgentModalProps> = ({ isOpen, onClose }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [week, setWeek] = useState(12);
  const [cutoffWeek, setCutoffWeek] = useState(4);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRunAgent = async () => {
    setIsRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await agentApi.runCohort({
        week_number: Number(week),
        baseline_cutoff_week: Number(cutoffWeek),
      });
      setResult(res);
      // Reload page after 1.5s or keep result visible
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to execute Agent 69 cohort run');
    } finally {
      setIsRunning(false);
    }
  };

  const handleReseed = async () => {
    if (!confirm('This will wipe and re-generate 120 synthetic students with 12 weeks of signal records. Continue?')) {
      return;
    }
    setIsRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await agentApi.reseedData(120);
      setResult({ reseeded: true, data: res.data });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reseed synthetic data');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-modal-pop">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
            <Play className="w-4 h-4 text-indigo-600 fill-current" />
            Trigger Agent 69 Pipeline
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Execute the complete early-warning pipeline: calculates personal historical baselines, scans for multi-signal deviations, determines severity/urgency, and routes alerts for authorized human review.
          </p>

          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-lg border border-slate-200/70 text-xs">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Target Evaluation Week</label>
              <select
                value={week}
                onChange={(e) => setWeek(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-semibold text-slate-800"
              >
                {[5, 6, 7, 8, 9, 10, 11, 12].map((w) => (
                  <option key={w} value={w}>
                    Week {w} (Mid/Late Semester)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Baseline Cutoff Period</label>
              <select
                value={cutoffWeek}
                onChange={(e) => setCutoffWeek(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-semibold text-slate-800"
              >
                <option value={4}>Weeks 1–4 (Stable Baseline)</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-md text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {result && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-xs space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Pipeline Execution Complete!
              </div>
              {result.reseeded ? (
                <p>Generated {result.data?.students} students across 3 departments.</p>
              ) : (
                <p>
                  Evaluated {result.students_evaluated} students. Produced {result.alerts_generated_count} early warning alerts.
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleReseed}
              disabled={isRunning}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-300 rounded-md hover:bg-slate-50 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              Re-seed 120 Students
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md"
              >
                {result ? 'Done' : 'Cancel'}
              </button>
              <button
                onClick={handleRunAgent}
                disabled={isRunning}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-md shadow transition disabled:opacity-50"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Executing Pipeline...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Run Agent 69
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
