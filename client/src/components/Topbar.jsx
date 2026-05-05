import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useAlertStore } from '../stores/appStore';
import { Bell, LogOut, User, ChevronDown } from 'lucide-react';

export default function Topbar({ title, breadcrumbs }) {
  const { user, logout } = useAuthStore();
  const { alertCount } = useAlertStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleLabels = {
    super_admin: 'Super Admin',
    zone_manager: 'Zone Manager',
    field_operator: 'Field Operator',
    auditor: 'Auditor'
  };

  return (
    <header className="h-16 glass border-b border-border flex items-center justify-between px-6 sticky top-0 z-10 backdrop-blur-xl">
      {/* Left: Breadcrumbs */}
      <div className="flex flex-col">
        {breadcrumbs && (
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <span className="text-border">›</span>}
                {crumb.to ? (
                  <a href={crumb.to} className="hover:text-brand transition-colors">{crumb.label}</a>
                ) : (
                  <span className="text-text-primary">{crumb.label}</span>
                )}
              </span>
            ))}
          </div>
        )}
        <h1 className="text-lg font-bold text-text-primary">{title}</h1>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-4">
        {/* Alert Bell */}
        {user?.role !== 'auditor' && (
          <button
            onClick={() => navigate('/alerts')}
            className="relative p-2 rounded-lg hover:bg-surface-elevated transition-colors"
          >
            <Bell size={20} className="text-text-secondary" />
            {alertCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 flex items-center justify-center text-[10px] font-bold text-white bg-danger rounded-full px-1">
                {alertCount > 99 ? '99+' : alertCount}
              </span>
            )}
          </button>
        )}

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-elevated transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center">
              <User size={16} className="text-brand" />
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-sm font-medium text-text-primary">{user?.name}</div>
              <div className="text-xs text-text-secondary">{roleLabels[user?.role]}</div>
            </div>
            <ChevronDown size={14} className="text-text-secondary" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-[calc(100%+4px)] w-48 bg-surface-elevated border border-border rounded-lg shadow-xl z-50 py-1 card-animate">
                <div className="px-3 py-2 border-b border-border">
                  <div className="text-sm font-medium">{user?.name}</div>
                  <div className="text-xs text-text-secondary">{user?.email}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-navy transition-colors"
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
