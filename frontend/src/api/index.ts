import { apiClient } from './client';
import { 
  User, 
  Student, 
  DashboardMetrics, 
  Alert, 
  AuditLog, 
  BulkImportResponse, 
  MLModelStatus, 
  ComplianceReport,
  Institution,
  UserRole
} from '../types';

export const authApi = {
  login: async (email: string, password: string, requestedRole?: UserRole) => {
    const res = await apiClient.post<{ access_token: string; token_type: string; user: User }>(
      '/auth/login', 
      { email, password, role: requestedRole }
    );
    return res.data;
  },
  getMe: async () => {
    const res = await apiClient.get<User>('/auth/me');
    return res.data;
  },
  switchRole: async (role: UserRole) => {
    const res = await apiClient.post<{ access_token: string; user: User }>('/auth/switch-role', { role });
    return res.data;
  }
};

export const dashboardApi = {
  getMetrics: async (institutionId?: number) => {
    const params = institutionId ? { institution_id: institutionId } : {};
    const res = await apiClient.get<DashboardMetrics>('/dashboard', { params });
    return res.data;
  }
};

export const institutionsApi = {
  getInstitutions: async () => {
    const res = await apiClient.get<Institution[]>('/institutions');
    return res.data;
  }
};

export const studentsApi = {
  getStudents: async (params?: {
    search?: string;
    institution_id?: number;
    department?: string;
    validation_status?: string;
    duplicate_status?: string;
    anomaly_status?: string;
    ml_classification?: string;
    verification_status?: string;
    page?: number;
    page_size?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  }) => {
    const res = await apiClient.get<{
      items: Student[];
      total: number;
      page: number;
      page_size: number;
      total_pages: number;
    }>('/students', { params });
    return res.data;
  },
  getStudentById: async (id: number) => {
    const res = await apiClient.get<Student>(`/students/${id}`);
    return res.data;
  },
  createStudent: async (data: Partial<Student>) => {
    const res = await apiClient.post<Student>('/students', data);
    return res.data;
  },
  updateStudent: async (id: number, data: Partial<Student>) => {
    const res = await apiClient.put<Student>(`/students/${id}`, data);
    return res.data;
  },
  deleteStudent: async (id: number) => {
    const res = await apiClient.delete<{ success: boolean; message: string }>(`/students/${id}`);
    return res.data;
  },
  verifyStudent: async (id: number, payload: { status: string; notes?: string }) => {
    const res = await apiClient.post<Student>(`/students/${id}/verify`, payload);
    return res.data;
  }
};

export const bulkImportApi = {
  analyzeFile: async (file: File, institutionId?: number) => {
    const formData = new FormData();
    formData.append('file', file);
    if (institutionId) {
      formData.append('institution_id', institutionId.toString());
    }
    const res = await apiClient.post('/bulk-import/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
    return res.data;
  },
  confirmImport: async (batchId: string, excludedRows: number[]) => {
    const res = await apiClient.post(`/bulk-import/confirm/${batchId}`, { excluded_rows: excludedRows });
    return res.data;
  },
  deleteSourceFile: async (batchId: string) => {
    const res = await apiClient.delete(`/bulk-import/${batchId}/source-file`);
    return res.data;
  },
  getBatches: async () => {
    const res = await apiClient.get('/bulk-import/batches');
    return res.data;
  },
  getTemplateUrl: () => {
    return `${apiClient.defaults.baseURL}/bulk-import/template`;
  },
  // Legacy single-phase (kept for backward compat)
  uploadFile: async (file: File, institutionId?: number) => {
    const formData = new FormData();
    formData.append('file', file);
    if (institutionId) {
      formData.append('institution_id', institutionId.toString());
    }
    const res = await apiClient.post('/bulk-import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
};

export const validationApi = {
  validateStudent: async (studentId: number) => {
    const res = await apiClient.post<{
      validation_status: string;
      errors: string[];
      is_valid: boolean;
    }>(`/validation/${studentId}`);
    return res.data;
  },
  getValidationSummary: async () => {
    const res = await apiClient.get<{
      total_validated: number;
      valid_count: number;
      invalid_count: number;
      common_errors: { rule: string; count: number }[];
    }>('/validation/summary');
    return res.data;
  }
};

export const duplicatesApi = {
  getDuplicates: async () => {
    const res = await apiClient.get<{
      duplicate_cases: {
        id: number;
        student: Student;
        matched_student?: Student | null;
        reason: string;
        created_at: string;
      }[];
      total: number;
    }>('/duplicates');
    return res.data;
  },
  resolveDuplicate: async (id: number, action: 'CONFIRM' | 'DISMISS') => {
    const res = await apiClient.post<{ success: boolean; message: string }>(`/duplicates/${id}/resolve`, { action });
    return res.data;
  }
};

export const alertsApi = {
  getAlerts: async (params?: {
    severity?: string;
    status?: string;
    alert_type?: string;
  }) => {
    const res = await apiClient.get<Alert[]>('/alerts', { params });
    return res.data;
  },
  updateAlertStatus: async (id: number, payload: { status: string; notes?: string }) => {
    const res = await apiClient.patch<Alert>(`/alerts/${id}`, payload);
    return res.data;
  }
};

export const reportsApi = {
  getComplianceReport: async (params?: { institution_id?: number; academic_year?: string }) => {
    const res = await apiClient.get<ComplianceReport>('/reports', { params });
    return res.data;
  }
};

export const auditApi = {
  getAuditLogs: async (params?: { limit?: number }) => {
    const res = await apiClient.get<AuditLog[]>('/audit-logs', { params });
    return res.data;
  }
};

export const mlApi = {
  getModelStatuses: async () => {
    const res = await apiClient.get<{
      isolation_forest: MLModelStatus;
      random_forest: MLModelStatus;
    }>('/ml/status');
    return res.data;
  },
  trainIsolationForest: async () => {
    const res = await apiClient.post<{ success: boolean; message: string; metadata: MLModelStatus }>('/ml/isolation-forest/train');
    return res.data;
  },
  trainRandomForest: async () => {
    const res = await apiClient.post<{ success: boolean; message: string; metadata: MLModelStatus }>('/ml/random-forest/train');
    return res.data;
  }
};

