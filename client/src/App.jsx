import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import AppShell from './components/AppShell';
import LoginPage from './pages/LoginPage';
import CityDashboard from './pages/dashboard/CityDashboard';
import ZoneDashboard from './pages/dashboard/ZoneDashboard';
import BuildingDetail from './pages/dashboard/BuildingDetail';
import AlertsPage from './pages/AlertsPage';
import DevicesPage from './pages/DevicesPage';
import PredictionsPage from './pages/PredictionsPage';
import ReportsPage from './pages/ReportsPage';
import DataEntryPage from './pages/DataEntryPage';
import UserManagement from './pages/UserManagement';
import AlertSettings from './pages/AlertSettings';
import AboutPage from './pages/AboutPage';
import { ShieldX, FileQuestion } from 'lucide-react';

function RequireAuth({ children }) {
  const { accessToken } = useAuthStore();
  if (!accessToken) return <Navigate to="/login" replace />;
  return children || <Outlet />;
}

function RequireRole({ roles, children }) {
  const { user } = useAuthStore();
  if (roles && !roles.includes(user?.role)) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <ShieldX size={48} className="mx-auto mb-4 text-danger" />
          <h1 className="text-2xl font-bold mb-2">403 — Access Denied</h1>
          <p className="text-text-secondary">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }
  return children;
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-navy">
      <div className="text-center">
        <FileQuestion size={48} className="mx-auto mb-4 text-text-secondary" />
        <h1 className="text-2xl font-bold mb-2">404 — Page Not Found</h1>
        <p className="text-text-secondary mb-4">The page you're looking for doesn't exist.</p>
        <a href="/" className="text-brand hover:underline">Go Home</a>
      </div>
    </div>
  );
}

function AuthRedirect() {
  const { accessToken, user } = useAuthStore();
  if (!accessToken) return <Navigate to="/login" replace />;
  const redirects = {
    super_admin: '/dashboard/city',
    zone_manager: '/dashboard/zone',
    field_operator: '/dashboard/zone',
    auditor: '/reports',
  };
  return <Navigate to={redirects[user?.role] || '/login'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<AuthRedirect />} />

        {/* All authenticated routes inside AppShell */}
        <Route element={<RequireAuth><AppShell /></RequireAuth>}>
          {/* City Dashboard — Super Admin */}
          <Route path="/dashboard/city" element={<RequireRole roles={['super_admin']}><CityDashboard /></RequireRole>} />

          {/* Zone Dashboard — all authenticated except auditor */}
          <Route path="/dashboard/zone" element={<ZoneDashboard />} />
          <Route path="/dashboard/zone/:zoneId" element={<ZoneDashboard />} />
          <Route path="/dashboard/zone/:zoneId/building/:buildingId" element={<BuildingDetail />} />

          {/* Alerts */}
          <Route path="/alerts" element={<AlertsPage />} />

          {/* Devices */}
          <Route path="/devices" element={<DevicesPage />} />

          {/* Predictions — Admin + Zone Manager */}
          <Route path="/predictions" element={<RequireRole roles={['super_admin', 'zone_manager']}><PredictionsPage /></RequireRole>} />

          {/* Reports — all roles */}
          <Route path="/reports" element={<ReportsPage />} />

          {/* Data Entry — Admin + Manager + Operator */}
          <Route path="/data-entry" element={<RequireRole roles={['super_admin', 'zone_manager', 'field_operator']}><DataEntryPage /></RequireRole>} />

          {/* User Management — Super Admin only */}
          <Route path="/admin/users" element={<RequireRole roles={['super_admin']}><UserManagement /></RequireRole>} />

          {/* Alert Settings — Admin + Zone Manager */}
          <Route path="/settings/alerts" element={<RequireRole roles={['super_admin', 'zone_manager']}><AlertSettings /></RequireRole>} />

          {/* About SEMS */}
          <Route path="/about" element={<AboutPage />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
