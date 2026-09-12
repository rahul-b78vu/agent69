import axios from 'axios';
import {
  Student,
  StudentDetail,
  Alert,
  DashboardData,
  CalibrationRun,
  ThresholdConfig,
  AuditLog,
  User,
  RegisterData,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : '/api';

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('agent69_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('agent69_token');
      localStorage.removeItem('agent69_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (credentials: { username: string; password: string }) => {
    const res = await api.post('/auth/login', credentials);
    return res.data;
  },
  register: async (data: RegisterData) => {
    const res = await api.post('/auth/register', data);
    return res.data;
  },
  getRolesAndDepartments: async () => {
    const res = await api.get('/auth/roles-and-departments');
    return res.data;
  },
  getMe: async (): Promise<User> => {
    const res = await api.get('/auth/me');
    return res.data;
  },
  getDemoUsers: async () => {
    const res = await api.get('/auth/demo-users');
    return res.data;
  },
};

export const dashboardApi = {
  getStats: async (): Promise<DashboardData> => {
    const res = await api.get('/dashboard');
    return res.data;
  },
};

export const studentsApi = {
  list: async (params?: { department_id?: number; search?: string }): Promise<Student[]> => {
    const res = await api.get('/students', { params });
    return res.data;
  },
  getDetail: async (id: number): Promise<StudentDetail> => {
    const res = await api.get(`/students/${id}`);
    return res.data;
  },
  getSignals: async (id: number) => {
    const res = await api.get(`/students/${id}/signals`);
    return res.data;
  },
};

export const alertsApi = {
  list: async (params?: { status?: string; category?: string; severity?: string; student_id?: number }): Promise<Alert[]> => {
    const res = await api.get('/alerts', { params });
    return res.data;
  },
  getDetail: async (id: number): Promise<Alert> => {
    const res = await api.get(`/alerts/${id}`);
    return res.data;
  },
  acknowledge: async (id: number, notes?: string): Promise<Alert> => {
    const res = await api.post(`/alerts/${id}/acknowledge`, { notes });
    return res.data;
  },
  addResponse: async (id: number, notes: string) => {
    const res = await api.post(`/alerts/${id}/response`, { notes });
    return res.data;
  },
  recordAction: async (id: number, action_description: string): Promise<Alert> => {
    const res = await api.post(`/alerts/${id}/action`, { action_description });
    return res.data;
  },
  resolve: async (
    id: number,
    payload: {
      outcome: string;
      action_taken?: string;
      concern_was_real?: boolean;
      intervention_useful?: boolean;
      notes?: string;
    }
  ) => {
    const res = await api.post(`/alerts/${id}/resolve`, payload);
    return res.data;
  },
  markFalsePositive: async (id: number, reason: string) => {
    const res = await api.post(`/alerts/${id}/false-positive`, { reason });
    return res.data;
  },
  escalate: async (id: number, payload: { reason: string; target_role?: string }) => {
    const res = await api.post(`/alerts/${id}/escalate`, payload);
    return res.data;
  },
};

export const agentApi = {
  runCohort: async (params?: { week_number?: number; baseline_cutoff_week?: number }) => {
    const res = await api.post('/agent/run', params || {});
    return res.data;
  },
  reseedData: async (num_students: number = 120) => {
    const res = await api.post(`/agent/seed-data?num_students=${num_students}`);
    return res.data;
  },
};

export const reportsApi = {
  getInstitutionalReport: async () => {
    const res = await api.get('/reports');
    return res.data;
  },
};

export const calibrationApi = {
  list: async (): Promise<CalibrationRun[]> => {
    const res = await api.get('/calibration');
    return res.data;
  },
  run: async (): Promise<CalibrationRun> => {
    const res = await api.post('/calibration/run');
    return res.data;
  },
  approve: async (runId: number, approved: boolean = true): Promise<CalibrationRun> => {
    const res = await api.post(`/calibration/${runId}/approve`, { approved });
    return res.data;
  },
};

export const settingsApi = {
  getThresholds: async (): Promise<ThresholdConfig[]> => {
    const res = await api.get('/settings');
    return res.data;
  },
  updateThreshold: async (id: number, value: number): Promise<ThresholdConfig> => {
    const res = await api.put(`/settings/${id}`, { value });
    return res.data;
  },
};

export const auditApi = {
  list: async (limit: number = 100): Promise<AuditLog[]> => {
    const res = await api.get('/audit-logs', { params: { limit } });
    return res.data;
  },
};
