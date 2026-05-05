import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useSidebarStore } from '../stores/appStore';
import {
  LayoutDashboard, Building2, Bell, BarChart3, FileText,
  Users, Settings, Zap, PanelLeftClose, PanelLeftOpen, Cpu, Info
} from 'lucide-react';

const navItems = {
  super_admin: [
    { to: '/dashboard/city', icon: LayoutDashboard, label: 'City Overview' },
    { to: '/alerts', icon: Bell, label: 'Alerts' },
    { to: '/devices', icon: Cpu, label: 'Devices' },
    { to: '/predictions', icon: BarChart3, label: 'Predictions' },
    { to: '/reports', icon: FileText, label: 'Reports' },
    { to: '/admin/users', icon: Users, label: 'User Management' },
    { to: '/settings/alerts', icon: Settings, label: 'Alert Settings' },
    { to: '/about', icon: Info, label: 'About Us' },
  ],
  zone_manager: [
    { to: '/dashboard/zone', icon: Building2, label: 'Zone Dashboard' },
    { to: '/alerts', icon: Bell, label: 'Alerts' },
    { to: '/devices', icon: Cpu, label: 'Devices' },
    { to: '/predictions', icon: BarChart3, label: 'Predictions' },
    { to: '/reports', icon: FileText, label: 'Reports' },
    { to: '/settings/alerts', icon: Settings, label: 'Alert Settings' },
    { to: '/about', icon: Info, label: 'About Us' },
  ],
  field_operator: [
    { to: '/dashboard/zone', icon: Building2, label: 'Zone Dashboard' },
    { to: '/data-entry', icon: Zap, label: 'Data Entry' },
    { to: '/devices', icon: Cpu, label: 'Devices' },
    { to: '/about', icon: Info, label: 'About Us' },
  ],
  auditor: [
    { to: '/reports', icon: FileText, label: 'Reports' },
    { to: '/about', icon: Info, label: 'About Us' },
  ],
};

export default function Sidebar() {
  const { user } = useAuthStore();
  const { collapsed, toggle } = useSidebarStore();
  const items = navItems[user?.role] || [];

  return (
    <aside
      className={`fixed top-0 left-0 h-screen glass border-r border-border flex flex-col z-40 transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-border gap-3">
        <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center shrink-0">
          <Zap size={18} className="text-white" />
        </div>
        {!collapsed && (
          <span className="text-lg font-bold text-text-primary tracking-tight">SEMS</span>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {items.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 mx-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-brand/15 text-brand shadow-[inset_2px_0_0_0_#0D7377]'
                  : 'text-text-secondary hover:bg-surface-elevated/50 hover:text-text-primary hover:shadow-[inset_2px_0_0_0_var(--color-border)]'
              }`
            }
          >
            <item.icon size={20} className="shrink-0" />
            {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={toggle}
        className="h-12 flex items-center justify-center border-t border-border text-text-secondary hover:text-text-primary transition-colors"
      >
        {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
      </button>
    </aside>
  );
}
