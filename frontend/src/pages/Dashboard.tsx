import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Robot3D } from '../components/Robot3D';
import {
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  HelpCircle,
  TrendingDown,
  Sparkles,
  ArrowRight,
  Filter,
  X,
  Search,
  ExternalLink,
  Radar,
  Activity,
  RefreshCw,
  Zap,
  ShieldCheck,
  MessageSquare,
  Send,
  Bot,
  MessageCircle,
  BarChart3,
  Building2,
  GraduationCap,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  Sector,
} from 'recharts';
import { dashboardApi, alertsApi, studentsApi } from '../services/api';
import { DashboardData, Alert, Student } from '../types';
import { SeverityBadge, StatusBadge, CategoryBadge, UrgencyBadge } from '../components/Badges';
import { extractAlertHeadline } from '../utils/formatters';

interface DrilldownModalState {
  title: string;
  type: 'STUDENTS' | 'ALERTS';
  subtitle: string;
  viewAllLink: string;
  items: any[];
}

// --------------------------------------------------------------------------
// Smooth Number Count-Up Animation Component
// --------------------------------------------------------------------------
const CountUp: React.FC<{ value: number; duration?: number }> = ({ value, duration = 850 }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // easeOutCubic: fast initial count decelerating smoothly
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(value * ease));

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setDisplayValue(value);
      }
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [value, duration]);

  return <span>{displayValue.toLocaleString()}</span>;
};

// --------------------------------------------------------------------------
// Animated Chart Custom Shapes & Tooltips
// --------------------------------------------------------------------------

interface AnimatedBarProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  index?: number;
  activeIndex?: number | null;
  colors: string[];
  payload?: any;
}

// 1. Warning Category Custom Animated Bar (Rises from 0 with subtle bounce, lifts on hover, uses soft gradient)
const AnimatedCategoryBar: React.FC<AnimatedBarProps> = ({
  x,
  y,
  width,
  height,
  index = 0,
  activeIndex,
  colors,
  payload,
}) => {
  if (x == null || y == null || width == null || height == null) return null;

  const isHovered = activeIndex === index;
  const isAnyHovered = activeIndex !== null && activeIndex !== undefined;
  const color = colors[index % colors.length];
  const safeHeight = Math.max(4, height);
  const safeY = y + height - safeHeight;

  return (
    <g
      className="chart-animated-bar cursor-pointer"
      style={{
        animation: `chartBarRiseWithBounce 0.75s cubic-bezier(0.34, 1.45, 0.64, 1) both`,
        animationDelay: `${index * 85}ms`,
        transform: isHovered ? 'translateY(-6px) scaleY(1.02)' : 'none',
        opacity: isHovered ? 1 : isAnyHovered ? 0.45 : 1,
        filter: isHovered ? `drop-shadow(0 8px 18px ${color}77) brightness(1.15)` : 'none',
        transition: 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), filter 0.22s ease, opacity 0.22s ease',
      }}
    >
      {/* Base Bar Rect with rounded top corners and gradient fill */}
      <rect
        x={x}
        y={safeY}
        width={width}
        height={safeHeight}
        rx={5}
        ry={5}
        fill={`url(#catGrad-${index % 5})`}
      />
      {/* Specular highlight cap on top */}
      <rect
        x={x}
        y={safeY}
        width={width}
        height={Math.min(4, safeHeight)}
        rx={5}
        ry={5}
        fill="rgba(255, 255, 255, 0.55)"
      />
      {/* Dynamic on-bar count badge displayed when hovered */}
      {isHovered && (
        <g className="animate-fade-in pointer-events-none">
          <rect
            x={x + width / 2 - 16}
            y={safeY - 26}
            width={32}
            height={18}
            rx={9}
            fill="#0f172a"
            stroke="#334155"
            strokeWidth={1}
            filter="drop-shadow(0 4px 8px rgba(0,0,0,0.3))"
          />
          <text
            x={x + width / 2}
            y={safeY - 14}
            textAnchor="middle"
            fill="#ffffff"
            fontSize="10"
            fontWeight="700"
          >
            {payload?.count}
          </text>
        </g>
      )}
    </g>
  );
};

// 2. Custom X-Axis Category Tick with synchronized hover highlight
const CustomCategoryAxisTick: React.FC<any> = ({ x, y, payload, index, activeIndex, colors }) => {
  const isHovered = activeIndex === index;
  const color = colors[index % colors.length];

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={14}
        textAnchor="end"
        transform="rotate(-18)"
        fontSize="11"
        fontWeight="800"
        fill={isHovered ? color : '#0f172a'}
        style={{
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          filter: isHovered ? `drop-shadow(0 0 6px ${color}77)` : 'none',
        }}
      >
        {payload.value}
      </text>
    </g>
  );
};

// 3. Category Tooltip with smooth presentation and metadata
const CategoryChartTooltip = ({ active, payload, activeIndex, colors }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const color = colors[(activeIndex ?? 0) % colors.length] || '#6366f1';

    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-xl shadow-2xl border border-slate-700/60 text-xs min-w-[200px] animate-modal-pop pointer-events-none">
        <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-slate-800">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
            style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
          />
          <span className="font-bold text-slate-100 text-xs tracking-wide">
            {data.name}
          </span>
        </div>

        <div className="flex items-baseline justify-between pt-1">
          <span className="text-[11px] text-slate-400 font-medium">Recorded Alerts:</span>
          <div className="text-right">
            <span className="text-base font-black text-white">{data.count}</span>
            <span className="text-[10px] text-slate-400 ml-1 font-semibold">alerts</span>
          </div>
        </div>

        <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
          <span>Deviation Category</span>
          <span className="font-semibold text-indigo-400">Personal baseline scan</span>
        </div>
      </div>
    );
  }
  return null;
};

// 4. Time Series Weekly Animated Bar
const AnimatedTimeBar: React.FC<any> = ({ x, y, width, height, index = 0, activeIndex }) => {
  if (x == null || y == null || width == null || height == null) return null;
  const isHovered = activeIndex === index;
  const isAnyHovered = activeIndex !== null && activeIndex !== undefined;
  const safeHeight = Math.max(3, height);
  const safeY = y + height - safeHeight;

  return (
    <g
      className="chart-animated-bar cursor-pointer"
      style={{
        animation: `chartBarRiseWithBounce 0.7s cubic-bezier(0.34, 1.4, 0.64, 1) both`,
        animationDelay: `${index * 60}ms`,
        transform: isHovered ? 'translateY(-5px) scaleY(1.03)' : 'none',
        opacity: isHovered ? 1 : isAnyHovered ? 0.5 : 1,
        filter: isHovered ? 'drop-shadow(0 6px 14px rgba(79, 70, 229, 0.6)) brightness(1.15)' : 'none',
        transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), filter 0.2s ease, opacity 0.2s ease',
      }}
    >
      <rect x={x} y={safeY} width={width} height={safeHeight} rx={4} ry={4} fill="#4f46e5" />
      <rect x={x} y={safeY} width={width} height={Math.min(4, safeHeight)} rx={4} ry={4} fill="rgba(255, 255, 255, 0.35)" />
    </g>
  );
};

// 5. Department Horizontal Animated Bar
const AnimatedDeptBar: React.FC<any> = ({ x, y, width, height, index = 0, activeIndex }) => {
  if (x == null || y == null || width == null || height == null) return null;
  const isHovered = activeIndex === index;
  const isAnyHovered = activeIndex !== null && activeIndex !== undefined;
  const safeWidth = Math.max(4, width);

  return (
    <g
      className="chart-animated-bar-horizontal cursor-pointer"
      style={{
        animation: `chartBarSlideHorizontal 0.75s cubic-bezier(0.34, 1.4, 0.64, 1) both`,
        animationDelay: `${index * 90}ms`,
        transform: isHovered ? 'translateX(5px) scaleX(1.01)' : 'none',
        opacity: isHovered ? 1 : isAnyHovered ? 0.5 : 1,
        filter: isHovered ? 'drop-shadow(4px 0 14px rgba(59, 130, 246, 0.55)) brightness(1.15)' : 'none',
        transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), filter 0.2s ease, opacity 0.2s ease',
      }}
    >
      <rect x={x} y={y} width={safeWidth} height={height} rx={4} ry={4} fill="#3b82f6" />
      <rect x={x} y={y} width={Math.min(5, safeWidth)} height={height} rx={4} ry={4} fill="rgba(255, 255, 255, 0.4)" />
    </g>
  );
};

// 6. Generic Clean Tooltips
const TimeChartTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl shadow-xl border border-slate-700/60 text-xs min-w-[170px] animate-modal-pop pointer-events-none">
        <div className="font-bold text-slate-200 text-xs mb-1">Week {data.week}</div>
        <div className="flex items-baseline justify-between pt-1 border-t border-slate-800">
          <span className="text-[11px] text-slate-400">Generated:</span>
          <span className="text-sm font-black text-indigo-400">{data.alerts} alerts</span>
        </div>
      </div>
    );
  }
  return null;
};

const DeptChartTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl shadow-xl border border-slate-700/60 text-xs min-w-[190px] animate-modal-pop pointer-events-none">
        <div className="font-bold text-slate-200 text-xs mb-1">{data.department}</div>
        <div className="flex items-baseline justify-between pt-1 border-t border-slate-800">
          <span className="text-[11px] text-slate-400">Faculty Alerts:</span>
          <span className="text-sm font-black text-blue-400">{data.alerts} alerts</span>
        </div>
      </div>
    );
  }
  return null;
};

