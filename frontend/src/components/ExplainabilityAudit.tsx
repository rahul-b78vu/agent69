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
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black tracking-wide bg-gradient-to-r from-rose-50 to-red-50 text-rose-700 border border-rose-200/90 shadow-2xs ring-2 ring-rose-500/10">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
          </span>
          STRONG DEVIATION
        </span>
      );
    }
    if (s === 'MODERATE') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black tracking-wide bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 border border-amber-200/90 shadow-2xs ring-2 ring-amber-500/10">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          MODERATE DEVIATION
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black tracking-wide bg-gradient-to-r from-blue-50 to-sky-50 text-blue-700 border border-blue-200/90 shadow-2xs">
        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
        MILD DEVIATION
      </span>
    );
  };

  return (
    <div className="explain-audit-shell">
      {/* Header Bar */}
      <div className="p-5 md:p-6 bg-gradient-to-r from-slate-50/90 via-white to-blue-50/40 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 text-white shadow-md shadow-blue-500/25 shrink-0 group">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <div className="absolute -inset-0.5 rounded-2xl bg-blue-500/20 blur-xs -z-10" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-slate-900 text-base tracking-tight">Why This Alert Was Generated</h3>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200/90 uppercase tracking-wider shadow-2xs">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-600"></span>
                </span>
                Explainability Audit
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Deterministic multi-signal correlation evaluated strictly against personal historical baseline
            </p>
          </div>
        </div>

        {/* View Mode Toggle & Copy */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200 text-xs shadow-inner">
            <button
              onClick={() => setViewMode('VISUAL')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === 'VISUAL'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Visual Breakdown</span>
            </button>
            <button
              onClick={() => setViewMode('RAW')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === 'RAW'
                  ? 'bg-white text-blue-700 shadow-sm'
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
            className="p-2 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 rounded-xl border border-slate-200/90 transition-all cursor-pointer shadow-2xs hover:border-slate-300"
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
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Contributing Signals &amp; Deviation Gauges
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100/70 text-blue-700 border border-blue-200">
                    {parsed.signals.length} ACTIVE
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">Compared to individual self-baseline</span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {parsed.signals.map((sig, idx) => {
                  const isNegative = sig.deviationNum !== undefined ? sig.deviationNum < 0 : false;
                  const severityClass = sig.strength?.toLowerCase().includes('strong')
                    ? 'severity-strong'
                    : sig.strength?.toLowerCase().includes('moderate')
                    ? 'severity-moderate'
                    : 'severity-mild';

                  const curPercent = sig.currentNum !== undefined ? Math.min(100, Math.max(0, sig.currentNum)) : 0;
                  const basePercent = sig.baselineNum !== undefined ? Math.min(100, Math.max(0, sig.baselineNum)) : 0;
                  const deficit = sig.baselineNum !== undefined && sig.currentNum !== undefined ? sig.baselineNum - sig.currentNum : 0;

                  return (
                    <div
                      key={idx}
                      className={`explain-signal-card ${severityClass} p-4 sm:p-5 space-y-4`}
                    >
                      {/* Signal Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pl-1">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-center shrink-0">
                            {getSignalIcon(sig.name)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-900 text-base">{sig.name}</span>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200/60">
                                Evaluated Parameter
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 block mt-0.5">
                              Dynamic behavioral trajectory
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {getStrengthBadge(sig.strength)}
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-extrabold bg-indigo-50/90 text-indigo-700 border border-indigo-200/80 shadow-2xs">
                            <Activity className="w-3 h-3 text-indigo-500" />
                            +{sig.weight} pts impact
                          </span>
                        </div>
                      </div>

                      {/* 3-Column Metrics Comparison Strip */}
                      <div className="grid grid-cols-3 gap-2 sm:gap-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
                        {/* Baseline */}
                        <div className="space-y-1 bg-emerald-50/30 p-3 rounded-lg border border-emerald-200/70 shadow-2xs">
                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800/70 block">
                            Personal Baseline
                          </span>
                          <span className="text-xl sm:text-2xl font-black text-emerald-600 tracking-tight block">
                            {sig.baseline}
                          </span>
                          <span className="text-[10px] text-emerald-700/80 font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                            Historical benchmark
                          </span>
                        </div>

                        {/* Observed Change / Deviation */}
                        <div
                          className={`space-y-1 p-3 rounded-lg border shadow-2xs text-center relative overflow-hidden ${
                            isNegative
                              ? 'bg-gradient-to-b from-rose-50/90 to-rose-100/50 border-rose-200/90 text-rose-900'
                              : 'bg-gradient-to-b from-emerald-50/90 to-emerald-100/50 border-emerald-200/90 text-emerald-900'
                          }`}
                        >
                          <span
                            className={`text-[10px] font-black uppercase tracking-wider block ${
                              isNegative ? 'text-rose-500' : 'text-emerald-600'
                            }`}
                          >
                            Observed Deviation
                          </span>
                          <div className="flex items-center justify-center gap-1.5">
                            {isNegative ? (
                              <TrendingDown className="w-5 h-5 text-rose-600 shrink-0 animate-trend-bounce" />
                            ) : (
                              <TrendingUp className="w-5 h-5 text-emerald-600 shrink-0" />
                            )}
                            <span
                              className={`text-xl sm:text-2xl font-black tracking-tight ${
                                isNegative ? 'text-rose-600' : 'text-emerald-700'
                              }`}
                            >
                              {sig.deviationNum !== undefined
                                ? `${sig.deviationNum > 0 ? '+' : ''}${sig.deviationNum}${
                                    sig.isPercent ? '%' : ''
                                  }`
                                : sig.deviation.split(' ')[0]}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-medium block ${
                              isNegative ? 'text-rose-600/80' : 'text-emerald-700/80'
                            }`}
                          >
                            Net shift vs baseline
                          </span>
                        </div>

                        {/* Current Value (Red if decreased, Green if optimal/increased) */}
                        <div
                          className={`space-y-1 p-3 rounded-lg border shadow-2xs text-right ${
                            isNegative
                              ? 'bg-rose-50/50 border-rose-200/90'
                              : 'bg-emerald-50/50 border-emerald-200/90'
                          }`}
                        >
                          <span
                            className={`text-[10px] font-black uppercase tracking-wider block ${
                              isNegative ? 'text-rose-600/80' : 'text-emerald-700/80'
                            }`}
                          >
                            Current Period
                          </span>
                          <span
                            className={`text-xl sm:text-2xl font-black tracking-tight block ${
                              isNegative ? 'text-rose-600' : 'text-emerald-600'
                            }`}
                          >
                            {sig.current}
                          </span>
                          <span
                            className={`text-[10px] font-medium flex items-center justify-end gap-1 ${
                              isNegative ? 'text-rose-600/90' : 'text-emerald-700/90'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full inline-block animate-pulse ${
                                isNegative ? 'bg-rose-500' : 'bg-emerald-500'
                              }`}
                            />
                            {isNegative ? 'Decreased vs baseline' : 'Optimal / benchmark met'}
                          </span>
                        </div>
                      </div>

                      {/* Visual Comparison Gauge for Percentages */}
                      {sig.isPercent && sig.baselineNum !== undefined && sig.currentNum !== undefined && (
                        <div className="space-y-2 pt-1">
                          {/* Gauge Legend */}
                          <div className="flex items-center justify-between text-xs font-bold">
                            <div className={`flex items-center gap-1.5 ${isNegative ? 'text-rose-600' : 'text-emerald-600'}`}>
                              <span className="relative flex h-2.5 w-2.5">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isNegative ? 'bg-rose-400' : 'bg-emerald-400'} opacity-75`}></span>
                                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isNegative ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'}`}></span>
                              </span>
                              <span>Current: {sig.currentNum.toFixed(1)}%</span>
                            </div>

                            {deficit > 0 && (
                              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                                Deficit: -{deficit.toFixed(1)}% Gap
                              </div>
                            )}

                            <div className="flex items-center gap-1.5 text-emerald-700">
                              <div className="w-2.5 h-2.5 rounded-xs bg-emerald-600 shadow-2xs" />
                              <span>Baseline: {sig.baselineNum.toFixed(1)}%</span>
                            </div>
                          </div>

                          {/* Gauge Bar Track */}
                          <div className="relative w-full h-5 sm:h-6 bg-slate-100 rounded-full border border-slate-300/80 shadow-inner overflow-hidden p-0.5">
                            {/* Background percentage tick marks */}
                            <div className="absolute inset-0 flex justify-between px-4 items-center text-[9px] font-extrabold text-slate-300 pointer-events-none select-none z-0">
                              <span>25%</span>
                              <span>50%</span>
                              <span>75%</span>
                            </div>

                            {/* Deficit Hazard Pattern Strip */}
                            {deficit > 0 && (
                              <div
                                className="absolute top-0 bottom-0 gauge-deficit-hazard z-1"
                                style={{
                                  left: `${curPercent}%`,
                                  width: `${Math.max(0, basePercent - curPercent)}%`,
                                }}
                                title={`Deficit gap: ${deficit.toFixed(1)}% below baseline`}
                              />
                            )}

                            {/* Current fill bar with animated shimmer (Red if decreased, Emerald if good) */}
                            <div
                              className={`h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden z-10 ${
                                isNegative
                                  ? 'bg-gradient-to-r from-amber-400 via-rose-500 to-red-600 shadow-[0_0_12px_rgba(244,63,94,0.5)]'
                                  : 'bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                              }`}
                              style={{ width: `${curPercent}%` }}
                            >
                              {/* Inner moving light shimmer overlay */}
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/45 to-transparent animate-gauge-shimmer" />
                              {/* Glowing edge cap */}
                              <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/80 rounded-r-full shadow-[0_0_6px_#fff]" />
                            </div>

                            {/* Baseline flag marker needle & diamond pins in Emerald Green */}
                            <div
                              className="absolute top-0 bottom-0 w-1 bg-emerald-700 shadow-sm z-20"
                              style={{ left: `${basePercent}%` }}
                              title={`Personal Baseline: ${sig.baselineNum}%`}
                            >
                              {/* Diamond top pin */}
                              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-emerald-600 border border-white shadow-xs" />
                              {/* Diamond bottom pin */}
                              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-emerald-600 border border-white shadow-xs" />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Sustained Pattern Notice Banner */}
                      {sig.sustained && (
                        <div className="flex items-start gap-3 p-3.5 bg-gradient-to-r from-amber-500/10 via-amber-50/70 to-white border-l-4 border-l-amber-500 border-y border-r border-amber-200/90 rounded-xl text-xs text-amber-950 font-medium shadow-2xs">
                          <div className="p-1 rounded-lg bg-amber-100/90 text-amber-700 border border-amber-300/80 shadow-2xs shrink-0 mt-0.5">
                            <AlertTriangle className="w-4 h-4 animate-pulse" />
                          </div>
                          <div className="leading-relaxed">
                            <strong className="font-extrabold text-amber-900">Sustained Trend:</strong> Consistent pattern across{' '}
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md font-black bg-amber-200/80 text-amber-950 border border-amber-300 shadow-2xs">
                              {sig.sustained}
                            </span>
                            . This indicates an enduring trend rather than a transient anomaly.
                          </div>
                        </div>
                      )}

                      {/* Evidence Description if available */}
                      {sig.description && (
                        <p className="text-xs text-slate-600 font-normal leading-relaxed pt-0.5">
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
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 block">
                Aggregated Decision Parameters
              </span>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-50/90 hover:bg-white rounded-xl border border-slate-200/90 p-3.5 text-center transition-all hover:shadow-xs hover:border-blue-300">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Warning Score
                  </span>
                  <span className="text-xl font-black text-blue-700 mt-0.5 block">
                    {parsed.combinedScore || `${alert.warning_score} pts`}
                  </span>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden mt-2">
                    <div
                      className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600"
                      style={{
                        width: `${Math.min(100, (alert.warning_score / 120) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="bg-slate-50/90 hover:bg-white rounded-xl border border-slate-200/90 p-3.5 text-center transition-all hover:shadow-xs hover:border-blue-300">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Confidence
                  </span>
                  <span className="text-xl font-black text-slate-900 mt-0.5 block">
                    {parsed.confidence || `${Math.round(alert.confidence * 100)}%`}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-1 font-medium">Multi-signal fidelity</span>
                </div>

                <div className="bg-slate-50/90 hover:bg-white rounded-xl border border-slate-200/90 p-3.5 text-center flex flex-col items-center justify-center transition-all hover:shadow-xs hover:border-blue-300">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                    Classification
                  </span>
                  <CategoryBadge category={alert.category} />
                </div>

                <div className="bg-slate-50/90 hover:bg-white rounded-xl border border-slate-200/90 p-3.5 text-center flex flex-col items-center justify-center transition-all hover:shadow-xs hover:border-blue-300">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                    Suggested Routing
                  </span>
                  <span className="font-extrabold text-xs text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                    {parsed.recommendedResponse || `${alert.suggested_responder_role} Review`}
                  </span>
                </div>
              </div>
            </div>

            {/* Human-in-the-Loop Protocol Card */}
            <div className="p-4 bg-gradient-to-r from-blue-50/90 via-indigo-50/40 to-blue-50/30 rounded-xl border border-blue-200/80 text-xs text-blue-950 flex items-start gap-3 shadow-2xs">
              <div className="p-1 rounded-lg bg-blue-100 text-blue-600 border border-blue-200 shadow-2xs shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <span className="font-extrabold block text-blue-900">
                  Ethical Protocol &amp; Human-in-the-Loop Notice
                </span>
                <p className="leading-relaxed text-slate-600 font-normal">
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
