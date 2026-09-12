export type RoleName = 
  | 'ADMIN'
  | 'MENTOR'
  | 'HOD'
  | 'DEAN'
  | 'COUNSELLOR'
  | 'FINANCE_SUPPORT'
  | 'PRINCIPAL';

export interface Role {
  id: number;
  name: RoleName;
  description?: string;
}

export interface User {
  id: number;
  username: string;
  full_name: string;
  email: string;
  is_active: boolean;
  roles: Role[];
  department_id?: number;
}

export interface RegisterData {
  username: string;
  password: string;
  full_name: string;
  email: string;
  role?: RoleName;
  department_id?: number;
  department_code?: string;
}

export interface Student {
  id: number;
  student_code: string;
  year: number;
  section?: string;
  department_id: number;
  course_id: number;
  is_active: boolean;
  department_name?: string;
  department_code?: string;
  course_name?: string;
  course_code?: string;
  active_alert_count: number;
  max_severity?: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface BaselineItem {
  signal_type: string;
  method: string;
  mean_value?: number;
  median_value?: number;
  rolling_mean_value?: number;
  std_dev?: number;
  data_points_used: number;
  confidence: number;
  is_confident: boolean;
  last_calculated_at: string;
}

export interface SignalComparisonItem {
  signal_type: string;
  baseline_value?: number;
  current_value?: number;
  deviation?: number;
  deviation_pct?: number;
  strength: 'none' | 'weak' | 'moderate' | 'strong';
  is_sustained: boolean;
  sustained_periods: number;
  weight_applied: number;
}

export interface StudentDetail extends Student {
  baselines: BaselineItem[];
  current_signals: SignalComparisonItem[];
  recent_alerts: Alert[];
}

export type WarningCategory = 
  | 'ACADEMIC_DIFFICULTY'
  | 'DISENGAGEMENT'
  | 'FINANCIAL_DIFFICULTY'
  | 'HEALTH_PERSONAL'
  | 'GENERAL_EARLY_WARNING';

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH';
export type Urgency = 'ROUTINE' | 'PROMPT' | 'IMMEDIATE';
export type AlertStatus = 
  | 'NEW'
  | 'ACKNOWLEDGED'
  | 'IN_REVIEW'
  | 'ACTION_TAKEN'
  | 'RESOLVED'
  | 'FALSE_POSITIVE'
  | 'ESCALATED';

export type OutcomeChoice =
  | 'CONCERN_CONFIRMED'
  | 'NO_CONCERN_FOUND'
  | 'STUDENT_REQUESTED_SUPPORT'
  | 'ACADEMIC_SUPPORT_PROVIDED'
  | 'FINANCIAL_SUPPORT_PROVIDED'
  | 'COUNSELLING_REFERRAL'
  | 'OTHER'
  | 'FALSE_POSITIVE';

export interface AlertEvidence {
  id: number;
  signal_type: string;
  baseline_value?: number;
  current_value?: number;
  deviation_pct?: number;
  strength: string;
  weight_applied: number;
  description: string;
}

export interface AlertOutcome {
  id: number;
  responder_user_id: number;
  responder_name?: string;
  action_taken?: string;
  outcome: OutcomeChoice;
  concern_was_real?: boolean;
  intervention_useful?: boolean;
  is_false_positive: boolean;
  notes?: string;
  recorded_at: string;
}

export interface Alert {
  id: number;
  student_id: number;
  student_code?: string;
  department_name?: string;
  course_name?: string;
  category: WarningCategory;
  severity: Severity;
  urgency: Urgency;
  confidence: number;
  warning_score: number;
  suggested_responder_role: string;
  assigned_user_id?: number;
  assigned_user_name?: string;
  status: AlertStatus;
  narrative_summary: string;
  response_deadline?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  evidence: AlertEvidence[];
  outcome?: AlertOutcome;
}

export interface DashboardData {
  cards: {
    total_students: number;
    active_alerts: number;
    low_severity: number;
    medium_severity: number;
    high_severity: number;
    resolved_alerts: number;
    false_positives: number;
    awaiting_response: number;
  };
  charts: {
    by_category: { name: string; count: number; code: string }[];
    by_severity: { name: string; count: number; code: string }[];
    alerts_over_time: { week: string; alerts: number }[];
    attendance_trends: { week: string; attendance_pct: number }[];
    marks_trends: { week: string; marks_pct: number }[];
    false_positive_metric: { name: string; value: number; color: string }[];
    false_positive_rate: number;
    response_times: { range: string; count: number }[];
    by_department: { department: string; name: string; alerts: number }[];
    by_course: { course: string; name: string; alerts: number }[];
    recurring_patterns: { pattern: string; occurrences: number; risk: string }[];
  };
}

export interface CalibrationRun {
  id: number;
  semester_id?: number;
  total_alerts: number;
  confirmed_concerns: number;
  false_positives: number;
  false_positive_rate?: number;
  true_positive_rate?: number;
  avg_response_time_hours?: number;
  breakdown_by_category?: Record<string, number>;
  breakdown_by_severity?: Record<string, number>;
  recommendations?: {
    key: string;
    current_value: number;
    recommended_value: number;
    reason: string;
  }[];
  status: string;
  run_at: string;
  run_by_user_id?: number;
}

export interface ThresholdConfig {
  id: number;
  key: string;
  value: number;
  category: string;
  description?: string;
  is_recommended_change: boolean;
  recommended_value?: number;
  recommendation_reason?: string;
  recommendation_approved?: boolean;
  updated_at: string;
}

export interface AuditLog {
  id: number;
  user_id?: number;
  user_name?: string;
  action: string;
  object_type: string;
  object_id?: string;
  previous_value?: string;
  new_value?: string;
  ip_address?: string;
  created_at: string;
}
