import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { LandingPage } from './pages/LandingPage';
import { AccessPortalPage } from './pages/AccessPortalPage';
import { PublicVerificationPage } from './pages/PublicVerificationPage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { StudentsPage } from './pages/StudentsPage';
import { StudentDetailPage } from './pages/StudentDetailPage';
import { DataSubmissionPage } from './pages/DataSubmissionPage';
import { VerificationPage } from './pages/VerificationPage';
import { CredentialsPage } from './pages/CredentialsPage';
import { InstitutionsPage } from './pages/InstitutionsPage';
import { ValidationDuplicatesPage } from './pages/ValidationDuplicatesPage';
import { AlertsAnomaliesPage } from './pages/AlertsAnomaliesPage';
import { ComplianceReportsPage } from './pages/ComplianceReportsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { MLStatusPage } from './pages/MLStatusPage';
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
          {/* Public Top-Level Landing & Verifier Gateways */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/access-portal" element={<AccessPortalPage />} />
          <Route path="/verify" element={<PublicVerificationPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Backward compatibility redirects */}
          <Route path="/dashboard" element={<Navigate to="/app" replace />} />

          {/* Authenticated Institutional Workspace */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="students" element={<StudentsPage />} />
            <Route path="students/:id" element={<StudentDetailPage />} />
            <Route path="data-submission" element={<DataSubmissionPage />} />
            <Route path="bulk-import" element={<DataSubmissionPage />} />
            <Route path="verification" element={<VerificationPage />} />
            <Route path="credentials" element={<CredentialsPage />} />
            <Route path="institutions" element={<InstitutionsPage />} />
            <Route path="validation-duplicates" element={<ValidationDuplicatesPage />} />
            <Route path="alerts-anomalies" element={<AlertsAnomaliesPage />} />
            <Route path="reports" element={<ComplianceReportsPage />} />
            <Route path="audit-logs" element={<AuditLogsPage />} />
            <Route path="ml-status" element={<MLStatusPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
