import React, { useEffect, useState } from 'react';
import { ShieldCheck, Save, CheckCircle2, AlertCircle, RefreshCw, Sliders } from 'lucide-react';
import { settingsApi } from '../services/api';
import { ThresholdConfig } from '../types';
import { useAuth } from '../contexts/AuthContext';

export const Settings: React.FC = () => {
  const { hasRole } = useAuth();
  const [configs, setConfigs] = useState<ThresholdConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [editValues, setEditValues] = useState<Record<number, number>>({});

  const isAdmin = hasRole('ADMIN');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await settingsApi.getThresholds();
      setConfigs(data);
      const initialMap: Record<number, number> = {};
      data.forEach((c) => {
        initialMap[c.id] = c.value;
      });
      setEditValues(initialMap);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (id: number, val: number) => {
    setEditValues({ ...editValues, [id]: val });
  };

  const handleSave = async (id: number) => {
    setSavingId(id);
    setFeedback(null);
    try {
      const newVal = editValues[id];
      const updated = await settingsApi.updateThreshold(id, newVal);
      setConfigs(configs.map((c) => (c.id === id ? updated : c)));
      setFeedback({ type: 'success', msg: `Threshold '${updated.key}' updated to ${updated.value}.` });
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.response?.data?.detail || 'Failed to update threshold' });
    } finally {
      setSavingId(null);
    }
  };

  // Group by category
  const categories = ['weight', 'deviation', 'severity', 'response_window', 'baseline'];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
          Thresholds, Weights & SLA Settings
        </h1>
        <p className="text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
          Database-backed configuration for Agent 69. Tune weights and sensitivity bands without code redeployment.
        </p>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center gap-2.5 animate-slide-down ${
            feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
          <span>{feedback.msg}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] py-20">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
          <div className="text-xs font-semibold text-slate-500">Loading configurations...</div>
        </div>
      ) : (
        <div className="space-y-8">
          {categories.map((cat) => {
            const catConfigs = configs.filter((c) => c.category === cat);
            if (catConfigs.length === 0) return null;

            const titleMap: Record<string, string> = {
              weight: 'Signal Scoring Weights (Multi-Signal Correlation Engine)',
              deviation: 'Deviation Detection Cutoffs (Percentage drop thresholds)',
              severity: 'Severity Classification Bands (Warning score cutoffs)',
              response_window: 'SLA Response Windows (Hours until escalation)',
              baseline: 'Personal Baseline Engine Parameters',
            };

            return (
              <div key={cat} className="bg-white rounded-2xl border border-slate-200/90 p-6 md:p-8 shadow-2xs space-y-6">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-blue-600" />
                    <span>{titleMap[cat] || cat}</span>
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {catConfigs.map((cfg) => {
                    const isSaving = savingId === cfg.id;
                    const currentValue = editValues[cfg.id] !== undefined ? editValues[cfg.id] : cfg.value;
                    const isChanged = currentValue !== cfg.value;

                    return (
                      <div
                        key={cfg.id}
                        className="p-5 bg-slate-50/80 rounded-xl border border-slate-200/80 flex flex-col justify-between gap-4 text-xs interactive-card-sm hover:border-blue-300 hover:bg-blue-50/10 transition-all duration-150"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-900 text-sm">{cfg.key}</span>
                            {cfg.is_recommended_change && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                Proposed: {cfg.recommended_value}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">{cfg.description || 'Configurable setting.'}</p>
                        </div>

                        <div className="flex items-center gap-3 pt-3 border-t border-slate-200/60">
                          <input
                            type="number"
                            step="any"
                            disabled={!isAdmin}
                            value={currentValue}
                            onChange={(e) => handleValueChange(cfg.id, parseFloat(e.target.value) || 0)}
                            className="w-28 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />

                          {isAdmin && (
                            <button
                              onClick={() => handleSave(cfg.id)}
                              disabled={!isChanged || isSaving}
                              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                                isChanged
                                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                              }`}
                            >
                              {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                              <span>Save</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
