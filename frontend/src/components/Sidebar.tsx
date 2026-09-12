import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  UserCheck,
  BarChart3,
  Sliders,
  ShieldCheck,
  History,
  Sparkles,
  GraduationCap,
  X,
  PieChart,
  Activity,
  TrendingDown,
  Building2,
  CheckCircle2,
  Radar,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeChartId, setActiveChartId] = useState<string | null>(null);

  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/students', label: 'Students', icon: Users },
    { to: '/alerts', label: 'Alerts & Evidence', icon: AlertTriangle },
    { to: '/responders', label: 'Responders', icon: UserCheck },
    { to: '/reports', label: 'Leadership Reports', icon: BarChart3 },
    { to: '/calibration', label: 'Calibration', icon: Sliders },
    { to: '/settings', label: 'Thresholds & Weights', icon: ShieldCheck, show: hasRole('ADMIN') },
    { to: '/audit-logs', label: 'Audit Trail', icon: History, show: hasRole(['ADMIN', 'DEAN', 'PRINCIPAL']) },
  ];

  const chartOptions = [
    { id: 'chart-warning-category', label: '1. Alerts by Warning Category', icon: BarChart3 },
    { id: 'chart-severity-level', label: '2. Alerts by Severity Level', icon: PieChart },
    { id: 'chart-alerts-over-time', label: '3. Alerts Over Time', icon: Activity },
    { id: 'chart-attendance-trends', label: '4. Attendance Decline Trends', icon: TrendingDown },
    { id: 'chart-academic-marks', label: '5. Academic Marks Trends', icon: GraduationCap },
    { id: 'chart-department-alerts', label: '8 & 9. Alerts by Academic Department', icon: Building2 },
    { id: 'chart-precision-sla', label: '6 & 7. Precision & Response SLA Metrics', icon: CheckCircle2 },
    { id: 'chart-pattern-radar', label: '10. Institutional Recurring Pattern Radar', icon: Radar },
  ];

  useEffect(() => {
    if (location.pathname !== '/dashboard') {
      setActiveChartId(null);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveChartId(entry.target.id);
          }
        });
      },
      { rootMargin: '-15% 0px -40% 0px', threshold: 0.1 }
    );

    chartOptions.forEach((opt) => {
      const el = document.getElementById(opt.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [location.pathname]);

  const handleChartJump = (chartId: string) => {
    if (onClose) onClose();
    setActiveChartId(chartId);
    if (window.location.pathname !== '/dashboard') {
      navigate(`/dashboard#${chartId}`);
    } else {
      window.location.hash = chartId;
      window.dispatchEvent(new CustomEvent('agent69-chart-jump', { detail: { chartId } }));
    }
  };

  const sidebarContent = (
    <div className="w-72 sm:w-80 bg-slate-900 text-slate-100 min-h-screen flex flex-col border-r border-slate-800/90 select-none shadow-xl">
      {/* Brand Header with Larger Animated Logo & Bright Typography */}
      <div className="p-5 border-b border-slate-800/90 flex items-center justify-between">
        <div className="flex items-center gap-3.5 group cursor-pointer">
          {/* Animated Glowing Logo Icon */}
          <div className="relative flex items-center justify-center shrink-0">
            {/* Ambient Pulse Glow */}
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-blue-500 via-indigo-500 to-cyan-400 opacity-75 blur-sm animate-pulse pointer-events-none" />
            
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/40 group-hover:scale-105 transition-transform duration-300 relative z-10 animate-logo-glow">
              <GraduationCap className="w-6 h-6 text-white animate-float" />
            </div>
          </div>

          <div>
            <h1 className="font-black text-white tracking-wider text-base sm:text-lg flex items-center gap-2 drop-shadow-[0_2px_10px_rgba(56,189,248,0.65)]">
              <span>AGENT 69</span>
              <Sparkles className="w-4 h-4 text-amber-300 animate-spin-slow shrink-0" />
            </h1>
            <p className="text-xs font-bold text-cyan-300 tracking-wide drop-shadow-xs flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping shrink-0" />
              Student Support Radar
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-2 text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Institutional Mission Banner - Brighter & More Prominent */}
      <div className="mx-3.5 my-3.5 p-3.5 rounded-2xl bg-gradient-to-br from-blue-950/90 via-indigo-950/70 to-slate-900 border border-blue-500/40 text-xs text-blue-100 leading-relaxed shadow-md shadow-blue-950/50">
        <span className="font-extrabold text-cyan-300 text-xs flex items-center gap-1.5 mb-1 tracking-wide">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
          </span>
          HUMAN-IN-THE-LOOP:
        </span>
        Signals detect patterns requiring review; the system never takes autonomous disciplinary actions.
      </div>

      {/* Navigation Links - Interactive Blink, Click Flash & Auto-Animations */}
      <nav className="flex-1 overflow-y-auto px-3.5 space-y-2 mt-1 custom-scrollbar">
        {links.map((link) => {
          if (link.show === false) return null;
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={onClose}
              className={({ isActive }) =>
                `nav-btn-interactive flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-200 group select-none border border-transparent ${
                  isActive
                    ? 'nav-btn-active-glow bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 text-white shadow-xl shadow-blue-600/50 border-l-4 border-cyan-300 translate-x-1'
                    : 'text-slate-200 hover:text-white hover:bg-slate-800/95 hover:border-cyan-400/50 hover:translate-x-1 font-semibold'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`w-5 h-5 shrink-0 transition-all duration-300 drop-shadow-xs z-10 ${
                      isActive
                        ? 'text-cyan-200 scale-110'
                        : 'text-cyan-400 group-hover:text-cyan-100 group-hover:scale-125 group-hover:rotate-6'
                    }`}
                  />
                  <span className="tracking-wide z-10">{link.label}</span>

                  {/* Active Tab Pulsing Radar Beacon or Hover Indicator */}
                  <span className="ml-auto z-10 flex items-center">
                    {isActive ? (
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-300 opacity-90" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-300 shadow-[0_0_8px_#38bdf8]" />
                      </span>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-cyan-300 group-hover:animate-ping transition-all" />
                    )}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}

        {/* Radar Chart Jump Option Buttons (Placed directly below Audit Trail) */}
        <div className="pt-3 pb-2 mt-2 border-t border-slate-800/90">
          <div className="px-2 py-1 flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Radar Chart Options
            </span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-cyan-950/90 text-cyan-300 border border-cyan-500/50 shadow-xs">
              Direct Jump
            </span>
          </div>

          <div className="space-y-1.5">
            {chartOptions.map((opt) => {
              const Icon = opt.icon;
              const isActive = activeChartId === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => handleChartJump(opt.id)}
                  className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 group nav-btn-interactive select-none cursor-pointer shadow-xs active:scale-95 border ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white border-cyan-300 shadow-lg shadow-blue-600/40 translate-x-1'
                      : 'text-slate-200 hover:text-white bg-slate-800/60 hover:bg-slate-800 hover:border-cyan-400/80 border-slate-700/60'
                  }`}
                  title={`Jump to ${opt.label}`}
                >
                  <span
                    className={`p-1.5 rounded-lg border transition-colors shrink-0 ${
                      isActive
                        ? 'bg-white/20 border-white/40 text-cyan-100'
                        : 'bg-slate-900/80 border-slate-700/60 text-cyan-400 group-hover:text-cyan-200 group-hover:border-cyan-400/80'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                  </span>
                  <span className="text-[12px] font-bold leading-tight tracking-tight flex-1">
                    {opt.label}
                  </span>
                  {isActive ? (
                    <span className="relative flex h-2 w-2 shrink-0 ml-1">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-300 opacity-90" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-300 shadow-[0_0_6px_#38bdf8]" />
                    </span>
                  ) : (
                    <ArrowRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-cyan-200 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Footer Info - Brighter Font */}
      <div className="p-4 border-t border-slate-800/90 text-xs text-slate-300">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-200">AI Radar Status:</span>
          <span className="inline-flex items-center gap-1.5 text-emerald-300 font-black text-xs uppercase tracking-wider">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
            Active
          </span>
        </div>
        <p className="mt-1 text-slate-400 text-[11px] font-medium">Baseline Engine • Multi-Signal v1.0</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:block shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop and Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={onClose}
          />
          <div className="relative z-50 flex-1 max-w-xs w-full shadow-2xl animate-slide-right">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

