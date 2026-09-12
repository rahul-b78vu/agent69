import React, { useState } from 'react';
import {
  Sparkles,
  Terminal,
  Copy,
  Check,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  GraduationCap,
  CalendarCheck,
  FileCheck,
  Activity,
  DollarSign,
  Layers,
  BookOpen,
  Eye,
} from 'lucide-react';
import { Alert, AlertEvidence } from '../types';
import { CategoryBadge } from './Badges';

interface ParsedSignal {
  name: string;
  signalTypeKey: string;
  baseline: string;
  current: string;
  deviation: string;
  deviationNum?: number;
  strength: 'STRONG' | 'MODERATE' | 'MILD' | string;
  weight: number;
  sustained?: string;
  description?: string;
  baselineNum?: number;
  currentNum?: number;
  isPercent: boolean;
  isFinancial: boolean;
}

interface ParsedNarrative {
  signals: ParsedSignal[];
  combinedScore?: string;
  confidence?: string;
  classification?: string;
  severity?: string;
  recommendedResponse?: string;
  notice?: string;
}

interface ExplainabilityAuditProps {
  alert: Alert;
}

export const ExplainabilityAudit: React.FC<ExplainabilityAuditProps> = ({ alert }) => {
  const [viewMode, setViewMode] = useState<'VISUAL' | 'RAW'>('VISUAL');
  const [copied, setCopied] = useState(false);

  // Parse the narrative_summary deterministic string into structured data
  const parseNarrative = (text: string, evidenceList: AlertEvidence[] = []): ParsedNarrative => {
    const result: ParsedNarrative = { signals: [] };
    if (!text) return result;

    const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);

    for (const block of blocks) {
      if (block.toUpperCase().includes('WHY THIS ALERT WAS GENERATED') && !block.includes(':')) {
        continue;
      }

      // Meta section
      if (block.includes('Combined score =') || block.includes('Combined score=')) {
        const lines = block.split('\n');
        for (const line of lines) {
          const [k, ...v] = line.split('=');
          if (k && v.length) {
            const key = k.trim().toLowerCase();
            const val = v.join('=').trim();
            if (key === 'combined score') result.combinedScore = val;
            if (key === 'confidence') result.confidence = val;
            if (key === 'classification') result.classification = val;
            if (key === 'severity') result.severity = val;
            if (key === 'recommended response') result.recommendedResponse = val;
          }
        }
        continue;
      }

      // Notice / Note section
      if (block.startsWith('Final notice:') || block.startsWith('Note:')) {
        result.notice = block.replace(/^(Final notice:|Note:)\s*/i, '').trim();
        continue;
      }

      // Signal section
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
      const headerLine = lines[0];
      if (headerLine.endsWith(':') || (!headerLine.includes('=') && lines.length > 1)) {
        const rawName = headerLine.replace(':', '').trim();
        const signalObj: Partial<ParsedSignal> = {
          name: rawName,
          signalTypeKey: rawName.toUpperCase().replace(/\s+/g, '_'),
          weight: 1,
          strength: 'MODERATE',
          isPercent: false,
          isFinancial: false,
        };

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (line.startsWith('Baseline =')) {
            signalObj.baseline = line.split('=')[1].trim();
          } else if (line.startsWith('Current =')) {
            signalObj.current = line.split('=')[1].trim();
          } else if (line.startsWith('Deviation =')) {
            const devPart = line.split('=')[1].trim();
            signalObj.deviation = devPart;

            // Extract numeric deviation
            const devMatch = devPart.match(/([+-]?[\d\.]+)/);
            if (devMatch) {
              signalObj.deviationNum = parseFloat(devMatch[1]);
            }

            // Extract Strength
            const strMatch = devPart.match(/Strength:\s*([A-Za-z]+)/i);
            if (strMatch) {
              signalObj.strength = strMatch[1].toUpperCase();
            }

            // Extract Weight
            const wMatch = devPart.match(/Weight:\s*(\d+)/i);
            if (wMatch) {
              signalObj.weight = parseInt(wMatch[1], 10);
            }
          } else if (line.includes('[Sustained pattern:')) {
            const susMatch = line.match(/\[Sustained pattern:\s*([^\]]+)\]/i);
            if (susMatch) {
              signalObj.sustained = susMatch[1].trim();
            }
          }
        }

        // Detect if percent or financial
        if (signalObj.baseline?.includes('%') || signalObj.current?.includes('%')) {
          signalObj.isPercent = true;
          signalObj.baselineNum = parseFloat(signalObj.baseline?.replace('%', '') || '0');
          signalObj.currentNum = parseFloat(signalObj.current?.replace('%', '') || '0');
        } else if (signalObj.baseline?.includes('overdue') || signalObj.current?.includes('overdue')) {
          signalObj.isFinancial = true;
          signalObj.baselineNum = 0;
          const curDigits = signalObj.current?.replace(/[^0-9.]/g, '');
          signalObj.currentNum = curDigits ? parseFloat(curDigits) : 0;
        } else {
          signalObj.baselineNum = parseFloat(signalObj.baseline || '0');
          signalObj.currentNum = parseFloat(signalObj.current || '0');
        }

        // Match with evidence list for enhanced description
        const matchedEv = evidenceList.find(
          (ev) =>
            ev.signal_type.toUpperCase().includes(signalObj.signalTypeKey!) ||
            signalObj.signalTypeKey!.includes(ev.signal_type.toUpperCase())
        );
        if (matchedEv) {
          signalObj.description = matchedEv.description;
          if (matchedEv.weight_applied) signalObj.weight = matchedEv.weight_applied;
          if (matchedEv.strength) signalObj.strength = matchedEv.strength.toUpperCase();
        }

        result.signals.push(signalObj as ParsedSignal);
      }
    }

    return result;
  };

  const parsed = parseNarrative(alert.narrative_summary, alert.evidence);

  const handleCopyRaw = async () => {
    try {
      await navigator.clipboard.writeText(alert.narrative_summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  const getSignalIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('mark') || lower.includes('exam') || lower.includes('grade')) {
      return <GraduationCap className="w-5 h-5 text-indigo-600" />;
    }
    if (lower.includes('attend')) {
      return <CalendarCheck className="w-5 h-5 text-sky-600" />;
    }
    if (lower.includes('assign')) {
      return <FileCheck className="w-5 h-5 text-emerald-600" />;
    }
    if (lower.includes('engage') || lower.includes('lms')) {
      return <Activity className="w-5 h-5 text-purple-600" />;
    }
    if (lower.includes('fee') || lower.includes('finan')) {
      return <DollarSign className="w-5 h-5 text-amber-600" />;
    }
    if (lower.includes('backlog')) {
      return <Layers className="w-5 h-5 text-rose-600" />;
    }
    if (lower.includes('library')) {
      return <BookOpen className="w-5 h-5 text-teal-600" />;
    }
    return <Eye className="w-5 h-5 text-blue-600" />;
  };

  const getStrengthBadge = (strength: string) => {
    const s = strength.toUpperCase();
    if (s === 'STRONG') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          STRONG DEVIATION
        </span>
      );
    }
    if (s === 'MODERATE') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          MODERATE DEVIATION
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
        MILD DEVIATION
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
      {/* Header Bar */}
      <div className="p-5 md:p-6 bg-gradient-to-r from-slate-50 via-white to-blue-50/30 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-600 flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 text-base">Why This Alert Was Generated</h3>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 uppercase tracking-wide">
                Explainability Audit
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Deterministic multi-signal correlation evaluated strictly against personal historical baseline
            </p>
          </div>
        </div>

        {/* View Mode Toggle & Copy */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 text-xs">
            <button
              onClick={() => setViewMode('VISUAL')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                viewMode === 'VISUAL'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Visual Breakdown</span>
            </button>
            <button
              onClick={() => setViewMode('RAW')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                viewMode === 'RAW'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Raw System Log</span>
            </button>
          </div>

          <button
            onClick={handleCopyRaw}
            title="Copy audit explainability text"
            className="p-2 text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200/80 transition-all cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-5 md:p-6 space-y-6">
        {viewMode === 'VISUAL' ? (
          <>
            {/* Contributing Signals Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Contributing Signals &amp; Deviation Gauges ({parsed.signals.length} Active)
                </span>
                <span className="text-[11px] text-slate-500">Compared to individual self-baseline</span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {parsed.signals.map((sig, idx) => {
                  const isNegative = sig.deviationNum !== undefined ? sig.deviationNum < 0 : false;
                  return (
                    <div
                      key={idx}
                      className="bg-slate-50/70 hover:bg-slate-50/90 rounded-xl border border-slate-200/90 p-4 sm:p-5 transition-all space-y-3.5 hover:border-blue-300 hover:shadow-xs"
                    >
                      {/* Signal Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-lg bg-white border border-slate-200/80 shadow-xs">
                            {getSignalIcon(sig.name)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 text-sm">{sig.name}</span>
                            <span className="text-[11px] text-slate-400 ml-2 font-normal">
                              Evaluated Parameter
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {getStrengthBadge(sig.strength)}
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            +{sig.weight} pts impact
                          </span>
                        </div>
                      </div>

                      {/* 3-Column Metrics Comparison Strip */}
                      <div className="grid grid-cols-3 gap-2 sm:gap-4 bg-white p-3.5 rounded-xl border border-slate-200/70">
                        {/* Baseline */}
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Personal Baseline
                          </span>
                          <span className="text-base sm:text-lg font-bold text-slate-800">
                            {sig.baseline}
                          </span>
                          <span className="text-[10px] text-slate-500 block">Historical benchmark</span>
                        </div>

                        {/* Observed Change / Deviation */}
                        <div className="space-y-0.5 border-x border-slate-100 px-2 sm:px-4 text-center">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Observed Deviation
                          </span>
                          <div className="flex items-center justify-center gap-1">
                            {isNegative ? (
                              <TrendingDown className="w-4 h-4 text-rose-600 shrink-0" />
                            ) : (
                              <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
                            )}
                            <span
                              className={`text-base sm:text-lg font-black ${
                                isNegative ? 'text-rose-600' : 'text-slate-800'
                              }`}
                            >
                              {sig.deviationNum !== undefined
                                ? `${sig.deviationNum > 0 ? '+' : ''}${sig.deviationNum}${
                                    sig.isPercent ? '%' : ''
                                  }`
                                : sig.deviation.split(' ')[0]}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 block">Net shift vs baseline</span>
                        </div>

                        {/* Current Value */}
                        <div className="space-y-0.5 text-right">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Current Period
                          </span>
                          <span className="text-base sm:text-lg font-bold text-slate-900">
                            {sig.current}
                          </span>
                          <span className="text-[10px] text-slate-500 block">Latest monitored cycle</span>
                        </div>
                      </div>

                      {/* Visual Comparison Gauge for Percentages */}
                      {sig.isPercent && sig.baselineNum !== undefined && sig.currentNum !== undefined && (
                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                              Current: {sig.currentNum.toFixed(1)}%
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" />
                              Baseline: {sig.baselineNum.toFixed(1)}%
                            </span>
                          </div>

                          <div className="relative w-full h-3 bg-slate-200/90 rounded-full overflow-hidden">
                            {/* Current fill bar */}
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-rose-600 transition-all duration-700"
                              style={{ width: `${Math.min(100, Math.max(0, sig.currentNum))}%` }}
                            />

                            {/* Baseline flag marker */}
                            <div
                              className="absolute top-0 bottom-0 w-1 bg-slate-800 shadow-sm z-10"
                              style={{ left: `${Math.min(99, Math.max(1, sig.baselineNum))}%` }}
                              title={`Personal Baseline: ${sig.baselineNum}%`}
                            />
                          </div>
                        </div>
                      )}

                      {/* Sustained Pattern Notice */}
                      {sig.sustained && (
                        <div className="flex items-center gap-2 p-2.5 bg-amber-50/80 border border-amber-200/90 rounded-lg text-xs text-amber-900 font-medium">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>
                            <strong>Sustained Trend:</strong> Consistent pattern across{' '}
                            <strong>{sig.sustained}</strong>. This indicates an enduring trend rather than a transient anomaly.
                          </span>
                        </div>
                      )}

                      {/* Evidence Description if available */}
                      {sig.description && (
                        <p className="text-xs text-slate-600 font-normal leading-relaxed pt-1">
                          {sig.description}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Decision Parameters Strip */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Aggregated Decision Parameters
              </span>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-3.5 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Warning Score
                  </span>
                  <span className="text-lg font-black text-blue-700 mt-0.5 block">
                    {parsed.combinedScore || `${alert.warning_score} pts`}
                  </span>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden mt-1.5">
                    <div
                      className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600"
                      style={{
                        width: `${Math.min(100, (alert.warning_score / 120) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-3.5 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Confidence
                  </span>
                  <span className="text-lg font-bold text-slate-900 mt-0.5 block">
                    {parsed.confidence || `${Math.round(alert.confidence * 100)}%`}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-1">Multi-signal fidelity</span>
                </div>

                <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-3.5 text-center flex flex-col items-center justify-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Classification
                  </span>
                  <CategoryBadge category={alert.category} />
                </div>

                <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-3.5 text-center flex flex-col items-center justify-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Suggested Routing
                  </span>
                  <span className="font-bold text-xs text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                    {parsed.recommendedResponse || `${alert.suggested_responder_role} Review`}
                  </span>
                </div>
              </div>
            </div>

            {/* Human-in-the-Loop Protocol Card */}
            <div className="p-4 bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-blue-50/30 rounded-xl border border-blue-200/80 text-xs text-blue-950 flex items-start gap-3 shadow-2xs">
              <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block text-blue-900">
                  Ethical Protocol &amp; Human-in-the-Loop Notice
                </span>
                <p className="leading-relaxed text-slate-700">
                  {parsed.notice ||
                    'This alert represents an observed behavioral pattern requiring qualified human review. The early-warning engine does NOT make autonomous pass/fail, disciplinary, or punitive decisions.'}
                </p>
              </div>
            </div>
          </>
        ) : (
          /* Raw System Log View */
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold">Raw Audit Trail Output (Archival &amp; Compliance)</span>
              <span>UTF-8 Monospace Format</span>
            </div>

            <div className="relative group">
              <pre className="bg-slate-950 text-emerald-400 font-mono text-xs p-5 rounded-xl leading-relaxed whitespace-pre-wrap border border-slate-800 shadow-inner overflow-x-auto selection:bg-emerald-900 selection:text-white">
                {alert.narrative_summary}
              </pre>

              <button
                onClick={handleCopyRaw}
                className="absolute top-3 right-3 px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold rounded-lg border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Raw</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