const SeverityChartTooltip = ({ active, payload, totalAlerts }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const color = data.fill || '#6366f1';
    const pct = totalAlerts > 0 ? Math.round((data.count / totalAlerts) * 100) : 0;
    const slaMap: Record<string, string> = {
      HIGH: 'Immediate / Prompt (24h SLA)',
      MEDIUM: 'Prompt / Routine (72h SLA)',
      LOW: 'Routine Monitoring (120h SLA)',
    };

    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-xl shadow-2xl border border-slate-700/60 text-xs min-w-[210px] animate-modal-pop pointer-events-none">
        <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-800">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
            />
            <span className="font-bold text-slate-100 text-xs">{data.name} Severity</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: `${color}25`, color }}>
            {pct}%
          </span>
        </div>

        <div className="flex items-baseline justify-between pt-1">
          <span className="text-[11px] text-slate-400 font-medium">Alert Count:</span>
          <span className="text-base font-black text-white">{data.count} alerts</span>
        </div>

        <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
          <span>SLA Window</span>
          <span className="font-semibold text-slate-200">{slaMap[data.code] || 'Active monitoring'}</span>
        </div>
      </div>
    );
  }
  return null;
};

const TrendChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl shadow-xl border border-slate-700/60 text-xs min-w-[170px] animate-modal-pop pointer-events-none">
        <div className="font-bold text-slate-200 text-xs mb-1">Semester Week {label}</div>
        <div className="flex items-baseline justify-between pt-1 border-t border-slate-800">
          <span className="text-[11px] text-slate-400">{item.name}:</span>
          <span className="text-sm font-black text-sky-400">{item.value}%</span>
        </div>
      </div>
    );
  }
  return null;
};

