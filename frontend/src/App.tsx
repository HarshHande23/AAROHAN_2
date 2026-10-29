import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { StudentsPage } from './pages/StudentsPage';
import { StudentDetailPage } from './pages/StudentDetailPage';
import { BulkImportPage } from './pages/BulkImportPage';
import { ValidationDuplicatesPage } from './pages/ValidationDuplicatesPage';
import { AlertsAnomaliesPage } from './pages/AlertsAnomaliesPage';
import { ComplianceReportsPage } from './pages/ComplianceReportsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { MLStatusPage } from './pages/MLStatusPage';
import { LoginPage } from './pages/LoginPage';
import { LoadingSpinner } from './components/ui/LoadingSpinner';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <LoadingSpinner message="Authenticating session with national gateway..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="students" element={<StudentsPage />} />
            <Route path="students/:id" element={<StudentDetailPage />} />
            <Route path="bulk-import" element={<BulkImportPage />} />
            <Route path="validation-duplicates" element={<ValidationDuplicatesPage />} />
            <Route path="alerts-anomalies" element={<AlertsAnomaliesPage />} />
            <Route path="reports" element={<ComplianceReportsPage />} />
            <Route path="audit-logs" element={<AuditLogsPage />} />
            <Route path="ml-status" element={<MLStatusPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;