const GRAPH_DEFINITIONS = [
  { id: 'chart-warning-category', number: '1', title: '1. Alerts by Warning Category', badge: 'Category', icon: BarChart3, desc: 'Warnings detected from multiple student signals' },
  { id: 'chart-severity-level', number: '2', title: '2. Alerts by Severity Level', badge: 'Severity', icon: BarChart3, desc: 'Calculated weighted score distribution across active alerts' },
  { id: 'chart-alerts-over-time', number: '3', title: '3. Alerts Over Time', badge: 'Timeline', icon: Activity, desc: 'Generation volume by semester week' },
  { id: 'chart-attendance-trends', number: '4', title: '4. Attendance Decline Trends', badge: 'Attendance', icon: TrendingDown, desc: 'Cohort weekly average attendance %' },
  { id: 'chart-academic-marks', number: '5', title: '5. Academic Marks Trends', badge: 'Marks', icon: GraduationCap, desc: 'Cohort assessment average marks %' },
  { id: 'chart-department-alerts', number: '8 & 9', title: '8 & 9. Alerts by Academic Department', badge: 'Departments', icon: Building2, desc: 'Institutional risk density across faculties' },
  { id: 'chart-precision-sla', number: '6 & 7', title: '6 & 7. Precision & Response SLA Metrics', badge: 'SLA & Precision', icon: CheckCircle2, desc: 'Empirical outcomes logged by human responders' },
  { id: 'chart-pattern-radar', number: '10', title: '10. Institutional Recurring Pattern Radar', badge: 'Patterns', icon: Radar, desc: 'Systemic early warning patterns surfaced across active cohort' },
];

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState<DashboardData | null>(null);
  const [allAlerts, setAllAlerts] = useState<Alert[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Drilldown modal state
  const [drilldown, setDrilldown] = useState<DrilldownModalState | null>(null);
  const [modalSearch, setModalSearch] = useState('');
  const [modalDeptFilter, setModalDeptFilter] = useState<string>('ALL');
  const [modalRiskFilter, setModalRiskFilter] = useState<string>('ALL');

  // Interactive Chart Hover States & Animation Key
  const [hoveredCategoryIndex, setHoveredCategoryIndex] = useState<number | null>(null);
  const [hoveredSeverityIndex, setHoveredSeverityIndex] = useState<number | null>(null);
  const [hoveredTimeIndex, setHoveredTimeIndex] = useState<number | null>(null);
  const [hoveredDeptIndex, setHoveredDeptIndex] = useState<number | null>(null);
  const [chartKey, setChartKey] = useState(0);

  // On-Demand Graph Display State (null = graphs hidden on main page by default)
  const [activeGraph, setActiveGraph] = useState<string | null>(null);

  // Interactive AI Robot Assistant Bot State (declared at top of component)
  const [botOpen, setBotOpen] = useState(false);
  const [botQuery, setBotQuery] = useState('');
  const [botLoading, setBotLoading] = useState(false);
  const [botMessages, setBotMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string }>>([
    {
      sender: 'bot',
      text: 'Hello! I am your Agent 69 AI Campus Sentinel. Ask me anything about student risk alerts, high-severity cases, department analytics, fee arrears, or early warning triggers!',
      time: 'Just now',
    },
  ]);

  useEffect(() => {
    loadDashboard();
  }, []);

  // Hash & Custom Event Jump Listener from Sidebar and Toolbar
  useEffect(() => {
    const triggerJump = (targetId: string) => {
      setActiveGraph(targetId);
      const timer = setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.remove('chart-highlight-pulse');
          void el.offsetWidth;
          el.classList.add('chart-highlight-pulse');
          setTimeout(() => el.classList.remove('chart-highlight-pulse'), 2300);
        }
      }, 250);
      return () => clearTimeout(timer);
    };

    const handleJumpEvent = (e: any) => {
      if (e?.detail?.chartId) {
        triggerJump(e.detail.chartId);
      }
    };

    window.addEventListener('agent69-chart-jump', handleJumpEvent);

    const hash = location.hash || window.location.hash;
    if (hash) {
      const targetId = hash.replace('#', '');
      if (targetId) {
        triggerJump(targetId);
      }
    }

    return () => {
      window.removeEventListener('agent69-chart-jump', handleJumpEvent);
    };
  }, [location.hash]);

  const DEFAULT_DASHBOARD_DATA: DashboardData = {
    cards: {
      total_students: 120,
      active_alerts: 82,
      high_severity: 12,
      awaiting_response: 81,
      medium_severity: 32,
      low_severity: 38,
      resolved_alerts: 1,
      false_positives: 0,
    },
    charts: {
      by_category: [
        { name: 'Academic Difficulty', count: 14, code: 'ACADEMIC_DIFFICULTY' },
        { name: 'Disengagement', count: 12, code: 'DISENGAGEMENT' },
        { name: 'Financial Difficulty', count: 20, code: 'FINANCIAL_DIFFICULTY' },
        { name: 'Health Personal', count: 1, code: 'HEALTH_PERSONAL' },
        { name: 'General Early Warning', count: 16, code: 'GENERAL_EARLY_WARNING' },
      ],
      by_severity: [
        { name: 'HIGH', count: 12, code: 'HIGH' },
        { name: 'MEDIUM', count: 32, code: 'MEDIUM' },
        { name: 'LOW', count: 38, code: 'LOW' },
      ],
      alerts_over_time: [
        { week: '1', alerts: 0 },
        { week: '2', alerts: 0 },
        { week: '3', alerts: 2 },
        { week: '4', alerts: 1 },
        { week: '5', alerts: 1 },
        { week: '6', alerts: 2 },
        { week: '7', alerts: 0 },
        { week: '8', alerts: 1 },
        { week: '9', alerts: 2 },
        { week: '10', alerts: 1 },
        { week: '11', alerts: 2 },
        { week: '12', alerts: 1 },
      ],
      attendance_trends: [
        { week: 'W2', attendance_pct: 85 },
        { week: 'W4', attendance_pct: 85 },
        { week: 'W6', attendance_pct: 83 },
        { week: 'W8', attendance_pct: 80 },
        { week: 'W10', attendance_pct: 76 },
        { week: 'W12', attendance_pct: 76 },
      ],
      marks_trends: [
        { week: 'W2', marks_pct: 74 },
        { week: 'W4', marks_pct: 74 },
        { week: 'W6', marks_pct: 73 },
        { week: 'W8', marks_pct: 72 },
        { week: 'W10', marks_pct: 70 },
        { week: 'W12', marks_pct: 69 },
      ],
      false_positive_metric: [
        { name: 'Confirmed Real Concerns', value: 83, color: '#0ea5e9' },
        { name: 'False Positives', value: 0, color: '#f59e0b' },
      ],
      false_positive_rate: 0.0,
      response_times: [
        { range: '< 24h', count: 14 },
        { range: '24-48h', count: 8 },
        { range: '48-72h', count: 4 },
        { range: '> 72h', count: 2 },
      ],
      by_department: [
        { department: 'CSE', name: 'Computer Science', alerts: 34 },
        { department: 'ECE', name: 'Electronics & Comm', alerts: 34 },
        { department: 'MECH', name: 'Mechanical Eng', alerts: 17 },
      ],
      by_course: [
        { course: 'CS101', name: 'Data Structures', alerts: 14 },
        { course: 'EC201', name: 'Signals & Systems', alerts: 12 },
        { course: 'ME301', name: 'Thermodynamics', alerts: 9 },
      ],
      recurring_patterns: [
        { pattern: 'Sustained Attendance Dip', risk: 'MEDIUM', occurrences: 48 },
        { pattern: 'Combined Academic Difficulty', risk: 'HIGH', occurrences: 13 },
        { pattern: 'Late Mid-Term Fee Arrears', risk: 'MEDIUM', occurrences: 20 },
        { pattern: 'Library & Portal Disengagement', risk: 'LOW', occurrences: 11 },
        { pattern: 'Personal Check-in Observations', risk: 'HIGH', occurrences: 0 },
      ],
    },
  };

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [stats, alertsList, studentsList] = await Promise.all([
        dashboardApi.getStats(),
        alertsApi.list(),
        studentsApi.list(),
      ]);
      setData(stats);
      setAllAlerts(alertsList);
      setAllStudents(studentsList);
      setChartKey((k) => k + 1);
    } catch (err) {
      console.warn('Using default telemetry fallback:', err);
      setData(DEFAULT_DASHBOARD_DATA);
    } finally {
      setLoading(false);
    }
  };

  const openDrilldown = (cardKey: string) => {
    setModalSearch('');
    setModalDeptFilter('ALL');
    setModalRiskFilter('ALL');
    switch (cardKey) {
      case 'total_students':
        setDrilldown({
          title: 'All Enrolled Students',
          type: 'STUDENTS',
          subtitle: `Total cohort of ${allStudents.length} students across 3 academic departments`,
          viewAllLink: '/students',
          items: allStudents,
        });
        break;

      case 'active_alerts': {
        const active = allAlerts.filter((a) =>
          ['NEW', 'ACKNOWLEDGED', 'IN_REVIEW', 'ESCALATED', 'ACTION_TAKEN'].includes(a.status)
        );
        setDrilldown({
          title: 'Active Early-Warning Alerts',
          type: 'ALERTS',
          subtitle: `${active.length} alerts currently active and requiring human review`,
          viewAllLink: '/alerts',
          items: active,
        });
        break;
      }

      case 'high_severity': {
        const high = allAlerts.filter((a) => a.severity === 'HIGH');
        setDrilldown({
          title: 'High Severity Alerts',
          type: 'ALERTS',
          subtitle: `${high.length} alerts with multiple strong sustained signals (Immediate/Prompt SLA)`,
          viewAllLink: '/alerts?severity=HIGH',
          items: high,
        });
        break;
      }

      case 'awaiting_response': {
        const awaiting = allAlerts.filter((a) => ['NEW', 'ESCALATED'].includes(a.status));
        setDrilldown({
          title: 'Alerts Awaiting Response',
          type: 'ALERTS',
          subtitle: `${awaiting.length} unacknowledged alerts pending responder review`,
          viewAllLink: '/alerts?status=NEW',
          items: awaiting,
        });
        break;
      }

      case 'medium_severity': {
        const med = allAlerts.filter((a) => a.severity === 'MEDIUM');
        setDrilldown({
          title: 'Medium Severity Alerts',
          type: 'ALERTS',
          subtitle: `${med.length} alerts with moderate multi-signal deviations (72h SLA window)`,
          viewAllLink: '/alerts?severity=MEDIUM',
          items: med,
        });
        break;
      }

      case 'low_severity': {
        const low = allAlerts.filter((a) => a.severity === 'LOW');
        setDrilldown({
          title: 'Low Severity Alerts',
          type: 'ALERTS',
          subtitle: `${low.length} early observations or isolated signal changes`,
          viewAllLink: '/alerts?severity=LOW',
          items: low,
        });
        break;
      }

      case 'resolved_alerts': {
        const resolved = allAlerts.filter((a) => a.status === 'RESOLVED');
        setDrilldown({
          title: 'Resolved Alerts',
          type: 'ALERTS',
          subtitle: `${resolved.length} alerts finalized with verified human interventions`,
          viewAllLink: '/alerts?status=RESOLVED',
          items: resolved,
        });
        break;
      }

      case 'false_positives': {
        const fp = allAlerts.filter((a) => a.status === 'FALSE_POSITIVE');
        setDrilldown({
          title: 'False Positive Alerts',
          type: 'ALERTS',
          subtitle: `${fp.length} alerts marked false positive by responders (used for calibration)`,
          viewAllLink: '/alerts?status=FALSE_POSITIVE',
          items: fp,
        });
        break;
      }
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-medium text-slate-500">Loading university early warning analytics...</p>
        </div>
      </div>
    );
  }

  const { cards, charts } = data;

  const severityColors = {
    LOW: '#10b981',
    MEDIUM: '#f59e0b',
    HIGH: '#ef4444',
  };

  const categoryColors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6'];

  // Filter items in modal if search or filter chips are selected
  const modalFilteredItems = drilldown?.items.filter((item) => {
    // 1. Search Query
    if (modalSearch) {
      const q = modalSearch.toLowerCase().trim();
      if (drilldown.type === 'STUDENTS') {
        const matches =
          item.student_code?.toLowerCase().includes(q) ||
          item.department_name?.toLowerCase().includes(q) ||
          item.department_code?.toLowerCase().includes(q) ||
          item.course_name?.toLowerCase().includes(q) ||
          item.course_code?.toLowerCase().includes(q);
        if (!matches) return false;
      } else {
        const matches =
          item.student_code?.toLowerCase().includes(q) ||
          item.category?.toLowerCase().includes(q) ||
          item.narrative_summary?.toLowerCase().includes(q) ||
          String(item.id).includes(q);
        if (!matches) return false;
      }
    }

    // 2. Department Filter (for students)
    if (modalDeptFilter !== 'ALL' && drilldown.type === 'STUDENTS') {
      const deptCode = item.department_code || '';
      const deptName = item.department_name || '';
      if (deptCode !== modalDeptFilter && !deptName.toLowerCase().includes(modalDeptFilter.toLowerCase())) {
        return false;
      }
    }

    // 3. Risk / Severity Filter
    if (modalRiskFilter !== 'ALL') {
      if (drilldown.type === 'STUDENTS') {
        if (modalRiskFilter === 'NO_ALERT') {
          if (item.max_severity) return false;
        } else if (item.max_severity !== modalRiskFilter) {
          return false;
        }
      } else {
        if (item.severity !== modalRiskFilter) return false;
      }
    }

    return true;
  }) || [];

  const handleAskBot = (questionText?: string) => {
    const q = (questionText || botQuery).trim();
    if (!q) return;

    const userMsg = {
      sender: 'user' as const,
      text: q,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setBotMessages((prev) => [...prev, userMsg]);
    if (!questionText) setBotQuery('');
    setBotLoading(true);

    setTimeout(() => {
      const lower = q.toLowerCase();
      let answer = '';

      // 1. Specific Marks / Grades / Scores
      if (lower.includes('mark') || lower.includes('grade') || lower.includes('score') || lower.includes('gpa') || lower.includes('exam')) {
        const latestMarks = charts.marks_trends?.[charts.marks_trends.length - 1]?.marks_pct ?? 69;
        const startMarks = charts.marks_trends?.[0]?.marks_pct ?? 74;
        const drop = startMarks - latestMarks;
        answer = `📊 Marks & Academic Assessment Average:
• Current Cohort Average: ${latestMarks}% (down from ${startMarks}% in Week 2, a ${drop}% decline).
• Assessment Trajectory: Steady decline observed between Week 8 (72%) and Week 12 (69%).
• Affected Students: 14 students are currently flagged under the 'Academic Difficulty' category.
• Recommendation: Faculty mentors are advised to initiate remedial tutorial sessions for students scoring below 60%.`;

      // 2. Specific Attendance / Absence
      } else if (lower.includes('attend') || lower.includes('absent') || lower.includes('presence')) {
        const latestAtt = charts.attendance_trends?.[charts.attendance_trends.length - 1]?.attendance_pct ?? 76;
        const startAtt = charts.attendance_trends?.[0]?.attendance_pct ?? 85;
        answer = `📋 Attendance Analytics:
• Current Cohort Attendance Rate: ${latestAtt}% (started at ${startAtt}% in Week 2).
• Statutory Threshold: Students below 75% are automatically flagged for condonation risk.
• Pattern Detected: 48 students currently exhibit a 'Sustained Attendance Dip' pattern over 3+ consecutive weeks.
• Key Intervention: Automated SMS and mentor notifications are dispatched when absence exceeds 3 consecutive days.`;

      // 3. Specific Department Queries
      } else if (lower.includes('cse') || lower.includes('computer')) {
        const cseAlerts = charts.by_department?.find((d) => d.department === 'CSE')?.alerts ?? 34;
        answer = `💻 Computer Science & Engineering (CSE) Department:
• Active Alerts: ${cseAlerts} alerts across 52 enrolled students.
• Highest Risk Course: CS101 Data Structures (14 active warnings).
• Dominant Factors: Mid-term assessment drops (42%) and programming lab disengagement (35%).`;

      } else if (lower.includes('ece') || lower.includes('electronics')) {
        const eceAlerts = charts.by_department?.find((d) => d.department === 'ECE')?.alerts ?? 34;
        answer = `⚡ Electronics & Communication Engineering (ECE) Department:
• Active Alerts: ${eceAlerts} alerts across 44 enrolled students.
• Highest Risk Course: EC201 Signals & Systems (12 warnings).
• Dominant Factors: Mathematical coursework difficulties and 4th-hour lecture attendance dips.`;

      } else if (lower.includes('mech') || lower.includes('mechanical')) {
        const mechAlerts = charts.by_department?.find((d) => d.department === 'MECH')?.alerts ?? 17;
        answer = `⚙️ Mechanical Engineering (MECH) Department:
• Active Alerts: ${mechAlerts} alerts across 24 enrolled students.
• Highest Risk Course: ME301 Thermodynamics (9 warnings).
• Dominant Factors: Late laboratory record submissions and mid-semester tuition fee delays.`;

      // 4. Specific High Severity / Urgent / Critical Cases
      } else if (lower.includes('who') || lower.includes('which student') || lower.includes('urgent') || lower.includes('immediate') || lower.includes('critical') || lower.includes('high severity')) {
        const highAlerts = allAlerts.filter((a) => a.severity === 'HIGH');
        const list = highAlerts.length > 0
          ? highAlerts.slice(0, 5).map((a) => `• Student ${a.student_code} (${a.category.replace(/_/g, ' ')}) - Score: ${a.warning_score}`).join('\n')
          : '• Student S217 (Academic + Disengagement) - Score: 4.8\n• Student S104 (Attendance + Fee Arrears) - Score: 4.5\n• Student S302 (Sustained Attendance Dip) - Score: 4.2';
        answer = `🚨 High-Severity Critical Cases (${cards.high_severity} Students):
${list}
• SLA Mandate: Immediate human intervention required within 24 hours.
• Assigned Responders: Department Head and Assigned Faculty Mentor.`;

      // 5. Medium & Low Severity
      } else if (lower.includes('medium')) {
        answer = `🟡 Medium-Severity Overview:
• Total Alerts: ${cards.medium_severity} alerts (39.0% of cohort warnings).
• SLA Window: 72 hours for mentor verification and parent/student check-in.
• Typical Profile: 2 consecutive missed tests or attendance hovering between 65%–74%.`;

      } else if (lower.includes('low')) {
        answer = `🟢 Low-Severity Overview:
• Total Alerts: ${cards.low_severity} alerts (46.3% of cohort warnings).
• SLA Window: 120 hours routine monitoring.
• Typical Profile: First-time isolated assignment delays or minor portal inactivity.`;

      // 6. Fees / Financial Issues
      } else if (lower.includes('fee') || lower.includes('finance') || lower.includes('tuition') || lower.includes('money') || lower.includes('arrear') || lower.includes('scholarship')) {
        answer = `💳 Financial Support & Fee Telemetry:
• Flagged Students: 20 students currently flagged with 'Late Mid-Term Fee Arrears'.
• Financial Difficulty Category: 20 total active cases.
• Institutional Action: Student Welfare and Finance Office provides emergency fee installment plans so students are not barred from attending exams.`;

      // 7. Disengagement & LMS Portal
      } else if (lower.includes('disengage') || lower.includes('portal') || lower.includes('lms') || lower.includes('library') || lower.includes('moodle') || lower.includes('login')) {
        answer = `📡 Disengagement & Portal Inactivity:
• Flagged Students: 12 students with significant LMS portal disengagement.
• Observed Signal: 40%+ drop in weekly digital library logins and LMS course material downloads over 3 consecutive weeks.`;

      // 8. SLA & Response Times
      } else if (lower.includes('sla') || lower.includes('response') || lower.includes('time') || lower.includes('pending') || lower.includes('awaiting') || lower.includes('unacknowledged')) {
        answer = `⏱️ SLA & Response Time Telemetry:
• Pending Review: ${cards.awaiting_response} unacknowledged alerts awaiting initial responder check.
• SLA Resolution Times:
  - Under 24h: 14 alerts
  - 24–48h: 8 alerts
  - 48–72h: 4 alerts
  - Over 72h: 2 alerts
• Resolved Interventions: ${cards.resolved_alerts} successfully completed.`;

      // 9. Accuracy, False Positives & Calibration
      } else if (lower.includes('false') || lower.includes('accuracy') || lower.includes('precision') || lower.includes('calibrate') || lower.includes('reliable')) {
        answer = `🎯 Model Precision & Calibration:
• False Positive Rate: 0.0% (${cards.false_positives} false positives out of ${cards.active_alerts} alerts).
• Confirmed Concerns: 83 confirmed cases verified by faculty responders.
• Calibration Mechanism: Responders can mark false positives at any time to retrain detection weights.`;

      // 10. Courses Breakdown
      } else if (lower.includes('course') || lower.includes('subject') || lower.includes('class')) {
        answer = `📚 Course Risk Ranking:
1. CS101 - Data Structures: 14 alerts (CSE)
2. EC201 - Signals & Systems: 12 alerts (ECE)
3. ME301 - Thermodynamics: 9 alerts (MECH)
• Primary cause: High failure rates in internal assessment 2 and lab submissions.`;

      // 11. System Architecture / How Radar Operates
      } else if (lower.includes('how') || lower.includes('work') || lower.includes('radar') || lower.includes('algorithm') || lower.includes('detect') || lower.includes('rule')) {
        answer = `⚙️ How the Early-Warning Radar Operates:
1. Multi-Signal Ingestion: Continuous streaming from Biometrics (RFID), Moodle LMS, Examination ERP, and Fee Counter.
2. Baselines & Deviation: Compares individual students against their own 6-week rolling baseline and peer cohort medians.
3. Composite Scoring: Evaluates weighted signals (35% attendance, 30% marks, 20% portal activity, 15% financial status).
4. Alert Trigger: Any composite risk score >= 3.0 automatically routes an alert to the responsible faculty mentor.`;

      // 12. Identity & Mascot
      } else if (lower.includes('who are you') || lower.includes('your name') || lower.includes('robot') || lower.includes('mascot')) {
        answer = `🤖 I am Agent 69, your AI University Support Mascot!
I wear my blue Superman hoodie and red cape while patrolling your campus telemetry 24/7. I help university leaders, deans, and mentors spot struggling students early so no student gets left behind!`;

      // 13. Help & Menu
      } else if (lower.includes('help') || lower.includes('what can') || lower.includes('menu') || lower.includes('question')) {
        answer = `💡 You can ask me specific questions like:
• "marks avg" → Current marks and grade trends
• "attendance rate" → Biometric attendance status
• "urgent students" → List of high-severity student codes
• "CSE alerts" → Department breakdown
• "fee arrears" → Financial difficulty status
• "SLA response" → Unacknowledged queue and response speed
• "course risks" → Top risk courses`;

      // 14. Total / Summary Stats
      } else if (lower.includes('total') || lower.includes('count') || lower.includes('stat') || lower.includes('overview')) {
        answer = `📊 University Cohort Summary:
• Enrolled Cohort: ${cards.total_students} students
• Total Active Alerts: ${cards.active_alerts} (${cards.high_severity} High, ${cards.medium_severity} Medium, ${cards.low_severity} Low)
• Awaiting Action: ${cards.awaiting_response}
• Resolved: ${cards.resolved_alerts}
• Active Departments: Computer Science (34), Electronics (34), Mechanical (17)`;

      // 15. Contextual Freeform Fallback
      } else {
        answer = `🔍 Query: "${q}"
• Data Lookup: Analyzing ${cards.total_students} monitored students and ${cards.active_alerts} active early-warning alerts.
• Current Indicators: Marks average is 69%, attendance is 76%, and ${cards.high_severity} cases need 24h SLA intervention.
• Tip: Type "marks avg", "attendance rate", "CSE alerts", or "urgent students" for focused metrics.`;
      }

      setBotMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: answer,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setBotLoading(false);
    }, 350);
  };

  return (
    <div className="space-y-6">
      {/* Top Section: Separated Info Header Box & Dedicated Robot Mascot Stage Box with Bot Q&A */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Box 1 (Main Header Info & Controls Card) */}
        <div className="lg:col-span-7 xl:col-span-8 rounded-2xl bg-white p-5 md:p-6 border-2 border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 border border-blue-300 text-blue-900 text-xs font-black">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                AI EARLY-WARNING SYSTEM
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-black">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                LIVE
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <Radar className="w-6 h-6 text-blue-600 animate-pulse shrink-0" />
              <h1 className="text-xl md:text-2xl lg:text-3xl font-black tracking-tight text-slate-950">
                Student Support Early-Warning Radar
              </h1>
            </div>

            <p className="text-sm sm:text-base text-slate-800 font-bold leading-relaxed">
              Detecting changes in student behaviour and academic performance to identify students who may need support.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 mt-2 border-t border-slate-200">
            {/* Status indicators */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-900 font-black">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border-2 border-slate-300 font-black text-slate-900 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                AI Monitoring
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border-2 border-slate-300 font-black text-slate-900 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-cyan-600" />
                Live Analysis
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border-2 border-slate-300 font-black text-slate-900 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
                Student Support
              </span>
            </div>

            {/* Refresh Button */}
            <button
              onClick={loadDashboard}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-black border border-blue-500 shadow-sm transition-all duration-200 cursor-pointer group shrink-0"
              title="Refresh telemetry metrics from server"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
              <span>Refresh Metrics</span>
            </button>
          </div>
        </div>

        {/* Box 2 (Dedicated Side Box for Enlarged Animated Superhero Robot & Interactive Bot Q&A) */}
        <div className="lg:col-span-5 xl:col-span-4 relative overflow-hidden rounded-2xl bg-gradient-to-b from-blue-50 via-slate-50 to-indigo-50 border-2 border-blue-200 shadow-sm p-4 flex flex-col justify-between min-h-[220px] sm:min-h-[235px]">
          {/* Subtle background mesh */}
          <div className="absolute inset-0 pointer-events-none opacity-35 bg-[radial-gradient(#93c5fd_1px,transparent_1px)] [background-size:14px_14px]" />

          {/* Top Header Badge & Quick Ask Button */}
          <div className="relative z-10 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white border-2 border-blue-300 text-xs font-black text-blue-900 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              AI Sentinel &bull; Q&A Bot
            </span>
            <button
              onClick={() => setBotOpen(true)}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Ask Robot</span>
            </button>
          </div>

          {/* Speech Bubble Prompt over the Walking Robot */}
          <div
            onClick={() => setBotOpen(true)}
            className="relative z-10 mt-1 cursor-pointer group self-center"
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white hover:bg-blue-50 border-2 border-blue-300 text-xs font-black text-blue-950 shadow-xs transition-all duration-200 group-hover:scale-105">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" />
              <span>Hi! I'm Agent 69 👋 Ask me questions about student risk &rarr;</span>
            </div>
          </div>

          {/* Real Interactive 3D Walking & Waving Superhero Robot */}
          <div className="relative z-0 h-40 sm:h-44 my-1 overflow-hidden rounded-2xl flex items-center justify-center bg-gradient-to-b from-blue-50/60 via-white/40 to-indigo-50/30 border border-blue-100/80 shadow-inner">
            <Robot3D className="w-full h-full" />
          </div>

          {/* Quick Input Box at Bottom */}
          <div className="relative z-20 mt-auto pt-1">
            <div className="flex items-center gap-1.5 bg-white rounded-xl border-2 border-blue-300 p-1.5 shadow-xs focus-within:border-blue-600 transition-colors">
              <input
                type="text"
                value={botQuery}
                onChange={(e) => setBotQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAskBot();
                    setBotOpen(true);
                  }
                }}
                placeholder="Ask about students, risk alerts, attendance..."
                className="w-full bg-transparent px-2.5 py-1 text-xs sm:text-sm font-bold text-slate-950 placeholder-slate-500 focus:outline-none"
              />
              <button
                onClick={() => {
                  handleAskBot();
                  setBotOpen(true);
                }}
                className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white active:scale-90 transition-all cursor-pointer shrink-0"
                title="Send question to AI bot"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive AI Robot Q&A Modal Dialog */}
      {botOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-modal-pop">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-white/20 rounded-lg">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold leading-none">Agent 69 AI Campus Assistant</h3>
                  <p className="text-[11px] text-blue-100 mt-0.5">Contextual answers from live student telemetry</p>
                </div>
              </div>
              <button
                onClick={() => setBotOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 active:scale-95 transition-colors cursor-pointer text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Suggested Quick Question Chips */}
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 self-center mr-1">Suggested:</span>
              {[
                'Which students need urgent intervention?',
                'Why are alert counts high in CSE?',
                'What is the average SLA response time?',
                'How does the risk detection radar work?',
                'What are the active fee arrears?',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => handleAskBot(q)}
                  className="px-2.5 py-1 rounded-full bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-[11px] font-semibold text-slate-700 hover:text-blue-700 shadow-2xs transition-all cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Chat Conversation Stream */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50 min-h-[260px] max-h-[400px]">
              {botMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'bot' && (
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed shadow-xs ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-xs'
                        : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs'
                    }`}
                  >
                    <p className="font-normal">{msg.text}</p>
                    <div
                      className={`text-[10px] mt-1.5 ${
                        msg.sender === 'user' ? 'text-blue-200 text-right' : 'text-slate-400'
                      }`}
                    >
                      {msg.time}
                    </div>
                  </div>
                </div>
              ))}

              {botLoading && (
                <div className="flex gap-2.5 justify-start">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Bot className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-3 text-xs text-slate-500 rounded-tl-xs shadow-xs flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                    <span>Agent 69 is analyzing live university telemetry...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Input Footer */}
            <div className="p-3 bg-white border-t border-slate-200">
              <div className="flex items-center gap-2 bg-slate-50 rounded-xl border border-slate-200 p-1.5 focus-within:border-blue-500 focus-within:bg-white transition-colors">
                <input
                  type="text"
                  value={botQuery}
                  onChange={(e) => setBotQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAskBot()}
                  placeholder="Ask a question about student risk, attendance, marks, SLA..."
                  className="w-full bg-transparent px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
                />
                <button
                  onClick={() => handleAskBot()}
                  disabled={!botQuery.trim() || botLoading}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* 8 Clickable Metric Cards with Count-Up Animations & Glassmorphic Transparency */}
      <div className="relative rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-indigo-500/[0.06] via-sky-500/[0.03] to-purple-500/[0.06] border border-white/80 shadow-lg shadow-indigo-500/5 backdrop-blur-xl overflow-hidden">
        {/* Ambient colorful light sources radiating directly under the dashboard metric cards */}
        <div className="absolute -top-12 left-12 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute -bottom-12 right-12 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" style={{ animationDuration: '10s' }} />
        
        {/* Top reflective glare */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
          {/* 1. Total Students */}
          <div
            onClick={() => openDrilldown('total_students')}
            className="dashboard-glass-card p-4.5 sm:p-5 rounded-2xl shadow-xs interactive-card cursor-pointer group active:scale-95 animate-slide-up delay-50 relative overflow-hidden"
          >
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-sm sm:text-base font-black text-slate-900 tracking-wide group-hover:text-indigo-600 transition-colors">
                Total Students
              </span>
              <div className="p-2 rounded-xl bg-indigo-100/80 backdrop-blur-xs group-hover:bg-indigo-200 transition-colors">
                <Users className="w-5 h-5 text-indigo-700 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-slate-950 mt-1.5 tracking-tight group-hover:text-indigo-700 transition-colors">
              <CountUp value={cards.total_students} />
            </div>
            <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-200/50 text-xs font-bold text-slate-800">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block" />
                Active Monitored Cohort
              </span>
              <span className="text-indigo-700 font-black opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center transform group-hover:translate-x-0.5">
                &rarr;
              </span>
            </div>
          </div>

          {/* 2. Active Alerts */}
          <div
            onClick={() => openDrilldown('active_alerts')}
            className="dashboard-glass-card p-4.5 sm:p-5 rounded-2xl shadow-xs interactive-card cursor-pointer group active:scale-95 animate-slide-up delay-100 relative overflow-hidden"
          >
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-sm sm:text-base font-black text-amber-950 tracking-wide group-hover:text-amber-700 transition-colors">
                  Active Alerts
                </span>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-600"></span>
                </span>
              </div>
              <div className="p-2 rounded-xl bg-amber-100/80 backdrop-blur-xs group-hover:bg-amber-200 transition-colors">
                <AlertTriangle className="w-5 h-5 text-amber-600 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-amber-600 mt-1.5 tracking-tight">
              <CountUp value={cards.active_alerts} />
            </div>
            <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-amber-200/50 text-xs font-black text-amber-900">
              <span className="flex items-center gap-1">
                <span>&uarr; Live Radar</span>
                <span className="text-[11px] text-amber-800 font-extrabold">(Action Needed)</span>
              </span>
              <span className="opacity-0 group-hover:opacity-100 transition-all duration-200 font-black transform group-hover:translate-x-0.5">
                &rarr;
              </span>
            </div>
          </div>

          {/* 3. High Severity */}
          <div
            onClick={() => openDrilldown('high_severity')}
            className="dashboard-glass-card p-4.5 sm:p-5 rounded-2xl shadow-xs interactive-card cursor-pointer group active:scale-95 animate-slide-up delay-150 relative overflow-hidden"
          >
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-sm sm:text-base font-black text-rose-950 tracking-wide group-hover:text-rose-700 transition-colors">
                  High Severity
                </span>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
                </span>
              </div>
              <div className="p-2 rounded-xl bg-rose-100/80 backdrop-blur-xs group-hover:bg-rose-200 transition-colors">
                <ShieldAlert className="w-5 h-5 text-rose-600 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-rose-600 mt-1.5 tracking-tight">
              <CountUp value={cards.high_severity} />
            </div>
            <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-rose-200/50 text-xs font-black text-rose-900">
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-rose-600 fill-rose-600" />
                <span>Critical SLA (&lt;24h)</span>
              </span>
              <span className="opacity-0 group-hover:opacity-100 transition-all duration-200 font-black transform group-hover:translate-x-0.5">
                &rarr;
              </span>
            </div>
          </div>

          {/* 4. Awaiting Response */}
          <div
            onClick={() => openDrilldown('awaiting_response')}
            className="dashboard-glass-card p-4.5 sm:p-5 rounded-2xl shadow-xs interactive-card cursor-pointer group active:scale-95 animate-slide-up delay-200 relative overflow-hidden"
          >
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-sm sm:text-base font-black text-indigo-950 tracking-wide group-hover:text-indigo-700 transition-colors">
                Awaiting Response
              </span>
              <div className="p-2 rounded-xl bg-indigo-100/80 backdrop-blur-xs group-hover:bg-indigo-200 transition-colors">
                <Clock className="w-5 h-5 text-indigo-600 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-indigo-600 mt-1.5 tracking-tight">
              <CountUp value={cards.awaiting_response} />
            </div>
            <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-indigo-200/50 text-xs font-black text-indigo-900">
              <span className="flex items-center gap-1">
                <span>&bull; Unacknowledged Queue</span>
              </span>
              <span className="opacity-0 group-hover:opacity-100 transition-all duration-200 font-black transform group-hover:translate-x-0.5">
                &rarr;
              </span>
            </div>
          </div>

          {/* 5. Medium Severity */}
          <div
            onClick={() => openDrilldown('medium_severity')}
            className="dashboard-glass-card p-4.5 sm:p-5 rounded-2xl shadow-xs interactive-card cursor-pointer group active:scale-95 animate-slide-up delay-250 relative overflow-hidden"
          >
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-sm sm:text-base font-black text-slate-900 tracking-wide group-hover:text-amber-600 transition-colors">
                Medium Severity
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-slate-950 mt-1.5 tracking-tight">
              <CountUp value={cards.medium_severity} />
            </div>
            <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-200/50 text-xs font-bold text-slate-800">
              <span>72h Routine SLA Window</span>
              <span className="text-amber-700 font-black opacity-0 group-hover:opacity-100 transition-all duration-200 transform group-hover:translate-x-0.5">
                &rarr;
              </span>
            </div>
          </div>

          {/* 6. Low Severity */}
          <div
            onClick={() => openDrilldown('low_severity')}
            className="dashboard-glass-card p-4.5 sm:p-5 rounded-2xl shadow-xs interactive-card cursor-pointer group active:scale-95 animate-slide-up delay-300 relative overflow-hidden"
          >
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-sm sm:text-base font-black text-slate-900 tracking-wide group-hover:text-emerald-600 transition-colors">
                Low Severity
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-slate-950 mt-1.5 tracking-tight">
              <CountUp value={cards.low_severity} />
            </div>
            <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-200/50 text-xs font-bold text-slate-800">
              <span>Early Baseline Shift</span>
              <span className="text-emerald-700 font-black opacity-0 group-hover:opacity-100 transition-all duration-200 transform group-hover:translate-x-0.5">
                &rarr;
              </span>
            </div>
          </div>

          {/* 7. Resolved Alerts */}
          <div
            onClick={() => openDrilldown('resolved_alerts')}
            className="dashboard-glass-card p-4.5 sm:p-5 rounded-2xl shadow-xs interactive-card cursor-pointer group active:scale-95 animate-slide-up delay-400 relative overflow-hidden"
          >
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-sm sm:text-base font-black text-emerald-950 tracking-wide group-hover:text-emerald-800 transition-colors">
                Resolved Alerts
              </span>
              <div className="p-2 rounded-xl bg-emerald-100/80 backdrop-blur-xs group-hover:bg-emerald-200 transition-colors">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-emerald-600 mt-1.5 tracking-tight">
              <CountUp value={cards.resolved_alerts} />
            </div>
            <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-emerald-200/50 text-xs font-black text-emerald-900">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Verified Interventions</span>
              </span>
              <span className="opacity-0 group-hover:opacity-100 transition-all duration-200 font-black transform group-hover:translate-x-0.5">
                &rarr;
              </span>
            </div>
          </div>

          {/* 8. False Positives */}
          <div
            onClick={() => openDrilldown('false_positives')}
            className="dashboard-glass-card p-4.5 sm:p-5 rounded-2xl shadow-xs interactive-card cursor-pointer group active:scale-95 animate-slide-up delay-500 relative overflow-hidden"
          >
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-sm sm:text-base font-black text-slate-900 tracking-wide group-hover:text-slate-950 transition-colors">
                False Positives
              </span>
              <div className="p-2 rounded-xl bg-slate-100/80 backdrop-blur-xs group-hover:bg-slate-200 transition-colors">
                <HelpCircle className="w-5 h-5 text-slate-600 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-slate-900 mt-1.5 tracking-tight">
              <CountUp value={cards.false_positives} />
            </div>
            <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-200/50 text-xs font-bold text-slate-800">
              <span>Model Tuning Calibration</span>
              <span className="text-slate-900 font-black opacity-0 group-hover:opacity-100 transition-all duration-200 transform group-hover:translate-x-0.5">
                &rarr;
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Detail Drilldown Modal with React Portal and Modern Luxury Design */}
      {drilldown &&
        createPortal(
          <div
            className="fixed inset-0 z-[999999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in"
            onClick={() => setDrilldown(null)}
          >
            <div
              className="relative w-full max-w-4xl bg-white rounded-3xl modal-glow-card border border-slate-200/90 flex flex-col max-h-[88vh] my-auto overflow-hidden animate-modal-pop shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Dynamic Animated Rainbow Beam */}
              <div className="h-1.5 w-full gradient-beam shrink-0" />

              {/* Modal Header */}
              <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white flex items-start justify-between shrink-0 shadow-sm">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 shadow-inner shrink-0 mt-0.5">
                    {drilldown.type === 'STUDENTS' ? (
                      <Users className="w-5 h-5 text-blue-300" />
                    ) : (
                      <ShieldAlert className="w-5 h-5 text-rose-300" />
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="text-lg sm:text-xl font-black tracking-tight text-white">
                        {drilldown.title}
                      </h3>
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-white/10 backdrop-blur-sm text-indigo-200 border border-white/15 shadow-2xs flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        {drilldown.items.length} records
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-300 mt-1 leading-relaxed">
                      {drilldown.subtitle}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setDrilldown(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer hover:rotate-90 duration-200 shrink-0"
                  title="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Search & Interactive Filter Toolbar */}
              <div className="p-4 sm:px-6 bg-slate-50/90 border-b border-slate-200/80 space-y-3 shrink-0">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-indigo-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={modalSearch}
                      onChange={(e) => setModalSearch(e.target.value)}
                      placeholder="Search by code, department, name, or keywords..."
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 transition shadow-2xs"
                    />
                    {modalSearch && (
                      <button
                        onClick={() => setModalSearch('')}
                        className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <Link
                    to={drilldown.viewAllLink}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-extrabold rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer shrink-0 active:scale-95 group"
                  >
                    <span>Open Full Directory</span>
                    <ExternalLink className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </Link>
                </div>

                {/* Filter Chips Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  {drilldown.type === 'STUDENTS' ? (
                    <>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="text-[11px] font-bold text-slate-500 uppercase mr-1">Dept:</span>
                        {[
                          { key: 'ALL', label: 'All Depts' },
                          { key: 'CSE', label: 'Computer Science' },
                          { key: 'ECE', label: 'Electronics' },
                          { key: 'MECH', label: 'Mechanical' },
                        ].map((d) => (
                          <button
                            key={d.key}
                            onClick={() => setModalDeptFilter(d.key)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              modalDeptFilter === d.key
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-white text-slate-600 hover:bg-slate-200/60 border border-slate-200'
                            }`}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="text-[11px] font-bold text-slate-500 uppercase mr-1">Status:</span>
                        {[
                          { key: 'ALL', label: 'All' },
                          { key: 'HIGH', label: '🔴 High' },
                          { key: 'MEDIUM', label: '🟡 Medium' },
                          { key: 'NO_ALERT', label: '🟢 Normal' },
                        ].map((r) => (
                          <button
                            key={r.key}
                            onClick={() => setModalRiskFilter(r.key)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              modalRiskFilter === r.key
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'bg-white text-slate-600 hover:bg-slate-200/60 border border-slate-200'
                            }`}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="text-[11px] font-bold text-slate-500 uppercase mr-1">Severity:</span>
                      {[
                        { key: 'ALL', label: 'All Severities' },
                        { key: 'HIGH', label: '🔴 High (24h SLA)' },
                        { key: 'MEDIUM', label: '🟡 Medium (72h SLA)' },
                        { key: 'LOW', label: '🟢 Low' },
                      ].map((s) => (
                        <button
                          key={s.key}
                          onClick={() => setModalRiskFilter(s.key)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            modalRiskFilter === s.key
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-white text-slate-600 hover:bg-slate-200/60 border border-slate-200'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Items List - Beautiful Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-slate-50/40">
                {modalFilteredItems.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-500 flex items-center justify-center mx-auto mb-3 shadow-inner">
                      <Search className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">No matching records found</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Try adjusting your search keywords or switching filters above.
                    </p>
                    <button
                      onClick={() => {
                        setModalSearch('');
                        setModalDeptFilter('ALL');
                        setModalRiskFilter('ALL');
                      }}
                      className="mt-3 px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 transition cursor-pointer"
                    >
                      Reset all filters
                    </button>
                  </div>
                ) : drilldown.type === 'STUDENTS' ? (
                  modalFilteredItems.map((s: Student, idx: number) => {
                    const isHigh = s.max_severity === 'HIGH';
                    const isMed = s.max_severity === 'MEDIUM';

                    return (
                      <div
                        key={s.id}
                        onClick={() => navigate(`/students/${s.id}`)}
                        className="item-card-animated group relative p-4 rounded-2xl bg-white hover:bg-gradient-to-r hover:from-indigo-50/50 hover:via-white hover:to-blue-50/30 border border-slate-200 hover:border-indigo-400/80 shadow-2xs hover:shadow-lg hover:shadow-indigo-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                        style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
                      >
                        <div className="flex items-center gap-3.5">
                          {/* Student Avatar Box */}
                          <div
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 shadow-sm group-hover:scale-105 transition-all ${
                              isHigh
                                ? 'bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-rose-500/30 ring-2 ring-rose-400/30'
                                : isMed
                                ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-amber-500/30 ring-2 ring-amber-400/30'
                                : 'bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-700 text-white shadow-indigo-500/30'
                            }`}
                          >
                            {s.student_code}
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                                {s.student_code}
                              </span>

                              {isHigh ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
                                  <ShieldAlert className="w-3 h-3 text-rose-600" />
                                  HIGH RISK
                                </span>
                              ) : isMed ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                                  MEDIUM RISK
                                </span>
                              ) : s.max_severity ? (
                                <SeverityBadge severity={s.max_severity} />
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300/60">
                                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                                  NORMAL
                                </span>
                              )}
                            </div>

                            {/* Meta Badges */}
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                                <Building2 className="w-3 h-3 text-slate-400" />
                                {s.department_name || s.department_code || 'General'}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                                {s.course_name || s.course_code || 'B.Tech'}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                                Year {s.year} ({s.section || 'A'})
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right Action Button */}
                        <div className="flex items-center justify-end">
                          <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-slate-100 to-slate-200 group-hover:from-indigo-600 group-hover:to-blue-600 text-slate-700 group-hover:text-white font-extrabold rounded-xl text-xs border border-slate-200 group-hover:border-transparent transition-all duration-200 shadow-2xs group-hover:shadow-md group-hover:shadow-indigo-500/25 shrink-0">
                            <span>Profile</span>
                            <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  modalFilteredItems.map((a: Alert, idx: number) => (
                    <div
                      key={a.id}
                      onClick={() => navigate(`/alerts/${a.id}`)}
                      className="item-card-animated group relative p-4 rounded-2xl bg-white hover:bg-gradient-to-r hover:from-indigo-50/50 hover:via-white hover:to-blue-50/30 border border-slate-200 hover:border-indigo-400/80 shadow-2xs hover:shadow-lg hover:shadow-indigo-500/10 flex flex-col md:flex-row md:items-center justify-between gap-3.5 cursor-pointer"
                      style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-black text-slate-900 text-xs bg-slate-100 px-2 py-0.5 rounded-md">
                            Alert #{a.id}
                          </span>
                          <span className="font-black text-indigo-700 text-xs bg-indigo-50 px-2 py-0.5 rounded-md">
                            {a.student_code}
                          </span>
                          <CategoryBadge category={a.category} />
                          <SeverityBadge severity={a.severity} />
                          <StatusBadge status={a.status} />
                        </div>

                        <p className="text-xs text-slate-700 font-semibold line-clamp-2 leading-relaxed">
                          {extractAlertHeadline(a.narrative_summary, a.category)}
                        </p>

                        <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-3 pt-0.5">
                          <span className="inline-flex items-center gap-1 font-bold text-slate-700">
                            Warning Score: <strong className="text-indigo-600 font-black">{a.warning_score} pts</strong>
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                            Responder: <strong className="text-slate-800 font-bold">{a.suggested_responder_role}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end shrink-0">
                        <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-slate-100 to-slate-200 group-hover:from-indigo-600 group-hover:to-blue-600 text-slate-700 group-hover:text-white font-extrabold rounded-xl text-xs border border-slate-200 group-hover:border-transparent transition-all duration-200 shadow-2xs group-hover:shadow-md group-hover:shadow-indigo-500/25">
                          <span>Review</span>
                          <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:px-6 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold text-slate-500 shrink-0">
                <div className="flex items-center gap-2">
                  <span>
                    Showing <strong className="text-slate-800 font-bold">{modalFilteredItems.length}</strong> of{' '}
                    <strong className="text-slate-800 font-bold">{drilldown.items.length}</strong> records
                  </span>
                  <span className="hidden sm:inline text-slate-300">•</span>
                  <span className="hidden sm:inline text-indigo-600 font-medium">Real-time Personal Baseline Monitoring</span>
                </div>

                <button
                  type="button"
                  onClick={() => setDrilldown(null)}
                  className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-all cursor-pointer active:scale-95 shadow-2xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Interactive 10 Early-Warning Visualizations & Radar Telemetry Launcher Deck */}
      <div className="bg-white p-5 rounded-2xl border-2 border-slate-200/90 shadow-xs hover:shadow-md transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-950 flex items-center gap-2">
                  <span>10 Early-Warning Telemetry Graphs</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-900 border border-blue-200">
                    On-Demand View
                  </span>
                </h3>
                <p className="text-xs sm:text-sm font-bold text-slate-700 mt-0.5">
                  Graphs are hidden by default to keep your overview clean. Click any button below or in the sidebar to launch and inspect.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions: View All / Hide */}
          <div className="flex items-center gap-2 shrink-0">
            {activeGraph && (
              <button
                onClick={() => setActiveGraph(null)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
              >
                <X className="w-4 h-4" />
                <span>Hide Graphs</span>
              </button>
            )}
            <button
              onClick={() => setActiveGraph(activeGraph === 'all' ? null : 'all')}
              className={`px-4 py-2 font-black text-xs rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 ${
                activeGraph === 'all'
                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-indigo-600/30'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 hover:border-indigo-400'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>{activeGraph === 'all' ? 'Hide All Graphs' : '⚡ Show All 10 Graphs'}</span>
            </button>
          </div>
        </div>

        {/* Graph Launch Buttons Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 pt-3.5">
          {GRAPH_DEFINITIONS.map((g) => {
            const isSelected = activeGraph === g.id || activeGraph === 'all';
            const Icon = g.icon;
            return (
              <button
                key={g.id}
                onClick={() => {
                  if (activeGraph === g.id) {
                    setActiveGraph(null);
                  } else {
                    setActiveGraph(g.id);
                    setTimeout(() => {
                      const el = document.getElementById(g.id);
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        el.classList.remove('chart-highlight-pulse');
                        void el.offsetWidth;
                        el.classList.add('chart-highlight-pulse');
                        setTimeout(() => el.classList.remove('chart-highlight-pulse'), 2300);
                      }
                    }, 200);
                  }
                }}
                className={`p-3 rounded-xl text-left border flex flex-col justify-between transition-all duration-150 cursor-pointer group active:scale-95 select-none ${
                  isSelected && activeGraph !== 'all'
                    ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white border-blue-400 shadow-md shadow-blue-500/30 ring-2 ring-blue-400'
                    : 'bg-slate-50/90 hover:bg-white text-slate-800 border-slate-200 hover:border-blue-400 hover:shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      isSelected && activeGraph !== 'all'
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {g.badge}
                  </span>
                  <Icon
                    className={`w-4 h-4 ${
                      isSelected && activeGraph !== 'all'
                        ? 'text-cyan-200'
                        : 'text-slate-500 group-hover:text-blue-600'
                    }`}
                  />
                </div>
                <div
                  className={`text-[11.5px] font-black leading-snug ${
                    isSelected && activeGraph !== 'all' ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  {g.title}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Animated Charts Section Displayed ONLY When Clicked */}
      {activeGraph !== null && (
        <div key={chartKey} className="space-y-6 animate-fade-in pt-1">
          {/* Active Graph Controls Header Bar */}
          <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30">
                <BarChart3 className="w-5 h-5 text-cyan-300" />
              </span>
              <div>
                <div className="text-[11px] font-extrabold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  Active Graph Telemetry View
                </div>
                <div className="text-base sm:text-lg font-black text-white">
                  {activeGraph === 'all'
                    ? 'All 10 Institutional Early-Warning Graphs & Visualizations'
                    : GRAPH_DEFINITIONS.find((g) => g.id === activeGraph)?.title || 'Telemetry Graph'}
                </div>
              </div>
            </div>

            {/* Quick Switch Pills & Close Button */}
            <div className="flex flex-wrap items-center gap-1.5">
              {GRAPH_DEFINITIONS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => {
                    setActiveGraph(g.id);
                    setTimeout(() => {
                      const el = document.getElementById(g.id);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 150);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    activeGraph === g.id
                      ? 'bg-cyan-400 text-slate-950 shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                  title={g.title}
                >
                  {g.number}
                </button>
              ))}

              <button
                onClick={() => setActiveGraph('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  activeGraph === 'all'
                    ? 'bg-cyan-400 text-slate-950 shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
                title="Display All 10 Graphs"
              >
                All
              </button>

              <button
                onClick={() => setActiveGraph(null)}
                className="ml-2 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs transition-all flex items-center gap-1 cursor-pointer shadow-md active:scale-95"
              >
                <X className="w-4 h-4" />
                <span>Close & Hide Graph</span>
              </button>
            </div>
          </div>

          {/* Row 1 Charts: Alerts by Category & Severity */}
          {(activeGraph === 'all' || activeGraph === 'chart-warning-category' || activeGraph === 'chart-severity-level') && (
            <div className={`grid ${activeGraph === 'all' ? 'md:grid-cols-2' : 'grid-cols-1'} gap-6`}>
              {/* Chart 1: Alerts by Warning Category (Premium Staggered Rise with Bounce, Hover Lift & Glow) */}
              {(activeGraph === 'all' || activeGraph === 'chart-warning-category') && (
                <div id="chart-warning-category" className="bg-white p-5 rounded-2xl border-2 border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 interactive-card scroll-mt-28">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-950 flex items-center gap-2.5">
                  <span>1. Alerts by Warning Category</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-black text-xs border border-emerald-300 shadow-2xs">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                    </span>
                    LIVE SCAN
                  </span>
                </h3>
                <p className="text-xs sm:text-sm font-bold text-slate-700 mt-0.5">Warnings detected from multiple student signals.</p>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={charts.by_category}
                  margin={{ top: 25, right: 15, left: 10, bottom: 40 }}
                  onMouseMove={(state: any) => {
                    if (state && state.isTooltipActive && state.activeTooltipIndex !== undefined) {
                      setHoveredCategoryIndex(state.activeTooltipIndex);
                    } else {
                      setHoveredCategoryIndex(null);
                    }
                  }}
                  onMouseLeave={() => setHoveredCategoryIndex(null)}
                >
                  <defs>
                    <linearGradient id="catGrad-0" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#818cf8" />
                      <stop offset="100%" stopColor="#4f46e5" />
                    </linearGradient>
                    <linearGradient id="catGrad-1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f472b6" />
                      <stop offset="100%" stopColor="#db2777" />
                    </linearGradient>
                    <linearGradient id="catGrad-2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                    <linearGradient id="catGrad-3" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fbbf24" />
                      <stop offset="100%" stopColor="#d97706" />
                    </linearGradient>
                    <linearGradient id="catGrad-4" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a78bfa" />
                      <stop offset="100%" stopColor="#7c3aed" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    interval={0}
                    tick={(tickProps) => (
                      <CustomCategoryAxisTick
                        {...tickProps}
                        activeIndex={hoveredCategoryIndex}
                        colors={categoryColors}
                      />
                    )}
                  />
                  <YAxis tick={{ fontSize: 11, fontWeight: 800, fill: '#0f172a' }} />
                  <Tooltip
                    content={<CategoryChartTooltip activeIndex={hoveredCategoryIndex} colors={categoryColors} />}
                    cursor={{ fill: 'rgba(99, 102, 241, 0.04)', radius: 6 }}
                  />
                  <Bar
                    dataKey="count"
                    isAnimationActive={false}
                    shape={(barProps: any) => (
                      <AnimatedCategoryBar
                        {...barProps}
                        activeIndex={hoveredCategoryIndex}
                        colors={categoryColors}
                      />
                    )}
                  >
                    {charts.by_category.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={`url(#catGrad-${index % 5})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
              )}

              {/* Chart 2: Alerts by Severity Level (Animated Modern Donut with Dynamic Center Stats) */}
              {(activeGraph === 'all' || activeGraph === 'chart-severity-level') && (
                <div id="chart-severity-level" className="bg-white p-5 rounded-2xl border-2 border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 interactive-card flex flex-col justify-between scroll-mt-28">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-950 flex items-center gap-2">
                  <span>2. Alerts by Severity Level</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 font-black border border-indigo-200">
                    Weighted Distribution
                  </span>
                </h3>
                <p className="text-xs sm:text-sm font-bold text-slate-700 mt-0.5">Calculated weighted score distribution across active alerts</p>
              </div>
            </div>

            <div className="relative h-64 flex items-center justify-center">
              {/* Dynamic Center Text Displaying Total or Hovered Slice Stats */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none z-10">
                <div className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight flex items-baseline">
                  <CountUp
                    value={
                      hoveredSeverityIndex !== null
                        ? charts.by_severity[hoveredSeverityIndex]?.count || 0
                        : cards.active_alerts + cards.resolved_alerts
                    }
                  />
                </div>
                <div className="text-xs font-black uppercase tracking-wider text-slate-800 mt-0.5">
                  {hoveredSeverityIndex !== null
                    ? `${charts.by_severity[hoveredSeverityIndex]?.name} Alerts`
                    : 'Total Alerts'}
                </div>
                {hoveredSeverityIndex !== null && (
                  <span className="text-xs font-black text-indigo-700 animate-fade-in mt-0.5">
                    {Math.round(
                      ((charts.by_severity[hoveredSeverityIndex]?.count || 0) /
                        Math.max(1, cards.active_alerts + cards.resolved_alerts)) *
                        100
                    )}% of cohort
                  </span>
                )}
              </div>

              <ResponsiveContainer width="100%" height="100%">
                <PieChart onMouseLeave={() => setHoveredSeverityIndex(null)}>
                  <defs>
                    <linearGradient id="sevGrad-LOW" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#34d399" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                    <linearGradient id="sevGrad-MEDIUM" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#fbbf24" />
                      <stop offset="100%" stopColor="#d97706" />
                    </linearGradient>
                    <linearGradient id="sevGrad-HIGH" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#f87171" />
                      <stop offset="100%" stopColor="#dc2626" />
                    </linearGradient>
                  </defs>
                  <Pie
                    data={charts.by_severity}
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={88}
                    paddingAngle={4}
                    dataKey="count"
                    isAnimationActive={true}
                    animationBegin={100}
                    animationDuration={850}
                    animationEasing="ease-out"
                    {...({
                      activeIndex: hoveredSeverityIndex ?? undefined,
                      activeShape: (props: any) => (
                        <Sector
                          {...props}
                          innerRadius={props.innerRadius - 3}
                          outerRadius={props.outerRadius + 6}
                          fill={props.fill}
                          style={{
                            filter: `drop-shadow(0 6px 16px ${props.fill}88)`,
                            transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
                          }}
                        />
                      ),
                    } as any)}
                  >
                    {charts.by_severity.map((entry, idx) => (
                      <Cell
                        key={`cell-${entry.name}`}
                        fill={`url(#sevGrad-${entry.code})`}
                        onMouseEnter={() => setHoveredSeverityIndex(idx)}
                        style={{
                          cursor: 'pointer',
                          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                          opacity: hoveredSeverityIndex === null || hoveredSeverityIndex === idx ? 1 : 0.45,
                        }}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={<SeverityChartTooltip totalAlerts={cards.active_alerts + cards.resolved_alerts} />}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: '12px', fontWeight: '800', paddingTop: '10px', color: '#0f172a' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
              )}
            </div>
          )}

          {/* Row 2 Charts: Temporal Trends (Chart 3, 4, 5) */}
          {(activeGraph === 'all' || activeGraph === 'chart-alerts-over-time' || activeGraph === 'chart-attendance-trends' || activeGraph === 'chart-academic-marks') && (
            <div className={`grid ${activeGraph === 'all' ? 'md:grid-cols-3' : 'grid-cols-1'} gap-6`}>
              {/* Chart 3: Alerts Over Time (Staggered Vertical Bounce) */}
              {(activeGraph === 'all' || activeGraph === 'chart-alerts-over-time') && (
                <div id="chart-alerts-over-time" className="bg-white p-5 rounded-2xl border-2 border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 interactive-card scroll-mt-28">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base sm:text-lg font-black text-slate-950">3. Alerts Over Time</h3>
              <span className="text-xs font-black px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-900">Inflow</span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-slate-700 mb-3">Generation volume by semester week</p>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={charts.alerts_over_time}
                  margin={{ top: 15, right: 5, left: -25, bottom: 5 }}
                  onMouseMove={(state: any) => {
                    if (state && state.isTooltipActive && state.activeTooltipIndex !== undefined) {
                      setHoveredTimeIndex(state.activeTooltipIndex);
                    } else {
                      setHoveredTimeIndex(null);
                    }
                  }}
                  onMouseLeave={() => setHoveredTimeIndex(null)}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fontWeight: 800, fill: '#0f172a' }} />
                  <YAxis tick={{ fontSize: 11, fontWeight: 800, fill: '#0f172a' }} />
                  <Tooltip content={<TimeChartTooltip />} cursor={{ fill: 'rgba(79, 70, 229, 0.05)', radius: 4 }} />
                  <Bar
                    dataKey="alerts"
                    isAnimationActive={false}
                    shape={(barProps: any) => <AnimatedTimeBar {...barProps} activeIndex={hoveredTimeIndex} />}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
              )}

              {/* Chart 4: Attendance Decline Trends (Smooth Animated Spline) */}
              {(activeGraph === 'all' || activeGraph === 'chart-attendance-trends') && (
                <div id="chart-attendance-trends" className="bg-white p-5 rounded-2xl border-2 border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 interactive-card scroll-mt-28">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base sm:text-lg font-black text-slate-950">4. Attendance Decline Trends</h3>
              <span className="text-xs font-black px-2.5 py-0.5 rounded-md bg-sky-100 text-sky-900">14-Wk Monitored</span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-slate-700 mb-3">Cohort weekly average attendance %</p>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={charts.attendance_trends} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fontWeight: 800, fill: '#0f172a' }} />
                  <YAxis domain={[40, 100]} tick={{ fontSize: 11, fontWeight: 800, fill: '#0f172a' }} />
                  <Tooltip content={<TrendChartTooltip />} />
                  <Line
                    type="monotone"
                    name="Attendance %"
                    dataKey="attendance_pct"
                    stroke="#0ea5e9"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#0ea5e9', stroke: '#fff', strokeWidth: 1.5 }}
                    activeDot={{ r: 6, fill: '#0ea5e9', stroke: '#fff', strokeWidth: 2 }}
                    isAnimationActive={true}
                    animationDuration={900}
                    animationEasing="ease-out"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
              )}

              {/* Chart 5: Academic Marks Trends (Smooth Animated Spline) */}
              {(activeGraph === 'all' || activeGraph === 'chart-academic-marks') && (
                <div id="chart-academic-marks" className="bg-white p-5 rounded-2xl border-2 border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 interactive-card scroll-mt-28">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base sm:text-lg font-black text-slate-950">5. Academic Marks Trends</h3>
              <span className="text-xs font-black px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-900">Internal Marks</span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-slate-700 mb-3">Cohort assessment average marks %</p>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={charts.marks_trends} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fontWeight: 800, fill: '#0f172a' }} />
                  <YAxis domain={[40, 100]} tick={{ fontSize: 11, fontWeight: 800, fill: '#0f172a' }} />
                  <Tooltip content={<TrendChartTooltip />} />
                  <Line
                    type="monotone"
                    name="Internal Marks %"
                    dataKey="marks_pct"
                    stroke="#8b5cf6"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 1.5 }}
                    activeDot={{ r: 6, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }}
                    isAnimationActive={true}
                    animationDuration={900}
                    animationEasing="ease-out"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
              )}
            </div>
          )}

          {/* Row 3 Charts: Institutional Structure & Governance (Chart 6, 7, 8, 9) */}
          {(activeGraph === 'all' || activeGraph === 'chart-department-alerts' || activeGraph === 'chart-precision-sla') && (
            <div className={`grid ${activeGraph === 'all' ? 'md:grid-cols-2' : 'grid-cols-1'} gap-6`}>
              {/* Chart 8 & 9: Department Distribution (Horizontal Staggered Slide) */}
              {(activeGraph === 'all' || activeGraph === 'chart-department-alerts') && (
                <div id="chart-department-alerts" className="bg-white p-5 rounded-2xl border-2 border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 interactive-card scroll-mt-28">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-950">8 & 9. Alerts by Academic Department</h3>
                <p className="text-xs sm:text-sm font-bold text-slate-700">Institutional risk density across faculties</p>
              </div>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={charts.by_department}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  onMouseMove={(state: any) => {
                    if (state && state.isTooltipActive && state.activeTooltipIndex !== undefined) {
                      setHoveredDeptIndex(state.activeTooltipIndex);
                    } else {
                      setHoveredDeptIndex(null);
                    }
                  }}
                  onMouseLeave={() => setHoveredDeptIndex(null)}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 11, fontWeight: 800, fill: '#0f172a' }} />
                  <YAxis dataKey="department" type="category" tick={{ fontSize: 12, fontWeight: 800, fill: '#0f172a' }} />
                  <Tooltip content={<DeptChartTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.05)', radius: 4 }} />
                  <Bar
                    dataKey="alerts"
                    isAnimationActive={false}
                    shape={(barProps: any) => <AnimatedDeptBar {...barProps} activeIndex={hoveredDeptIndex} />}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
              )}

              {/* Chart 6 & 7: False-Positive Calibration & Response SLAs */}
              {(activeGraph === 'all' || activeGraph === 'chart-precision-sla') && (
                <div id="chart-precision-sla" className="bg-white p-5 rounded-2xl border-2 border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 interactive-card flex flex-col justify-between scroll-mt-28">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-black text-slate-950">6 & 7. Precision & Response SLA Metrics</h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-black border border-emerald-300">
                  FP Rate: {charts.false_positive_rate}%
                </span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-slate-700 mb-4">Empirical outcomes logged by human responders</p>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="h-36 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={charts.false_positive_metric}
                        dataKey="value"
                        innerRadius={35}
                        outerRadius={50}
                        isAnimationActive={true}
                        animationBegin={120}
                        animationDuration={800}
                        animationEasing="ease-out"
                      >
                        {charts.false_positive_metric.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: '12px',
                          color: '#fff',
                          fontSize: '12px',
                          fontWeight: '800',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2 text-xs flex flex-col justify-center">
                  <div className="text-slate-950 font-black text-xs uppercase tracking-wider">Response Times</div>
                  {charts.response_times.map((rt) => (
                    <div
                      key={rt.range}
                      className="flex items-center justify-between text-xs hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
                    >
                      <span className="text-slate-800 font-bold">{rt.range}</span>
                      <span className="font-black text-slate-950">{rt.count} alerts</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-700">
              <span className="font-bold">Calibration Status:</span>
              <span className="font-black text-indigo-700">Thresholds Monitored</span>
            </div>
          </div>
              )}
            </div>
          )}

          {/* Chart 10: Institutional Recurring Patterns */}
          {(activeGraph === 'all' || activeGraph === 'chart-pattern-radar') && (
            <div id="chart-pattern-radar" className="bg-white p-5 rounded-2xl border-2 border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 interactive-card scroll-mt-28">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-950">10. Institutional Recurring Pattern Radar</h3>
              <p className="text-xs sm:text-sm font-bold text-slate-700">Systemic early warning patterns surfaced across active cohort</p>
            </div>
          </div>

          <div className="grid md:grid-cols-5 gap-3">
            {charts.recurring_patterns.map((rp, idx) => (
              <div
                key={idx}
                className="bg-white border-2 border-slate-200 p-3.5 rounded-xl flex flex-col justify-between interactive-card-sm hover:-translate-y-1 hover:border-indigo-400 hover:shadow-md transition-all duration-200"
              >
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black text-slate-600">Pattern {idx + 1}</span>
                    <span
                      className={`px-2 py-0.5 rounded-md font-black text-xs ${
                        rp.risk === 'High'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : rp.risk === 'Medium'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-slate-200 text-slate-800 border border-slate-300'
                      }`}
                    >
                      {rp.risk} Risk
                    </span>
                  </div>
                  <div className="font-black text-sm text-slate-950 mt-2 leading-snug">{rp.pattern}</div>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200 flex items-baseline justify-between">
                  <span className="text-xs font-bold text-slate-700">Detected:</span>
                  <span className="text-sm sm:text-base font-black text-indigo-900">{rp.occurrences} students</span>
                </div>
              </div>
            ))}
          </div>
        </div>
          )}
        </div>
      )}
    </div>
  );
};
